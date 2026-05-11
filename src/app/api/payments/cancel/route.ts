import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST /api/payments/cancel
// Resetea el payment_status de 'processing' a 'payment_pending'
// para que el usuario pueda reintentar el pago.
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  let body: { bookingId: string }
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
  }

  const { bookingId } = body
  if (!bookingId) return NextResponse.json({ ok: true })

  // Solo resetear si aún no hay pago completado — no tocar bookings con 'advance'
  const { error } = await supabase.from('bookings')
    .update({ payment_status: 'unpaid' })
    .eq('id', bookingId)
    .eq('guest_id', user.id)
    .not('payment_status', 'in', '("advance","partial","paid")')

  if (error) return NextResponse.json({ error: 'No se pudo cancelar el pago' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
