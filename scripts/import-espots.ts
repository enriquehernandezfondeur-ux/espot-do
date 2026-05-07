/**
 * SCRIPT DE MIGRACIÓN — EspotHub
 *
 * Importa espacios desde un archivo JSON hacia Supabase.
 * Soporta imágenes remotas (descarga y sube a Storage).
 * Detecta duplicados por _source_id o slug.
 *
 * USO:
 *   npx tsx scripts/import-espots.ts --file scripts/mis-espots.json [--dry-run]
 *
 * VARIABLES DE ENTORNO REQUERIDAS:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY   ← clave service_role (NO la anon)
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

// ── Config ──────────────────────────────────────────────
const SUPABASE_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL  ?? ''
const SERVICE_KEY   = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
const IMAGE_BUCKET  = 'space-images'
const PLATFORM_FEE  = 10

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌  Faltan NEXT_PUBLIC_SUPABASE_URL y/o SUPABASE_SERVICE_ROLE_KEY en el entorno')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// ── CLI args ─────────────────────────────────────────────
const args     = process.argv.slice(2)
const fileArg  = args.find(a => a.startsWith('--file='))?.split('=')[1]
              ?? args[args.indexOf('--file') + 1]
const dryRun   = args.includes('--dry-run')
const onlySlug = args.find(a => a.startsWith('--only='))?.split('=')[1]

if (!fileArg) {
  console.error('❌  Uso: npx tsx scripts/import-espots.ts --file scripts/mis-espots.json [--dry-run] [--only=slug]')
  process.exit(1)
}

// ── Helpers ─────────────────────────────────────────────
function generateSlug(name: string) {
  return name
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    + '-' + Date.now().toString(36)
}

async function downloadAndUploadImage(url: string, spaceName: string, idx: number): Promise<string | null> {
  try {
    console.log(`    📥 Descargando imagen ${idx + 1}: ${url}`)
    const res = await fetch(url)
    if (!res.ok) { console.warn(`       ⚠️  HTTP ${res.status} — saltando`); return null }
    const contentType = res.headers.get('content-type') ?? 'image/jpeg'
    const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg'
    const buffer = Buffer.from(await res.arrayBuffer())
    const storagePath = `spaces/imported/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

    const { error } = await supabase.storage
      .from(IMAGE_BUCKET)
      .upload(storagePath, buffer, { contentType, upsert: false })

    if (error) { console.warn(`       ⚠️  Storage error: ${error.message}`); return null }
    const { data: { publicUrl } } = supabase.storage.from(IMAGE_BUCKET).getPublicUrl(storagePath)
    return publicUrl
  } catch (e: any) {
    console.warn(`       ⚠️  Error descargando ${url}: ${e.message}`)
    return null
  }
}

// ── Función principal de importación ────────────────────
async function importEspot(raw: any, index: number): Promise<{ ok: boolean; slug: string; reason?: string }> {
  const slug = raw.slug ?? generateSlug(raw.name)
  const label = `[${index + 1}] "${raw.name}" (${slug})`

  // ── Buscar host por email ──────────────────────────────
  let hostId: string | null = null
  if (raw.host_email) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', raw.host_email)
      .single()
    hostId = profile?.id ?? null
    if (!hostId) console.warn(`    ⚠️  Host no encontrado para ${raw.host_email}`)
  }
  if (!hostId) {
    // Fallback: usar el primer usuario con rol host
    const { data: fallback } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'host')
      .limit(1)
      .single()
    hostId = fallback?.id ?? null
  }
  if (!hostId) return { ok: false, slug, reason: 'No se encontró host válido' }

  // ── Detectar duplicado por _source_id o slug ──────────
  if (raw._source_id) {
    const { data: dup } = await supabase
      .from('spaces')
      .select('id, slug')
      .eq('source_id', raw._source_id)
      .single()
    if (dup) return { ok: false, slug, reason: `Duplicado (source_id ya existe → ${dup.slug})` }
  }
  const { data: dupSlug } = await supabase
    .from('spaces')
    .select('id')
    .eq('slug', slug)
    .single()
  if (dupSlug) return { ok: false, slug, reason: `Duplicado (slug "${slug}" ya existe)` }

  if (dryRun) {
    console.log(`    🔍  DRY RUN — ${label}`)
    return { ok: true, slug }
  }

  // ── Insertar espacio base ──────────────────────────────
  const spaceData: any = {
    host_id:    hostId,
    name:       raw.name,
    slug,
    description: raw.description ?? '',
    category:   raw.category ?? 'salon',
    address:    raw.address ?? '',
    city:       raw.city ?? 'Santo Domingo',
    sector:     raw.sector ?? '',
    lat:        raw.lat ? Number(raw.lat) : null,
    lng:        raw.lng ? Number(raw.lng) : null,
    capacity_min: raw.capacity_min ?? null,
    capacity_max: raw.capacity_max ?? 100,
    is_published: raw.is_published ?? false,
    is_active:  true,
    primary_activity:     raw.primary_activity ?? null,
    secondary_activities: raw.secondary_activities ?? [],
  }
  if (raw._source_id)  spaceData.source_id  = raw._source_id
  if (raw._source_url) spaceData.source_url = raw._source_url

  const { data: space, error: spaceErr } = await supabase
    .from('spaces').insert(spaceData).select('id').single()
  if (spaceErr) return { ok: false, slug, reason: spaceErr.message }
  const spaceId = space.id

  // ── Pricing ────────────────────────────────────────────
  if (raw.pricing) {
    const p = raw.pricing
    const pricingData: any = {
      space_id: spaceId,
      pricing_type: p.type ?? 'hourly',
      is_active: true,
      platform_fee_pct: PLATFORM_FEE,
    }
    if (p.type === 'hourly') {
      pricingData.hourly_price = p.hourly_price ?? 0
      pricingData.min_hours    = p.min_hours ?? 1
      if (p.max_hours) pricingData.max_hours = p.max_hours
    } else if (p.type === 'minimum_consumption') {
      pricingData.minimum_consumption = p.minimum_consumption ?? 0
      if (p.session_hours) pricingData.session_hours = p.session_hours
      if (p.min_hours)     pricingData.min_hours     = p.min_hours
      if (p.max_hours)     pricingData.max_hours     = p.max_hours
    } else if (p.type === 'fixed_package') {
      pricingData.fixed_price       = p.fixed_price ?? 0
      pricingData.package_name      = p.package_name ?? null
      pricingData.package_hours     = p.package_hours ?? null
      pricingData.extra_hour_price  = p.extra_hour_price ?? null
      pricingData.package_includes  = p.package_includes ?? []
    }
    await supabase.from('space_pricing').insert(pricingData)
  }

  // ── Time blocks ────────────────────────────────────────
  if (raw.time_blocks?.length) {
    await supabase.from('space_time_blocks').insert(
      raw.time_blocks.map((b: any) => ({
        space_id:    spaceId,
        block_name:  b.block_name ?? 'Horario disponible',
        start_time:  b.start_time ?? '08:00',
        end_time:    b.end_time   ?? '23:00',
        days_of_week: b.days_of_week ?? [0,1,2,3,4,5,6],
        is_active:   true,
      }))
    )
  }

  // ── Addons ─────────────────────────────────────────────
  if (raw.addons?.length) {
    await supabase.from('space_addons').insert(
      raw.addons.map((a: any) => ({
        space_id: spaceId,
        name:     a.name,
        price:    a.price ?? 0,
        unit:     a.unit  ?? 'evento',
        category: a.category ?? 'servicio',
        is_active: true,
      }))
    )
  }

  // ── Conditions ─────────────────────────────────────────
  if (raw.conditions) {
    const c = raw.conditions
    await supabase.from('space_conditions').insert({
      space_id: spaceId,
      allows_external_decoration: c.allows_external_decoration ?? true,
      allows_external_food:       c.allows_external_food       ?? false,
      allows_external_alcohol:    c.allows_external_alcohol    ?? false,
      allows_smoking:             c.allows_smoking             ?? false,
      allows_pets:                c.allows_pets                ?? false,
      allows_live_music:          c.allows_live_music          ?? false,
      allows_dj:                  c.allows_dj                  ?? false,
      allows_children:            c.allows_children            ?? true,
      allows_parties:             c.allows_parties             ?? true,
      allows_corporate:           c.allows_corporate           ?? true,
      music_cutoff_time:          c.music_cutoff_time          ?? null,
      deposit_required:           c.deposit_required           ?? false,
      deposit_amount:             c.deposit_amount             ?? null,
      deposit_refundable:         c.deposit_refundable         ?? true,
      cancellation_policy:        c.cancellation_policy        ?? 'moderada',
      cancellation_hours_before:  c.cancellation_hours_before  ?? 72,
      cancellation_refund_pct:    c.cancellation_refund_pct    ?? 50,
      custom_rules:               c.custom_rules               ?? null,
    })
  }

  // ── Payment terms ──────────────────────────────────────
  if (raw.payment_terms) {
    await supabase.from('space_payment_terms').insert({
      space_id:  spaceId,
      term_type: raw.payment_terms.term_type ?? 'platform_guarantee',
      venue_pct: raw.payment_terms.venue_pct ?? 90,
    })
  }

  // ── Imágenes ───────────────────────────────────────────
  const coverIdx = raw.cover_image_index ?? 0
  if (raw.images?.length) {
    const uploaded: { space_id: string; url: string; is_cover: boolean; position: number }[] = []
    for (let i = 0; i < raw.images.length; i++) {
      const imgSrc = raw.images[i]
      const publicUrl = imgSrc.startsWith('http')
        ? await downloadAndUploadImage(imgSrc, raw.name, i)
        : imgSrc
      if (publicUrl) uploaded.push({ space_id: spaceId, url: publicUrl, is_cover: i === coverIdx, position: i })
    }
    if (uploaded.length) await supabase.from('space_images').insert(uploaded)
  }

  // ── Video ──────────────────────────────────────────────
  if (raw.video_url) {
    await supabase.from('spaces').update({ video_url: raw.video_url }).eq('id', spaceId)
  }

  return { ok: true, slug }
}

// ── Main ─────────────────────────────────────────────────
async function main() {
  console.log(`\n🚀  EspotHub Migration Tool`)
  console.log(`   Archivo: ${fileArg}`)
  console.log(`   Modo: ${dryRun ? 'DRY RUN (no escribe nada)' : 'PRODUCCIÓN'}`)
  if (onlySlug) console.log(`   Solo importar: ${onlySlug}\n`)

  const filePath = path.resolve(process.cwd(), fileArg!)
  if (!fs.existsSync(filePath)) {
    console.error(`❌  Archivo no encontrado: ${filePath}`)
    process.exit(1)
  }

  let records: any[]
  try {
    records = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
    records = records.filter((r: any) => !r._comment)
    if (onlySlug) records = records.filter((r: any) => (r.slug ?? r.name) === onlySlug)
  } catch (e: any) {
    console.error(`❌  Error leyendo JSON: ${e.message}`)
    process.exit(1)
  }

  console.log(`📋  Espacios a importar: ${records.length}\n`)

  const results = { ok: 0, skip: 0, fail: 0 }
  for (let i = 0; i < records.length; i++) {
    const r = records[i]
    console.log(`\n⟶  [${i+1}/${records.length}] "${r.name}"`)
    try {
      const res = await importEspot(r, i)
      if (res.ok) {
        console.log(`   ✅  Importado → slug: ${res.slug}`)
        results.ok++
      } else {
        console.log(`   ⏭️  Saltado — ${res.reason}`)
        results.skip++
      }
    } catch (e: any) {
      console.error(`   ❌  Error — ${e.message}`)
      results.fail++
    }
  }

  console.log(`\n${'─'.repeat(40)}`)
  console.log(`✅ Importados:  ${results.ok}`)
  console.log(`⏭️  Saltados:   ${results.skip}`)
  console.log(`❌ Errores:    ${results.fail}`)
  console.log(`${'─'.repeat(40)}\n`)
}

main().catch(e => { console.error(e); process.exit(1) })
