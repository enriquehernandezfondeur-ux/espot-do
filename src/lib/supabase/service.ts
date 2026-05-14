import { createClient } from '@supabase/supabase-js'

/**
 * Cliente Supabase con service_role key.
 * Bypasea RLS — usar SOLO en server-side (API routes, cron jobs).
 * NUNCA importar en componentes cliente ni exponer al browser.
 */
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY no configurada en variables de entorno')
  }

  return createClient(url, key, {
    auth: {
      autoRefreshToken:  false,
      persistSession:    false,
    },
  })
}
