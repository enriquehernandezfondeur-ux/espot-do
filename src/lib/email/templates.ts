/**
 * Sistema centralizado de emails — Espot
 * Template base responsive con identidad de marca.
 * Compatible con: Gmail, Outlook, Apple Mail, Yahoo Mail, móviles.
 */

import { formatCurrency, formatDate, formatTime } from '@/lib/utils'

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://espothub.com'

// ── Logo robusto para email (PNG + fallback texto) ────────

function logo() {
  return `
    <div style="text-align:center;margin-bottom:32px;">
      <!--[if !mso]><!-->
      <img src="${SITE}/logo-email.png" alt="Espot" width="130" height="28"
        style="height:28px;width:auto;display:inline-block;border:0;outline:none;text-decoration:none;"
        onerror="this.style.display='none'" />
      <!--<![endif]-->
      <!--[if mso]>
      <div style="font-family:Arial,sans-serif;font-size:20px;font-weight:800;color:#03313C;letter-spacing:-0.04em;">
        espot<span style="color:#35C493;">.do</span>
      </div>
      <![endif]-->
    </div>`
}

// ── Fila de tabla de información ─────────────────────────

function infoRow(label: string, value: string, last = false) {
  return `
    <tr>
      <td style="padding:11px 18px;font-size:13px;color:#6B7280;${last ? '' : 'border-bottom:1px solid #F0F2F5;'}width:44%;background:#FAFBFC;vertical-align:top;font-family:Arial,sans-serif;">${label}</td>
      <td style="padding:11px 18px;font-size:13px;color:#0F1623;font-weight:600;${last ? '' : 'border-bottom:1px solid #F0F2F5;'}vertical-align:top;font-family:Arial,sans-serif;">${value}</td>
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
  unsubscribeUrl,
}: {
  title: string
  subtitle?: string
  accentColor?: string
  body: string
  cta?: { text: string; url: string }
  note?: string
  unsubscribeUrl?: string
}) {
  const ctaHtml = cta ? `
      <!-- Botón CTA -->
      <div style="padding:${note ? '0' : '8px'} 36px 36px;text-align:center;">
        <!--[if mso]>
        <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="${cta.url}" style="height:48px;v-text-anchor:middle;width:200px;" arcsize="30%" stroke="f" fillcolor="${accentColor}">
          <w:anchorlock/>
          <center style="color:#ffffff;font-family:Arial,sans-serif;font-size:14px;font-weight:bold;">${cta.text}</center>
        </v:roundrect>
        <![endif]-->
        <!--[if !mso]><!-->
        <a href="${cta.url}"
          style="display:inline-block;background:${accentColor};color:#ffffff;font-family:Arial,sans-serif;font-size:14px;font-weight:700;padding:14px 36px;border-radius:14px;text-decoration:none;letter-spacing:-0.01em;mso-hide:all;">
          ${cta.text} &rarr;
        </a>
        <!--<![endif]-->
      </div>` : ''

  const noteHtml = note ? `
      <div style="margin:0 36px 24px;padding:14px 18px;background:#F0FDF9;border:1px solid rgba(53,196,147,0.25);border-radius:12px;">
        <p style="color:#065F46;font-size:13px;margin:0;line-height:1.6;font-family:Arial,sans-serif;">${note}</p>
      </div>` : ''

  const footer = `
    <div style="text-align:center;margin-top:28px;padding:0 20px;">
      <p style="color:#9CA3AF;font-size:12px;margin:0 0 4px;font-family:Arial,sans-serif;">
        Espot &middot; Espacios para eventos en Rep&uacute;blica Dominicana
      </p>
      <p style="color:#CBD5E1;font-size:11px;margin:0 0 4px;font-family:Arial,sans-serif;">
        &copy; 2026 ESPOT, S.R.L. &middot;
        <a href="mailto:contacto@espothub.com" style="color:#6EE7C7;text-decoration:none;">contacto@espothub.com</a>
      </p>
      ${unsubscribeUrl ? `
      <p style="color:#CBD5E1;font-size:10px;margin:0;font-family:Arial,sans-serif;">
        <a href="${unsubscribeUrl}" style="color:#CBD5E1;text-decoration:underline;">Cancelar suscripci&oacute;n</a>
      </p>` : ''}
    </div>`

  return `<!DOCTYPE html>
<html lang="es" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="x-apple-disable-message-reformatting">
  <title>${title}</title>
  <!--[if mso]>
  <noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript>
  <![endif]-->
  <style>
    @media only screen and (max-width:600px) {
      .email-wrapper { padding: 20px 12px !important; }
      .email-card    { border-radius: 16px !important; }
      .card-body     { padding: 20px 20px !important; }
      .card-header   { padding: 24px 20px 16px !important; }
      .cta-wrap      { padding: 0 20px 28px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background:#F2F4F3;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
  <!--[if mso | IE]><table align="center" border="0" cellpadding="0" cellspacing="0" style="width:600px;" width="600"><tr><td><![endif]-->
  <div class="email-wrapper" style="max-width:580px;margin:0 auto;padding:40px 20px;">

    ${logo()}

    <!-- Tarjeta principal -->
    <div class="email-card" style="background:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,0.07);">

      <!-- Banda de color -->
      <div style="height:5px;background:${accentColor};line-height:5px;font-size:0;">&nbsp;</div>

      <!-- Encabezado -->
      <div class="card-header" style="padding:32px 36px 20px;">
        <h1 style="color:#03313C;font-size:21px;font-weight:700;margin:0 0 8px;letter-spacing:-0.03em;line-height:1.2;font-family:Arial,sans-serif;">${title}</h1>
        ${subtitle ? `<p style="color:#6B7280;font-size:14px;margin:0;line-height:1.5;font-family:Arial,sans-serif;">${subtitle}</p>` : ''}
      </div>

      <div style="height:1px;background:#F0F2F5;font-size:0;line-height:0;">&nbsp;</div>

      <!-- Cuerpo -->
      <div class="card-body" style="padding:24px 36px;color:#374151;font-size:14px;line-height:1.75;font-family:Arial,sans-serif;">
        ${body}
      </div>

      ${noteHtml}
      ${ctaHtml}
    </div>

    ${footer}
  </div>
  <!--[if mso | IE]></td></tr></table><![endif]-->
</body>
</html>`
}

// ── Interfaces ────────────────────────────────────────────

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

// ── 1. BIENVENIDA (nuevo registro) ───────────────────────

export function tplBienvenida(data: { name: string }) {
  return emailBase({
    title: `Bienvenido a Espot, ${data.name}`,
    subtitle: 'Tu cuenta está lista. Explora los mejores espacios para tu próximo evento.',
    accentColor: '#35C493',
    body: `
      <p style="color:#374151;margin:0 0 16px;">Hola <strong>${data.name}</strong>, nos alegra tenerte en Espot.</p>
      <p style="color:#374151;margin:0 0 20px;">Somos la plataforma donde puedes encontrar y reservar salones, rooftops, restaurantes, villas y más para cualquier tipo de evento en República Dominicana.</p>
      ${infoBox([
        { label: 'Lo que puedes hacer', value: 'Buscar y filtrar espacios por sector, capacidad y tipo de evento' },
        { label: 'Reservas 100% online', value: 'Sin llamadas — selecciona fecha, paga y confirma desde la plataforma' },
        { label: 'Pagos en cuotas',       value: 'Paga en 2–3 cuotas automáticas según cuánto falta para tu evento' },
      ])}
      <p style="color:#6B7280;font-size:13px;margin:0;">¿Tienes un espacio para eventos? Puedes publicarlo gratis y empezar a recibir reservas.</p>`,
    cta: { text: 'Explorar espacios', url: `${SITE}/buscar` },
  })
}

// ── 2. SOLICITUD ENVIADA (cliente) ───────────────────────

export function tplSolicitudCliente(d: BookingData) {
  const rows = [
    { label: 'Espacio',          value: d.spaceName },
    { label: 'Tipo de evento',   value: d.eventType },
    { label: 'Fecha',            value: formatDate(d.eventDate) },
    { label: 'Horario',          value: `${formatTime(d.startTime)} &ndash; ${formatTime(d.endTime)}` },
    { label: 'Personas',         value: `${d.guestCount}` },
    { label: 'Total del evento', value: formatCurrency(d.totalAmount) },
    { label: 'Referencia',       value: d.bookingId.slice(0, 8).toUpperCase() },
  ]
  return emailBase({
    title: 'Solicitud enviada',
    subtitle: `Hola ${d.guestName}, recibimos tu solicitud para ${d.spaceName}.`,
    accentColor: '#2563EB',
    body: `
      <p style="color:#374151;margin:0 0 16px;">Tu solicitud fue enviada al propietario. Te notificaremos cuando responda.</p>
      ${infoBox(rows)}
      <p style="color:#6B7280;font-size:13px;margin:0;">Puedes hacer seguimiento desde tu panel de reservas en cualquier momento.</p>`,
    cta: { text: 'Ver mis reservas', url: `${SITE}/dashboard/reservas` },
  })
}

// ── 3. NUEVA SOLICITUD (propietario) ─────────────────────

export function tplSolicitudHost(d: BookingData & { isQuote?: boolean }) {
  const rows = [
    { label: 'Cliente',          value: `${d.guestName}${d.guestEmail ? ` &middot; ${d.guestEmail}` : ''}` },
    { label: 'Tipo de evento',   value: d.eventType },
    { label: 'Fecha',            value: formatDate(d.eventDate) },
    { label: 'Horario',          value: `${formatTime(d.startTime)} &ndash; ${formatTime(d.endTime)}` },
    { label: 'Personas',         value: `${d.guestCount}` },
    ...(d.isQuote ? [] : [{ label: 'Total del evento', value: formatCurrency(d.totalAmount) }]),
    ...(d.selectedAddons.length > 0 ? [{ label: 'Adicionales', value: d.selectedAddons.map(a => a.name).join(', ') }] : []),
  ]
  return emailBase({
    title: d.isQuote ? 'Nueva solicitud de cotizaci&oacute;n' : 'Nueva solicitud de reserva',
    subtitle: d.isQuote
      ? `${d.guestName} te pide una cotizaci&oacute;n para ${d.spaceName}.`
      : `${d.guestName} quiere reservar ${d.spaceName}.`,
    accentColor: '#35C493',
    body: `
      <p style="color:#374151;margin:0 0 16px;">${d.isQuote ? 'Un cliente quiere conocer el precio para su evento. Responde con una propuesta desde tu panel.' : 'Alguien quiere celebrar en tu espacio. Confirma disponibilidad desde tu panel.'}</p>
      ${infoBox(rows)}`,
    cta: { text: 'Ver solicitud en mi panel', url: `${SITE}/dashboard/host/reservas` },
  })
}

// ── 4. RESERVA ACEPTADA — procede a pagar (cliente) ──────

export function tplAceptadaCliente(d: BookingData) {
  const rows = [
    { label: 'Espacio',              value: d.spaceName },
    { label: 'Fecha',                value: formatDate(d.eventDate) },
    { label: 'Horario',              value: `${formatTime(d.startTime)} &ndash; ${formatTime(d.endTime)}` },
    { label: 'Total del evento',     value: formatCurrency(d.totalAmount) },
    { label: 'Primera cuota (pagar)', value: formatCurrency(d.platformFee) },
  ]
  return emailBase({
    title: 'El propietario acept&oacute; tu solicitud',
    subtitle: `${d.spaceName} est&aacute; disponible para tu evento.`,
    accentColor: '#16A34A',
    body: `
      <p style="color:#374151;margin:0 0 16px;">Hola <strong>${d.guestName}</strong>, el propietario confirm&oacute; disponibilidad. Completa el pago para asegurar la fecha.</p>
      ${infoBox(rows)}`,
    cta: { text: 'Completar pago', url: `${SITE}/pago/${d.bookingId}` },
    note: 'Solo pagas si decides confirmar. El pago se procesa de forma segura con Azul Payments.',
  })
}

// ── 5. RESERVA CONFIRMADA — pago inicial (cliente) ───────

export function tplConfirmadaCliente(d: BookingData & { remainingAmount: number }) {
  const rows = [
    { label: 'Espacio',              value: d.spaceName },
    { label: 'Direcci&oacute;n',     value: d.spaceAddress },
    { label: 'Fecha',                value: formatDate(d.eventDate) },
    { label: 'Horario',              value: `${formatTime(d.startTime)} &ndash; ${formatTime(d.endTime)}` },
    { label: 'Personas',             value: `${d.guestCount}` },
    { label: 'Pago realizado',       value: formatCurrency(d.platformFee) },
    { label: 'Pendiente en cuotas',  value: formatCurrency(d.remainingAmount) },
    { label: 'Referencia',           value: d.bookingId.slice(0, 8).toUpperCase() },
  ]
  return emailBase({
    title: '&iexcl;Reserva confirmada!',
    subtitle: `Todo listo para tu evento en ${d.spaceName}.`,
    accentColor: '#35C493',
    body: `
      <p style="color:#374151;margin:0 0 16px;">Hola <strong>${d.guestName}</strong>, tu reserva est&aacute; confirmada y tu fecha asegurada.</p>
      ${infoBox(rows)}
      <p style="color:#6B7280;font-size:13px;margin:8px 0 0;">Las cuotas restantes se cobrar&aacute;n autom&aacute;ticamente seg&uacute;n el plan de pagos.</p>`,
    cta: { text: 'Ver mi reserva', url: `${SITE}/dashboard/reservas/${d.bookingId}` },
  })
}

// ── 6. RESERVA CONFIRMADA — notificación al propietario ──

export function tplConfirmadaHost(d: BookingData) {
  const rows = [
    { label: 'Cliente',              value: d.guestName },
    { label: 'Tipo de evento',       value: d.eventType },
    { label: 'Fecha',                value: formatDate(d.eventDate) },
    { label: 'Horario',              value: `${formatTime(d.startTime)} &ndash; ${formatTime(d.endTime)}` },
    { label: 'Personas',             value: `${d.guestCount}` },
    { label: 'Total del evento',     value: formatCurrency(d.totalAmount) },
    { label: 'Comisi&oacute;n espot', value: formatCurrency(d.platformFee) },
  ]
  return emailBase({
    title: 'Reserva confirmada y pagada',
    subtitle: `${d.guestName} complet&oacute; el pago en ${d.spaceName}.`,
    accentColor: '#35C493',
    body: `
      <p style="color:#374151;margin:0 0 16px;">Hola <strong>${d.hostName}</strong>, la reserva fue confirmada y el pago procesado correctamente.</p>
      ${infoBox(rows)}`,
    cta: { text: 'Ver en mi panel', url: `${SITE}/dashboard/host/reservas` },
  })
}

// ── 7. RESERVA RECHAZADA (cliente) ───────────────────────

export function tplRechazadaCliente(data: {
  guestName: string; spaceName: string; eventDate: string; reason?: string
}) {
  return emailBase({
    title: 'El espacio no est&aacute; disponible',
    subtitle: `${data.spaceName} no pudo confirmar tu solicitud para esa fecha.`,
    accentColor: '#DC2626',
    body: `
      <p style="color:#374151;margin:0 0 16px;">Hola <strong>${data.guestName}</strong>, el propietario de <strong>${data.spaceName}</strong> no puede aceptar tu solicitud para el ${formatDate(data.eventDate)}.</p>
      ${data.reason ? `<p style="color:#6B7280;font-size:13px;background:#FEF2F2;border:1px solid #FEE2E2;border-radius:10px;padding:12px 16px;margin:0 0 16px;">Motivo: ${data.reason}</p>` : ''}
      <p style="color:#374151;margin:0;">Te invitamos a explorar otros espacios disponibles.</p>`,
    cta: { text: 'Explorar otros espacios', url: `${SITE}/buscar` },
  })
}

// ── 8. RESERVA CANCELADA (cualquier parte) ───────────────

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
      <p style="color:#374151;margin:0;">${data.isGuest ? 'Si tienes preguntas sobre reembolsos, cont&aacute;ctanos en contacto@espothub.com.' : 'El cliente ser&aacute; notificado.'}</p>`,
    cta: data.isGuest
      ? { text: 'Explorar otros espacios', url: `${SITE}/buscar` }
      : { text: 'Ver mis reservas', url: `${SITE}/dashboard/host/reservas` },
  })
}

