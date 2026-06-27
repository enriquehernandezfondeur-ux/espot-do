// B-3: fuente ÚNICA del email superadmin (antes hardcodeado en ~14 archivos).
// Lee SUPERADMIN_EMAIL de la env var; si no está, usa el fallback histórico para
// NO dejar a nadie sin acceso al admin (lockout). En producción se avisa por consola
// si falta, porque lo correcto es tenerla seteada en Vercel (así el fallback queda
// como código muerto y el control deja de depender de un email hardcodeado).
const FALLBACK_SUPERADMIN = 'enriquehernandezfondeur@gmail.com'

export const SUPERADMIN_EMAIL = (process.env.SUPERADMIN_EMAIL ?? FALLBACK_SUPERADMIN).toLowerCase()

if (!process.env.SUPERADMIN_EMAIL && process.env.NODE_ENV === 'production') {
  // eslint-disable-next-line no-console
  console.warn('[seguridad] SUPERADMIN_EMAIL no está configurada — usando fallback. Configúrala en Vercel.')
}

/** Comparación case-insensitive contra el email superadmin. */
export function isSuperadmin(email?: string | null): boolean {
  return !!email && email.toLowerCase() === SUPERADMIN_EMAIL
}
