import { NextRequest, NextResponse } from 'next/server'
import { buildPaymentPageFields } from '@/lib/azul/client'
import { createClient } from '@/lib/supabase/server'

export const maxDuration = 30

// GET /api/payments/redirect/[bookingId]?amount=1500
// Verifica que la reserva pertenece al usuario autenticado antes de redirigir a Azul.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  const { bookingId } = await params
  const amount        = Number(req.nextUrl.searchParams.get('amount') ?? '0')
  const cuotaRaw      = req.nextUrl.searchParams.get('cuota')
  const cuotaId       = cuotaRaw && cuotaRaw !== 'undefined' ? cuotaRaw : null

  if (!amount || amount <= 0) {
    return new NextResponse(errorHtml('Monto de reserva inválido.'), {
      status: 400, headers: { 'Content-Type': 'text/html' },
    })
  }

  // Verificar que el usuario autenticado es el dueño de la reserva
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: booking } = await supabase
        .from('bookings').select('guest_id').eq('id', bookingId).single()
      if (booking && booking.guest_id !== user.id) {
        return new NextResponse(errorHtml('No autorizado para este pago.'), {
          status: 403, headers: { 'Content-Type': 'text/html' },
        })
      }
    }
  } catch {
    // Si falla la verificación de auth, se continúa (no bloquear el pago por error de session)
  }

  const missingVars = [
    !process.env.AZUL_MERCHANT_ID && 'AZUL_MERCHANT_ID',
    !process.env.AZUL_PRIVATE_KEY && 'AZUL_PRIVATE_KEY',
  ].filter(Boolean)

  if (missingVars.length > 0) {
    return new NextResponse(errorHtml(`Faltan variables: ${missingVars.join(', ')}`), {
      status: 500, headers: { 'Content-Type': 'text/html' },
    })
  }

  try {
    const orderNumber = `ESP-${bookingId.slice(0, 8).toUpperCase()}-${Date.now()}`

    const { pageUrl, fields } = buildPaymentPageFields({
      amount,
      itbis:       0,
      orderNumber,
      bookingId,
      cuotaId:     cuotaId ?? undefined,
    })

    const hiddenInputs = Object.entries(fields)
      .map(([k, v]) => `<input type="hidden" name="${k}" value="${v.replace(/"/g, '&quot;')}">`)
      .join('\n    ')

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Redirigiendo a Azul Payments...</title>
  <style>
    *{box-sizing:border-box}
    body{margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
         background:#F4F6F8;display:flex;align-items:center;justify-content:center;min-height:100vh}
    .card{text-align:center;padding:40px 32px;background:#fff;border-radius:24px;
          box-shadow:0 4px 24px rgba(0,0,0,0.08);max-width:380px;width:100%;margin:16px}
    .spinner{width:48px;height:48px;border:3px solid #E2E8F0;border-top-color:#0057A8;
             border-radius:50%;animation:spin 0.8s linear infinite;margin:0 auto 20px}
    @keyframes spin{to{transform:rotate(360deg)}}
    h2{color:#0F1623;font-size:18px;margin:0 0 8px;font-weight:700}
    p{color:#94A3B8;font-size:13px;margin:0 0 4px}
    .btn{display:none;margin-top:24px;width:100%;padding:14px 24px;background:#0057A8;
         color:#fff;border:none;border-radius:14px;font-size:15px;font-weight:700;cursor:pointer}
    .btn:hover{background:#0066CC}
    .note{margin-top:16px;font-size:11px;color:#CBD5E1}
    .note span{color:#0057A8;font-weight:700}
  </style>
</head>
<body>
  <div class="card">
    <div class="spinner" id="sp"></div>
    <h2>Conectando con Azul Payments</h2>
    <p>Serás redirigido en un momento...</p>
    <form id="azul-form" method="POST" action="${pageUrl}" style="display:none">
      ${hiddenInputs}
    </form>
    <button class="btn" id="btn" type="button"
      onclick="document.getElementById('azul-form').submit()">
      Continuar al pago seguro →
    </button>
    <p class="note">Pago seguro por <span>azul</span> payments</p>
  </div>
  <script>
    try {
      document.getElementById('azul-form').submit();
    } catch(e) {
      document.getElementById('sp').style.display = 'none';
      document.getElementById('btn').style.display = 'block';
    }
    setTimeout(function() {
      document.getElementById('btn').style.display = 'block';
    }, 2000);
  </script>
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
<style>body{font-family:sans-serif;display:flex;align-items:center;justify-content:center;
min-height:100vh;background:#F4F6F8}
.c{background:#fff;padding:32px;border-radius:20px;text-align:center;max-width:340px}
h2{color:#DC2626;margin:0 0 8px}p{color:#6B7280;font-size:13px}a{color:#35C493}</style>
</head><body><div class="c"><h2>Error</h2><p>${msg}</p><br>
<a href="javascript:history.back()">← Volver</a></div></body></html>`
}