// ── 9. RECORDATORIO DE CUOTA PRÓXIMA ─────────────────────

export function tplRecordatorioCuota(data: {
  guestName: string; spaceName: string; eventDate: string
  installmentNumber: number; totalInstallments: number
  amount: number; dueDate: string; daysLeft: number; paymentUrl: string
}) {
  const urgency = data.daysLeft <= 1
  return emailBase({
    title: `Recordatorio de pago &mdash; Cuota ${data.installmentNumber} de ${data.totalInstallments}`,
    subtitle: `${data.spaceName} &middot; ${formatDate(data.eventDate)}`,
    accentColor: urgency ? '#DC2626' : '#D97706',
    body: `
      <p style="color:#374151;margin:0 0 16px;">Hola <strong>${data.guestName}</strong>, tienes un pago pr&oacute;ximo para asegurar tu reserva.</p>
      ${infoBox([
        { label: 'Espacio',            value: data.spaceName },
        { label: 'Fecha del evento',   value: formatDate(data.eventDate) },
        { label: 'Cuota',              value: `${data.installmentNumber} de ${data.totalInstallments}` },
        { label: 'Monto a pagar',      value: formatCurrency(data.amount) },
        { label: 'Fecha l&iacute;mite', value: formatDate(data.dueDate) },
        { label: 'Tiempo restante',    value: data.daysLeft <= 0 ? 'Venci&oacute; hoy' : data.daysLeft === 1 ? 'Vence ma&ntilde;ana' : `Faltan ${data.daysLeft} d&iacute;as` },
      ])}
      <p style="color:#6B7280;font-size:13px;margin:0;">Si no realizas el pago antes de la fecha l&iacute;mite, la reserva podr&iacute;a cancelarse autom&aacute;ticamente.</p>`,
    cta: { text: `Pagar cuota ${data.installmentNumber}`, url: data.paymentUrl },
  })
}

