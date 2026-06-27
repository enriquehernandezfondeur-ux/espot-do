import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { isSuperadmin } from '@/lib/superadmin'

// POST /api/admin/sync-avatars
// Sincroniza avatar_url desde auth.users.raw_user_meta_data → profiles
// para todos los usuarios que tienen foto de OAuth pero no en profiles.
export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isSuperadmin(user.email)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!serviceKey || !supabaseUrl) {
    return NextResponse.json({ error: 'Service role key no configurada' }, { status: 500 })
  }

  const admin = createServiceClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // Obtener todos los profiles con avatar_url null
  const { data: profiles } = await admin
    .from('profiles')
    .select('id, avatar_url')
    .is('avatar_url', null)

  if (!profiles?.length) {
    return NextResponse.json({ updated: 0, message: 'Todos los profiles ya tienen avatar' })
  }

  let updated = 0
  const errors: string[] = []

  for (const profile of profiles) {
    // Leer el user de auth para obtener su metadata OAuth
    const { data: authUser, error: authErr } = await admin.auth.admin.getUserById(profile.id)
    if (authErr || !authUser?.user) continue

    const meta   = authUser.user.user_metadata ?? {}
    const avatar = meta.avatar_url || meta.picture || null

    if (!avatar) continue

    const { error: upErr } = await admin
      .from('profiles')
      .update({ avatar_url: avatar, updated_at: new Date().toISOString() })
      .eq('id', profile.id)

    if (upErr) {
      errors.push(`${profile.id}: ${upErr.message}`)
    } else {
      updated++
    }
  }

  return NextResponse.json({
    updated,
    total:   profiles.length,
    errors:  errors.length > 0 ? errors : undefined,
    message: `${updated} de ${profiles.length} avatares sincronizados`,
  })
}
