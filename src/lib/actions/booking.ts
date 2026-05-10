'use server'

import { createClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email/send'
import { formatCurrency, formatDate, formatTime } from '@/lib/utils'
import {
  tplSolicitudCliente, tplSolicitudHost,
  tplAceptadaCliente, tplConfirmadaCliente, tplConfirmadaHost,
  tplRechazadaCliente, tplCancelada,
} from '@/lib/email/templates'
import { createBookingEvent, deleteBookingEvent } from '@/lib/google-calendar'
import { createInstallments } from '@/lib/actions/installments'
export type { BookingStatus } from '@/lib/bookingConfig'

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://espot.do'

// ── CREAR RESERVA CON VALIDACIÓN ANTI-DOBLE ───────────────
export interface CreateBookingPayload {
  spaceId: string
  pricingId?: string
  eventDate: string
  startTime: string
  endTime: string
  guestCount: number
  eventType: string
  eventNotes?: string
  guestCedula?: string
  selectedAddonIds: string[]
  basePrice: number
  addonsTotal: number
  platformFee: number
  totalAmount: number
}

export async function createBooking(payload: CreateBookingPayload) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Debes iniciar sesión para hacer una reserva' }

  // Obtener info del espacio y host para los emails
  const { data: space } = await supabase
    .from('spaces')
    .select('id, name, address, city, sector, host_id, profiles!host_id(id, full_name, email, phone)')
    .eq('id', payload.spaceId)
    .single()

  if (!space) return { error: 'Espacio no encontrado' }

  // Obtener perfil del guest
  const guestProfile = user ? await supabase
    .from('profiles').select('full_name, email, phone').eq('id', user.id).single()
    .then(r => r.error ? null : r.data) : null

  // ── Validar min/max horas según configuración del pricing ──
  if (payload.pricingId && payload.startTime && payload.endTime) {
    const { data: pricingCheck } = await supabase
      .from('space_pricing')
      .select('min_hours, max_hours, session_hours, package_hours, extra_hour_price, pricing_type')
      .eq('id', payload.pricingId)
      .single()

    if (pricingCheck) {
      // Calcular horas seleccionadas (maneja medianoche)
      const sh = parseInt(payload.startTime.split(':')[0] || '0')
      const eh = parseInt(payload.endTime.split(':')[0] || '0')
      const sn = (sh < 6 ? sh + 24 : sh) * 60 + parseInt(payload.startTime.split(':')[1] || '0')
      const en = (eh < 6 ? eh + 24 : eh) * 60 + parseInt(payload.endTime.split(':')[1] || '0')
      const selectedH = Math.max(0, (en - sn) / 60)

      const minH  = pricingCheck.min_hours    ?? 0
      const maxH  = pricingCheck.max_hours    ?? 0
      const sessH = pricingCheck.session_hours ?? 0
      const pkgH  = pricingCheck.package_hours ?? 0
      const hasExtra = Number(pricingCheck.extra_hour_price) > 0

      if (minH > 0 && selectedH < minH)
        return { error: `Este Espot requiere mínimo ${minH} hora${minH > 1 ? 's' : ''} de reserva.` }
      if (maxH > 0 && selectedH > maxH)
        return { error: `Este Espot permite máximo ${maxH} hora${maxH > 1 ? 's' : ''} de reserva.` }
      if (sessH > 0 && Math.abs(selectedH - sessH) > 0.1)
        return { error: `Este espacio requiere exactamente ${sessH} hora${sessH > 1 ? 's' : ''} de sesión.` }
      if (pkgH > 0 && !hasExtra && Math.abs(selectedH - pkgH) > 0.1)
        return { error: `Este paquete tiene una duración fija de ${pkgH} hora${pkgH > 1 ? 's' : ''}.` }
    }
  }

  // Validar disponibilidad — solo si hay horario real definido (no vacío ni placeholder)
  const hasRealTime = !!(payload.startTime && payload.endTime &&
    (payload.startTime !== '00:00' || payload.endTime !== '23:59'))
  if (hasRealTime) {
    const { data: availCheck, error: rpcError } = await supabase.rpc('check_space_availability', {
      p_space_id:   payload.spaceId,
      p_event_date: payload.eventDate,
      p_start_time: payload.startTime,
      p_end_time:   payload.endTime,
      p_exclude_id: null,
    })
    // Solo bloquear si la función existe Y confirma conflicto (data === false)
    if (!rpcError && availCheck === false) {
      return { error: 'Este espacio ya tiene una reserva en ese horario. Por favor elige otro horario o fecha.' }
    }
  } else {
    // Para espacios sin horario (paquete, consumo mínimo): verificar solo por fecha
    const { data: sameDay } = await supabase
      .from('bookings')
      .select('id')
      .eq('space_id', payload.spaceId)
      .eq('event_date', payload.eventDate)
      .not('status', 'in', '("rejected","cancelled_guest","cancelled_host")')
      .limit(1)
    if (sameDay && sameDay.length > 0) {
      return { error: 'Este espacio ya tiene una reserva para esa fecha. Por favor elige otra fecha.' }
    }
  }

  // Determinar si es cotización y si el espacio tiene reserva instantánea
  let isQuote = false
  if (payload.pricingId) {
    const { data: pricingRow } = await supabase
      .from('space_pricing').select('pricing_type').eq('id', payload.pricingId).single()
    isQuote = pricingRow?.pricing_type === 'custom_quote'
  }
  const { data: spaceRow } = await supabase
    .from('spaces').select('instant_booking').eq('id', payload.spaceId).single()
  const isInstant = !isQuote && (spaceRow?.instant_booking === true)

  // Insertar reserva
  const { data: booking, error: bookingError } = await supabase
    .from('bookings')
    .insert({
      space_id:     payload.spaceId,
      guest_id:     user?.id ?? null,
      pricing_id:   payload.pricingId ?? null,
      event_date:   payload.eventDate,
      start_time:   payload.startTime || null,
      end_time:     payload.endTime   || null,
      guest_count:  payload.guestCount,
      event_type:   payload.eventType,
      event_notes:  payload.eventNotes ?? null,
      guest_cedula: payload.guestCedula ?? null,
      base_price:   payload.basePrice,
      addons_total: payload.addonsTotal,
      platform_fee: payload.platformFee,
      total_amount: payload.totalAmount,
      status:       isQuote ? 'quote_requested' : isInstant ? 'accepted' : 'pending',
      accepted_at:  isInstant ? new Date().toISOString() : null,
      payment_status: 'unpaid',
    })
    .select('id')
    .single()

  if (bookingError) return { error: bookingError.message }

  // Guardar addons seleccionados
  if (payload.selectedAddonIds.length > 0) {
    const { data: addonData } = await supabase
      .from('space_addons').select('id, name, price')
      .eq('space_id', payload.spaceId)
      .in('id', payload.selectedAddonIds)

    if (addonData?.length) {
      const { error: addonInsertError } = await supabase.from('booking_addons').insert(
        addonData.map(a => ({
          booking_id: booking.id, addon_id: a.id,
          quantity: 1, unit_price: a.price, subtotal: a.price,
        }))
      )
      if (addonInsertError) console.error('[createBooking] addon insert failed:', addonInsertError.message)
    }
  }

  // ── Emails automáticos ────────────────────────────────
  const host = space.profiles as any
  const guestName  = guestProfile?.full_name ?? 'Cliente'
  const guestEmail = guestProfile?.email ?? user?.email ?? ''
  const hostEmail  = host?.email ?? ''
  const spaceName  = space.name
  const eventInfo  = `${formatDate(payload.eventDate)} · ${formatTime(payload.startTime)} – ${formatTime(payload.endTime)} · ${payload.guestCount} personas`

  const bookingData = {
    guestName, guestEmail, hostName: host?.full_name ?? '',
    spaceName, spaceAddress: space.address ?? '',
    eventDate: payload.eventDate, startTime: payload.startTime, endTime: payload.endTime,
    eventType: payload.eventType, guestCount: payload.guestCount,
    totalAmount: payload.totalAmount, platformFee: payload.platformFee,
    basePrice: payload.basePrice, selectedAddons: [],
    bookingId: booking.id,
  }
  await Promise.all([
    guestEmail && sendEmail({
      to: guestEmail,
      subject: isQuote ? `Solicitud de cotización recibida — ${spaceName}` : `Solicitud recibida — ${spaceName}`,
      html: tplSolicitudCliente(bookingData),
    }),
    hostEmail && sendEmail({
      to: hostEmail,
      subject: isQuote ? `Nueva solicitud de cotización — ${spaceName}` : `Nueva solicitud de reserva — ${spaceName}`,
      html: tplSolicitudHost({ ...bookingData, isQuote }),
    }),
  ])

  // Para reservas instantáneas: crear cuotas inmediatamente (saltean acceptBooking)
  if (isInstant) {
    await createInstallments(booking.id, payload.eventDate, payload.totalAmount)
  }

  return { success: true, bookingId: booking.id, status: isQuote ? 'quote_requested' : isInstant ? 'accepted' : 'pending' }
}

