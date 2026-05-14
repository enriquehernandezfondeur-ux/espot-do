import { Resend } from 'resend'

// FROM debe ser un email de un dominio verificado en Resend.
// Verificar en: https://resend.com/domains
// Añadir DNS: SPF, DKIM, DMARC en el proveedor DNS del dominio.
const FROM      = process.env.EMAIL_FROM      ?? 'Espot <hola@espothub.com>'
const REPLY_TO  = process.env.EMAIL_REPLY_TO  ?? 'contacto@espothub.com'

export async function sendEmail({
  to,
  subject,
  html,
  replyTo,
}: {
  to: string
  subject: string
  html: string
  replyTo?: string
}) {
  // Guard: no enviar si no hay API key válida
  const missingKey = !process.env.RESEND_API_KEY ||
    process.env.RESEND_API_KEY === 'TU_RESEND_API_KEY_AQUI' ||
    process.env.RESEND_API_KEY === 're_test'

  if (missingKey) {
    if (process.env.NODE_ENV === 'production') {
      console.error('[sendEmail] RESEND_API_KEY no configurada — email NO enviado a:', to, '| Asunto:', subject)
      return { success: false, error: 'RESEND_API_KEY no configurada' }
    }
    // En desarrollo: simular envío exitoso
    console.info('[sendEmail] DEV — simulado OK para:', to, '|', subject)
    return { success: true, simulated: true }
  }

  const resend = new Resend(process.env.RESEND_API_KEY)

  const { data, error } = await resend.emails.send({
    from:     FROM,
    to,
    subject,
    html,
    replyTo:  replyTo ?? REPLY_TO,
    headers: {
      // Identifica el proyecto para seguimiento en Resend dashboard
      'X-Entity-Ref-ID': 'espothub-transactional',
    },
  })

  if (error) {
    console.error('[sendEmail] Resend error → to:', to, '| subject:', subject, '| error:', error)
    return { success: false, error }
  }

  return { success: true, id: data?.id }
}
