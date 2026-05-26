'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { acceptBooking, rejectBooking, confirmPayment, cancelBooking } from './booking'
import { sendEmail } from '@/lib/email/send'
import { emailBase, infoBox } from '@/lib/email/templates'
import { formatCurrency, formatDate, escapeHtml } from '@/lib/utils'
import { userLogger, logError } from '@/lib/logger'
import { resolveHostId } from './_resolveHost'

export { acceptBooking, rejectBooking, confirmPayment as confirmBooking, cancelBooking }

// ── Analytics de visitas al espacio ──────────────────────
export async function getSpaceViews(spaceId: string): Promise<{ week: string; views: number }[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { hostId } = await resolveHostId(supabase, user.id)

  // Verificar que el espacio pertenece al host
  const { data: space } = await supabase
    .from('spaces')
    .select('id')
    .eq('id', spaceId)
    .eq('host_id', hostId)
    .single()
  if (!space) return []

  // Obtener vistas del último mes (28 días)
  const today = new Date()
  const since = new Date(today)
  since.setDate(since.getDate() - 27)
  const sinceStr = since.toISOString().split('T')[0]

  const { data: rows } = await supabase
    .from('space_views')
    .select('view_date, view_count')
    .eq('space_id', spaceId)
    .gte('view_date', sinceStr)
    .order('view_date')

  if (!rows || rows.length === 0) return []

  // Agrupar por semana (4 semanas)
  const weeks: Record<string, number> = {}
  rows.forEach(row => {
    const d    = new Date(row.view_date + 'T12:00')
    const diff = Math.floor((today.getTime() - d.getTime()) / (1000 * 60 * 60 * 24 * 7))
    const wk   = diff === 0 ? 'Esta semana'
                 : diff === 1 ? 'Semana pasada'
                 : `Hace ${diff} semanas`
    weeks[wk]  = (weeks[wk] ?? 0) + (row.view_count ?? 0)
  })

  // Devolver ordenado de más antiguo a más reciente
  const order = ['Hace 3 semanas', 'Hace 2 semanas', 'Semana pasada', 'Esta semana']
  return order
    .filter(k => weeks[k] !== undefined)
    .map(k => ({ week: k, views: weeks[k] }))
}

// ── iCal — obtener o crear token ─────────────────────────
export async function getOrCreateIcalToken(): Promise<string | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    userLogger.warn('iCal token request without authenticated user')
    return null
  }

  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('ical_token')
      .eq('id', user.id)
      .single()

    if (profile?.ical_token) {
      userLogger.info('Existing iCal token retrieved', { userId: user.id })
      return profile.ical_token
    }

    // Generar token único
    const token = crypto.randomUUID().replace(/-/g, '')
    const { error: saveErr } = await supabase.from('profiles').update({ ical_token: token }).eq('id', user.id)

    if (saveErr) {
      logError(saveErr, { userId: user.id, action: 'create_ical_token' })
      return null
    }

    userLogger.info('New iCal token created', { userId: user.id })
    return token
  } catch (error) {
    logError(error as Error, { userId: user.id, action: 'get_or_create_ical_token' })
    return null
  }
}

// ── iCal — regenerar token (invalida el anterior) ────────
export async function regenerateIcalToken(): Promise<string | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const token = crypto.randomUUID().replace(/-/g, '')
  const { error: saveErr } = await supabase.from('profiles').update({ ical_token: token }).eq('id', user.id)
  if (saveErr) return null
  return token
}

// ── Espacios del host (solo los propios) ─────────────────
export async function getHostSpaces() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  const { hostId } = await resolveHostId(supabase, user.id)
  const { data } = await supabase
    .from('spaces')
    .select('id, name')
    .eq('host_id', hostId)
    .eq('is_active', true)
    .order('created_at')
  return data ?? []
}

