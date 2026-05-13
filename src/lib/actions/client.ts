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
        space_images(url, is_cover),
        space_conditions(cancellation_policy, cancellation_refund_pct, cancellation_hours_before)
      ),
      space_pricing!pricing_id(package_name, package_includes, pricing_type, hourly_price, minimum_consumption, fixed_price),
      booking_addons(
        quantity, unit_price, subtotal,
        space_addons(name)
      )
    `)
    .eq('guest_id', user.id)
    .order('event_date', { ascending: false })

  return data ?? []
}

export async function getClientBookingDetail(bookingId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('bookings')
    .select(`
      *,
      spaces!space_id(
        id, name, slug, category, address, city, sector,
        space_images(url, is_cover),
        profiles!host_id(id, full_name, email, phone, avatar_url)
      ),
      space_pricing!pricing_id(package_name, package_includes, pricing_type, hourly_price, minimum_consumption, fixed_price),
      booking_addons(quantity, unit_price, subtotal, space_addons(name))
    `)
    .eq('id', bookingId)
    .eq('guest_id', user.id)
    .single()

  if (!data) return null

  // Cuotas del plan de pagos
  const { data: installments } = await supabase
    .from('booking_installments')
    .select('*')
    .eq('booking_id', bookingId)
    .order('installment_number')

  return { booking: data, installments: installments ?? [] }
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

  if (error) return { error: error.message }

  // Si cambia nombre o foto, revalidar las páginas de espacio del propietario
  if (updates.full_name !== undefined || updates.avatar_url !== undefined) {
    const { revalidatePath } = await import('next/cache')
    // Revalidar todas las páginas de espacios (propietario o cliente)
    revalidatePath('/espacios', 'layout')
    revalidatePath('/buscar')
  }

  return { success: true }
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
      .select('id, status, payment_status, total_amount, event_date, event_type, guest_count, created_at, confirmed_at, paid_at, spaces!space_id(name,slug,space_images(url,is_cover)), space_pricing!pricing_id(pricing_type,hourly_price,minimum_consumption,fixed_price,package_name)')
      .eq('guest_id', user.id)
      .order('created_at', { ascending: false }),  // más recientes primero
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
    // Solo bookings aceptados que AÚN no tienen pago registrado
    pendingPayment: bk.filter(b => b.status === 'accepted' && !['advance','partial','paid'].includes((b as any).payment_status ?? '')).length,
    // Lista de bookings pendientes de pago (para mostrar cuáles son)
    pendingPaymentBookings: bk.filter(b => b.status === 'accepted' && !['advance','partial','paid'].includes((b as any).payment_status ?? '')).slice(0, 3),
    confirmed:  bk.filter(b => b.status === 'confirmed').length,
    completed:  bk.filter(b => b.status === 'completed').length,
    totalSpent: bk.filter(b => b.status === 'confirmed' || b.status === 'completed')
                  .reduce((s, b) => s + Number(b.total_amount), 0),
    // Próximo evento: el confirmado/aceptado con fecha más cercana al futuro
    nextBooking: [...bk]
      .filter(b => b.event_date >= today && ['confirmed', 'accepted'].includes(b.status))
      .sort((a, b) => a.event_date.localeCompare(b.event_date))[0] ?? null,
    // Actividad reciente: los 5 más recientemente creados (ya vienen ordenados por created_at DESC)
    recent: bk.slice(0, 5),
    // Recién confirmadas en las últimas 48h — usa paid_at o confirmed_at como referencia
    recentlyConfirmed: bk.filter(b => {
      if (b.status !== 'confirmed') return false
      const ref = (b as any).paid_at || (b as any).confirmed_at
      if (!ref) return false
      const refDate = new Date(ref)
      const cutoff  = new Date(Date.now() - 48 * 60 * 60 * 1000)
      return refDate > cutoff
    }).slice(0, 3),
    overdueInstallments: (installments ?? []).filter(i => i.status === 'overdue'),
    // Próxima cuota pendiente (la más cercana, sin límite de 7 días)
    nextInstallment: (installments ?? [])
      .filter(i => i.status === 'pending')
      .sort((a, b) => a.due_date.localeCompare(b.due_date))[0] ?? null,
    upcomingInstallments: (installments ?? []).filter(i => i.status === 'pending' && i.due_date <= soonStr),
    installmentsByBooking: Object.fromEntries(
      bk.map(b => [b.id, { spaceName: (b.spaces as any)?.name ?? '' }])
    ),
  }
}
