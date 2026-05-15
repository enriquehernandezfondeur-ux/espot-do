import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email/send'
import { tplBienvenida } from '@/lib/email/templates'

// POST /api/auth/welcome
// Llamado desde el cliente después de un registro exitoso.
// Requiere sesión autenticada para evitar spam.
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ ok: false, error: 'No autenticado' }, { status: 401 })

    const { email, name } = await req.json()
    if (!email || typeof email !== 'string') {
      return NextResponse.json({ ok: false, error: 'email requerido' }, { status: 400 })
    }

    // Solo permitir enviar al propio email del usuario autenticado
    if (email !== user.email) {
      return NextResponse.json({ ok: false, error: 'No autorizado' }, { status: 403 })
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
