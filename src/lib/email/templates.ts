/**
 * Sistema centralizado de emails — Espot
 * Template base responsive con identidad de marca.
 * Compatible con: Gmail, Outlook, Apple Mail, Yahoo Mail, móviles.
 */

import { formatCurrency, formatDate, formatTime, escapeHtml } from '@/lib/utils'

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://espot.do'
const DOMAIN = SITE.replace('https://', '').replace('http://', '')

// Alias corto para uso interno — escapa campos de texto de usuario en HTML
const esc = escapeHtml

// Sanitiza todos los campos de texto libre de un objeto BookingData
function sanitizeBookingData<T extends Record<string, unknown>>(d: T): T {
  const TEXT_FIELDS = ['guestName','hostName','spaceName','spaceAddress','eventType',
    'guestEmail','recipientName','cancelledBy','reason','name','message']
  const result = { ...d }
  for (const key of TEXT_FIELDS) {
    if (key in result && typeof result[key] === 'string') {
      (result as any)[key] = escapeHtml(result[key] as string)
    }
  }
  return result
}

// ── Logo de texto — funciona en TODOS los clientes de email ──
// No depende de imágenes externas que pueden bloquearse

function logo() {
  return `
    <div style="text-align:center;margin-bottom:28px;">
      <div style="display:inline-block;">
        <span style="font-family:'Poppins',Arial,sans-serif;font-size:26px;font-weight:900;color:#03313C;letter-spacing:-0.05em;line-height:1;">espot</span><span style="font-family:'Poppins',Arial,sans-serif;font-size:26px;font-weight:900;color:#35C493;letter-spacing:-0.05em;line-height:1;">.do</span>
      </div>
      <div style="width:32px;height:3px;background:linear-gradient(90deg,#35C493,#03313C);border-radius:2px;margin:6px auto 0;"></div>
    </div>`
}

// ── Fila de tabla de información ─────────────────────────

