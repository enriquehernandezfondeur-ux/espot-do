/**
 * Sistema centralizado de emails para EspotHub.
 * Un único template base, consistente con la identidad de marca.
 */

import { formatCurrency, formatDate, formatTime } from '@/lib/utils'

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://espothub.com'

// ── Componentes reutilizables ────────────────────────────

function logo() {
  return `
    <div style="text-align:center;margin-bottom:36px;">
      <img src="${SITE}/logo-dark.svg" alt="EspotHub" height="26"
        style="height:26px;width:auto;display:inline-block;" />
    </div>`
}

function infoRow(label: string, value: string, last = false) {
  return `
    <tr>
      <td style="padding:11px 18px;font-size:13px;color:#6B7280;${last ? '' : 'border-bottom:1px solid #F0F2F5;'}width:44%;background:#FAFBFC;vertical-align:top;">${label}</td>
      <td style="padding:11px 18px;font-size:13px;color:#0F1623;font-weight:600;${last ? '' : 'border-bottom:1px solid #F0F2F5;'}vertical-align:top;">${value}</td>
    </tr>`
}

export function infoBox(rows: { label: string; value: string }[]) {
  return `
    <table style="width:100%;border-collapse:collapse;margin:18px 0;border:1px solid #E8ECF0;border-radius:14px;overflow:hidden;">
      ${rows.map((r, i) => infoRow(r.label, r.value, i === rows.length - 1)).join('')}
    </table>`
}

// ── Template base ─────────────────────────────────────────

