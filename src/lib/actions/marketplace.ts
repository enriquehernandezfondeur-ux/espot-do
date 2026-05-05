'use server'

import { createClient } from '@/lib/supabase/server'
import { getBaseFromSub } from '@/lib/activities'

// ── Helpers internos ──────────────────────────────────────

function getActivePricing(pricings: any[] | undefined) {
  return pricings?.find((p: any) => p.is_active) ?? pricings?.[0] ?? null
}

/** Precio estimado comparable: normaliza todos los modelos a "costo total de un evento promedio" */
function normalizedPrice(p: any | null): number | null {
  if (!p) return null
  if (p.pricing_type === 'hourly')              return (p.hourly_price ?? 0) * (p.min_hours ?? 4)
  if (p.pricing_type === 'minimum_consumption') return p.minimum_consumption ?? null
  if (p.pricing_type === 'fixed_package')       return p.fixed_price ?? null
  return null
}

/** 0-100: cuánto se parece un candidato al espacio actual */
function scoreSimilarity(current: any, candidate: any): number {
  let score = 0

  const cp = getActivePricing(current.space_pricing)
  const xp = getActivePricing(candidate.space_pricing)

  // ── Actividad (30 pts máx) ────────────────────────────
  if (current.primary_activity) {
    if (candidate.primary_activity === current.primary_activity) {
      score += 30
    } else if (candidate.secondary_activities?.includes(current.primary_activity)) {
      score += 15
    } else if (current.secondary_activities?.some((a: string) =>
      candidate.primary_activity === a ||
      candidate.secondary_activities?.includes(a)
    )) {
      score += 8
    }
  }

  // ── Ubicación (25 pts máx) ────────────────────────────
  const sameSector = current.sector && candidate.sector &&
    candidate.sector.toLowerCase() === current.sector.toLowerCase()
  const sameCity = current.city && candidate.city &&
    candidate.city.toLowerCase() === current.city.toLowerCase()

  if (sameSector)       score += 25
  else if (sameCity)    score += 10

  // ── Capacidad proporcional (20 pts máx) ───────────────
  if (current.capacity_max > 0) {
    const ratio = candidate.capacity_max / current.capacity_max
    if (ratio >= 0.7 && ratio <= 1.3)      score += 20
    else if (ratio >= 0.5 && ratio <= 1.6) score += 10
    else if (ratio >= 0.3 && ratio <= 2.0) score += 5
  }

  // ── Tipo de precio (10 pts) ───────────────────────────
  if (cp && xp && xp.pricing_type === cp.pricing_type) score += 10

  // ── Precio normalizado proporcional (10 pts) ──────────
  if (cp && xp) {
    const cn = normalizedPrice(cp)
    const xn = normalizedPrice(xp)
    if (cn && xn) {
      const ratio = xn / cn
      if (ratio >= 0.6 && ratio <= 1.4)      score += 10
      else if (ratio >= 0.4 && ratio <= 2.0) score += 5
    }
  }

  return score
}

/** Construye el objeto de display de precio para las cards de similares */
function buildPricingDisplay(p: any | null, capacityMax: number, currentPricingType?: string) {
  if (!p) return { main: 'Ver precio', sub: null, badge: null, isAltModel: false }

  const isAltModel = !!currentPricingType && p.pricing_type !== currentPricingType

  if (p.pricing_type === 'hourly') return {
    main:       `${fmtDOP(p.hourly_price)} / hora`,
    sub:        p.min_hours ? `Mín. ${p.min_hours} hora${p.min_hours > 1 ? 's' : ''}` : null,
    badge:      'Por hora',
    isAltModel,
  }

  if (p.pricing_type === 'minimum_consumption') {
    const perPerson = capacityMax > 0
      ? Math.round(p.minimum_consumption / capacityMax)
      : null
    return {
      main:  `Consumo mín. ${fmtDOP(p.minimum_consumption)}`,
      sub:   perPerson ? `Aprox. ${fmtDOP(perPerson)} por persona` : null,
      badge: isAltModel ? 'Alt. consumo mínimo' : 'Consumo mínimo',
      isAltModel,
    }
  }

  if (p.pricing_type === 'fixed_package') return {
    main:  `Paquete ${fmtDOP(p.fixed_price)}`,
    sub:   p.package_hours
      ? `${p.package_hours} horas incluidas`
      : (p.package_name ?? null),
    badge: 'Paquete',
    isAltModel,
  }

  return { main: 'Cotización', sub: null, badge: 'Cotización', isAltModel: false }
}

