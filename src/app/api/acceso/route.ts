import { NextRequest, NextResponse } from 'next/server'

const SITE_PASSWORD = process.env.SITE_PASSWORD
const COOKIE_NAME   = 'espot_preview_access'
// 30 días
const MAX_AGE       = 60 * 60 * 24 * 30

export async function POST(req: NextRequest) {
  if (!SITE_PASSWORD) {
    return NextResponse.json({ ok: true })
  }

  const { password } = await req.json()

  if (password !== SITE_PASSWORD) {
    return NextResponse.json({ error: 'Incorrect password' }, { status: 401 })
  }

  const res = NextResponse.json({ ok: true })
  res.cookies.set(COOKIE_NAME, SITE_PASSWORD, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge:   MAX_AGE,
    path:     '/',
  })
  return res
}