export function emailBase({
  title,
  subtitle,
  accentColor = '#35C493',
  body,
  cta,
  note,
}: {
  title: string
  subtitle?: string
  accentColor?: string
  body: string
  cta: { text: string; url: string }
  note?: string
}) {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#F2F4F3;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <div style="max-width:580px;margin:0 auto;padding:40px 20px;">

    ${logo()}

    <!-- Tarjeta principal -->
    <div style="background:#fff;border-radius:24px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,0.07);">

      <!-- Banda de color superior -->
      <div style="height:5px;background:${accentColor};"></div>

      <!-- Encabezado -->
      <div style="padding:32px 36px 20px;">
        <h1 style="color:#03313C;font-size:21px;font-weight:700;margin:0 0 8px;letter-spacing:-0.03em;line-height:1.2;">${title}</h1>
        ${subtitle ? `<p style="color:#6B7280;font-size:14px;margin:0;line-height:1.5;">${subtitle}</p>` : ''}
      </div>

      <div style="height:1px;background:#F0F2F5;"></div>

      <!-- Cuerpo -->
      <div style="padding:24px 36px;color:#374151;font-size:14px;line-height:1.75;">
        ${body}
      </div>

      ${note ? `
      <!-- Nota informativa -->
      <div style="margin:0 36px 24px;padding:14px 18px;background:#F0FDF9;border:1px solid rgba(53,196,147,0.25);border-radius:12px;">
        <p style="color:#065F46;font-size:13px;margin:0;line-height:1.6;">${note}</p>
      </div>` : ''}

      <!-- Botón CTA -->
      <div style="padding:0 36px 36px;text-align:center;">
        <a href="${cta.url}"
          style="display:inline-block;background:#35C493;color:#fff;font-size:14px;font-weight:700;padding:15px 36px;border-radius:14px;text-decoration:none;letter-spacing:-0.01em;">
          ${cta.text} →
        </a>
      </div>
    </div>

    <!-- Pie de página -->
    <div style="text-align:center;margin-top:28px;">
      <p style="color:#9CA3AF;font-size:12px;margin:0 0 4px;">
        EspotHub · Espacios para eventos en República Dominicana
      </p>
      <p style="color:#CBD5E1;font-size:11px;margin:0;">
        © 2026 ESPOT, S.R.L. · Si tienes dudas escríbenos a
        <a href="mailto:contacto@espot.do" style="color:#6EE7C7;text-decoration:none;">contacto@espot.do</a>
      </p>
    </div>

  </div>
</body>
</html>`
}

// ── Templates específicos por evento ─────────────────────

interface BookingData {
  guestName: string
  hostName: string
  spaceName: string
  spaceAddress: string
  eventDate: string
  startTime: string
  endTime: string
  eventType: string
  guestCount: number
  totalAmount: number
  platformFee: number
  basePrice: number
  selectedAddons: { name: string; price: number }[]
  bookingId: string
  guestEmail?: string
}

/** Cliente: solicitud enviada */
export function tplSolicitudCliente(d: BookingData) {
  const rows = [
    { label: 'Espacio',        value: d.spaceName },
    { label: 'Tipo de evento', value: d.eventType },
    { label: 'Fecha',          value: formatDate(d.eventDate) },
    { label: 'Horario',        value: `${formatTime(d.startTime)} – ${formatTime(d.endTime)}` },
    { label: 'Personas',       value: `${d.guestCount}` },
    { label: 'Total del evento', value: formatCurrency(d.totalAmount) },
    { label: 'Referencia',     value: d.bookingId.slice(0, 8).toUpperCase() },
  ]
  return emailBase({
    title: 'Solicitud enviada',
    subtitle: `Hola ${d.guestName}, recibimos tu solicitud para ${d.spaceName}.`,
    accentColor: '#2563EB',
    body: `
      <p style="color:#374151;margin:0 0 16px;">Tu solicitud fue enviada al propietario, quien revisará disponibilidad y te notificaremos cuando responda.</p>
      ${infoBox(rows)}
      <p style="color:#6B7280;font-size:13px;margin:0;">Puedes hacer seguimiento desde tu panel de reservas en cualquier momento.</p>`,
    cta: { text: 'Ver mis reservas', url: `${SITE}/dashboard/reservas` },
  })
}

/** Propietario: nueva solicitud */
export function tplSolicitudHost(d: BookingData) {
  const rows = [
    { label: 'Cliente',        value: `${d.guestName}${d.guestEmail ? ` · ${d.guestEmail}` : ''}` },
    { label: 'Tipo de evento', value: d.eventType },
    { label: 'Fecha',          value: formatDate(d.eventDate) },
    { label: 'Horario',        value: `${formatTime(d.startTime)} – ${formatTime(d.endTime)}` },
    { label: 'Personas',       value: `${d.guestCount}` },
    { label: 'Total del evento', value: formatCurrency(d.totalAmount) },
    ...(d.selectedAddons.length > 0 ? [{ label: 'Adicionales', value: d.selectedAddons.map(a => a.name).join(', ') }] : []),
  ]
  return emailBase({
    title: 'Nueva solicitud de reserva',
    subtitle: `${d.guestName} quiere reservar ${d.spaceName}.`,
    accentColor: '#35C493',
    body: `
      <p style="color:#374151;margin:0 0 16px;">Alguien quiere celebrar en tu espacio. Revisa los detalles y confirma disponibilidad desde tu panel.</p>
      ${infoBox(rows)}`,
    cta: { text: 'Ver solicitud en mi panel', url: `${SITE}/dashboard/host/reservas` },
  })
}

/** Cliente: reserva aceptada — procede a pagar */
export function tplAceptadaCliente(d: BookingData) {
  const rows = [
    { label: 'Espacio',        value: d.spaceName },
    { label: 'Fecha',          value: formatDate(d.eventDate) },
    { label: 'Horario',        value: `${formatTime(d.startTime)} – ${formatTime(d.endTime)}` },
    { label: 'Total del evento', value: formatCurrency(d.totalAmount) },
    { label: 'Pago para confirmar', value: formatCurrency(d.platformFee) },
  ]
  return emailBase({
    title: 'El propietario aceptó tu solicitud',
    subtitle: `${d.spaceName} está disponible para tu evento.`,
    accentColor: '#16A34A',
    body: `
      <p style="color:#374151;margin:0 0 16px;">Hola <strong>${d.guestName}</strong>, el propietario confirmó disponibilidad para tu evento. Completa el pago para asegurar la fecha.</p>
      ${infoBox(rows)}`,
    cta: { text: 'Completar pago', url: `${SITE}/pago/${d.bookingId}` },
    note: 'Solo pagarás si decides confirmar. El pago asegura tu fecha y se procesa de forma segura con Azul Payments.',
  })
}

/** Cliente: reserva confirmada con pago */
export function tplConfirmadaCliente(d: BookingData & { remainingAmount: number }) {
  const rows = [
    { label: 'Espacio',        value: d.spaceName },
    { label: 'Dirección',      value: d.spaceAddress },
    { label: 'Fecha',          value: formatDate(d.eventDate) },
    { label: 'Horario',        value: `${formatTime(d.startTime)} – ${formatTime(d.endTime)}` },
    { label: 'Personas',       value: `${d.guestCount}` },
    { label: 'Pago realizado', value: formatCurrency(d.platformFee) },
    { label: 'Saldo en el lugar', value: formatCurrency(d.remainingAmount) },
    { label: 'Referencia',     value: d.bookingId.slice(0, 8).toUpperCase() },
  ]
  return emailBase({
    title: 'Reserva confirmada',
    subtitle: `Todo listo para tu evento en ${d.spaceName}.`,
    accentColor: '#35C493',
    body: `
      <p style="color:#374151;margin:0 0 16px;">Hola <strong>${d.guestName}</strong>, tu reserva está confirmada y tu fecha asegurada.</p>
      ${infoBox(rows)}
      <p style="color:#6B7280;font-size:13px;margin:8px 0 0;">El saldo restante se paga directamente en el espacio el día del evento.</p>`,
    cta: { text: 'Ver mi reserva', url: `${SITE}/dashboard/reservas` },
  })
}

/** Propietario: reserva confirmada con pago */
export function tplConfirmadaHost(d: BookingData) {
  const rows = [
    { label: 'Cliente',        value: d.guestName },
    { label: 'Tipo de evento', value: d.eventType },
    { label: 'Fecha',          value: formatDate(d.eventDate) },
    { label: 'Horario',        value: `${formatTime(d.startTime)} – ${formatTime(d.endTime)}` },
    { label: 'Personas',       value: `${d.guestCount}` },
    { label: 'Total del evento', value: formatCurrency(d.totalAmount) },
    { label: 'Comisión EspotHub', value: formatCurrency(d.platformFee) },
  ]
  return emailBase({
    title: 'Reserva confirmada y pagada',
    subtitle: `${d.guestName} completó el pago en ${d.spaceName}.`,
    accentColor: '#35C493',
    body: `
      <p style="color:#374151;margin:0 0 16px;">Hola <strong>${d.hostName}</strong>, la reserva fue confirmada y el pago procesado correctamente.</p>
      ${infoBox(rows)}`,
    cta: { text: 'Ver en mi panel', url: `${SITE}/dashboard/host/reservas` },
  })
}

/** Cliente: reserva rechazada */
export function tplRechazadaCliente(data: {
  guestName: string; spaceName: string; eventDate: string; reason?: string
}) {
  return emailBase({
    title: 'El espacio no está disponible',
    subtitle: `${data.spaceName} no pudo confirmar tu solicitud para esa fecha.`,
    accentColor: '#DC2626',
    body: `
      <p style="color:#374151;margin:0 0 16px;">Hola <strong>${data.guestName}</strong>, lamentablemente el propietario de <strong>${data.spaceName}</strong> no puede aceptar tu solicitud para el ${formatDate(data.eventDate)}.</p>
      ${data.reason ? `<p style="color:#6B7280;font-size:13px;background:#FEF2F2;border:1px solid #FEE2E2;border-radius:10px;padding:12px 16px;margin:0 0 16px;">Motivo: ${data.reason}</p>` : ''}
      <p style="color:#374151;margin:0;">Te invitamos a explorar otros espacios disponibles. Hay muchas opciones esperándote.</p>`,
    cta: { text: 'Explorar otros espacios', url: `${SITE}/buscar` },
  })
}

/** Participante: reserva cancelada */
export function tplCancelada(data: {
  recipientName: string; cancelledBy: string; spaceName: string
  eventDate: string; reason?: string; isGuest: boolean
}) {
  return emailBase({
    title: 'Reserva cancelada',
    subtitle: `La reserva en ${data.spaceName} fue cancelada.`,
    accentColor: '#6B7280',
    body: `
      <p style="color:#374151;margin:0 0 16px;">Hola <strong>${data.recipientName}</strong>, la reserva en <strong>${data.spaceName}</strong> para el ${formatDate(data.eventDate)} fue cancelada por ${data.cancelledBy}.</p>
      ${data.reason ? `<p style="color:#6B7280;font-size:13px;background:#F9FAFB;border:1px solid #E8ECF0;border-radius:10px;padding:12px 16px;margin:0 0 16px;">Motivo: ${data.reason}</p>` : ''}
      <p style="color:#374151;margin:0;">${data.isGuest ? 'Si tienes preguntas sobre reembolsos, contáctanos.' : 'El cliente será notificado.'}</p>`,
    cta: data.isGuest
      ? { text: 'Explorar otros espacios', url: `${SITE}/buscar` }
      : { text: 'Ver mis reservas', url: `${SITE}/dashboard/host/reservas` },
  })
}

/** Pago completado — para admin y notificaciones de Azul */
export function tplPagoCompletado(data: {
  recipientName: string
  spaceName: string
  guestName: string
  eventDate: string
  eventInfo: string
  totalAmount: number
  commissionAmount: number
  netAmount: number
  azulOrderId?: string
  isAdmin?: boolean
  isHost?: boolean
  siteUrl: string
}) {
  const baseRows = [
    { label: 'Espacio',           value: data.spaceName },
    { label: 'Cliente',           value: data.guestName },
    { label: 'Evento',            value: data.eventInfo },
    { label: 'Total del evento',  value: formatCurrency(data.totalAmount) },
    { label: 'Comisión EspotHub', value: formatCurrency(data.commissionAmount) },
    { label: 'Neto al propietario', value: formatCurrency(data.netAmount) },
    ...(data.azulOrderId ? [{ label: 'ID transacción Azul', value: data.azulOrderId }] : []),
  ]
  return emailBase({
    title: 'Pago procesado correctamente',
    subtitle: `Reserva confirmada en ${data.spaceName}.`,
    accentColor: '#35C493',
    body: `
      <p style="color:#374151;margin:0 0 16px;">Hola <strong>${data.recipientName}</strong>, el pago fue procesado y la reserva confirmada.</p>
      ${infoBox(baseRows)}`,
    cta: data.isAdmin
      ? { text: 'Ver en el panel admin', url: `${data.siteUrl}/admin/liquidaciones` }
      : data.isHost
        ? { text: 'Ver en mi panel', url: `${data.siteUrl}/dashboard/host/pagos` }
        : { text: 'Ver mi reserva', url: `${data.siteUrl}/dashboard/reservas` },
  })
}
