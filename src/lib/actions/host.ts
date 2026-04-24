'use server'

import { createClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email/send'

// ── Todas las reservas del host ───────────────────────────────
export async function getHostBookings() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data: spaces } = await supabase
    .from('spaces')
    .select('id')
    .eq('host_id', user.id)

  if (!spaces?.length) return []

  const spaceIds = spaces.map(s => s.id)

  const { data } = await supabase
    .from('bookings')
    .select(`
      *,
      profiles!guest_id(full_name, email, phone),
      spaces!space_id(name, category),
      booking_addons(addon_id, quantity, unit_price, subtotal, space_addons(name))
    `)
    .in('space_id', spaceIds)
    .order('event_date', { ascending: true })

  return data ?? []
}

// ── Stats del mes actual para el Overview ────────────────────
export async function getHostStats() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: spaces } = await supabase
    .from('spaces')
    .select('id')
    .eq('host_id', user.id)

  if (!spaces?.length) return {
    revenueThisMonth: 0, revenuePrevMonth: 0,
    pendingCount: 0, confirmedCount: 0,
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
    supabase.from('quotes')
      .select('id')
      .in('space_id', spaceIds)
      .eq('status', 'pending'),
  ])

  const bookings = allBookings.data ?? []

  const revenueThisMonth = bookings
    .filter(b => b.event_date >= thisMonthStart && b.status === 'confirmed')
    .reduce((s, b) => s + Number(b.total_amount), 0)

  const revenuePrevMonth = bookings
    .filter(b => b.event_date >= prevMonthStart && b.event_date <= prevMonthEnd && b.status === 'confirmed')
    .reduce((s, b) => s + Number(b.total_amount), 0)

  const pendingCount = bookings.filter(b => b.status === 'pending').length
  const confirmedCount = bookings.filter(b =>
    b.event_date >= thisMonthStart && b.status === 'confirmed'
  ).length

  const today = now.toISOString().split('T')[0]
  const nextBooking = bookings.find(b =>
    b.event_date >= today && (b.status === 'confirmed' || b.status === 'pending')
  ) ?? null

  // Revenue últimos 6 meses para la gráfica
  const monthlyRevenue = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1)
    const start = d.toISOString().split('T')[0]
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0]
    const mes = d.toLocaleDateString('es-DO', { month: 'short' })
    const ingresos = bookings
      .filter(b => b.event_date >= start && b.event_date <= end && b.status === 'confirmed')
      .reduce((s, b) => s + Number(b.total_amount), 0)
    return { mes: mes.charAt(0).toUpperCase() + mes.slice(1), ingresos }
  })

  return {
    revenueThisMonth,
    revenuePrevMonth,
    pendingCount,
    confirmedCount,
    pendingQuotes: quotes.data?.length ?? 0,
    nextBooking,
    monthlyRevenue,
  }
}

// ── Reservas del calendario (mes) ────────────────────────────
export async function getHostCalendarBookings() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data: spaces } = await supabase
    .from('spaces')
    .select('id')
    .eq('host_id', user.id)

  if (!spaces?.length) return []

  const { data } = await supabase
    .from('bookings')
    .select('id, event_date, start_time, end_time, status, total_amount, event_type, profiles!guest_id(full_name)')
    .in('space_id', spaces.map(s => s.id))
    .not('status', 'in', '("cancelled_guest","cancelled_host")')
    .order('event_date')

  return data ?? []
}

