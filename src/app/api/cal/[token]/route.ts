import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// ── Helpers iCal (RFC 5545) ───────────────────────────────

/** Escapa caracteres especiales en valores de texto iCal */
function esc(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n')
}

/** Dobla líneas largas según RFC 5545 (máx 75 octetos) */
function fold(line: string): string {
  if (line.length <= 75) return line
  let out = ''
  let pos = 0
  while (pos < line.length) {
    if (pos === 0) { out += line.slice(0, 75); pos = 75 }
    else           { out += '\r\n ' + line.slice(pos, pos + 74); pos += 74 }
  }
  return out
}

/** Formatea fecha+hora para iCal con TZID (República Dominicana = UTC-4, sin DST) */
function icalDT(date: string, time: string): string {
  const [h] = time.split(':')
  const dateStr = date.replace(/-/g, '')
  const timeStr = time.replace(/:/g, '').slice(0, 6).padEnd(6, '0')
  return `${dateStr}T${timeStr}`
}

/** Formatea fecha all-day para iCal */
function icalDate(date: string): string {
  return date.replace(/-/g, '')
}

/** Avanza un día para DTEND de eventos all-day */
function nextDay(date: string): string {
  const d = new Date(date + 'T12:00')
  d.setDate(d.getDate() + 1)
  return d.toISOString().split('T')[0].replace(/-/g, '')
}

/** Si la hora de fin es madrugada (00-05), el DTEND es el día siguiente */
function endDate(eventDate: string, endTime: string): string {
  const h = parseInt(endTime.split(':')[0])
  if (h < 6) {
    const d = new Date(eventDate + 'T12:00')
    d.setDate(d.getDate() + 1)
    return d.toISOString().split('T')[0].replace(/-/g, '')
  }
  return eventDate.replace(/-/g, '')
}

const STATUS_LABEL: Record<string, string> = {
  confirmed:  'Confirmada',
  accepted:   'Pendiente de pago',
  completed:  'Completada',
}

// ── Handler ───────────────────────────────────────────────

export const dynamic = 'force-dynamic'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params

  if (!token || token.length < 10) {
    return new NextResponse('Token inválido', { status: 400 })
  }

  const supabase = await createClient()

  // La función SECURITY DEFINER devuelve los datos del propietario
  // asociado al token sin requerir autenticación
  const { data: feed, error } = await supabase
    .rpc('get_ical_feed_data', { p_token: token })

  if (error || !feed) {
    return new NextResponse('Feed no encontrado', { status: 404 })
  }

  const spaces: Record<string, any> = {}
  for (const s of feed.spaces ?? []) spaces[s.id] = s

  const now = new Date().toISOString().replace(/[-:.]/g, '').slice(0, 15) + 'Z'
  const lines: string[] = []

  // ── Cabecera ──────────────────────────────────────────
  lines.push(
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//espot.do//Espot Calendar//ES',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    fold(`X-WR-CALNAME:Reservas — espot.do`),
    'X-WR-TIMEZONE:America/Santo_Domingo',
    'X-WR-CALDESC:Reservas sincronizadas desde espot.do',
    'REFRESH-INTERVAL;VALUE=DURATION:PT30M',
    'X-PUBLISHED-TTL:PT30M',
  )

  // ── Reservas ──────────────────────────────────────────
  for (const bk of feed.bookings ?? []) {
    const space   = spaces[bk.space_id]
    const label   = STATUS_LABEL[bk.status] ?? bk.status
    const summary = `${bk.event_type || 'Reserva'} — ${bk.guest_name || 'Cliente'}`
    const location = space
      ? [space.address, space.sector, space.city].filter(Boolean).join(', ')
      : ''
    const description = [
      `Espacio: ${space?.name ?? ''}`,
      `Cliente: ${bk.guest_name ?? '—'}`,
      `Personas: ${bk.guest_count}`,
      `Estado: ${label}`,
    ].join('\\n')

    const dtStart = icalDT(bk.event_date, bk.start_time)
    const dtEnd   = endDate(bk.event_date, bk.end_time) + 'T' + bk.end_time.replace(/:/g, '').slice(0, 6).padEnd(6, '0')

    lines.push(
      'BEGIN:VEVENT',
      `UID:booking-${bk.id}@espot.do`,
      `DTSTAMP:${now}`,
      fold(`DTSTART;TZID=America/Santo_Domingo:${dtStart}`),
      fold(`DTEND;TZID=America/Santo_Domingo:${dtEnd}`),
      fold(`SUMMARY:${esc(summary)}`),
      fold(`DESCRIPTION:${esc(description)}`),
      fold(`LOCATION:${esc(location)}`),
      `STATUS:${bk.status === 'confirmed' || bk.status === 'completed' ? 'CONFIRMED' : 'TENTATIVE'}`,
      'END:VEVENT',
    )
  }

  // ── Fechas bloqueadas (all-day) ────────────────────────
  for (const bl of feed.blocks ?? []) {
    const space   = spaces[bl.space_id]
    const reason  = bl.reason ?? 'Bloqueado'
    const summary = space ? `${space.name} — ${reason}` : reason

    lines.push(
      'BEGIN:VEVENT',
      `UID:block-${bl.id}@espot.do`,
      `DTSTAMP:${now}`,
      `DTSTART;VALUE=DATE:${icalDate(bl.blocked_date)}`,
      `DTEND;VALUE=DATE:${nextDay(bl.blocked_date)}`,
      fold(`SUMMARY:${esc(summary)}`),
      'STATUS:CONFIRMED',
      'TRANSP:OPAQUE',
      'END:VEVENT',
    )
  }

  lines.push('END:VCALENDAR')

  const body = lines.join('\r\n')

  return new NextResponse(body, {
    headers: {
      'Content-Type':        'text/calendar; charset=utf-8',
      'Content-Disposition': 'attachment; filename="espot-reservas.ics"',
      'Cache-Control':       'no-cache, no-store, must-revalidate',
    },
  })
}
