import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/availability?date=YYYY-MM-DD
// Returns { blockedSpaceIds: string[] }
export async function GET(req: NextRequest) {
  const date = req.nextUrl.searchParams.get('date')
  if (!date) return NextResponse.json({ blockedSpaceIds: [] })

  const supabase = await createClient()

  const [{ data: bookings }, { data: blocks }] = await Promise.all([
    supabase
      .from('bookings')
      .select('space_id')
      .eq('event_date', date)
      .not('status', 'in', '("cancelled_guest","cancelled_host","rejected")'),
    supabase
      .from('space_availability')
      .select('space_id')
      .eq('blocked_date', date),
  ])

  const ids = new Set<string>()
  bookings?.forEach(b => ids.add(b.space_id))
  blocks?.forEach(b => ids.add(b.space_id))

  return NextResponse.json({ blockedSpaceIds: [...ids] })
}
