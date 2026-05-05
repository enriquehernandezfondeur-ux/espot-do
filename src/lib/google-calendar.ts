/**
 * Google Calendar API — integración para propietarios de Espot
 * Usa la REST API directamente (sin SDK) para mantener el bundle liviano.
 */

const GOOGLE_AUTH_URL  = 'https://accounts.google.com/o/oauth2/v2/auth'
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const GCAL_API         = 'https://www.googleapis.com/calendar/v3'
const TIMEZONE         = 'America/Santo_Domingo'

// ── OAuth helpers ─────────────────────────────────────────

/** Construye la URL de autorización para iniciar el flujo OAuth */
export function buildAuthUrl(state: string): string {
  const clientId     = process.env.GOOGLE_CLIENT_ID
  const redirectUri  = process.env.GOOGLE_REDIRECT_URI
  if (!clientId || !redirectUri) return ''

  return `${GOOGLE_AUTH_URL}?${new URLSearchParams({
    client_id:     clientId,
    redirect_uri:  redirectUri,
    response_type: 'code',
    scope:         'https://www.googleapis.com/auth/calendar.events',
    access_type:   'offline',
    prompt:        'consent',   // garantiza que Google devuelva el refresh_token
    state,
  })}`
}

/** Intercambia el code de OAuth por access_token + refresh_token */
export async function exchangeCode(
  code: string,
): Promise<{ access_token: string; refresh_token: string } | null> {
  const clientId     = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const redirectUri  = process.env.GOOGLE_REDIRECT_URI
  if (!clientId || !clientSecret || !redirectUri) return null

  const res = await fetch(GOOGLE_TOKEN_URL, {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id:     clientId,
      client_secret: clientSecret,
      redirect_uri:  redirectUri,
      code,
      grant_type:    'authorization_code',
    }),
  })
  const data = await res.json()
  if (!data.refresh_token || !data.access_token) return null
  return { access_token: data.access_token, refresh_token: data.refresh_token }
}

/** Obtiene un access_token fresco usando el refresh_token almacenado */
async function refreshAccessToken(refreshToken: string): Promise<string | null> {
  const clientId     = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  if (!clientId || !clientSecret) return null

  const res = await fetch(GOOGLE_TOKEN_URL, {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id:     clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type:    'refresh_token',
    }),
  })
  const data = await res.json()
  return data.access_token ?? null
}

// ── Formato de fechas ─────────────────────────────────────

/**
 * Combina date (YYYY-MM-DD) y time (HH:MM:SS) en formato ISO 8601 local.
 * Si la hora es madrugada (00-05) y advanceDay=true, suma un día.
 */
export function toLocalISO(date: string, time: string, advanceDay = false): string {
  const hour = parseInt(time.split(':')[0])
  let d = new Date(date + 'T12:00')
  if (advanceDay && hour < 6) d.setDate(d.getDate() + 1)
  const dateStr = d.toISOString().split('T')[0]
  const timeStr = time.slice(0, 5)  // HH:MM
  return `${dateStr}T${timeStr}:00`
}

// ── Operaciones CRUD en Google Calendar ──────────────────

/** Crea un evento y devuelve su ID */
async function createEvent(accessToken: string, body: object): Promise<string | null> {
  const res = await fetch(`${GCAL_API}/calendars/primary/events`, {
    method:  'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  })
  const data = await res.json()
  return data.id ?? null
}

/** Elimina un evento. Falla silenciosamente si no existe. */
async function deleteEvent(accessToken: string, eventId: string): Promise<void> {
  await fetch(`${GCAL_API}/calendars/primary/events/${eventId}`, {
    method:  'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  }).catch(() => {}) // ignora errores (evento ya eliminado, etc.)
}

// ── API pública ───────────────────────────────────────────

interface BookingData {
  id:                       string
  event_date:               string
  start_time:               string
  end_time:                 string
  event_type:               string | null
  guest_count:              number
  google_calendar_event_id?: string | null
}

interface SpaceData {
  name:     string
  address?: string | null
  sector?:  string | null
  city?:    string | null
}

/**
 * Crea un evento en Google Calendar para una reserva confirmada.
 * Devuelve el google_calendar_event_id para guardarlo en la reserva.
 */
export async function createBookingEvent(
  refreshToken: string,
  booking: BookingData,
  space: SpaceData,
  guestName: string,
): Promise<string | null> {
  try {
    const accessToken = await refreshAccessToken(refreshToken)
    if (!accessToken) return null

    const startDT = toLocalISO(booking.event_date, booking.start_time)
    const endDT   = toLocalISO(booking.event_date, booking.end_time, true)
    const location = [space.address, space.sector, space.city].filter(Boolean).join(', ')

    const description = [
      `Espacio: ${space.name}`,
      `Cliente: ${guestName}`,
      `Personas: ${booking.guest_count}`,
      `Estado: Confirmada`,
      `Reservado en espot.do`,
    ].join('\n')

    return await createEvent(accessToken, {
      summary:     `${booking.event_type || 'Reserva'} — ${guestName}`,
      description,
      location,
      start: { dateTime: startDT, timeZone: TIMEZONE },
      end:   { dateTime: endDT,   timeZone: TIMEZONE },
      status: 'confirmed',
    })
  } catch {
    return null // No bloquear el flujo de reserva
  }
}

/**
 * Elimina el evento de Google Calendar asociado a una reserva.
 * Se llama al rechazar o cancelar.
 */
export async function deleteBookingEvent(
  refreshToken: string,
  googleEventId: string,
): Promise<void> {
  try {
    const accessToken = await refreshAccessToken(refreshToken)
    if (!accessToken) return
    await deleteEvent(accessToken, googleEventId)
  } catch {
    // Silencioso
  }
}

/** Devuelve true si las credenciales de Google Calendar están configuradas */
export function isGoogleCalendarConfigured(): boolean {
  return !!(
    process.env.GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CLIENT_SECRET &&
    process.env.GOOGLE_REDIRECT_URI
  )
}
