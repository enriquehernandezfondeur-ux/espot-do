import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyResponseHash, type AzulResponseParams } from '@/lib/azul/client'
import { sendEmail } from '@/lib/email/send'
import { tplPagoCompletado, tplCuotaPagada } from '@/lib/email/templates'
import { formatCurrency, formatDate, formatTime } from '@/lib/utils'
import { markInstallmentPaid, getInstallments } from '@/lib/actions/installments'
import { createBookingEvent } from '@/lib/google-calendar'

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

  // Idempotencia — si ya fue confirmada/pagada y no es pago de cuota adicional, no reprocesar
  const { isPaid: checkPaid } = await import('@/lib/bookingConfig')
  if ((checkPaid(booking.payment_status) || booking.payment_status === 'advance') && !cuotaId) {
    return NextResponse.json({ success: true, already: true })
  }

  // Idempotencia para cuotas: verificar si la cuota específica ya fue pagada
  // y que pertenece a este booking (evita marcar cuota de otra reserva del mismo usuario)
  if (cuotaId) {
    const { data: inst } = await supabase
      .from('booking_installments').select('status')
      .eq('id', cuotaId).eq('booking_id', bookingId).single()
    if (!inst) return NextResponse.json({ error: 'Cuota no encontrada para esta reserva' }, { status: 404 })
    if (inst?.status === 'paid') {
      return NextResponse.json({ success: true, already: true })
    }
  }

  const space  = booking.spaces as any
  const host   = space?.profiles as any
  const guest  = booking.profiles as any

  // paidAmount = lo que Azul cobró en esta transacción (centavos → pesos)
  const paidAmount  = Math.round(Number(azulParams.Amount)) / 100
  const totalAmount = Number(booking.total_amount)

  const commissionPct = 10
  const commissionAmt = Math.round(totalAmount * 0.10)
  const netToHost     = Math.round(totalAmount * 0.90)

  // Si es pago de cuota específica, marcarla como pagada
  if (cuotaId) {
    const markResult = await markInstallmentPaid(cuotaId, azulParams.AzulOrderId)
    if (!markResult.success) {
      console.error('[confirm] markInstallmentPaid failed:', markResult.error, 'cuotaId:', cuotaId)
      // No abortar — el pago ya fue cobrado por Azul; continuar actualizando el booking
    }
  }

  // Calcular paid_amount acumulado (suma de pagos anteriores + este pago)
  const newPaidTotal = Math.round(Number(booking.paid_amount ?? 0) + paidAmount)

  // Determinar payment_status: advance → partial → paid según cuotas completadas
  let newPaymentStatus: 'advance' | 'partial' | 'paid' = 'advance'
  if (cuotaId) {
    const { data: allInsts } = await supabase
      .from('booking_installments').select('status').eq('booking_id', bookingId)
    if (allInsts && allInsts.length > 0) {
      const paidCount = allInsts.filter((i: any) => i.status === 'paid').length
      if (paidCount >= allInsts.length) {
        newPaymentStatus = 'paid'
      } else if (paidCount > 1) {
        newPaymentStatus = 'partial'
      }
    }
  } else {
    // Pago único sin cuotas → siempre pagado completo
    newPaymentStatus = 'paid'
  }

  // Actualizar booking con lock optimista — solo afecta si no fue ya procesado por otra request
  // Esto previene doble inserción en payments si dos tabs llaman a confirm simultáneamente
  const isFirstConfirmation = booking.status !== 'confirmed'
  const { error: updateError, data: updateResult } = await supabase.from('bookings').update({
    status:             'confirmed',
    payment_status:     newPaymentStatus,
    paid_amount:        newPaidTotal,      // acumulado, no solo este pago
    paid_at:            new Date().toISOString(),
    ...(isFirstConfirmation ? { confirmed_at: new Date().toISOString() } : {}),
    platform_fee:       commissionAmt,
    azul_order_id:      azulParams.AzulOrderId,
    azul_auth_code:     azulParams.AuthorizationCode,
    azul_response_code: azulParams.IsoCode,
    payout_status:      'pending',
    commission_status:  'collected',
  })
    .eq('id', bookingId)
    .not('payment_status', 'in', '("paid")')  // lock: solo si no está ya pagado
    .select('id')
  if (updateError) return NextResponse.json({ error: 'Error al confirmar la reserva' }, { status: 500 })
  // Si el UPDATE no afectó ninguna fila es porque ya fue procesado por otra request concurrente
  if (!updateResult || updateResult.length === 0) {
    return NextResponse.json({ success: true, already: true })
  }

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

  // Emails diferenciados: primer pago vs cuota subsiguiente
  // allSettled — un email fallando no debe revertir un pago ya procesado
  if (isFirstConfirmation) {
    // Primer pago: confirmación completa para cliente, host y admin
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

    // Sync Google Calendar — fire and forget, no bloquea la confirmación
    const hostProfileResult = await supabase
      .from('profiles')
      .select('google_refresh_token, google_calendar_connected')
      .eq('id', host?.id ?? space?.host_id)
      .single()
    const hostProfile = hostProfileResult.data

    if (hostProfile?.google_calendar_connected && hostProfile?.google_refresh_token) {
      createBookingEvent(
        hostProfile.google_refresh_token,
        {
          id:          bookingId,
          event_date:  booking.event_date,
          start_time:  booking.start_time,
          end_time:    booking.end_time,
          event_type:  booking.event_type,
          guest_count: booking.guest_count,
        },
        {
          name:    space?.name    ?? '',
          address: space?.address ?? null,
          sector:  space?.sector  ?? null,
          city:    space?.city    ?? null,
        },
        guest?.full_name ?? 'Cliente',
      ).then(async gcalEventId => {
        if (gcalEventId) {
          await supabase
            .from('bookings')
            .update({ google_calendar_event_id: gcalEventId })
            .eq('id', bookingId)
        }
      }).catch(err => console.error('[confirm] Google Calendar sync failed:', err))
    }
  } else if (cuotaId && guestEmail) {
    // Cuota subsiguiente: solo confirmar al cliente con el resumen de la cuota
    const allInsts     = await getInstallments(bookingId)
    const paidInsts    = allInsts.filter(i => i.status === 'paid')
    const nextInst     = allInsts.find(i => i.status === 'pending')
    const paidInstNum  = paidInsts.length
    const remainingAmt = Math.max(0, totalAmount - newPaidTotal)

    await sendEmail({
      to:      guestEmail,
      subject: paidInstNum >= allInsts.length
        ? `Todo pagado — ${spaceName}`
        : `Cuota ${paidInstNum} confirmada — ${spaceName}`,
      html:    tplCuotaPagada({
        guestName,
        spaceName,
        eventDate:          booking.event_date,
        installmentNumber:  paidInstNum,
        totalInstallments:  allInsts.length,
        amountPaid:         paidAmount,
        remainingAmount:    remainingAmt,
        nextDueDate:        nextInst?.due_date,
        nextDueAmount:      nextInst?.amount,
      }),
    })
  }

  return NextResponse.json({ success: true, azulOrderId: azulParams.AzulOrderId })
}

