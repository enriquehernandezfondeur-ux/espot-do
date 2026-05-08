import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const SITE_PASSWORD = process.env.SITE_PASSWORD
const COOKIE_NAME   = 'espot_preview_access'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Permitir siempre: acceso privado, assets, API, favicon
  if (
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

  // Si no hay contraseña configurada, acceso libre (entorno local)
  if (!SITE_PASSWORD) return NextResponse.next()

  // Verificar cookie de acceso
  const cookie = request.cookies.get(COOKIE_NAME)
  if (cookie?.value === SITE_PASSWORD) return NextResponse.next()

  // Redirigir a la página de acceso
  const url = request.nextUrl.clone()
  const returnTo = pathname + (request.nextUrl.search ?? '')
  url.pathname = '/acceso'
  url.search   = returnTo !== '/' ? `?next=${encodeURIComponent(returnTo)}` : ''
  return NextResponse.redirect(url)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image).*)'],
}