// ── ACEPTAR RESERVA (host) ────────────────────────────────
export async function acceptBooking(bookingId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { data: bk } = await supabase
    .from('bookings')
    .select(`*, spaces!space_id(name, host_id, profiles!host_id(full_name, email)), profiles!guest_id(full_name, email, phone)`)
    .eq('id', bookingId)
    .single()

  if (!bk) return { error: 'Reserva no encontrada' }

  const space = bk.spaces as any
  if (space?.host_id !== user.id) return { error: 'No autorizado' }

  const { error } = await supabase
    .from('bookings')
    .update({ status: 'accepted', accepted_at: new Date().toISOString() })
    .eq('id', bookingId)
    .in('status', ['pending', 'quote_requested'])

  if (error) return { error: error.message }

  // Crear schedule de cuotas al aceptar
  await createInstallments(bookingId, bk.event_date, Number(bk.total_amount))

  const guest = bk.profiles as any
  const depositAmount = formatCurrency(Number(bk.platform_fee))

  await Promise.all([
    guest?.email && sendEmail({
      to: guest.email,
      subject: `El propietario aceptó tu solicitud — ${space?.name}`,
      html: tplAceptadaCliente({
        guestName: guest?.full_name ?? 'Cliente',
        hostName: '', guestEmail: guest?.email ?? '',
        spaceName: space?.name ?? '', spaceAddress: space?.address ?? '',
        eventDate: bk.event_date, startTime: bk.start_time, endTime: bk.end_time,
        eventType: bk.event_type, guestCount: bk.guest_count,
        totalAmount: Number(bk.total_amount), platformFee: Number(bk.platform_fee),
        basePrice: Number(bk.total_amount), selectedAddons: [], bookingId,
      }),
    }),
  ])

  return { success: true }
}

