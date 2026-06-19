import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { todayInRD } from '@/lib/utils'

// POST /api/spaces/click
// Registra un clic de intención (ej. pulsar "Reservar"). Incrementa el contador
// del día. Fire-and-forget desde el cliente — no bloquea la experiencia.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const ALLOWED_TYPES = new Set(['book_intent', 'contact_intent', 'share'])

export async function POST(req: NextRequest) {
  try {
    const { spaceId, type } = await req.json()
    if (!spaceId || typeof spaceId !== 'string' || !UUID_RE.test(spaceId)) {
      return NextResponse.json({ ok: false })
    }
    const clickType = typeof type === 'string' && ALLOWED_TYPES.has(type) ? type : 'book_intent'

    const supabase = createServiceClient()

    // Solo contar clics de espacios reales y publicados.
    const { data: space } = await supabase
      .from('spaces')
      .select('id')
      .eq('id', spaceId)
      .eq('is_published', true)
      .eq('is_active', true)
      .maybeSingle()
    if (!space) return NextResponse.json({ ok: false })

    const today = todayInRD()
    const { data: existing } = await supabase
      .from('space_clicks')
      .select('id, click_count')
      .eq('space_id', spaceId)
      .eq('click_date', today)
      .eq('click_type', clickType)
      .maybeSingle()

    if (existing) {
      await supabase.from('space_clicks').update({ click_count: existing.click_count + 1 }).eq('id', existing.id)
    } else {
      await supabase.from('space_clicks').insert({ space_id: spaceId, click_date: today, click_type: clickType, click_count: 1 })
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false })
  }
}
