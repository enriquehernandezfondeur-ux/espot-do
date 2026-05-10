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

  // Solo resetear si está en 'processing' — no tocar pagos completados
  const { error } = await supabase.from('bookings')
    .update({ payment_status: 'payment_pending' })
    .eq('id', bookingId)
    .eq('guest_id', user.id)
    .eq('payment_status', 'processing')

  if (error) return NextResponse.json({ error: 'No se pudo cancelar el pago' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