// ── 10. CONFIRMACIÓN DE CUOTA PAGADA ─────────────────────

export function tplCuotaPagada(data: {
  guestName: string; spaceName: string; eventDate: string
  installmentNumber: number; totalInstallments: number
  amountPaid: number; remainingAmount: number
  nextDueDate?: string; nextDueAmount?: number
}) {
  const allPaid = data.remainingAmount <= 0
  const rows = [
    { label: 'Espacio',          value: data.spaceName },
    { label: 'Fecha del evento', value: formatDate(data.eventDate) },
    { label: 'Cuota pagada',     value: `${data.installmentNumber} de ${data.totalInstallments}` },
    { label: 'Monto pagado',     value: formatCurrency(data.amountPaid) },
  ]
  if (!allPaid && data.nextDueDate && data.nextDueAmount) {
    rows.push({ label: 'Saldo pendiente',  value: formatCurrency(data.remainingAmount) })
    rows.push({ label: 'Pr&oacute;ximo pago', value: `${formatCurrency(data.nextDueAmount)} &middot; ${formatDate(data.nextDueDate)}` })
  }
  return emailBase({
    title: allPaid ? '&iexcl;Todo pagado!' : `Cuota ${data.installmentNumber} confirmada`,
    subtitle: allPaid
      ? 'Tu reserva est&aacute; completamente pagada.'
      : `Quedan ${data.totalInstallments - data.installmentNumber} cuota${data.totalInstallments - data.installmentNumber !== 1 ? 's' : ''} m&aacute;s.`,
    accentColor: '#35C493',
    body: `
      <p style="color:#374151;margin:0 0 16px;">Hola <strong>${data.guestName}</strong>, recibimos tu pago correctamente.</p>
      ${infoBox(rows)}`,
    cta: { text: 'Ver mi reserva', url: `${SITE}/dashboard/reservas` },
  })
}

