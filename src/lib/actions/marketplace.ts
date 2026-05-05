'use server'

import { createClient } from '@/lib/supabase/server'
import { getBaseFromSub } from '@/lib/activities'

export async function getPublishedSpaces(filters?: {
  category?:    string
  capacity?:    number
  sector?:      string
  search?:      string
  activity?:    string   // sub-actividad del cliente → se mapea a base
  baseActivity?: string  // categoría base directa
}) {
  const supabase = await createClient()

  let query = supabase
    .from('spaces')
    .select(`
      id, name, slug, description, category,
      capacity_min, capacity_max, address, city, sector,
      is_verified, primary_activity, secondary_activities,
      space_images(url, is_cover, position),
      space_pricing(pricing_type, hourly_price, minimum_consumption, fixed_price, package_name, is_active),
      space_addons(id, name, price, unit),
      space_conditions(allows_external_decoration, allows_external_food, allows_external_alcohol, music_cutoff_time, cancellation_policy),
      space_payment_terms(term_type, platform_fee_pct)
    `)
    .eq('is_published', true)
    .eq('is_active', true)

  if (filters?.category)    query = query.eq('category', filters.category)
  if (filters?.capacity)    query = query.gte('capacity_max', filters.capacity)
  if (filters?.sector)      query = query.ilike('sector', `%${filters.sector}%`)
  if (filters?.search)      query = query.ilike('name', `%${filters.search}%`)

  // Filtro por sub-actividad (mapea a categoría base)
  if (filters?.activity) {
    const base = getBaseFromSub(filters.activity)
    if (base) {
      // Busca espacios donde primary_activity = base OR secondary_activities contiene base
      query = query.or(`primary_activity.eq.${base},secondary_activities.cs.{${base}}`)
    }
  }

  // Filtro directo por categoría base
  if (filters?.baseActivity) {
    query = query.or(`primary_activity.eq.${filters.baseActivity},secondary_activities.cs.{${filters.baseActivity}}`)
  }

  const { data } = await query.order('created_at', { ascending: false })
  return data ?? []
}

export async function getSpaceBySlug(slug: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('spaces')
    .select(`
      *,
      space_images(url, is_cover, position),
      space_pricing(*),
      space_addons(*),
      space_conditions(*),
      space_payment_terms(*),
      space_time_blocks(*),
      profiles!host_id(id, full_name, avatar_url, id_verified, created_at)
    `)
    .eq('slug', slug)
    .eq('is_published', true)
    .single()
  return data
}
