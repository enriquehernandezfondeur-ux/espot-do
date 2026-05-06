-- ============================================================
-- ESPOT.DO — Cuentas bancarias de propietarios
-- ============================================================

CREATE TABLE IF NOT EXISTS host_bank_accounts (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id        uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  account_holder text NOT NULL,
  bank_name      text NOT NULL,
  account_type   text NOT NULL CHECK (account_type IN ('ahorro', 'corriente')),
  currency       text NOT NULL DEFAULT 'DOP' CHECK (currency IN ('DOP', 'USD')),
  account_number text NOT NULL,
  cedula_or_rnc  text NOT NULL,
  status         text NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending', 'verified', 'rejected')),
  created_at     timestamptz DEFAULT now(),
  updated_at     timestamptz DEFAULT now(),
  UNIQUE (host_id)  -- un propietario, una cuenta principal
);

ALTER TABLE host_bank_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Host gestiona su cuenta bancaria"
  ON host_bank_accounts FOR ALL
  USING (host_id = auth.uid());

-- Verificar
SELECT 'host_bank_accounts creada' AS resultado;
