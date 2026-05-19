-- ── Tema: colores configurables desde el admin ─────────────────
-- Ejecutar en Supabase SQL Editor

-- Agregar columna description si no existe
ALTER TABLE marketplace_config
  ADD COLUMN IF NOT EXISTS description text;

-- Insertar filas de tema (sin pisar si ya existen)
INSERT INTO marketplace_config (key, value, label, group_name, description) VALUES
  ('theme_brand',        '#35C493', 'Color principal',        'tema', 'Color verde de marca — botones, íconos activos, precios'),
  ('theme_brand_dark',   '#28A87C', 'Color principal oscuro', 'tema', 'Hover del color principal'),
  ('theme_brand_light',  '#4DD9A7', 'Color secundario',       'tema', 'Variante clara del color principal'),
  ('theme_brand_navy',   '#03313C', 'Color navy',             'tema', 'Textos oscuros y fondos oscuros de marca'),
  ('theme_brand_lime',   '#D4FF58', 'Color lima (acento)',    'tema', 'Acento secundario — uso muy puntual'),
  ('theme_marker_color', '#35C493', 'Marcador mapa — fondo', 'tema', 'Color de fondo del pin en el mapa de búsqueda'),
  ('theme_marker_text',  '#ffffff', 'Marcador mapa — texto', 'tema', 'Color del texto/precio del pin en el mapa')
ON CONFLICT (key) DO NOTHING;

-- RLS: permitir lectura pública de las filas de tema
-- (necesario para que el root layout las lea sin auth)
CREATE POLICY IF NOT EXISTS "tema_config_public_read"
  ON marketplace_config
  FOR SELECT
  TO anon, authenticated
  USING (group_name = 'tema');
