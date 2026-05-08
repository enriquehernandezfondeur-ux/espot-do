import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { azulSale } from '@/lib/azul/client'
import { sendEmail } from '@/lib/email/send'
import { formatCurrency, formatDate, formatTime } from '@/lib/utils'

// Azul ISO 8583 response codes → mensaje amigable en español
const AZUL_ISO_MESSAGES: Record<string, string> = {
  '01': 'Comunícate con tu banco emisor para autorizar este pago.',
  '04': 'Tu tarjeta fue retenida. Contacta a tu banco.',
  '05': 'Tu banco no autorizó el pago. Llama al número del reverso de tu tarjeta.',
  '12': 'Transacción inválida. Verifica los datos e intenta de nuevo.',
  '13': 'Monto de transacción inválido.',
  '14': 'Número de tarjeta incorrecto. Verifica y vuelve a intentarlo.',
  '51': 'Fondos insuficientes en esta tarjeta.',
  '54': 'Tarjeta vencida. Usa otra tarjeta.',
  '55': 'Datos de tarjeta incorrectos.',
  '57': 'Esta tarjeta no permite transacciones en línea. Contacta a tu banco.',
  '62': 'Tarjeta restringida. Contacta a tu banco emisor.',
  '65': 'Superaste el límite de intentos. Intenta mañana o usa otra tarjeta.',
  '91': 'El banco emisor no está disponible. Intenta en unos minutos.',
  '96': 'Error temporal del sistema bancario. Intenta de nuevo.',
}

function azulErrorMessage(isoCode?: string, fallback?: string): string {
  if (isoCode && AZUL_ISO_MESSAGES[isoCode]) return AZUL_ISO_MESSAGES[isoCode]
  return fallback ?? 'Pago rechazado por la pasarela de pagos.'
}

