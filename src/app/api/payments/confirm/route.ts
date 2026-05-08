import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyResponseHash, type AzulResponseParams } from '@/lib/azul/client'
import { sendEmail } from '@/lib/email/send'
import { formatCurrency, formatDate, formatTime } from '@/lib/utils'

// POST /api/payments/confirm
// Body: los query params que Azul envió al ApprovedUrl
// Verifica la firma HMAC y confirma la reserva en la base de datos.
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  let body: AzulResponseParams & { bookingId: string }
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
  }

  const { bookingId, ...azulParams } = body
  if (!bookingId) return NextResponse.json({ error: 'bookingId requerido' }, { status: 400 })

  // Verificar que IsoCode sea "00" (aprobado)
  if (azulParams.IsoCode !== '00') {
    return NextResponse.json({ error: 'Pago no aprobado', isoCode: azulParams.IsoCode }, { status: 400 })
  }

  // Verificar firma HMAC — protege contra manipulación de query params
  const isValid = verifyResponseHash(azulParams)
  if (!isValid) {
    console.error('[Azul confirm] Hash inválido para booking', bookingId, azulParams)
    return NextResponse.json({ error: 'Firma de respuesta inválida' }, { status: 400 })
  }

  // Obtener reserva
  const { data: booking } = await supabase
    .from('bookings')
    .select(`
      *,
      spaces!space_id(id, name, address, city, sector, profiles!host_id(id, full_name, email)),
      profiles!guest_id(full_name, email)
    `)
    .eq('id', bookingId)
    .eq('guest_id', user.id)
    .single()

  if (!booking) return NextResponse.json({ error: 'Reserva no encontrada' }, { status: 404 })

  // Idempotencia — si ya fue confirmada, devolver éxito sin reprocesar
  if (booking.payment_status === 'advance') {
    return NextResponse.json({ success: true, already: true })
  }

  const space  = booking.spaces as any
  const host   = space?.profiles as any
  const guest  = booking.profiles as any

  // Convertir Amount de centavos a pesos
  const commissionAmt = Number(azulParams.Amount) / 100
  const totalAmount   = Number(booking.total_amount)
  const commissionPct = totalAmount > 0 ? Math.round((commissionAmt / totalAmount) * 100) : 10
  const netToHost     = Math.round((totalAmount - commissionAmt) * 100) / 100

  // Confirmar booking
  await supabase.from('bookings').update({
    status:             'confirmed',
    payment_status:     'advance',
    paid_amount:        commissionAmt,
    paid_at:            new Date().toISOString(),
    confirmed_at:       new Date().toISOString(),
    platform_fee:       commissionAmt,
    azul_order_id:      azulParams.AzulOrderId,
    azul_auth_code:     azulParams.AuthorizationCode,
    azul_response_code: azulParams.IsoCode,
    payout_status:      'pending',
    commission_status:  'collected',
  }).eq('id', bookingId)

  // Registrar en liquidaciones
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

  // Registrar en payments
  await supabase.from('payments').insert({
    booking_id:     bookingId,
    amount:         commissionAmt,
    currency:       'DOP',
    payment_type:   'deposit',
    payment_method: 'azul',
    status:         'completed',
    paid_at:        new Date().toISOString(),
  })

  const SITE       = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://espothub.com'
  const spaceName  = space?.name       ?? 'Espacio'
  const guestName  = guest?.full_name  ?? 'Cliente'
  const guestEmail = guest?.email      ?? user.email ?? ''
  const hostEmail  = host?.email       ?? ''
  const eventInfo  = `${formatDate(booking.event_date)} · ${formatTime(booking.start_time)} – ${formatTime(booking.end_time)} · ${booking.guest_count} personas`

  // allSettled — un email fallando no debe revertir un pago ya procesado
  await Promise.allSettled([
    guestEmail && sendEmail({
      to:      guestEmail,
      subject: `¡Reserva confirmada! — ${spaceName}`,
      html:    buildEmail({
        title:    '¡Pago exitoso! Reserva confirmada',
        subtitle: 'Tu evento está asegurado. Nos vemos pronto.',
        color:    '#16A34A',
        rows: [
          { label: 'Espacio',           value: spaceName },
          { label: 'Evento',            value: booking.event_type },
          { label: 'Fecha y horario',   value: eventInfo },
          { label: 'Depósito pagado',   value: formatCurrency(commissionAmt) },
          { label: 'Total del evento',  value: formatCurrency(totalAmount) },
          { label: 'Dirección',         value: [space?.address, space?.city].filter(Boolean).join(', ') },
          { label: 'ID transacción',    value: azulParams.AzulOrderId ?? booking.azul_custom_order },
        ],
        cta: { text: 'Ver mi reserva', url: `${SITE}/dashboard/reservas` },
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
          { label: 'Cliente',               value: `${guestName} (${guestEmail})` },
          { label: 'Espacio',               value: spaceName },
          { label: 'Fecha y horario',       value: eventInfo },
          { label: 'Depósito recibido',     value: formatCurrency(commissionAmt) },
          { label: 'Total del evento',      value: formatCurrency(totalAmount) },
          { label: 'Neto a recibir',        value: formatCurrency(netToHost) },
          { label: 'Estado liquidación',    value: 'Pendiente de transferencia' },
        ],
        cta: { text: 'Ver en mi panel', url: `${SITE}/dashboard/host/pagos` },
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
          { label: 'Espacio',             value: spaceName },
          { label: 'Cliente',             value: `${guestName} · ${guestEmail}` },
          { label: 'Propietario',         value: `${host?.full_name ?? '—'} · ${hostEmail}` },
          { label: 'Fecha y horario',     value: eventInfo },
          { label: 'Comisión EspotHub',   value: formatCurrency(commissionAmt) },
          { label: 'Neto al propietario', value: formatCurrency(netToHost) },
          { label: 'ID Azul',             value: azulParams.AzulOrderId ?? '—' },
          { label: 'Auth Code',           value: azulParams.AuthorizationCode ?? '—' },
        ],
        cta: { text: 'Ver liquidaciones', url: `${SITE}/admin/liquidaciones` },
      }),
    }),
  ])

  return NextResponse.json({ success: true, azulOrderId: azulParams.AzulOrderId })
}

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
    <div style="padding:8px 0;"><table style="width:100%;border-collapse:collapse">${table}</table></div>
    ${note ? `<div style="margin:0 24px 16px;padding:12px 16px;background:#F0FDF4;border-radius:10px;font-size:12px;color:#166534">${note}</div>` : ''}
    <div style="padding:20px 32px;text-align:center;">
      <a href="${cta.url}" style="display:inline-block;background:${color};color:#fff;font-size:14px;font-weight:700;padding:14px 32px;border-radius:12px;text-decoration:none">${cta.text} →</a>
    </div>
  </div>
  <p style="color:#9CA3AF;font-size:11px;text-align:center;margin-top:20px">© 2026 EspotHub · República Dominicana</p>
</div></body></html>`
}
