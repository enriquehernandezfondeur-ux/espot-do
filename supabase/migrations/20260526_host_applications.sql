-- ============================================================
-- Host Application & Approval System
-- Hosts must apply and be approved by admin before accessing
-- the host dashboard.
-- ============================================================

-- 1. Add host_status to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS host_status text
    CHECK (host_status IN ('none','applied','approved','rejected','suspended'))
    DEFAULT 'none';

-- Hosts that already exist are automatically approved
UPDATE profiles SET host_status = 'approved' WHERE role = 'host';

-- 2. Main applications table
CREATE TABLE IF NOT EXISTS host_applications (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,

  -- Business info
  business_name     text NOT NULL,
  space_type        text NOT NULL,
  city              text NOT NULL,
  sector            text,
  phone             text NOT NULL,
  whatsapp          text,
  instagram         text,

  -- Space details
  description       text NOT NULL CHECK (char_length(description) >= 50),
  capacity_estimate integer,
  event_types       text[] DEFAULT '{}',

  -- Photos (Supabase Storage URLs)
  photos            text[] DEFAULT '{}',

  -- AI analysis
  ai_score          numeric(5,2),
  ai_analysis       jsonb,

  -- Status
  status            text NOT NULL
    CHECK (status IN ('draft','submitted','analyzing','pending_admin','approved','rejected','info_requested'))
    DEFAULT 'draft',

  -- Admin review
  admin_notes       text,
  rejection_reason  text,
  info_request_msg  text,
  reviewed_by       uuid REFERENCES profiles(id),
  reviewed_at       timestamptz,

  created_at        timestamptz DEFAULT now() NOT NULL,
  updated_at        timestamptz DEFAULT now() NOT NULL,

  -- One active application per user at a time
  CONSTRAINT unique_active_application UNIQUE (user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_host_applications_user_id ON host_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_host_applications_status  ON host_applications(status);
CREATE INDEX IF NOT EXISTS idx_host_applications_created ON host_applications(created_at DESC);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_host_applications_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_host_applications_updated_at ON host_applications;
CREATE TRIGGER trg_host_applications_updated_at
  BEFORE UPDATE ON host_applications
  FOR EACH ROW EXECUTE FUNCTION update_host_applications_updated_at();

-- RLS
ALTER TABLE host_applications ENABLE ROW LEVEL SECURITY;

-- User can see and edit only their own application
CREATE POLICY "user_own_application" ON host_applications
  FOR ALL USING (auth.uid() = user_id);

-- Admin can see all
CREATE POLICY "admin_all_applications" ON host_applications
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
    OR auth.jwt() ->> 'email' = current_setting('app.superadmin_email', true)
  );

-- Storage bucket for application photos (run separately in Supabase dashboard if needed)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('host-applications', 'host-applications', true)
-- ON CONFLICT (id) DO NOTHING;
