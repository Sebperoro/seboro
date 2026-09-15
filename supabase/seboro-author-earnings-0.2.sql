-- SEBORO — Resolución admin de ganancias flagged_for_review (0.2)
-- Parte 2 del trabajo de reconciliación de reembolsos: permite al admin ver,
-- en una sola vista cruzada de autores, todas las ganancias marcadas
-- flagged_for_review, y resolverlas dejando nota + quién + cuándo.
--
-- Decisiones de este diseño (confirmadas):
--   - Resolver NO cambia author_earnings.status: la fila conserva
--     'flagged_for_review' para siempre como historial fiel de que esto se
--     marcó alguna vez. "Pendiente real" se calcula como
--     status = 'flagged_for_review' AND resolved_at IS NULL — igual que
--     "disponible" ya se calcula sin un estado literal en 0.1.
--   - Si el admin necesita además cambiar la disposición financiera (ej.
--     anular o pagar), usa las herramientas ya existentes por separado;
--     esta RPC solo anota la resolución.
--   - admin_resolve_flagged_earning acepta un arreglo de ids (como
--     admin_mark_earnings_paid) para resolver varias filas con la misma
--     nota de una sola vez.
--   - Re-resolver una fila ya resuelta es un no-op silencioso (el filtro
--     resolved_at IS NULL en el UPDATE hace que no vuelva en el
--     RETURNING). No es un riesgo real: en cuanto se resuelve, la fila
--     desaparece de la vista del admin por el mismo filtro.

-- ============================================================
-- 1. Columnas nuevas en author_earnings
-- ============================================================

alter table public.author_earnings
  add column if not exists resolved_at timestamptz,
  add column if not exists resolved_by_admin_id uuid references auth.users(id),
  add column if not exists resolution_note text;

comment on column public.author_earnings.resolved_at is
  'NULL = flagged_for_review sigue pendiente de revisión. No-NULL = el admin ya la revisó y anotó una resolución (ver resolution_note). No implica ningún cambio de status.';
comment on column public.author_earnings.resolution_note is
  'Nota obligatoria que el admin deja al resolver una fila flagged_for_review, vía admin_resolve_flagged_earning.';

create index if not exists author_earnings_flagged_pending_idx
  on public.author_earnings(created_at)
  where status = 'flagged_for_review' and resolved_at is null;

-- ============================================================
-- 2. Admin: vista cruzada de todas las ganancias flagged_for_review
-- ============================================================

create or replace function public.admin_get_flagged_earnings(p_include_resolved boolean default false)
returns table (
  id uuid,
  author_id uuid,
  purchase_id uuid,
  work_id uuid,
  book_slug text,
  gross_amount_mxn numeric,
  author_share_mxn numeric,
  created_at timestamptz,
  resolved_at timestamptz,
  resolved_by_admin_id uuid,
  resolution_note text
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
    e.id, e.author_id, e.purchase_id, e.work_id, e.book_slug,
    e.gross_amount_mxn, e.author_share_mxn,
    e.created_at, e.resolved_at, e.resolved_by_admin_id, e.resolution_note
  from public.author_earnings e
  where e.status = 'flagged_for_review'
    and (p_include_resolved or e.resolved_at is null)
  order by e.created_at asc;
end;
$$;

grant execute on function public.admin_get_flagged_earnings(boolean) to authenticated;

-- ============================================================
-- 3. Admin: resolver una o varias ganancias flagged_for_review
-- ============================================================
-- No hay policy de "admin puede actualizar cualquier fila": esta RPC es el
-- único punto de escritura para resolved_at/resolved_by_admin_id/
-- resolution_note, igual que admin_mark_earnings_paid lo es para el payout.

create or replace function public.admin_resolve_flagged_earning(
  p_earning_ids uuid[],
  p_resolution_note text
)
returns setof public.author_earnings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_id uuid := auth.uid();
  v_note text := trim(p_resolution_note);
begin
  if not exists (
    select 1 from public.profiles p
    where p.user_id = v_admin_id and p.role::text = 'admin'
  ) then
    raise exception 'No autorizado';
  end if;

  if v_note = '' then
    raise exception 'La nota de resolución no puede estar vacía.';
  end if;

  return query
  update public.author_earnings
  set resolved_at = now(),
      resolved_by_admin_id = v_admin_id,
      resolution_note = v_note,
      updated_at = now()
  where id = any(p_earning_ids)
    and status = 'flagged_for_review'
    and resolved_at is null
  returning *;
end;
$$;

grant execute on function public.admin_resolve_flagged_earning(uuid[], text) to authenticated;

-- ============================================================
-- 4. Ajuste a admin_get_author_balances: flagged_count solo cuenta
--    pendientes reales (no resueltas), para que el badge por autor y el
--    total del hero bajen cuando el admin resuelve algo.
-- ============================================================

create or replace function public.admin_get_author_balances()
returns table (
  author_id uuid,
  available_mxn numeric,
  pending_release_mxn numeric,
  paid_total_mxn numeric,
  next_release_at timestamptz,
  flagged_count bigint
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
    e.author_id,
    coalesce(sum(e.author_share_mxn) filter (
      where e.status = 'pending_release' and e.available_at <= now()
    ), 0) as available_mxn,
    coalesce(sum(e.author_share_mxn) filter (
      where e.status = 'pending_release' and e.available_at > now()
    ), 0) as pending_release_mxn,
    coalesce(sum(e.author_share_mxn) filter (where e.status = 'paid'), 0) as paid_total_mxn,
    min(e.available_at) filter (
      where e.status = 'pending_release' and e.available_at > now()
    ) as next_release_at,
    count(*) filter (
      where e.status = 'flagged_for_review' and e.resolved_at is null
    ) as flagged_count
  from public.author_earnings e
  group by e.author_id;
end;
$$;

grant execute on function public.admin_get_author_balances() to authenticated;
