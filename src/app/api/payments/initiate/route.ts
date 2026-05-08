import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildPaymentPageFields } from '@/lib/azul/client'

// POST /api/payments/initiate
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  let body: { bookingId: string }
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
  }

  const { bookingId } = body
  if (!bookingId) return NextResponse.json({ error: 'bookingId requerido' }, { status: 400 })

  // Diagnóstico rápido de variables — ayuda a detectar cuál falta en Vercel
  const missingVars = [
    !process.env.AZUL_MERCHANT_ID  && 'AZUL_MERCHANT_ID',
    !process.env.AZUL_PRIVATE_KEY  && 'AZUL_PRIVATE_KEY',
  ].filter(Boolean)

  if (missingVars.length > 0) {
    console.error('[Azul initiate] Variables faltantes:', missingVars.join(', '))
    return NextResponse.json({
      error: `Pasarela no configurada. Faltan en Vercel: ${missingVars.join(', ')}`,
    }, { status: 500 })
  }

  const { data: booking } = await supabase
    .from('bookings')
    .select('id, total_amount, platform_fee, payment_status, payment_attempts')
    .eq('id', bookingId)
    .eq('guest_id', user.id)
    .single()

  if (!booking) return NextResponse.json({ error: 'Reserva no encontrada' }, { status: 404 })

  if (!['payment_pending', 'unpaid', 'failed'].includes(booking.payment_status ?? '')) {
    return NextResponse.json({ error: 'Esta reserva ya fue procesada' }, { status: 400 })
  }

  // Cobrar el total de la reserva (no solo el depósito)
  const totalAmount  = Number(booking.total_amount)
  const orderNumber  = `ESP-${bookingId.slice(0, 8).toUpperCase()}-${Date.now()}`

  await supabase.from('bookings').update({
    azul_custom_order: orderNumber,
    payment_status:    'processing',
    payment_attempts:  (booking.payment_attempts ?? 0) + 1,
  }).eq('id', bookingId)

  try {
    const { pageUrl, fields } = buildPaymentPageFields({
      amount:      totalAmount,
      itbis:       0,
      orderNumber,
      bookingId,
    })
    return NextResponse.json({ pageUrl, fields })
  } catch (err: any) {
    console.error('[Azul initiate]', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
