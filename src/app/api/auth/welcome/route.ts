import { NextRequest, NextResponse } from 'next/server'
import { sendEmail } from '@/lib/email/send'
import { tplBienvenida } from '@/lib/email/templates'

// POST /api/auth/welcome
// Llamado desde el cliente después de un registro exitoso.
// Fire-and-forget — no bloquea el flujo del usuario.
export async function POST(req: NextRequest) {
  try {
    const { email, name } = await req.json()
    if (!email || typeof email !== 'string') {
      return NextResponse.json({ ok: false, error: 'email requerido' }, { status: 400 })
    }
    const firstName = (name ?? '').split(' ')[0] || 'allí'
    await sendEmail({
      to:      email,
      subject: `Bienvenido a Espot`,
      html:    tplBienvenida({ name: firstName }),
    })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
