'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { generatePublicCode } from '@/lib/activities/public-code'
import { getTemplate } from '@/lib/activities/templates'
import { validateCreateActivity } from '@/lib/activities/validate'
import type { Activity, ActivityQuestion, ActivityParticipant, ActivityType, LocationMode } from '@/lib/activities/types'

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
