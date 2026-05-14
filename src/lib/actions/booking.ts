'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email/send'
import { formatCurrency, formatDate, formatTime } from '@/lib/utils'
import {
  tplSolicitudCliente, tplSolicitudCotizacionCliente, tplSolicitudHost,
  tplAceptadaCliente, tplConfirmadaCliente, tplConfirmadaHost,
  tplRechazadaCliente, tplCancelada, tplReembolsoPendiente, tplReembolsoPendienteAdmin,
} from '@/lib/email/templates'
import { createBookingEvent, deleteBookingEvent } from '@/lib/google-calendar'
import { createInstallments } from '@/lib/actions/installments'
export type { BookingStatus } from '@/lib/bookingConfig'

const SITE        = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://espot.do'
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'contacto@espot.do'

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

  // Validar que la fecha no sea pasada
  const today = new Date().toISOString().split('T')[0]
  if (payload.eventDate < today) return { error: 'No puedes reservar para una fecha pasada' }

  // Obtener perfil del guest
  const guestProfile = user ? await supabase
    .from('profiles').select('full_name, email, phone').eq('id', user.id).single()
    .then(r => r.error ? null : r.data) : null

  // ── Validar min/max horas según configuración del pricing ──
  if (payload.pricingId && payload.startTime && payload.endTime) {
    const { data: pricingCheck } = await supabase
      .from('space_pricing')
      .select('min_hours, max_hours, session_hours, package_hours, extra_hour_price, pricing_type, hourly_price, minimum_consumption, fixed_price, weekend_multiplier')
      .eq('id', payload.pricingId)
      .single()

    if (pricingCheck) {
      // Calcular horas seleccionadas (maneja medianoche)
      const sn = parseInt(payload.startTime.split(':')[0] || '0') * 60 + parseInt(payload.startTime.split(':')[1] || '0')
      let   en = parseInt(payload.endTime.split(':')[0]   || '0') * 60 + parseInt(payload.endTime.split(':')[1]   || '0')
      if (en <= sn) en += 24 * 60  // cruce de medianoche
      const selectedH = Math.max(0, (en - sn) / 60)

      const minH  = pricingCheck.min_hours    ?? 0
      const maxH  = pricingCheck.max_hours    ?? 0
      const sessH = pricingCheck.session_hours ?? 0
      const pkgH  = pricingCheck.package_hours ?? 0
      const hasExtra = Number(pricingCheck.extra_hour_price) > 0

      // Calcular límite máximo efectivo (igual que en BookingWidget)
      const effectiveMax = (() => {
        if (maxH > 0) return maxH
        if (pkgH > 0 && !hasExtra) return pkgH
        if (pricingCheck.pricing_type === 'minimum_consumption' && sessH > 0) return sessH
        return 0
      })()

      if (minH > 0 && selectedH < minH)
        return { error: `Este Espot requiere mínimo ${minH} hora${minH > 1 ? 's' : ''} de reserva.` }
      if (effectiveMax > 0 && selectedH > effectiveMax + 0.25)
        return { error: `El máximo para este espacio es ${effectiveMax} hora${effectiveMax !== 1 ? 's' : ''}. Selecciona un horario dentro de ese rango.` }

      // Validar basePrice para evitar manipulación: recalcular precio esperado en servidor
      if (pricingCheck.pricing_type !== 'custom_quote') {
        let expectedBase = 0
        if (pricingCheck.pricing_type === 'hourly') {
          expectedBase = (Number(pricingCheck.hourly_price) || 0) * selectedH
        } else if (pricingCheck.pricing_type === 'minimum_consumption') {
          expectedBase = Number(pricingCheck.minimum_consumption) || 0
        } else if (pricingCheck.pricing_type === 'fixed_package') {
          const extra = Math.max(0, selectedH - (pricingCheck.package_hours ?? 0))
          expectedBase = (Number(pricingCheck.fixed_price) || 0) + extra * (Number(pricingCheck.extra_hour_price) || 0)
        }
        // Aplicar multiplicador de fin de semana si corresponde
        const wm = Number(pricingCheck.weekend_multiplier ?? 1)
        if (wm !== 1 && payload.eventDate) {
          const dow = new Date(payload.eventDate + 'T12:00').getDay()
          if (dow === 0 || dow === 5 || dow === 6) {
            expectedBase = Math.round(expectedBase * wm)
          }
        }
        // Tolerancia de RD$1 por redondeo
        if (expectedBase > 0 && Math.abs(Number(payload.basePrice) - expectedBase) > 1) {
          return { error: 'El precio del evento no coincide con la tarifa actual del espacio. Por favor recarga la página y vuelve a intentarlo.' }
        }
      }
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

  // Guardar addons seleccionados con subtotales correctos por unidad
  if (payload.selectedAddonIds.length > 0) {
    const { data: addonData } = await supabase
      .from('space_addons').select('id, name, price, unit')
      .eq('space_id', payload.spaceId)
      .in('id', payload.selectedAddonIds)

    if (addonData?.length) {
      // Calcular horas seleccionadas (para addons por hora)
      let selectedH = 0
      if (payload.startTime && payload.endTime) {
        const sn = parseInt(payload.startTime.split(':')[0]) * 60 + parseInt(payload.startTime.split(':')[1] || '0')
        let en   = parseInt(payload.endTime.split(':')[0])   * 60 + parseInt(payload.endTime.split(':')[1]   || '0')
        if (en <= sn) en += 24 * 60
        selectedH = Math.max(0, (en - sn) / 60)
      }

      const { error: addonInsertError } = await supabase.from('booking_addons').insert(
        addonData.map((a: any) => {
          const qty = a.unit === 'persona' ? payload.guestCount
                    : a.unit === 'hora'    ? Math.max(1, Math.round(selectedH))
                    : 1
          const subtotal = a.unit === 'persona' ? a.price * payload.guestCount
                         : a.unit === 'hora'    ? Math.round(a.price * selectedH)
                         : a.price
          return { booking_id: booking.id, addon_id: a.id, quantity: qty, unit_price: a.price, subtotal }
        })
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
  await Promise.allSettled([
    guestEmail && sendEmail({
      to: guestEmail,
      subject: isQuote ? `Cotización solicitada — ${spaceName}` : `Solicitud recibida — ${spaceName}`,
      html: isQuote ? tplSolicitudCotizacionCliente(bookingData) : tplSolicitudCliente(bookingData),
    }),
    hostEmail && sendEmail({
      to: hostEmail,
      subject: isQuote ? `Nueva solicitud de cotización — ${spaceName}` : `Nueva solicitud de reserva — ${spaceName}`,
      html: tplSolicitudHost({ ...bookingData, isQuote }),
    }),
  ])

  // Para reservas instantáneas: crear cuotas inmediatamente (saltean acceptBooking)
  if (isInstant) {
    const instResult = await createInstallments(booking.id, payload.eventDate, payload.totalAmount)
    if (!instResult.success) console.error('[createBooking] installments failed:', instResult.error)
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

  const { error, data: updated } = await supabase
    .from('bookings')
    .update({ status: 'accepted', accepted_at: new Date().toISOString() })
    .eq('id', bookingId)
    .in('status', ['pending', 'quote_requested'])
    .select('id')

  if (error) return { error: error.message }
  if (!updated || updated.length === 0) return { error: 'La reserva ya fue procesada o no existe' }

  // Crear schedule de cuotas al aceptar
  await createInstallments(bookingId, bk.event_date, Number(bk.total_amount))

  const guest = bk.profiles as any

  revalidatePath('/dashboard/host/reservas')
  revalidatePath('/dashboard/reservas')

  await Promise.allSettled([
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
        basePrice: Number(bk.base_price ?? bk.total_amount), selectedAddons: [], bookingId,
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

  // Verificar si hay cuotas ya pagadas
  const { data: paidInstalls } = await supabase
    .from('booking_installments')
    .select('amount')
    .eq('booking_id', bookingId)
    .eq('status', 'paid')
  const paidAmount = paidInstalls?.reduce((sum, i) => sum + Number(i.amount), 0) ?? 0

  const { error, data: rejUpdated } = await supabase
    .from('bookings')
    .update({
      status: 'rejected',
      rejected_at: new Date().toISOString(),
      rejection_reason: reason ?? null,
    })
    .eq('id', bookingId)
    .in('status', ['pending', 'quote_requested', 'accepted'])
    .select('id')

  if (error) return { error: error.message }
  if (!rejUpdated || rejUpdated.length === 0) return { error: 'La reserva no se puede rechazar en su estado actual' }

  // Google Calendar: eliminar evento si existe
  const host = space?.profiles as any
  if (host?.google_calendar_connected && host?.google_refresh_token && (bk as any).google_calendar_event_id) {
    await deleteBookingEvent(host.google_refresh_token, (bk as any).google_calendar_event_id)
  }

  const guest      = bk.profiles as any
  const guestEmail = guest?.email ?? ''
  const guestName  = guest?.full_name ?? 'Cliente'
  const hostName   = host?.full_name ?? 'Propietario'

  if (paidAmount > 0) {
    // Reserva ya pagada rechazada → reembolso pendiente
    await Promise.allSettled([
      guestEmail && sendEmail({
        to: guestEmail,
        subject: `Reembolso en proceso — ${space?.name}`,
        html: tplReembolsoPendiente({
          guestName,
          spaceName: space?.name ?? '',
          eventDate: bk.event_date,
          paidAmount,
          bookingId,
        }),
      }),
      sendEmail({
        to: ADMIN_EMAIL,
        subject: `⚠️ Reembolso pendiente (rechazo) — ${space?.name} (${bookingId.slice(0, 8).toUpperCase()})`,
        html: tplReembolsoPendienteAdmin({
          guestName,
          guestEmail,
          spaceName: space?.name ?? '',
          eventDate: bk.event_date,
          paidAmount,
          bookingId,
          cancelledBy: `Propietario (${hostName}) — rechazo`,
        }),
      }),
    ])
  } else if (guestEmail) {
    await sendEmail({
      to: guestEmail,
      subject: `El espacio no está disponible — ${space?.name}`,
      html: tplRechazadaCliente({
        guestName,
        spaceName: space?.name ?? '',
        eventDate: bk.event_date,
        reason,
      }),
    })
  }

  revalidatePath('/dashboard/host/reservas')
  revalidatePath('/dashboard/reservas')
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
    basePrice: Number(bk.base_price), selectedAddons: [], bookingId,
  }
  await Promise.allSettled([
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
export interface RefundBankInfo {
  holderName:    string
  bank:          string
  accountNumber: string
  accountType:   string
}

export async function cancelBooking(bookingId: string, reason?: string, refundBankInfo?: RefundBankInfo) {
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

  // Verificar si hay cuotas ya pagadas (para gestionar reembolso)
  const { data: paidInstallments } = await supabase
    .from('booking_installments')
    .select('amount')
    .eq('booking_id', bookingId)
    .eq('status', 'paid')
  const paidAmount = paidInstallments?.reduce((sum, i) => sum + Number(i.amount), 0) ?? 0

  const newStatus = isGuest ? 'cancelled_guest' : 'cancelled_host'

  const { error, data: cancelUpdated } = await supabase
    .from('bookings')
    .update({
      status: newStatus,
      cancelled_at: new Date().toISOString(),
      cancellation_reason: reason ?? null,
    })
    .eq('id', bookingId)
    .in('status', ['pending', 'quote_requested', 'accepted', 'confirmed'])
    .select('id')

  if (error) return { error: error.message }
  if (!cancelUpdated || cancelUpdated.length === 0) return { error: 'La reserva no se puede cancelar en su estado actual' }

  // Google Calendar: eliminar evento si existe
  const hostProfile = space?.profiles as any
  if (hostProfile?.google_calendar_connected && hostProfile?.google_refresh_token && (bk as any).google_calendar_event_id) {
    await deleteBookingEvent(hostProfile.google_refresh_token, (bk as any).google_calendar_event_id)
  }

  const guest       = bk.profiles as any
  const host        = space?.profiles as any
  const guestEmail  = guest?.email ?? ''
  const guestName   = guest?.full_name ?? 'Cliente'
  const notifyEmail = isGuest ? host?.email : guest?.email
  const notifyName  = isGuest ? host?.full_name : guest?.full_name
  const cancelledBy = isGuest ? guestName : (host?.full_name ?? 'Propietario')

  // Si hay cuotas pagadas → email de reembolso al cliente + alerta al admin
  if (paidAmount > 0) {
    await Promise.allSettled([
      guestEmail && sendEmail({
        to: guestEmail,
        subject: `Reembolso en proceso — ${space?.name}`,
        html: tplReembolsoPendiente({
          guestName,
          spaceName: space?.name ?? '',
          eventDate: bk.event_date,
          paidAmount,
          bookingId,
        }),
      }),
      sendEmail({
        to: ADMIN_EMAIL,
        subject: `⚠️ Reembolso pendiente — ${space?.name} (${bookingId.slice(0, 8).toUpperCase()})`,
        html: tplReembolsoPendienteAdmin({
          guestName,
          guestEmail,
          spaceName: space?.name ?? '',
          eventDate: bk.event_date,
          paidAmount,
          bookingId,
          cancelledBy,
          refundBankInfo,
        }),
      }),
      // Notificar al otro participante (host si cancela guest, viceversa)
      notifyEmail && sendEmail({
        to: notifyEmail,
        subject: `Reserva cancelada — ${space?.name}`,
        html: tplCancelada({
          recipientName: notifyName ?? '',
          cancelledBy,
          spaceName: space?.name ?? '',
          eventDate: bk.event_date,
          reason,
          isGuest: !isGuest,
        }),
      }),
    ])
  } else {
    // Sin pagos — email de cancelación estándar
    if (notifyEmail) {
      await sendEmail({
        to: notifyEmail,
        subject: `Reserva cancelada — ${space?.name}`,
        html: tplCancelada({
          recipientName: notifyName ?? '',
          cancelledBy,
          spaceName: space?.name ?? '',
          eventDate: bk.event_date,
          reason,
          isGuest: !isGuest,
        }),
      })
    }
  }

  revalidatePath('/dashboard/host/reservas')
  revalidatePath('/dashboard/reservas')
  return { success: true }
}
