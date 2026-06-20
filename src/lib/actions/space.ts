'use server'

import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { resolveHostAccess } from './_resolveHost'
import { generateSlug, num, int, todayInRD } from '@/lib/utils'
import { revalidatePath } from 'next/cache'
import type { PricingType, PaymentTermType } from '@/types'
import { sendEmail } from '@/lib/email/send'
import { emailBase, infoBox } from '@/lib/email/templates'

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'contacto@espot.do'
const SITE        = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://espot.do'

// Presets de cancelación: la política elegida es la FUENTE ÚNICA y define las
// horas de anticipación y el % de reembolso (deben coincidir con las descripciones
// del formulario y con el detalle público). Antes el wizard guardaba 72h/50% fijo
// aunque el host eligiera "flexible" (100%/24h) → reembolso inconsistente.
const CANCELLATION_PRESETS: Record<string, { hours: number; refundPct: number }> = {
  flexible: { hours: 24, refundPct: 100 },
  moderada: { hours: 72, refundPct: 50  },
  estricta: { hours: 0,  refundPct: 0   },
}
function cancellationTerms(policy: string | null | undefined) {
  return CANCELLATION_PRESETS[policy ?? 'moderada'] ?? CANCELLATION_PRESETS.moderada
}

async function getPlatformFeePct(): Promise<number> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('marketplace_config')
    .select('value')
    .eq('key', 'platform_fee_pct')
    .single()
  return Number(data?.value ?? 10)
}

const VENUE_PCT_BY_TERM: Record<PaymentTermType, number> = {
  platform_guarantee: 90,
  split_advance:      40,
  full_prepaid:       0,
  quote_only:         0,
}

export interface SaveSpacePayload {
  // Step 1
  name: string
  category: string
  description: string
  address: string
  sector: string
  lat?: string
  lng?: string
  videoUrl?: string
  menuUrl?: string
  menuFileName?: string
  capacityMin: string
  capacityMax: string
  primaryActivity?: string
  secondaryActivities?: string[]
  // Step 2
  pricingType: PricingType
  hourlyPrice: string
  isConsumable: boolean
  /** Si true (solo hourly), el cliente elige uso del espacio vs consumible al reservar. */
  consumableOptional?: boolean
  minHours: string
  maxHours: string
  minConsumption: string
  sessionHours: string
  fixedPrice: string
  packageName: string
  packageHours: string
  pkgExtraHourPrice: string
  packageIncludes: string[]
  weekendMultiplier?: number
  minAdvanceAmount?: number
  // Step 3
  timeBlocks: { block_name: string; start_time: string; end_time: string; days: number[] }[]
  // Step 4
  addons: { name: string; price: number; unit: string; category: string }[]
  // Reserva instantánea
  instantBooking: boolean
  // Exclusivo por jornada (una reserva bloquea toda la fecha) vs. varios turnos
  singleBookingPerDay?: boolean
  // Step 5 — Facilidades físicas (booleanas)
  hasParkingFac: boolean
  hasValetParking: boolean
  hasWifi: boolean
  hasAc: boolean
  hasSoundSystem: boolean
  hasProjector: boolean
  hasDanceFloor: boolean
  hasOutdoorArea: boolean
  hasPool: boolean
  hasKitchen: boolean
  hasBar: boolean
  hasStage: boolean
  hasCyclorama: boolean
  hasNaturalLight: boolean
  hasGenerator: boolean
  hasDressingRoom: boolean
  // Step 5 — Permisos
  allowsDecoration: boolean
  allowsFood: boolean
  allowsAlcohol: boolean
  allowsLiveMusic: boolean
  allowsDJ: boolean
  allowsSmoking: boolean
  allowsChildren: boolean
  allowsPets: boolean
  allowsParties: boolean
  allowsCorporate: boolean
  // Step 5 — Limpieza
  includesCleaning: boolean
  cleaningFee: string
  // Step 5 — Horas extra
  allowsExtraHours: boolean
  extraHourPrice: string
  // Step 5 — Cancelación
  cancellationPolicy: string
  customRules: string
  // Step 6
  paymentTerm: PaymentTermType
}

