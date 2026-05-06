import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { azulSale } from '@/lib/azul/client'
import { sendEmail } from '@/lib/email/send'
import { formatCurrency, formatDate, formatTime } from '@/lib/utils'

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
  if (!['payment_pending', 'unpaid'].includes(booking.payment_status ?? '')) {
    return NextResponse.json({ error: 'Esta reserva ya fue procesada' }, { status: 400 })
  }

  const space = booking.spaces as any
  const host  = space?.profiles as any
  const guest = booking.profiles as any

  // Incrementar contador de intentos
  await supabase.from('bookings')
    .update({ payment_attempts: (booking.payment_attempts ?? 0) + 1 })
    .eq('id', bookingId)

  // Obtener comisión configurable (default 10%)
  const { data: configRow } = await supabase
    .from('marketplace_config')
    .select('value')
    .eq('key', 'commission_pct')
    .single()
  const commissionPct = parseFloat(configRow?.value ?? '10')

  const totalAmount    = Number(booking.total_amount)
  const commissionAmt  = Math.round(totalAmount * (commissionPct / 100) * 100) / 100
  const netToHost      = Math.round((totalAmount - commissionAmt) * 100) / 100

  // Procesar pago con Azul
  const customOrderId = `ESP-${bookingId.slice(0, 8).toUpperCase()}-${Date.now()}`

  const azulResult = await azulSale({
    cardNumber:   cardNumber.replace(/\s/g, ''),
    expiration,
    cvv,
    amount:       totalAmount,
    itbis:        Number(booking.itbis_amount ?? 0),
    customOrderId,
    orderDesc:    `Reserva ${space?.name ?? ''} - ${formatDate(booking.event_date)}`,
  })

  if (!azulResult.success) {
    // Guardar error en booking
    await supabase.from('bookings').update({
      last_payment_error: azulResult.errorDescription ?? 'Pago rechazado',
      payment_status:     'failed',
      azul_custom_order:  customOrderId,
      azul_response_code: azulResult.isoCode,
    }).eq('id', bookingId)

    return NextResponse.json({
      success: false,
      error:   azulResult.errorDescription ?? 'Pago rechazado por la pasarela',
    })
  }

  // ── Pago aprobado ─────────────────────────────────────
  await supabase.from('bookings').update({
    status:             'confirmed',
    payment_status:     'paid',
    paid_amount:        totalAmount,
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

  // Crear registro de liquidación
  await supabase.from('liquidaciones').upsert({
    booking_id:       bookingId,
    host_id:          host?.id ?? space?.host_id,
    space_id:         space?.id,
    total_reserva:    totalAmount,
    comision_pct:     commissionPct,
    comision_monto:   commissionAmt,
    neto_propietario: netToHost,
    estado:           'pendiente',
  }, { onConflict: 'booking_id' })

  // Registrar pago en tabla payments
  await supabase.from('payments').insert({
    booking_id:     bookingId,
    amount:         totalAmount,
    currency:       'DOP',
    payment_type:   'full_payment',
    payment_method: 'azul',
    status:         'completed',
    paid_at:        new Date().toISOString(),
  })

  const eventInfo = `${formatDate(booking.event_date)} · ${formatTime(booking.start_time)} – ${formatTime(booking.end_time)} · ${booking.guest_count} personas`
  const guestName  = guest?.full_name  ?? 'Cliente'
  const guestEmail = guest?.email      ?? user.email ?? ''
  const hostEmail  = host?.email       ?? ''
  const spaceName  = space?.name       ?? 'Espacio'

  // ── Emails en paralelo ────────────────────────────────
  await Promise.all([

    // Email al cliente
    guestEmail && sendEmail({
      to:      guestEmail,
      subject: `🎊 ¡Reserva confirmada! — ${spaceName}`,
      html:    buildEmail({
        title:    '¡Pago exitoso! Reserva confirmada',
        subtitle: 'Tu evento está asegurado. Nos vemos pronto.',
        color:    '#16A34A',
        emoji:    '🎊',
        rows: [
          { label: 'Espacio',        value: spaceName },
          { label: 'Evento',         value: booking.event_type },
          { label: 'Fecha y horario',value: eventInfo },
          { label: 'Total pagado',   value: formatCurrency(totalAmount) },
          { label: 'Dirección',      value: [space?.address, space?.city].filter(Boolean).join(', ') },
          { label: 'ID de transacción', value: azulResult.azulOrderId ?? customOrderId },
        ],
        cta: { text: 'Ver mi reserva', url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/reservas` },
      }),
    }),

    // Email al propietario
    hostEmail && sendEmail({
      to:      hostEmail,
      subject: `💰 Pago recibido — Nueva reserva confirmada en ${spaceName}`,
      html:    buildEmail({
        title:    '¡Pago recibido! Reserva confirmada',
        subtitle: `${guestName} pagó el 100% de la reserva.`,
        color:    '#35C493',
        emoji:    '💰',
        rows: [
          { label: 'Cliente',              value: `${guestName} (${guestEmail})` },
          { label: 'Espacio',              value: spaceName },
          { label: 'Evento',               value: booking.event_type },
          { label: 'Fecha y horario',      value: eventInfo },
          { label: 'Total pagado',         value: formatCurrency(totalAmount) },
          { label: 'Comisión EspotHub',    value: `${formatCurrency(commissionAmt)} (${commissionPct}%)` },
          { label: 'Neto a recibir',       value: formatCurrency(netToHost) },
          { label: 'Estado de liquidación',value: '⏳ Pendiente de transferencia' },
        ],
        cta: { text: 'Ver en mi panel', url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/host/pagos` },
        note: 'EspotHub procesará la transferencia a tu cuenta bancaria registrada dentro de los próximos días hábiles.',
      }),
    }),

    // Email al admin
    sendEmail({
      to:      'enriquehernandezfondeur@gmail.com',
      subject: `🔔 Nueva reserva pagada — ${spaceName} | ${formatCurrency(totalAmount)}`,
      html:    buildEmail({
        title:    'Nueva reserva pagada',
        subtitle: `${guestName} pagó ${formatCurrency(totalAmount)}`,
        color:    '#7C3AED',
        emoji:    '🔔',
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

  return NextResponse.json({ success: true, bookingId })
}

// ── Email builder ─────────────────────────────────────────
function buildEmail({ title, subtitle, color, emoji, rows, cta, note }: {
  title: string; subtitle: string; color: string; emoji: string
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
    <span style="font-size:22px;font-weight:800;color:#03313C">espot<span style="color:#35C493">.do</span></span>
  </div>
  <div style="background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.06);">
    <div style="background:${color};padding:28px 32px;text-align:center;">
      <div style="font-size:36px;margin-bottom:8px;">${emoji}</div>
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
  <p style="color:#9CA3AF;font-size:11px;text-align:center;margin-top:20px">© 2026 espot.do · República Dominicana</p>
</div>
</body></html>`
}
