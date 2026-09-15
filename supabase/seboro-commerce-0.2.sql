-- SEBORO · Comercio 0.2 — limpieza de compras 'pending' huérfanas
-- Ejecutar UNA sola vez en Supabase > SQL Editor.
--
-- Contexto: /create (seboro-commerce-0.1) inserta la compra en 'pending' y
-- nunca revisa si ya hay una 'pending' previa del mismo comprador/obra. Si el
-- comprador abandona el checkout (cierra la pestaña, no completa el pago), esa
-- fila queda en 'pending' para siempre — no hay cron, no hay expiración.
--
-- Decisiones de este diseño (confirmadas):
--   - Dos poblaciones de 'pending', tratadas distinto:
--     (a) provider_payment_id IS NULL — nunca hubo un intento de pago real en
--         Mercado Pago (el comprador ni siquiera llegó a generar un pago).
--         Abandono inequívoco. Se puede cancelar automáticamente pasadas 24h.
--     (b) provider_payment_id IS NOT NULL — sí existe un pago en Mercado Pago
--         que sigue en curso (típico de OXXO/SPEI, que tardan días en
--         resolverse). NO se cancela por fecha — se vuelve a preguntar
--         directamente a Mercado Pago (ver la ruta API
--         /api/admin/payments/mercadopago/reconcile-stuck, que llama a
--         reconcileMercadoPagoPayment). Si sigue sin resolver 7+ días
--         después, se marca needs_manual_review para que el admin decida.
--   - v1: todo es manual desde el admin (botón), sin cron ni pg_cron. Se
--     puede agregar un Vercel Cron en una ronda futura sin cambiar estas
--     RPCs — solo agregaría quién las llama.
--   - admin_cancel_abandoned_purchases revalida el predicado completo dentro
--     del propio UPDATE (no confía en los ids que mande el cliente), igual
--     que ya hace admin_mark_earnings_paid con available_at.
--   - Confirmado que la transición pending -> cancelled NO dispara ninguna
--     rama de seboro_sync_author_earnings ni de seboro_sync_purchase_library
--     (ambos triggers solo reaccionan cuando new.status='paid' o cuando
--     old.status='paid'). Cero efectos secundarios que limpiar.

-- ============================================================
-- 1. Índice de apoyo para las dos consultas de abajo
-- ============================================================

create index if not exists purchases_pending_stale_idx
  on public.purchases (created_at)
  where status = 'pending';

-- ============================================================
-- 2. Admin: listar compras 'pending' abandonadas/atoradas
-- ============================================================

create or replace function public.admin_get_abandoned_purchases()
returns table (
  id uuid,
  buyer_id uuid,
  buyer_name text,
  work_id uuid,
  book_slug text,
  work_title text,
  amount_mxn numeric,
  provider_payment_id text,
  provider_status text,
  created_at timestamptz,
  bucket text,
  needs_manual_review boolean
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid() and p.role::text = 'admin'
  ) then
    raise exception 'No autorizado';
  end if;

  return query
  select
    pu.id,
    pu.buyer_id,
    coalesce(pr.display_name, 'Lector') as buyer_name,
    pu.work_id,
    pu.book_slug,
    coalesce(w.title, pu.book_slug) as work_title,
    pu.amount_mxn,
    pu.provider_payment_id,
    pu.provider_status,
    pu.created_at,
    case
      when pu.provider_payment_id is null then 'no_payment_attempt'
      else 'stuck_mp_pending'
    end as bucket,
    (
      pu.provider_payment_id is not null
      and pu.created_at < now() - interval '7 days'
    ) as needs_manual_review
  from public.purchases pu
  left join public.profiles pr on pr.user_id = pu.buyer_id
  left join public.works w on w.id = pu.work_id
  where pu.status = 'pending'
    and (
      (pu.provider_payment_id is null and pu.created_at < now() - interval '24 hours')
      or
      (pu.provider_payment_id is not null and pu.created_at < now() - interval '1 hour')
    )
  order by pu.created_at asc;
end;
$$;

grant execute on function public.admin_get_abandoned_purchases() to authenticated;

-- ============================================================
-- 3. Admin: cancelar compras del bucket (a) — sin intento de pago
-- ============================================================
-- No hay policy de "admin puede actualizar cualquier compra": esta RPC es el
-- único punto de escritura para este caso, y el propio UPDATE repite el
-- predicado completo (no solo status='pending') para que no importa qué ids
-- mande el cliente, nunca se cancela algo que ya no califica.

create or replace function public.admin_cancel_abandoned_purchases(
  p_purchase_ids uuid[]
)
returns setof public.purchases
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid() and p.role::text = 'admin'
  ) then
    raise exception 'No autorizado';
  end if;

  return query
  update public.purchases
  set status = 'cancelled',
      provider_status = 'abandoned_no_payment_attempt',
      updated_at = now()
  where id = any(p_purchase_ids)
    and status = 'pending'
    and provider_payment_id is null
    and created_at < now() - interval '24 hours'
  returning *;
end;
$$;

grant execute on function public.admin_cancel_abandoned_purchases(uuid[]) to authenticated;
