-- ============================================================
-- ESPOT.DO — Migración 023
-- Reservas por turnos vs. exclusivas por día (configurable por espacio)
--
-- single_booking_per_day = false (default): el espacio admite varios
--   turnos en una misma fecha; el choque se valida por solapamiento de
--   horario (ej. restaurante con almuerzo y cena).
-- single_booking_per_day = true: el espacio se reserva en exclusiva por
--   jornada; la primera reserva bloquea toda la fecha (ej. villa, finca).
--
-- Antes, cualquier reserva sin horario "real" bloqueaba la fecha completa,
-- lo que impedía vender múltiples turnos en consumo mínimo / paquete fijo.
-- Ejecutar en Supabase SQL Editor. Seguro de re-ejecutar.
-- ============================================================

ALTER TABLE spaces
  ADD COLUMN IF NOT EXISTS single_booking_per_day boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN spaces.single_booking_per_day IS
  'true = espacio exclusivo por jornada (una reserva bloquea el día); false = admite varios turnos por horario';
