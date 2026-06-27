import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { forbiddenIfCrossOrigin } from '@/lib/csrf'

// Los slugs que SÍ deben existir (migración oficial)
const KEEP_SLUGS = [
  'cosmos-salon-privado-vip-2',
  'cosmos-salon-privado-vip-3',
  'cosmos-salon-privado-junior',
  'cosmos-salon-privado-junior-2',
  'cosmos-salon-privado-vip-5',
  'cosmos-salon-privado-presidencial',
  'cosmos-salon-privado-vip-6',
  'cosmos-salon-privado-vip-10',
  'cosmos-salon-karaoke-999',
  'cosmos-salon-karaoke-888',
  'cosmos-salon-karaoke-666',
  'cosmos-salon-karaoke-222',
  'cosmos-salon-karaoke-555',
  'cosmos-salon-karaoke-111',
  'terraza-el-refugio-alpino',
  'tarima-el-refugio-alpino',
  'sala-interior-el-refugio-alpino',
  'restaurante-completo-el-refugio-alpino',
  'sala-trekin-sala-privada-reuniones-coworking',
  'coffee-lounge-espacio-eventos-reuniones-after-work',
  'sala-de-conferencias-herman-miller',
  'relax-room-sala-privada-reuniones-pequenas',
  'day-pass-acceso-diario-coworking',
  'atarazana-i-salon-privado-eventos',
  'atarazana-iii-eventos-privados-comida-incluida',
  'salon-abierto-actividades-edificio-roman',
  'terraza-completa-celebraciones-edificio-roman',
  'la-cuerda-salon-para-eventos',
  'knights-bar-private-room-zona-colonial',
  'salon-elegante-hotel-premium',
  'salon-aurora-hotel-altavista',
  'focus-room-coworking-nexo',
  'salon-privado-aurora-one',
  'salon-de-eventos-hotel-business-social',
  'salon-privado-nova-estudios',
  'nodo-38-salon-privado',
]

// GET — lista qué espacios se eliminarían (dry-run)
// DELETE — elimina los espacios que no están en la lista
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const superadmin = process.env.SUPERADMIN_EMAIL ?? 'enriquehernandezfondeur@gmail.com'
  if (user.email !== superadmin) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY no configurada' }, { status: 500 })

  const { createClient: sc } = await import('@supabase/supabase-js')
  const sb = sc(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })

  const { data: allSpaces } = await sb.from('spaces').select('id, name, slug')
  if (!allSpaces) return NextResponse.json({ error: 'No se pudo obtener espacios' }, { status: 500 })

  const toDelete = allSpaces.filter(s => !KEEP_SLUGS.includes(s.slug))
  const toKeep   = allSpaces.filter(s =>  KEEP_SLUGS.includes(s.slug))

  return NextResponse.json({
    total: allSpaces.length,
    keep: toKeep.length,
    to_delete: toDelete.length,
    spaces_to_delete: toDelete.map(s => ({ id: s.id, name: s.name, slug: s.slug })),
  })
}

export async function DELETE(req: NextRequest) {
  const bad = forbiddenIfCrossOrigin(req); if (bad) return bad
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const superadmin = process.env.SUPERADMIN_EMAIL ?? 'enriquehernandezfondeur@gmail.com'
  if (user.email !== superadmin) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY no configurada' }, { status: 500 })

  const { createClient: sc } = await import('@supabase/supabase-js')
  const sb = sc(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })

  const { data: allSpaces } = await sb.from('spaces').select('id, name, slug')
  if (!allSpaces) return NextResponse.json({ error: 'No se pudo obtener espacios' }, { status: 500 })

  const toDelete = allSpaces.filter(s => !KEEP_SLUGS.includes(s.slug))

  if (toDelete.length === 0) {
    return NextResponse.json({ message: 'No hay espacios para eliminar', deleted: 0 })
  }

  const ids = toDelete.map(s => s.id)
  const { error } = await sb.from('spaces').delete().in('id', ids)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    message: `${toDelete.length} espacio(s) eliminado(s)`,
    deleted: toDelete.length,
    deleted_spaces: toDelete.map(s => ({ name: s.name, slug: s.slug })),
  })
}
