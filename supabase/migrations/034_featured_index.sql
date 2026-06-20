-- ============================================================
-- 034 — Índice para el orden del marketplace (destacados primero)
-- La query de /buscar filtra is_published+is_active y ordena por
-- is_featured DESC, created_at DESC. Este índice parcial compuesto cubre
-- exactamente ese plan. Idempotente y seguro (no toca datos).
-- ============================================================

create index if not exists idx_spaces_marketplace_order
  on spaces (is_featured desc, created_at desc)
  where is_published = true and is_active = true;
