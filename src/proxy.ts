import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

const SITE_PASSWORD = process.env.SITE_PASSWORD
const COOKIE_NAME   = 'espot_preview_access'

const AUTH_ROUTES = ['/dashboard', '/admin']

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Permitir siempre: auth, acceso privado, assets, API, favicon
  if (
    pathname.startsWith('/auth') ||
    pathname.startsWith('/acceso') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname === '/favicon.ico' ||
    pathname === '/icon.svg' ||
    pathname.startsWith('/og-') ||
    pathname.includes('.')
  ) {
    return NextResponse.next()
  }

  // Si no hay contraseña configurada, acceso libre (entorno local) — igual proteger auth routes
  if (!SITE_PASSWORD) {
    // Aún así verificar autenticación para rutas protegidas
    if (AUTH_ROUTES.some(r => pathname.startsWith(r))) {
      return checkAuth(request, pathname)
    }
    return NextResponse.next()
  }

  // Verificar cookie de acceso (preview)
  const cookie = request.cookies.get(COOKIE_NAME)
  if (cookie?.value !== SITE_PASSWORD) {
    // Redirigir a la página de acceso
    const url = request.nextUrl.clone()
    const returnTo = pathname + (request.nextUrl.search ?? '')
    url.pathname = '/acceso'
    url.search   = returnTo !== '/' ? `?next=${encodeURIComponent(returnTo)}` : ''
    return NextResponse.redirect(url)
  }

  // Preview OK — verificar autenticación para rutas protegidas
  if (AUTH_ROUTES.some(r => pathname.startsWith(r))) {
    return checkAuth(request, pathname)
  }

  return NextResponse.next()
}

async function checkAuth(request: NextRequest, pathname: string): Promise<NextResponse> {
  const response = NextResponse.next()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
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

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image).*)'],
}
