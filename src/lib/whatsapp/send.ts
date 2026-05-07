/**
 * WhatsApp via Twilio REST API — falla silenciosamente si no hay credenciales.
 * Usa fetch directo para evitar problemas de bundling con el SDK en Vercel.
 */

function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.startsWith('1') && digits.length === 11) return `+${digits}`
  if (digits.length === 10) return `+1${digits}`
  if (digits.startsWith('+')) return phone
  return `+${digits}`
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
    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`
    const credentials = Buffer.from(`${accountSid}:${authToken}`).toString('base64')
    const toFormatted = `whatsapp:${formatPhone(to)}`
    const fromFormatted = from.startsWith('whatsapp:') ? from : `whatsapp:${from}`

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        From: fromFormatted,
        To:   toFormatted,
        Body: body,
      }).toString(),
    })

    const json = await res.json()
    if (!res.ok) {
      console.error('[WhatsApp] Twilio error:', res.status, json?.message ?? json)
    } else {
      console.log('[WhatsApp] Sent OK to', toFormatted, '— SID:', json?.sid)
    }
  } catch (err) {
    console.error('[WhatsApp] fetch error:', err)
  }
}