// ── Bloquear fecha/horario ────────────────────────────────
export async function createAvailabilityBlock(payload: {
  spaceId:     string
  blockedDate: string
  startTime?:  string
  endTime?:    string
  blockType?:  string
  reason?:     string
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { hostId } = await resolveHostId(supabase, user.id)

  // Verificar que el espacio pertenece al propietario
  const { data: space } = await supabase
    .from('spaces')
    .select('id')
    .eq('id', payload.spaceId)
    .eq('host_id', hostId)
    .single()
  if (!space) return { error: 'No autorizado' }

  const { data, error } = await supabase
    .from('space_availability')
    .insert({
      space_id:     payload.spaceId,
      blocked_date: payload.blockedDate,
      start_time:   payload.startTime   ?? null,
      end_time:     payload.endTime     ?? null,
      block_type:   payload.blockType   ?? 'time_range',
      reason:       payload.reason      ?? null,
    })
    .select()
    .single()

  if (error) return { error: error.message }
  return { success: true, data }
}

// ── Eliminar bloqueo ──────────────────────────────────────
export async function deleteAvailabilityBlock(blockId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  // Verificar ownership a través del espacio
  const { data: block } = await supabase
    .from('space_availability')
    .select('space_id, spaces!space_id(host_id)')
    .eq('id', blockId)
    .single()

  const { hostId: hId } = await resolveHostId(supabase, user.id)
  if (!block || (block.spaces as any)?.host_id !== hId) return { error: 'No autorizado' }

  const { error } = await supabase.from('space_availability').delete().eq('id', blockId)
  return error ? { error: error.message } : { success: true }
}

// ── Obtener bloqueos de un espacio ───────────────────────
export async function getSpaceAvailability(spaceId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { hostId: hId2 } = await resolveHostId(supabase, user.id)
  const { data: space } = await supabase
    .from('spaces').select('id').eq('id', spaceId).eq('host_id', hId2).single()
  if (!space) return []

  const { data } = await supabase
    .from('space_availability')
    .select('*')
    .eq('space_id', spaceId)
  return data ?? []
}

// ── Cuenta bancaria ───────────────────────────────────────
export async function getBankAccount() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { hostId } = await resolveHostId(supabase, user.id)
  const { data } = await supabase
    .from('host_bank_accounts')
    .select('*')
    .eq('host_id', hostId)
    .single()
  return data ?? null
}

export async function saveBankAccount(payload: {
  account_holder: string
  bank_name:      string
  account_type:   'ahorro' | 'corriente'
  currency:       'DOP' | 'USD'
  account_number: string
  cedula_or_rnc:  string
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { hostId } = await resolveHostId(supabase, user.id)

  const { error } = await supabase
    .from('host_bank_accounts')
    .upsert({ host_id: hostId, ...payload, status: 'pending', updated_at: new Date().toISOString() },
             { onConflict: 'host_id' })

  return error ? { error: error.message } : { success: true }
}

// ── Google Calendar — estado de conexión ─────────────────
export async function getGoogleCalendarStatus(): Promise<{ connected: boolean }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { connected: false }

  const { hostId } = await resolveHostId(supabase, user.id)

  const { data } = await supabase
    .from('profiles')
    .select('google_calendar_connected')
    .eq('id', hostId)
    .single()

  return { connected: data?.google_calendar_connected ?? false }
}

// ── Google Calendar — desconectar ────────────────────────
export async function disconnectGoogleCalendar(): Promise<{ success: boolean }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false }

  const { hostId } = await resolveHostId(supabase, user.id)

  const { error } = await supabase
    .from('profiles')
    .update({ google_calendar_connected: false, google_refresh_token: null })
    .eq('id', hostId)

  return { success: !error }
}

