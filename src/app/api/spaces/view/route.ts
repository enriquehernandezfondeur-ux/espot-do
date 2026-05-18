import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

// POST /api/spaces/view
// Registra una vista al espacio. Incrementa el contador del día actual.
// Fire-and-forget desde SpaceDetailClient — no bloquea el render.
export async function POST(req: NextRequest) {
  try {
    const { spaceId } = await req.json()
    if (!spaceId) return NextResponse.json({ ok: false })

    const supabase = createServiceClient()
    const today = new Date().toISOString().split('T')[0]

    // Intentar incrementar si ya existe el registro para hoy
    const { data: existing } = await supabase
      .from('space_views')
      .select('id, view_count')
      .eq('space_id', spaceId)
      .eq('view_date', today)
      .single()

    if (existing) {
      await supabase
        .from('space_views')
        .update({ view_count: existing.view_count + 1 })
        .eq('id', existing.id)
    } else {
      await supabase
        .from('space_views')
        .insert({ space_id: spaceId, view_date: today, view_count: 1 })
    }

    return NextResponse.json({ ok: true })
  } catch {
    // Silencioso — no interrumpir la experiencia del usuario por un error de analytics
    return NextResponse.json({ ok: false })
  }
}
