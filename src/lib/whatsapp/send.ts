/**
 * WhatsApp notifications via Twilio API.
 *
 * Sandbox (testing):  TWILIO_WHATSAPP_FROM = whatsapp:+14155238886
 * Production:         TWILIO_WHATSAPP_FROM = whatsapp:+1XXXXXXXXXX (tu número aprobado)
 *
 * Para producción se requieren templates aprobados por Meta.
 * Ver: https://www.twilio.com/docs/whatsapp/api
 *
 * ENV vars requeridas:
 *   TWILIO_ACCOUNT_SID
 *   TWILIO_AUTH_TOKEN
 *   TWILIO_WHATSAPP_FROM  (default: sandbox)
 */

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://espot.do'

// ── Normalización de teléfonos ────────────────────────────────────────────────
// Convierte números dominicanos (809/829/849) al formato internacional E.164.
export function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null
  const digits = raw.replace(/\D/g, '')

  // 10 dígitos: 809/829/849 XXXXXXX → +1809XXXXXXX
  if (/^(809|829|849)\d{7}$/.test(digits)) return `+1${digits}`

  // 11 dígitos: 1809/1829/1849 XXXXXXX → +1809XXXXXXX
  if (/^1(809|829|849)\d{7}$/.test(digits)) return `+${digits}`

  // Ya tiene + al inicio y ≥10 dígitos → mantener
  if (raw.startsWith('+') && digits.length >= 10) return `+${digits}`

  // 10 dígitos genérico (otros países en formato NANP) → +1
  if (digits.length === 10) return `+1${digits}`

  // 11 dígitos que empiezan con 1 → código de país ya incluido
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`

  return null
}

// ── Envío base ────────────────────────────────────────────────────────────────
export async function sendWhatsApp(to: string, body: string): Promise<{ success: boolean; error?: string }> {
  const sid   = process.env.TWILIO_ACCOUNT_SID
  const token = process.env.TWILIO_AUTH_TOKEN
  const from  = process.env.TWILIO_WHATSAPP_FROM ?? 'whatsapp:+14155238886'

  if (!sid || !token) {
    if (process.env.NODE_ENV !== 'production') {
      console.info('[WhatsApp] DEV — simulado OK para:', to, '|', body.substring(0, 60))
      return { success: true }
    }
    console.error('[WhatsApp] TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN no configurados')
    return { success: false, error: 'Twilio no configurado' }
  }

  const toWA = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`

  try {
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
      {
        method:  'POST',
        headers: {
          'Content-Type':  'application/x-www-form-urlencoded',
          'Authorization': 'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64'),
        },
        body: new URLSearchParams({ From: from, To: toWA, Body: body }).toString(),
      }
    )
    const data = await res.json()
    if (!res.ok) {
      console.error('[WhatsApp] Twilio error → to:', to, '| code:', data.code, '| msg:', data.message)
      return { success: false, error: data.message }
    }
    return { success: true }
  } catch (err: any) {
    console.error('[WhatsApp] fetch exception → to:', to, err.message)
    return { success: false, error: err.message }
  }
}

// ── Helper: enviar si el número es válido ─────────────────────────────────────
// Acepta el campo whatsapp (preferido) o phone como fallback.
export async function sendWhatsAppToUser(
  whatsapp: string | null | undefined,
  phone: string | null | undefined,
  body: string
): Promise<void> {
  const normalized = normalizePhone(whatsapp) ?? normalizePhone(phone)
  if (!normalized) return
  try {
    await sendWhatsApp(normalized, body)
  } catch (err: any) {
    console.error('[WhatsApp] sendWhatsAppToUser error:', err.message)
  }
}

// ── Mensajes predefinidos ─────────────────────────────────────────────────────

export const wa = {
  // Host: llega nueva solicitud de reserva
  nuevaSolicitud(hostName: string, spaceName: string, guestName: string, eventDate: string, guestCount: number, bookingId: string) {
    return `🔔 *Nueva solicitud en Espot*\n\nHola ${hostName}, tienes una nueva solicitud:\n\n📍 *${spaceName}*\n👤 ${guestName}\n📅 ${eventDate}\n👥 ${guestCount} personas\n\nResponde aquí → ${SITE}/dashboard/host/reservas/${bookingId}`
  },

  // Guest: host aceptó su reserva
  reservaAceptada(guestName: string, spaceName: string, eventDate: string, firstAmount: number, bookingId: string) {
    const monto = firstAmount.toLocaleString('es-DO')
    return `✅ *¡Tu reserva fue aceptada!*\n\nHola ${guestName} 🎉\n\n📍 *${spaceName}*\n📅 ${eventDate}\n💰 Primera cuota: RD$${monto}\n\nPaga aquí → ${SITE}/pago/${bookingId}`
  },

  // Guest: pago confirmado
  pagoConfirmadoGuest(guestName: string, spaceName: string, eventDate: string, startTime: string, bookingId: string) {
    return `🎉 *¡Reserva confirmada!*\n\nHola ${guestName}, todo está listo:\n\n📍 *${spaceName}*\n📅 ${eventDate} · ${startTime}\n\nVe los detalles → ${SITE}/dashboard/reservas/${bookingId}`
  },

  // Host: recibió un pago
  pagoConfirmadoHost(hostName: string, spaceName: string, guestName: string, eventDate: string, netAmount: number, bookingId: string) {
    const neto = netAmount.toLocaleString('es-DO')
    return `💰 *Pago recibido en Espot*\n\nHola ${hostName}:\n\n📍 *${spaceName}*\n👤 ${guestName}\n📅 ${eventDate}\n💵 Neto a recibir: RD$${neto}\n\nVer reserva → ${SITE}/dashboard/host/reservas/${bookingId}`
  },

  // Guest: recordatorio de cuota que vence mañana
  recordatorioCuota(guestName: string, spaceName: string, eventDate: string, amount: number, bookingId: string, cuotaId: string) {
    const monto = amount.toLocaleString('es-DO')
    return `⚠️ *Tu cuota vence mañana*\n\nHola ${guestName}:\n\n📍 *${spaceName}*\n📅 ${eventDate}\n💰 Monto: RD$${monto}\n\nPaga aquí → ${SITE}/pago/${bookingId}?cuota=${cuotaId}`
  },

  // Guest: recordatorio del evento (día anterior)
  recordatorioEvento(guestName: string, spaceName: string, address: string, eventDate: string, startTime: string, endTime: string, bookingId: string) {
    return `🎊 *¡Tu evento es mañana!*\n\nHola ${guestName}:\n\n📍 *${spaceName}*\n📮 ${address}\n⏰ ${startTime} – ${endTime}\n\nVer detalles → ${SITE}/dashboard/reservas/${bookingId}`
  },
}