// ── Confirmar reserva ────────────────────────────────────────
export async function confirmBooking(bookingId: string) {
  const supabase = await createClient()

  const { data: booking } = await supabase
    .from('bookings')
    .select(`
      *,
      profiles!guest_id(full_name, email),
      spaces!space_id(name, host_id, profiles!host_id(full_name, email))
    `)
    .eq('id', bookingId)
    .single()

  if (!booking) return { error: 'Reserva no encontrada' }

  const { error } = await supabase
    .from('bookings')
    .update({ status: 'confirmed', confirmed_at: new Date().toISOString() })
    .eq('id', bookingId)

  if (error) return { error: error.message }

  // Email al cliente avisando que fue confirmada
  const guest = booking.profiles as any
  const space = booking.spaces as any
  const host = space?.profiles as any

  if (guest?.email) {
    await sendEmail({
      to: guest.email,
      subject: `✅ ¡Reserva confirmada! — ${space?.name}`,
      html: `<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:#0f172a;font-family:sans-serif;">
  <div style="max-width:520px;margin:0 auto;padding:40px 20px;">
    <div style="background:#1e293b;border:1px solid #334155;border-radius:20px;overflow:hidden;">
      <div style="background:linear-gradient(135deg,#065f46,#047857);padding:28px;text-align:center;">
        <div style="font-size:40px;margin-bottom:10px;">🎉</div>
        <h1 style="color:white;font-size:22px;font-weight:bold;margin:0;">¡Tu reserva fue confirmada!</h1>
      </div>
      <div style="padding:28px;">
        <p style="color:#e2e8f0;">Hola <strong>${guest?.full_name}</strong>,</p>
        <p style="color:#94a3b8;font-size:14px;">
          El propietario confirmó tu reserva en <strong style="color:white;">${space?.name}</strong>.
        </p>
        <div style="background:#052e16;border:1px solid #14532d;border-radius:12px;padding:16px;margin:20px 0;">
          <p style="color:#86efac;font-size:13px;margin:0 0 4px;">📅 ${new Date(booking.event_date + 'T12:00').toLocaleDateString('es-DO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
          <p style="color:#86efac;font-size:13px;margin:0;">⏰ ${booking.start_time} – ${booking.end_time}</p>
        </div>
        <p style="color:#64748b;font-size:13px;">¿Tienes preguntas? Escríbele directamente al propietario por espot.do</p>
      </div>
    </div>
  </div>
</body></html>`,
    })
  }

  return { success: true }
}

// ── Rechazar reserva ─────────────────────────────────────────
export async function rejectBooking(bookingId: string, reason?: string) {
  const supabase = await createClient()

  const { data: booking } = await supabase
    .from('bookings')
    .select('*, profiles!guest_id(full_name, email), spaces!space_id(name)')
    .eq('id', bookingId)
    .single()

  if (!booking) return { error: 'Reserva no encontrada' }

  const { error } = await supabase
    .from('bookings')
    .update({
      status: 'cancelled_host',
      cancelled_at: new Date().toISOString(),
      cancellation_reason: reason ?? null,
    })
    .eq('id', bookingId)

  if (error) return { error: error.message }

  const guest = booking.profiles as any
  const space = booking.spaces as any

  if (guest?.email) {
    await sendEmail({
      to: guest.email,
      subject: `Actualización sobre tu reserva en ${space?.name}`,
      html: `<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:#0f172a;font-family:sans-serif;">
  <div style="max-width:520px;margin:0 auto;padding:40px 20px;">
    <div style="background:#1e293b;border:1px solid #334155;border-radius:20px;padding:28px;">
      <h2 style="color:white;">Hola ${guest?.full_name},</h2>
      <p style="color:#94a3b8;font-size:14px;">
        Lamentablemente el propietario no pudo aceptar tu solicitud en <strong style="color:white;">${space?.name}</strong> para el <strong style="color:white;">${booking.event_date}</strong>.
      </p>
      ${reason ? `<p style="color:#94a3b8;font-size:14px;">Motivo: ${reason}</p>` : ''}
      <p style="color:#94a3b8;font-size:14px;">Te invitamos a explorar otros espacios disponibles en espot.do</p>
      <a href="https://espot.do/buscar" style="display:inline-block;background:#7c3aed;color:white;padding:12px 24px;border-radius:10px;text-decoration:none;font-weight:bold;margin-top:8px;">Ver otros espacios</a>
    </div>
  </div>
</body></html>`,
    })
  }

  return { success: true }
}
