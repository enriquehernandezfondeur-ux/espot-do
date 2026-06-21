-- Hardening RLS de host_bank_accounts: agrega WITH CHECK (IDOR de escritura)
DROP POLICY IF EXISTS "Host gestiona su cuenta bancaria" ON host_bank_accounts;

CREATE POLICY "host_bank_select" ON host_bank_accounts
  FOR SELECT USING (host_id = auth.uid());

CREATE POLICY "host_bank_insert" ON host_bank_accounts
  FOR INSERT WITH CHECK (host_id = auth.uid());

CREATE POLICY "host_bank_update" ON host_bank_accounts
  FOR UPDATE USING (host_id = auth.uid()) WITH CHECK (host_id = auth.uid());

CREATE POLICY "host_bank_delete" ON host_bank_accounts
  FOR DELETE USING (host_id = auth.uid());

SELECT 'host_bank_accounts RLS endurecida' AS resultado;
