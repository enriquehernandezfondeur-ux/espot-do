-- ============================================================
-- 036 — Versiona las columnas de horas de space_pricing en el historial activo
-- (deuda de migración detectada en la auditoría de tarjetas del marketplace, 2026-06-20).
--
-- Estas columnas existen en producción desde el esquema base, pero solo estaban
-- declaradas en el historial de migraciones legacy (espot-saas/supabase/migrations).
-- La tarjeta del marketplace y el BookingWidget ahora dependen de min_hours/max_hours
-- para mostrar el rango de horas y calcular el mínimo real — por eso se versionan
-- aquí, en el historial activo (host-dashboard/supabase/migrations).
--
-- TODO es `ADD COLUMN IF NOT EXISTS`: en producción es un NO-OP (las columnas ya
-- existen); su único efecto es que un entorno NUEVO/staging quede idéntico a prod
-- sin aplicar SQL manual. Mismo patrón seguro que la migración 033.
-- ============================================================

alter table space_pricing add column if not exists min_hours     int default 1;
alter table space_pricing add column if not exists max_hours     int;
alter table space_pricing add column if not exists session_hours int;
alter table space_pricing add column if not exists package_hours int;

comment on column space_pricing.min_hours     is 'Mínimo de horas por reserva (hourly y minimum_consumption). Define el mínimo real para alquilar = tarifa × min_hours';
comment on column space_pricing.max_hours     is 'Máximo de horas por reserva. NULL = sin tope';
comment on column space_pricing.session_hours is 'Duración fija de la sesión para minimum_consumption (legado; min/max_hours es la fuente preferida)';
comment on column space_pricing.package_hours is 'Horas incluidas en fixed_package; el excedente se cobra a extra_hour_price';

-- DOWN (reversión manual): no aplica — son columnas base, no deben eliminarse.