// ── 11. COTIZACIÓN SOLICITADA (cliente) ──────────────────

export function tplSolicitudCotizacionCliente(d: BookingData) {
  const rows = [
    { label: 'Espacio',             value: d.spaceName },
    { label: 'Tipo de evento',      value: d.eventType },
    { label: 'Fecha',               value: formatDate(d.eventDate) },
    ...(d.startTime ? [{ label: 'Horario referencial', value: `${formatTime(d.startTime)} &ndash; ${formatTime(d.endTime)}` }] : []),
    { label: 'Personas',            value: `${d.guestCount}` },
    { label: 'Referencia',          value: d.bookingId.slice(0, 8).toUpperCase() },
  ]
  return emailBase({
    title: 'Cotizaci&oacute;n solicitada',
    subtitle: `Hola ${d.guestName}, recibimos tu solicitud para ${d.spaceName}.`,
    accentColor: '#0891B2',
    body: `
      <p style="color:#374151;margin:0 0 16px;">El propietario revisar&aacute; los detalles de tu evento y te enviar&aacute; una <strong>propuesta de precio personalizada</strong> en las pr&oacute;ximas 48 horas h&aacute;biles.</p>
      ${infoBox(rows)}
      <p style="color:#374151;margin:8px 0 16px;">Recibir&aacute;s un email con la propuesta en cuanto el propietario la env&iacute;e.</p>
      <p style="color:#6B7280;font-size:13px;margin:0;">Si el propietario no responde en ese plazo, pu&eacute;des escribirle desde el chat o contactarnos en <a href="mailto:contacto@espothub.com" style="color:#35C493;">contacto@espothub.com</a>.</p>`,
    cta: { text: 'Ver mi cotizaci&oacute;n', url: `${SITE}/dashboard/reservas` },
    note: 'No se realizar&aacute; ning&uacute;n cobro hasta que aceptes la propuesta del propietario.',
  })
}

