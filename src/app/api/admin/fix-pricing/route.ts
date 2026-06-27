import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { forbiddenIfCrossOrigin } from '@/lib/csrf'

// Mapa de slug → pricing correcto (extraído del JSON de migración oficial)
const PRICING_MAP: Record<string, { type: string; price: number; min_hours?: number; session_hours?: number; package_hours?: number; package_name?: string }> = {
  'cosmos-salon-privado-vip-2':                    { type: 'minimum_consumption', price: 3200,  session_hours: 4 },
  'cosmos-salon-privado-vip-3':                    { type: 'minimum_consumption', price: 3200,  session_hours: 4 },
  'cosmos-salon-privado-junior':                   { type: 'minimum_consumption', price: 2150,  session_hours: 4 },
  'cosmos-salon-privado-junior-2':                 { type: 'minimum_consumption', price: 2150,  session_hours: 4 },
  'cosmos-salon-privado-vip-5':                    { type: 'minimum_consumption', price: 6400,  session_hours: 4 },
  'cosmos-salon-privado-presidencial':             { type: 'minimum_consumption', price: 4200,  session_hours: 4 },
  'cosmos-salon-privado-vip-6':                    { type: 'minimum_consumption', price: 2250,  session_hours: 4 },
  'cosmos-salon-privado-vip-10':                   { type: 'minimum_consumption', price: 7000,  session_hours: 4 },
  'cosmos-salon-karaoke-999':                      { type: 'minimum_consumption', price: 6450,  session_hours: 4 },
  'cosmos-salon-karaoke-888':                      { type: 'minimum_consumption', price: 4800,  session_hours: 4 },
  'cosmos-salon-karaoke-666':                      { type: 'minimum_consumption', price: 4800,  session_hours: 4 },
  'cosmos-salon-karaoke-222':                      { type: 'minimum_consumption', price: 3200,  session_hours: 4 },
  'cosmos-salon-karaoke-555':                      { type: 'minimum_consumption', price: 6300,  session_hours: 4 },
  'cosmos-salon-karaoke-111':                      { type: 'minimum_consumption', price: 3200,  session_hours: 4 },
  'terraza-el-refugio-alpino':                     { type: 'minimum_consumption', price: 6500,  session_hours: 4 },
  'tarima-el-refugio-alpino':                      { type: 'minimum_consumption', price: 4000,  session_hours: 3 },
  'sala-interior-el-refugio-alpino':               { type: 'minimum_consumption', price: 8500,  session_hours: 4 },
  'restaurante-completo-el-refugio-alpino':        { type: 'minimum_consumption', price: 12000, session_hours: 5 },
  'sala-trekin-sala-privada-reuniones-coworking':  { type: 'hourly', price: 7450,  min_hours: 2 },
  'coffee-lounge-espacio-eventos-reuniones-after-work': { type: 'hourly', price: 7050, min_hours: 1 },
  'sala-de-conferencias-herman-miller':            { type: 'hourly', price: 11150, min_hours: 3 },
  'relax-room-sala-privada-reuniones-pequenas':    { type: 'hourly', price: 5575,  min_hours: 1 },
  'day-pass-acceso-diario-coworking':              { type: 'fixed_package', price: 2200, package_hours: 10, package_name: 'Day Pass' },
  'atarazana-i-salon-privado-eventos':             { type: 'fixed_package', price: 46255, package_hours: 3, package_name: 'Paquete Todo Incluido' },
  'atarazana-iii-eventos-privados-comida-incluida': { type: 'fixed_package', price: 62000, package_hours: 3, package_name: 'Paquete Premium Todo Incluido' },
  'salon-abierto-actividades-edificio-roman':      { type: 'hourly', price: 17000, min_hours: 1 },
  'terraza-completa-celebraciones-edificio-roman': { type: 'hourly', price: 15000, min_hours: 1 },
  'la-cuerda-salon-para-eventos':                  { type: 'hourly', price: 16000, min_hours: 4 },
  'knights-bar-private-room-zona-colonial':        { type: 'minimum_consumption', price: 11500, session_hours: 4 },
  // Pendientes (no publicados)
  'salon-elegante-hotel-premium':                  { type: 'hourly', price: 1000,  min_hours: 4 },
  'salon-aurora-hotel-altavista':                  { type: 'hourly', price: 1500,  min_hours: 2 },
  'focus-room-coworking-nexo':                     { type: 'hourly', price: 1200,  min_hours: 3 },
  'salon-privado-aurora-one':                      { type: 'hourly', price: 500,   min_hours: 2 },
  'salon-de-eventos-hotel-business-social':        { type: 'hourly', price: 200,   min_hours: 2 },
  'salon-privado-nova-estudios':                   { type: 'hourly', price: 300,   min_hours: 1 },
  'nodo-38-salon-privado':                         { type: 'hourly', price: 300,   min_hours: 2 },
}

