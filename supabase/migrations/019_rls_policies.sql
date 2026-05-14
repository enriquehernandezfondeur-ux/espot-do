-- ============================================================
-- ESPOT.DO — Migración 019
-- Row Level Security (RLS) — protección completa de datos
--
-- IMPORTANTE: ejecutar en Supabase SQL Editor
-- El service_role key bypasea RLS (usado solo en server-side)
-- El anon key y authenticated key respetan estas políticas
-- ============================================================

-- ── HELPERS ──────────────────────────────────────────────
-- Función para verificar si el usuario actual es admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE sql SECURITY DEFINER STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role IN ('admin', 'superadmin')
  );
$$;


-- ============================================================
-- PROFILES
-- ============================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Cualquiera puede ver perfiles básicos (nombre, avatar, host info)
CREATE POLICY "profiles_select_public"
  ON profiles FOR SELECT
  USING (true);

-- Solo el propio usuario puede actualizar su perfil
CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE
  USING (id = auth.uid());

-- Solo el propio usuario puede insertar su perfil (creado por trigger en auth)
CREATE POLICY "profiles_insert_own"
  ON profiles FOR INSERT
  WITH CHECK (id = auth.uid());


-- ============================================================
-- SPACES
-- ============================================================
ALTER TABLE spaces ENABLE ROW LEVEL SECURITY;

-- Espacios publicados son visibles a todos
CREATE POLICY "spaces_select_published"
  ON spaces FOR SELECT
  USING (is_published = true AND is_active = true);

-- El host propietario puede ver todos sus espacios (incluso no publicados)
CREATE POLICY "spaces_select_own"
  ON spaces FOR SELECT
  USING (host_id = auth.uid());

-- Admins ven todos
CREATE POLICY "spaces_select_admin"
  ON spaces FOR SELECT
  USING (is_admin());

-- Solo el host puede insertar/actualizar/eliminar sus espacios
CREATE POLICY "spaces_insert_host"
  ON spaces FOR INSERT
  WITH CHECK (host_id = auth.uid());

CREATE POLICY "spaces_update_host"
  ON spaces FOR UPDATE
  USING (host_id = auth.uid());

CREATE POLICY "spaces_update_admin"
  ON spaces FOR UPDATE
  USING (is_admin());

CREATE POLICY "spaces_delete_host"
  ON spaces FOR DELETE
  USING (host_id = auth.uid());


-- ============================================================
-- SPACE_IMAGES, SPACE_PRICING, SPACE_ADDONS, SPACE_CONDITIONS
-- SPACE_PAYMENT_TERMS, SPACE_TIME_BLOCKS
-- ============================================================

-- Para todas las tablas relacionadas a spaces: SELECT público (imágenes, precios visibles),
-- modificación solo por el host del espacio o admin.

-- space_images
ALTER TABLE space_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY "space_images_select" ON space_images FOR SELECT USING (
  EXISTS (SELECT 1 FROM spaces WHERE id = space_images.space_id AND (is_published OR host_id = auth.uid()))
  OR is_admin()
);
CREATE POLICY "space_images_write" ON space_images FOR ALL USING (
  EXISTS (SELECT 1 FROM spaces WHERE id = space_images.space_id AND host_id = auth.uid())
  OR is_admin()
);

-- space_pricing
ALTER TABLE space_pricing ENABLE ROW LEVEL SECURITY;
CREATE POLICY "space_pricing_select" ON space_pricing FOR SELECT USING (
  EXISTS (SELECT 1 FROM spaces WHERE id = space_pricing.space_id AND (is_published OR host_id = auth.uid()))
  OR is_admin()
);
CREATE POLICY "space_pricing_write" ON space_pricing FOR ALL USING (
  EXISTS (SELECT 1 FROM spaces WHERE id = space_pricing.space_id AND host_id = auth.uid())
  OR is_admin()
);

-- space_addons
ALTER TABLE space_addons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "space_addons_select" ON space_addons FOR SELECT USING (
  EXISTS (SELECT 1 FROM spaces WHERE id = space_addons.space_id AND (is_published OR host_id = auth.uid()))
  OR is_admin()
);
CREATE POLICY "space_addons_write" ON space_addons FOR ALL USING (
  EXISTS (SELECT 1 FROM spaces WHERE id = space_addons.space_id AND host_id = auth.uid())
  OR is_admin()
);