// ── 12. REEMBOLSO EN PROCESO (cliente) ───────────────────

export function tplReembolsoPendiente(data: {
  guestName: string; spaceName: string; eventDate: string
  paidAmount: number; bookingId: string
}) {
  return emailBase({
    title: 'Tu reembolso est&aacute; en proceso',
    subtitle: `Reserva cancelada en ${data.spaceName}`,
    accentColor: '#D97706',
    body: `
      <p style="color:#374151;margin:0 0 16px;">Hola <strong>${data.guestName}</strong>, tu reserva en <strong>${data.spaceName}</strong> para el ${formatDate(data.eventDate)} fue cancelada.</p>
      ${infoBox([
        { label: 'Monto pagado',      value: formatCurrency(data.paidAmount) },
        { label: 'Estado reembolso',  value: 'En proceso' },
        { label: 'Tiempo estimado',   value: '3&ndash;5 d&iacute;as h&aacute;biles' },
        { label: 'Referencia',        value: data.bookingId.slice(0, 8).toUpperCase() },
      ])}
      <p style="color:#374151;margin:0 0 12px;">Realizaremos la transferencia a tu cuenta bancaria en ese plazo. Para consultas incluye la referencia en tu mensaje.</p>`,
    cta: { text: 'Contactar soporte', url: `mailto:contacto@espothub.com?subject=Reembolso ${data.bookingId.slice(0,8).toUpperCase()}` },
  })
}

