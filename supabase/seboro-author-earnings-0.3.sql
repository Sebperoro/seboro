-- SEBORO — Fee real de Mercado Pago en vez de estimación (0.3)
-- Ejecutar UNA sola vez en Supabase > SQL Editor.
--
-- Cierra la "opción B" dejada pendiente en 0.1: mp_fee_is_estimate ya existía
-- exactamente para esto ("pasará a false cuando se capture el fee real desde
-- fee_details/net_received_amount en una ronda separada" — comentario
-- original de 0.1). Esta es esa ronda.
--
-- Verificado contra 6 pagos reales ya procesados hoy: fee_details siempre
-- trae exactamente una entrada type='mercadopago_fee', y se cumple
-- transaction_amount - transaction_details.net_received_amount ==
-- fee_details[0].amount en los 6 casos. La estimación anterior (3.49%+IVA)
-- se quedaba entre 3x y 6x corta contra el fee real observado — no modela
-- el componente fijo del fee real.
--
-- Decisiones de este diseño (confirmadas):
--   - purchases.mp_fee_real_mxn es nullable: lo llena
--     reconcileMercadoPagoPayment (lib/payments/server.ts) en la misma
--     escritura que pone status='paid', solo cuando el valor es plausible.
--     El trigger no puede recibir el payload crudo de MP — solo ve columnas
--     de purchases — así que tiene que aterrizar ahí antes de que el
--     trigger AFTER corra.
--   - Saneamiento en dos capas (además de la de TypeScript en
--     computeRealFeeMxn, que ya filtra antes de escribir la columna):
--     un CHECK a nivel tabla, y una revalidación dentro del propio trigger.
--     Un fee real >= amount_mxn dejaría net_amount_mxn en 0 o negativo,
--     violando el CHECK de author_earnings y tumbando toda la transacción
--     de reconcileMercadoPagoPayment — la compra nunca llegaría a 'paid'.
--     Con el saneamiento, cualquier valor no plausible (0, negativo, o
--     >= amount_mxn) cae automáticamente a la estimación de respaldo.
--   - author_earnings.mp_fee_estimate_mxn NO se renombra: por diseño desde
--     0.1 guarda el fee real O la estimación, disambiguado por
--     mp_fee_is_estimate.
--   - Solo aplica hacia adelante. Las 14 filas de author_earnings que ya
--     existen no se tocan — el trigger ya las insertó una sola vez en el
--     pasado y no se vuelve a disparar por agregar esta columna. Un backfill
--     retroactivo sería una tarea aparte y deliberada (ver discusión previa).

-- ============================================================
-- 1. Columna nueva en purchases
-- ============================================================

alter table public.purchases
  add column if not exists mp_fee_real_mxn numeric(10,2);

alter table public.purchases
  drop constraint if exists purchases_mp_fee_real_plausible;

alter table public.purchases
  add constraint purchases_mp_fee_real_plausible
  check (
    mp_fee_real_mxn is null
    or (mp_fee_real_mxn > 0 and mp_fee_real_mxn < amount_mxn)
  );

comment on column public.purchases.mp_fee_real_mxn is
  'Fee real que Mercado Pago cobró por este pago (suma de fee_details[].amount de la API de pagos), capturado por reconcileMercadoPagoPayment cuando status pasa a paid. NULL si no se pudo capturar un valor plausible — en ese caso seboro_sync_author_earnings usa la estimación de respaldo.';

-- ============================================================
-- 2. Trigger: preferir el fee real sobre la estimación
-- ============================================================
-- Mismo trigger, mismo nombre — solo se reemplaza el cuerpo de la función,
-- no hace falta recrear el trigger en sí.

create or replace function public.seboro_sync_author_earnings()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_work public.works%rowtype;
  v_mp_fee numeric(10,2);
  v_fee_is_estimate boolean;
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

    -- Preferimos el fee real que Mercado Pago reportó para este pago. Solo
    -- se acepta si es plausible (positivo y estrictamente menor al monto
    -- bruto) — cualquier otro caso cae a la estimación de respaldo, nunca
    -- deja net_amount_mxn en 0 o negativo.
    if new.mp_fee_real_mxn is not null
       and new.mp_fee_real_mxn > 0
       and new.mp_fee_real_mxn < new.amount_mxn then
      v_mp_fee := new.mp_fee_real_mxn;
      v_fee_is_estimate := false;
    else
      -- Estimación de respaldo: 3.49% + IVA (16%) sobre esa comisión ≈
      -- 4.0484% del bruto. Confirmado contra pagos reales que se queda
      -- corta y no modela el componente fijo del fee real — solo se usa
      -- cuando no hay un fee real confiable disponible.
      v_mp_fee := round(new.amount_mxn * 0.0349 * 1.16, 2);
      v_fee_is_estimate := true;
    end if;

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
      new.amount_mxn, v_mp_fee, v_fee_is_estimate, v_net,
      0.25, v_commission, v_author_share,
      new.currency, 'pending_release', v_available_at
    )
    -- Caso raro: una compra que ya se reembolsó vuelve a aprobarse en MP.
    -- Solo se reabre si la ganancia anterior estaba voided/flagged — nunca
    -- se reescribe una que ya quedó en 'paid' (el autor ya cobró esa).
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
