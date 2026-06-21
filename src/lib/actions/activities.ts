'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { generatePublicCode } from '@/lib/activities/public-code'
import { getTemplate } from '@/lib/activities/templates'
import { validateCreateActivity, validateRsvp } from '@/lib/activities/validate'
import type { Activity, ActivityQuestion, ActivityParticipant, ActivityType, LocationMode, QuestionFieldType } from '@/lib/activities/types'

export interface CreateActivityInput {
  type: ActivityType
  title: string
  event_date?: string | null
  start_time?: string | null
  end_time?: string | null
  expected_people?: number | null
  location_mode: LocationMode
  booking_id?: string | null
  space_id?: string | null
  external_location?: string | null
}

export async function createActivity(input: CreateActivityInput) {
  const v = validateCreateActivity(input)
  if (!v.ok) return { ok: false as const, error: v.error }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false as const, error: 'No autenticado.' }

  // Auto-portada: si la actividad usa un espacio (directo o vía reserva),
  // tomamos su foto de portada para que la card y la página pública luzcan.
  let cover: string | null = null
  let coverSpaceId = input.space_id ?? null
  if (!coverSpaceId && input.booking_id) {
    const { data: bk } = await supabase.from('bookings').select('space_id').eq('id', input.booking_id).single()
    coverSpaceId = (bk as { space_id?: string } | null)?.space_id ?? null
  }
  if (coverSpaceId) {
    const { data: sp } = await supabase.from('spaces').select('space_images(url, is_cover)').eq('id', coverSpaceId).single()
    const imgs = (sp as { space_images?: { url: string; is_cover: boolean }[] } | null)?.space_images
    cover = imgs?.find(i => i.is_cover)?.url ?? imgs?.[0]?.url ?? null
  }

  const code = generatePublicCode()
  const { data, error } = await supabase.from('activities').insert({
    organizer_id: user.id,
    type: input.type,
    title: input.title.trim(),
    event_date: input.event_date ?? null,
    start_time: input.start_time ?? null,
    end_time: input.end_time ?? null,
    expected_people: input.expected_people ?? null,
    location_mode: input.location_mode,
    booking_id: input.booking_id ?? null,
    space_id: input.space_id ?? null,
    external_location: input.external_location ?? null,
    cover_image: cover,
    public_code: code,
    public_enabled: true,
    status: 'publicada',
  }).select('id').single()

  if (error || !data) return { ok: false as const, error: 'No se pudo crear la actividad.' }

  // Sembrar preguntas de la plantilla del tipo
  const tpl = getTemplate(input.type)
  if (tpl.questions.length) {
    await supabase.from('activity_questions').insert(
      tpl.questions.map((q, i) => ({
        activity_id: data.id, label: q.label, field_type: q.field_type,
        options: q.options ?? null, required: q.required ?? false, sort_order: i,
      })),
    )
  }

  revalidatePath('/dashboard/actividades')
  return { ok: true as const, id: data.id as string }
}

export async function getMyActivities(): Promise<Activity[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  const { data } = await supabase
    .from('activities')
    .select('*')
    .eq('organizer_id', user.id)
    .order('event_date', { ascending: true, nullsFirst: false })
  return (data ?? []) as Activity[]
}

export interface ActivityDetail {
  activity: Activity
  questions: ActivityQuestion[]
  participants: ActivityParticipant[]
}

export async function getActivityDetail(id: string): Promise<ActivityDetail | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: activity } = await supabase
    .from('activities').select('*').eq('id', id).eq('organizer_id', user.id).single()
  if (!activity) return null
  const { data: questions } = await supabase
    .from('activity_questions').select('*').eq('activity_id', id).order('sort_order')
  const { data: participants } = await supabase
    .from('activity_participants').select('*').eq('activity_id', id).order('created_at')
  return {
    activity: activity as Activity,
    questions: (questions ?? []) as ActivityQuestion[],
    participants: (participants ?? []) as ActivityParticipant[],
  }
}

/** Conteo de participantes confirmados por actividad (para la lista). */
export async function getConfirmedCounts(activityIds: string[]): Promise<Record<string, number>> {
  if (activityIds.length === 0) return {}
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return {}
  const { data } = await supabase
    .from('activity_participants')
    .select('activity_id, status')
    .in('activity_id', activityIds)
    .eq('status', 'confirmado')
  const counts: Record<string, number> = {}
  for (const row of (data ?? []) as { activity_id: string }[]) {
    counts[row.activity_id] = (counts[row.activity_id] ?? 0) + 1
  }
  return counts
}

export interface SpaceSearchResult {
  id: string
  name: string
  slug: string | null
  city: string | null
  sector: string | null
  address: string | null
  cover: string | null
}

/** Búsqueda simple de espacios publicados para vincular a una actividad. */
export async function searchSpacesForActivity(query: string): Promise<SpaceSearchResult[]> {
  const supabase = await createClient()
  let q = supabase
    .from('spaces')
    .select('id, name, slug, city, sector, address, space_images(url, is_cover)')
    .eq('is_published', true)
    .eq('is_active', true)
    .limit(12)
  const term = query.trim()
  if (term) q = q.ilike('name', `%${term}%`)
  const { data } = await q
  return ((data ?? []) as any[]).map(s => ({
    id: s.id,
    name: s.name,
    slug: s.slug ?? null,
    city: s.city ?? null,
    sector: s.sector ?? null,
    address: s.address ?? null,
    cover: s.space_images?.find((i: any) => i.is_cover)?.url ?? s.space_images?.[0]?.url ?? null,
  }))
}

