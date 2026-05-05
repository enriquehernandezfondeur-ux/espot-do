'use server'

import { createClient } from '@/lib/supabase/server'
import { acceptBooking, rejectBooking, confirmPayment, cancelBooking } from './booking'

export { acceptBooking, rejectBooking, confirmPayment as confirmBooking, cancelBooking }

// ── Todas las reservas del host ───────────────────────────
export async function getHostBookings(statusFilter?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data: spaces } = await supabase
    .from('spaces').select('id').eq('host_id', user.id)
  if (!spaces?.length) return []

  let q = supabase
    .from('bookings')
    .select(`
      *,
      profiles!guest_id(full_name, email, phone),
      spaces!space_id(name, category),
      booking_addons(addon_id, quantity, unit_price, subtotal, space_addons(name))
    `)
    .in('space_id', spaces.map(s => s.id))
    .order('event_date', { ascending: true })

  if (statusFilter && statusFilter !== 'all') {
    q = q.eq('status', statusFilter)
  }

  const { data } = await q
  return data ?? []
}

// ── Stats para el overview ────────────────────────────────
export async function getHostStats() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: spaces } = await supabase
    .from('spaces').select('id').eq('host_id', user.id)
  if (!spaces?.length) return {
    revenueThisMonth: 0, revenuePrevMonth: 0,
    pendingCount: 0, confirmedCount: 0, acceptedCount: 0,
    pendingQuotes: 0, nextBooking: null, monthlyRevenue: [],
  }

  const spaceIds = spaces.map(s => s.id)
  const now = new Date()
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0]
  const prevMonthEnd   = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0]

  const [allBookings, quotes] = await Promise.all([
    supabase.from('bookings')
      .select('id, status, payment_status, total_amount, event_date, start_time, end_time, guest_count, event_type, profiles!guest_id(full_name)')
      .in('space_id', spaceIds)
      .order('event_date', { ascending: true }),
    supabase.from('bookings')
      .select('id').in('space_id', spaceIds).eq('status', 'quote_requested'),
  ])

  const bookings = allBookings.data ?? []

  const revenueThisMonth = bookings
    .filter(b => b.event_date >= thisMonthStart && b.status === 'confirmed')
    .reduce((s, b) => s + Number(b.total_amount), 0)

  const revenuePrevMonth = bookings
    .filter(b => b.event_date >= prevMonthStart && b.event_date <= prevMonthEnd && b.status === 'confirmed')
    .reduce((s, b) => s + Number(b.total_amount), 0)

  const today = now.toISOString().split('T')[0]
  const nextBooking = bookings.find(b =>
    b.event_date >= today && ['confirmed', 'accepted', 'pending'].includes(b.status)
  ) ?? null

  const monthly = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1)
    const start = d.toISOString().split('T')[0]
    const end   = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0]
    const mes   = d.toLocaleDateString('es-DO', { month: 'short' })
    const ingresos = bookings
      .filter(b => b.event_date >= start && b.event_date <= end && b.status === 'confirmed')
      .reduce((s, b) => s + Number(b.total_amount), 0)
    return { mes: mes.charAt(0).toUpperCase() + mes.slice(1), ingresos }
  })

  return {
    revenueThisMonth,
    revenuePrevMonth,
    pendingCount:  bookings.filter(b => b.status === 'pending').length,
    acceptedCount: bookings.filter(b => b.status === 'accepted').length,
    confirmedCount: bookings.filter(b =>
      b.event_date >= thisMonthStart && b.status === 'confirmed'
    ).length,
    pendingQuotes: quotes.data?.length ?? 0,
    nextBooking,
    monthlyRevenue: monthly,
  }
}

// ── Reservas del calendario ───────────────────────────────
export async function getHostCalendarBookings() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data: spaces } = await supabase
    .from('spaces').select('id').eq('host_id', user.id)
  if (!spaces?.length) return []

  const { data } = await supabase
    .from('bookings')
    .select('id, event_date, start_time, end_time, status, total_amount, event_type, profiles!guest_id(full_name)')
    .in('space_id', spaces.map(s => s.id))
    .not('status', 'in', '("cancelled_guest","cancelled_host","rejected")')
    .order('event_date')

  return data ?? []
}

// ── Cotizaciones pendientes ───────────────────────────────
export async function getHostQuotes() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data: spaces } = await supabase
    .from('spaces').select('id, name').eq('host_id', user.id)
  if (!spaces?.length) return []

  const { data } = await supabase
    .from('bookings')
    .select(`
      *,
      profiles!guest_id(full_name, email, phone),
      spaces!space_id(name)
    `)
    .in('space_id', spaces.map(s => s.id))
    .eq('status', 'quote_requested')
    .order('created_at', { ascending: false })

  return data ?? []
}

// ── Responder cotización (enviar precio) ──────────────────
export async function respondToQuote(bookingId: string, quotedPrice: number, message?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { data: bk } = await supabase
    .from('bookings')
    .select('space_id, spaces!space_id(host_id)')
    .eq('id', bookingId)
    .single()
  if (!bk || (bk.spaces as any)?.host_id !== user.id) return { error: 'No autorizado' }

  const { error } = await supabase
    .from('bookings')
    .update({
      total_amount: quotedPrice,
      platform_fee: Math.round(quotedPrice * 0.10),
      base_price: quotedPrice,
      status: 'pending',
      event_notes: message ? `[Cotización del propietario]: ${message}` : null,
    })
    .eq('id', bookingId)
    .eq('status', 'quote_requested')

  return error ? { error: error.message } : { success: true }
}

// ── Marcar evento como completado ─────────────────────────
export async function completeBooking(bookingId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { data: bk } = await supabase
    .from('bookings')
    .select('space_id, spaces!space_id(host_id)')
    .eq('id', bookingId)
    .single()
  if (!bk || (bk.spaces as any)?.host_id !== user.id) return { error: 'No autorizado' }

  const { error } = await supabase
    .from('bookings')
    .update({ status: 'completed', updated_at: new Date().toISOString() })
    .eq('id', bookingId)
    .eq('status', 'confirmed')

  return error ? { error: error.message } : { success: true }
}
