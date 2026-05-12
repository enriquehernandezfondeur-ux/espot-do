import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyResponseHash, type AzulResponseParams } from '@/lib/azul/client'
import { sendEmail } from '@/lib/email/send'
import { tplPagoCompletado } from '@/lib/email/templates'
import { formatCurrency, formatDate, formatTime } from '@/lib/utils'
import { markInstallmentPaid } from '@/lib/actions/installments'

// POST /api/payments/confirm
// Body: los query params que Azul envió al ApprovedUrl
// Verifica la firma HMAC y confirma la reserva en la base de datos.
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  let body: AzulResponseParams & { bookingId: string; cuotaId?: string }
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
  }

  const { bookingId, cuotaId, ...azulParams } = body
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

  // Idempotencia — si ya fue confirmada y no es pago de cuota adicional, no reprocesar
  if (booking.payment_status === 'advance' && !cuotaId) {
    return NextResponse.json({ success: true, already: true })
  }

  const space  = booking.spaces as any
  const host   = space?.profiles as any
  const guest  = booking.profiles as any

  // paidAmount = lo que Azul cobró en esta transacción (centavos → pesos)
  const paidAmount    = Math.round(Number(azulParams.Amount)) / 100
  const totalAmount   = Number(booking.total_amount)
  // Comisión fija 10% sobre el total de la reserva (no sobre el depósito parcial)
  const commissionAmt = Math.round(totalAmount * 0.10)
  const commissionPct = 10
  const netToHost     = Math.round(totalAmount * 0.90)

  // Si es pago de cuota específica, marcarla como pagada
  if (cuotaId) {
    await markInstallmentPaid(cuotaId, azulParams.AzulOrderId)
  }

  // Actualizar booking — solo sobrescribir confirmed_at si es el PRIMER pago
  // (evitar que cuotas 2 y 3 reseteen la fecha de confirmación original)
  const isFirstConfirmation = booking.status !== 'confirmed'
  const { error: updateError } = await supabase.from('bookings').update({
    status:             'confirmed',
    payment_status:     'advance',
    paid_amount:        paidAmount,        // monto real pagado en esta transacción
    paid_at:            new Date().toISOString(),
    ...(isFirstConfirmation ? { confirmed_at: new Date().toISOString() } : {}),
    platform_fee:       commissionAmt,     // 10% del total (comisión real)
    azul_order_id:      azulParams.AzulOrderId,
    azul_auth_code:     azulParams.AuthorizationCode,
    azul_response_code: azulParams.IsoCode,
    payout_status:      'pending',
    commission_status:  'collected',
  }).eq('id', bookingId)
  if (updateError) return NextResponse.json({ error: 'Error al confirmar la reserva' }, { status: 500 })

  // Registrar en liquidaciones
  const { error: liqErr } = await supabase.from('liquidaciones').upsert({
    booking_id:       bookingId,
    host_id:          host?.id ?? space?.host_id,
    space_id:         space?.id,
    total_reserva:    totalAmount,
    comision_pct:     commissionPct,
    comision_monto:   commissionAmt,
    neto_propietario: netToHost,
    estado:           'pendiente',
  }, { onConflict: 'booking_id' })
  if (liqErr) console.error('[confirm] liquidaciones upsert failed:', liqErr.message)

  // Registrar en payments
  const { error: payErr } = await supabase.from('payments').insert({
    booking_id:     bookingId,
    amount:         paidAmount,    // monto real cobrado por Azul
    currency:       'DOP',
    payment_type:   'deposit',
    payment_method: 'azul',
    status:         'completed',
    paid_at:        new Date().toISOString(),
  })
  if (payErr) console.error('[confirm] payments insert failed:', payErr.message)

  const SITE       = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://espot.do'
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