function buildPricingData(spaceId: string, p: SaveSpacePayload) {
  // weekend_multiplier y min_advance_amount aplican a TODOS los tipos:
  // el marketplace (computeBasePrice, BookingWidget, booking.ts) los lee
  // para cualquier pricing_type, así que deben persistirse siempre.
  const base = {
    space_id: spaceId,
    pricing_type: p.pricingType,
    is_active: true,
    weekend_multiplier: p.weekendMultiplier ?? 1,
    min_advance_amount: p.minAdvanceAmount ?? 0,
  }
  if (p.pricingType === 'hourly') return {
    ...base,
    hourly_price: num(p.hourlyPrice),
    is_consumable: p.isConsumable,
    consumable_optional: p.consumableOptional ?? false,
    min_hours: int(p.minHours) ?? 1,
    max_hours: int(p.maxHours),
  }
  if (p.pricingType === 'minimum_consumption') return {
    ...base,
    minimum_consumption: num(p.minConsumption),
    session_hours: int(p.sessionHours) || null,
    min_hours:     int(p.minHours) || null,
    max_hours:     int(p.maxHours) || null,
  }
  if (p.pricingType === 'fixed_package') return {
    ...base,
    fixed_price:       num(p.fixedPrice),
    package_name:      p.packageName,
    package_hours:     int(p.packageHours),
    extra_hour_price:    num(p.pkgExtraHourPrice),
    package_includes:    p.packageIncludes,
  }
  return base
}

