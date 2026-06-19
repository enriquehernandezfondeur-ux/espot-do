-- ============================================================
-- ESPOT.DO — Migración 021
-- Cierre de RLS: políticas FOR UPDATE sin WITH CHECK permitían
-- escalada de privilegios e IDOR financiero.
--
-- Esta migración tiene DOS PARTES:
--   PARTE A — aplicar YA. No depende de ningún cambio de código.
--   PARTE B — aplicar DESPUÉS de desplegar el cambio de código que
--             mueve confirm / confirmPayment / markInstallmentPaid a
--             service-role. Si la aplicas antes, ROMPES la confirmación
--             de pagos. (Ver nota al inicio de la Parte B.)
--
-- Ejecutar en Supabase SQL Editor. service_role bypasea RLS y triggers
-- solo cuando el trigger lo exonera explícitamente (auth.role()).
-- ============================================================


-- ╔══════════════════════════════════════════════════════════╗
-- ║  PARTE A — APLICAR YA (cero riesgo)                        ║
-- ╚══════════════════════════════════════════════════════════╝

-- ── 1. PROFILES: bloquear escalada de role / host_status ─────
-- profiles_update_own (USING id=auth.uid()) no tenía WITH CHECK:
-- cualquier usuario podía UPDATE profiles SET role='admin'.
-- Un WITH CHECK no puede comparar OLD vs NEW, así que usamos trigger.
-- Permitido: el dueño cambia su perfil (nombre, avatar, etc.) y puede
-- mover host_status -> 'applied' (flujo /aplicar). Bloqueado: cualquier
-- cambio de role, o de host_status a otro valor, salvo admin/service.
CREATE OR REPLACE FUNCTION prevent_profile_privilege_escalation()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- service_role (server-side) y admins pueden cambiar todo
  IF auth.role() = 'service_role' OR is_admin() THEN
    RETURN NEW;
  END IF;

  IF NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION 'No autorizado a modificar role';
  END IF;

  -- el dueño solo puede iniciar su solicitud (-> 'applied'); el resto
  -- de transiciones de host_status las hace un admin
  IF NEW.host_status IS DISTINCT FROM OLD.host_status
     AND NEW.host_status <> 'applied' THEN
    RAISE EXCEPTION 'No autorizado a modificar host_status';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_profile_escalation ON profiles;
CREATE TRIGGER trg_prevent_profile_escalation
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION prevent_profile_privilege_escalation();


-- ── 2. REVIEWS: no reasignar la reseña a otro usuario/espacio ─
DROP POLICY IF EXISTS "reviews_update_own" ON reviews;
CREATE POLICY "reviews_update_own"
  ON reviews FOR UPDATE
  USING      (guest_id = auth.uid() OR is_admin())
  WITH CHECK (guest_id = auth.uid() OR is_admin());


-- ── 3. MESSAGES: no reasignar el mensaje a otro emisor ───────
DROP POLICY IF EXISTS "messages_update_own" ON messages;
CREATE POLICY "messages_update_own"
  ON messages FOR UPDATE
  USING      (sender_id = auth.uid() OR is_admin())
  WITH CHECK (sender_id = auth.uid() OR is_admin());


-- ── 4. PAYMENTS: idempotencia por transacción Azul ──────────
-- La tabla payments no guardaba el id de transacción de Azul, así que
-- un doble POST a /confirm insertaba dos filas. Añadimos la columna y
-- un índice único parcial: cada transacción Azul -> a lo sumo una fila.
-- (Debe existir ANTES de desplegar el código que la inserta.)
ALTER TABLE payments ADD COLUMN IF NOT EXISTS azul_order_id text;

CREATE UNIQUE INDEX IF NOT EXISTS payments_azul_order_id_uniq
  ON payments (azul_order_id)
  WHERE azul_order_id IS NOT NULL;


-- ╔══════════════════════════════════════════════════════════╗
-- ║  PARTE B — APLICAR SOLO DESPUÉS DE DESPLEGAR EL CÓDIGO     ║
-- ║  que mueve a service-role:                                ║
-- ║    • src/app/api/payments/confirm/route.ts                ║
-- ║    • confirmPayment()      en src/lib/actions/booking.ts  ║
-- ║    • markInstallmentPaid() en src/lib/actions/installments║
-- ║  Si aplicas esto antes que el código, la confirmación de  ║
-- ║  pagos fallará silenciosamente (0 filas afectadas).       ║
-- ╚══════════════════════════════════════════════════════════╝

