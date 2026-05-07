'use server'

import { createClient } from '@/lib/supabase/server'
import { generateSlug, num, int } from '@/lib/utils'
import type { PricingType, PaymentTermType } from '@/types'

const PLATFORM_FEE_PCT = 10
const DEFAULT_CANCELLATION_HOURS = 72
const DEFAULT_CANCELLATION_REFUND_PCT = 50

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
  capacityMin: string
  capacityMax: string
  primaryActivity?: string
  secondaryActivities?: string[]
  // Step 2
  pricingType: PricingType
  hourlyPrice: string
  minHours: string
  maxHours: string
  minConsumption: string
  sessionHours: string
  fixedPrice: string
  packageName: string
  packageHours: string
  pkgExtraHourPrice: string
  packageIncludes: string[]
  // Step 3
  timeBlocks: { block_name: string; start_time: string; end_time: string; days: number[] }[]
  // Step 4
  addons: { name: string; price: number; unit: string; category: string }[]
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
  // Step 5 — Ruido
  musicCutoff: string
  noiseLevel: string
  // Step 5 — Depósito
  depositRequired: boolean
  depositAmount: string
  depositRefundable: boolean
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
  const base = { space_id: spaceId, pricing_type: p.pricingType, is_active: true }
  if (p.pricingType === 'hourly') return {
    ...base,
    hourly_price: num(p.hourlyPrice),
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
    extra_hour_price:  num(p.pkgExtraHourPrice),
    package_includes:  p.packageIncludes,
  }
  return base
}

export async function saveSpace(payload: SaveSpacePayload) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { data: space, error: spaceError } = await supabase
    .from('spaces')
    .insert({
      host_id: user.id,
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
      is_published: false,
      is_active: true,
    })
    .select('id')
    .single()

  if (spaceError) return { error: spaceError.message }

  const spaceId = space.id

  // Guardar video_url por separado — no falla si la columna aún no existe
  if (payload.videoUrl !== undefined) {
    await supabase.from('spaces').update({ video_url: payload.videoUrl || null }).eq('id', spaceId)
  }

  const inserts = [
    supabase.from('space_pricing').insert(buildPricingData(spaceId, payload)),
    payload.timeBlocks.length > 0
      ? supabase.from('space_time_blocks').insert(
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
      ? supabase.from('space_addons').insert(
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
    supabase.from('space_conditions').insert({
      space_id: spaceId,
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
      // Ruido
      music_cutoff_time: payload.musicCutoff || null,
      noise_level:       payload.noiseLevel || 'moderado',
      // Depósito
      deposit_required:    payload.depositRequired,
      deposit_amount:      num(payload.depositAmount),
      deposit_refundable:  payload.depositRefundable ?? true,
      // Limpieza
      cleaning_included: payload.includesCleaning,
      cleaning_fee:      num(payload.cleaningFee),
      // Horas extra
      overtime_allowed: payload.allowsExtraHours,
      overtime_price:   num(payload.extraHourPrice),
      // Cancelación
      cancellation_policy:         payload.cancellationPolicy,
      cancellation_hours_before:   DEFAULT_CANCELLATION_HOURS,
      cancellation_refund_pct:     DEFAULT_CANCELLATION_REFUND_PCT,
      custom_rules: payload.customRules || null,
    }),
    payload.paymentTerm
      ? supabase.from('space_payment_terms').insert({
          space_id: spaceId,
          term_type: payload.paymentTerm,
          platform_fee_pct: PLATFORM_FEE_PCT,
          venue_pct: VENUE_PCT_BY_TERM[payload.paymentTerm] ?? 90,
          advance_pct: payload.paymentTerm === 'split_advance' ? 40 : null,
          day_of_event_pct: payload.paymentTerm === 'split_advance' ? 50 : null,
          advance_days_before: 3,
        })
      : null,
  ].filter(Boolean)

  const results = await Promise.all(inserts)
  const failed = results.find(r => r && 'error' in r && r.error)

  if (failed && 'error' in failed && failed.error) {
    await supabase.from('spaces').delete().eq('id', spaceId)
    return { error: failed.error.message }
  }

  return { success: true, spaceId }
}

export async function publishSpace(spaceId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { data: space } = await supabase.from('spaces').select('host_id').eq('id', spaceId).single()
  if (!space || space.host_id !== user.id) return { error: 'No autorizado' }

  const { error } = await supabase
    .from('spaces')
    .update({ is_published: true })
    .eq('id', spaceId)
  return error ? { error: error.message } : { success: true }
}

export async function getMySpaces() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('spaces')
    .select('*, space_pricing(*), space_addons(*), space_conditions(*), space_payment_terms(*), space_time_blocks(*), space_images(*)')
    .eq('host_id', user.id)
    .order('created_at', { ascending: false })

  return data ?? []
}

