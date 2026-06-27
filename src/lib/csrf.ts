import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// M-4: defensa CSRF para API routes mutantes (route handlers, que NO traen la
// protección de Origin nativa de los Server Actions). Bloquea solo peticiones
// cross-site del navegador; las que no traen Origin (navegación top-level,
// server-to-server como crons/webhooks) se permiten — ahí SameSite + el secreto
// del endpoint son la barrera.

const ALLOWED_ORIGINS = [
  'https://espothub.com',
  'https://www.espothub.com',
  'https://espot.do',
  'https://www.espot.do',
]

/**
 * Devuelve una respuesta 403 si la petición es cross-site; `null` si es válida.
 * Uso: `const bad = forbiddenIfCrossOrigin(req); if (bad) return bad`
 */
export function forbiddenIfCrossOrigin(req: NextRequest): NextResponse | null {
  const origin = req.headers.get('origin')
  if (!origin) return null // sin Origin → no es CSRF cross-site (navegación/servidor)

  let originHost: string
  try {
    originHost = new URL(origin).host
  } catch {
    return NextResponse.json({ error: 'Origin inválido' }, { status: 403 })
  }

  // Mismo host (incluye preview deploys de Vercel y localhost en dev) o allowlist.
  if (originHost === req.headers.get('host')) return null
  if (ALLOWED_ORIGINS.includes(origin)) return null

  return NextResponse.json({ error: 'Origin no permitido' }, { status: 403 })
}
