-- SEBORO · Unificar notificaciones bajo `notifications` (#31) 0.1
-- Ejecutar UNA sola vez en Supabase > SQL Editor, DESPUÉS de revisar este
-- archivo con calma. No se ejecutó nada de esto automáticamente.
--
-- Contexto (diagnóstico #31, ya reportado y aprobado):
-- Hoy la campana de notificaciones (components/NotificationBell.tsx) mezcla
-- la tabla real `notifications` con 3 señales que NO viven ahí:
--   1) la decisión de una solicitud de autor (author_applications.status),
--      leída vía getLatestAuthorDecision() y con su "visto" en localStorage
--      (seboro-seen-author-decision:<id>:<status>)
--   2) solicitudes de autor pendientes para admins (getPendingAuthorApplications,
--      "visto" en localStorage seboro-admin-seen-author-applications)
--   3) obras pendientes de revisión editorial para admins (getPendingHumanReviews,
--      "visto" en localStorage seboro-admin-seen-work-reviews)
-- Como /notificaciones (app/notificaciones/page.tsx) solo lee `notifications`,
-- estas 3 señales aparecen en la campana pero nunca en la página completa —
-- de ahí la discrepancia de conteos reportada.
--
-- Esta migración inserta las 3 como filas reales de `notifications`, siempre
-- vía `seboro_create_notification()`, con el mismo estilo/forma que ya usa
-- `notify_human_work_review()` + `trg_notify_human_work_review`.
--
-- Decisiones de diseño (confirmadas con el usuario):
--   - Las 2 notificaciones a ADMINS (solicitud pendiente, obra que superó la
--     revisión automática y espera revisión humana) NO se filtran por
--     seboro_notification_enabled(): son alertas operativas de cola de
--     trabajo, no una preferencia de contenido — un admin siempre debe verlas.
--   - author_application_approved/rejected TAMPOCO se filtra por
--     seboro_notification_enabled(): es la respuesta a algo que el propio
--     usuario inició (su solicitud), no un contenido opcional — se trata
--     como un aviso de estado de cuenta. (Difiere deliberadamente de
--     notify_human_work_review, que sí gatea por 'editorial' porque ahí es
--     contenido opcional de un autor.)
--
-- Deduplicación: exclusivamente vía el `dedupe_key` que ya existe y que
-- `seboro_create_notification()` ya resuelve con `on conflict (dedupe_key)
-- do nothing`. No se agrega ninguna columna nueva (nada de `source_id`) ni
-- ningún índice adicional. Para las 2 notificaciones con fan-out a varios
-- admins, cada `dedupe_key` incluye el id del recurso/evento Y el
-- `admin_user_id`, para que el UNIQUE global de `dedupe_key` no bloquee que
-- se notifique a más de un admin por el mismo evento.
--
-- Enganche de "obra pendiente de revisión humana": siguiendo la corrección
-- indicada, NO se usa `AFTER UPDATE OF publication_status ON works` (ese
-- campo también lo tocan `reset_review_after_chapter_change` y
-- `reset_review_after_work_edit`, y no queremos que una alerta
-- administrativa dependa de interpretar cambios genéricos de estado). Se usa
-- exactamente el mismo modelo que `trg_notify_human_work_review`:
-- `AFTER INSERT ON public.work_reviews`, filtrando por
-- `NEW.review_type = 'automatic' AND NEW.result = 'approved'` (la revisión
-- automática fue superada y la obra queda a la espera de revisión humana).
--
-- Confirmado explícitamente: esta migración NO modifica ninguna RPC de
-- negocio (submit_author_application, review_author_application,
-- submit_my_work_for_review, seboro_create_notification quedan intactas),
-- NO toca RLS ni GRANTs de ninguna tabla. Solo agrega 3 funciones nuevas
-- (notify_*), 3 triggers nuevos, y amplía el CHECK de notification_type.

begin;

-- -----------------------------------------------------------------------------
-- 0) Ampliar el CHECK de notification_type, conservando TODOS los valores
--    actuales tal cual, y agregando los 4 nuevos al final.
--    Nombre real del constraint confirmado: notifications_type_check.
-- -----------------------------------------------------------------------------

alter table public.notifications
  drop constraint if exists notifications_type_check;

alter table public.notifications
  add constraint notifications_type_check
  check (
    notification_type in (
      'new_follower',
      'work_follower',
      'new_work',
      'new_chapter',
      'work_review_approved',
      'work_review_changes',
      'correction_pending_admin',
      'correction_approved',
      'correction_rejected',
      'author_question',
      'author_reply',
      'community_reply',
      'moderation_report_admin',
      'moderation_warning',
      'content_hidden',
      'content_restored',
      'community_restricted',
      'community_restriction_lifted',
      'beta_feedback_admin',
      'beta_feedback_updated',
      -- Nuevos, agregados por esta migración (#31):
      'author_application_approved',
      'author_application_rejected',
      'author_application_pending_admin',
      'work_review_pending_admin'
    )
  );

-- -----------------------------------------------------------------------------
-- 1) Decisión de solicitud de autor → notifica al solicitante
--    Dispara en author_applications cuando status pasa a approved/rejected.
--    No gatea por seboro_notification_enabled (ver nota de diseño arriba).
-- -----------------------------------------------------------------------------

create or replace function public.notify_author_application_decision()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_type text;
  v_title text;
  v_body text;