// ── 13. ALERTA DE REEMBOLSO PENDIENTE (admin) ─────────────

export function tplReembolsoPendienteAdmin(data: {
  guestName: string; guestEmail: string; spaceName: string
  eventDate: string; paidAmount: number; bookingId: string
  cancelledBy: string
  refundBankInfo?: { holderName: string; bank: string; accountNumber: string; accountType: string }
}) {
  const bankRows = data.refundBankInfo ? [
    { label: '&mdash; Datos bancarios &mdash;', value: '' },
    { label: 'Titular',           value: data.refundBankInfo.holderName },
    { label: 'Banco',             value: data.refundBankInfo.bank },
    { label: 'Tipo',              value: data.refundBankInfo.accountType === 'ahorro' ? 'Ahorro' : 'Corriente' },
    { label: 'N&uacute;mero',     value: data.refundBankInfo.accountNumber },
  ] : [
    { label: 'Datos bancarios',   value: 'PENDIENTE: El cliente no proporcion&oacute; datos. Contactarlo.' },
  ]

  return emailBase({
    title: 'ALERTA: Cancelaci&oacute;n con reembolso pendiente',
    subtitle: `Reserva ${data.bookingId.slice(0, 8).toUpperCase()} &mdash; Transferencia requerida`,
    accentColor: '#DC2626',
    body: `
      <p style="color:#374151;margin:0 0 16px;">Una reserva con pagos procesados fue cancelada. <strong>Realiza la transferencia bancaria al cliente por el monto indicado.</strong></p>
      ${infoBox([
        { label: 'Reserva ID',          value: data.bookingId },
        { label: 'Cliente',             value: `${data.guestName} &middot; ${data.guestEmail}` },
        { label: 'Espacio',             value: data.spaceName },
        { label: 'Fecha del evento',    value: formatDate(data.eventDate) },
        { label: 'Monto a transferir',  value: formatCurrency(data.paidAmount) },
        { label: 'Cancelado por',       value: data.cancelledBy },
        ...bankRows,
      ])}`,
    cta: { text: 'Ver en panel admin', url: `${SITE}/admin/liquidaciones` },
  })
}