// POST /api/payments/process
// Body: { bookingId, cardNumber, expiration, cvv }
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  let body: { bookingId: string; cardNumber: string; expiration: string; cvv: string }
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
  }

  const { bookingId, cardNumber, expiration, cvv } = body
  if (!bookingId || !cardNumber || !expiration || !cvv) {
    return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
  }

  // Validaciones server-side de formato
  const cleanCard = cardNumber.replace(/\s/g, '')
  if (!/^\d{13,19}$/.test(cleanCard))
    return NextResponse.json({ error: 'Número de tarjeta inválido' }, { status: 400 })
  if (!/^\d{6}$/.test(expiration))
    return NextResponse.json({ error: 'Fecha de vencimiento inválida' }, { status: 400 })
  if (!/^\d{3,4}$/.test(cvv))
    return NextResponse.json({ error: 'CVV inválido' }, { status: 400 })

  // Verificar que la tarjeta no esté vencida
  const expYear  = Number(expiration.slice(0, 4))
  const expMonth = Number(expiration.slice(4, 6))
  const now      = new Date()
  if (expYear < now.getFullYear() || (expYear === now.getFullYear() && expMonth < now.getMonth() + 1)) {
    return NextResponse.json({ error: 'La tarjeta está vencida.' }, { status: 400 })
  }

  // Obtener reserva con toda la info necesaria
  const { data: booking } = await supabase
    .from('bookings')
    .select(`
      *,
      spaces!space_id(
        id, name, address, city, sector,
        profiles!host_id(id, full_name, email, phone)
      ),
      profiles!guest_id(full_name, email, phone)
    `)
    .eq('id', bookingId)
    .eq('guest_id', user.id)
    .single()

  if (!booking) return NextResponse.json({ error: 'Reserva no encontrada' }, { status: 404 })

  // Prevenir reprocesamiento
  if (!['payment_pending', 'unpaid'].includes(booking.payment_status ?? '')) {
    return NextResponse.json({ error: 'Esta reserva ya fue procesada' }, { status: 400 })
  }

  const space = booking.spaces as any
  const host  = space?.profiles as any
  const guest = booking.profiles as any

  // Marcar como 'processing' para evitar doble cobro por condición de carrera
  await supabase.from('bookings')
    .update({
      payment_status:   'processing',
      payment_attempts: (booking.payment_attempts ?? 0) + 1,
    })
    .eq('id', bookingId)
    .eq('payment_status', booking.payment_status) // optimistic lock

  const totalAmount   = Number(booking.total_amount)
  const commissionAmt = Number(booking.platform_fee) || Math.round(totalAmount * 0.10 * 100) / 100
  const commissionPct = totalAmount > 0 ? Math.round((commissionAmt / totalAmount) * 100) : 10
  const netToHost     = Math.round((totalAmount - commissionAmt) * 100) / 100

  const customOrderId = `ESP-${bookingId.slice(0, 8).toUpperCase()}-${Date.now()}`

  const azulResult = await azulSale({
    cardNumber:   cleanCard,
    expiration,
    cvv,
    amount:       commissionAmt,
    itbis:        0,
    customOrderId,
    orderDesc:    `Depósito 10% - ${space?.name ?? ''} - ${formatDate(booking.event_date)}`,
  })

  if (!azulResult.success) {
    const errorMsg = azulErrorMessage(azulResult.isoCode, azulResult.errorDescription)

    await supabase.from('bookings').update({
      payment_status:     'failed',
      last_payment_error: errorMsg,
      azul_custom_order:  customOrderId,
      azul_response_code: azulResult.isoCode,
    }).eq('id', bookingId)

    return NextResponse.json({
      success:   false,
      error:     errorMsg,
      errorCode: azulResult.isoCode ?? 'UNKNOWN',
    })
  }

  // ── Pago aprobado ─────────────────────────────────────
  await supabase.from('bookings').update({
    status:             'confirmed',
    payment_status:     'advance',
    paid_amount:        commissionAmt,
    paid_at:            new Date().toISOString(),
    confirmed_at:       new Date().toISOString(),
    platform_fee:       commissionAmt,
    azul_order_id:      azulResult.azulOrderId,
    azul_auth_code:     azulResult.authCode,
    azul_response_code: azulResult.isoCode,
    azul_custom_order:  customOrderId,
    payout_status:      'pending',
    commission_status:  'collected',
  }).eq('id', bookingId)

  const { error: liqError } = await supabase.from('liquidaciones').upsert({
    booking_id:       bookingId,
    host_id:          host?.id ?? space?.host_id,
    space_id:         space?.id,
    total_reserva:    totalAmount,
    comision_pct:     commissionPct,
    comision_monto:   commissionAmt,
    neto_propietario: netToHost,
    estado:           'pendiente',
  }, { onConflict: 'booking_id' })
  if (liqError) console.error('[Liquidaciones] Error al crear registro:', liqError.message)

  await supabase.from('payments').insert({
    booking_id:     bookingId,
    amount:         commissionAmt,
    currency:       'DOP',
    payment_type:   'deposit',
    payment_method: 'azul',
    status:         'completed',
    paid_at:        new Date().toISOString(),
  })

  const eventInfo  = `${formatDate(booking.event_date)} · ${formatTime(booking.start_time)} – ${formatTime(booking.end_time)} · ${booking.guest_count} personas`
  const guestName  = guest?.full_name  ?? 'Cliente'
  const guestEmail = guest?.email      ?? user.email ?? ''
  const hostEmail  = host?.email       ?? ''
  const spaceName  = space?.name       ?? 'Espacio'

  await Promise.all([
    guestEmail && sendEmail({
      to:      guestEmail,
      subject: `¡Reserva confirmada! — ${spaceName}`,
      html:    buildEmail({
        title:    '¡Pago exitoso! Reserva confirmada',
        subtitle: 'Tu evento está asegurado. Nos vemos pronto.',
        color:    '#16A34A',
        rows: [
          { label: 'Espacio',          value: spaceName },
          { label: 'Evento',           value: booking.event_type },
          { label: 'Fecha y horario',  value: eventInfo },
          { label: 'Depósito pagado',  value: formatCurrency(commissionAmt) },
          { label: 'Total del evento', value: formatCurrency(totalAmount) },
          { label: 'Dirección',        value: [space?.address, space?.city].filter(Boolean).join(', ') },
          { label: 'ID de transacción',value: azulResult.azulOrderId ?? customOrderId },
        ],
        cta: { text: 'Ver mi reserva', url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/reservas` },
      }),
    }),

    hostEmail && sendEmail({
      to:      hostEmail,
      subject: `Pago recibido — Nueva reserva confirmada en ${spaceName}`,
      html:    buildEmail({
        title:    '¡Pago recibido! Reserva confirmada',
        subtitle: `${guestName} pagó el depósito del ${commissionPct}% para asegurar la fecha.`,
        color:    '#35C493',
        rows: [
          { label: 'Cliente',              value: `${guestName} (${guestEmail})` },
          { label: 'Espacio',              value: spaceName },
          { label: 'Evento',               value: booking.event_type },
          { label: 'Fecha y horario',      value: eventInfo },
          { label: 'Depósito recibido',    value: formatCurrency(commissionAmt) },
          { label: 'Total del evento',     value: formatCurrency(totalAmount) },
          { label: 'Neto a recibir',       value: formatCurrency(netToHost) },
          { label: 'Estado de liquidación',value: 'Pendiente de transferencia' },
        ],
        cta: { text: 'Ver en mi panel', url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/host/pagos` },
        note: 'EspotHub procesará la transferencia a tu cuenta bancaria registrada dentro de los próximos días hábiles.',
      }),
    }),

    sendEmail({
      to:      process.env.ADMIN_EMAIL ?? 'enriquehernandezfondeur@gmail.com',
      subject: `Nueva reserva pagada — ${spaceName} | ${formatCurrency(totalAmount)}`,
      html:    buildEmail({
        title:    'Nueva reserva pagada',
        subtitle: `${guestName} pagó ${formatCurrency(totalAmount)}`,
        color:    '#7C3AED',
        rows: [
          { label: 'Espacio',              value: spaceName },
          { label: 'Cliente',              value: `${guestName} · ${guestEmail}` },
          { label: 'Propietario',          value: `${host?.full_name ?? '—'} · ${hostEmail}` },
          { label: 'Evento',               value: booking.event_type },
          { label: 'Fecha y horario',      value: eventInfo },
          { label: 'Total cobrado',        value: formatCurrency(totalAmount) },
          { label: 'Comisión EspotHub',    value: formatCurrency(commissionAmt) },
          { label: 'Neto al propietario',  value: formatCurrency(netToHost) },
          { label: 'ID Azul',              value: azulResult.azulOrderId ?? '—' },
          { label: 'Código autorización',  value: azulResult.authCode ?? '—' },
        ],
        cta: { text: 'Ver liquidaciones', url: `${process.env.NEXT_PUBLIC_SITE_URL}/admin/liquidaciones` },
      }),
    }),
  ])

  return NextResponse.json({
    success:    true,
    bookingId,
    azulOrderId: azulResult.azulOrderId,
    authCode:    azulResult.authCode,
  })
}

