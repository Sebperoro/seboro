-- SEBORO 0.2 · rollback de emergencia
-- Úsalo SOLO si necesitas volver temporalmente al modelo 0.1.
-- No elimina compras ni obras. Sí elimina anotaciones y entitlements creados por 0.2.

-- Restaurar acceso 0.1 requiere volver a ejecutar seboro-commerce-0.1.sql después
-- de este archivo para reponer sus RPC/policies originales.

begin;

drop trigger if exists seboro_purchase_library_sync on public.purchases;
drop trigger if exists seboro_sync_purchase_library_trigger on public.purchases;

drop table if exists public.reader_annotations cascade;
drop function if exists public.obtain_free_work(text);
drop table if exists public.work_entitlements cascade;

alter table public.user_books
  drop column if exists acquired;

-- IMPORTANTE: vuelve a ejecutar seboro-commerce-0.1.sql para restaurar
-- get_work_access, políticas restrictivas y trigger de compras de la versión 0.1.

commit;