export async function saveSpace(payload: SaveSpacePayload) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  // Dueño o miembro con permiso de gestionar espacios (admin)
  const { hostId, db, canManageSpaces } = await resolveHostAccess(supabase, user.id)
  if (!canManageSpaces) return { error: 'No tienes permiso para gestionar espacios' }

  const { data: space, error: spaceError } = await db
    .from('spaces')
    .insert({
      host_id: hostId,
      name: payload.name,
      slug: generateSlug(payload.name),
      description: payload.description,
      category: payload.category,
      capacity_min: int(payload.capacityMin),
      capacity_max: int(payload.capacityMax)!,
      address: payload.address,
      city: 'Santo Domingo',
      sector: payload.sector,
      lat: payload.lat ? num(payload.lat) : null,
      lng: payload.lng ? num(payload.lng) : null,
      primary_activity:     payload.primaryActivity || null,
      secondary_activities: payload.secondaryActivities ?? [],
      instant_booking: payload.instantBooking ?? false,
      single_booking_per_day: payload.singleBookingPerDay ?? false,
      is_published: false,
      is_active: true,
    })
    .select('id')
    .single()

  if (spaceError) return { error: spaceError.message }

  const spaceId = space.id

  // Guardar video_url y menu_url
  if (payload.videoUrl !== undefined || payload.menuUrl !== undefined) {
    const extras: Record<string, unknown> = {}
    if (payload.videoUrl     !== undefined) extras.video_url      = payload.videoUrl     || null
    if (payload.menuUrl      !== undefined) extras.menu_url       = payload.menuUrl      || null
    if (payload.menuFileName !== undefined) extras.menu_file_name = payload.menuFileName || null
    const { error: mediaError } = await db.from('spaces').update(extras).eq('id', spaceId)
    if (mediaError) console.error('[saveSpace] media columns update failed:', mediaError.message)
  }

  const inserts = [
    db.from('space_pricing').insert(buildPricingData(spaceId, payload)),
    payload.timeBlocks.length > 0
      ? db.from('space_time_blocks').insert(
          payload.timeBlocks.map(b => ({
            space_id: spaceId,
            block_name: b.block_name,
            start_time: b.start_time,
            end_time: b.end_time,
            days_of_week: b.days,
            is_active: true,
          }))
        )
      : null,
    payload.addons.length > 0
      ? db.from('space_addons').insert(
          payload.addons.map(a => ({
            space_id: spaceId,
            name: a.name,
            price: a.price,
            unit: a.unit,
            category: a.category,
            is_available: true,
          }))
        )
      : null,
    db.from('space_conditions').insert({
      space_id: spaceId,
      // Facilidades físicas
      has_parking:       payload.hasParkingFac,
      has_valet_parking: payload.hasValetParking,
      has_wifi:          payload.hasWifi,
      has_ac:            payload.hasAc,
      has_sound_system:  payload.hasSoundSystem,
      has_projector:     payload.hasProjector,
      has_dance_floor:   payload.hasDanceFloor,
      has_outdoor_area:  payload.hasOutdoorArea,
      has_pool:          payload.hasPool,
      has_kitchen:       payload.hasKitchen,
      has_bar:           payload.hasBar,
      has_stage:         payload.hasStage,
      has_cyclorama:     payload.hasCyclorama,
      has_natural_light: payload.hasNaturalLight,
      has_generator:     payload.hasGenerator,
      has_dressing_room: payload.hasDressingRoom,
      // Permisos generales
      allows_external_decoration: payload.allowsDecoration,
      allows_external_food:       payload.allowsFood,
      allows_external_alcohol:    payload.allowsAlcohol,
      allows_smoking:             payload.allowsSmoking,
      allows_pets:                payload.allowsPets,
      allows_live_music:          payload.allowsLiveMusic,
      allows_dj:                  payload.allowsDJ,
      allows_children:            payload.allowsChildren,
      allows_parties:             payload.allowsParties,
      allows_corporate:           payload.allowsCorporate,
      // Limpieza
      cleaning_included: payload.includesCleaning,
      cleaning_fee:      num(payload.cleaningFee),
      // Horas extra
      overtime_allowed: payload.allowsExtraHours,
      overtime_price:   num(payload.extraHourPrice),
      // Cancelación — derivada de la política (fuente única)
      cancellation_policy:         payload.cancellationPolicy,
      cancellation_hours_before:   cancellationTerms(payload.cancellationPolicy).hours,
      cancellation_refund_pct:     cancellationTerms(payload.cancellationPolicy).refundPct,
      custom_rules: payload.customRules || null,
    }),
    payload.paymentTerm
      ? db.from('space_payment_terms').insert({
          space_id:         spaceId,
          term_type:        payload.paymentTerm,
          platform_fee_pct: await getPlatformFeePct(),
          venue_pct:        VENUE_PCT_BY_TERM[payload.paymentTerm] ?? 90,
          advance_pct:      payload.paymentTerm === 'split_advance' ? 40 : null,
          day_of_event_pct: payload.paymentTerm === 'split_advance' ? 50 : null,
          advance_days_before: 3,
        })
      : null,
  ].filter(Boolean)

  const results = await Promise.all(inserts)
  const failed = results.find(r => r && 'error' in r && r.error)

  if (failed && 'error' in failed && failed.error) {
    await db.from('spaces').delete().eq('id', spaceId)
    return { error: failed.error.message }
  }

  return { success: true, spaceId }
}

export async function deactivateSpace(spaceId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }
  const { hostId, db, canManageSpaces } = await resolveHostAccess(supabase, user.id)
  if (!canManageSpaces) return { error: 'No tienes permiso para gestionar espacios' }
  const { data: space } = await db.from('spaces').select('host_id').eq('id', spaceId).single()
  if (!space || space.host_id !== hostId) return { error: 'No autorizado' }
  const { error } = await db.from('spaces').update({ is_published: false, is_active: false }).eq('id', spaceId)
  if (!error) revalidatePath('/buscar')
  return error ? { error: error.message } : { success: true }
}

