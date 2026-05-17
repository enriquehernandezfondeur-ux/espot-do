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
  const cuotaRaw      = req.nextUrl.searchParams.get('cuota')
  const cuotaId       = cuotaRaw && cuotaRaw !== 'undefined' ? cuotaRaw : null
  const isDebug       = req.nextUrl.searchParams.get('debug') === '1'

  // Verificar autenticación y calcular el monto real desde la DB (nunca del cliente)
  let amount = 0
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return new NextResponse(errorHtml('Debes iniciar sesión para continuar con el pago.'), {
        status: 401, headers: { 'Content-Type': 'text/html' },
      })
    }

    if (cuotaId) {
      // Pago de cuota: obtener monto real de la cuota en DB
      const { data: inst } = await supabase
        .from('booking_installments')
        .select('amount, status, booking_id')
        .eq('id', cuotaId)
        .eq('booking_id', bookingId)
        .single()
      if (!inst) {
        return new NextResponse(errorHtml('Cuota no encontrada.'), {
          status: 404, headers: { 'Content-Type': 'text/html' },
        })
      }
      // Verificar que la reserva pertenece al usuario
      const { data: bk } = await supabase
        .from('bookings').select('guest_id').eq('id', bookingId).single()
      if (!bk || bk.guest_id !== user.id) {
        return new NextResponse(errorHtml('No autorizado para este pago.'), {
          status: 403, headers: { 'Content-Type': 'text/html' },
        })
      }
      if (inst.status === 'paid') {
        return new NextResponse(errorHtml('Esta cuota ya fue pagada.'), {
          status: 400, headers: { 'Content-Type': 'text/html' },
        })
      }
      amount = Math.round(Number(inst.amount))
    } else {
      // Pago único: obtener el total real de la reserva en DB
      const { data: booking } = await supabase
        .from('bookings')
        .select('guest_id, total_amount')
        .eq('id', bookingId)
        .single()
      if (!booking || booking.guest_id !== user.id) {
        return new NextResponse(errorHtml('No autorizado para este pago.'), {
          status: 403, headers: { 'Content-Type': 'text/html' },
        })
      }
      amount = Math.round(Number(booking.total_amount))
    }
  } catch {
    return new NextResponse(errorHtml('Error al verificar la sesión. Intenta de nuevo.'), {
      status: 500, headers: { 'Content-Type': 'text/html' },
    })
  }

  if (!amount || amount <= 0) {
    return new NextResponse(errorHtml('Monto de reserva inválido.'), {
      status: 400, headers: { 'Content-Type': 'text/html' },
    })
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

    function escapeHtml(s: string) {
      return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    }
    const hiddenInputs = Object.entries(fields)
      .map(([k, v]) => `<input type="hidden" name="${k}" value="${escapeHtml(v)}">`)
      .join('\n    ')

    // Modo test exacto: usa los valores del ejemplo oficial de Azul para verificar el hash
    // Solo disponible en desarrollo/staging — nunca en producción
    if (req.nextUrl.searchParams.get('test_exact') === '1') {
      if (process.env.NODE_ENV === 'production') {
        return new NextResponse(errorHtml('El modo test no está disponible en producción.'), {
          status: 403, headers: { 'Content-Type': 'text/html' },
        })
      }
      const { createHmac } = await import('crypto')
      const PRIV = process.env.AZUL_PRIVATE_KEY ?? ''
      const MERCHANT_ID   = process.env.AZUL_MERCHANT_ID   ?? ''
      const MERCHANT_NAME = process.env.AZUL_MERCHANT_NAME ?? ''
      const MERCHANT_TYPE = process.env.AZUL_MERCHANT_TYPE ?? ''
      const CURRENCY      = process.env.AZUL_CURRENCY_CODE ?? '$'
      const PAGE_URL      = process.env.AZUL_PAYMENT_PAGE_URL ?? 'https://pruebas.azul.com.do/PaymentPage/'

      // Valores EXACTOS del ejemplo oficial de Azul (incluyendo google.com)
      const ORDER   = '001'
      const AMT     = '10000'
      const ITBIS_V = '000'
      const AURL    = 'https://google.com'
      const DURL    = 'https://google.com'
      const CURL    = 'https://google.com'

      const msg = [MERCHANT_ID, MERCHANT_NAME, MERCHANT_TYPE, CURRENCY,
        ORDER, AMT, ITBIS_V, AURL, DURL, CURL, '0','','','0','','', PRIV].join('')
      const msgBuf = Buffer.from(msg, 'utf16le')
      const hash = createHmac('sha512', PRIV).update(msgBuf).digest('hex')

      const inputs = [
        ['MerchantId', MERCHANT_ID], ['TrxType', 'Sale'],
        ['MerchantName', MERCHANT_NAME], ['MerchantType', MERCHANT_TYPE],
        ['CurrencyCode', CURRENCY], ['OrderNumber', ORDER],
        ['Amount', AMT], ['ITBIS', ITBIS_V],
        ['ApprovedUrl', AURL], ['DeclinedUrl', DURL], ['CancelUrl', CURL],
        ['UseCustomField1','0'],['CustomField1Label',''],['CustomField1Value',''],
        ['UseCustomField2','0'],['CustomField2Label',''],['CustomField2Value',''],
        ['SaveToDataVault','0'], ['AuthHash', hash],
      ].map(([k, v]) => `<input type="hidden" name="${k}" value="${v}">`).join('\n')

      return new NextResponse(`<!DOCTYPE html><html><head><meta charset="UTF-8">
<style>body{font-family:sans-serif;padding:32px;background:#F4F6F8}
h2{color:#0F1623}p{color:#6B7280;font-size:13px}
.btn{background:#16A34A;color:#fff;border:none;padding:14px 28px;border-radius:10px;font-size:15px;font-weight:700;cursor:pointer;margin-top:16px}
pre{background:#fff;padding:12px;border-radius:8px;font-size:11px;word-break:break-all;white-space:pre-wrap}
</style></head><body>
<h2>🧪 Test con valores fijos (sin & en URLs)</h2>
<p>MerchantName: <strong>${MERCHANT_NAME}</strong> · MerchantType: <strong>${MERCHANT_TYPE}</strong><br>
OrderNumber: <strong>${ORDER}</strong> · Amount: <strong>${AMT}</strong> · ITBIS: <strong>${ITBIS_V}</strong></p>
<pre>Hash: ${hash.slice(0,40)}...</pre>
<form method="POST" action="${PAGE_URL}">
  ${inputs}
  <button class="btn" type="submit">🚀 Enviar a Azul ahora</button>
</form>
</body></html>`, { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } })
    }

    // Modo debug: prueba todas las combinaciones de MerchantName y MerchantType
    // Solo disponible fuera de producción
    if (isDebug && process.env.NODE_ENV === 'production') {
      return new NextResponse(errorHtml('El modo debug no está disponible en producción.'), {
        status: 403, headers: { 'Content-Type': 'text/html' },
      })
    }
    if (isDebug) {
      const { createHmac } = await import('crypto')
      const PRIV = process.env.AZUL_PRIVATE_KEY ?? ''

      // Combinaciones más comunes para cuentas de prueba de Azul
      const NAMES  = ['PRUEBAS', 'ESPOT, S.R.L.', 'ESPOTHUB', 'ESPOT', 'TEST', '39038540035']
      const TYPES  = ['E-Commerce', 'Ecommerce', 'ecommerce', 'Retail', 'Marketplace']

      function makeHash(name: string, type: string) {
        const PRIV_KEY = process.env.AZUL_PRIVATE_KEY ?? ''
        const msg = [
          fields.MerchantId, name, type, fields.CurrencyCode,
          fields.OrderNumber, fields.Amount, fields.ITBIS,
          fields.ApprovedUrl, fields.DeclinedUrl, fields.CancelUrl,
          fields.UseCustomField1, fields.CustomField1Label, fields.CustomField1Value,
          fields.UseCustomField2, fields.CustomField2Label, fields.CustomField2Value,
          PRIV_KEY,
        ].join('')
        const msgBuf = Buffer.from(msg, 'utf16le')
        return createHmac('sha512', PRIV_KEY).update(msgBuf).digest('hex').toUpperCase()
      }

      function mkForm(name: string, type: string, hash: string, label: string, color: string) {
        const f = { ...fields, MerchantName: name, MerchantType: type, AuthHash: hash }
        const inputs = Object.entries(f)
          .map(([k, v]) => `<input type="hidden" name="${k}" value="${(v as string).replace(/"/g, '&quot;')}">`)
          .join('')
        return `
          <div style="background:#fff;border-radius:10px;padding:14px 18px;margin-bottom:10px;box-shadow:0 1px 4px rgba(0,0,0,0.06)">
            <div style="font-size:12px;font-weight:700;color:#374151;margin-bottom:4px">${label}</div>
            <div style="font-family:monospace;font-size:10px;color:#6B7280;margin-bottom:8px">${hash.slice(0,28)}…</div>
            <form method="POST" action="${pageUrl}" style="display:inline">
              ${inputs}
              <button type="submit" style="background:${color};color:#fff;border:none;padding:8px 18px;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer">
                Probar →
              </button>
            </form>
          </div>`
      }

      const currentRows = Object.entries(fields)
        .map(([k, v]) => `<tr>
          <td style="padding:5px 12px;font-weight:600;color:#374151;font-size:12px">${k}</td>
          <td style="padding:5px 12px;font-family:monospace;font-size:11px;color:#0057A8;word-break:break-all">${k === 'AuthHash' ? (v as string).slice(0,24)+'…' : v}</td>
        </tr>`).join('')

      let combos = ''
      for (const name of NAMES) {
        for (const type of TYPES) {
          const hash = makeHash(name, type)
          const colors = ['#0057A8','#16A34A','#7C3AED','#D97706','#DC2626']
          const ci = (NAMES.indexOf(name) * TYPES.length + TYPES.indexOf(type)) % colors.length
          combos += mkForm(name, type, hash, `Name: "${name}" | Type: "${type}"`, colors[ci])
        }
      }

      return new NextResponse(`<!DOCTYPE html><html><head><meta charset="UTF-8">
<style>
  body{font-family:sans-serif;padding:28px;background:#F4F6F8;max-width:860px;margin:0 auto}
  h2{color:#0F1623;font-size:20px;margin:0 0 4px}
  .sub{color:#6B7280;font-size:13px;margin:0 0 20px}
  table{background:#fff;border-radius:12px;border-collapse:collapse;width:100%;box-shadow:0 1px 6px rgba(0,0,0,0.06);margin-bottom:24px}
  td{border-bottom:1px solid #F0F2F5;padding:5px 12px}tr:last-child td{border:none}
  h3{font-size:14px;color:#374151;margin:0 0 12px;padding-bottom:8px;border-bottom:1px solid #E5E7EB}
</style></head><body>
<h2>🔧 Debug de Hash — Espot × Azul</h2>
<p class="sub">Prueba las ${NAMES.length * TYPES.length} combinaciones posibles de MerchantName + MerchantType. La que NO dé error de hash es la correcta.</p>
<h3>Campos actuales enviados a Azul</h3>
<table>${currentRows}</table>
<h3>Combinaciones a probar (${NAMES.length * TYPES.length} total)</h3>
${combos}
</body></html>`, { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } })
    }

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
</head><body><div class="c"><h2>Error</h2><p>${escapeHtmlStatic(msg)}</p><br>
<a href="javascript:history.back()">← Volver</a></div></body></html>`
}

function escapeHtmlStatic(s: string) {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
