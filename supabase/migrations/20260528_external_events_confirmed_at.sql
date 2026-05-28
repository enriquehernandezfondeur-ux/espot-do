-- Flag para distinguir primera confirmación de re-confirmaciones
-- Permite no duplicar email al cliente cuando el host pasa varias veces por pendiente→confirmado
ALTER TABLE external_events
  ADD COLUMN IF NOT EXISTS confirmed_at timestamptz;

-- Backfill: los eventos que actualmente están en 'confirmado' ya fueron notificados
UPDATE external_events
  SET confirmed_at = updated_at
  WHERE status = 'confirmado' AND confirmed_at IS NULL;
