-- 028_pricing_consumable.sql · Espot 2.0 (F3)
-- Interruptor de presentación: si true, todo el monto pagado por horas es
-- crédito de consumo (alimentos/bebidas). NO cambia el cálculo del precio.
alter table space_pricing
  add column if not exists is_consumable boolean not null default false;

-- DOWN (reversión manual):
-- alter table space_pricing drop column if exists is_consumable;
