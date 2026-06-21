-- Organiza con Espot — actividades del cliente (entidad nueva, separada de external_events)

CREATE TABLE IF NOT EXISTS activities (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizer_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type              TEXT NOT NULL,
  title             TEXT NOT NULL,
  description       TEXT,
  status            TEXT NOT NULL DEFAULT 'borrador'
                      CHECK (status IN ('borrador','publicada','en_curso','finalizada','cancelada')),
  event_date        DATE,
  start_time        TIME,
  end_time          TIME,
  expected_people   INTEGER,
  location_mode     TEXT CHECK (location_mode IN ('booking','space','external')),
  booking_id        UUID REFERENCES bookings(id) ON DELETE SET NULL,
  space_id          UUID REFERENCES spaces(id)   ON DELETE SET NULL,
  external_location TEXT,
  cover_image       TEXT,
  public_code       TEXT NOT NULL UNIQUE,
  public_enabled    BOOLEAN NOT NULL DEFAULT FALSE,
  allow_companions  BOOLEAN NOT NULL DEFAULT TRUE,
  require_checkin   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS activities_organizer_idx ON activities(organizer_id);
CREATE INDEX IF NOT EXISTS activities_public_code_idx ON activities(public_code);
CREATE INDEX IF NOT EXISTS activities_booking_idx ON activities(booking_id);
CREATE INDEX IF NOT EXISTS activities_space_idx ON activities(space_id);

CREATE TABLE IF NOT EXISTS activity_questions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  label       TEXT NOT NULL,
  field_type  TEXT NOT NULL DEFAULT 'text'
                CHECK (field_type IN ('text','choice','boolean','number')),
  options     JSONB,
  required    BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order  INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS activity_questions_activity_idx ON activity_questions(activity_id);

CREATE TABLE IF NOT EXISTS activity_participants (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id   UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  contact       TEXT,
  status        TEXT NOT NULL DEFAULT 'confirmado'
                  CHECK (status IN ('invitado','confirmado','rechazado','registrado')),
  companions    INTEGER NOT NULL DEFAULT 0 CHECK (companions >= 0 AND companions <= 20),
  answers       JSONB,
  rsvp_token    TEXT NOT NULL UNIQUE,
  checked_in_at TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS activity_participants_activity_idx ON activity_participants(activity_id);

-- RLS: solo el organizador toca sus filas. La lectura/alta pública va por service-role.
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "activities_owner" ON activities
  FOR ALL USING (organizer_id = auth.uid()) WITH CHECK (organizer_id = auth.uid());

CREATE POLICY "activity_questions_owner" ON activity_questions
  FOR ALL USING (EXISTS (SELECT 1 FROM activities a WHERE a.id = activity_id AND a.organizer_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM activities a WHERE a.id = activity_id AND a.organizer_id = auth.uid()));

CREATE POLICY "activity_participants_owner" ON activity_participants
  FOR ALL USING (EXISTS (SELECT 1 FROM activities a WHERE a.id = activity_id AND a.organizer_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM activities a WHERE a.id = activity_id AND a.organizer_id = auth.uid()));
