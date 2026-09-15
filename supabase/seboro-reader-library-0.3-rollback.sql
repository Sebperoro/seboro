-- SEBORO 0.3 · rollback
-- Restaura las políticas de work_chapters y storage.objects tal como
-- quedaron en 0.2 (subconsulta cruda contra work_entitlements) y elimina la
-- función has_work_entitlement.
-- Úsalo solo si necesitas revertir la corrección de acceso anónimo.
-- Nota: esto reintroduce el bug "permission denied for table
-- work_entitlements" para visitantes anon en work_chapters.

begin;

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

drop function if exists public.has_work_entitlement(uuid);

commit;