export async function deleteSpaceByHost(spaceId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { hostId, db, canManageSpaces } = await resolveHostAccess(supabase, user.id)
  if (!canManageSpaces) return { error: 'No tienes permiso para gestionar espacios' }
  const { data: space } = await db.from('spaces').select('host_id, is_published').eq('id', spaceId).single()
  if (!space || space.host_id !== hostId) return { error: 'No autorizado' }
  if (space.is_published) return { error: 'Debes despublicar el espacio antes de eliminarlo.' }

  // Bloquear si hay reservas activas (pendientes, aceptadas o confirmadas)
  const { data: activeBookings } = await db
    .from('bookings').select('id').eq('space_id', spaceId)
    .in('status', ['pending', 'quote_requested', 'accepted', 'confirmed'])
    .limit(1)
  if (activeBookings && activeBookings.length > 0)
    return { error: 'No puedes eliminar un espacio con reservas activas. Cancélalas primero.' }

  // Usar service client para bypasear RLS en las tablas donde el host no tiene permiso de delete
  const sb = createServiceClient()
  await Promise.all([
    sb.from('space_images').delete().eq('space_id', spaceId),
    sb.from('space_addons').delete().eq('space_id', spaceId),
    sb.from('space_time_blocks').delete().eq('space_id', spaceId),
    sb.from('space_payment_terms').delete().eq('space_id', spaceId),
    sb.from('space_conditions').delete().eq('space_id', spaceId),
    sb.from('favorites').delete().eq('space_id', spaceId),
    sb.from('messages').delete().eq('space_id', spaceId),
    sb.from('bookings').delete().eq('space_id', spaceId),
  ])
  await sb.from('space_pricing').delete().eq('space_id', spaceId)

  const { error } = await sb.from('spaces').delete().eq('id', spaceId)
  if (!error) revalidatePath('/buscar')
  return error ? { error: error.message } : { success: true }
}

export async function publishSpace(spaceId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { hostId, db, canManageSpaces } = await resolveHostAccess(supabase, user.id)
  if (!canManageSpaces) return { error: 'No tienes permiso para gestionar espacios' }
  const { data: space } = await db
    .from('spaces')
    .select('host_id, name, category, sector, profiles!host_id(full_name, email)')
    .eq('id', spaceId)
    .single()
  if (!space || space.host_id !== hostId) return { error: 'No autorizado' }

  // El espacio queda en revisión: is_active = true, is_published = false (sin cambiar)
  // El equipo de espot.do aprueba manualmente y activa is_published cuando sea apropiado
  const { error } = await db
    .from('spaces')
    .update({ is_active: true })
    .eq('id', spaceId)
  if (!error) revalidatePath('/buscar')
  if (error) return { error: error.message }

  // Notificar al admin para revisión manual
  const host = (space as any).profiles as any
  await sendEmail({
    to:      ADMIN_EMAIL,
    subject: `Nuevo espacio en revisión — ${space.name}`,
    html: emailBase({
      title:       'Nuevo espacio enviado a revisión',
      subtitle:    `${host?.full_name ?? 'Un propietario'} publicó un espacio que requiere aprobación.`,
      accentColor: '#D97706',
      body: `
        <p style="color:#374151;margin:0 0 16px;">Se ha enviado un nuevo espacio para revisión y publicación en el marketplace.</p>
        ${infoBox([
          { label: 'Espacio',       value: space.name ?? '—' },
          { label: 'Categoría',     value: space.category ?? '—' },
          { label: 'Sector',        value: (space as any).sector ?? '—' },
          { label: 'Propietario',   value: host?.full_name ?? '—' },
          { label: 'Email host',    value: host?.email ?? '—' },
          { label: 'Estado',        value: 'En revisión — pendiente de aprobación' },
        ])}
        <p style="color:#6B7280;font-size:13px;margin:0;">Revisa el espacio en el panel de administración y aprueba o rechaza su publicación.</p>`,
      cta: { text: 'Ver en panel admin', url: `${SITE}/admin/espacios` },
    }),
  })

  return { success: true, pending: true }
}

export async function getMySpaces() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { hostId, db } = await resolveHostAccess(supabase, user.id)
  const { data } = await db
    .from('spaces')
    .select('*, space_pricing(*), space_addons(*), space_conditions(*), space_payment_terms(*), space_time_blocks(*), space_images(*)')
    .eq('host_id', hostId)
    .order('created_at', { ascending: false })

  return data ?? []
}