function infoRow(label: string, value: string, last = false) {
  return `
    <tr>
      <td style="padding:11px 18px;font-size:13px;color:#6B7280;${last ? '' : 'border-bottom:1px solid #F0F2F5;'}width:44%;background:#FAFBFC;vertical-align:top;font-family:'Poppins',Arial,sans-serif;">${label}</td>
      <td style="padding:11px 18px;font-size:13px;color:#0F1623;font-weight:600;${last ? '' : 'border-bottom:1px solid #F0F2F5;'}vertical-align:top;font-family:'Poppins',Arial,sans-serif;">${value}</td>
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
      <div style="padding:${note ? '8px' : '16px'} 36px 36px;text-align:center;">
        <!--[if mso]>
        <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="${cta.url}" style="height:50px;v-text-anchor:middle;width:220px;" arcsize="28%" stroke="f" fillcolor="${accentColor}">
          <w:anchorlock/>
          <center style="color:#ffffff;font-family:'Poppins',Arial,sans-serif;font-size:15px;font-weight:800;">${cta.text} →</center>
        </v:roundrect>
        <![endif]-->
        <!--[if !mso]><!-->
        <a href="${cta.url}"
          style="display:inline-block;background:${accentColor};color:#ffffff;font-family:'Poppins',Arial,sans-serif;font-size:15px;font-weight:800;padding:15px 38px;border-radius:50px;text-decoration:none;letter-spacing:-0.01em;mso-hide:all;box-shadow:0 4px 20px rgba(0,0,0,0.15);">
          ${cta.text} &rarr;
        </a>
        <!--<![endif]-->
      </div>` : ''

  const noteHtml = note ? `
      <div style="margin:0 32px 24px;padding:14px 18px;background:#F0FDF9;border-left:3px solid #35C493;border-radius:0 10px 10px 0;">
        <p style="color:#065F46;font-size:13px;margin:0;line-height:1.6;font-family:'Poppins',Arial,sans-serif;"><span style="font-weight:700;margin-right:4px;">Nota:</span>${note}</p>
      </div>` : ''

  const footer = `
    <div style="text-align:center;margin-top:32px;padding:24px 20px;border-top:1px solid #E8ECF0;">
      <!-- Logo pequeño en footer -->
      <div style="margin-bottom:12px;">
        <span style="font-family:'Poppins',Arial,sans-serif;font-size:15px;font-weight:900;color:#03313C;letter-spacing:-0.04em;">espot</span><span style="font-family:'Poppins',Arial,sans-serif;font-size:15px;font-weight:900;color:#35C493;letter-spacing:-0.04em;">.do</span>
      </div>
      <p style="color:#9CA3AF;font-size:12px;margin:0 0 6px;font-family:'Poppins',Arial,sans-serif;">
        Espacios para eventos en Rep&uacute;blica Dominicana
      </p>
      <p style="color:#CBD5E1;font-size:11px;margin:0 0 6px;font-family:'Poppins',Arial,sans-serif;">
        &copy; 2026 ESPOT, S.R.L. &middot;
        <a href="mailto:contacto@${DOMAIN}" style="color:#35C493;text-decoration:none;">contacto@${DOMAIN}</a>
        &middot; <a href="${SITE}" style="color:#9CA3AF;text-decoration:none;">${DOMAIN}</a>
      </p>
      ${unsubscribeUrl ? `
      <p style="color:#CBD5E1;font-size:10px;margin:4px 0 0;font-family:'Poppins',Arial,sans-serif;">
        <a href="${unsubscribeUrl}" style="color:#CBD5E1;text-decoration:underline;">Cancelar suscripci&oacute;n</a>
      </p>` : `
      <p style="color:#CBD5E1;font-size:10px;margin:4px 0 0;font-family:'Poppins',Arial,sans-serif;">
        <a href="${SITE}/dashboard/perfil" style="color:#CBD5E1;text-decoration:underline;">Gestionar notificaciones</a>
      </p>`}
    </div>`

  return `<!DOCTYPE html>
<html lang="es" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="x-apple-disable-message-reformatting">
  <title>${title}</title>
  <!--[if !mso]><!-->
  <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" type="text/css">
  <!--<![endif]-->
  <!--[if mso]>
  <noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript>
  <![endif]-->
  <style>
    @media only screen and (max-width:600px) {
      .email-wrapper { padding: 16px 12px !important; }
      .email-card    { border-radius: 20px !important; }
      .card-body     { padding: 20px 20px !important; }
      .card-header   { padding: 24px 20px 16px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background:#EEF2F0;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
  <!--[if mso | IE]><table align="center" border="0" cellpadding="0" cellspacing="0" style="width:600px;" width="600"><tr><td><![endif]-->
  <div class="email-wrapper" style="max-width:580px;margin:0 auto;padding:36px 20px;">

    <!-- Header con logo -->
    <div style="background:#03313C;border-radius:20px 20px 0 0;padding:28px 36px 24px;text-align:center;">
      <div style="display:inline-block;background:rgba(255,255,255,0.08);border-radius:12px;padding:10px 24px;">
        <span style="font-family:'Poppins',Arial,sans-serif;font-size:22px;font-weight:900;color:#ffffff;letter-spacing:-0.04em;line-height:1;">espot</span><span style="font-family:'Poppins',Arial,sans-serif;font-size:22px;font-weight:900;color:#35C493;letter-spacing:-0.04em;line-height:1;">.do</span>
      </div>
    </div>

    <!-- Banda de acento -->
    <div style="height:4px;background:${accentColor};font-size:0;line-height:0;">&nbsp;</div>

    <!-- Tarjeta principal -->
    <div class="email-card" style="background:#ffffff;border-radius:0 0 20px 20px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

      <!-- Encabezado del contenido -->
      <div class="card-header" style="padding:32px 36px 20px;background:#fff;">
        <h1 style="color:#03313C;font-size:22px;font-weight:800;margin:0 0 8px;letter-spacing:-0.03em;line-height:1.2;font-family:'Poppins',Arial,sans-serif;">${title}</h1>
        ${subtitle ? `<p style="color:#6B7280;font-size:14px;margin:0;line-height:1.6;font-family:'Poppins',Arial,sans-serif;">${subtitle}</p>` : ''}
      </div>

      <div style="height:1px;background:#F0F2F5;font-size:0;line-height:0;">&nbsp;</div>

      <!-- Cuerpo -->
      <div class="card-body" style="padding:24px 36px;color:#374151;font-size:14px;line-height:1.8;font-family:'Poppins',Arial,sans-serif;">
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
  [key: string]: unknown
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

export function tplBienvenida(rawData: { name: string }) {
  const data = { name: esc(rawData.name) }
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

export function tplSolicitudCliente(rawD: BookingData) {
  const d = sanitizeBookingData(rawD)
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

export function tplSolicitudHost(rawD: BookingData & { isQuote?: boolean }) {
  const d = sanitizeBookingData(rawD)
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
    cta: { text: 'Ver solicitud en mi panel', url: `${SITE}/dashboard/host/agenda` },
  })
}

// ── 4. RESERVA ACEPTADA — procede a pagar (cliente) ──────

export function tplAceptadaCliente(rawD: BookingData) {
  const d = sanitizeBookingData(rawD)
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

export function tplConfirmadaCliente(rawD: BookingData & { remainingAmount: number }) {
  const d = sanitizeBookingData(rawD)
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

export function tplConfirmadaHost(rawD: BookingData) {
  const d = sanitizeBookingData(rawD)
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
    cta: { text: 'Ver en mi panel', url: `${SITE}/dashboard/host/agenda` },
  })
}

// ── 7. RESERVA RECHAZADA (cliente) ───────────────────────

export function tplRechazadaCliente(rawData: {
  guestName: string; spaceName: string; eventDate: string; reason?: string
}) {
  const data = { ...rawData, guestName: esc(rawData.guestName), spaceName: esc(rawData.spaceName), reason: esc(rawData.reason) }
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

export function tplCancelada(rawData: {
  recipientName: string; cancelledBy: string; spaceName: string
  eventDate: string; reason?: string; isGuest: boolean
}) {
  const data = { ...rawData, recipientName: esc(rawData.recipientName), cancelledBy: esc(rawData.cancelledBy), spaceName: esc(rawData.spaceName), reason: esc(rawData.reason) }
  return emailBase({
    title: 'Reserva cancelada',
    subtitle: `La reserva en ${data.spaceName} fue cancelada.`,
    accentColor: '#6B7280',
    body: `
      <p style="color:#374151;margin:0 0 16px;">Hola <strong>${data.recipientName}</strong>, la reserva en <strong>${data.spaceName}</strong> para el ${formatDate(data.eventDate)} fue cancelada por ${data.cancelledBy}.</p>
      ${data.reason ? `<p style="color:#6B7280;font-size:13px;background:#F9FAFB;border:1px solid #E8ECF0;border-radius:10px;padding:12px 16px;margin:0 0 16px;">Motivo: ${data.reason}</p>` : ''}
      <p style="color:#374151;margin:0;">${data.isGuest ? 'Si tienes preguntas sobre reembolsos, cont&aacute;ctanos en contacto@espot.do.' : 'El cliente ser&aacute; notificado.'}</p>`,
    cta: data.isGuest
      ? { text: 'Explorar otros espacios', url: `${SITE}/buscar` }
      : { text: 'Ver mis reservas', url: `${SITE}/dashboard/host/agenda` },
  })
}

// ── 9. RECORDATORIO DE CUOTA PRÓXIMA ─────────────────────

export function tplRecordatorioCuota(rawData: {
  guestName: string; spaceName: string; eventDate: string
  installmentNumber: number; totalInstallments: number
  amount: number; dueDate: string; daysLeft: number; paymentUrl: string
}) {
  const data = { ...rawData, guestName: esc(rawData.guestName), spaceName: esc(rawData.spaceName) }
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

export function tplCuotaPagada(rawData: {
  guestName: string; spaceName: string; eventDate: string
  installmentNumber: number; totalInstallments: number
  amountPaid: number; remainingAmount: number
  nextDueDate?: string; nextDueAmount?: number
}) {
  const data = { ...rawData, guestName: esc(rawData.guestName), spaceName: esc(rawData.spaceName) }
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

export function tplSolicitudCotizacionCliente(rawD: BookingData) {
  const d = sanitizeBookingData(rawD)
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
      <p style="color:#6B7280;font-size:13px;margin:0;">Si el propietario no responde en ese plazo, pu&eacute;des escribirle desde el chat o contactarnos en <a href="mailto:contacto@espot.do" style="color:#35C493;">contacto@espot.do</a>.</p>`,
    cta: { text: 'Ver mi cotizaci&oacute;n', url: `${SITE}/dashboard/reservas` },
    note: 'No se realizar&aacute; ning&uacute;n cobro hasta que aceptes la propuesta del propietario.',
  })
}

