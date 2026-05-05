-- ============================================================
-- ESPOT.DO — Migración 014
-- Integración iCal + preparación Google Calendar
-- ============================================================

-- ── 1. TOKEN iCAL EN PERFILES ────────────────────────────
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS ical_token TEXT;

-- Índice para lookup rápido por token (endpoint público)
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_ical_token
  ON profiles(ical_token)
  WHERE ical_token IS NOT NULL;

-- ── 2. GOOGLE CALENDAR — preparación Phase 2 ─────────────
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS google_calendar_event_id TEXT;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS google_calendar_connected BOOLEAN DEFAULT FALSE;

-- ── 3. FUNCIÓN PÚBLICA PARA FEED iCAL ───────────────────
-- SECURITY DEFINER: permite acceso público al feed sin
-- exponer datos de otros propietarios. El token es el
-- único mecanismo de autenticación del feed.
CREATE OR REPLACE FUNCTION get_ical_feed_data(p_token TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_host_id UUID;
  v_result  JSON;
BEGIN
  -- Buscar propietario por token
  SELECT id INTO v_host_id
  FROM profiles
  WHERE ical_token = p_token;

  -- Token inválido → null
  IF v_host_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT json_build_object(
    'host_name', (
      SELECT full_name FROM profiles WHERE id = v_host_id
    ),
    'spaces', (
      SELECT json_agg(json_build_object(
        'id',      id,
        'name',    name,
        'address', address,
        'city',    city,
        'sector',  sector
      ))
      FROM spaces
      WHERE host_id = v_host_id
        AND is_active = true
    ),
    'bookings', (
      SELECT json_agg(json_build_object(
        'id',          b.id,
        'space_id',    b.space_id,
        'event_date',  b.event_date::text,
        'start_time',  b.start_time::text,
        'end_time',    b.end_time::text,
        'event_type',  b.event_type,
        'guest_count', b.guest_count,
        'status',      b.status,
        'guest_name',  p.full_name
      ))
      FROM bookings b
      JOIN profiles p ON p.id = b.guest_id
      WHERE b.space_id IN (
        SELECT id FROM spaces WHERE host_id = v_host_id AND is_active = true
      )
        AND b.status IN ('confirmed', 'accepted', 'completed')
    ),
    'blocks', (
      SELECT json_agg(json_build_object(
        'id',           sa.id,
        'space_id',     sa.space_id,
        'blocked_date', sa.blocked_date::text,
        'reason',       sa.reason
      ))
      FROM space_availability sa
      WHERE sa.space_id IN (
        SELECT id FROM spaces WHERE host_id = v_host_id AND is_active = true
      )
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- ── 4. VERIFICAR ─────────────────────────────────────────
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'profiles'
  AND column_name IN ('ical_token', 'google_calendar_connected');