export interface SpaceListItem {
  id: string
  name: string
  slug: string
  category: string
  sector: string | null
  city: string | null
  capacity_max: number | null
  is_published: boolean
  is_active: boolean
  is_featured: boolean
  created_at: string
  updated_at: string | null
  cover: string | null
  pricing_type: string | null
  hourly_price: number | null
  minimum_consumption: number | null
  fixed_price: number | null
  plan_type: string | null
  next_event_date: string | null
  cancellation_policy: string | null
  cancellation_refund_pct: number | null
  cancellation_hours_before: number | null
}

/**
 * Lista PAGINADA de los espacios del host para "Mis espacios". Filtra/ordena en
 * el SERVIDOR y trae solo los campos de la lista (no las 6 relaciones pesadas).
 * Reemplaza a getMySpaces() en la vista de lista para no descargar todo.
 */
export async function getMySpacesList(opts: {
  status?: 'all' | 'published' | 'pending' | 'draft'
  q?: string
  category?: string
  sort?: 'recent' | 'name' | 'published'
  page?: number
  pageSize?: number
} = {}): Promise<{ items: SpaceListItem[]; total: number }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { items: [], total: 0 }
  const { hostId, db } = await resolveHostAccess(supabase, user.id)

  const page = opts.page ?? 0
  const size = opts.pageSize ?? 12

  let query = db
    .from('spaces')
    .select('id, name, slug, category, sector, city, capacity_max, is_published, is_active, is_featured, created_at, updated_at, profiles!host_id(plan_type), space_images(url, is_cover), space_pricing(pricing_type, hourly_price, minimum_consumption, fixed_price, is_active), space_conditions(cancellation_policy, cancellation_refund_pct, cancellation_hours_before)', { count: 'exact' })
    .eq('host_id', hostId)

  if (opts.status === 'published')    query = query.eq('is_published', true)
  else if (opts.status === 'pending') query = query.eq('is_published', false).eq('is_active', true)
  else if (opts.status === 'draft')   query = query.eq('is_published', false).eq('is_active', false)

  if (opts.category) query = query.eq('category', opts.category)

  if (opts.q?.trim()) {
    const term = opts.q.trim().replace(/[%,()]/g, '')
    query = query.or(`name.ilike.%${term}%,sector.ilike.%${term}%,city.ilike.%${term}%`)
  }

  if (opts.sort === 'name')           query = query.order('name', { ascending: true })
  else if (opts.sort === 'published') query = query.order('is_published', { ascending: false }).order('created_at', { ascending: false })
  else                                query = query.order('created_at', { ascending: false })

  query = query.range(page * size, page * size + size - 1)

  const { data, count } = await query

  const items: SpaceListItem[] = (data ?? []).map((s: any) => {
    const pricing = s.space_pricing?.find((p: any) => p.is_active) ?? s.space_pricing?.[0]
    const cover = s.space_images?.find((i: any) => i.is_cover)?.url ?? s.space_images?.[0]?.url ?? null
    return {
      id: s.id, name: s.name, slug: s.slug, category: s.category,
      sector: s.sector, city: s.city, capacity_max: s.capacity_max,
      is_published: s.is_published, is_active: s.is_active, is_featured: s.is_featured,
      created_at: s.created_at, updated_at: s.updated_at, cover,
      pricing_type: pricing?.pricing_type ?? null,
      hourly_price: pricing?.hourly_price ?? null,
      minimum_consumption: pricing?.minimum_consumption ?? null,
      fixed_price: pricing?.fixed_price ?? null,
      plan_type: (s.profiles as any)?.plan_type ?? null,
      next_event_date: null,
      cancellation_policy:       s.space_conditions?.[0]?.cancellation_policy ?? null,
      cancellation_refund_pct:   s.space_conditions?.[0]?.cancellation_refund_pct ?? null,
      cancellation_hours_before: s.space_conditions?.[0]?.cancellation_hours_before ?? null,
    }
  })

  // Próxima reserva por espacio: consulta ligera sobre los ids de ESTA página.
  const ids = items.map(i => i.id)
  if (ids.length > 0) {
    const { data: bks } = await db
      .from('bookings')
      .select('space_id, event_date')
      .in('space_id', ids)
      .in('status', ['accepted', 'confirmed'])
      .gte('event_date', todayInRD())
      .order('event_date', { ascending: true })
    const nextBy: Record<string, string> = {}
    for (const b of (bks ?? []) as any[]) {
      if (!nextBy[b.space_id]) nextBy[b.space_id] = b.event_date
    }
    items.forEach(i => { i.next_event_date = nextBy[i.id] ?? null })
  }

  return { items, total: count ?? 0 }
}

