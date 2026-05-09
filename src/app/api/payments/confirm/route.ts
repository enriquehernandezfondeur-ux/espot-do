import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyResponseHash, type AzulResponseParams } from '@/lib/azul/client'
import { sendEmail } from '@/lib/email/send'
import { tplPagoCompletado } from '@/lib/email/templates'
import { formatCurrency, formatDate, formatTime } from '@/lib/utils'

// POST /api/payments/confirm
// Body: los query params que Azul envió al ApprovedUrl
// Verifica la firma HMAC y confirma la reserva en la base de datos.
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  let body: AzulResponseParams & { bookingId: string }
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
  }

  const { bookingId, ...azulParams } = body
  if (!bookingId) return NextResponse.json({ error: 'bookingId requerido' }, { status: 400 })

  // Verificar que IsoCode sea "00" (aprobado)
  if (azulParams.IsoCode !== '00') {
    return NextResponse.json({ error: 'Pago no aprobado', isoCode: azulParams.IsoCode }, { status: 400 })
  }

  // Verificar firma HMAC — protege contra manipulación de query params
  const isValid = verifyResponseHash(azulParams)
  if (!isValid) {
    console.error('[Azul confirm] Hash inválido para booking', bookingId, azulParams)
    return NextResponse.json({ error: 'Firma de respuesta inválida' }, { status: 400 })
  }

  // Obtener reserva
  const { data: booking } = await supabase
    .from('bookings')
    .select(`
      *,
      spaces!space_id(id, name, address, city, sector, profiles!host_id(id, full_name, email)),
      profiles!guest_id(full_name, email)
    `)
    .eq('id', bookingId)
    .eq('guest_id', user.id)
    .single()

  if (!booking) return NextResponse.json({ error: 'Reserva no encontrada' }, { status: 404 })

  // Idempotencia — si ya fue confirmada, devolver éxito sin reprocesar
  if (booking.payment_status === 'advance') {
    return NextResponse.json({ success: true, already: true })
  }

  const space  = booking.spaces as any
  const host   = space?.profiles as any
  const guest  = booking.profiles as any

  // Convertir Amount de centavos a pesos
  const commissionAmt = Number(azulParams.Amount) / 100
  const totalAmount   = Number(booking.total_amount)
  const commissionPct = totalAmount > 0 ? Math.round((commissionAmt / totalAmount) * 100) : 10
  const netToHost     = Math.round((totalAmount - commissionAmt) * 100) / 100

  // Confirmar booking
  await supabase.from('bookings').update({
    status:             'confirmed',
    payment_status:     'advance',
    paid_amount:        commissionAmt,
    paid_at:            new Date().toISOString(),
    confirmed_at:       new Date().toISOString(),
    platform_fee:       commissionAmt,
    azul_order_id:      azulParams.AzulOrderId,
    azul_auth_code:     azulParams.AuthorizationCode,
    azul_response_code: azulParams.IsoCode,
    payout_status:      'pending',
    commission_status:  'collected',
  }).eq('id', bookingId)

  // Registrar en liquidaciones
  await supabase.from('liquidaciones').upsert({
    booking_id:       bookingId,
    host_id:          host?.id ?? space?.host_id,
    space_id:         space?.id,
    total_reserva:    totalAmount,
    comision_pct:     commissionPct,
    comision_monto:   commissionAmt,
    neto_propietario: netToHost,
    estado:           'pendiente',
  }, { onConflict: 'booking_id' })

  // Registrar en payments
  await supabase.from('payments').insert({
    booking_id:     bookingId,
    amount:         commissionAmt,
    currency:       'DOP',
    payment_type:   'deposit',
    payment_method: 'azul',
    status:         'completed',
    paid_at:        new Date().toISOString(),
  })

  const SITE       = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://espothub.com'
  const spaceName  = space?.name       ?? 'Espacio'
  const guestName  = guest?.full_name  ?? 'Cliente'
  const guestEmail = guest?.email      ?? user.email ?? ''
  const hostEmail  = host?.email       ?? ''
  const eventInfo  = `${formatDate(booking.event_date)} · ${formatTime(booking.start_time)} – ${formatTime(booking.end_time)} · ${booking.guest_count} personas`

  const paymentData = {
    spaceName, guestName,
    eventDate: booking.event_date,
    eventInfo,
    totalAmount,
    commissionAmount: commissionAmt,
    netAmount: netToHost,
    azulOrderId: azulParams.AzulOrderId,
    siteUrl: SITE,
  }

  // allSettled — un email fallando no debe revertir un pago ya procesado
  await Promise.allSettled([
    guestEmail && sendEmail({
      to:      guestEmail,
      subject: `Reserva confirmada — ${spaceName}`,
      html:    tplPagoCompletado({ ...paymentData, recipientName: guestName }),
    }),

    hostEmail && sendEmail({
      to:      hostEmail,
      subject: `Pago recibido — Reserva confirmada en ${spaceName}`,
      html:    tplPagoCompletado({ ...paymentData, recipientName: host?.full_name ?? 'Propietario', isHost: true }),
    }),

    sendEmail({
      to:      process.env.ADMIN_EMAIL ?? 'enriquehernandezfondeur@gmail.com',
      subject: `Nueva reserva pagada — ${spaceName} | ${formatCurrency(totalAmount)}`,
      html:    tplPagoCompletado({ ...paymentData, recipientName: 'Admin', isAdmin: true }),
    }),
  ])

  return NextResponse.json({ success: true, azulOrderId: azulParams.AzulOrderId })
}

