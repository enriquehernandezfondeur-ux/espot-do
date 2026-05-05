-- ============================================================
-- ESPOT.DO — Migración 015
-- Google Calendar: refresh token en profiles
-- ============================================================

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS google_refresh_token TEXT;

-- Verificar
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'profiles'
  AND column_name IN ('google_calendar_connected', 'google_refresh_token');
