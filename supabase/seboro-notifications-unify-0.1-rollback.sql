-- SEBORO · Unificar notificaciones (#31) · rollback
-- Revierte seboro-notifications-unify-0.1.sql: elimina los 3 triggers y las
-- 3 funciones notify_* que agregó esa migración, y devuelve el CHECK
-- notifications_type_check a su lista original de 20 valores.
--
-- Este rollback NO borra filas históricas de `notifications` (ni las nuevas
-- ni las viejas), NO toca `seboro_create_notification()`, y NO modifica
-- ninguna RPC de negocio (submit_author_application,
-- review_author_application, submit_my_work_for_review) ni RLS/GRANTs.
--
-- IMPORTANTE antes de correr esto: si ya existen filas reales en
-- `notifications` con alguno de los 4 tipos nuevos
-- (author_application_approved, author_application_rejected,
-- author_application_pending_admin, work_review_pending_admin), el ALTER
-- TABLE que angosta el CHECK al final va a fallar (constraint violation)
-- hasta que esas filas se borren o se les cambie el tipo — este script no
-- lo hace por su cuenta. Revisa primero con:
--   select notification_type, count(*) from public.notifications
--   where notification_type in (
--     'author_application_approved',
--     'author_application_rejected',
--     'author_application_pending_admin',
--     'work_review_pending_admin'
--   )
--   group by notification_type;

begin;

drop trigger if exists trg_notify_author_application_decision
  on public.author_applications;

drop trigger if exists trg_notify_author_application_pending
  on public.author_applications;

drop trigger if exists trg_notify_work_review_pending
  on public.work_reviews;

drop function if exists public.notify_author_application_decision();
drop function if exists public.notify_author_application_pending();
drop function if exists public.notify_work_review_pending();

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
      'beta_feedback_updated'
    )
  );

commit;
