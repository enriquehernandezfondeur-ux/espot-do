/**
 * Normaliza un contacto a número de WhatsApp con código de país (para wa.me).
 * RD: 10 dígitos locales (809/829/849) → se antepone 1. Devuelve null si no
 * parece un teléfono (p.ej. un correo).
 */
export function toWhatsappNumber(contact: string | null | undefined): string | null {
  if (!contact) return null
  const digits = contact.replace(/\D/g, '')
  if (digits.length === 10) return '1' + digits
  if (digits.length === 11 && digits.startsWith('1')) return digits
  if (digits.length >= 11) return digits // ya trae código de país
  return null
}
