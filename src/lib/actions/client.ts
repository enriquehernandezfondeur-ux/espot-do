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

  const { data } = await supabase
    .from('payments')
    .select(`
      *,
      bookings!booking_id(
        event_date, event_type, total_amount,
        spaces!space_id(name, city)
      )
    `)
    .in('booking_id',
      (await supabase.from('bookings').select('id').eq('guest_id', user.id)).data?.map(b => b.id) ?? []
    )
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

export async function updateClientProfile(updates: { full_name?: string; phone?: string; whatsapp?: string }) {
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
  const { error } = await supabase.from('favorites').delete().eq('id', favoriteId)
  return error ? { error: error.message } : { success: true }
}

export async function getClientStats() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: bookings } = await supabase
    .from('bookings')
    .select('id, status, total_amount, event_date, event_type, spaces!space_id(name), profiles!guest_id(full_name)')
    .eq('guest_id', user.id)
    .order('event_date', { ascending: true })

  const bk = bookings ?? []
  const today = new Date().toISOString().split('T')[0]

  return {
    total:     bk.length,
    pending:   bk.filter(b => b.status === 'pending').length,
    confirmed: bk.filter(b => b.status === 'confirmed').length,
    completed: bk.filter(b => b.status === 'completed').length,
    totalSpent: bk.filter(b => b.status === 'confirmed' || b.status === 'completed')
                  .reduce((s, b) => s + Number(b.total_amount), 0),
    nextBooking: bk.find(b => b.event_date >= today && ['confirmed', 'pending'].includes(b.status)) ?? null,
    recent: bk.slice(0, 5),
  }
}
