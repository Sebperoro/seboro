-- SEBORO · Comercio y muestras 0.1 · ROLLBACK
-- Úsalo SOLO si necesitas retirar por completo este bloque.
-- No toca obras, capítulos, usuarios ni manuscritos existentes;
-- elimina únicamente objetos/campos creados por seboro-commerce-0.1.sql.

-- Quitar restricciones añadidas por este bloque.
drop policy if exists "SEBORO commerce chapter access" on public.work_chapters;
drop policy if exists "SEBORO commerce manuscript access" on storage.objects;

-- Quitar sincronización de compras.
drop trigger if exists seboro_purchase_library_sync on public.purchases;
drop function if exists public.seboro_sync_purchase_library();

-- Quitar RPC de acceso.
drop function if exists public.get_work_access(text);

-- Quitar tabla de compras creada por este bloque.
drop table if exists public.purchases;

-- Quitar configuración de muestra añadida a works.
alter table public.works
  drop constraint if exists works_sample_chapters_range,
  drop constraint if exists works_sample_pages_range,
  drop column if exists sample_enabled,
  drop column if exists sample_chapters,
  drop column if exists sample_pages,
  drop column if exists sample_level_bonus_enabled;