// ── Email builder ─────────────────────────────────────────
function buildEmail({ title, subtitle, color, rows, cta, note }: {
  title: string; subtitle: string; color: string
  rows: { label: string; value: string }[]
  cta: { text: string; url: string }
  note?: string
}): string {
  const table = rows.map(r => `
    <tr>
      <td style="padding:9px 16px;font-size:13px;color:#6B7280;border-bottom:1px solid #F0F2F5;width:42%">${r.label}</td>
      <td style="padding:9px 16px;font-size:13px;color:#111827;font-weight:600;border-bottom:1px solid #F0F2F5">${r.value}</td>
    </tr>`).join('')

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#F4F6F8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<div style="max-width:560px;margin:0 auto;padding:32px 20px;">
  <div style="text-align:center;margin-bottom:24px;">
    <span style="font-size:22px;font-weight:800;color:#03313C">Espot<span style="color:#35C493">Hub</span></span>
  </div>
  <div style="background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.06);">
    <div style="background:${color};padding:28px 32px;text-align:center;">
      <h1 style="color:#fff;font-size:20px;font-weight:700;margin:0 0 6px">${title}</h1>
      <p style="color:rgba(255,255,255,0.85);font-size:13px;margin:0">${subtitle}</p>
    </div>
    <div style="padding:8px 0;">
      <table style="width:100%;border-collapse:collapse">${table}</table>
    </div>
    ${note ? `<div style="margin:0 24px 16px;padding:12px 16px;background:#F0FDF4;border-radius:10px;font-size:12px;color:#166534">${note}</div>` : ''}
    <div style="padding:20px 32px;text-align:center;">
      <a href="${cta.url}" style="display:inline-block;background:${color};color:#fff;font-size:14px;font-weight:700;padding:14px 32px;border-radius:12px;text-decoration:none">${cta.text} →</a>
    </div>
  </div>
  <p style="color:#9CA3AF;font-size:11px;text-align:center;margin-top:20px">© 2026 EspotHub · República Dominicana</p>
</div>
</body></html>`
}
