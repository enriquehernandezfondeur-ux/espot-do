-- Add host_response to reviews table
-- Run this in Supabase SQL editor: Dashboard → SQL Editor → New query

ALTER TABLE reviews
  ADD COLUMN IF NOT EXISTS host_response     text,
  ADD COLUMN IF NOT EXISTS host_response_at  timestamptz;

-- Also add weekend/dynamic pricing fields to space_pricing
ALTER TABLE space_pricing
  ADD COLUMN IF NOT EXISTS weekend_multiplier  numeric(4,2) DEFAULT 1.00,
  ADD COLUMN IF NOT EXISTS peak_multiplier     numeric(4,2) DEFAULT 1.00,
  ADD COLUMN IF NOT EXISTS min_advance_amount  integer      DEFAULT 0;

-- Add instant_booking toggle to spaces if not exists
ALTER TABLE spaces
  ADD COLUMN IF NOT EXISTS instant_booking boolean DEFAULT false;

COMMENT ON COLUMN reviews.host_response    IS 'Respuesta pública del propietario a la reseña';
COMMENT ON COLUMN reviews.host_response_at IS 'Fecha en que el propietario respondió';
COMMENT ON COLUMN space_pricing.weekend_multiplier IS 'Multiplicador de precio para vie/sáb/dom. Ej: 1.30 = 30% más caro';
COMMENT ON COLUMN space_pricing.peak_multiplier    IS 'Multiplicador para temporada alta (dic-ene, semana santa)';
COMMENT ON COLUMN space_pricing.min_advance_amount IS 'Anticipo mínimo en RD$ independientemente del % del plan de cuotas';
