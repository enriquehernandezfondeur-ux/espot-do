'use server'

import { createClient } from '@/lib/supabase/server'
import { resolveHostAccess } from './_resolveHost'
import { revalidatePath } from 'next/cache'
import { sendEmail } from '@/lib/email/send'
import { todayInRD } from '@/lib/utils'
import { emailBase, infoBox } from '@/lib/email/templates'
import { escapeHtml, formatDate } from '@/lib/utils'

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://espot.do'

export interface Review {
  id:               string
  rating:           number
  comment:          string | null
  host_response:    string | null
  host_response_at: string | null
  created_at:       string
  guest:            { full_name: string | null }
  space?:           { id: string; name: string; slug: string }
}

export interface ReviewsSummary {
  average: number
  total:   number
  reviews: Review[]
}

export async function getSpaceReviews(spaceId: string): Promise<ReviewsSummary> {
  const supabase = await createClient()

  const { data } = await supabase
    .from('reviews')
    .select('id, rating, comment, host_response, host_response_at, created_at, profiles!guest_id(full_name)')
    .eq('space_id', spaceId)
    .eq('is_public', true)
    .order('created_at', { ascending: false })
    .limit(30)

  const reviews = (data ?? []).map((r: any) => ({
    id:               r.id,
    rating:           r.rating,
    comment:          r.comment,
    host_response:    r.host_response ?? null,
    host_response_at: r.host_response_at ?? null,
    created_at:       r.created_at,
    guest:            { full_name: r.profiles?.full_name ?? null },
  }))

  const total   = reviews.length
  const average = total > 0
    ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / total) * 10) / 10
    : 0

  return { average, total, reviews }
}

/** Todas las reseñas de los espacios del propietario autenticado */
export async function getHostReviews(): Promise<Review[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  const { hostId, db } = await resolveHostAccess(supabase, user.id)

  // Obtener los IDs de sus espacios
  const { data: spaces } = await db
    .from('spaces')
    .select('id, name, slug')
    .eq('host_id', hostId)

  if (!spaces?.length) return []
  const spaceIds = spaces.map(s => s.id)

  const { data } = await db
    .from('reviews')
    .select('id, rating, comment, host_response, host_response_at, created_at, space_id, profiles!guest_id(full_name)')
    .in('space_id', spaceIds)
    .eq('is_public', true)
    .order('created_at', { ascending: false })

  const spaceMap = Object.fromEntries(spaces.map(s => [s.id, s]))

  return (data ?? []).map((r: any) => ({
    id:               r.id,
    rating:           r.rating,
    comment:          r.comment,
    host_response:    r.host_response ?? null,
    host_response_at: r.host_response_at ?? null,
    created_at:       r.created_at,
    guest:            { full_name: r.profiles?.full_name ?? null },
    space:            spaceMap[r.space_id] ?? null,
  }))
}

/** Propietario responde a una reseña */
export async function respondToReview(
  reviewId: string,
  response: string
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }
  const { hostId, db, canRespondReviews } = await resolveHostAccess(supabase, user.id)
  if (!canRespondReviews) return { error: 'No tienes permiso para responder reseñas' }

  // Verificar que la reseña pertenece a un espacio del host
  const { data: review } = await db
    .from('reviews')
    .select('space_id, spaces!space_id(host_id)')
    .eq('id', reviewId)
    .single()

  if (!review) return { error: 'Reseña no encontrada' }
  if ((review.spaces as any)?.host_id !== hostId) return { error: 'No autorizado' }

  const { error } = await db
    .from('reviews')
    .update({
      host_response:    response.trim() || null,
      host_response_at: response.trim() ? new Date().toISOString() : null,
    })
    .eq('id', reviewId)

  if (error) return { error: error.message }

  revalidatePath('/espacios', 'layout')
  revalidatePath('/dashboard/host/resenas')
  return {}
}


export async function getUserReviewedBookings(): Promise<Set<string>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Set()

  const { data } = await supabase
    .from('reviews').select('booking_id').eq('guest_id', user.id)

  return new Set((data ?? []).map((r: any) => r.booking_id))
}

export async function submitReview(data: {
  bookingId: string
  spaceId:   string
  rating:    number
  comment:   string
}): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  if (data.rating < 1 || data.rating > 5) return { error: 'Rating inválido' }

  const today = todayInRD()
  const { data: booking } = await supabase
    .from('bookings').select('event_date, guest_id, status, space_id').eq('id', data.bookingId).single()
  if (!booking || booking.guest_id !== user.id) return { error: 'Reserva no encontrada' }
  if (booking.space_id !== data.spaceId) return { error: 'El espacio no corresponde a esta reserva' }
  if (booking.status === 'cancelled_guest' || booking.status === 'cancelled_host' || booking.status === 'rejected')
    return { error: 'No puedes dejar una reseña de una reserva cancelada' }
  if (booking.event_date >= today) return { error: 'Solo puedes dejar una reseña después de tu evento' }

  const { error } = await supabase.from('reviews').insert({
    booking_id: data.bookingId,
    space_id:   booking.space_id,
    guest_id:   user.id,
    rating:     data.rating,
    comment:    data.comment.trim() || null,
  })

  if (error) {
    if (error.code === '23505') return { error: 'Ya dejaste una reseña para esta reserva' }
    return { error: error.message }
  }

  // Notificar al host de la nueva reseña
  const { data: spaceData } = await supabase
    .from('spaces')
    .select('name, slug, profiles!host_id(full_name, email)')
    .eq('id', data.spaceId)
    .single()

  if (spaceData) {
    const host      = (spaceData as any).profiles as any
    const hostEmail = host?.email as string | undefined
    const hostName  = host?.full_name ?? 'Propietario'

    if (hostEmail) {
      const { data: guestProfile } = await supabase
        .from('profiles').select('full_name').eq('id', user.id).single()
      const guestName   = guestProfile?.full_name ?? 'Un cliente'
      const stars       = '★'.repeat(data.rating) + '☆'.repeat(5 - data.rating)
      const commentSafe = data.comment.trim() ? escapeHtml(data.comment.trim()) : null

      await sendEmail({
        to:      hostEmail,
        subject: `Nueva reseña en ${spaceData.name} — ${data.rating}/5 estrellas`,
        html: emailBase({
          title:       'Recibiste una nueva reseña',
          subtitle:    `${guestName} dejó una reseña en ${spaceData.name}.`,
          accentColor: '#F59E0B',
          body: `
            <p style="color:#374151;margin:0 0 16px;">Hola <strong>${escapeHtml(hostName)}</strong>, un cliente compartió su experiencia en tu espacio.</p>
            ${infoBox([
              { label: 'Espacio',     value: escapeHtml(spaceData.name) },
              { label: 'Cliente',     value: escapeHtml(guestName) },
              { label: 'Puntuación', value: `${stars} (${data.rating}/5)` },
              { label: 'Fecha',       value: formatDate(today) },
              ...(commentSafe ? [{ label: 'Comentario', value: commentSafe }] : []),
            ])}
            <p style="color:#6B7280;font-size:13px;margin:0;">Puedes responder a esta reseña desde tu panel de propietario.</p>`,
          cta: { text: 'Ver reseña y responder', url: `${SITE}/dashboard/host/resenas` },
        }),
      })
    }
  }

  revalidatePath('/espacios', 'layout')
  return {}
}