// ── 12. REEMBOLSO EN PROCESO (cliente) ───────────────────

export function tplReembolsoPendiente(rawData: {
  guestName: string; spaceName: string; eventDate: string
  paidAmount: number; refundAmount: number; bookingId: string
}) {
  const data = { ...rawData, guestName: esc(rawData.guestName), spaceName: esc(rawData.spaceName) }
  const hasRefund = data.refundAmount > 0

  const refundRows = hasRefund
    ? [
        { label: 'Monto pagado',       value: formatCurrency(data.paidAmount) },
        { label: 'Monto a reembolsar', value: `${formatCurrency(data.refundAmount)} (seg&uacute;n pol&iacute;tica de cancelaci&oacute;n)` },
        { label: 'Estado reembolso',   value: 'En proceso' },
        { label: 'Tiempo estimado',    value: '3&ndash;5 d&iacute;as h&aacute;biles' },
        { label: 'Referencia',         value: data.bookingId.slice(0, 8).toUpperCase() },
      ]
    : [
        { label: 'Monto pagado',       value: formatCurrency(data.paidAmount) },
        { label: 'Reembolso',          value: 'Sin reembolso' },
        { label: 'Referencia',         value: data.bookingId.slice(0, 8).toUpperCase() },
      ]

  const refundNote = hasRefund
    ? `<p style="color:#374151;margin:0 0 12px;">Realizaremos la transferencia a tu cuenta bancaria en ese plazo. Para consultas incluye la referencia en tu mensaje.</p>`
    : `<p style="color:#6B7280;font-size:13px;background:#FEF2F2;border:1px solid #FEE2E2;border-radius:10px;padding:12px 16px;margin:0 0 12px;">Seg&uacute;n la pol&iacute;tica de este espacio, esta cancelaci&oacute;n no genera reembolso.</p>`

  return emailBase({
    title: hasRefund ? 'Tu reembolso est&aacute; en proceso' : 'Reserva cancelada &mdash; Sin reembolso',
    subtitle: `Reserva cancelada en ${data.spaceName}`,
    accentColor: hasRefund ? '#D97706' : '#6B7280',
    body: `
      <p style="color:#374151;margin:0 0 16px;">Hola <strong>${data.guestName}</strong>, tu reserva en <strong>${data.spaceName}</strong> para el ${formatDate(data.eventDate)} fue cancelada.</p>
      ${infoBox(refundRows)}
      ${refundNote}`,
    cta: hasRefund
      ? { text: 'Contactar soporte', url: `mailto:contacto@espot.do?subject=Reembolso ${data.bookingId.slice(0,8).toUpperCase()}` }
      : { text: 'Explorar otros espacios', url: `${SITE}/buscar` },
  })
}

