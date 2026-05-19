import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code     = searchParams.get('code')
  const next     = searchParams.get('next') ?? '/dashboard'
  const redirect = next.startsWith('/') && !next.startsWith('//') ? next : '/dashboard'

  if (!code) return NextResponse.redirect(`${origin}/auth?error=callback_failed`)

  const supabase = await createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) return NextResponse.redirect(`${origin}/auth?error=callback_failed`)

  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) return NextResponse.redirect(`${origin}/auth?error=callback_failed`)

  // Sincronizar avatar, nombre y rol del perfil si no están ya guardados
  const meta        = user.user_metadata ?? {}
  const oauthAvatar = meta.avatar_url || meta.picture || null
  const oauthName   = meta.full_name  || meta.name    || null
  const metaRole    = (meta.role as string | undefined) === 'host' ? 'host' : null

  if (oauthAvatar || oauthName || metaRole) {
    const { data: existing } = await supabase
      .from('profiles').select('avatar_url, full_name, role').eq('id', user.id).single()

    const updates: Record<string, string> = { updated_at: new Date().toISOString() }
    if (oauthAvatar && !existing?.avatar_url)               updates.avatar_url = oauthAvatar
    if (oauthName   && !existing?.full_name)                updates.full_name  = oauthName
    // Si el usuario se registró como host pero el trigger no lo guardó, corregir el rol
    if (metaRole    && existing?.role !== 'host')            updates.role       = 'host'

    if (Object.keys(updates).length > 1) {
      await supabase.from('profiles').update(updates).eq('id', user.id)
    }
  }

  return NextResponse.redirect(`${origin}${redirect}`)
}
