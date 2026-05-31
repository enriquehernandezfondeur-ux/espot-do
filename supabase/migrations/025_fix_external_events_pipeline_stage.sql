-- ============================================================
-- ESPOT.DO — Migración 025
-- Fix: crear eventos directos fallaba con
--   new row for relation "external_events" violates check
--   constraint "external_events_pipeline_stage_check"
--
-- La columna pipeline_stage (de un feature de "pipeline" que NO está
-- implementado en la app) tenía una CHECK que rechazaba el valor por
-- defecto / el que pone un trigger, bloqueando inserts válidos.
-- Nada en el código lee pipeline_stage, así que relajamos la columna:
-- quitamos la CHECK, la hacemos NULL-able y con default NULL.
--
-- Ejecutar en Supabase SQL Editor. Seguro de re-ejecutar.
-- ============================================================

-- 1. Eliminar la CHECK que bloquea la creación
ALTER TABLE external_events DROP CONSTRAINT IF EXISTS external_events_pipeline_stage_check;

-- 2. Dejar la columna libre (si existe)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'external_events' AND column_name = 'pipeline_stage'
  ) THEN
    EXECUTE 'ALTER TABLE external_events ALTER COLUMN pipeline_stage DROP NOT NULL';
    EXECUTE 'ALTER TABLE external_events ALTER COLUMN pipeline_stage SET DEFAULT NULL';
  END IF;
END $$;

-- ── VERIFICACIÓN ─────────────────────────────────────────────
-- No deben quedar constraints CHECK sobre pipeline_stage:
SELECT conname
FROM pg_constraint
WHERE conrelid = 'public.external_events'::regclass
  AND contype = 'c';
