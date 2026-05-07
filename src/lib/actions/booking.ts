'use server'

import { createClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email/send'
import { sendWhatsApp } from '@/lib/whatsapp/send'
import { formatCurrency, formatDate, formatTime } from '@/lib/utils'
import { createBookingEvent, deleteBookingEvent } from '@/lib/google-calendar'
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
    .then(r => r.data) : null

  // ── Validar min/max horas según configuración del pricing ──
  if (payload.pricingId && payload.startTime && payload.endTime) {
    const { data: pricingCheck } = await supabase
      .from('space_pricing')
      .select('min_hours, max_hours, session_hours, package_hours, extra_hour_price, pricing_type')
      .eq('id', payload.pricingId)
      .single()

    if (pricingCheck) {
      // Calcular horas seleccionadas (maneja medianoche)
      const sh = parseInt(payload.startTime.split(':')[0])
      const eh = parseInt(payload.endTime.split(':')[0])
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

  // Determinar si es cotización
  let isQuote = false
  if (payload.pricingId) {
    const { data: pricingRow } = await supabase
      .from('space_pricing').select('pricing_type').eq('id', payload.pricingId).single()
    isQuote = pricingRow?.pricing_type === 'custom_quote'
  }

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
      base_price:   payload.basePrice,
      addons_total: payload.addonsTotal,
      platform_fee: payload.platformFee,
      total_amount: payload.totalAmount,
      status:       isQuote ? 'quote_requested' : 'pending',
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
      await supabase.from('booking_addons').insert(
        addonData.map(a => ({
          booking_id: booking.id, addon_id: a.id,
          quantity: 1, unit_price: a.price, subtotal: a.price,
        }))
      )
    }
  }

  // ── Emails automáticos ────────────────────────────────
  const host = space.profiles as any
  const guestName  = guestProfile?.full_name ?? 'Cliente'
  const guestEmail = guestProfile?.email ?? user?.email ?? ''
  const hostEmail  = host?.email ?? ''
  const spaceName  = space.name
  const eventInfo  = `${formatDate(payload.eventDate)} · ${formatTime(payload.startTime)} – ${formatTime(payload.endTime)} · ${payload.guestCount} personas`

  await Promise.all([
    // Email al cliente
    guestEmail && sendEmail({
      to: guestEmail,
      subject: `✅ Solicitud recibida — ${spaceName}`,
      html: emailTemplate({
        title: '¡Solicitud enviada!',
        subtitle: 'El propietario revisará tu solicitud y responderá en menos de 24 horas.',
        color: '#2563EB',
        emoji: '📋',
        body: `
          <p>Hola <strong>${guestName}</strong>,</p>
          <p>Tu solicitud de reserva fue enviada a <strong>${spaceName}</strong>.</p>
          ${infoBox([
            { label: 'Evento', value: payload.eventType },
            { label: 'Fecha y horario', value: eventInfo },
            { label: 'Total del evento', value: formatCurrency(payload.totalAmount) },
            { label: 'Estado', value: '⏳ Pendiente de aceptación' },
          ])}
          <p style="color:#6B7280;font-size:13px;">
            Recibirás un email cuando el propietario acepte o rechace tu solicitud.
          </p>`,
        cta: { text: 'Ver mis reservas', url: `${SITE}/dashboard/reservas` },
      }),
    }),
    // Email al host
    hostEmail && sendEmail({
      to: hostEmail,
      subject: `🔔 Nueva solicitud de reserva — ${spaceName}`,
      html: emailTemplate({
        title: '¡Nueva solicitud de reserva!',
        subtitle: 'Tienes 24 horas para aceptar o rechazar.',
        color: '#35C493',
        emoji: '🔔',
        body: `
          <p>Hola <strong>${host?.full_name}</strong>,</p>
          <p><strong>${guestName}</strong> quiere reservar <strong>${spaceName}</strong>.</p>
          ${infoBox([
            { label: 'Cliente', value: `${guestName} (${guestEmail})` },
            { label: 'Evento', value: payload.eventType },
            { label: 'Fecha y horario', value: eventInfo },
            { label: 'Total del evento', value: formatCurrency(payload.totalAmount) },
            { label: 'Tu comisión Espot', value: formatCurrency(payload.platformFee) },
          ])}`,
        cta: { text: 'Ver en mi panel', url: `${SITE}/dashboard/host/reservas` },
      }),
    }),
    // WhatsApp al host
    host?.phone && sendWhatsApp({
      to: host.phone,
      body: `🔔 *Nueva reserva en ${spaceName}*\n\nCliente: ${guestName}\nEvento: ${payload.eventType}\n${eventInfo}\nTotal: ${formatCurrency(payload.totalAmount)}\n\nRevisa tu panel: ${SITE}/dashboard/host/reservas`,
    }),
  ])

  return { success: true, bookingId: booking.id, status: isQuote ? 'quote_requested' : 'pending' }
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

  const guest = bk.profiles as any
  const depositAmount = formatCurrency(Number(bk.platform_fee))

  await Promise.all([
    // Email al cliente
    guest?.email && sendEmail({
      to: guest.email,
      subject: `🎉 Reserva aceptada — ${space?.name}`,
      html: emailTemplate({
        title: '¡Tu reserva fue aceptada!',
        subtitle: 'Completa el pago del depósito para confirmar tu fecha.',
        color: '#16A34A',
        emoji: '🎉',
        body: `
          <p>Hola <strong>${guest.full_name}</strong>,</p>
          <p>El propietario de <strong>${space?.name}</strong> aceptó tu solicitud.</p>
          ${infoBox([
            { label: 'Evento', value: bk.event_type },
            { label: 'Fecha', value: formatDate(bk.event_date) },
            { label: 'Horario', value: `${formatTime(bk.start_time)} – ${formatTime(bk.end_time)}` },
            { label: 'Depósito a pagar (10%)', value: depositAmount },
            { label: 'Total del evento', value: formatCurrency(Number(bk.total_amount)) },
          ])}
          <p style="color:#16A34A;font-weight:bold;">
            Paga el depósito del 10% para asegurar tu fecha.
          </p>`,
        cta: { text: 'Completar pago ahora', url: `${SITE}/pago/${bookingId}` },
      }),
    }),
    // WhatsApp al cliente
    guest?.phone && sendWhatsApp({
      to: guest.phone,
      body: `🎉 *¡Tu reserva fue aceptada!*\n\nEspacio: ${space?.name}\nFecha: ${formatDate(bk.event_date)}\n\nCompleta el pago para confirmar tu lugar:\n${SITE}/dashboard/reservas`,
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
      subject: `Actualización sobre tu reserva en ${space?.name}`,
      html: emailTemplate({
        title: 'Reserva no disponible',
        subtitle: 'El propietario no pudo aceptar tu solicitud para esa fecha.',
        color: '#DC2626',
        emoji: '📅',
        body: `
          <p>Hola <strong>${guest.full_name}</strong>,</p>
          <p>Lamentablemente el propietario de <strong>${space?.name}</strong> no pudo aceptar tu solicitud para el ${formatDate(bk.event_date)}.</p>
          ${reason ? `<p>Motivo: <em>${reason}</em></p>` : ''}
          <p>Te invitamos a explorar otros espacios disponibles.</p>`,
        cta: { text: 'Ver otros espacios', url: `${SITE}/buscar` },
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

  // Registrar el pago
  await supabase.from('payments').insert({
    booking_id:     bookingId,
    amount:         bk.platform_fee,
    currency:       'DOP',
    payment_type:   'platform_fee',
    payment_method: 'manual',
    status:         'completed',
    paid_at:        new Date().toISOString(),
  })

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

  await Promise.all([
    // Email de confirmación al cliente
    guest?.email && sendEmail({
      to: guest.email,
      subject: `🎊 ¡Reserva confirmada! — ${space?.name}`,
      html: emailTemplate({
        title: '¡Reserva confirmada!',
        subtitle: 'Tu evento está asegurado. ¡Nos vemos pronto!',
        color: '#16A34A',
        emoji: '🎊',
        body: `
          <p>Hola <strong>${guest.full_name}</strong>,</p>
          <p>Tu reserva en <strong>${space?.name}</strong> está confirmada.</p>
          ${infoBox([
            { label: 'Evento', value: bk.event_type },
            { label: 'Fecha', value: formatDate(bk.event_date) },
            { label: 'Horario', value: `${formatTime(bk.start_time)} – ${formatTime(bk.end_time)}` },
            { label: 'Personas', value: String(bk.guest_count) },
            { label: 'Dirección', value: `${space?.address}, ${space?.city}` },
            { label: 'Pagaste (10%)', value: formatCurrency(Number(bk.platform_fee)) },
            { label: 'Resta pagar en el espacio', value: remainingAmount },
          ])}`,
        cta: { text: 'Ver mi reserva', url: `${SITE}/dashboard/reservas` },
      }),
    }),
    // Email al host: reserva confirmada y pagada
    host?.email && sendEmail({
      to: host.email,
      subject: `✅ Reserva confirmada con pago — ${space?.name}`,
      html: emailTemplate({
        title: 'Pago recibido — Reserva confirmada',
        subtitle: `${guest?.full_name} completó el pago de la reserva.`,
        color: '#35C493',
        emoji: '💰',
        body: `
          <p>Hola <strong>${host.full_name}</strong>,</p>
          <p><strong>${guest?.full_name}</strong> confirmó y pagó su reserva en <strong>${space?.name}</strong>.</p>
          ${infoBox([
            { label: 'Cliente', value: guest?.full_name ?? '—' },
            { label: 'Evento', value: bk.event_type },
            { label: 'Fecha', value: formatDate(bk.event_date) },
            { label: 'Total del evento', value: formatCurrency(Number(bk.total_amount)) },
            { label: 'Comisión Espot (cobrada)', value: formatCurrency(Number(bk.platform_fee)) },
          ])}`,
        cta: { text: 'Ver en mi panel', url: `${SITE}/dashboard/host/reservas` },
      }),
    }),
    // WhatsApp al cliente: confirmación
    guest?.phone && sendWhatsApp({
      to: guest.phone,
      body: `🎊 *¡Reserva confirmada!*\n\nEspacio: ${space?.name}\nFecha: ${formatDate(bk.event_date)}\nHorario: ${formatTime(bk.start_time)} – ${formatTime(bk.end_time)}\nDirección: ${space?.address}, ${space?.city}\n\n💰 Resta pagar en el espacio: ${remainingAmount}\n\n¡Nos vemos pronto!`,
    }),
    // WhatsApp al host: pago recibido
    host?.phone && sendWhatsApp({
      to: host.phone,
      body: `💰 *Pago recibido — Reserva confirmada*\n\nCliente: ${guest?.full_name}\nEspacio: ${space?.name}\nFecha: ${formatDate(bk.event_date)}\nTotal del evento: ${formatCurrency(Number(bk.total_amount))}\n\nVe los detalles: ${SITE}/dashboard/host/reservas`,
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
      html: emailTemplate({
        title: 'Reserva cancelada',
        subtitle: '',
        color: '#DC2626',
        emoji: '❌',
        body: `
          <p>Hola <strong>${notifyName}</strong>,</p>
          <p>La reserva en <strong>${space?.name}</strong> para el ${formatDate(bk.event_date)} fue cancelada por ${cancelledBy}.</p>
          ${reason ? `<p>Motivo: <em>${reason}</em></p>` : ''}`,
        cta: { text: 'Ver detalles', url: `${SITE}/dashboard` },
      }),
    })
  }

  return { success: true }
}

// ── HELPERS PARA EMAILS ───────────────────────────────────
function infoBox(rows: { label: string; value: string }[]) {
  return `
    <table style="width:100%;border-collapse:collapse;border-radius:12px;overflow:hidden;margin:16px 0;background:#F8FAFB;border:1px solid #E8ECF0;">
      ${rows.map(r => `
        <tr>
          <td style="padding:10px 16px;font-size:13px;color:#6B7280;border-bottom:1px solid #E8ECF0;width:40%">${r.label}</td>
          <td style="padding:10px 16px;font-size:13px;color:#0F1623;font-weight:600;border-bottom:1px solid #E8ECF0;">${r.value}</td>
        </tr>
      `).join('')}
    </table>`
}

function emailTemplate({ title, subtitle, color, emoji, body, cta }: {
  title: string; subtitle: string; color: string; emoji: string
  body: string; cta: { text: string; url: string }
}) {
  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F4F6F8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:32px 20px;">

    <!-- Logo -->
    <div style="text-align:center;margin-bottom:24px;">
      <div style="display:inline-flex;align-items:center;gap:8px;">
        <div style="width:32px;height:32px;background:#35C493;border-radius:8px;display:inline-flex;align-items:center;justify-content:center;">
          <span style="color:#fff;font-weight:bold;font-size:16px;">E</span>
        </div>
        <span style="color:#0F1623;font-size:20px;font-weight:bold;">espot<span style="color:#35C493;font-weight:300;">.do</span></span>
      </div>
    </div>

    <!-- Card -->
    <div style="background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.06);">

      <!-- Header -->
      <div style="background:${color};padding:28px 32px;text-align:center;">
        <div style="font-size:36px;margin-bottom:8px;">${emoji}</div>
        <h1 style="color:#fff;font-size:20px;font-weight:bold;margin:0 0 6px;">${title}</h1>
        ${subtitle ? `<p style="color:rgba(255,255,255,0.8);font-size:13px;margin:0;">${subtitle}</p>` : ''}
      </div>

      <!-- Body -->
      <div style="padding:28px 32px;color:#374151;font-size:14px;line-height:1.7;">
        ${body}
      </div>

      <!-- CTA -->
      <div style="padding:0 32px 28px;text-align:center;">
        <a href="${cta.url}"
          style="display:inline-block;background:#35C493;color:#fff;font-size:14px;font-weight:bold;padding:14px 32px;border-radius:12px;text-decoration:none;">
          ${cta.text} →
        </a>
      </div>
    </div>

    <p style="color:#9CA3AF;font-size:11px;text-align:center;margin-top:20px;">
      © 2026 espot.do · República Dominicana
    </p>
  </div>
</body></html>`
}