begin
  -- Solo en una transición real hacia approved/rejected, no en cualquier
  -- UPDATE que toque la fila (incluye el caso de que status no haya
  -- cambiado, para no reenviar si alguien vuelve a guardar lo mismo).
  if old.status is not distinct from new.status then
    return new;
  end if;

  if new.status not in ('approved', 'rejected') then
    return new;
  end if;

  if new.status = 'approved' then
    v_type := 'author_application_approved';
    v_title := 'Tu solicitud de autor fue aprobada';
    v_body := 'Ya tienes acceso a las herramientas de publicación de SEBORO.';
  else
    v_type := 'author_application_rejected';
    v_title := 'Tu solicitud de autor necesita cambios';
    v_body := coalesce(
      new.admin_notes,
      'Revisa tu solicitud para conocer la decisión del moderador.'
    );
  end if;

  perform public.seboro_create_notification(
    new.user_id,
    null,
    v_type,
    v_title,
    v_body,
    case
      when new.status = 'approved' then '/autor'
      else '/solicitar-autor'
    end,
    null,
    null,
    null,
    -- Incluye reviewed_at además de status: si la misma solicitud se
    -- volviera a decidir en otro momento (poco común, pero posible), cada
    -- decisión distinta genera su propia notificación en vez de perderse
    -- contra la primera por choque de dedupe_key.
    'author-application-decision:' || new.id::text || ':' || new.status
      || ':' || coalesce(new.reviewed_at::text, now()::text)
  );

  return new;
end;
$function$;

drop trigger if exists trg_notify_author_application_decision
  on public.author_applications;

create trigger trg_notify_author_application_decision
after update of status on public.author_applications
for each row
execute function public.notify_author_application_decision();

-- -----------------------------------------------------------------------------
-- 2) Nueva solicitud de autor pendiente → notifica a todos los admins
--    Dispara en author_applications al insertarse una fila con status='pending'.
--    Fan-out: una fila de notifications por cada admin (mismo criterio de
--    "quién es admin" que ya usa review_author_application: profiles.role).
--    dedupe_key incluye id de la solicitud + admin_user_id, para que el
--    UNIQUE global de dedupe_key no impida notificar a más de un admin.
--    No gatea por seboro_notification_enabled (alerta operativa de admin).
-- -----------------------------------------------------------------------------

create or replace function public.notify_author_application_pending()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_admin record;
begin
  if new.status <> 'pending' then
    return new;
  end if;

  for v_admin in
    select p.user_id
    from public.profiles p
    where p.role = 'admin'
  loop
    perform public.seboro_create_notification(
      v_admin.user_id,
      new.user_id,
      'author_application_pending_admin',
      'Nueva solicitud de autor',
      'Hay una solicitud esperando revisión administrativa.',
      '/admin/autores',
      null,
      null,
      null,
      'author-application-pending:' || new.id::text
        || ':' || v_admin.user_id::text
    );
  end loop;

  return new;
end;
$function$;

drop trigger if exists trg_notify_author_application_pending
  on public.author_applications;

create trigger trg_notify_author_application_pending
after insert on public.author_applications
for each row
execute function public.notify_author_application_pending();

-- -----------------------------------------------------------------------------
-- 3) Obra que supera la revisión automática → notifica a todos los admins
--    que hay una obra esperando revisión humana.
--    Mismo modelo exacto que trg_notify_human_work_review:
--    AFTER INSERT ON public.work_reviews, filtrando por review_type/result.
--    NO se engancha en works.publication_status (ese campo también lo
--    tocan reset_review_after_chapter_change y reset_review_after_work_edit,
--    y no queremos que esta alerta dependa de interpretar cambios genéricos
--    de estado en vez del evento explícito de revisión).
--    dedupe_key incluye el id de la fila de work_reviews (evento puntual,
--    único por intento de revisión) + admin_user_id.
--    No gatea por seboro_notification_enabled (alerta operativa de admin).
-- -----------------------------------------------------------------------------

create or replace function public.notify_work_review_pending()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_work public.works;
  v_admin record;
begin
  if new.review_type <> 'automatic' then
    return new;
  end if;

  if new.result <> 'approved' then
    return new;
  end if;

  select *
  into v_work
  from public.works
  where id = new.work_id;

  for v_admin in
    select p.user_id
    from public.profiles p
    where p.role = 'admin'
  loop
    perform public.seboro_create_notification(
      v_admin.user_id,
      new.author_id,
      'work_review_pending_admin',
      'Nueva obra para revisión',
      'Hay una obra nueva esperando revisión editorial: "'
        || coalesce(v_work.title, 'sin título') || '".',
      '/admin/revision',
      new.work_id,
      null,
      null,
      'work-review-pending:' || new.id::text || ':' || v_admin.user_id::text
    );
  end loop;

  return new;
end;
$function$;

drop trigger if exists trg_notify_work_review_pending
  on public.work_reviews;

create trigger trg_notify_work_review_pending
after insert on public.work_reviews
for each row
execute function public.notify_work_review_pending();

-- Verificación opcional después de ejecutar:
-- select conname from pg_constraint
--   where conrelid = 'public.notifications'::regclass and contype = 'c';
-- select proname, prosecdef from pg_proc
--   where proname in (
--     'notify_author_application_decision',
--     'notify_author_application_pending',
--     'notify_work_review_pending'
--   );
-- select tgname, tgrelid::regclass from pg_trigger
--   where tgname like 'trg_notify_%';

commit;
