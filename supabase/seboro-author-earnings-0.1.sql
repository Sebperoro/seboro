-- SEBORO — Sistema de comisión, saldo y pago de autor (0.1)
-- Crea author_payout_profiles y author_earnings, el trigger que genera
-- ganancias de autor cuando una compra pasa a 'paid' (o se revierte), y
-- las RPCs que consumen AuthorDashboard.tsx y el futuro panel admin.
--
-- Decisiones de este diseño (confirmadas):
--   - Comisión SEBORO: 25% sobre el NETO (después del fee estimado de MP).
--   - Retención: 14 días desde purchases.paid_at antes de estar disponible.
--   - "Disponible" NO es un estado guardado: se calcula como
--     status = 'pending_release' AND available_at <= now(). Evita depender
--     de pg_cron o un job periódico para "liberar" saldo.
--   - Fee de Mercado Pago: SOLO estimado (3.49% + IVA ≈ 4.0484% del bruto).
--     NO se captura el fee real de MP todavía (mp_fee_is_estimate = true
--     siempre en esta versión) — eso queda para una ronda separada que
--     toca lib/payments/server.ts (fetchMercadoPagoPayment / fee_details).
--   - Impuestos (ISR/IVA): columnas preparadas, en $0 / inactivo. NO activar
--     ningún descuento automático hasta confirmación explícita (pendiente
--     de consulta fiscal sobre LISR 113-A a 113-D, régimen de plataformas).
--   - Retiro instantáneo: NO existe en esta versión. Pago manual por lotes,
--     el admin marca como pagado después de transferir por fuera del sistema.

-- ============================================================
-- 1. author_payout_profiles — datos bancarios del autor
-- ============================================================

create table if not exists public.author_payout_profiles (
  author_id uuid primary key references auth.users(id) on delete cascade,
  bank_name text not null,
  clabe text not null check (char_length(clabe) = 18),
  account_holder_name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.author_payout_profiles is
  'Datos bancarios que el autor captura para recibir pagos manuales por transferencia. El admin los lee para hacer la transferencia por fuera del sistema; no hay integración de pago automática todavía.';

create or replace function public.seboro_touch_payout_profile_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists seboro_touch_payout_profile_updated_at_trigger on public.author_payout_profiles;
create trigger seboro_touch_payout_profile_updated_at_trigger
before update on public.author_payout_profiles
for each row
execute function public.seboro_touch_payout_profile_updated_at();

alter table public.author_payout_profiles enable row level security;

-- El autor ve y edita solo su propia fila.
create policy "Authors can read their own payout profile"
on public.author_payout_profiles
for select
to authenticated
using (auth.uid() = author_id);

create policy "Authors can create their own payout profile"
on public.author_payout_profiles
for insert
to authenticated
with check (auth.uid() = author_id);

create policy "Authors can update their own payout profile"
on public.author_payout_profiles
for update
to authenticated
using (auth.uid() = author_id)
with check (auth.uid() = author_id);

-- El admin SOLO puede leer las de todos (para hacer la transferencia).
-- Sin policy de update/delete para admin: una corrección a un dato ajeno
-- se hace con el cliente de service-role desde el backend, nunca desde una
-- policy de escritura amplia expuesta al cliente autenticado.
create policy "Admins can read all payout profiles"
on public.author_payout_profiles
for select
to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid()
      and p.role::text = 'admin'
  )
);

grant select, insert, update on public.author_payout_profiles to authenticated;

-- ============================================================
-- 2. author_earnings — una fila por compra 'paid'
-- ============================================================