/** Conteos por estado + categorías presentes para los filtros (campos mínimos). */
export async function getMySpacesCounts(): Promise<{ all: number; published: number; pending: number; draft: number; categories: string[] }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { all: 0, published: 0, pending: 0, draft: 0, categories: [] }
  const { hostId, db } = await resolveHostAccess(supabase, user.id)
  const { data } = await db.from('spaces').select('is_published, is_active, category').eq('host_id', hostId)
  const rows = (data ?? []) as { is_published: boolean; is_active: boolean; category: string }[]
  return {
    all: rows.length,
    published: rows.filter(s => s.is_published).length,
    pending:   rows.filter(s => !s.is_published && s.is_active).length,
    draft:     rows.filter(s => !s.is_published && !s.is_active).length,
    // Solo las categorías que el host realmente tiene (no todo el catálogo)
    categories: [...new Set(rows.map(s => s.category).filter(Boolean))],
  }
}

/** Un espacio COMPLETO (con todas las relaciones) para abrirlo en el editor. */
export async function getMySpaceForEdit(spaceId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { hostId, db } = await resolveHostAccess(supabase, user.id)
  const { data } = await db
    .from('spaces')
    .select('*, space_pricing(*), space_addons(*), space_conditions(*), space_payment_terms(*), space_time_blocks(*), space_images(*)')
    .eq('id', spaceId).eq('host_id', hostId).single()
  return data
}

// Guardar URLs de fotos ya subidas a Storage en la tabla space_images
export async function saveSpaceImages(
  spaceId: string,
  photos: { url: string; path?: string; isCover: boolean }[]
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  // Verificar que el usuario es el propietario del espacio (o miembro con permiso)
  const { hostId, db, canManageSpaces } = await resolveHostAccess(supabase, user.id)
  if (!canManageSpaces) return { error: 'No tienes permiso para gestionar espacios' }
  const { data: space } = await db.from('spaces').select('host_id').eq('id', spaceId).single()
  if (!space || space.host_id !== hostId) return { error: 'No autorizado' }

  // Eliminar fotos anteriores
  await db.from('space_images').delete().eq('space_id', spaceId)

  if (photos.length === 0) return { success: true }

  const { error } = await db.from('space_images').insert(
    photos.map((p, i) => ({
      space_id: spaceId,
      url:      p.url,
      is_cover: p.isCover,
      position: i,
    }))
  )

  if (!error) {
    revalidatePath('/buscar')
    revalidatePath('/espacios', 'layout')
  }
  return error ? { error: error.message } : { success: true }
}