// ── RECHAZAR RESERVA (host) ───────────────────────────────
export async function rejectBooking(bookingId: string, reason?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { data: bk } = await supabase
    .from('bookings')
    .select(`*, spaces!space_id(name, host_id, profiles!host_id(google_refresh_token, google_calendar_connected)), profiles!guest_id(full_name, email)`)
    .eq('id', bookingId)
    .single()

  if (!bk) return { error: 'Reserva no encontrada' }

  const space = bk.spaces as any
  if (space?.host_id !== user.id) return { error: 'No autorizado' }

  const { error } = await supabase
    .from('bookings')
    .update({
      status: 'rejected',
      rejected_at: new Date().toISOString(),
      rejection_reason: reason ?? null,
    })
    .eq('id', bookingId)

  if (error) return { error: error.message }

  // Google Calendar: eliminar evento si existe
  const host = space?.profiles as any
  if (host?.google_calendar_connected && host?.google_refresh_token && (bk as any).google_calendar_event_id) {
    await deleteBookingEvent(host.google_refresh_token, (bk as any).google_calendar_event_id)
  }

  const guest = bk.profiles as any
  if (guest?.email) {
    await sendEmail({
      to: guest.email,
      subject: `El espacio no está disponible — ${space?.name}`,
      html: tplRechazadaCliente({
        guestName: guest?.full_name ?? 'Cliente',
        spaceName: space?.name ?? '',
        eventDate: bk.event_date,
        reason,
      }),
    })
  }

  return { success: true }
}