create table if not exists public.author_earnings (
  id uuid primary key default gen_random_uuid(),
  purchase_id uuid not null unique references public.purchases(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete restrict,
  work_id uuid not null references public.works(id) on delete restrict,
  book_slug text not null,

  gross_amount_mxn numeric(10,2) not null check (gross_amount_mxn >= 0),
  mp_fee_estimate_mxn numeric(10,2) not null default 0 check (mp_fee_estimate_mxn >= 0),
  mp_fee_is_estimate boolean not null default true,
  net_amount_mxn numeric(10,2) not null check (net_amount_mxn >= 0),

  commission_rate numeric(5,4) not null default 0.25,
  commission_seboro_mxn numeric(10,2) not null check (commission_seboro_mxn >= 0),
  author_share_mxn numeric(10,2) not null check (author_share_mxn >= 0),

  isr_retenido_mxn numeric(10,2) not null default 0,
  iva_retenido_mxn numeric(10,2) not null default 0,
  tax_withholding_active boolean not null default false,

  currency text not null default 'MXN',
  status text not null default 'pending_release'
    check (status in ('pending_release','paid','voided','flagged_for_review')),

  available_at timestamptz not null,
  payout_at timestamptz,
  payout_by_admin_id uuid references auth.users(id),
  voided_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.author_earnings is
  'Una fila por compra paid: cuánto le corresponde al autor, cuándo se libera y si ya se le pagó. "paid" literal solo se usa cuando el admin marca el pago; "disponible" se calcula como pending_release AND available_at <= now() (sin estado literal, para no depender de un cron).';

comment on column public.author_earnings.isr_retenido_mxn is
  'Preparado para retenciones fiscales (LISR 113-A a 113-D). En $0 hasta confirmación explícita tras consulta fiscal.';
comment on column public.author_earnings.iva_retenido_mxn is
  'Preparado para retenciones fiscales. En $0 hasta confirmación explícita tras consulta fiscal.';
comment on column public.author_earnings.mp_fee_is_estimate is
  'true = mp_fee_estimate_mxn calculado con 3.49%+IVA (no es el fee real de MP). Pasará a false cuando se capture el fee real desde fee_details/net_received_amount en una ronda separada.';

create index if not exists author_earnings_author_status_idx
  on public.author_earnings(author_id, status);
create index if not exists author_earnings_pending_available_idx
  on public.author_earnings(available_at)
  where status = 'pending_release';
create index if not exists author_earnings_work_id_idx
  on public.author_earnings(work_id);

alter table public.author_earnings enable row level security;

create policy "Authors can read their own earnings"
on public.author_earnings
for select
to authenticated
using (auth.uid() = author_id);

create policy "Admins can read all earnings"
on public.author_earnings
for select
to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid()
      and p.role::text = 'admin'
  )
);

-- Sin policies de insert/update/delete para authenticated: la única
-- escritura es el trigger de abajo (bajo el service-role client que ya
-- usa reconcileMercadoPagoPayment, RLS no aplica ahí) y la RPC
-- admin_mark_earnings_paid (security definer, valida el rol admin ella
-- misma), más abajo.

grant select on public.author_earnings to authenticated;

-- ============================================================
-- 3. Trigger: crear / anular ganancias cuando cambia purchases.status
-- ============================================================
-- AFTER (no BEFORE) a propósito: seboro_sync_purchase_library_trigger ya
-- existente es BEFORE y es quien pone purchases.paid_at. Como este trigger
-- corre AFTER, new.paid_at ya viene con el valor final escrito en la fila.

create or replace function public.seboro_sync_author_earnings()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_work public.works%rowtype;
  v_mp_fee numeric(10,2);
  v_net numeric(10,2);
  v_commission numeric(10,2);
  v_author_share numeric(10,2);
  v_available_at timestamptz;
  v_existing public.author_earnings%rowtype;