// ── Todas las reservas del host ───────────────────────────
export async function getHostBookings(statusFilter?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { hostId } = await resolveHostId(supabase, user.id)

  const { data: spaces } = await supabase
    .from('spaces').select('id').eq('host_id', hostId)
  if (!spaces?.length) return []

  let q = supabase
    .from('bookings')
    .select(`
      *,
      profiles!guest_id(full_name, email, phone),
      spaces!space_id(name, category),
      space_pricing!pricing_id(package_name, package_includes, pricing_type),
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

  const { hostId } = await resolveHostId(supabase, user.id)

  const { data: spaces } = await supabase
    .from('spaces').select('id').eq('host_id', hostId)
  if (!spaces?.length) return {
    revenueThisMonth: 0, revenuePrevMonth: 0,
    pendingCount: 0, confirmedCount: 0, acceptedCount: 0,
    pendingQuotes: 0, nextBooking: null, monthlyRevenue: [], spaceCount: 0,
  }

  const spaceIds = spaces.map(s => s.id)
  const now = new Date()
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0]
  const prevMonthEnd   = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0]

  const [allBookings, quotes] = await Promise.all([
    supabase.from('bookings')
      .select('id, status, payment_status, total_amount, event_date, confirmed_at, start_time, end_time, guest_count, event_type, profiles!guest_id(full_name)')
      .in('space_id', spaceIds)
      .order('event_date', { ascending: true }),
    supabase.from('bookings')
      .select('id').in('space_id', spaceIds).eq('status', 'quote_requested'),
  ])

  const bookings = allBookings.data ?? []

  const thisMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]

  // Filtrar por confirmed_at (fecha real de pago) no event_date (fecha del evento)
  const confirmedDateOf = (b: { confirmed_at?: string | null }) =>
    b.confirmed_at ? b.confirmed_at.split('T')[0] : null

  const paidStatuses = ['confirmed', 'completed']

  const revenueThisMonth = bookings
    .filter(b => {
      const d = confirmedDateOf(b)
      return paidStatuses.includes(b.status) && d && d >= thisMonthStart && d <= thisMonthEnd
    })
    .reduce((s, b) => s + Number(b.total_amount), 0)

  const revenuePrevMonth = bookings
    .filter(b => {
      const d = confirmedDateOf(b)
      return paidStatuses.includes(b.status) && d && d >= prevMonthStart && d <= prevMonthEnd
    })
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
      .filter(b => {
        const cd = confirmedDateOf(b)
        return paidStatuses.includes(b.status) && cd && cd >= start && cd <= end
      })
      .reduce((s, b) => s + Number(b.total_amount), 0)
    return { mes: mes.charAt(0).toUpperCase() + mes.slice(1), ingresos }
  })

  return {
    revenueThisMonth,
    revenuePrevMonth,
    pendingCount:  bookings.filter(b => b.status === 'pending').length,
    acceptedCount: bookings.filter(b => b.status === 'accepted').length,
    confirmedCount: bookings.filter(b => {
      const cd = confirmedDateOf(b)
      return paidStatuses.includes(b.status) && cd && cd >= thisMonthStart
    }).length,
    pendingQuotes: quotes.data?.length ?? 0,
    nextBooking,
    monthlyRevenue: monthly,
    spaceCount: spaces.length,
  }
}

// ── Reservas del calendario ───────────────────────────────
export async function getHostCalendarBookings() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { hostId } = await resolveHostId(supabase, user.id)

  const { data: spaces } = await supabase
    .from('spaces').select('id').eq('host_id', hostId)
  if (!spaces?.length) return []

  const { data } = await supabase
    .from('bookings')
    .select('id, space_id, event_date, start_time, end_time, status, total_amount, event_type, profiles!guest_id(full_name), spaces!space_id(name)')
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

  const { hostId } = await resolveHostId(supabase, user.id)

  // Paso 1: obtener IDs de espacios del host
  const { data: spaces, error: spacesErr } = await supabase
    .from('spaces')
    .select('id')
    .eq('host_id', hostId)

  if (spacesErr) {
    console.error('[getHostQuotes] spaces query failed:', spacesErr.message)
    return []
  }
  if (!spaces?.length) return []

  const spaceIds = spaces.map(s => s.id)

  // Paso 2: obtener espacios con pricing de cotización personalizada
  const { data: customPricing } = await supabase
    .from('space_pricing')
    .select('space_id')
    .eq('pricing_type', 'custom_quote')
    .in('space_id', spaceIds)

  const customQuoteSpaceIds = new Set(customPricing?.map(p => p.space_id) ?? [])

  // Paso 3: bookings pendientes — quote_requested siempre, pending solo en espacios custom_quote
  const { data, error } = await supabase
    .from('bookings')
    .select('*, profiles!guest_id(full_name, email, phone)')
    .in('space_id', spaceIds)
    .in('status', ['quote_requested', 'pending'])
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[getHostQuotes] bookings query failed:', error.message, error.code)
    return []
  }

  return (data ?? []).filter(b =>
    b.status === 'quote_requested' || customQuoteSpaceIds.has(b.space_id)
  )
}

// ── Responder cotización (enviar precio) ──────────────────
export async function respondToQuote(bookingId: string, quotedPrice: number, message?: string) {
  if (!quotedPrice || quotedPrice <= 0) return { error: 'El precio debe ser mayor a 0' }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { data: bk } = await supabase
    .from('bookings')
    .select('space_id, event_date, event_type, profiles!guest_id(full_name, email), spaces!space_id(host_id, name, address, city)')
    .eq('id', bookingId)
    .single()
  const { hostId: rqHostId } = await resolveHostId(supabase, user.id)
  if (!bk || (bk.spaces as any)?.host_id !== rqHostId) return { error: 'No autorizado' }

  const platformFee = Math.round(quotedPrice * 0.10)

  // Actualizar booking: precio real + pasar a 'accepted' directamente
  // (el host ya aceptó la cotización al responder con precio)
  const { error } = await supabase
    .from('bookings')
    .update({
      total_amount:  quotedPrice,
      platform_fee:  platformFee,
      base_price:    quotedPrice,
      addons_total:  0,
      status:        'accepted',
      accepted_at:   new Date().toISOString(),
      event_notes:   `[Cotización]${message ? ': ' + message : ''}`,
    })
    .eq('id', bookingId)
    .in('status', ['quote_requested', 'pending'])

  if (error) return { error: error.message }

  // Crear plan de cuotas con el precio real de la cotización
  const { createInstallments } = await import('@/lib/actions/installments')
  const instResult = await createInstallments(bookingId, bk.event_date, quotedPrice)
  if (!instResult.success) {
    console.error('[respondToQuote] installments failed:', instResult.error)
    // Revertir el booking a quote_requested si las cuotas no se pudieron crear
    await supabase.from('bookings')
      .update({ status: 'quote_requested', accepted_at: null })
      .eq('id', bookingId)
    return { error: 'Error al crear el plan de pagos. Por favor intenta de nuevo.' }
  }

  // Email al cliente con precio, cuotas y CTA directo al pago
  const SITE  = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://espot.do'
  const guest = bk.profiles as any
  const space = bk.spaces as any

  revalidatePath('/dashboard/host/cotizaciones')
  revalidatePath('/dashboard/host/agenda')
  revalidatePath('/dashboard/reservas')

  if (guest?.email) {
    // Calcular schedule para mostrar en el email
    const { buildSchedule } = await import('@/lib/payments/schedule')
    const schedule = buildSchedule(bk.event_date, quotedPrice)
    const cuotasInfo = schedule.installments
      .map(i => `${i.label}: ${formatCurrency(i.amount)}`)
      .join(' · ')

    await sendEmail({
      to:      guest.email,
      subject: `Cotización aprobada — ${space?.name}`,
      html: emailBase({
        title:       'Tu cotización fue respondida',
        subtitle:    `${space?.name} tiene una propuesta de precio para ti.`,
        accentColor: '#2563EB',
        body: `
          <p style="color:#374151;margin:0 0 16px;">Hola <strong>${guest?.full_name ?? 'Cliente'}</strong>, el propietario de <strong>${space?.name}</strong> revisó tu solicitud.</p>
          ${infoBox([
            { label: 'Espacio',          value: space?.name ?? '' },
            { label: 'Fecha del evento', value: formatDate(bk.event_date) },
            { label: 'Tipo de evento',   value: bk.event_type ?? '' },
            { label: 'Precio total',     value: formatCurrency(quotedPrice) },
            { label: 'Plan de pago',     value: cuotasInfo },
            ...(message ? [{ label: 'Nota del propietario', value: escapeHtml(message) }] : []),
          ])}
          <p style="color:#6B7280;font-size:13px;margin:8px 0 0;">
            Para confirmar tu reserva, realiza el primer pago desde tu panel.
          </p>`,
        cta: { text: 'Ver cotización y pagar →', url: `${SITE}/pago/${bookingId}` },
      }),
    })
  }

  return { success: true }
}

// ── Detalle completo de una reserva (host) ───────────────
export async function getHostBookingDetail(bookingId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // Verificar que el usuario es host de ese booking
  const { data: bk, error } = await supabase
    .from('bookings')
    .select(`
      *,
      profiles!guest_id(full_name, email, phone),
      spaces!space_id(id, name, slug, address, sector, city, host_id, space_images(url, is_cover)),
      space_pricing!pricing_id(pricing_type, package_name, package_includes, hourly_price, minimum_consumption, fixed_price),
      booking_addons(addon_id, quantity, unit_price, subtotal, space_addons(name)),
      booking_installments(*)
    `)
    .eq('id', bookingId)
    .single()

  if (error || !bk) return null

  // Verificar ownership: el usuario debe ser el host del espacio
  const { hostId: detailHostId } = await resolveHostId(supabase, user.id)
  const space = (bk as any).spaces as any
  if (space?.host_id !== detailHostId) return null

  // Ordenar cuotas por número
  const installments = ((bk as any).booking_installments ?? [])
    .sort((a: any, b: any) => a.installment_number - b.installment_number)

  return { booking: bk, installments }
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
  const { hostId: completeHostId } = await resolveHostId(supabase, user.id)
  if (!bk || (bk.spaces as any)?.host_id !== completeHostId) return { error: 'No autorizado' }

  const { data: updated, error } = await supabase
    .from('bookings')
    .update({ status: 'completed', updated_at: new Date().toISOString() })
    .eq('id', bookingId)
    .eq('status', 'confirmed')
    .select('id')

  if (error) return { error: error.message }
  if (!updated || updated.length === 0) return { error: 'La reserva no está en estado confirmado' }

  // Enviar solicitud de reseña al cliente
  const { data: bkFull } = await supabase
    .from('bookings')
    .select('event_date, spaces!space_id(name, slug), profiles!guest_id(full_name, email)')
    .eq('id', bookingId)
    .single()
  if (bkFull) {
    const guest = (bkFull as any).profiles
    const space = (bkFull as any).spaces
    if (guest?.email) {
      const { tplSolicitudResena } = await import('@/lib/email/templates')
      await sendEmail({
        to:      guest.email,
        subject: `¿Cómo estuvo tu evento en ${space?.name}?`,
        html:    tplSolicitudResena({
          guestName:  guest.full_name ?? 'Cliente',
          spaceName:  space?.name ?? '',
          eventDate:  bkFull.event_date,
          bookingId,
          spaceSlug:  space?.slug ?? '',
        }),
      })
    }
  }

  revalidatePath('/dashboard/host/agenda')
  revalidatePath('/dashboard/host/finanzas')
  return { success: true }
}

// ── Generar slug para el host a partir de su nombre ───────────
export async function generateHostSlug() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { hostId } = await resolveHostId(supabase, user.id)

  const { data: profile } = await supabase
    .from('profiles').select('full_name, slug').eq('id', hostId).single()
  if (!profile) return { error: 'Perfil no encontrado' }
  if ((profile as any).slug) return { slug: (profile as any).slug }

  const base = (profile.full_name ?? 'host')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40)

  let candidate = base
  let suffix    = 1
  while (true) {
    const { data: existing } = await supabase
      .from('profiles').select('id').eq('slug', candidate).neq('id', hostId).single()
    if (!existing) break
    candidate = `${base}-${suffix++}`
  }

  await supabase.from('profiles').update({ slug: candidate }).eq('id', hostId)
  revalidatePath('/dashboard/host/ajustes')
  return { slug: candidate }
}

// ── Equipo: obtener miembros ──────────────────────────────
export async function getTeamMembers() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { hostId, isOwner } = await resolveHostId(supabase, user.id)
  if (!isOwner) return [] // solo el owner puede gestionar el equipo

  const { data } = await supabase
    .from('host_team_members')
    .select('*, member:profiles!member_user_id(id, full_name, avatar_url, email)')
    .eq('host_id', hostId)
    .order('invited_at', { ascending: false })

  return data ?? []
}

// ── Equipo: invitar miembro ───────────────────────────────
export async function inviteTeamMember(email: string, role: 'admin' | 'coordinador' | 'viewer') {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { hostId, isOwner } = await resolveHostId(supabase, user.id)
  if (!isOwner) return { error: 'Solo el propietario puede invitar miembros' }

  const token = crypto.randomUUID().replace(/-/g, '')

  const { data: existing } = await supabase
    .from('host_team_members')
    .select('id, status')
    .eq('host_id', hostId)
    .eq('invite_email', email.toLowerCase())
    .maybeSingle()

  if (existing && existing.status === 'active') {
    return { error: 'Este email ya es miembro activo del equipo' }
  }

  const { data, error } = await supabase
    .from('host_team_members')
    .upsert({
      host_id:      hostId,
      invite_email: email.toLowerCase(),
      role,
      status:       'pending',
      invite_token: token,
      invited_at:   new Date().toISOString(),
    }, { onConflict: 'host_id,invite_email' })
    .select()
    .single()

  if (error) return { error: error.message }

  // Obtener nombre del host para el email
  const { data: hostProfile } = await supabase
    .from('profiles').select('full_name').eq('id', hostId).single()

  const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://espot.do'
  const { tplInvitacionEquipo } = await import('@/lib/email/templates')
  await sendEmail({
    to:      email,
    subject: `Te invitaron a unirte al equipo en Espot`,
    html:    tplInvitacionEquipo({
      hostName:   hostProfile?.full_name ?? 'Un organizador',
      role,
      acceptUrl:  `${SITE}/auth/invitacion?token=${token}`,
    }),
  }).catch(() => {})

  revalidatePath('/dashboard/host/equipo')
  return { data }
}

// ── Equipo: revocar / desactivar miembro ──────────────────
export async function revokeTeamMember(memberId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { hostId, isOwner } = await resolveHostId(supabase, user.id)
  if (!isOwner) return { error: 'Solo el propietario puede revocar miembros' }

  const { error } = await supabase
    .from('host_team_members')
    .update({ status: 'inactive', updated_at: new Date().toISOString() } as any)
    .eq('id', memberId)
    .eq('host_id', hostId)

  if (error) return { error: error.message }

  revalidatePath('/dashboard/host/equipo')
  return { success: true }
}

// ── Equipo: aceptar invitación (llamado desde /auth/invitacion) ─
export async function acceptTeamInvite(token: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Debes iniciar sesión primero' }

  const { data: invite } = await supabase
    .from('host_team_members')
    .select('id, host_id, role, status, invite_email')
    .eq('invite_token', token)
    .eq('status', 'pending')
    .maybeSingle()

  if (!invite) return { error: 'Invitación no válida o ya utilizada' }

  const { error } = await supabase
    .from('host_team_members')
    .update({
      member_user_id: user.id,
      status:         'active',
      accepted_at:    new Date().toISOString(),
      invite_token:   null,
    } as any)
    .eq('id', invite.id)

  if (error) return { error: error.message }

  return { success: true, hostId: invite.host_id, role: invite.role }
}