function fmtDOP(n: number | null): string {
  if (!n) return 'RD$0'
  return new Intl.NumberFormat('es-DO', { style: 'currency', currency: 'DOP', maximumFractionDigits: 0 })
    .format(n)
    .replace('DOP', 'RD$')
    .trim()
}

export async function getPublishedSpaces(filters?: {
  category?:    string
  capacity?:    number
  sector?:      string
  search?:      string
  activity?:    string
  baseActivity?: string
  dateFrom?:    string   // YYYY-MM-DD — filtrar por disponibilidad
  dateTo?:      string
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

  const { data: spaces } = await query.order('created_at', { ascending: false })
  if (!spaces) return []

  // Filtrar por disponibilidad de fecha si se especificó
  if (filters?.dateFrom) {
    const { data: blocked } = await supabase
      .from('bookings')
      .select('space_id, event_date, status')
      .gte('event_date', filters.dateFrom)
      .lte('event_date', filters.dateTo ?? filters.dateFrom)
      .not('status', 'in', '("cancelled_guest","cancelled_host","rejected")')

    const { data: availability } = await supabase
      .from('space_availability')
      .select('space_id, blocked_date')
      .gte('blocked_date', filters.dateFrom)
      .lte('blocked_date', filters.dateTo ?? filters.dateFrom)

    // Marcar espacios con disponibilidad
    return spaces.map(space => {
      const hasBooking = blocked?.some(b => b.space_id === space.id)
      const isBlocked  = availability?.some(a => a.space_id === space.id)
      return { ...space, _available: !hasBooking && !isBlocked, _dateFiltered: true }
    })
  }

  return spaces
}

// ── ESPACIOS SIMILARES CON SCORING ───────────────────────
export async function getSimilarSpaces(
  current: {
    id:                   string
    category?:            string
    capacity_max:         number
    capacity_min?:        number
    city?:                string
    sector?:              string
    primary_activity?:    string
    secondary_activities?: string[]
    space_pricing?:       any[]
  },
  opts?: { limit?: number }
): Promise<any[]> {
  const supabase  = await createClient()
  const limit     = opts?.limit ?? 4
  const capMin    = Math.floor((current.capacity_min ?? current.capacity_max * 0.3) * 0.4)
  const capMax    = Math.ceil(current.capacity_max * 2.5)
  const currentPricingType = getActivePricing(current.space_pricing)?.pricing_type

  // Query acotada: misma ciudad, rango amplio de capacidad, máx 30 candidatos
  let query = supabase
    .from('spaces')
    .select(`
      id, name, slug, category,
      capacity_min, capacity_max, city, sector,
      is_verified, primary_activity, secondary_activities,
      space_images(url, is_cover, position),
      space_pricing(
        pricing_type, hourly_price, min_hours,
        minimum_consumption, session_hours,
        fixed_price, package_name, package_hours,
        is_active
      )
    `)
    .eq('is_published', true)
    .eq('is_active', true)
    .neq('id', current.id)
    .gte('capacity_max', capMin)
    .lte('capacity_max', capMax)
    .limit(30)

  // Priorizar misma ciudad si la tiene
  if (current.city) query = query.eq('city', current.city)

  const { data: candidates } = await query.order('created_at', { ascending: false })
  if (!candidates?.length) return []

  // Puntuar y ordenar
  const scored = candidates
    .map(c => {
      const s    = scoreSimilarity(current, c)
      const p    = getActivePricing(c.space_pricing)
      return {
        ...c,
        _score:          s,
        _isExact:        s >= 60,
        _pricingDisplay: buildPricingDisplay(p, c.capacity_max, currentPricingType),
      }
    })
    .sort((a, b) => b._score - a._score)
    .slice(0, limit)

  return scored
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
