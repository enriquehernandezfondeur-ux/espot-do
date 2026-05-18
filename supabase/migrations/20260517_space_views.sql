-- ── Tabla space_views — analytics de visitas al espacio ──────────────────
-- Registra cuántas veces se vio el detalle de cada espacio por día.
-- La API /api/spaces/view hace un upsert/increment en esta tabla.

CREATE TABLE IF NOT EXISTS space_views (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id   uuid        NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  view_date  date        NOT NULL,
  view_count integer     NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT space_views_space_date_unique UNIQUE (space_id, view_date)
);

-- Índice para consultas del dashboard del host (por espacio + rango de fechas)
CREATE INDEX IF NOT EXISTS idx_space_views_space_date
  ON space_views (space_id, view_date DESC);

-- RLS: los hosts solo pueden leer las vistas de sus propios espacios.
-- La API route usa service_role y bypassea RLS para escribir.
ALTER TABLE space_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Hosts can read their own space views"
  ON space_views FOR SELECT
  USING (
    space_id IN (
      SELECT id FROM spaces WHERE host_id = auth.uid()
    )
  );
