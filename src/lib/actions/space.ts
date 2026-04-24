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
  capacityMin: string
  capacityMax: string
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
  packageIncludes: string[]
  // Step 3
  timeBlocks: { block_name: string; start_time: string; end_time: string; days: number[] }[]
  // Step 4
  addons: { name: string; price: number; unit: string; category: string }[]
  // Step 5
  musicCutoff: string
  allowsDecoration: boolean
  allowsFood: boolean
  allowsAlcohol: boolean
  depositRequired: boolean
  depositAmount: string
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
    session_hours: int(p.sessionHours),
  }
  if (p.pricingType === 'fixed_package') return {
    ...base,
    fixed_price: num(p.fixedPrice),
    package_name: p.packageName,
    package_hours: int(p.packageHours),
    package_includes: p.packageIncludes,
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
      is_published: false,
      is_active: true,
    })
    .select('id')
    .single()

  if (spaceError) return { error: spaceError.message }

  const spaceId = space.id

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
      deposit_required: payload.depositRequired,
      deposit_amount: num(payload.depositAmount),
      music_cutoff_time: payload.musicCutoff || null,
      allows_external_decoration: payload.allowsDecoration,
      allows_external_food: payload.allowsFood,
      allows_external_alcohol: payload.allowsAlcohol,
      allows_smoking: false,
      allows_pets: false,
      cancellation_policy: payload.cancellationPolicy,
      cancellation_hours_before: DEFAULT_CANCELLATION_HOURS,
      cancellation_refund_pct: DEFAULT_CANCELLATION_REFUND_PCT,
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
    .select('*, space_pricing(*), space_addons(*), space_conditions(*), space_payment_terms(*), space_time_blocks(*)')
    .eq('host_id', user.id)
    .order('created_at', { ascending: false })

  return data ?? []
}
