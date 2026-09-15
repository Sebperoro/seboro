-- SEBORO · Biblioteca adquirida + anotaciones de lector 0.2
-- REQUIERE haber ejecutado antes seboro-commerce-0.1.sql
-- Ejecutar UNA sola vez en Supabase > SQL Editor.
--
-- Cambios principales:
-- 1) Una obra gratuita ya no da acceso completo automáticamente: se obtiene primero.
-- 2) Una compra pagada y una obtención gratuita crean un derecho de acceso (entitlement).
-- 3) user_books distingue "acquired" de "purchased".
-- 4) Marcadores y subrayados se sincronizan por usuario.
-- 5) Las políticas de capítulos/manuscritos usan el derecho de acceso y mantienen la muestra.

begin;

create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- BIBLIOTECA · adquirido ≠ comprado
-- -----------------------------------------------------------------------------

alter table public.user_books
  add column if not exists acquired boolean not null default false;

update public.user_books
set acquired = true
where purchased = true
  and acquired = false;

-- -----------------------------------------------------------------------------
-- DERECHOS DE ACCESO
-- -----------------------------------------------------------------------------

create table if not exists public.work_entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  work_id uuid not null references public.works(id) on delete cascade,
  book_slug text not null,
  entitlement_type text not null
    check (entitlement_type in ('free_claim', 'purchase')),
  active boolean not null default true,
  purchase_id uuid references public.purchases(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  revoked_at timestamptz,
  unique (user_id, work_id)
);

create index if not exists work_entitlements_user_idx
  on public.work_entitlements (user_id);

create index if not exists work_entitlements_work_idx
  on public.work_entitlements (work_id);

create index if not exists work_entitlements_access_idx
  on public.work_entitlements (user_id, work_id, active);

alter table public.work_entitlements enable row level security;

grant select on public.work_entitlements to authenticated;

drop policy if exists "Users can read their own entitlements" on public.work_entitlements;
create policy "Users can read their own entitlements"
on public.work_entitlements
for select
to authenticated
using ((select auth.uid()) = user_id);

-- Compras ya pagadas antes de esta migración también deben dar acceso.
insert into public.work_entitlements (
  user_id,
  work_id,
  book_slug,
  entitlement_type,
  active,
  purchase_id,
  created_at,
  updated_at
)
select
  p.buyer_id,
  p.work_id,
  p.book_slug,
  'purchase',
  true,
  p.id,
  coalesce(p.paid_at, p.created_at, now()),
  now()
from public.purchases p
where p.status = 'paid'
on conflict (user_id, work_id)
do update set
  book_slug = excluded.book_slug,
  entitlement_type = 'purchase',
  active = true,
  purchase_id = excluded.purchase_id,
  updated_at = now(),
  revoked_at = null;

-- -----------------------------------------------------------------------------
-- OBTENER OBRA GRATUITA
-- -----------------------------------------------------------------------------