begin
  -- Compra recién aprobada (insert directo en paid, o update que entra a paid)
  if new.status = 'paid' and (tg_op = 'INSERT' or old.status is distinct from 'paid') then

    select * into v_work from public.works where id = new.work_id;
    if not found then
      raise exception 'seboro_sync_author_earnings: work % no encontrado para purchase %', new.work_id, new.id;
    end if;

    -- Estimación de comisión de Mercado Pago: 3.49% + IVA (16%) sobre esa
    -- comisión ≈ 4.0484% del bruto. mp_fee_is_estimate queda en true.
    v_mp_fee := round(new.amount_mxn * 0.0349 * 1.16, 2);
    v_net := new.amount_mxn - v_mp_fee;
    v_commission := round(v_net * 0.25, 2);
    v_author_share := v_net - v_commission;
    v_available_at := coalesce(new.paid_at, now()) + interval '14 days';

    insert into public.author_earnings (
      purchase_id, author_id, work_id, book_slug,
      gross_amount_mxn, mp_fee_estimate_mxn, mp_fee_is_estimate, net_amount_mxn,
      commission_rate, commission_seboro_mxn, author_share_mxn,
      currency, status, available_at
    ) values (
      new.id, v_work.author_id, new.work_id, new.book_slug,
      new.amount_mxn, v_mp_fee, true, v_net,
      0.25, v_commission, v_author_share,
      new.currency, 'pending_release', v_available_at
    )
    -- Caso raro: una compra que ya se reembolsó vuelve a aprobarse en MP.
    -- Solo se reabre si la ganancia anterior estaba voided/flagged — nunca
    -- se reescribe una que ya quedó en 'paid' (el autor ya cobró esa).
    -- Nota: si el reembolso+reaprobación ocurre, new.paid_at puede seguir
    -- reflejando la fecha del primer pago (el trigger BEFORE existente solo
    -- fija paid_at si estaba null), por lo que available_at podría no ser
    -- exacto en ese escenario específico — caso raro, no resuelto en esta
    -- ronda.
    on conflict (purchase_id) do update set
      author_id = excluded.author_id,
      work_id = excluded.work_id,
      book_slug = excluded.book_slug,
      gross_amount_mxn = excluded.gross_amount_mxn,
      mp_fee_estimate_mxn = excluded.mp_fee_estimate_mxn,
      mp_fee_is_estimate = excluded.mp_fee_is_estimate,
      net_amount_mxn = excluded.net_amount_mxn,
      commission_rate = excluded.commission_rate,
      commission_seboro_mxn = excluded.commission_seboro_mxn,
      author_share_mxn = excluded.author_share_mxn,
      currency = excluded.currency,
      status = 'pending_release',
      available_at = excluded.available_at,
      payout_at = null,
      payout_by_admin_id = null,
      voided_at = null,
      updated_at = now()
    where public.author_earnings.status in ('voided', 'flagged_for_review');

  -- Compra que estaba paid y se revierte (reembolso/cancelación/falla)
  elsif tg_op = 'UPDATE'
    and old.status = 'paid'
    and new.status in ('refunded', 'cancelled', 'failed') then

    select * into v_existing from public.author_earnings where purchase_id = new.id;

    if found then
      if v_existing.status = 'pending_release' then
        update public.author_earnings
        set status = 'voided', voided_at = now(), updated_at = now()
        where purchase_id = new.id;
      elsif v_existing.status = 'paid' then
        -- Ya se le transfirió al autor; no se puede revertir solo.
        -- Requiere reconciliación manual del admin.
        update public.author_earnings
        set status = 'flagged_for_review', updated_at = now()
        where purchase_id = new.id;
      end if;
      -- si ya estaba voided/flagged_for_review, no hay nada que hacer
    end if;

  end if;

  return new;
end;
$$;

drop trigger if exists seboro_sync_author_earnings_trigger on public.purchases;
create trigger seboro_sync_author_earnings_trigger
after insert or update of status
on public.purchases
for each row
execute function public.seboro_sync_author_earnings();

-- ============================================================
-- 4. RPCs
-- ============================================================

-- 4a. Autor: su propio balance agregado, para AuthorDashboard.tsx
create or replace function public.get_my_author_earnings_summary()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_available numeric(10,2);
  v_pending numeric(10,2);
  v_paid_total numeric(10,2);
  v_next_release timestamptz;