-- ── 5. BOOKINGS: bloquear cambios financieros/identidad ──────
-- bookings_update_participant permitía a un guest hacer
-- UPDATE bookings SET payment_status='paid', total_amount=0, guest_id=...
-- Columnas de dinero/identidad solo las puede tocar service-role/admin.
-- El guest (cancelar) y el host (aceptar/rechazar) siguen pudiendo
-- cambiar status y campos no financieros sin problema.
CREATE OR REPLACE FUNCTION lock_booking_financial_columns()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF auth.role() = 'service_role' OR is_admin() THEN
    RETURN NEW;
  END IF;

  IF NEW.guest_id          IS DISTINCT FROM OLD.guest_id
     OR NEW.space_id       IS DISTINCT FROM OLD.space_id
     OR NEW.total_amount   IS DISTINCT FROM OLD.total_amount
     OR NEW.paid_amount    IS DISTINCT FROM OLD.paid_amount
     OR NEW.platform_fee   IS DISTINCT FROM OLD.platform_fee
     OR NEW.payment_status IS DISTINCT FROM OLD.payment_status
     OR NEW.commission_status IS DISTINCT FROM OLD.commission_status
     OR NEW.payout_status  IS DISTINCT FROM OLD.payout_status
     OR NEW.azul_order_id  IS DISTINCT FROM OLD.azul_order_id
     OR NEW.azul_auth_code IS DISTINCT FROM OLD.azul_auth_code THEN
    RAISE EXCEPTION 'No autorizado a modificar columnas financieras de la reserva';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_lock_booking_financials ON bookings;
CREATE TRIGGER trg_lock_booking_financials
  BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION lock_booking_financial_columns();


-- ── 6. PAYMENTS: solo service-role/admin inserta y actualiza ─
-- Revierte la apertura de la migración 020. El guest NO puede crear
-- filas de pago falsas; confirm corre ahora con service-role.
DROP POLICY IF EXISTS "payments_insert_guest"  ON payments;
DROP POLICY IF EXISTS "payments_insert_system" ON payments;
DROP POLICY IF EXISTS "payments_update_admin"  ON payments;
DROP POLICY IF EXISTS "payments_update_system" ON payments;

CREATE POLICY "payments_insert_system"
  ON payments FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "payments_update_system"
  ON payments FOR UPDATE
  USING (is_admin()) WITH CHECK (is_admin());


-- ── 7. LIQUIDACIONES: solo service-role/admin ────────────────
DROP POLICY IF EXISTS "liquidaciones_insert_guest" ON liquidaciones;
DROP POLICY IF EXISTS "liquidaciones_upsert_guest" ON liquidaciones;
DROP POLICY IF EXISTS "liquidaciones_write_admin"  ON liquidaciones;

CREATE POLICY "liquidaciones_write_admin"
  ON liquidaciones FOR ALL
  USING (is_admin()) WITH CHECK (is_admin());


-- ── 8. BOOKING_INSTALLMENTS: el participante puede actualizar ─
--     (p.ej. el guest cancela sus cuotas al cancelar la reserva),
--     pero SOLO service-role/admin puede marcar una cuota como
--     'paid'. Así se cierra la forja de pagos sin romper la
--     cancelación. markInstallmentPaid() ahora escribe con service.
DROP POLICY IF EXISTS "installments_update_guest"  ON booking_installments;
DROP POLICY IF EXISTS "installments_update_system" ON booking_installments;
DROP POLICY IF EXISTS "installments_update_participant" ON booking_installments;

CREATE POLICY "installments_update_participant"
  ON booking_installments FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM bookings b
      WHERE b.id = booking_installments.booking_id
        AND (
          b.guest_id = auth.uid()
          OR EXISTS (SELECT 1 FROM spaces s WHERE s.id = b.space_id AND s.host_id = auth.uid())
        )
    )
    OR is_admin()
  );

-- Trigger: bloquear marcar 'paid' / paid_at / azul_order_id salvo service/admin
CREATE OR REPLACE FUNCTION lock_installment_paid_marking()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF auth.role() = 'service_role' OR is_admin() THEN
    RETURN NEW;
  END IF;

  IF (NEW.status = 'paid' AND OLD.status IS DISTINCT FROM 'paid')
     OR NEW.paid_at IS DISTINCT FROM OLD.paid_at
     OR NEW.azul_order_id IS DISTINCT FROM OLD.azul_order_id THEN
    RAISE EXCEPTION 'No autorizado a marcar una cuota como pagada';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_lock_installment_paid ON booking_installments;
CREATE TRIGGER trg_lock_installment_paid
  BEFORE UPDATE ON booking_installments
  FOR EACH ROW EXECUTE FUNCTION lock_installment_paid_marking();

DROP POLICY IF EXISTS "installments_insert_host" ON booking_installments;
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


-- ── VERIFICACIÓN ─────────────────────────────────────────────
SELECT tablename, policyname, cmd, qual IS NOT NULL AS has_using, with_check IS NOT NULL AS has_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('profiles','bookings','reviews','messages','payments','liquidaciones','booking_installments')
ORDER BY tablename, cmd, policyname;