// ── 13. ALERTA DE REEMBOLSO PENDIENTE (admin) ─────────────

export function tplReembolsoPendienteAdmin(rawData: {
  guestName: string; guestEmail: string; spaceName: string
  eventDate: string; paidAmount: number; refundAmount: number; bookingId: string
  cancelledBy: string
  refundBankInfo?: { holderName: string; bank: string; accountNumber: string; accountType: string }
}) {
  const data = {
    ...rawData,
    guestName:   esc(rawData.guestName),
    guestEmail:  esc(rawData.guestEmail),
    spaceName:   esc(rawData.spaceName),
    cancelledBy: esc(rawData.cancelledBy),
    refundBankInfo: rawData.refundBankInfo ? {
      holderName:    esc(rawData.refundBankInfo.holderName),
      bank:          esc(rawData.refundBankInfo.bank),
      accountNumber: esc(rawData.refundBankInfo.accountNumber),
      accountType:   rawData.refundBankInfo.accountType,
    } : undefined,
  }
  const hasRefund = data.refundAmount > 0
  const bankRows = data.refundBankInfo ? [
    { label: '&mdash; Datos bancarios &mdash;', value: '' },
    { label: 'Titular',           value: data.refundBankInfo.holderName },
    { label: 'Banco',             value: data.refundBankInfo.bank },
    { label: 'Tipo',              value: data.refundBankInfo.accountType === 'ahorro' ? 'Ahorro' : 'Corriente' },
    { label: 'N&uacute;mero',     value: data.refundBankInfo.accountNumber },
  ] : [
    { label: 'Datos bancarios',   value: 'PENDIENTE: El cliente no proporcion&oacute; datos. Contactarlo.' },
  ]

  const actionNote = hasRefund
    ? `<p style="color:#374151;margin:0 0 16px;">Una reserva con pagos procesados fue cancelada. <strong>Realiza la transferencia bancaria al cliente por el monto indicado seg&uacute;n la pol&iacute;tica de cancelaci&oacute;n.</strong></p>`
    : `<p style="color:#374151;margin:0 0 16px;">Una reserva con pagos procesados fue cancelada. <strong>Seg&uacute;n la pol&iacute;tica del espacio, NO corresponde reembolso. No se requiere transferencia.</strong></p>`

  return emailBase({
    title: hasRefund
      ? 'ALERTA: Cancelaci&oacute;n con reembolso pendiente'
      : 'INFO: Cancelaci&oacute;n sin reembolso',
    subtitle: `Reserva ${data.bookingId.slice(0, 8).toUpperCase()} &mdash; ${hasRefund ? 'Transferencia requerida' : 'Sin acci&oacute;n requerida'}`,
    accentColor: hasRefund ? '#DC2626' : '#6B7280',
    body: `
      ${actionNote}
      ${infoBox([
        { label: 'Reserva ID',             value: data.bookingId },
        { label: 'Cliente',                value: `${data.guestName} &middot; ${data.guestEmail}` },
        { label: 'Espacio',                value: data.spaceName },
        { label: 'Fecha del evento',       value: formatDate(data.eventDate) },
        { label: 'Monto pagado',           value: formatCurrency(data.paidAmount) },
        { label: 'Monto a reembolsar',     value: hasRefund ? formatCurrency(data.refundAmount) : 'Sin reembolso (pol&iacute;tica)' },
        { label: 'Cancelado por',          value: data.cancelledBy },
        ...(hasRefund ? bankRows : []),
      ])}`,
    cta: { text: 'Ver en panel admin', url: `${SITE}/admin/liquidaciones` },
  })
}

// ── 14. PAGO COMPLETADO (admin/host/cliente) ─────────────

