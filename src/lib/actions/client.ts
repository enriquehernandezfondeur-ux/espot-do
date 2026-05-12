'use server'

import { createClient } from '@/lib/supabase/server'

export async function getClientBookings() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('bookings')
    .select(`
      *,
      spaces!space_id(
        id, name, slug, category, address, city, sector,
        space_images(url, is_cover)
      ),
      space_pricing!pricing_id(package_name, package_includes, pricing_type),
      booking_addons(
        quantity, unit_price, subtotal,
        space_addons(name)
      )
    `)
    .eq('guest_id', user.id)
    .order('event_date', { ascending: false })

  return data ?? []
}

export async function getClientFavorites() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('favorites')
    .select(`
      id,
      spaces!space_id(
        id, name, slug, category, city, sector, capacity_max,
        space_images(url, is_cover),
        space_pricing(pricing_type, hourly_price, minimum_consumption, fixed_price, is_active)
      )
    `)
    .eq('guest_id', user.id)
    .order('created_at', { ascending: false })

  return data ?? []
}

export async function getClientPayments() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  // Fetch booking IDs for this user first, then join payments safely
  const { data: userBookings } = await supabase
    .from('bookings').select('id').eq('guest_id', user.id)
  const bookingIds = userBookings?.map(b => b.id) ?? []

  if (bookingIds.length === 0) return []

  const { data } = await supabase
    .from('payments')
    .select(`
      *,
      bookings!booking_id(
        event_date, event_type, total_amount,
        spaces!space_id(name, city)
      )
    `)
    .in('booking_id', bookingIds)
    .order('created_at', { ascending: false })

  return data ?? []
}

export async function getClientProfile() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return data
}

export async function updateClientProfile(updates: { full_name?: string; phone?: string; whatsapp?: string; avatar_url?: string }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { error } = await supabase
    .from('profiles')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', user.id)

  return error ? { error: error.message } : { success: true }
}

export async function removeFavorite(favoriteId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }
  const { error } = await supabase.from('favorites').delete().eq('id', favoriteId).eq('guest_id', user.id)
  return error ? { error: error.message } : { success: true }
}

export async function getClientStats() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const [{ data: bookings }, { data: profile }] = await Promise.all([
    supabase
      .from('bookings')
      .select('id, status, total_amount, event_date, event_type, spaces!space_id(name,slug)')
      .eq('guest_id', user.id)
      .order('event_date', { ascending: true }),
    supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single(),
  ])

  const bk = bookings ?? []
  const today = new Date().toISOString().split('T')[0]

  const activeBookingIds = bk
    .filter(b => ['accepted', 'confirmed'].includes(b.status))
    .map(b => b.id)

  const { data: installments } = activeBookingIds.length > 0
    ? await supabase
        .from('booking_installments')
        .select('id, amount, due_date, status, installment_number, booking_id')
        .in('booking_id', activeBookingIds)
        .in('status', ['pending', 'overdue'])
        .order('due_date', { ascending: true })
    : { data: [] }

  const soon = new Date()
  soon.setDate(soon.getDate() + 7)
  const soonStr = soon.toISOString().split('T')[0]

  return {
    userName:   profile?.full_name?.split(' ')[0] ?? null,
    total:      bk.length,
    pendingPayment: bk.filter(b => b.status === 'accepted').length,
    confirmed:  bk.filter(b => b.status === 'confirmed').length,
    completed:  bk.filter(b => b.status === 'completed').length,
    totalSpent: bk.filter(b => b.status === 'confirmed' || b.status === 'completed')
                  .reduce((s, b) => s + Number(b.total_amount), 0),
    nextBooking: bk.find(b => b.event_date >= today && ['confirmed', 'accepted'].includes(b.status)) ?? null,
    recent: bk.slice(0, 5),
    overdueInstallments: (installments ?? []).filter(i => i.status === 'overdue'),
    upcomingInstallments: (installments ?? []).filter(i => i.status === 'pending' && i.due_date <= soonStr),
    installmentsByBooking: Object.fromEntries(
      bk.map(b => [b.id, { spaceName: (b.spaces as any)?.name ?? '' }])
    ),
  }
}
