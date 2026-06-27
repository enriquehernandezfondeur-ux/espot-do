import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createHmac } from 'crypto'

const SITE_PASSWORD   = process.env.SITE_PASSWORD
// M-6: leer el secreto de la env var (igual que /api/acceso). Antes estaba el literal
// hardcodeado, lo que además rompía el gate si se seteaba PREVIEW_HMAC_SECRET (acceso
// lo usaba y proxy no → tokens incompatibles). El fallback conserva el comportamiento
// actual cuando la env var no está definida.
const HMAC_SECRET     = process.env.PREVIEW_HMAC_SECRET ?? 'espot-preview-v1'
const COOKIE_NAME     = 'espot_preview_access'
const ALLOWED_ORIGINS = [
  'https://espothub.com',
  'https://www.espothub.com',
  'https://espot.do',
  'https://www.espot.do',
]

function buildAccessToken(password: string): string {
  return createHmac('sha256', HMAC_SECRET).update(password).digest('hex')
}
const AUTH_ROUTES   = ['/dashboard', '/admin']

// ── Rate limiter en memoria (por instancia Vercel) ──────────────
// Para producción a escala: usar Upstash Redis con @upstash/ratelimit
const rlMap = new Map<string, { count: number; resetAt: number }>()
let rlCleanupCounter = 0

function checkRateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now()
  const entry = rlMap.get(key)
  if (!entry || entry.resetAt <= now) {
    rlMap.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }
  if (entry.count >= limit) return false
  entry.count++
  if (++rlCleanupCounter > 200) {
    rlCleanupCounter = 0
    for (const [k, v] of rlMap.entries()) {
      if (v.resetAt <= now) rlMap.delete(k)
    }
  }
  return true
}

function secureHeaders(res: NextResponse, request?: NextRequest): NextResponse {
  res.headers.set('X-Content-Type-Options', 'nosniff')
  res.headers.set('X-Frame-Options', 'SAMEORIGIN')
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  res.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  // CORS dinámico — solo un origen por respuesta (spec HTTP)
  if (request) {
    const origin = request.headers.get('origin') ?? ''
    if (ALLOWED_ORIGINS.includes(origin)) {
      res.headers.set('Access-Control-Allow-Origin', origin)
      res.headers.set('Vary', 'Origin')
    }
  }
  return res
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Inyectar x-pathname en los headers del request para que los Server Components
  // puedan leer la ruta actual (necesario para el onboarding del host)
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-pathname', pathname)
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    request.headers.get('x-real-ip') ?? 'unknown'

  // ── Rate limiting ────────────────────────────────────────────
  if (pathname.startsWith('/api/payments/')) {
    // Pagos: 20 req / 10 min por IP
    if (!checkRateLimit(`pay:${ip}`, 20, 10 * 60 * 1000)) {
      return NextResponse.json(
        { error: 'Demasiadas solicitudes. Intenta en unos minutos.' },
        { status: 429, headers: { 'Retry-After': '600' } }
      )
    }
  } else if (pathname.startsWith('/api/')) {
    // API general: 120 req / min por IP
    if (!checkRateLimit(`api:${ip}`, 120, 60 * 1000)) {
      return NextResponse.json(
        { error: 'Límite de solicitudes alcanzado.' },
        { status: 429, headers: { 'Retry-After': '60' } }
      )
    }
  } else if (pathname === '/auth' || pathname.startsWith('/auth/')) {
    // Auth: 15 intentos / 15 min por IP (anti fuerza bruta)
    if (!checkRateLimit(`auth:${ip}`, 15, 15 * 60 * 1000)) {
      return secureHeaders(new NextResponse(
        'Demasiados intentos. Espera unos minutos.',
        { status: 429, headers: { 'Retry-After': '900', 'Content-Type': 'text/plain; charset=utf-8' } }
      ))
    }
  }

  const nextWithHeaders = () => NextResponse.next({ request: { headers: requestHeaders } })

  // Permitir siempre: auth, acceso privado, assets, API, favicon
  if (
    pathname.startsWith('/auth') ||
    pathname.startsWith('/acceso') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname === '/favicon.ico' ||
    pathname.startsWith('/icon-') ||
    pathname.startsWith('/og-') ||
    pathname.includes('.')
  ) {
    return secureHeaders(nextWithHeaders(), request)
  }

  // Si no hay contraseña configurada, acceso libre — igual proteger auth routes
  if (!SITE_PASSWORD) {
    if (AUTH_ROUTES.some(r => pathname.startsWith(r))) {
      return checkAuth(request, pathname, requestHeaders)
    }
    return secureHeaders(nextWithHeaders(), request)
  }

  // Verificar cookie de acceso (preview)
  const cookie        = request.cookies.get(COOKIE_NAME)
  const expectedToken = buildAccessToken(SITE_PASSWORD!)
  if (cookie?.value !== expectedToken) {
    const url = request.nextUrl.clone()
    const returnTo = pathname + (request.nextUrl.search ?? '')
    url.pathname = '/acceso'
    url.search   = returnTo !== '/' ? `?next=${encodeURIComponent(returnTo)}` : ''
    return NextResponse.redirect(url)
  }

  // Preview OK — verificar autenticación para rutas protegidas
  if (AUTH_ROUTES.some(r => pathname.startsWith(r))) {
    return checkAuth(request, pathname, requestHeaders)
  }

  return secureHeaders(nextWithHeaders(), request)
}

async function checkAuth(request: NextRequest, pathname: string, requestHeaders?: Headers): Promise<NextResponse> {
  const response = NextResponse.next(requestHeaders ? { request: { headers: requestHeaders } } : undefined)

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value)
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth'
    url.search   = `?redirect=${encodeURIComponent(pathname)}`
    return NextResponse.redirect(url)
  }

  return secureHeaders(response)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image).*)'],
}
