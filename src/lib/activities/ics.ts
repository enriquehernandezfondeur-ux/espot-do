// Generación de un evento de calendario (.ics) para una actividad.
// Hora "flotante" (sin TZID/Z): los calendarios la interpretan como hora local,
// lo que evita el corrimiento UTC-4 de RD sin depender de zonas horarias.

export interface IcsInput {
  uid: string
  title: string
  description?: string | null
  event_date?: string | null   // 'YYYY-MM-DD'
  start_time?: string | null    // 'HH:MM' o 'HH:MM:SS'
  end_time?: string | null
  location?: string | null
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

function stamp(date: string, time: string): string {
  const [h, m] = time.split(':')
  return date.replace(/-/g, '') + 'T' + pad(Number(h)) + pad(Number(m)) + '00'
}

/** Suma minutos a 'HH:MM', sin pasar de 23:59 (no cruza de día). */
export function addMinutes(time: string, mins: number): string {
  const [h, m] = time.split(':').map(Number)
  const total = Math.min(h * 60 + m + mins, 23 * 60 + 59)
  return `${pad(Math.floor(total / 60))}:${pad(total % 60)}`
}

function escapeText(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n')
}

/** Devuelve el contenido .ics, o null si no hay fecha (sin fecha no hay evento). */
export function buildIcs(input: IcsInput): string | null {
  if (!input.event_date) return null
  const startT = input.start_time ?? '09:00'
  const endT = input.end_time ?? addMinutes(startT, 120)
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Espot//Actividades//ES',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${input.uid}`,
    `DTSTART:${stamp(input.event_date, startT)}`,
    `DTEND:${stamp(input.event_date, endT)}`,
    `SUMMARY:${escapeText(input.title)}`,
  ]
  if (input.description) lines.push(`DESCRIPTION:${escapeText(input.description)}`)
  if (input.location) lines.push(`LOCATION:${escapeText(input.location)}`)
  lines.push('END:VEVENT', 'END:VCALENDAR')
  return lines.join('\r\n')
}

/** Data URI descargable para un <a download>. */
export function icsDataUri(ics: string): string {
  return 'data:text/calendar;charset=utf-8,' + encodeURIComponent(ics)
}
