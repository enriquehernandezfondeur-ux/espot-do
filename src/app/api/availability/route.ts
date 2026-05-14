import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/availability?date=YYYY-MM-DD[&time=HH:MM]
// Returns { blockedSpaceIds: string[] }

// Handles midnight-crossing ranges (e.g. 22:00–02:00)
function timeInRange(time: string, start: string, end: string): boolean {
  if (end <= start) return time >= start || time < end
  return time >= start && time < end
}

export async function GET(req: NextRequest) {
  const date = req.nextUrl.searchParams.get('date')
  const time = req.nextUrl.searchParams.get('time') // optional HH:MM
  if (!date) return NextResponse.json({ blockedSpaceIds: [] })

  const supabase = await createClient()

  const [{ data: bookings }, { data: blocks }] = await Promise.all([
    supabase
      .from('bookings')
      .select('space_id, start_time, end_time')
      .eq('event_date', date)
      .not('status', 'in', '("cancelled_guest","cancelled_host","rejected")'),
    supabase
      .from('space_availability')
      .select('space_id, start_time, end_time, block_type')
      .eq('blocked_date', date),
  ])

  const ids = new Set<string>()

  bookings?.forEach(b => {
    if (!time) {
      // Sin hora específica: solo marcar como no disponible si la reserva
      // cubre todo el día (sin horario definido). Una reserva parcial no
      // bloquea otros slots del día.
      if (!b.start_time || !b.end_time) ids.add(b.space_id)
    } else {
      const start = b.start_time ? b.start_time.slice(0, 5) : null
      const end   = b.end_time   ? b.end_time.slice(0, 5)   : null
      if (!start || !end || timeInRange(time, start, end)) {
        ids.add(b.space_id)
      }
    }
  })

  // Bloqueos manuales: full_day o sin horario → bloquea todo el día
  // time_range → solo bloquea si la hora pedida cae dentro del rango
  blocks?.forEach(b => {
    const isFullDay = b.block_type === 'full_day' || !b.start_time || !b.end_time
    if (isFullDay) {
      ids.add(b.space_id)
    } else if (time && b.start_time && b.end_time) {
      const bStart = b.start_time.slice(0, 5)
      const bEnd   = b.end_time.slice(0, 5)
      if (timeInRange(time, bStart, bEnd)) {
        ids.add(b.space_id)
      }
    }
    // sin time y bloque parcial → no bloquea (puede haber otros slots libres)
  })

  return NextResponse.json({ blockedSpaceIds: [...ids] })
}
