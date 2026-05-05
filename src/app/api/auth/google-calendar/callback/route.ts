import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { exchangeCode } from '@/lib/google-calendar'

export const dynamic = 'force-dynamic'

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://espothub.com'

/** Callback de OAuth — Google redirige aquí con el code */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code  = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  // El usuario denegó el acceso
  if (error || !code || !state) {
    return NextResponse.redirect(`${BASE}/dashboard/host/ajustes?error=google_denied`)
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Verificar que el state coincide con el usuario actual (previene CSRF)
  if (!user || user.id !== state) {
    return NextResponse.redirect(`${BASE}/dashboard/host/ajustes?error=google_state_mismatch`)
  }

  // Intercambiar code por tokens
  const tokens = await exchangeCode(code)
  if (!tokens) {
    return NextResponse.redirect(`${BASE}/dashboard/host/ajustes?error=google_token_failed`)
  }

  // Guardar refresh_token y marcar como conectado
  const { error: dbError } = await supabase
    .from('profiles')
    .update({
      google_refresh_token:    tokens.refresh_token,
      google_calendar_connected: true,
    })
    .eq('id', user.id)

  if (dbError) {
    return NextResponse.redirect(`${BASE}/dashboard/host/ajustes?error=google_save_failed`)
  }

  return NextResponse.redirect(`${BASE}/dashboard/host/ajustes?connected=google`)
}
