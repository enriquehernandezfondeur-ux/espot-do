-- 026_categories_espot2.sql
-- Espot 2.0 · F1: amplía las categorías permitidas de spaces.category.
-- Añade 'wellness' y 'popup' (categorías estrella nuevas) y normaliza 'jardin'
-- (usado en el código pero ausente del CHECK original de 001_initial_schema.sql).
-- Aditiva y reversible. NO toca space_addons.category (dominio distinto).
-- Aplicar manualmente en Supabase: el push a Vercel NO ejecuta SQL.

alter table spaces drop constraint if exists spaces_category_check;

alter table spaces add constraint spaces_category_check
  check (category in (
    'salon','restaurante','bar','rooftop','terraza','jardin',
    'estudio','coworking','wellness','popup',
    'hotel','villa','lounge','otro'
  ));

-- ─────────────────────────────────────────────────────────────
-- DOWN (reversión manual) — restaura el CHECK original:
-- alter table spaces drop constraint if exists spaces_category_check;
-- alter table spaces add constraint spaces_category_check
--   check (category in (
--     'salon','restaurante','bar','rooftop','estudio','coworking',
--     'hotel','terraza','lounge','villa','otro'
--   ));
