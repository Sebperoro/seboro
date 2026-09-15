-- SEBORO · Comercio y muestras 0.1
-- Ejecutar UNA sola vez en Supabase > SQL Editor.
-- Objetivos:
-- 1) Configurar muestras gratuitas por obra.
-- 2) Registrar compras reales y su estado.
-- 3) Exponer una RPC única de permisos de lectura.
-- 4) Restringir capítulos y manuscritos completos a quien realmente tenga acceso.
-- 5) Mantener user_books.purchased sincronizado cuando una compra pase a paid/refunded.

create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- OBRAS · configuración comercial / muestra
-- -----------------------------------------------------------------------------

alter table public.works
  add column if not exists sample_enabled boolean not null default true,
  add column if not exists sample_chapters integer not null default 1,
  add column if not exists sample_pages integer not null default 10,
  add column if not exists sample_level_bonus_enabled boolean not null default false;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'works_sample_chapters_range'
      and conrelid = 'public.works'::regclass
  ) then
    alter table public.works
      add constraint works_sample_chapters_range
      check (sample_chapters between 0 and 50);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'works_sample_pages_range'
      and conrelid = 'public.works'::regclass
  ) then
    alter table public.works
      add constraint works_sample_pages_range
      check (sample_pages between 0 and 200);
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- COMPRAS
-- -----------------------------------------------------------------------------

create table if not exists public.purchases (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references auth.users(id) on delete cascade,
  work_id uuid not null references public.works(id) on delete restrict,
  book_slug text not null,
  amount_mxn numeric(10,2) not null check (amount_mxn >= 0),
  currency text not null default 'MXN',
  status text not null default 'pending'
    check (status in ('pending','paid','failed','cancelled','refunded')),
  provider text not null default 'mercadopago',
  provider_preference_id text,
  provider_payment_id text unique,
  provider_status text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  paid_at timestamptz,
  refunded_at timestamptz
);

create index if not exists purchases_buyer_id_idx
  on public.purchases (buyer_id);

create index if not exists purchases_work_id_idx
  on public.purchases (work_id);

create index if not exists purchases_book_slug_idx
  on public.purchases (book_slug);

create index if not exists purchases_paid_lookup_idx
  on public.purchases (buyer_id, work_id, status);

alter table public.purchases enable row level security;

grant select on public.purchases to authenticated;

-- El cliente solo puede LEER sus compras. Crearlas/confirmarlas se hace desde
-- rutas de servidor usando la service role.
drop policy if exists "Users can read their own purchases" on public.purchases;
create policy "Users can read their own purchases"
on public.purchases
for select
to authenticated
using ((select auth.uid()) = buyer_id);

-- -----------------------------------------------------------------------------
-- RPC · estado de acceso de una obra
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
  end if;

  select count(*)::integer
  into v_total_chapters
  from public.work_chapters c
  where c.work_id = v_work.id
    and c.chapter_status = 'published';

  v_full_access :=
    coalesce(v_work.price_mxn, 0) <= 0
    or v_is_owner
    or v_is_admin
    or v_purchased;

  if coalesce(v_work.sample_enabled, true) then
    v_sample_chapters := greatest(0, coalesce(v_work.sample_chapters, 1));
    v_sample_pages := greatest(0, coalesce(v_work.sample_pages, 10));
  end if;

  return jsonb_build_object(
    'slug', v_work.slug,
    'work_id', v_work.id,
    'price_mxn', coalesce(v_work.price_mxn, 0),
    'is_free', coalesce(v_work.price_mxn, 0) <= 0,
    'full_access', v_full_access,
    'purchased', v_purchased,
    'own_work', v_is_owner,
    'is_admin', v_is_admin,
    'sample_enabled', coalesce(v_work.sample_enabled, true),
    'sample_chapters', v_sample_chapters,
    'sample_pages', v_sample_pages,
    'sample_level_bonus_enabled', coalesce(v_work.sample_level_bonus_enabled, false),
    'total_chapters', v_total_chapters,
    'total_pages', coalesce(v_work.page_count, 0),
    'content_format', coalesce(v_work.content_format, 'native'),
    'can_read_sample',
      coalesce(v_work.sample_enabled, true)
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
-- CAPÍTULOS · capa RESTRICTIVA
--
-- No reemplaza las políticas permisivas actuales del proyecto: las limita.
-- El autor/admin conserva acceso; un lector de pago solo ve todo si existe
-- purchase.status='paid'; quien no compró solo ve la muestra autorizada.
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
        -- propietario
        w.author_id = (select auth.uid())

        -- administrador
        or exists (
          select 1
          from public.profiles p
          where p.user_id = (select auth.uid())
            and p.role::text = 'admin'
        )

        -- lector de una obra publicada
        or (
          w.publication_status = 'published'
          and work_chapters.chapter_status = 'published'
          and (
            coalesce(w.price_mxn, 0) <= 0

            or exists (
              select 1
              from public.purchases pu
              where pu.buyer_id = (select auth.uid())
                and pu.work_id = w.id
                and pu.status = 'paid'
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
-- MANUSCRITOS PRIVADOS · evita crear URL firmada del archivo COMPLETO
-- cuando el lector no ha comprado.
--
-- El endpoint /api/reader/pdf/[slug] usa service role y entrega:
--   - PDF completo si hay acceso total.
--   - PDF recortado si solo hay muestra.
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
          and (
            coalesce(w.price_mxn, 0) <= 0
            or exists (
              select 1
              from public.purchases pu
              where pu.buyer_id = (select auth.uid())
                and pu.work_id = w.id
                and pu.status = 'paid'
            )
          )
        )
      )
  )
);

-- -----------------------------------------------------------------------------
-- SINCRONIZAR user_books.purchased CON purchase.status
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

    insert into public.user_books (
      user_id,
      book_slug,
      purchased,
      updated_at
    ) values (
      new.buyer_id,
      new.book_slug,
      true,
      now()
    )
    on conflict (user_id, book_slug)
    do update set
      purchased = true,
      updated_at = now();

  elsif tg_op = 'UPDATE'
    and old.status = 'paid'
    and new.status in ('refunded','cancelled','failed')
  then
    if new.status = 'refunded' and new.refunded_at is null then
      new.refunded_at := now();
    end if;

    if not exists (
      select 1
      from public.purchases pu
      where pu.buyer_id = new.buyer_id
        and pu.work_id = new.work_id
        and pu.status = 'paid'
        and pu.id <> new.id
    ) then
      update public.user_books
      set purchased = false,
          updated_at = now()
      where user_id = new.buyer_id
        and book_slug = new.book_slug;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists seboro_purchase_library_sync on public.purchases;
create trigger seboro_purchase_library_sync
before insert or update of status
on public.purchases
for each row
execute function public.seboro_sync_purchase_library();

-- -----------------------------------------------------------------------------
-- Verificación rápida tras ejecutar:
-- select slug, price_mxn, sample_enabled, sample_chapters, sample_pages
-- from public.works
-- order by created_at desc;
-- -----------------------------------------------------------------------------
