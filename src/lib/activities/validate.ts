import type { LocationMode } from './types'

export const MAX_COMPANIONS = 20
type Result = { ok: true } | { ok: false; error: string }

export function validateCreateActivity(p: {
  type?: string; title?: string; location_mode?: LocationMode
  external_location?: string | null; booking_id?: string | null; space_id?: string | null
}): Result {
  if (!p.type) return { ok: false, error: 'Falta el tipo de actividad.' }
  if (!p.title || !p.title.trim()) return { ok: false, error: 'Escribe un nombre para la actividad.' }
  if (!p.location_mode) return { ok: false, error: 'Elige una ubicación.' }
  if (p.location_mode === 'external' && !p.external_location?.trim())
    return { ok: false, error: 'Escribe la dirección de la ubicación.' }
  if (p.location_mode === 'booking' && !p.booking_id)
    return { ok: false, error: 'Elige la reserva a vincular.' }
  if (p.location_mode === 'space' && !p.space_id)
    return { ok: false, error: 'Elige un espacio.' }
  return { ok: true }
}

export function validateRsvp(p: { name?: string; companions?: number }): Result {
  if (!p.name || !p.name.trim()) return { ok: false, error: 'Escribe tu nombre.' }
  const c = p.companions ?? 0
  if (c < 0 || c > MAX_COMPANIONS) return { ok: false, error: `Máximo ${MAX_COMPANIONS} acompañantes.` }
  return { ok: true }
}