// Actualizar espacio existente
export async function updateSpace(spaceId: string, payload: Omit<SaveSpacePayload, never>) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  // Verificar que el espacio pertenece al host (o miembro con permiso)
  const { hostId, db, canManageSpaces } = await resolveHostAccess(supabase, user.id)
  if (!canManageSpaces) return { error: 'No tienes permiso para gestionar espacios' }
  const { data: space } = await db.from('spaces').select('host_id').eq('id', spaceId).single()
  if (!space || space.host_id !== hostId) return { error: 'No autorizado' }

  // Actualizar info básica
  const { error: spaceError } = await db.from('spaces').update({
    name: payload.name,
    description: payload.description,
    category: payload.category,
    capacity_min: payload.capacityMin ? int(payload.capacityMin) : null,
    capacity_max: int(payload.capacityMax)!,
    address: payload.address,
    city: 'Santo Domingo',
    sector: payload.sector,
    lat: payload.lat ? num(payload.lat) : null,
    lng: payload.lng ? num(payload.lng) : null,
    primary_activity:     payload.primaryActivity || null,
    secondary_activities: payload.secondaryActivities ?? [],
    instant_booking: payload.instantBooking ?? false,
  }).eq('id', spaceId)

  if (spaceError) return { error: spaceError.message }

  // Guardar video_url y menu_url
  if (payload.videoUrl !== undefined || payload.menuUrl !== undefined) {
    const extras: Record<string, unknown> = {}
    if (payload.videoUrl     !== undefined) extras.video_url      = payload.videoUrl     || null
    if (payload.menuUrl      !== undefined) extras.menu_url       = payload.menuUrl      || null
    if (payload.menuFileName !== undefined) extras.menu_file_name = payload.menuFileName || null
    const { error: mediaError } = await db.from('spaces').update(extras).eq('id', spaceId)
    if (mediaError) console.error('[updateSpace] media columns update failed:', mediaError.message)
  }

  // Actualizar pricing
  const pricingData: Record<string, unknown> = {
    pricing_type: payload.pricingType,
    is_active: true,
    // consumible solo aplica al modelo por hora; al cambiar a otro modelo se resetea
    is_consumable: payload.pricingType === 'hourly' ? payload.isConsumable : false,
    consumable_optional: payload.pricingType === 'hourly' ? (payload.consumableOptional ?? false) : false,
  }
  if (payload.pricingType === 'hourly') {
    pricingData.hourly_price = num(payload.hourlyPrice)
    pricingData.min_hours    = int(payload.minHours) ?? 1
    pricingData.max_hours    = int(payload.maxHours) ?? null
  }
  if (payload.pricingType === 'minimum_consumption') {
    pricingData.minimum_consumption = num(payload.minConsumption)
    pricingData.session_hours       = int(payload.sessionHours) ?? null
    pricingData.min_hours           = int(payload.minHours)     ?? null
    pricingData.max_hours           = int(payload.maxHours)     ?? null
  }
  if (payload.pricingType === 'fixed_package') {
    pricingData.fixed_price      = num(payload.fixedPrice)
    pricingData.package_name     = payload.packageName
    pricingData.package_includes = payload.packageIncludes
    pricingData.package_hours    = int(payload.packageHours)      ?? null
    pricingData.extra_hour_price = num(payload.pkgExtraHourPrice) ?? null
  }
  // Precio dinámico y anticipo mínimo — aplica a todos los tipos
  if (payload.weekendMultiplier !== undefined) pricingData.weekend_multiplier = payload.weekendMultiplier
  if (payload.minAdvanceAmount  !== undefined) pricingData.min_advance_amount  = payload.minAdvanceAmount

  const existingPricing = await db.from('space_pricing').select('id').eq('space_id', spaceId).limit(1)
  if (existingPricing.data?.length) {
    await db.from('space_pricing').update(pricingData).eq('space_id', spaceId)
  } else {
    await db.from('space_pricing').insert({ ...pricingData, space_id: spaceId })
  }

  // Actualizar condiciones
  const condData = {
    space_id: spaceId,
    // Facilidades físicas
    has_parking:       payload.hasParkingFac,
    has_valet_parking: payload.hasValetParking,
    has_wifi:          payload.hasWifi,
    has_ac:            payload.hasAc,
    has_sound_system:  payload.hasSoundSystem,
    has_projector:     payload.hasProjector,
    has_dance_floor:   payload.hasDanceFloor,
    has_outdoor_area:  payload.hasOutdoorArea,
    has_pool:          payload.hasPool,
    has_kitchen:       payload.hasKitchen,
    has_bar:           payload.hasBar,
    has_stage:         payload.hasStage,
    has_cyclorama:     payload.hasCyclorama,
    has_natural_light: payload.hasNaturalLight,
    has_generator:     payload.hasGenerator,
    has_dressing_room: payload.hasDressingRoom,
    // Permisos generales
    allows_external_decoration: payload.allowsDecoration,
    allows_external_food:       payload.allowsFood,
    allows_external_alcohol:    payload.allowsAlcohol,
    allows_smoking:             payload.allowsSmoking,
    allows_pets:                payload.allowsPets,
    allows_live_music:          payload.allowsLiveMusic,
    allows_dj:                  payload.allowsDJ,
    allows_children:            payload.allowsChildren,
    allows_parties:             payload.allowsParties,
    allows_corporate:           payload.allowsCorporate,
    cleaning_included:          payload.includesCleaning,
    cleaning_fee:               num(payload.cleaningFee),
    overtime_allowed:           payload.allowsExtraHours,
    overtime_price:             num(payload.extraHourPrice),
    cancellation_policy:        payload.cancellationPolicy,
    cancellation_hours_before:  cancellationTerms(payload.cancellationPolicy).hours,
    cancellation_refund_pct:    cancellationTerms(payload.cancellationPolicy).refundPct,
    custom_rules:               payload.customRules || null,
  }

  const existingCond = await db.from('space_conditions').select('id').eq('space_id', spaceId).limit(1)
  if (existingCond.data?.length) {
    await db.from('space_conditions').update(condData).eq('space_id', spaceId)
  } else {
    await db.from('space_conditions').insert(condData)
  }

  // Actualizar horarios — borrar los anteriores e insertar los nuevos
  await db.from('space_time_blocks').delete().eq('space_id', spaceId)
  if (payload.timeBlocks.length > 0) {
    await db.from('space_time_blocks').insert(
      payload.timeBlocks.map(b => ({
        space_id:     spaceId,
        block_name:   b.block_name,
        start_time:   b.start_time,
        end_time:     b.end_time,
        days_of_week: b.days,
        is_active:    true,
      }))
    )
  }

  // Actualizar addons — borrar los anteriores e insertar los nuevos
  await db.from('space_addons').delete().eq('space_id', spaceId)
  if (payload.addons.length > 0) {
    await db.from('space_addons').insert(
      payload.addons.map(a => ({
        space_id:     spaceId,
        name:         a.name,
        price:        a.price,
        unit:         a.unit,
        category:     a.category,
        is_available: true,
      }))
    )
  }

  // Actualizar términos de pago — mismas columnas que al crear (saveSpace)
  if (payload.paymentTerm) {
    const ptData = {
      space_id:         spaceId,
      term_type:        payload.paymentTerm,
      platform_fee_pct: await getPlatformFeePct(),
      venue_pct:        VENUE_PCT_BY_TERM[payload.paymentTerm] ?? 90,
      advance_pct:      payload.paymentTerm === 'split_advance' ? 40 : null,
      day_of_event_pct: payload.paymentTerm === 'split_advance' ? 50 : null,
      advance_days_before: 3,
    }
    const existingPt = await db.from('space_payment_terms').select('id').eq('space_id', spaceId).limit(1)
    if (existingPt.data?.length) {
      await db.from('space_payment_terms').update(ptData).eq('space_id', spaceId)
    } else {
      await db.from('space_payment_terms').insert(ptData)
    }
  }

  revalidatePath('/buscar')
  revalidatePath('/espacios', 'layout')
  revalidatePath('/', 'layout')
  return { success: true, spaceId }
}

/** Actualizar solo la política de cancelación de un espacio (sin wizard completo) */
export async function updateCancellationPolicy(
  spaceId: string,
  policy: string,
  refundPct: number,
  hoursBefore: number
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { hostId, db, canManageSpaces } = await resolveHostAccess(supabase, user.id)
  if (!canManageSpaces) return { error: 'No tienes permiso para gestionar espacios' }
  const { data: space } = await db
    .from('spaces').select('host_id').eq('id', spaceId).single()
  if (!space || space.host_id !== hostId) return { error: 'No autorizado' }

  const { error } = await db.from('space_conditions')
    .update({
      cancellation_policy:       policy,
      cancellation_refund_pct:   refundPct,
      cancellation_hours_before: hoursBefore,
    })
    .eq('space_id', spaceId)

  if (error) return { error: error.message }
  revalidatePath('/buscar')
  revalidatePath('/espacios', 'layout')
  return {}
}
