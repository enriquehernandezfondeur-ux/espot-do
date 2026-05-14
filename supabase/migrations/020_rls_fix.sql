-- ============================================================
-- ESPOT.DO — Migración 020
-- Fix RLS: políticas demasiado restrictivas en payments,
-- liquidaciones y booking_installments
-- Ejecutar DESPUÉS de 019_rls_policies.sql
-- ============================================================

-- ── PAYMENTS ─────────────────────────────────────────────
-- La ruta /api/payments/confirm corre como el guest autenticado,
-- no como service_role. Necesita poder insertar su propio pago.
DROP POLICY IF EXISTS "payments_insert_system" ON payments;

CREATE POLICY "payments_insert_guest"
  ON payments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM bookings b
      WHERE b.id = payments.booking_id
        AND b.guest_id = auth.uid()
    )
    OR is_admin()
  );

CREATE POLICY "payments_update_admin"
  ON payments FOR UPDATE
  USING (is_admin());


-- ── LIQUIDACIONES ─────────────────────────────────────────
-- La confirmación de pago también hace upsert en liquidaciones
-- como el guest autenticado.
DROP POLICY IF EXISTS "liquidaciones_write_admin" ON liquidaciones;

CREATE POLICY "liquidaciones_insert_guest"
  ON liquidaciones FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM bookings b
      WHERE b.id = liquidaciones.booking_id
        AND b.guest_id = auth.uid()
    )
    OR is_admin()
  );

CREATE POLICY "liquidaciones_upsert_guest"
  ON liquidaciones FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM bookings b
      WHERE b.id = liquidaciones.booking_id
        AND b.guest_id = auth.uid()
    )
    OR is_admin()
  );


-- ── BOOKING_INSTALLMENTS ──────────────────────────────────
-- createInstallments() corre como el host (en acceptBooking).
-- El host necesita poder insertar cuotas para reservas de sus espacios.
DROP POLICY IF EXISTS "installments_write_admin" ON booking_installments;

CREATE POLICY "installments_insert_host"
  ON booking_installments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM bookings b
      JOIN spaces s ON s.id = b.space_id
      WHERE b.id = booking_installments.booking_id
        AND s.host_id = auth.uid()
    )
    OR is_admin()
  );

CREATE POLICY "installments_update_guest"
  ON booking_installments FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM bookings b
      WHERE b.id = booking_installments.booking_id
        AND b.guest_id = auth.uid()
    )
    OR is_admin()
  );


-- ── VERIFICACIÓN ──────────────────────────────────────────
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('payments', 'liquidaciones', 'booking_installments')
ORDER BY tablename, policyname;
