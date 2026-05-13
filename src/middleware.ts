import { type NextRequest, NextResponse } from 'next/server'

// ── Rate limiter en memoria (por instancia Vercel)
// Para producción a escala usar Upstash Redis con @upstash/ratelimit
// ─────────────────────────────────────────────────────────────────
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(ip: string, limit: number, windowMs: number): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)

  if (!entry || entry.resetAt <= now) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + windowMs })
    return true
  }
  if (entry.count >= limit) return false
  entry.count++
  return true
}

// Limpiar entradas expiradas cada 100 requests para evitar memory leak
let cleanupCounter = 0
function maybeCleanup() {
  if (++cleanupCounter < 100) return
  cleanupCounter = 0
  const now = Date.now()
  for (const [key, val] of rateLimitMap.entries()) {
    if (val.resetAt <= now) rateLimitMap.delete(key)
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // IP del cliente (Vercel pasa x-forwarded-for)
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    request.headers.get('x-real-ip') ??
    'unknown'

  maybeCleanup()

  // ── Rutas de autenticación: 10 intentos / 15 min por IP ──────
  if (pathname === '/auth' || pathname.startsWith('/auth/')) {
    if (!checkRateLimit(`auth:${ip}`, 10, 15 * 60 * 1000)) {
      return new NextResponse('Demasiados intentos. Espera unos minutos.', {
        status: 429,
        headers: { 'Retry-After': '900', 'Content-Type': 'text/plain; charset=utf-8' },
      })
    }
  }

  // ── API de pagos: 20 requests / 10 min por IP ────────────────
  if (pathname.startsWith('/api/payments/')) {
    if (!checkRateLimit(`payments:${ip}`, 20, 10 * 60 * 1000)) {
      return NextResponse.json(
        { error: 'Demasiadas solicitudes. Intenta en unos minutos.' },
        { status: 429, headers: { 'Retry-After': '600' } }
      )
    }
  }

  // ── APIs generales: 120 requests / min por IP ────────────────
  if (pathname.startsWith('/api/')) {
    if (!checkRateLimit(`api:${ip}`, 120, 60 * 1000)) {
      return NextResponse.json(
        { error: 'Límite de solicitudes alcanzado.' },
        { status: 429, headers: { 'Retry-After': '60' } }
      )
    }
  }

  const res = NextResponse.next()

  // ── Security headers ─────────────────────────────────────────
  res.headers.set('X-Content-Type-Options', 'nosniff')
  res.headers.set('X-Frame-Options', 'SAMEORIGIN')
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  res.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')

  return res
}

export const config = {
  matcher: [
    '/auth/:path*',
    '/api/:path*',
  ],
}