// ── 14. PAGO COMPLETADO (admin/host/cliente) ─────────────

export function tplPagoCompletado(data: {
  recipientName: string; spaceName: string; guestName: string
  eventDate: string; eventInfo: string; totalAmount: number
  commissionAmount: number; netAmount: number; azulOrderId?: string
  isAdmin?: boolean; isHost?: boolean; siteUrl: string
}) {
  const rows = [
    { label: 'Espacio',                value: data.spaceName },
    { label: 'Cliente',                value: data.guestName },
    { label: 'Evento',                 value: data.eventInfo },
    { label: 'Total del evento',       value: formatCurrency(data.totalAmount) },
    { label: 'Comisi&oacute;n espot',  value: formatCurrency(data.commissionAmount) },
    { label: 'Neto al propietario',    value: formatCurrency(data.netAmount) },
    ...(data.azulOrderId ? [{ label: 'ID transacci&oacute;n Azul', value: data.azulOrderId }] : []),
  ]
  return emailBase({
    title: 'Pago procesado correctamente',
    subtitle: `Reserva confirmada en ${data.spaceName}.`,
    accentColor: '#35C493',
    body: `
      <p style="color:#374151;margin:0 0 16px;">Hola <strong>${data.recipientName}</strong>, el pago fue procesado y la reserva confirmada.</p>
      ${infoBox(rows)}`,
    cta: data.isAdmin
      ? { text: 'Ver en el panel admin', url: `${data.siteUrl}/admin/liquidaciones` }
      : data.isHost
        ? { text: 'Ver en mi panel', url: `${data.siteUrl}/dashboard/host/pagos` }
        : { text: 'Ver mi reserva', url: `${data.siteUrl}/dashboard/reservas` },
  })
}