-- space_conditions
ALTER TABLE space_conditions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "space_conditions_select" ON space_conditions FOR SELECT USING (
  EXISTS (SELECT 1 FROM spaces WHERE id = space_conditions.space_id AND (is_published OR host_id = auth.uid()))
  OR is_admin()
);
CREATE POLICY "space_conditions_write" ON space_conditions FOR ALL USING (
  EXISTS (SELECT 1 FROM spaces WHERE id = space_conditions.space_id AND host_id = auth.uid())
  OR is_admin()
);

-- space_payment_terms
ALTER TABLE space_payment_terms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "space_payment_terms_select" ON space_payment_terms FOR SELECT USING (
  EXISTS (SELECT 1 FROM spaces WHERE id = space_payment_terms.space_id AND (is_published OR host_id = auth.uid()))
  OR is_admin()
);
CREATE POLICY "space_payment_terms_write" ON space_payment_terms FOR ALL USING (
  EXISTS (SELECT 1 FROM spaces WHERE id = space_payment_terms.space_id AND host_id = auth.uid())
  OR is_admin()
);

-- space_time_blocks
ALTER TABLE space_time_blocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "space_time_blocks_select" ON space_time_blocks FOR SELECT USING (
  EXISTS (SELECT 1 FROM spaces WHERE id = space_time_blocks.space_id AND (is_published OR host_id = auth.uid()))
  OR is_admin()
);
CREATE POLICY "space_time_blocks_write" ON space_time_blocks FOR ALL USING (
  EXISTS (SELECT 1 FROM spaces WHERE id = space_time_blocks.space_id AND host_id = auth.uid())
  OR is_admin()
);


-- ============================================================
-- BOOKINGS
-- ============================================================
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- El cliente ve sus propias reservas
CREATE POLICY "bookings_select_guest"
  ON bookings FOR SELECT
  USING (guest_id = auth.uid());

-- El host ve reservas de sus espacios
CREATE POLICY "bookings_select_host"
  ON bookings FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM spaces WHERE id = bookings.space_id AND host_id = auth.uid())
  );

-- Admin ve todas
CREATE POLICY "bookings_select_admin"
  ON bookings FOR SELECT
  USING (is_admin());

-- Solo el cliente puede crear una reserva para sí mismo
CREATE POLICY "bookings_insert_guest"
  ON bookings FOR INSERT
  WITH CHECK (guest_id = auth.uid());

-- El cliente puede actualizar sus reservas (cancelar, etc.)
-- El host puede actualizar reservas de sus espacios (aceptar, rechazar)
CREATE POLICY "bookings_update_participant"
  ON bookings FOR UPDATE
  USING (
    guest_id = auth.uid()
    OR EXISTS (SELECT 1 FROM spaces WHERE id = bookings.space_id AND host_id = auth.uid())
    OR is_admin()
  );


-- ============================================================
-- BOOKING_INSTALLMENTS (cuotas de pago)
-- ============================================================
ALTER TABLE booking_installments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "installments_select"
  ON booking_installments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM bookings b
      WHERE b.id = booking_installments.booking_id
      AND (
        b.guest_id = auth.uid()
        OR EXISTS (SELECT 1 FROM spaces WHERE id = b.space_id AND host_id = auth.uid())
        OR is_admin()
      )
    )
  );

CREATE POLICY "installments_write_admin"
  ON booking_installments FOR ALL
  USING (is_admin());


-- ============================================================
-- BOOKING_ADDONS
-- ============================================================
ALTER TABLE booking_addons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "booking_addons_select"
  ON booking_addons FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM bookings b
      WHERE b.id = booking_addons.booking_id
      AND (
        b.guest_id = auth.uid()
        OR EXISTS (SELECT 1 FROM spaces WHERE id = b.space_id AND host_id = auth.uid())
        OR is_admin()
      )
    )
  );

CREATE POLICY "booking_addons_insert"
  ON booking_addons FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM bookings b
      WHERE b.id = booking_addons.booking_id AND b.guest_id = auth.uid()
    )
  );


