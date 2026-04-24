'use server'

import { createClient } from '@/lib/supabase/server'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (data?.role !== 'admin') return null
  return supabase
}

// ── OBTENER ESPACIO COMPLETO ─────────────────────────────
export async function getAdminSpaceById(id: string) {
  const supabase = await requireAdmin()
  if (!supabase) return null

  const { data } = await supabase
    .from('spaces')
    .select(`
      *,
      profiles!host_id(full_name, email),
      space_pricing(*),
      space_addons(*),
      space_conditions(*),
      space_payment_terms(*),
      space_time_blocks(*),
      space_images(*)
    `)
    .eq('id', id)
    .single()

  return data
}

// ── EDICIÓN COMPLETA DEL ESPACIO ─────────────────────────
export async function adminUpdateSpace(spaceId: string, payload: {
  name?: string; description?: string; category?: string
  capacity_min?: number | null; capacity_max?: number
  address?: string; sector?: string; city?: string
}) {
  const supabase = await requireAdmin()
  if (!supabase) return { error: 'No autorizado' }
  const { error } = await supabase.from('spaces').update(payload).eq('id', spaceId)
  return error ? { error: error.message } : { success: true }
}

export async function adminUpdatePricing(pricingId: string, payload: Record<string, unknown>) {
  const supabase = await requireAdmin()
  if (!supabase) return { error: 'No autorizado' }
  const { error } = await supabase.from('space_pricing').update(payload).eq('id', pricingId)
  return error ? { error: error.message } : { success: true }
}

export async function adminUpdateConditions(conditionsId: string, payload: Record<string, unknown>) {
  const supabase = await requireAdmin()
  if (!supabase) return { error: 'No autorizado' }
  const { error } = await supabase.from('space_conditions').update(payload).eq('id', conditionsId)
  return error ? { error: error.message } : { success: true }
}

export async function adminUpdatePaymentTerms(termId: string, payload: Record<string, unknown>) {
  const supabase = await requireAdmin()
  if (!supabase) return { error: 'No autorizado' }
  const { error } = await supabase.from('space_payment_terms').update(payload).eq('id', termId)
  return error ? { error: error.message } : { success: true }
}

export async function adminUpsertAddon(spaceId: string, addon: { id?: string; name: string; price: number; unit: string; category: string }) {
  const supabase = await requireAdmin()
  if (!supabase) return { error: 'No autorizado' }
  if (addon.id) {
    const { error } = await supabase.from('space_addons').update(addon).eq('id', addon.id)
    return error ? { error: error.message } : { success: true }
  }
  const { error } = await supabase.from('space_addons').insert({ ...addon, space_id: spaceId, is_available: true })
  return error ? { error: error.message } : { success: true }
}

export async function adminDeleteAddon(addonId: string) {
  const supabase = await requireAdmin()
  if (!supabase) return { error: 'No autorizado' }
  const { error } = await supabase.from('space_addons').delete().eq('id', addonId)
  return error ? { error: error.message } : { success: true }
}

// ── MÉTRICAS DEL DASHBOARD ──────────────────────────────
export async function getAdminStats() {
  const supabase = await requireAdmin()
  if (!supabase) return null

  const [spaces, bookings, profiles, payments, pendingSpaces, pendingBookings] = await Promise.all([
    supabase.from('spaces').select('id', { count: 'exact', head: true }),
    supabase.from('bookings').select('id', { count: 'exact', head: true }),
    supabase.from('profiles').select('id', { count: 'exact', head: true }),
    supabase.from('bookings').select('platform_fee').not('payment_status', 'eq', 'unpaid'),
    supabase.from('spaces').select('id', { count: 'exact', head: true }).eq('is_published', false).eq('is_active', true),
    supabase.from('bookings').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
  ])

  const hosts = await supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'host')
  const admins = await supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'admin')

  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
  const monthRevenue = await supabase.from('bookings')
    .select('platform_fee')
    .not('payment_status', 'eq', 'unpaid')
    .gte('created_at', monthStart)

  const totalRevenue = (payments.data ?? []).reduce((s, b) => s + Number(b.platform_fee), 0)
  const monthlyRevenue = (monthRevenue.data ?? []).reduce((s, b) => s + Number(b.platform_fee), 0)

  return {
    totalSpaces:      spaces.count ?? 0,
    pendingSpaces:    pendingSpaces.count ?? 0,
    totalBookings:    bookings.count ?? 0,
    pendingBookings:  pendingBookings.count ?? 0,
    totalUsers:       profiles.count ?? 0,
    totalHosts:       hosts.count ?? 0,
    totalAdmins:      admins.count ?? 0,
    totalRevenue,
    monthlyRevenue,
  }
}

// ── ESPACIOS ─────────────────────────────────────────────
export async function getAdminSpaces(filter?: { status?: string; search?: string }) {
  const supabase = await requireAdmin()
  if (!supabase) return []

  let q = supabase.from('spaces').select(`
    *,
    profiles!host_id(full_name, email),
    space_pricing(pricing_type, hourly_price, minimum_consumption, fixed_price, is_active),
    space_images(url, is_cover),
    bookings(id)
  `).order('created_at', { ascending: false })

  if (filter?.status === 'pending')     q = q.eq('is_published', false).eq('is_active', true)
  if (filter?.status === 'published')   q = q.eq('is_published', true)
  if (filter?.status === 'inactive')    q = q.eq('is_active', false)
  if (filter?.search) q = q.ilike('name', `%${filter.search}%`)

  const { data } = await q
  return data ?? []
}