export function tplPagoCompletado(rawData: {
  recipientName: string; spaceName: string; guestName: string
  eventDate: string; eventInfo: string; totalAmount: number
  commissionAmount: number; netAmount: number; azulOrderId?: string
  isAdmin?: boolean; isHost?: boolean; siteUrl: string
}) {
  const data = { ...rawData, recipientName: esc(rawData.recipientName), spaceName: esc(rawData.spaceName), guestName: esc(rawData.guestName) }
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

export function tplRecordatorioEvento(rawData: {
  guestName: string; spaceName: string; spaceAddress: string
  eventDate: string; startTime: string; endTime: string
  guestCount: number; bookingId: string
}) {
  const data = { ...rawData, guestName: esc(rawData.guestName), spaceName: esc(rawData.spaceName), spaceAddress: esc(rawData.spaceAddress) }
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

// ── 17. DISPUTA ABIERTA ───────────────────────────────────────

/**
 * Se llama en tres variantes:
 *  - 'opener'     → confirmación a quien abrió la disputa
 *  - 'respondent' → alerta a la parte acusada
 *  - 'admin'      → alerta interna con todos los detalles
 */
export function tplDisputaAbierta(rawData: {
  variant: 'opener' | 'respondent' | 'admin'
  recipientName: string
  spaceName: string
  bookingId: string
  category: string
  reason: string
  disputeId: string
  ctaUrl: string
  // solo para variant === 'admin'
  openerName?:  string
  openerEmail?: string
  againstName?: string
  againstEmail?: string
  openerRole?:  string
}) {
  const data = {
    ...rawData,
    recipientName: esc(rawData.recipientName),
    spaceName:     esc(rawData.spaceName),
    category:      esc(rawData.category),
    reason:        esc(rawData.reason),
    openerName:    esc(rawData.openerName),
    openerEmail:   esc(rawData.openerEmail),
    againstName:   esc(rawData.againstName),
    againstEmail:  esc(rawData.againstEmail),
    openerRole:    esc(rawData.openerRole),
  }

  const shortBookingId = data.bookingId.slice(0, 8).toUpperCase()
  const shortDisputeId = data.disputeId.slice(0, 8).toUpperCase()

  if (data.variant === 'opener') {
    return emailBase({
      title:       'Disputa recibida',
      subtitle:    `Tu disputa sobre ${data.spaceName} fue registrada y está siendo revisada.`,
      accentColor: '#D97706',
      body: `
        <p style="color:#374151;margin:0 0 16px;">Hola <strong>${data.recipientName}</strong>, recibimos tu disputa correctamente.</p>
        <p style="color:#374151;margin:0 0 20px;">Nuestro equipo revisar&aacute; los detalles y te contactar&aacute; dentro de las pr&oacute;ximas 48 horas h&aacute;biles con una resoluci&oacute;n.</p>
        ${infoBox([
          { label: 'ID disputa',          value: shortDisputeId },
          { label: 'Reserva',             value: shortBookingId },
          { label: 'Espacio',             value: data.spaceName },
          { label: 'Categor&iacute;a',    value: data.category },
          { label: 'Estado',              value: 'Abierta &mdash; en revisi&oacute;n' },
        ])}
        <p style="color:#6B7280;font-size:13px;margin:0;">Si tienes evidencia adicional (fotos, capturas, contratos) pu&eacute;des enviarla a <a href="mailto:contacto@espot.do" style="color:#35C493;">contacto@espot.do</a> indicando el ID de tu disputa.</p>`,
      cta:  { text: 'Ver mis reservas', url: data.ctaUrl },
      note: 'No tomes acciones unilaterales mientras la disputa est&aacute; activa. Espot mediar&aacute; de forma imparcial.',
    })
  }

  if (data.variant === 'respondent') {
    return emailBase({
      title:       'Hay una disputa en tu contra',
      subtitle:    `Alguien abri&oacute; una disputa relacionada con la reserva en ${data.spaceName}.`,
      accentColor: '#DC2626',
      body: `
        <p style="color:#374151;margin:0 0 16px;">Hola <strong>${data.recipientName}</strong>, queremos informarte que se registr&oacute; una disputa relacionada con una reserva donde participas.</p>
        <p style="color:#374151;margin:0 0 20px;">Nuestro equipo revisar&aacute; ambas versiones antes de tomar cualquier decisi&oacute;n. Si tienes informaci&oacute;n que aporte claridad, env&iacute;ala a <a href="mailto:contacto@espot.do" style="color:#35C493;">contacto@espot.do</a>.</p>
        ${infoBox([
          { label: 'ID disputa',            value: shortDisputeId },
          { label: 'Reserva',               value: shortBookingId },
          { label: 'Espacio',               value: data.spaceName },
          { label: 'Categor&iacute;a',      value: data.category },
          { label: 'Descripci&oacute;n',
            value: data.reason.length > 120
              ? data.reason.slice(0, 120) + '&hellip;'
              : data.reason },
        ])}
        <p style="color:#6B7280;font-size:13px;margin:0;">Nuestro equipo podr&iacute;a contactarte para recopilar tu versi&oacute;n de los hechos.</p>`,
      cta:  { text: 'Ver mi reserva', url: data.ctaUrl },
      note: 'No realices cambios ni cancelaciones en la reserva mientras la disputa est&aacute; activa.',
    })
  }

  // variant === 'admin'
  return emailBase({
    title:       'ALERTA: Nueva disputa abierta',
    subtitle:    `Disputa ${shortDisputeId} &mdash; ${data.category}`,
    accentColor: '#DC2626',
    body: `
      <p style="color:#374151;margin:0 0 16px;">Se abri&oacute; una nueva disputa que requiere revisi&oacute;n.</p>
      ${infoBox([
        { label: 'ID disputa',                 value: data.disputeId },
        { label: 'Reserva',                    value: shortBookingId },
        { label: 'Espacio',                    value: data.spaceName },
        { label: 'Categor&iacute;a',           value: data.category },
        { label: 'Qui&eacute;n abre',          value: `${data.openerName ?? '&mdash;'} (${data.openerRole ?? '&mdash;'}) &middot; ${data.openerEmail ?? '&mdash;'}` },
        { label: 'Contra',                     value: `${data.againstName ?? '&mdash;'} &middot; ${data.againstEmail ?? '&mdash;'}` },
        { label: 'Descripci&oacute;n completa', value: data.reason },
      ])}`,
    cta: { text: 'Gestionar disputa', url: data.ctaUrl },
  })
}

// ── FORMULARIO PÚBLICO / CAPTACIÓN DIRECTA ──────────────────

/** Email al host cuando un cliente envía el formulario público */
export function tplNuevaSolicitudDirectaHost(rawData: {
  hostName: string
  clientName: string
  clientEmail?: string
  clientPhone?: string
  eventDate: string
  eventType?: string
  guestCount?: number
  message?: string
  formUrl: string
}) {
  const d = {
    ...rawData,
    hostName:    esc(rawData.hostName),
    clientName:  esc(rawData.clientName),
    clientEmail: esc(rawData.clientEmail),
    clientPhone: esc(rawData.clientPhone),
    eventType:   esc(rawData.eventType),
    message:     esc(rawData.message),
  }
  const rows = [
    { label: 'Cliente',             value: d.clientName },
    ...(d.clientEmail ? [{ label: 'Email',    value: d.clientEmail }] : []),
    ...(d.clientPhone ? [{ label: 'Tel&eacute;fono', value: d.clientPhone }] : []),
    { label: 'Fecha solicitada',    value: formatDate(d.eventDate) },
    ...(d.eventType  ? [{ label: 'Tipo de evento', value: d.eventType }] : []),
    ...(d.guestCount ? [{ label: 'Personas',       value: `${d.guestCount}` }] : []),
    ...(d.message    ? [{ label: 'Mensaje',         value: d.message }] : []),
  ]
  return emailBase({
    title: 'Nueva solicitud directa',
    subtitle: `${d.clientName} quiere reservar a trav&eacute;s de tu formulario.`,
    accentColor: '#8B5CF6',
    body: `
      <p style="color:#374151;margin:0 0 16px;">Hola <strong>${d.hostName}</strong>, recibiste una nueva solicitud directa. Confi&eacute;rmala o cont&aacute;ctate con el cliente para coordinar.</p>
      ${infoBox(rows)}`,
    cta: { text: 'Ver en mi panel', url: `${SITE}/dashboard/host/eventos` },
  })
}

/** Email al cliente confirmando que su solicitud fue recibida */
export function tplSolicitudDirectaCliente(rawData: {
  clientName: string
  hostName: string
  eventDate: string
  eventType?: string
}) {
  const d = {
    ...rawData,
    clientName: esc(rawData.clientName),
    hostName:   esc(rawData.hostName),
    eventType:  esc(rawData.eventType),
  }
  return emailBase({
    title: 'Solicitud recibida',
    subtitle: `Hola ${d.clientName}, tu solicitud fue enviada a ${d.hostName}.`,
    accentColor: '#8B5CF6',
    body: `
      <p style="color:#374151;margin:0 0 16px;">Hola <strong>${d.clientName}</strong>, recibimos tu solicitud correctamente.</p>
      ${infoBox([
        { label: 'Organizador',     value: d.hostName },
        { label: 'Fecha solicitada', value: formatDate(d.eventDate) },
        ...(d.eventType ? [{ label: 'Tipo de evento', value: d.eventType }] : []),
        { label: 'Estado',           value: 'Pendiente de confirmaci&oacute;n' },
      ])}
      <p style="color:#6B7280;font-size:13px;margin:0;">${d.hostName} revisar&aacute; tu solicitud y se pondr&aacute; en contacto contigo pronto.</p>`,
  })
}

// ── EVENTOS DIRECTOS ────────────────────────────────────────

/** Confirmación al cliente de un evento directo (gestionado por el host fuera del marketplace) */
export function tplEventoDirectoConfirmado(rawData: {
  clientName: string
  hostName: string
  spaceName: string
  eventTitle: string
  eventDate: string
  startTime?: string
  endTime?: string
  guestCount?: number
  totalAmount?: number
}) {
  const d = {
    ...rawData,
    clientName: esc(rawData.clientName),
    hostName:   esc(rawData.hostName),
    spaceName:  esc(rawData.spaceName),
    eventTitle: esc(rawData.eventTitle),
  }
  const rows = [
    { label: 'Evento',              value: d.eventTitle },
    ...(d.spaceName ? [{ label: 'Lugar', value: d.spaceName }] : []),
    { label: 'Fecha',               value: formatDate(d.eventDate) },
    ...(d.startTime && d.endTime ? [{ label: 'Horario', value: `${formatTime(d.startTime)} &ndash; ${formatTime(d.endTime)}` }] : []),
    ...(d.guestCount ? [{ label: 'Personas', value: `${d.guestCount}` }] : []),
    ...(d.totalAmount ? [{ label: 'Valor del evento', value: formatCurrency(d.totalAmount) }] : []),
    { label: 'Coordinado por',      value: d.hostName },
  ]
  return emailBase({
    title: '&iexcl;Tu evento est&aacute; confirmado!',
    subtitle: `Hola ${d.clientName}, tu evento fue confirmado por ${d.hostName}.`,
    accentColor: '#35C493',
    body: `
      <p style="color:#374151;margin:0 0 16px;">Hola <strong>${d.clientName}</strong>, confirmamos los detalles de tu evento.</p>
      ${infoBox(rows)}
      <p style="color:#6B7280;font-size:13px;margin:0;">Si tienes preguntas, cont&aacute;ctanos directamente. Estamos para ayudarte a que tu evento sea un &eacute;xito.</p>`,
  })
}

/** Notificación al cliente de cancelación de un evento directo */
export function tplEventoDirectoCancelado(rawData: {
  clientName: string
  hostName: string
  eventTitle: string
  eventDate: string
  reason?: string
}) {
  const d = {
    ...rawData,
    clientName: esc(rawData.clientName),
    hostName:   esc(rawData.hostName),
    eventTitle: esc(rawData.eventTitle),
    reason:     esc(rawData.reason),
  }
  return emailBase({
    title: 'Evento cancelado',
    subtitle: `${d.eventTitle} &mdash; ${formatDate(d.eventDate)}`,
    accentColor: '#6B7280',
    body: `
      <p style="color:#374151;margin:0 0 16px;">Hola <strong>${d.clientName}</strong>, lamentamos informarte que el evento <strong>${d.eventTitle}</strong> programado para el ${formatDate(d.eventDate)} fue cancelado.</p>
      ${d.reason ? `<p style="color:#6B7280;font-size:13px;background:#F9FAFB;border:1px solid #E8ECF0;border-radius:10px;padding:12px 16px;margin:0 0 16px;">Motivo: ${d.reason}</p>` : ''}
      <p style="color:#374151;margin:0;">Si tienes preguntas sobre pagos o pr&oacute;ximas fechas, cont&aacute;ctanos.</p>`,
  })
}

// ── 16. SOLICITUD DE RESEÑA (post-evento) ─────────────────

export function tplSolicitudResena(rawData: {
  guestName: string; spaceName: string; eventDate: string
  bookingId: string; spaceSlug: string
}) {
  const data = { ...rawData, guestName: esc(rawData.guestName), spaceName: esc(rawData.spaceName) }
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

// ── 17. INVITACIÓN A EQUIPO ────────────────────────────────

export function tplInvitacionEquipo(rawData: {
  hostName: string
  role: string
  acceptUrl: string
}) {
  const hostName = esc(rawData.hostName)
  const roleLabel = rawData.role === 'admin' ? 'Administrador'
    : rawData.role === 'coordinador' ? 'Coordinador'
    : 'Visualizador'

  return emailBase({
    title: `Invitaci&oacute;n al equipo de ${hostName}`,
    subtitle: 'Accede al panel de gesti&oacute;n de espacios en Espot',
    accentColor: 'var(--brand, #35C493)',
    body: `
      <p style="color:#374151;margin:0 0 16px;"><strong>${hostName}</strong> te invit&oacute; a unirte a su equipo en Espot como <strong>${roleLabel}</strong>.</p>
      <p style="color:#374151;margin:0 0 20px;">Con este acceso podr&aacute;s gestionar reservas, ver el calendario y colaborar en la administraci&oacute;n del espacio.</p>
      ${infoBox([
        { label: 'Propietario', value: hostName },
        { label: 'Tu rol',      value: roleLabel },
      ])}
      <p style="color:#6B7280;font-size:13px;margin:16px 0 0;">Este link es de un solo uso y expira en 7 d&iacute;as.</p>`,
    cta: { text: 'Aceptar invitaci&oacute;n &rarr;', url: rawData.acceptUrl },
    note: 'Si no esperabas esta invitaci&oacute;n, puedes ignorar este correo.',
  })
}

// ── Host Application Templates ────────────────────────────────────────────────

export function tplSolicitudRecibida({ name, businessName }: { name: string; businessName: string }) {
  return emailBase({
    title:    '¡Recibimos tu solicitud!',
    subtitle: 'La estamos revisando con cuidado',
    body: `
      <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 18px;">
        Hola <strong>${esc(name)}</strong>, recibimos tu solicitud para publicar
        <strong>${esc(businessName)}</strong> en Espot.
      </p>
      ${infoBox([
        { label: 'Estado',           value: '🔍 En revisión' },
        { label: 'Tiempo estimado',  value: '24-48 horas hábiles' },
      ])}
      <p style="color:#6B7280;font-size:13px;margin:16px 0 0;">
        Nuestro equipo revisará tu solicitud y te notificaremos por este correo cuando tengamos una respuesta.
        No necesitas hacer nada más por ahora.
      </p>`,
    note: 'Si tienes preguntas puedes escribirnos a contacto@espot.do',
  })
}

export function tplSolicitudAprobada({
  name, businessName, dashboardUrl,
}: { name: string; businessName: string; dashboardUrl: string }) {
  return emailBase({
    title:       '¡Tu espacio fue aprobado!',
    subtitle:    `${esc(businessName)} ya está en Espot`,
    accentColor: '#35C493',
    body: `
      <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 18px;">
        ¡Felicidades, <strong>${esc(name)}</strong>! Tu solicitud fue aprobada.
        Ya puedes acceder a tu panel de propietario y empezar a recibir reservas.
      </p>
      ${infoBox([
        { label: 'Negocio',  value: esc(businessName) },
        { label: 'Estado',   value: '✅ Aprobado' },
      ])}
      <p style="color:#6B7280;font-size:13px;margin:16px 0 0;">
        Completa la información de tu espacio (fotos, precios, disponibilidad) para que aparezca en el marketplace.
      </p>`,
    cta: { text: 'Ir a mi panel →', url: dashboardUrl },
  })
}

export function tplSolicitudRechazada({
  name, businessName, reason, reapplyUrl,
}: { name: string; businessName: string; reason: string; reapplyUrl: string }) {
  return emailBase({
    title:       'Actualización sobre tu solicitud',
    subtitle:    'Tu solicitud no fue aprobada en esta ocasión',
    accentColor: '#6B7280',
    body: `
      <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 18px;">
        Hola <strong>${esc(name)}</strong>, revisamos tu solicitud para
        <strong>${esc(businessName)}</strong> y en esta ocasión no pudimos aprobarla.
      </p>
      ${infoBox([
        { label: 'Razón', value: esc(reason) },
      ])}
      <p style="color:#374151;font-size:14px;line-height:1.7;margin:16px 0 8px;">
        Puedes corregir los puntos indicados y enviar una nueva solicitud cuando estés listo.
      </p>`,
    cta:  { text: 'Volver a aplicar →', url: reapplyUrl },
    note: 'Si tienes preguntas escríbenos a contacto@espot.do',
  })
}

export function tplNuevaSolicitudAdmin({
  applicantName, applicantEmail, businessName, spaceType, city, aiScore, flags, reviewUrl,
}: {
  applicantName:  string
  applicantEmail: string
  businessName:   string
  spaceType:      string
  city:           string
  aiScore:        number
  flags:          string[]
  reviewUrl:      string
}) {
  const scoreColor = aiScore >= 70 ? '#16A34A' : aiScore >= 45 ? '#D97706' : '#DC2626'
  const flagsHtml  = flags.length > 0
    ? `<p style="color:#DC2626;font-size:12px;margin:8px 0 0;">⚠️ Flags: ${flags.map(esc).join(', ')}</p>`
    : ''
  return emailBase({
    title:    'Nueva solicitud de propietario',
    subtitle: 'Pendiente de revisión en el admin',
    body: `
      ${infoBox([
        { label: 'Negocio',    value: esc(businessName) },
        { label: 'Tipo',       value: esc(spaceType) },
        { label: 'Ciudad',     value: esc(city) },
        { label: 'Solicitante', value: `${esc(applicantName)} &lt;${esc(applicantEmail)}&gt;` },
        { label: 'Score IA',   value: `<span style="color:${scoreColor};font-weight:700;">${aiScore}/100</span>` },
      ])}
      ${flagsHtml}`,
    cta: { text: 'Revisar solicitud →', url: reviewUrl },
  })
}
