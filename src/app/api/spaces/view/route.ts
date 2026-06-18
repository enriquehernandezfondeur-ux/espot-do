import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { todayInRD } from '@/lib/utils'

// POST /api/spaces/view
// Registra una vista al espacio. Incrementa el contador del día actual.
// Fire-and-forget desde SpaceDetailClient — no bloquea el render.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function POST(req: NextRequest) {
  try {
    const { spaceId } = await req.json()
    // Validar formato — evita consultas con valores arbitrarios
    if (!spaceId || typeof spaceId !== 'string' || !UUID_RE.test(spaceId)) {
      return NextResponse.json({ ok: false })
    }

    const supabase = createServiceClient()

    // Solo contar vistas de espacios reales y publicados — evita inflar
    // analytics de IDs inexistentes o de borradores no públicos.
    const { data: space } = await supabase
      .from('spaces')
      .select('id')
      .eq('id', spaceId)
      .eq('is_published', true)
      .eq('is_active', true)
      .maybeSingle()
    if (!space) return NextResponse.json({ ok: false })

    const today = todayInRD()

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
