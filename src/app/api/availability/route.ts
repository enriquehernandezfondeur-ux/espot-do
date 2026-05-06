import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/availability?date=YYYY-MM-DD[&time=HH:MM]
// Returns { blockedSpaceIds: string[] }
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
      .select('space_id')
      .eq('blocked_date', date),
  ])

  const ids = new Set<string>()

  bookings?.forEach(b => {
    if (!time) {
      // Sin hora: cualquier reserva bloquea el espacio
      ids.add(b.space_id)
    } else {
      // Con hora: bloquear si la reserva no tiene horario (todo el día)
      // o si el horario solicitado cae dentro del rango de la reserva
      const start = b.start_time ? b.start_time.slice(0, 5) : null
      const end   = b.end_time   ? b.end_time.slice(0, 5)   : null
      if (!start || !end || (time >= start && time < end)) {
        ids.add(b.space_id)
      }
    }
  })

  blocks?.forEach(b => ids.add(b.space_id))

  return NextResponse.json({ blockedSpaceIds: [...ids] })
}