function buildPricingPayload(slug: string, spaceId: string) {
  const def = PRICING_MAP[slug]
  if (!def) return null

  const base: Record<string, unknown> = {
    space_id:     spaceId,
    pricing_type: def.type,
    is_active:    true,
  }

  if (def.type === 'hourly') {
    base.hourly_price = def.price
    base.min_hours    = def.min_hours ?? 1
  }
  if (def.type === 'minimum_consumption') {
    base.minimum_consumption = def.price
    if (def.session_hours) base.session_hours = def.session_hours
  }
  if (def.type === 'fixed_package') {
    base.fixed_price    = def.price
    base.package_hours  = def.package_hours ?? 1
    base.package_name   = def.package_name ?? ''
  }

  return base
}

// GET → preview qué espacios se arreglarían
// POST → aplica los fixes
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const superadmin = process.env.SUPERADMIN_EMAIL ?? 'enriquehernandezfondeur@gmail.com'
  if (user.email !== superadmin) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY no configurada' }, { status: 500 })

  const { createClient: sc } = await import('@supabase/supabase-js')
  const sb = sc(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })

  const { data: spaces } = await sb.from('spaces').select('id, name, slug, space_pricing(id, pricing_type, is_active)')
  if (!spaces) return NextResponse.json({ error: 'Error al obtener espacios' }, { status: 500 })

  const toFix = spaces.filter(s => {
    const pricing = (s.space_pricing as any[]) ?? []
    const active  = pricing.find((p: any) => p.is_active) ?? pricing[0]
    return !active || active.pricing_type === 'custom_quote'
  })

  return NextResponse.json({
    total: spaces.length,
    need_fix: toFix.length,
    spaces: toFix.map(s => ({
      name: s.name,
      slug: s.slug,
      has_pricing: (s.space_pricing as any[])?.length > 0,
      fix: PRICING_MAP[s.slug] ?? null,
    })),
  })
}

export async function POST(req: NextRequest) {
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

  const { data: spaces } = await sb
    .from('spaces')
    .select('id, name, slug, space_pricing(id, pricing_type, is_active)')

  if (!spaces) return NextResponse.json({ error: 'Error al obtener espacios' }, { status: 500 })

  const results: any[] = []

  for (const space of spaces) {
    const pricing  = (space.space_pricing as any[]) ?? []
    const active   = pricing.find((p: any) => p.is_active) ?? pricing[0]
    const needsFix = !active || active.pricing_type === 'custom_quote'

    if (!needsFix) continue

    const payload = buildPricingPayload(space.slug, space.id)
    if (!payload) {
      results.push({ name: space.name, slug: space.slug, status: 'skip', reason: 'No está en el mapa de precios' })
      continue
    }

    if (active && active.pricing_type === 'custom_quote') {
      // Actualizar el registro existente
      const { error } = await sb.from('space_pricing').update({
        pricing_type:        payload.pricing_type,
        hourly_price:        (payload.hourly_price as number) ?? null,
        min_hours:           (payload.min_hours as number) ?? null,
        minimum_consumption: (payload.minimum_consumption as number) ?? null,
        session_hours:       (payload.session_hours as number) ?? null,
        fixed_price:         (payload.fixed_price as number) ?? null,
        package_hours:       (payload.package_hours as number) ?? null,
        package_name:        (payload.package_name as string) ?? null,
      }).eq('id', active.id)

      results.push({ name: space.name, slug: space.slug, status: error ? 'error' : 'updated', reason: error?.message })
    } else {
      // Crear nuevo registro
      const { error } = await sb.from('space_pricing').insert(payload)
      results.push({ name: space.name, slug: space.slug, status: error ? 'error' : 'created', reason: error?.message })
    }
  }

  const fixed  = results.filter(r => r.status === 'created' || r.status === 'updated').length
  const errors = results.filter(r => r.status === 'error').length

  return NextResponse.json({ fixed, errors, results })
}