create or replace function public.obtain_free_work(p_slug text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_work public.works%rowtype;
begin
  if v_uid is null then
    raise exception 'Debes iniciar sesión para obtener esta obra.';
  end if;

  select *
  into v_work
  from public.works
  where slug = p_slug
    and publication_status = 'published'
  limit 1;

  if not found then
    raise exception 'Obra no encontrada.';
  end if;

  if coalesce(v_work.price_mxn, 0) > 0 then
    raise exception 'Esta obra es de pago y debe comprarse.';
  end if;

  insert into public.work_entitlements (
    user_id,
    work_id,
    book_slug,
    entitlement_type,
    active,
    updated_at,
    revoked_at
  ) values (
    v_uid,
    v_work.id,
    v_work.slug,
    'free_claim',
    true,
    now(),
    null
  )
  on conflict (user_id, work_id)
  do update set
    book_slug = excluded.book_slug,
    entitlement_type = case
      when public.work_entitlements.entitlement_type = 'purchase'
        then 'purchase'
      else 'free_claim'
    end,
    active = true,
    updated_at = now(),
    revoked_at = null;

  insert into public.user_books (
    user_id,
    book_slug,
    saved,
    acquired,
    purchased,
    updated_at
  ) values (
    v_uid,
    v_work.slug,
    true,
    true,
    false,
    now()
  )
  on conflict (user_id, book_slug)
  do update set
    saved = true,
    acquired = true,
    updated_at = now();

  return public.get_work_access(v_work.slug);
end;
$$;

grant execute on function public.obtain_free_work(text) to authenticated;

-- -----------------------------------------------------------------------------
-- RPC · ESTADO DE ACCESO
-- -----------------------------------------------------------------------------

create or replace function public.get_work_access(p_slug text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_work public.works%rowtype;
  v_uid uuid := auth.uid();
  v_is_admin boolean := false;
  v_is_owner boolean := false;
  v_purchased boolean := false;
  v_entitled boolean := false;
  v_entitlement_type text := null;
  v_full_access boolean := false;
  v_total_chapters integer := 0;
  v_sample_chapters integer := 0;
  v_sample_pages integer := 0;
begin
  select *
  into v_work
  from public.works
  where slug = p_slug
    and publication_status = 'published'
  limit 1;

  if not found then
    return null;
  end if;

  if v_uid is not null then
    select exists (
      select 1
      from public.profiles p
      where p.user_id = v_uid
        and p.role::text = 'admin'
    ) into v_is_admin;

    v_is_owner := v_work.author_id = v_uid;

    select exists (
      select 1
      from public.purchases pu
      where pu.buyer_id = v_uid
        and pu.work_id = v_work.id
        and pu.status = 'paid'
    ) into v_purchased;

    select
      true,
      e.entitlement_type
    into
      v_entitled,
      v_entitlement_type
    from public.work_entitlements e
    where e.user_id = v_uid
      and e.work_id = v_work.id
      and e.active = true
    limit 1;

    v_entitled := coalesce(v_entitled, false);
  end if;

  select count(*)::integer
  into v_total_chapters
  from public.work_chapters c
  where c.work_id = v_work.id
    and c.chapter_status = 'published';

  -- IMPORTANTE: el precio cero ya NO significa acceso completo automático.
  v_full_access :=
    v_is_owner
    or v_is_admin
    or v_entitled;

  if coalesce(v_work.sample_enabled, true) then
    v_sample_chapters := greatest(0, coalesce(v_work.sample_chapters, 1));
    v_sample_pages := greatest(0, coalesce(v_work.sample_pages, 10));
  end if;

  return jsonb_build_object(
    'slug', v_work.slug,
    'work_id', v_work.id,
    'price_mxn', coalesce(v_work.price_mxn, 0),
    'is_free', coalesce(v_work.price_mxn, 0) <= 0,
    'acquired', v_entitled,
    'entitlement_type', v_entitlement_type,
    'full_access', v_full_access,
    'purchased', v_purchased,
    'own_work', v_is_owner,
    'is_admin', v_is_admin,
    'can_obtain',
      coalesce(v_work.price_mxn, 0) <= 0
      and v_uid is not null
      and not v_full_access,
    'sample_enabled', coalesce(v_work.sample_enabled, true),
    'sample_chapters', v_sample_chapters,
    'sample_pages', v_sample_pages,
    'sample_level_bonus_enabled', coalesce(v_work.sample_level_bonus_enabled, false),
    'total_chapters', v_total_chapters,
    'total_pages', coalesce(v_work.page_count, 0),
    'content_format', coalesce(v_work.content_format, 'native'),
    'can_read_sample',
      not v_full_access
      and coalesce(v_work.sample_enabled, true)
      and (
        case
          when coalesce(v_work.content_format, 'native') = 'pdf'
            then v_sample_pages > 0
          else v_sample_chapters > 0
        end
      )
  );
end;
$$;

grant execute on function public.get_work_access(text) to anon, authenticated;

-- -----------------------------------------------------------------------------
-- COMPRAS → DERECHO DE ACCESO + BIBLIOTECA
-- -----------------------------------------------------------------------------

create or replace function public.seboro_sync_purchase_library()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at := now();

  if new.status = 'paid' then
    if new.paid_at is null then
      new.paid_at := now();
    end if;

    insert into public.work_entitlements (
      user_id,
      work_id,
      book_slug,
      entitlement_type,
      active,
      purchase_id,
      updated_at,
      revoked_at
    ) values (
      new.buyer_id,
      new.work_id,
      new.book_slug,
      'purchase',
      true,
      new.id,
      now(),
      null
    )
    on conflict (user_id, work_id)
    do update set
      book_slug = excluded.book_slug,
      entitlement_type = 'purchase',
      active = true,
      purchase_id = excluded.purchase_id,
      updated_at = now(),
      revoked_at = null;

    insert into public.user_books (
      user_id,
      book_slug,
      saved,
      acquired,
      purchased,
      updated_at
    ) values (
      new.buyer_id,
      new.book_slug,
      true,
      true,
      true,
      now()
    )
    on conflict (user_id, book_slug)
    do update set
      saved = true,
      acquired = true,
      purchased = true,
      updated_at = now();

  elsif tg_op = 'UPDATE'
    and old.status = 'paid'
    and new.status in ('refunded', 'cancelled', 'failed')
  then
    if new.status = 'refunded' and new.refunded_at is null then
      new.refunded_at := now();
    end if;

    if exists (
      select 1
      from public.purchases pu
      where pu.buyer_id = new.buyer_id
        and pu.work_id = new.work_id
        and pu.status = 'paid'
        and pu.id <> new.id
    ) then
      -- Si existe otra compra pagada de la misma obra, conservamos el acceso.
      update public.work_entitlements
      set
        active = true,
        entitlement_type = 'purchase',
        purchase_id = (
          select pu.id
          from public.purchases pu
          where pu.buyer_id = new.buyer_id
            and pu.work_id = new.work_id
            and pu.status = 'paid'
            and pu.id <> new.id
          order by coalesce(pu.paid_at, pu.created_at) desc
          limit 1
        ),
        revoked_at = null,
        updated_at = now()
      where user_id = new.buyer_id
        and work_id = new.work_id;

      update public.user_books
      set
        purchased = true,
        acquired = true,
        updated_at = now()
      where user_id = new.buyer_id
        and book_slug = new.book_slug;
    else
      update public.work_entitlements
      set
        active = false,
        revoked_at = now(),
        updated_at = now()
      where user_id = new.buyer_id
        and work_id = new.work_id
        and entitlement_type = 'purchase';

      update public.user_books
      set
        purchased = false,
        acquired = exists (
          select 1
          from public.work_entitlements e
          where e.user_id = new.buyer_id
            and e.work_id = new.work_id
            and e.active = true
        ),
        updated_at = now()
      where user_id = new.buyer_id
        and book_slug = new.book_slug;
    end if;
  end if;

  return new;
end;
$$;

-- Comercio 0.1 creó el trigger con otro nombre. Eliminamos ambos nombres
-- antes de crear uno solo para evitar que la misma compra se procese dos veces.
drop trigger if exists seboro_purchase_library_sync on public.purchases;
drop trigger if exists seboro_sync_purchase_library_trigger on public.purchases;

create trigger seboro_sync_purchase_library_trigger
before insert or update of status
on public.purchases
for each row
execute function public.seboro_sync_purchase_library();

-- -----------------------------------------------------------------------------
-- CAPÍTULOS · acceso completo solo por entitlement/autor/admin; muestra aparte
-- -----------------------------------------------------------------------------

alter table public.work_chapters enable row level security;

drop policy if exists "SEBORO commerce chapter access" on public.work_chapters;
create policy "SEBORO commerce chapter access"
on public.work_chapters
as restrictive
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.works w
    where w.id = work_chapters.work_id
      and (
        w.author_id = (select auth.uid())

        or exists (
          select 1
          from public.profiles p
          where p.user_id = (select auth.uid())
            and p.role::text = 'admin'
        )

        or (
          w.publication_status = 'published'
          and work_chapters.chapter_status = 'published'
          and (
            exists (
              select 1
              from public.work_entitlements e
              where e.user_id = (select auth.uid())
                and e.work_id = w.id
                and e.active = true
            )

            or (
              coalesce(w.sample_enabled, true)
              and work_chapters.chapter_number <= greatest(
                0,
                coalesce(w.sample_chapters, 1)
              )
            )
          )
        )
      )
  )
);