// ── CONFIRMAR PAGO (cliente paga el 10%) ──────────────────
export async function confirmPayment(bookingId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { data: bk } = await supabase
    .from('bookings')
    .select(`*, spaces!space_id(name, host_id, address, city, sector, profiles!host_id(full_name, email, phone, google_refresh_token, google_calendar_connected)), profiles!guest_id(full_name, email, phone)`)
    .eq('id', bookingId)
    .eq('guest_id', user.id)
    .single()

  if (!bk) return { error: 'Reserva no encontrada' }
  if (bk.status !== 'accepted') return { error: 'La reserva debe estar aceptada para confirmar el pago' }

  const { error } = await supabase
    .from('bookings')
    .update({
      status: 'confirmed',
      payment_status: 'advance',
      paid_at: new Date().toISOString(),
      confirmed_at: new Date().toISOString(),
      commission_status: 'collected',
    })
    .eq('id', bookingId)

  if (error) return { error: error.message }

  // Registrar el pago (no bloquea si falla — el booking ya está confirmado)
  const { error: payErr } = await supabase.from('payments').insert({
    booking_id:     bookingId,
    amount:         bk.platform_fee,
    currency:       'DOP',
    payment_type:   'platform_fee',
    payment_method: 'manual',
    status:         'completed',
    paid_at:        new Date().toISOString(),
  })
  if (payErr) console.error('[completeBooking] payments insert failed:', payErr.message)

  const space  = bk.spaces as any
  const host   = space?.profiles as any
  const guest  = bk.profiles as any
  const remainingAmount = formatCurrency(Number(bk.total_amount) - Number(bk.platform_fee))

  // Google Calendar: crear evento en el calendario del propietario
  if (host?.google_calendar_connected && host?.google_refresh_token) {
    const gcalEventId = await createBookingEvent(
      host.google_refresh_token,
      {
        id:          bookingId,
        event_date:  bk.event_date,
        start_time:  bk.start_time,
        end_time:    bk.end_time,
        event_type:  bk.event_type,
        guest_count: bk.guest_count,
      },
      {
        name:    space?.name    ?? '',
        address: space?.address ?? null,
        sector:  space?.sector  ?? null,
        city:    space?.city    ?? null,
      },
      guest?.full_name ?? 'Cliente',
    )
    if (gcalEventId) {
      await supabase.from('bookings')
        .update({ google_calendar_event_id: gcalEventId })
        .eq('id', bookingId)
    }
  }

  const confirmData = {
    guestName: guest?.full_name ?? 'Cliente', guestEmail: guest?.email ?? '',
    hostName: host?.full_name ?? 'Propietario',
    spaceName: space?.name ?? '', spaceAddress: `${space?.address ?? ''}, ${space?.city ?? ''}`,
    eventDate: bk.event_date, startTime: bk.start_time, endTime: bk.end_time,
    eventType: bk.event_type, guestCount: bk.guest_count,
    totalAmount: Number(bk.total_amount), platformFee: Number(bk.platform_fee),
    basePrice: Number(bk.total_amount), selectedAddons: [], bookingId,
  }
  await Promise.all([
    guest?.email && sendEmail({
      to: guest.email,
      subject: `Reserva confirmada — ${space?.name}`,
      html: tplConfirmadaCliente({ ...confirmData, remainingAmount: Number(bk.total_amount) - Number(bk.platform_fee) }),
    }),
    host?.email && sendEmail({
      to: host.email,
      subject: `Reserva confirmada con pago — ${space?.name}`,
      html: tplConfirmadaHost(confirmData),
    }),
  ])

  return { success: true }
}

// ── CANCELAR RESERVA (cliente o host) ─────────────────────
export async function cancelBooking(bookingId: string, reason?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { data: bk } = await supabase
    .from('bookings')
    .select(`*, spaces!space_id(name, host_id, profiles!host_id(full_name, email, google_refresh_token, google_calendar_connected)), profiles!guest_id(full_name, email)`)
    .eq('id', bookingId)
    .single()

  if (!bk) return { error: 'Reserva no encontrada' }

  const space   = bk.spaces as any
  const isGuest = bk.guest_id === user.id
  const isHost  = space?.host_id === user.id

  if (!isGuest && !isHost) return { error: 'No autorizado' }

  const newStatus = isGuest ? 'cancelled_guest' : 'cancelled_host'

  const { error } = await supabase
    .from('bookings')
    .update({
      status: newStatus,
      cancelled_at: new Date().toISOString(),
      cancellation_reason: reason ?? null,
    })
    .eq('id', bookingId)
    .in('status', ['pending', 'quote_requested', 'accepted', 'confirmed'])

  if (error) return { error: error.message }

  // Google Calendar: eliminar evento si existe
  const hostProfile = space?.profiles as any
  if (hostProfile?.google_calendar_connected && hostProfile?.google_refresh_token && (bk as any).google_calendar_event_id) {
    await deleteBookingEvent(hostProfile.google_refresh_token, (bk as any).google_calendar_event_id)
  }

  // Email de cancelación al otro participante
  const guest = bk.profiles as any
  const host  = space?.profiles as any
  const notifyEmail = isGuest ? host?.email : guest?.email
  const notifyName  = isGuest ? host?.full_name : guest?.full_name
  const cancelledBy = isGuest ? guest?.full_name : host?.full_name

  if (notifyEmail) {
    await sendEmail({
      to: notifyEmail,
      subject: `Reserva cancelada — ${space?.name}`,
      html: tplCancelada({
        recipientName: notifyName ?? '',
        cancelledBy: cancelledBy ?? '',
        spaceName: space?.name ?? '',
        eventDate: bk.event_date,
        reason,
        isGuest: !isGuest, // El que recibe es el opuesto
      }),
    })
  }

  return { success: true }
}