// Guardar URLs de fotos ya subidas a Storage en la tabla space_images
export async function saveSpaceImages(
  spaceId: string,
  photos: { url: string; path: string; isCover: boolean }[]
) {
  const supabase = await createClient()

  // Eliminar fotos anteriores
  await supabase.from('space_images').delete().eq('space_id', spaceId)

  if (photos.length === 0) return { success: true }

  const { error } = await supabase.from('space_images').insert(
    photos.map((p, i) => ({
      space_id: spaceId,
      url: p.url,
      is_cover: p.isCover,
      position: i,
    }))
  )

  return error ? { error: error.message } : { success: true }
}

// Obtener un espacio completo para editar
export async function getSpaceForEdit(spaceId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('spaces')
    .select(`
      *,
      space_pricing(*),
      space_addons(*),
      space_conditions(*),
      space_payment_terms(*),
      space_time_blocks(*),
      space_images(*)
    `)
    .eq('id', spaceId)
    .eq('host_id', user.id)
    .single()

  return data
}

// Actualizar espacio existente
export async function updateSpace(spaceId: string, payload: Omit<SaveSpacePayload, never>) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  // Verificar que el espacio pertenece al usuario
  const { data: space } = await supabase.from('spaces').select('host_id').eq('id', spaceId).single()
  if (!space || space.host_id !== user.id) return { error: 'No autorizado' }

  // Actualizar info básica
  const { error: spaceError } = await supabase.from('spaces').update({
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
  }).eq('id', spaceId)

  if (spaceError) return { error: spaceError.message }

  // Guardar video_url por separado — no falla si la columna aún no existe
  if (payload.videoUrl !== undefined) {
    await supabase.from('spaces').update({ video_url: payload.videoUrl || null }).eq('id', spaceId)
  }

  // Actualizar pricing
  const pricingData: Record<string, unknown> = {
    pricing_type: payload.pricingType,
    is_active: true,
  }
  if (payload.pricingType === 'hourly') {
    pricingData.hourly_price = parseFloat(payload.hourlyPrice)
    pricingData.min_hours = parseInt(payload.minHours) || 1
    if (payload.maxHours) pricingData.max_hours = parseInt(payload.maxHours)
  }
  if (payload.pricingType === 'minimum_consumption') {
    pricingData.minimum_consumption = parseFloat(payload.minConsumption)
    pricingData.session_hours = payload.sessionHours ? parseInt(payload.sessionHours) : null
    pricingData.min_hours     = payload.minHours     ? parseInt(payload.minHours)     : null
    pricingData.max_hours     = payload.maxHours     ? parseInt(payload.maxHours)     : null
  }
  if (payload.pricingType === 'fixed_package') {
    pricingData.fixed_price      = parseFloat(payload.fixedPrice)
    pricingData.package_name     = payload.packageName
    pricingData.package_includes = payload.packageIncludes
    if (payload.packageHours)      pricingData.package_hours    = parseInt(payload.packageHours)
    if (payload.pkgExtraHourPrice) pricingData.extra_hour_price = parseFloat(payload.pkgExtraHourPrice)
  }

  const existingPricing = await supabase.from('space_pricing').select('id').eq('space_id', spaceId).limit(1)
  if (existingPricing.data?.length) {
    await supabase.from('space_pricing').update(pricingData).eq('space_id', spaceId)
  } else {
    await supabase.from('space_pricing').insert({ ...pricingData, space_id: spaceId })
  }

  // Actualizar condiciones
  const condData = {
    space_id: spaceId,
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
    music_cutoff_time:          payload.musicCutoff || null,
    noise_level:                payload.noiseLevel || 'moderado',
    deposit_required:           payload.depositRequired,
    deposit_amount:             num(payload.depositAmount),
    deposit_refundable:         payload.depositRefundable ?? true,
    cleaning_included:          payload.includesCleaning,
    cleaning_fee:               num(payload.cleaningFee),
    overtime_allowed:           payload.allowsExtraHours,
    overtime_price:             num(payload.extraHourPrice),
    cancellation_policy:        payload.cancellationPolicy,
    cancellation_hours_before:  DEFAULT_CANCELLATION_HOURS,
    cancellation_refund_pct:    DEFAULT_CANCELLATION_REFUND_PCT,
    custom_rules:               payload.customRules || null,
  }

  const existingCond = await supabase.from('space_conditions').select('id').eq('space_id', spaceId).limit(1)
  if (existingCond.data?.length) {
    await supabase.from('space_conditions').update(condData).eq('space_id', spaceId)
  } else {
    await supabase.from('space_conditions').insert(condData)
  }

  return { success: true, spaceId }
}