-- ============================================================
-- PAYMENTS
-- ============================================================
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Solo el cliente que pagó y el host del espacio pueden ver el pago
CREATE POLICY "payments_select"
  ON payments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM bookings b
      WHERE b.id = payments.booking_id
      AND (
        b.guest_id = auth.uid()
        OR EXISTS (SELECT 1 FROM spaces WHERE id = b.space_id AND host_id = auth.uid())
        OR is_admin()
      )
    )
  );

-- Solo el sistema (service_role) puede insertar pagos — nunca el cliente directamente
CREATE POLICY "payments_insert_system"
  ON payments FOR INSERT
  WITH CHECK (is_admin());


-- ============================================================
-- MESSAGES / CONVERSATIONS
-- ============================================================
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Solo los participantes de la conversación pueden ver/enviar mensajes
CREATE POLICY "messages_select"
  ON messages FOR SELECT
  USING (
    sender_id = auth.uid()
    OR receiver_id = auth.uid()
    OR is_admin()
  );

CREATE POLICY "messages_insert"
  ON messages FOR INSERT
  WITH CHECK (sender_id = auth.uid());

CREATE POLICY "messages_update_own"
  ON messages FOR UPDATE
  USING (sender_id = auth.uid() OR is_admin());


-- ============================================================
-- REVIEWS
-- ============================================================
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Reseñas públicas visibles a todos (is_public = true)
CREATE POLICY "reviews_select_public"
  ON reviews FOR SELECT
  USING (is_public = true);

-- El autor y el host del espacio y admin ven todas
CREATE POLICY "reviews_select_participant"
  ON reviews FOR SELECT
  USING (
    guest_id = auth.uid()
    OR EXISTS (SELECT 1 FROM spaces WHERE id = reviews.space_id AND host_id = auth.uid())
    OR is_admin()
  );

-- Solo el cliente que hizo la reserva puede dejar reseña
CREATE POLICY "reviews_insert"
  ON reviews FOR INSERT
  WITH CHECK (guest_id = auth.uid());

-- El autor puede editar su reseña
CREATE POLICY "reviews_update_own"
  ON reviews FOR UPDATE
  USING (guest_id = auth.uid() OR is_admin());


-- ============================================================
-- LIQUIDACIONES
-- ============================================================
ALTER TABLE liquidaciones ENABLE ROW LEVEL SECURITY;

-- Solo el host y admin ven las liquidaciones de sus espacios
CREATE POLICY "liquidaciones_select"
  ON liquidaciones FOR SELECT
  USING (
    host_id = auth.uid()
    OR is_admin()
  );

-- Solo el sistema puede crear/actualizar liquidaciones
CREATE POLICY "liquidaciones_write_admin"
  ON liquidaciones FOR ALL
  USING (is_admin());


-- ============================================================
-- SPACE_AVAILABILITY (fechas bloqueadas)
-- ============================================================
ALTER TABLE space_availability ENABLE ROW LEVEL SECURITY;

-- Disponibilidad es pública (para saber si un espacio está libre)
CREATE POLICY "availability_select"
  ON space_availability FOR SELECT
  USING (true);

-- Solo el host puede bloquear/desbloquear fechas de sus espacios
CREATE POLICY "availability_write"
  ON space_availability FOR ALL
  USING (
    EXISTS (SELECT 1 FROM spaces WHERE id = space_availability.space_id AND host_id = auth.uid())
    OR is_admin()
  );


-- ============================================================
-- USER_FAVORITES (si existe la tabla)
-- ============================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_favorites') THEN
    ALTER TABLE user_favorites ENABLE ROW LEVEL SECURITY;

    EXECUTE 'CREATE POLICY "favorites_own" ON user_favorites FOR ALL USING (user_id = auth.uid())';
  END IF;
END $$;


-- ============================================================
-- VERIFICACIÓN FINAL
-- ============================================================
SELECT
  schemaname,
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'profiles', 'spaces', 'bookings', 'booking_installments',
    'booking_addons', 'payments', 'messages', 'reviews',
    'liquidaciones', 'space_availability', 'space_images',
    'space_pricing', 'space_addons', 'space_conditions',
    'space_payment_terms', 'space_time_blocks', 'host_bank_accounts'
  )
ORDER BY tablename;