// ── 15. RECORDATORIO PRE-EVENTO (48h antes) ──────────────

export function tplRecordatorioEvento(data: {
  guestName: string; spaceName: string; spaceAddress: string
  eventDate: string; startTime: string; endTime: string
  guestCount: number; bookingId: string
}) {
  return emailBase({
    title: `Tu evento es ma&ntilde;ana`,
    subtitle: `${data.spaceName} &middot; ${formatDate(data.eventDate)}`,
    accentColor: '#35C493',
    body: `
      <p style="color:#374151;margin:0 0 16px;">Hola <strong>${data.guestName}</strong>, te recordamos que tu evento es ma&ntilde;ana. Aqu&iacute; tienes todo lo que necesitas saber.</p>
      ${infoBox([
        { label: 'Espacio',             value: data.spaceName },
        { label: 'Direcci&oacute;n',    value: data.spaceAddress || 'Ver en tu reserva' },
        { label: 'Fecha',               value: formatDate(data.eventDate) },
        { label: 'Horario',             value: `${formatTime(data.startTime)} &ndash; ${formatTime(data.endTime)}` },
        { label: 'Personas',            value: `${data.guestCount}` },
        { label: 'Referencia',          value: data.bookingId.slice(0, 8).toUpperCase() },
      ])}
      <p style="color:#374151;margin:0 0 12px;"><strong>Recomendaciones:</strong></p>
      <ul style="color:#374151;margin:0 0 16px;padding-left:20px;line-height:2;">
        <li>Llega 15 minutos antes para coordinar con el propietario</li>
        <li>Ten a mano esta confirmaci&oacute;n o tu email de reserva</li>
        <li>Coordina decoraci&oacute;n o acceso con anticipaci&oacute;n v&iacute;a mensajes</li>
      </ul>`,
    cta: { text: 'Ver detalle de mi reserva', url: `${SITE}/dashboard/reservas/${data.bookingId}` },
  })
}

// ── 16. SOLICITUD DE RESEÑA (post-evento) ─────────────────

export function tplSolicitudResena(data: {
  guestName: string; spaceName: string; eventDate: string
  bookingId: string; spaceSlug: string
}) {
  return emailBase({
    title: `&iquest;C&oacute;mo estuvo tu evento en ${data.spaceName}?`,
    subtitle: `${formatDate(data.eventDate)} &mdash; Ayuda a otros clientes con tu experiencia`,
    accentColor: '#F59E0B',
    body: `
      <p style="color:#374151;margin:0 0 16px;">Hola <strong>${data.guestName}</strong>, esperamos que tu evento haya sido un &eacute;xito.</p>
      <p style="color:#374151;margin:0 0 20px;">Tu opini&oacute;n ayuda a otros usuarios a elegir el espacio perfecto para sus celebraciones. Toma solo 30 segundos.</p>
      ${infoBox([
        { label: 'Espacio',      value: data.spaceName },
        { label: 'Fecha',        value: formatDate(data.eventDate) },
        { label: 'Referencia',   value: data.bookingId.slice(0, 8).toUpperCase() },
      ])}`,
    cta: { text: 'Dejar mi rese&ntilde;a', url: `${SITE}/dashboard/reservas` },
    note: 'Tu rese&ntilde;a es 100% voluntaria. S&oacute;lo se publica en el perfil del espacio.',
  })
}
