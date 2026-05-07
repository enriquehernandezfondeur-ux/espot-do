import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const PLATFORM_FEE = 10
const IMAGE_BUCKET = 'space-images'

function generateSlug(name: string) {
  return name.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '').trim()
    .replace(/\s+/g, '-') + '-' + Date.now().toString(36)
}

async function downloadImage(url: string): Promise<{ buffer: Buffer; contentType: string } | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) })
    if (!res.ok) return null
    const contentType = res.headers.get('content-type') ?? 'image/jpeg'
    const buffer = Buffer.from(await res.arrayBuffer())
    return { buffer, contentType }
  } catch { return null }
}

// POST /api/admin/migrate
// Body: { records: MigrationRecord[], dryRun?: boolean }
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  // Solo superadmin
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin' && user.email !== (process.env.SUPERADMIN_EMAIL ?? 'enriquehernandezfondeur@gmail.com'))
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const { records = [], dryRun = false } = await req.json()

  const results: { name: string; slug: string; status: 'ok' | 'skip' | 'error'; reason?: string }[] = []

  // Usar service_role desde el server-side para bypasear RLS en la migración
  const { createClient: createServiceClient } = await import('@supabase/supabase-js')
  const sb = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  for (const raw of records) {
    if (raw._comment) continue
    const slug = raw.slug ?? generateSlug(raw.name)

    try {
      // Detectar duplicados
      if (raw._source_id) {
        const { data: dup } = await sb.from('spaces').select('id').eq('source_id', raw._source_id).single()
        if (dup) { results.push({ name: raw.name, slug, status: 'skip', reason: 'source_id ya existe' }); continue }
      }
      const { data: dupSlug } = await sb.from('spaces').select('id').eq('slug', slug).single()
      if (dupSlug) { results.push({ name: raw.name, slug, status: 'skip', reason: `slug "${slug}" ya existe` }); continue }

      if (dryRun) { results.push({ name: raw.name, slug, status: 'ok', reason: 'dry-run' }); continue }

      // Resolver host
      let hostId: string | null = null
      if (raw.host_email) {
        const { data: h } = await sb.from('profiles').select('id').eq('email', raw.host_email).single()
        hostId = h?.id ?? null
      }
      if (!hostId) {
        const { data: h } = await sb.from('profiles').select('id').eq('role', 'host').limit(1).single()
        hostId = h?.id ?? null
      }
      if (!hostId) { results.push({ name: raw.name, slug, status: 'error', reason: 'Host no encontrado' }); continue }

      // Espacio base
      const spaceData: any = {
        host_id: hostId, name: raw.name, slug,
        description: raw.description ?? '', category: raw.category ?? 'salon',
        address: raw.address ?? '', city: raw.city ?? 'Santo Domingo', sector: raw.sector ?? '',
        lat: raw.lat ? Number(raw.lat) : null, lng: raw.lng ? Number(raw.lng) : null,
        capacity_min: raw.capacity_min ?? null, capacity_max: raw.capacity_max ?? 100,
        is_published: raw.is_published ?? false, is_active: true,
        primary_activity: raw.primary_activity ?? null,
        secondary_activities: raw.secondary_activities ?? [],
      }
      if (raw._source_id)  spaceData.source_id  = raw._source_id
      if (raw._source_url) spaceData.source_url = raw._source_url

      const { data: space, error: spaceErr } = await sb.from('spaces').insert(spaceData).select('id').single()
      if (spaceErr) { results.push({ name: raw.name, slug, status: 'error', reason: spaceErr.message }); continue }
      const sid = space.id

      // Pricing
      if (raw.pricing) {
        const p = raw.pricing
        const pd: any = { space_id: sid, pricing_type: p.type ?? 'hourly', is_active: true, platform_fee_pct: PLATFORM_FEE }
        if (p.type === 'hourly') { pd.hourly_price = p.hourly_price ?? 0; pd.min_hours = p.min_hours ?? 1; if (p.max_hours) pd.max_hours = p.max_hours }
        else if (p.type === 'minimum_consumption') { pd.minimum_consumption = p.minimum_consumption ?? 0; if (p.session_hours) pd.session_hours = p.session_hours; if (p.min_hours) pd.min_hours = p.min_hours; if (p.max_hours) pd.max_hours = p.max_hours }
        else if (p.type === 'fixed_package') { pd.fixed_price = p.fixed_price ?? 0; pd.package_name = p.package_name; pd.package_hours = p.package_hours; pd.extra_hour_price = p.extra_hour_price; pd.package_includes = p.package_includes ?? [] }
        await sb.from('space_pricing').insert(pd)
      }

      // Time blocks
      if (raw.time_blocks?.length) await sb.from('space_time_blocks').insert(
        raw.time_blocks.map((b: any) => ({ space_id: sid, block_name: b.block_name ?? 'Horario disponible', start_time: b.start_time ?? '08:00', end_time: b.end_time ?? '23:00', days_of_week: b.days_of_week ?? [0,1,2,3,4,5,6], is_active: true }))
      )

      // Addons
      if (raw.addons?.length) await sb.from('space_addons').insert(
        raw.addons.map((a: any) => ({ space_id: sid, name: a.name, price: a.price ?? 0, unit: a.unit ?? 'evento', category: a.category ?? 'servicio', is_active: true }))
      )

      // Conditions
      if (raw.conditions) {
        const c = raw.conditions
        await sb.from('space_conditions').insert({ space_id: sid, allows_external_decoration: c.allows_external_decoration ?? true, allows_external_food: c.allows_external_food ?? false, allows_external_alcohol: c.allows_external_alcohol ?? false, allows_smoking: c.allows_smoking ?? false, allows_pets: c.allows_pets ?? false, allows_live_music: c.allows_live_music ?? false, allows_dj: c.allows_dj ?? false, allows_children: c.allows_children ?? true, allows_parties: c.allows_parties ?? true, allows_corporate: c.allows_corporate ?? true, music_cutoff_time: c.music_cutoff_time ?? null, deposit_required: c.deposit_required ?? false, deposit_amount: c.deposit_amount ?? null, deposit_refundable: c.deposit_refundable ?? true, cancellation_policy: c.cancellation_policy ?? 'moderada', cancellation_hours_before: c.cancellation_hours_before ?? 72, cancellation_refund_pct: c.cancellation_refund_pct ?? 50, custom_rules: c.custom_rules ?? null })
      }

      // Payment terms
      if (raw.payment_terms) await sb.from('space_payment_terms').insert({ space_id: sid, term_type: raw.payment_terms.term_type ?? 'platform_guarantee', venue_pct: raw.payment_terms.venue_pct ?? 90 })

      // Imágenes — descargar y subir a Storage
      const coverIdx = raw.cover_image_index ?? 0
      const imageRecords: any[] = []
      if (raw.images?.length) {
        for (let i = 0; i < raw.images.length; i++) {
          const imgUrl = raw.images[i]
          if (!imgUrl) continue
          let publicUrl = imgUrl
          if (imgUrl.startsWith('http')) {
            const dl = await downloadImage(imgUrl)
            if (dl) {
              const ext = dl.contentType.includes('png') ? 'png' : dl.contentType.includes('webp') ? 'webp' : 'jpg'
              const storagePath = `spaces/imported/${sid}-${i}.${ext}`
              const { error: upErr } = await sb.storage.from(IMAGE_BUCKET).upload(storagePath, dl.buffer, { contentType: dl.contentType, upsert: true })
              if (!upErr) {
                const { data: { publicUrl: pu } } = sb.storage.from(IMAGE_BUCKET).getPublicUrl(storagePath)
                publicUrl = pu
              }
            }
          }
          imageRecords.push({ space_id: sid, url: publicUrl, is_cover: i === coverIdx, position: i })
        }
        if (imageRecords.length) await sb.from('space_images').insert(imageRecords)
      }

      // Video
      if (raw.video_url) await sb.from('spaces').update({ video_url: raw.video_url }).eq('id', sid)

      results.push({ name: raw.name, slug, status: 'ok' })
    } catch (e: any) {
      results.push({ name: raw.name, slug, status: 'error', reason: e.message })
    }
  }

  const ok    = results.filter(r => r.status === 'ok').length
  const skip  = results.filter(r => r.status === 'skip').length
  const error = results.filter(r => r.status === 'error').length
  return NextResponse.json({ results, summary: { ok, skip, error, total: records.length } })
}