-- -----------------------------------------------------------------------------
-- MANUSCRITOS · nunca se entrega el archivo completo sin entitlement
-- -----------------------------------------------------------------------------

drop policy if exists "SEBORO commerce manuscript access" on storage.objects;
create policy "SEBORO commerce manuscript access"
on storage.objects
as restrictive
for select
to anon, authenticated
using (
  bucket_id <> 'book-manuscripts'
  or exists (
    select 1
    from public.works w
    where w.source_file_path = storage.objects.name
      and (
        w.author_id = (select auth.uid())

        or exists (
          select 1
          from public.profiles p
          where p.user_id = (select auth.uid())
            and p.role::text = 'admin'
        )

        or (
          w.publication_status = 'published'
          and exists (
            select 1
            from public.work_entitlements e
            where e.user_id = (select auth.uid())
              and e.work_id = w.id
              and e.active = true
          )
        )
      )
  )
);

-- -----------------------------------------------------------------------------
-- ANOTACIONES · MARCADORES + SUBRAYADOS
-- -----------------------------------------------------------------------------

create table if not exists public.reader_annotations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  work_id uuid not null references public.works(id) on delete cascade,
  book_slug text not null,
  annotation_type text not null
    check (annotation_type in ('bookmark', 'highlight')),
  content_format text not null
    check (content_format in ('native', 'epub', 'pdf')),
  page_number integer,
  chapter_number integer,
  start_offset integer,
  end_offset integer,
  selected_text text,
  rects jsonb not null default '[]'::jsonb,
  color text not null default 'yellow',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reader_annotations_page_positive
    check (page_number is null or page_number >= 1),
  constraint reader_annotations_offsets_valid
    check (
      start_offset is null
      or end_offset is null
      or (start_offset >= 0 and end_offset >= start_offset)
    )
);

create index if not exists reader_annotations_user_book_idx
  on public.reader_annotations (user_id, book_slug, created_at desc);

create index if not exists reader_annotations_work_idx
  on public.reader_annotations (work_id);

alter table public.reader_annotations enable row level security;

grant select, insert, update, delete
on public.reader_annotations
to authenticated;

drop policy if exists "Users can read their own reader annotations" on public.reader_annotations;
create policy "Users can read their own reader annotations"
on public.reader_annotations
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can create their own reader annotations" on public.reader_annotations;
create policy "Users can create their own reader annotations"
on public.reader_annotations
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own reader annotations" on public.reader_annotations;
create policy "Users can update their own reader annotations"
on public.reader_annotations
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their own reader annotations" on public.reader_annotations;
create policy "Users can delete their own reader annotations"
on public.reader_annotations
for delete
to authenticated
using ((select auth.uid()) = user_id);

-- Verificación opcional después de ejecutar:
-- select column_name from information_schema.columns
-- where table_schema='public' and table_name='user_books' and column_name='acquired';
--
-- select to_regclass('public.work_entitlements');
-- select to_regclass('public.reader_annotations');

commit;
