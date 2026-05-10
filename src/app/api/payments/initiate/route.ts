import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildPaymentPageFields } from '@/lib/azul/client'

export const maxDuration = 30 // segundos — evita timeout de Vercel en plan hobby

export async function POST(req: NextRequest) {
  try {
    // 1. Variables de entorno
    const missingVars = [
      !process.env.AZUL_MERCHANT_ID && 'AZUL_MERCHANT_ID',
      !process.env.AZUL_PRIVATE_KEY && 'AZUL_PRIVATE_KEY',
    ].filter(Boolean)
    if (missingVars.length > 0) {
      return NextResponse.json(
        { error: `Faltan variables en Vercel: ${missingVars.join(', ')}` },
        { status: 500 }
      )
    }

    // 2. Body
    let body: { bookingId: string }
    try { body = await req.json() } catch {
      return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
    }
    const { bookingId } = body
    if (!bookingId) return NextResponse.json({ error: 'bookingId requerido' }, { status: 400 })

    // 3. Auth — getUser verifica el JWT contra el servidor (getSession solo lee la cookie)
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    const userId = user.id

    // 4. Booking
    const { data: booking, error: bookingErr } = await supabase
      .from('bookings')
      .select('id, total_amount, payment_status, payment_attempts')
      .eq('id', bookingId)
      .eq('guest_id', userId)
      .single()

    if (bookingErr || !booking) {
      return NextResponse.json({ error: 'Reserva no encontrada' }, { status: 404 })
    }

    const allowed = ['payment_pending', 'unpaid', 'failed', 'processing']
    if (!allowed.includes(booking.payment_status ?? '')) {
      return NextResponse.json({ error: 'Esta reserva ya fue procesada' }, { status: 400 })
    }

    const totalAmount = Number(booking.total_amount)
    const orderNumber = `ESP-${bookingId.slice(0, 8).toUpperCase()}-${Date.now()}`

    // 5. Update booking en background (no bloquea la respuesta)
    supabase.from('bookings').update({
      azul_custom_order: orderNumber,
      payment_status:    'processing',
      payment_attempts:  (booking.payment_attempts ?? 0) + 1,
    }).eq('id', bookingId).then(() => {})

    // 6. Generar campos firmados para Azul
    const { pageUrl, fields } = buildPaymentPageFields({
      amount:      totalAmount,
      itbis:       0,
      orderNumber,
      bookingId,
    })

    return NextResponse.json({ pageUrl, fields })

  } catch (err: any) {
    console.error('[Azul initiate]', err.message)
    return NextResponse.json({ error: err.message ?? 'Error interno' }, { status: 500 })
  }
}
