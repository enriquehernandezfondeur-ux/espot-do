'use server'

import { createClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email/send'
import { bookingConfirmationGuest, newBookingHost } from '@/lib/email/templates'

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
  // Guest info (cuando no está logueado)
  guestName?: string
  guestEmail?: string
  guestPhone?: string
}

export async function createBooking(payload: CreateBookingPayload) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  // Determinar nombre y email del cliente
  let guestId: string | null = null
  let guestName = payload.guestName ?? 'Cliente'
  let guestEmail = payload.guestEmail ?? ''

  if (user) {
    guestId = user.id
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', user.id)
      .single()
    guestName = profile?.full_name ?? guestName
    guestEmail = profile?.email ?? user.email ?? guestEmail
  } else if (!payload.guestEmail) {
    return { error: 'Ingresa tu email para continuar' }
  }

  // Fetch space + host info
  const { data: space } = await supabase
    .from('spaces')
    .select('id, name, address, city, sector, host_id, profiles!host_id(full_name, email)')
    .eq('id', payload.spaceId)
    .single()

  if (!space) return { error: 'Espacio no encontrado' }

  // Fetch selected addons
  const { data: addonData } = payload.selectedAddonIds.length > 0
    ? await supabase.from('space_addons').select('id, name, price').in('id', payload.selectedAddonIds)
    : { data: [] }

  // Crear la reserva — guest_id puede ser null para invitados
  const { data: booking, error: bookingError } = await supabase
    .from('bookings')
    .insert({
      space_id: payload.spaceId,
      guest_id: guestId,
      pricing_id: payload.pricingId ?? null,
      event_date: payload.eventDate,
      start_time: payload.startTime,
      end_time: payload.endTime,
      guest_count: payload.guestCount,
      event_type: payload.eventType,
      event_notes: payload.eventNotes ?? null,
      base_price: payload.basePrice,
      addons_total: payload.addonsTotal,
      platform_fee: payload.platformFee,
      total_amount: payload.totalAmount,
      status: 'pending',
      payment_status: 'unpaid',
    })
    .select('id')
    .single()

  if (bookingError) return { error: bookingError.message }

  // Guardar addons de la reserva
  if (payload.selectedAddonIds.length > 0 && addonData) {
    await supabase.from('booking_addons').insert(
      addonData.map(a => ({
        booking_id: booking.id,
        addon_id: a.id,
        quantity: 1,
        unit_price: a.price,
        subtotal: a.price,
      }))
    )
  }

  // Enviar emails en paralelo
  const host = space.profiles as any
  const emailData = {
    guestName,
    guestEmail,
    hostName: host?.full_name ?? 'Propietario',
    hostEmail: host?.email ?? '',
    spaceName: space.name,
    spaceAddress: [space.address, space.sector, space.city].filter(Boolean).join(', '),
    eventDate: payload.eventDate,
    startTime: payload.startTime,
    endTime: payload.endTime,
    eventType: payload.eventType,
    guestCount: payload.guestCount,
    basePrice: payload.basePrice,
    addonsTotal: payload.addonsTotal,
    platformFee: payload.platformFee,
    totalAmount: payload.totalAmount,
    selectedAddons: addonData ?? [],
    bookingId: booking.id,
  }

  await Promise.all([
    guestEmail && sendEmail({
      to: guestEmail,
      subject: `✅ Reserva enviada — ${space.name}`,
      html: bookingConfirmationGuest(emailData),
    }),
    host?.email && sendEmail({
      to: host.email,
      subject: `🔔 Nueva reserva en ${space.name} — ${payload.eventType}`,
      html: newBookingHost(emailData),
    }),
  ])

  return { success: true, bookingId: booking.id }
}