begin
  if v_uid is null then
    raise exception 'No autenticado';
  end if;

  select coalesce(sum(author_share_mxn), 0) into v_available
  from public.author_earnings
  where author_id = v_uid and status = 'pending_release' and available_at <= now();

  select coalesce(sum(author_share_mxn), 0) into v_pending
  from public.author_earnings
  where author_id = v_uid and status = 'pending_release' and available_at > now();

  select coalesce(sum(author_share_mxn), 0) into v_paid_total
  from public.author_earnings
  where author_id = v_uid and status = 'paid';

  select min(available_at) into v_next_release
  from public.author_earnings
  where author_id = v_uid and status = 'pending_release' and available_at > now();

  return jsonb_build_object(
    'available_mxn', v_available,
    'pending_release_mxn', v_pending,
    'paid_total_mxn', v_paid_total,
    'next_release_at', v_next_release
  );
end;
$$;

grant execute on function public.get_my_author_earnings_summary() to authenticated;

-- 4b. Autor: historial de movimientos (liberaciones + pagos recibidos)
create or replace function public.get_my_author_earnings_history(p_limit int default 30)
returns table (
  id uuid,
  work_id uuid,
  book_slug text,
  author_share_mxn numeric,
  status text,
  available_at timestamptz,
  payout_at timestamptz,
  created_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    e.id, e.work_id, e.book_slug, e.author_share_mxn, e.status,
    e.available_at, e.payout_at, e.created_at
  from public.author_earnings e
  where e.author_id = auth.uid()
  order by coalesce(e.payout_at, e.available_at) desc
  limit greatest(1, least(p_limit, 200));
$$;

grant execute on function public.get_my_author_earnings_history(int) to authenticated;

-- 4c. Admin: balances agregados por autor (para la lista del panel)
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
    count(*) filter (where e.status = 'flagged_for_review') as flagged_count
  from public.author_earnings e
  group by e.author_id;
end;
$$;

grant execute on function public.admin_get_author_balances() to authenticated;

-- 4d. Admin: detalle de un autor (para el drill-down del panel)
create or replace function public.admin_get_author_earnings_detail(p_author_id uuid)
returns table (
  id uuid,
  purchase_id uuid,
  work_id uuid,
  book_slug text,
  gross_amount_mxn numeric,
  mp_fee_estimate_mxn numeric,
  author_share_mxn numeric,
  status text,
  available_at timestamptz,
  payout_at timestamptz,
  payout_by_admin_id uuid,
  created_at timestamptz
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
    e.id, e.purchase_id, e.work_id, e.book_slug,
    e.gross_amount_mxn, e.mp_fee_estimate_mxn, e.author_share_mxn,
    e.status, e.available_at, e.payout_at, e.payout_by_admin_id, e.created_at
  from public.author_earnings e
  where e.author_id = p_author_id
  order by e.created_at desc;
end;
$$;

grant execute on function public.admin_get_author_earnings_detail(uuid) to authenticated;

-- 4e. Admin: marcar como pagado — único punto de escritura para el payout.
-- No hay policy de "admin puede actualizar cualquier fila": esta RPC fuerza
-- la condición available_at <= now() en el propio UPDATE, así que no se
-- puede marcar como pagado algo que todavía no está disponible aunque haya
-- un bug en el panel.
create or replace function public.admin_mark_earnings_paid(p_earning_ids uuid[])
returns setof public.author_earnings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_id uuid := auth.uid();
begin
  if not exists (
    select 1 from public.profiles p
    where p.user_id = v_admin_id and p.role::text = 'admin'
  ) then
    raise exception 'No autorizado';
  end if;

  return query
  update public.author_earnings
  set status = 'paid',
      payout_at = now(),
      payout_by_admin_id = v_admin_id,
      updated_at = now()
  where id = any(p_earning_ids)
    and status = 'pending_release'
    and available_at <= now()
  returning *;
end;
$$;

grant execute on function public.admin_mark_earnings_paid(uuid[]) to authenticated;
