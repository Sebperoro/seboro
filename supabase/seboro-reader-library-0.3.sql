-- SEBORO · Corrección de acceso anónimo a capítulos y manuscritos 0.3
-- REQUIERE haber ejecutado antes seboro-reader-library-0.2.sql
-- Ejecutar UNA sola vez en Supabase > SQL Editor.
--
-- Problema que corrige:
-- Las políticas "SEBORO commerce chapter access" (work_chapters) y
-- "SEBORO commerce manuscript access" (storage.objects) evalúan una
-- subconsulta cruda contra public.work_entitlements. Postgres evalúa esa
-- subconsulta con los privilegios del rol que ejecuta la consulta externa
-- (no con privilegios elevados), y seboro-reader-library-0.2.sql solo otorgó
-- GRANT SELECT sobre work_entitlements al rol authenticated, nunca a anon,
-- aunque ambas políticas están declaradas "to anon, authenticated".
-- Resultado confirmado en vivo: cualquier visitante sin sesión que pide los
-- capítulos publicados de una obra revienta con "permission denied for
-- table work_entitlements", aunque nunca pidió esa tabla directamente
-- (funciona correctamente como authenticated). La política de storage
-- comparte el mismo patrón; no se confirmó un path de explotación activo
-- para ella, pero es la misma vulnerabilidad latente y el costo de
-- corregirla ahora es mínimo.
--
-- Solución (opción B): envolver la verificación de derecho de acceso en una
-- función security definer. Ambas políticas dejan de tocar work_entitlements
-- en crudo; en su lugar llaman a la función, que corre con los privilegios
-- de su dueño (bypassa el problema de grants) y solo expone un booleano. No
-- se toca ningún GRANT sobre la tabla work_entitlements en sí.

begin;

-- -----------------------------------------------------------------------------
-- FUNCIÓN · ¿el usuario actual tiene un derecho de acceso activo a esta obra?
-- -----------------------------------------------------------------------------

create or replace function public.has_work_entitlement(p_work_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.work_entitlements e
    where e.user_id = auth.uid()
      and e.work_id = p_work_id
      and e.active = true
  );
$$;

revoke all on function public.has_work_entitlement(uuid) from public;
grant execute on function public.has_work_entitlement(uuid) to anon, authenticated;

-- -----------------------------------------------------------------------------
-- CAPÍTULOS · política actualizada, sin subconsulta cruda a work_entitlements
-- -----------------------------------------------------------------------------

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
            public.has_work_entitlement(w.id)

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
-- MANUSCRITOS · política actualizada, sin subconsulta cruda a work_entitlements
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
          and public.has_work_entitlement(w.id)
        )
      )
  )
);

-- Verificación opcional después de ejecutar:
-- select proname, prosecdef from pg_proc where proname = 'has_work_entitlement';
-- select policyname, roles, qual from pg_policies where tablename = 'work_chapters';
-- select policyname, roles, qual from pg_policies where tablename = 'objects' and schemaname = 'storage';

commit;