export async function updateSpaceStatus(spaceId: string, updates: {
  is_published?: boolean
  is_active?: boolean
  is_verified?: boolean
  is_featured?: boolean
}) {
  const supabase = await requireAdmin()
  if (!supabase) return { error: 'No autorizado' }
  const { error } = await supabase.from('spaces').update(updates).eq('id', spaceId)
  return error ? { error: error.message } : { success: true }
}

export async function deleteSpace(spaceId: string) {
  const supabase = await requireAdmin()
  if (!supabase) return { error: 'No autorizado' }
  const { error } = await supabase.from('spaces').update({ is_active: false }).eq('id', spaceId)
  return error ? { error: error.message } : { success: true }
}

// ── RESERVAS ──────────────────────────────────────────────
export async function getAdminBookings(filter?: { status?: string; search?: string }) {
  const supabase = await requireAdmin()
  if (!supabase) return []

  let q = supabase.from('bookings').select(`
    *,
    spaces!space_id(name, category, city, profiles!host_id(full_name, email)),
    profiles!guest_id(full_name, email, phone),
    booking_addons(quantity, subtotal, space_addons(name))
  `).order('created_at', { ascending: false })

  if (filter?.status && filter.status !== 'all') q = q.eq('status', filter.status)

  const { data } = await q
  return data ?? []
}

export async function updateBookingStatus(bookingId: string, status: string) {
  const supabase = await requireAdmin()
  if (!supabase) return { error: 'No autorizado' }
  const { error } = await supabase.from('bookings').update({ status }).eq('id', bookingId)
  return error ? { error: error.message } : { success: true }
}

// ── USUARIOS ──────────────────────────────────────────────
export async function getAdminUsers(filter?: { role?: string; search?: string }) {
  const supabase = await requireAdmin()
  if (!supabase) return []

  let q = supabase.from('profiles').select('*').order('created_at', { ascending: false })

  if (filter?.role && filter.role !== 'all') q = q.eq('role', filter.role)
  if (filter?.search) q = q.ilike('full_name', `%${filter.search}%`)

  const { data } = await q
  return data ?? []
}

export async function updateUserRole(userId: string, role: string) {
  const supabase = await requireAdmin()
  if (!supabase) return { error: 'No autorizado' }
  const { error } = await supabase.from('profiles').update({ role }).eq('id', userId)
  return error ? { error: error.message } : { success: true }
}

// ── PAGOS ─────────────────────────────────────────────────
export async function getAdminPayments() {
  const supabase = await requireAdmin()
  if (!supabase) return []

  const { data } = await supabase.from('bookings')
    .select(`
      id, total_amount, platform_fee, payment_status, status,
      event_date, event_type, created_at,
      spaces!space_id(name, city),
      profiles!guest_id(full_name, email)
    `)
    .order('created_at', { ascending: false })

  return data ?? []
}

// ── REPORTES ──────────────────────────────────────────────
export async function getAdminReports() {
  const supabase = await requireAdmin()
  if (!supabase) return null

  const [topSpaces, byCategory, monthlyData] = await Promise.all([
    supabase.from('bookings')
      .select('space_id, spaces!space_id(name, category), total_amount')
      .not('status', 'in', '("cancelled_guest","cancelled_host")'),
    supabase.from('spaces')
      .select('category')
      .eq('is_published', true),
    supabase.from('bookings')
      .select('created_at, platform_fee, status')
      .not('status', 'in', '("cancelled_guest","cancelled_host")')
      .order('created_at'),
  ])

  // Agrupar por espacio
  const spaceMap: Record<string, { name: string; category: string; count: number; revenue: number }> = {}
  for (const b of topSpaces.data ?? []) {
    const space = (b as any).spaces
    if (!space) continue
    if (!spaceMap[b.space_id]) spaceMap[b.space_id] = { name: space.name, category: space.category, count: 0, revenue: 0 }
    spaceMap[b.space_id].count++
    spaceMap[b.space_id].revenue += Number(b.total_amount)
  }
  const topSpacesList = Object.values(spaceMap).sort((a, b) => b.count - a.count).slice(0, 5)

  // Por categoría
  const catMap: Record<string, number> = {}
  for (const s of byCategory.data ?? []) {
    catMap[s.category] = (catMap[s.category] ?? 0) + 1
  }

  // Ingresos por mes (últimos 6)
  const now = new Date()
  const monthly = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1)
    const start = d.toISOString().split('T')[0]
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0]
    const mes = d.toLocaleDateString('es-DO', { month: 'short' })
    const items = (monthlyData.data ?? []).filter(b => b.created_at >= start && b.created_at <= end)
    return {
      mes: mes.charAt(0).toUpperCase() + mes.slice(1),
      ingresos: items.reduce((s, b) => s + Number(b.platform_fee), 0),
      reservas: items.length,
    }
  })

  return { topSpaces: topSpacesList, byCategory: catMap, monthly }
}

// ── CONFIG ────────────────────────────────────────────────
export async function getMarketplaceConfig() {
  const supabase = await requireAdmin()
  if (!supabase) return []
  const { data } = await supabase.from('marketplace_config').select('*').order('group_name')
  return data ?? []
}

export async function updateConfig(key: string, value: string) {
  const supabase = await requireAdmin()
  if (!supabase) return { error: 'No autorizado' }
  const { error } = await supabase.from('marketplace_config').upsert({ key, value })
  return error ? { error: error.message } : { success: true }
}