/** Alta manual de un participante (p.ej. alguien que confirmó por teléfono). */
export async function addParticipant(activityId: string, input: { name: string; companions?: number; contact?: string }) {
  const v = validateRsvp({ name: input.name, companions: input.companions })
  if (!v.ok) return { ok: false as const, error: v.error }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false as const, error: 'No autenticado.' }
  // La RLS de activity_participants exige que la actividad sea del organizador.
  const token = `manual-${crypto.randomUUID()}`
  const { error } = await supabase.from('activity_participants').insert({
    activity_id: activityId,
    name: input.name.trim(),
    contact: input.contact?.trim() || null,
    status: 'confirmado',
    companions: input.companions ?? 0,
    rsvp_token: token,
  })
  if (error) return { ok: false as const, error: 'No se pudo agregar.' }
  revalidatePath(`/dashboard/actividades/${activityId}`)
  return { ok: true as const }
}

export async function removeParticipant(participantId: string, activityId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false as const, error: 'No autenticado.' }
  // RLS: el delete solo afecta filas de actividades del organizador.
  const { error } = await supabase.from('activity_participants').delete().eq('id', participantId)
  if (error) return { ok: false as const, error: 'No se pudo quitar.' }
  revalidatePath(`/dashboard/actividades/${activityId}`)
  return { ok: true as const }
}

/** Agrega una pregunta personalizada al RSVP de la actividad. */
export async function addQuestion(activityId: string, input: {
  label: string; field_type: QuestionFieldType; options?: string[] | null; required?: boolean
}) {
  if (!input.label.trim()) return { ok: false as const, error: 'Escribe la pregunta.' }
  if (input.field_type === 'choice' && !(input.options && input.options.length))
    return { ok: false as const, error: 'Agrega al menos una opción.' }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false as const, error: 'No autenticado.' }
  const { data: last } = await supabase.from('activity_questions')
    .select('sort_order').eq('activity_id', activityId).order('sort_order', { ascending: false }).limit(1)
  const nextOrder = ((last?.[0]?.sort_order as number | undefined) ?? -1) + 1
  // RLS: el WITH CHECK exige que la actividad sea del organizador.
  const { error } = await supabase.from('activity_questions').insert({
    activity_id: activityId,
    label: input.label.trim(),
    field_type: input.field_type,
    options: input.field_type === 'choice' ? (input.options ?? null) : null,
    required: input.required ?? false,
    sort_order: nextOrder,
  })
  if (error) return { ok: false as const, error: 'No se pudo agregar.' }
  revalidatePath(`/dashboard/actividades/${activityId}`)
  return { ok: true as const }
}

export async function removeQuestion(questionId: string, activityId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false as const, error: 'No autenticado.' }
  const { error } = await supabase.from('activity_questions').delete().eq('id', questionId)
  if (error) return { ok: false as const, error: 'No se pudo quitar.' }
  revalidatePath(`/dashboard/actividades/${activityId}`)
  return { ok: true as const }
}

/** Marca o desmarca la entrada de un participante el día del evento. */
export async function setCheckin(participantId: string, activityId: string, checkedIn: boolean) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false as const, error: 'No autenticado.' }
  // RLS: solo afecta participantes de actividades del organizador.
  const { error } = await supabase.from('activity_participants').update({
    status: checkedIn ? 'registrado' : 'confirmado',
    checked_in_at: checkedIn ? new Date().toISOString() : null,
  }).eq('id', participantId)
  if (error) return { ok: false as const, error: 'No se pudo actualizar.' }
  revalidatePath(`/dashboard/actividades/${activityId}/checkin`)
  revalidatePath(`/dashboard/actividades/${activityId}`)
  return { ok: true as const }
}

export interface UpdateActivityInput {
  title?: string
  event_date?: string | null
  start_time?: string | null
  end_time?: string | null
  expected_people?: number | null
  external_location?: string | null
}

export async function updateActivity(id: string, patch: UpdateActivityInput) {
  if (patch.title !== undefined && !patch.title.trim())
    return { ok: false as const, error: 'El nombre no puede quedar vacío.' }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false as const, error: 'No autenticado.' }
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (patch.title !== undefined)             update.title = patch.title.trim()
  if (patch.event_date !== undefined)        update.event_date = patch.event_date
  if (patch.start_time !== undefined)        update.start_time = patch.start_time
  if (patch.end_time !== undefined)          update.end_time = patch.end_time
  if (patch.expected_people !== undefined)   update.expected_people = patch.expected_people
  if (patch.external_location !== undefined) update.external_location = patch.external_location
  const { error } = await supabase.from('activities').update(update).eq('id', id).eq('organizer_id', user.id)
  if (error) return { ok: false as const, error: 'No se pudo guardar.' }
  revalidatePath(`/dashboard/actividades/${id}`)
  return { ok: true as const }
}

export async function cancelActivity(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false as const, error: 'No autenticado.' }
  const { error } = await supabase.from('activities')
    .update({ status: 'cancelada', public_enabled: false, updated_at: new Date().toISOString() })
    .eq('id', id).eq('organizer_id', user.id)
  if (error) return { ok: false as const, error: 'No se pudo cancelar.' }
  revalidatePath('/dashboard/actividades')
  return { ok: true as const }
}
