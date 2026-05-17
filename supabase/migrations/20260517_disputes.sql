-- ── Sistema de Disputas — Espot ────────────────────────────
-- Creado: 2026-05-17

CREATE TABLE IF NOT EXISTS disputes (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id    uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  opened_by     uuid NOT NULL REFERENCES profiles(id),
  against       uuid NOT NULL REFERENCES profiles(id),
  reason        text NOT NULL CHECK (char_length(reason) >= 20),
  category      text NOT NULL CHECK (category IN (
    'espacio_diferente', 'cancelacion_injusta', 'pago_incorrecto',
    'host_no_responde', 'cliente_no_responde', 'danos', 'otro'
  )),
  evidence_urls text[] DEFAULT '{}',
  status        text NOT NULL DEFAULT 'abierta' CHECK (status IN (
    'abierta', 'en_revision', 'resuelta_cliente', 'resuelta_host', 'cerrada'
  )),
  admin_notes   text,
  resolution    text,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now(),
  resolved_at   timestamptz
);

CREATE INDEX IF NOT EXISTS disputes_booking_id_idx ON disputes(booking_id);
CREATE INDEX IF NOT EXISTS disputes_status_idx     ON disputes(status);
CREATE INDEX IF NOT EXISTS disputes_opened_by_idx  ON disputes(opened_by);
CREATE INDEX IF NOT EXISTS disputes_against_idx    ON disputes(against);

-- Trigger: actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_disputes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS disputes_updated_at_trigger ON disputes;
CREATE TRIGGER disputes_updated_at_trigger
  BEFORE UPDATE ON disputes
  FOR EACH ROW EXECUTE FUNCTION update_disputes_updated_at();

-- Row Level Security
ALTER TABLE disputes ENABLE ROW LEVEL SECURITY;

-- Las partes de la disputa pueden verla
CREATE POLICY "disputes_select" ON disputes FOR SELECT
  USING (auth.uid() = opened_by OR auth.uid() = against);

-- Solo el que abre puede crear
CREATE POLICY "disputes_insert" ON disputes FOR INSERT
  WITH CHECK (auth.uid() = opened_by);

-- Solo admin puede actualizar (via service role en server actions)
-- Las partes no pueden editar directamente
CREATE POLICY "disputes_update_admin" ON disputes FOR UPDATE
  USING (false);
