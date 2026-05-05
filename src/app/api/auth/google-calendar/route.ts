import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildAuthUrl, isGoogleCalendarConfigured } from '@/lib/google-calendar'

export const dynamic = 'force-dynamic'

/** Inicia el flujo OAuth con Google Calendar */
export async function GET() {
  if (!isGoogleCalendarConfigured()) {
    return NextResponse.redirect(
      new URL('/dashboard/host/ajustes?error=google_not_configured', process.env.NEXT_PUBLIC_SITE_URL ?? 'https://espothub.com'),
    )
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.redirect(
      new URL('/auth', process.env.NEXT_PUBLIC_SITE_URL ?? 'https://espothub.com'),
    )
  }

  // Usamos el user.id como state para verificarlo en el callback
  const authUrl = buildAuthUrl(user.id)
  return NextResponse.redirect(authUrl)
}
