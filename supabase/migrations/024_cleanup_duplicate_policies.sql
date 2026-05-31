-- ============================================================
-- ESPOT.DO — Migración 024
-- Limpieza de políticas RLS duplicadas.
--
-- La migración base original creó políticas con nombres en español que
-- quedaron solapadas (OR permisivo) con las creadas por 019/021 en inglés.
-- Cada política eliminada aquí tiene un equivalente en inglés ya activo,
-- así que NO se pierde ningún permiso legítimo. Excepción: "Host responde
-- review" no tenía equivalente y se reemplaza por una versión con WITH CHECK.
--
-- Las protecciones críticas (escalada de role, columnas financieras de
-- bookings, marcar cuota 'paid') las garantizan triggers (migración 021),
-- que se ejecutan en cualquier UPDATE independientemente de qué política lo
-- permita; esta limpieza elimina la capa permisiva redundante y confusa.
--
-- Ejecutar en Supabase SQL Editor. Seguro de re-ejecutar.
-- ============================================================

-- PROFILES
DROP POLICY IF EXISTS "Usuario crea su perfil"         ON profiles;
DROP POLICY IF EXISTS "Perfil público visible"         ON profiles;
DROP POLICY IF EXISTS "Usuario edita su propio perfil" ON profiles;

-- BOOKINGS
DROP POLICY IF EXISTS "Guest crea reserva"               ON bookings;
DROP POLICY IF EXISTS "Guest ve sus reservas"            ON bookings;
DROP POLICY IF EXISTS "Host ve reservas de sus espacios" ON bookings;
DROP POLICY IF EXISTS "Guest o Host actualizan reserva"  ON bookings;

-- PAYMENTS
DROP POLICY IF EXISTS "Ver pagos de mis reservas" ON payments;

-- LIQUIDACIONES
DROP POLICY IF EXISTS "Admin gestiona liquidaciones" ON liquidaciones;
DROP POLICY IF EXISTS "Host ve sus liquidaciones"    ON liquidaciones;

-- MESSAGES
DROP POLICY IF EXISTS "Enviar mensajes"  ON messages;
DROP POLICY IF EXISTS "Ver mis mensajes" ON messages;

-- REVIEWS
DROP POLICY IF EXISTS "Guest crea review" ON reviews;
DROP POLICY IF EXISTS "Reviews públicas"  ON reviews;
-- Reemplazo de "Host responde review" con WITH CHECK que ancla la propiedad
-- del espacio (el host puede responder, pero no reasignar la reseña).
DROP POLICY IF EXISTS "Host responde review" ON reviews;
CREATE POLICY "reviews_update_host_response"
  ON reviews FOR UPDATE
  USING      (EXISTS (SELECT 1 FROM spaces s WHERE s.id = reviews.space_id AND s.host_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM spaces s WHERE s.id = reviews.space_id AND s.host_id = auth.uid()));

-- BOOKING_INSTALLMENTS — SELECT redundantes con installments_select
DROP POLICY IF EXISTS "Guest y host ven sus cuotas"  ON booking_installments;
DROP POLICY IF EXISTS "guest_read_own_installments"  ON booking_installments;
DROP POLICY IF EXISTS "host_read_space_installments" ON booking_installments;


-- ── VERIFICACIÓN ─────────────────────────────────────────────
SELECT tablename, policyname, cmd, qual IS NOT NULL AS has_using, with_check IS NOT NULL AS has_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('profiles','bookings','reviews','messages','payments','liquidaciones','booking_installments')
ORDER BY tablename, cmd, policyname;
