import { NextResponse } from 'next/server'

// Este endpoint fue reemplazado por /api/payments/initiate y /api/payments/confirm
// con la integración de Azul PaymentPage (HMAC-SHA512).
export async function POST() {
  return NextResponse.json(
    { error: 'Endpoint deprecado. Usa /api/payments/initiate.' },
    { status: 410 }
  )
}
