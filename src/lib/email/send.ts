import { Resend } from 'resend'
import { createServiceClient } from '@/lib/supabase/service'

// FROM debe ser un email de un dominio verificado en Resend.
// Verificar en: https://resend.com/domains
// Añadir DNS: SPF, DKIM, DMARC en el proveedor DNS del dominio.
const FROM      = process.env.EMAIL_FROM      ?? 'Espot <hola@espot.do>'
const REPLY_TO  = process.env.EMAIL_REPLY_TO  ?? 'contacto@espot.do'

export async function sendEmail({
  to,
  subject,
  html,
  replyTo,
  attachments,
}: {
  to: string
  subject: string
  html: string
  replyTo?: string
  attachments?: { filename: string; content: string }[]
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
    from:        FROM,
    to,
    subject,
    html,
    replyTo:     replyTo ?? REPLY_TO,
    attachments: attachments?.map(a => ({ filename: a.filename, content: a.content })),
    headers: {
      'X-Entity-Ref-ID': 'espot-transactional',
    },
  })

  if (error) {
    console.error('[sendEmail] Resend error → to:', to, '| subject:', subject, '| error:', error)
    return { success: false, error }
  }

  return { success: true, id: data?.id }
}

// ── FIX #4: Preferencias de notificación ────────────────────────────────────

/**
 * Lee notification_settings del user_metadata vía service role.
 * Retorna un objeto con las keys de preferencia; si no hay configuración
 * se asume que todas las notificaciones están habilitadas (opt-out model).
 */
export async function getUserNotificationSettings(
  userId: string
): Promise<Record<string, boolean>> {
  try {
    const sb = createServiceClient()
    const { data, error } = await sb.auth.admin.getUserById(userId)
    if (error || !data?.user) return {}
    return (data.user.user_metadata?.notification_settings ?? {}) as Record<string, boolean>
  } catch (err) {
    console.error('[getUserNotificationSettings] error:', err)
    return {}
  }
}

/**
 * Envía un email solo si la preferencia del usuario lo permite.
 *
 * @param to           - Dirección de destino
 * @param subject      - Asunto del email
 * @param html         - Cuerpo HTML
 * @param userId       - ID del usuario (opcional; si no se pasa, siempre envía)
 * @param preferenceKey - Key en notification_settings a verificar (ej. 'booking_updates')
 *                        Si la key no existe en el objeto se asume habilitada (opt-out).
 */
export async function sendEmailIfEnabled(
  to: string,
  subject: string,
  html: string,
  userId?: string,
  preferenceKey?: string
): Promise<ReturnType<typeof sendEmail>> {
  if (userId && preferenceKey) {
    const settings = await getUserNotificationSettings(userId)
    // La preferencia es explícitamente false → usuario la ha desactivado
    if (settings[preferenceKey] === false) {
      console.info(
        `[sendEmailIfEnabled] Skipped — usuario ${userId} desactivó '${preferenceKey}' | to: ${to}`
      )
      return { success: true, skipped: true } as any
    }
  }
  return sendEmail({ to, subject, html })
}
