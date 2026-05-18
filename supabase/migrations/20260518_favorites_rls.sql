-- Habilitar RLS en la tabla favorites (el código usa esta tabla con columna guest_id).
-- La migración 019 aplicó RLS sobre "user_favorites" (nombre incorrecto) — esta corrige eso.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'favorites'
  ) THEN
    ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

    -- Cada usuario solo puede ver y gestionar sus propios favoritos
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'favorites' AND policyname = 'favorites_own'
    ) THEN
      CREATE POLICY "favorites_own" ON favorites
        FOR ALL
        USING (guest_id = auth.uid())
        WITH CHECK (guest_id = auth.uid());
    END IF;
  END IF;
END $$;
