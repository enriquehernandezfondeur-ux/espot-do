import { NextRequest, NextResponse } from 'next/server'
import { createHmac, timingSafeEqual } from 'crypto'

const SITE_PASSWORD  = process.env.SITE_PASSWORD
const HMAC_SECRET    = process.env.PREVIEW_HMAC_SECRET ?? 'espot-preview-v1'
const COOKIE_NAME    = 'espot_preview_access'
const MAX_AGE        = 60 * 60 * 24 * 30

function buildAccessToken(password: string): string {
  return createHmac('sha256', HMAC_SECRET).update(password).digest('hex')
}

export function getExpectedToken(): string | null {
  if (!SITE_PASSWORD) return null
  return buildAccessToken(SITE_PASSWORD)
}

export async function POST(req: NextRequest) {
  if (!SITE_PASSWORD) {
    return NextResponse.json({ ok: true })
  }

  const { password } = await req.json()

  // Comparación en tiempo constante para prevenir timing attacks
  const inputBuf    = Buffer.from(String(password ?? ''), 'utf8')
  const expectedBuf = Buffer.from(SITE_PASSWORD, 'utf8')
  const match = inputBuf.length === expectedBuf.length &&
    timingSafeEqual(inputBuf, expectedBuf)

  if (!match) {
    return NextResponse.json({ error: 'Incorrect password' }, { status: 401 })
  }

  const token = buildAccessToken(SITE_PASSWORD)
  const res = NextResponse.json({ ok: true })
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge:   MAX_AGE,
    path:     '/',
  })
  return res
}
