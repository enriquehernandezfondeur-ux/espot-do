'use server'

import { createServiceClient } from '@/lib/supabase/service'
import { isValidPublicCode } from '@/lib/activities/public-code'
import { validateRsvp } from '@/lib/activities/validate'

/** Vista pública: solo campos no sensibles. NUNCA expone la lista de participantes. */
export async function getPublicActivity(code: string) {
  if (!isValidPublicCode(code)) return null
  const supabase = createServiceClient()
  const { data: activity } = await supabase
    .from('activities')
    .select('id, type, title, description, event_date, start_time, end_time, location_mode, external_location, space_id, cover_image, public_enabled, allow_companions')
    .eq('public_code', code).single()
  if (!activity || !activity.public_enabled) return null

  const { data: questions } = await supabase
    .from('activity_questions')
    .select('id, label, field_type, options, required, sort_order')
    .eq('activity_id', activity.id).order('sort_order')

  let space = null
  if (activity.location_mode === 'space' && activity.space_id) {
    const { data } = await supabase
      .from('spaces').select('name, address, city, lat, lng').eq('id', activity.space_id).single()
    space = data
  }
  return { activity, questions: questions ?? [], space }
}

export async function submitRsvp(input: {
  code: string; name: string; contact?: string
  companions?: number; answers?: Record<string, string>
}) {
  const v = validateRsvp(input)
  if (!v.ok) return { ok: false as const, error: v.error }
  if (!isValidPublicCode(input.code)) return { ok: false as const, error: 'Enlace inválido.' }

  const supabase = createServiceClient()
  const { data: activity } = await supabase
    .from('activities').select('id, public_enabled, allow_companions')
    .eq('public_code', input.code).single()
  if (!activity || !activity.public_enabled) return { ok: false as const, error: 'Esta actividad ya no recibe confirmaciones.' }

  const token = `${input.code}-${crypto.randomUUID()}`
  const { error } = await supabase.from('activity_participants').insert({
    activity_id: activity.id,
    name: input.name.trim(),
    contact: input.contact?.trim() || null,
    status: 'confirmado',
    companions: activity.allow_companions ? (input.companions ?? 0) : 0,
    answers: input.answers ?? null,
    rsvp_token: token,
  })
  if (error) return { ok: false as const, error: 'No se pudo confirmar. Intenta de nuevo.' }
  return { ok: true as const }
}
