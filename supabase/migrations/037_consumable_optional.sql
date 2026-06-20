-- ============================================================
-- 037 — Elección de consumible por el cliente al reservar
-- (spec: docs/superpowers/specs/2026-06-20-guest-consumable-choice-design.md)
--
-- consumable_optional: opt-in del host. Cuando true (solo se honra en precio
-- 'hourly'), el cliente elige al reservar entre "uso del espacio" y "consumible".
-- La elección NO cambia la tarifa, solo el destino del monto.
--
-- bookings.is_consumable: la elección efectiva fijada al reservar. NULL para
-- reservas no-hourly o anteriores a esta feature.
--
-- Aditivo e idempotente: NO-OP si ya existen las columnas.
-- ============================================================

alter table space_pricing add column if not exists consumable_optional boolean not null default false;
alter table bookings      add column if not exists is_consumable       boolean;

comment on column space_pricing.consumable_optional is 'Si true (solo hourly), el cliente elige uso del espacio vs consumible al reservar. No cambia el precio.';
comment on column bookings.is_consumable           is 'Elección del cliente fijada al reservar: true=consumible (crédito A&B), false=uso del espacio, null=no aplica.';

-- DOWN (reversión manual):
-- alter table space_pricing drop column if exists consumable_optional;
-- alter table bookings      drop column if exists is_consumable;
