'use server'

import { sendEmail } from '@/lib/email/send'
import { emailBase, infoBox } from '@/lib/email/templates'
import { escapeHtml } from '@/lib/utils'

const CONTACT_EMAIL = 'contacto@espot.do'
const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://espot.do'

// Simple in-memory rate limiter (resets on cold start — sufficient for low-volume contact form)
const recentSubmissions = new Map<string, number>()
const RATE_LIMIT_MS = 5 * 60 * 1000 // 5 minutes

export interface ContactFormData {
  name: string
  email: string
  subject: string
  message: string
  phone?: string
}

export interface ContactFormResult {
  success: boolean
  error?: string
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export async function sendContactForm(data: ContactFormData): Promise<ContactFormResult> {
  // ── Validación ────────────────────────────────────────────
  const name    = data.name?.trim()
  const email   = data.email?.trim().toLowerCase()
  const subject = data.subject?.trim()
  const message = data.message?.trim()
  const phone   = data.phone?.trim() || undefined

  if (!name || name.length < 2) {
    return { success: false, error: 'El nombre es requerido (mínimo 2 caracteres).' }
  }
  if (!email || !isValidEmail(email)) {
    return { success: false, error: 'Ingresa un correo electrónico válido.' }
  }
  if (!subject) {
    return { success: false, error: 'Selecciona el motivo de tu consulta.' }
  }
  if (!message || message.length < 10) {
    return { success: false, error: 'El mensaje debe tener al menos 10 caracteres.' }
  }
  if (message.length > 500) {
    return { success: false, error: 'El mensaje no puede superar los 500 caracteres.' }
  }

  // ── Rate limit simple ─────────────────────────────────────
  const lastSubmit = recentSubmissions.get(email)
  if (lastSubmit && Date.now() - lastSubmit < RATE_LIMIT_MS) {
    return { success: false, error: 'Ya enviaste un mensaje recientemente. Espera 5 minutos antes de volver a intentarlo.' }
  }
  recentSubmissions.set(email, Date.now())

  // Limpiar entradas viejas (evitar leak de memoria)
  for (const [key, ts] of recentSubmissions.entries()) {
    if (Date.now() - ts > RATE_LIMIT_MS * 2) recentSubmissions.delete(key)
  }

  // ── Sanitizar para HTML ───────────────────────────────────
  const safeName    = escapeHtml(name)
  const safeEmail   = escapeHtml(email)
  const safeSubject = escapeHtml(subject)
  const safeMessage = escapeHtml(message)
  const safePhone   = phone ? escapeHtml(phone) : null

  // ── Email a contacto@espot.do ─────────────────────────────
  const internalRows = [
    { label: 'Nombre',  value: safeName },
    { label: 'Email',   value: safeEmail },
    ...(safePhone ? [{ label: 'Teléfono', value: safePhone }] : []),
    { label: 'Motivo',  value: safeSubject },
  ]

  const internalHtml = emailBase({
    title: `Nuevo mensaje de contacto`,
    subtitle: `${safeName} escribió desde el formulario de contacto de espot.do`,
    accentColor: '#35C493',
    body: `
      <p style="color:#374151;margin:0 0 16px;">Un usuario envió un mensaje a través del formulario de contacto.</p>
      ${infoBox(internalRows)}
      <div style="margin:18px 0;padding:18px 20px;background:#F9FAFB;border:1px solid #E8ECF0;border-radius:12px;">
        <p style="color:#6B7280;font-size:12px;font-weight:600;margin:0 0 8px;text-transform:uppercase;letter-spacing:0.05em;">Mensaje</p>
        <p style="color:#0F1623;font-size:14px;margin:0;line-height:1.7;white-space:pre-wrap;">${safeMessage}</p>
      </div>
      <p style="color:#6B7280;font-size:12px;margin:0;">Responde directamente a este email para contestar al usuario.</p>`,
  })

  const internalResult = await sendEmail({
    to:      CONTACT_EMAIL,
    subject: `[Contacto] ${subject} — ${name}`,
    html:    internalHtml,
    replyTo: email,
  })

  if (!internalResult.success && process.env.NODE_ENV === 'production') {
    console.error('[sendContactForm] Error enviando email interno:', internalResult.error)
    return { success: false, error: 'No pudimos enviar tu mensaje. Inténtalo de nuevo o escríbenos a contacto@espot.do.' }
  }

  // ── Email de confirmación al usuario ──────────────────────
  const confirmRows = [
    { label: 'Motivo',  value: safeSubject },
    { label: 'Tu email', value: safeEmail },
  ]

  const confirmHtml = emailBase({
    title: `Recibimos tu mensaje, ${safeName}`,
    subtitle: 'Te respondemos en menos de 24 horas hábiles.',
    accentColor: '#35C493',
    body: `
      <p style="color:#374151;margin:0 0 16px;">Hola <strong>${safeName}</strong>, gracias por contactarnos. Tu mensaje fue recibido correctamente y un miembro de nuestro equipo te responderá pronto.</p>
      ${infoBox(confirmRows)}
      <div style="margin:18px 0;padding:18px 20px;background:#F9FAFB;border:1px solid #E8ECF0;border-radius:12px;">
        <p style="color:#6B7280;font-size:12px;font-weight:600;margin:0 0 8px;text-transform:uppercase;letter-spacing:0.05em;">Tu mensaje</p>
        <p style="color:#0F1623;font-size:14px;margin:0;line-height:1.7;white-space:pre-wrap;">${safeMessage}</p>
      </div>
      <p style="color:#6B7280;font-size:13px;margin:0;">Si tu consulta es urgente, puedes escribirnos directamente a <a href="mailto:${CONTACT_EMAIL}" style="color:#35C493;">${CONTACT_EMAIL}</a> o llamarnos al <strong>+1 (829) 548-1998</strong>.</p>`,
    cta: { text: 'Explorar espacios', url: `${SITE}/buscar` },
  })

  // El email de confirmación es best-effort — no bloqueamos el éxito si falla
  await sendEmail({
    to:      email,
    subject: `Recibimos tu mensaje — Espot`,
    html:    confirmHtml,
  }).catch(err => {
    console.warn('[sendContactForm] Error enviando confirmación al usuario:', err)
  })

  return { success: true }
}
