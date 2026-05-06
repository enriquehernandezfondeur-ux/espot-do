import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = process.env.EMAIL_FROM ?? 'onboarding@resend.dev'

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string
  subject: string
  html: string
}) {
  if (!process.env.RESEND_API_KEY || process.env.RESEND_API_KEY === 'TU_RESEND_API_KEY_AQUI') {
    return { success: true, simulated: true }
  }

  const { data, error } = await resend.emails.send({ from: FROM, to, subject, html })
  if (error) {
    console.error('Resend error:', error)
    return { success: false, error }
  }
  return { success: true, id: data?.id }
}
