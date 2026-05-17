-- Añadir campo admin_notes a la tabla liquidaciones
-- Para que las notas del admin persistan en DB en lugar de localStorage
ALTER TABLE liquidaciones ADD COLUMN IF NOT EXISTS admin_notes text;
