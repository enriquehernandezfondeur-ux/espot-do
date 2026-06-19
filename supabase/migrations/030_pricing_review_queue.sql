-- 030_pricing_review_queue.sql · Espot 2.0 (F8)
-- Marca los precios legacy para revisión admin y respalda los datos.
-- NO convierte automáticamente: convertir minimum_consumption/fixed_package a
-- "por hora" cambiaría cuánto paga el cliente según las horas (el consumo mínimo
-- es un monto fijo; por hora escala). La conversión la confirma un humano en
-- /admin/revision-precios (con una sugerencia calculada). Aditiva y reversible.

-- Bandera de revisión
alter table space_pricing
  add column if not exists needs_pricing_review boolean not null default false;

-- Respaldo de los precios legacy (idempotente)
create table if not exists space_pricing_backup_pre_espot2 as
  select * from space_pricing where false;
insert into space_pricing_backup_pre_espot2
  select sp.* from space_pricing sp
  where sp.pricing_type in ('minimum_consumption','fixed_package','custom_quote')
    and not exists (select 1 from space_pricing_backup_pre_espot2 b where b.id = sp.id);

-- Marcar legacy para revisión (siguen funcionando con su cálculo actual)
update space_pricing
  set needs_pricing_review = true
  where pricing_type in ('minimum_consumption','fixed_package','custom_quote')
    and needs_pricing_review = false;

-- DOWN (reversión manual):
-- update space_pricing set needs_pricing_review = false;
-- alter table space_pricing drop column if exists needs_pricing_review;
-- drop table if exists space_pricing_backup_pre_espot2;
