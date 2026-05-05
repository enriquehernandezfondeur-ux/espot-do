/**
 * WhatsApp via Twilio — falla silenciosamente si no hay credenciales configuradas.
 * Twilio WA format: whatsapp:+1809XXXXXXX
 */

function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.startsWith('1') && digits.length === 11) return `+${digits}`
  if (digits.length === 10) return `+1${digits}`
  if (!digits.startsWith('+')) return `+${digits}`
  return phone
}

export async function sendWhatsApp({
  to,
  body,
}: {
  to: string
  body: string
}): Promise<void> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken  = process.env.TWILIO_AUTH_TOKEN
  const from       = process.env.TWILIO_WHATSAPP_FROM

  if (!accountSid || !authToken || !from || accountSid.startsWith('AC_PLACEHOLDER')) return

  try {
    const twilio = (await import('twilio')).default
    const client = twilio(accountSid, authToken)
    await client.messages.create({
      from: from.startsWith('whatsapp:') ? from : `whatsapp:${from}`,
      to:   `whatsapp:${formatPhone(to)}`,
      body,
    })
  } catch {
    // No bloquear el flujo si WA falla
  }
}
