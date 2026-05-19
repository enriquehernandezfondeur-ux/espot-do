-- ── Columnas de medios opcionales en spaces ─────────────────
-- Agregar video_url, menu_url y menu_file_name si no existen.
-- Ejecutar en Supabase SQL Editor.

ALTER TABLE spaces
  ADD COLUMN IF NOT EXISTS video_url      text,
  ADD COLUMN IF NOT EXISTS menu_url       text,
  ADD COLUMN IF NOT EXISTS menu_file_name text;
