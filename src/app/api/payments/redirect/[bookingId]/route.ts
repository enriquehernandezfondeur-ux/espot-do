import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildPaymentPageFields } from '@/lib/azul/client'

export const maxDuration = 30

// GET /api/payments/redirect/[bookingId]
// Devuelve una página HTML que auto-envía el form a Azul PaymentPage.
// Al ser una navegación directa (no fetch), el browser la maneja sin problemas.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  const { bookingId } = await params

  const missingVars = [
    !process.env.AZUL_MERCHANT_ID && 'AZUL_MERCHANT_ID',
    !process.env.AZUL_PRIVATE_KEY && 'AZUL_PRIVATE_KEY',
  ].filter(Boolean)

  if (missingVars.length > 0) {
    return new NextResponse(errorHtml(`Faltan variables en Vercel: ${missingVars.join(', ')}`), {
      status: 500, headers: { 'Content-Type': 'text/html' },
    })
  }

  try {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session?.user) {
      return NextResponse.redirect(new URL('/auth', req.url))
    }

    const { data: booking, error } = await supabase
      .from('bookings')
      .select('id, total_amount, payment_status, payment_attempts')
      .eq('id', bookingId)
      .eq('guest_id', session.user.id)
      .single()

    if (error || !booking) {
      return NextResponse.redirect(new URL('/dashboard/reservas', req.url))
    }

    const allowed = ['payment_pending', 'unpaid', 'failed', 'processing']
    if (!allowed.includes(booking.payment_status ?? '')) {
      const site = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://espothub.com'
      return NextResponse.redirect(new URL(`/pago/exitoso?b=${bookingId}`, site))
    }

    const totalAmount = Number(booking.total_amount)
    const orderNumber = `ESP-${bookingId.slice(0, 8).toUpperCase()}-${Date.now()}`

    // Update en background
    supabase.from('bookings').update({
      azul_custom_order: orderNumber,
      payment_status:    'processing',
      payment_attempts:  (booking.payment_attempts ?? 0) + 1,
    }).eq('id', bookingId).then(() => {})

    const { pageUrl, fields } = buildPaymentPageFields({
      amount:      totalAmount,
      itbis:       0,
      orderNumber,
      bookingId,
    })

    // Página HTML con auto-submit
    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Redirigiendo a Azul Payments...</title>
  <style>
    body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
           background: #F4F6F8; display: flex; align-items: center; justify-content: center;
           min-height: 100vh; }
    .card { text-align: center; padding: 40px 32px; background: #fff;
            border-radius: 24px; box-shadow: 0 4px 24px rgba(0,0,0,0.08); max-width: 360px; }
    .spinner { width: 44px; height: 44px; border: 3px solid #E2E8F0;
               border-top-color: #0057A8; border-radius: 50%;
               animation: spin 0.8s linear infinite; margin: 0 auto 20px; }
    @keyframes spin { to { transform: rotate(360deg); } }
    h2 { color: #0F1623; font-size: 18px; margin: 0 0 8px; }
    p  { color: #94A3B8; font-size: 13px; margin: 0; }
    .azul { margin-top: 20px; font-size: 11px; color: #CBD5E1; }
    .azul span { color: #0057A8; font-weight: 700; }
  </style>
</head>
<body>
  <div class="card">
    <div class="spinner"></div>
    <h2>Conectando con Azul Payments</h2>
    <p>Serás redirigido en un momento...</p>
    <p class="azul">Pago seguro por <span>azul</span></p>
  </div>
  <form id="f" method="POST" action="${pageUrl}">
    ${Object.entries(fields).map(([k, v]) => `<input type="hidden" name="${k}" value="${v}">`).join('\n    ')}
  </form>
  <script>document.getElementById('f').submit();</script>
</body>
</html>`

    return new NextResponse(html, {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })

  } catch (err: any) {
    console.error('[Azul redirect]', err.message)
    return new NextResponse(errorHtml(err.message ?? 'Error al iniciar el pago'), {
      status: 500, headers: { 'Content-Type': 'text/html' },
    })
  }
}

function errorHtml(msg: string) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8">
  <style>body{font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#F4F6F8;}
  .card{background:#fff;padding:32px;border-radius:20px;text-align:center;max-width:340px;}
  h2{color:#DC2626;margin:0 0 8px;}p{color:#6B7280;font-size:13px;}
  a{color:#35C493;}</style></head>
  <body><div class="card"><h2>Error al iniciar el pago</h2>
  <p>${msg}</p><br><a href="/dashboard/reservas">← Volver a reservas</a></div></body></html>`
}
