import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email/send'
import { tplPagoCompletado } from '@/lib/email/templates'
import { formatCurrency, formatDate, formatTime } from '@/lib/utils'
import { markInstallmentPaid } from '@/lib/actions/installments'

// POST /api/payments/test-confirm
// Solo activo cuando PAYMENT_TEST_MODE=1
// Simula un pago exitoso sin pasar por Azul — solo para pruebas internas
export async function POST(req: NextRequest) {
  // Bloquear en producción independientemente de la variable
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'No disponible en producción' }, { status: 403 })
  }
  if (process.env.PAYMENT_TEST_MODE !== '1') {
    return NextResponse.json({ error: 'No disponible en producción' }, { status: 403 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { bookingId, cuotaId } = await req.json()
  if (!bookingId) return NextResponse.json({ error: 'bookingId requerido' }, { status: 400 })

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

  // Idempotencia — primera cuota o pago completo ya procesado
  const { isPaid: checkPaid } = await import('@/lib/bookingConfig')
  if ((checkPaid(booking.payment_status) || booking.payment_status === 'advance') && !cuotaId) {
    return NextResponse.json({ success: true, already: true })
  }

  const space    = booking.spaces as any
  const host     = space?.profiles as any
  const guest    = booking.profiles as any
  const fakeOrderId = `TEST-${Date.now()}`

  // Marcar cuota como pagada
  if (cuotaId) {
    await markInstallmentPaid(cuotaId, fakeOrderId)
  }

  // Determinar paid_amount acumulado y payment_status correcto
  let testPaidAmount = 0
  if (cuotaId) {
    const { data: inst } = await supabase
      .from('booking_installments').select('amount').eq('id', cuotaId).single()
    testPaidAmount = Number(inst?.amount ?? 0)
  } else {
    testPaidAmount = Number(booking.total_amount)
  }
  const newPaidTotal = Math.round(Number(booking.paid_amount ?? 0) + testPaidAmount)

  let newPaymentStatus: 'advance' | 'partial' | 'paid' = 'advance'
  if (cuotaId) {
    const { data: allInsts } = await supabase
      .from('booking_installments').select('status').eq('booking_id', bookingId)
    if (allInsts && allInsts.length > 0) {
      const paidCount = allInsts.filter(i => i.status === 'paid').length
      if (paidCount >= allInsts.length)    newPaymentStatus = 'paid'
      else if (paidCount > 1)              newPaymentStatus = 'partial'
    }
  } else {
    newPaymentStatus = 'paid'
  }

  // Confirmar reserva con valores correctos — lock optimista para evitar doble ejecución
  const isFirst = booking.status !== 'confirmed'
  const { data: updateResult } = await supabase.from('bookings').update({
    status:             'confirmed',
    payment_status:     newPaymentStatus,
    paid_amount:        newPaidTotal,
    paid_at:            new Date().toISOString(),
    ...(isFirst ? { confirmed_at: new Date().toISOString() } : {}),
    azul_order_id:      fakeOrderId,
    azul_auth_code:     'TEST-MODE',
    azul_response_code: '00',
    payout_status:      'pending',
    commission_status:  'collected',
  }).eq('id', bookingId).not('payment_status', 'in', '("paid")').select('id')
  if (!updateResult || updateResult.length === 0) {
    return NextResponse.json({ success: true, already: true })
  }

  // Registrar en liquidaciones
  const commissionAmt = Number(booking.total_amount) * 0.10
  await supabase.from('liquidaciones').upsert({
    booking_id:       bookingId,
    host_id:          host?.id ?? space?.host_id,
    space_id:         space?.id,
    total_reserva:    Number(booking.total_amount),
    comision_pct:     10,
    comision_monto:   commissionAmt,
    neto_propietario: Number(booking.total_amount) * 0.90,
    estado:           'pendiente',
  }, { onConflict: 'booking_id' })

  const SITE      = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://espot.do'
  const eventInfo = `${formatDate(booking.event_date)} · ${formatTime(booking.start_time)} – ${formatTime(booking.end_time)}`

  await Promise.allSettled([
    guest?.email && sendEmail({
      to:      guest.email,
      subject: `Reserva confirmada — ${space?.name}`,
      html:    tplPagoCompletado({
        recipientName: guest?.full_name ?? 'Cliente',
        spaceName: space?.name ?? '', guestName: guest?.full_name ?? '',
        eventDate: booking.event_date, eventInfo,
        totalAmount: Number(booking.total_amount),
        commissionAmount: commissionAmt,
        netAmount: Number(booking.total_amount) * 0.90,
        azulOrderId: fakeOrderId, siteUrl: SITE,
      }),
    }),
    host?.email && sendEmail({
      to:      host.email,
      subject: `Pago recibido — ${space?.name}`,
      html:    tplPagoCompletado({
        recipientName: host?.full_name ?? 'Propietario',
        spaceName: space?.name ?? '', guestName: guest?.full_name ?? '',
        eventDate: booking.event_date, eventInfo,
        totalAmount: Number(booking.total_amount),
        commissionAmount: commissionAmt,
        netAmount: Number(booking.total_amount) * 0.90,
        azulOrderId: fakeOrderId, siteUrl: SITE, isHost: true,
      }),
    }),
  ])

  return NextResponse.json({ success: true, fakeOrderId })
}
