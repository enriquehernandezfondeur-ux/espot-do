'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

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

  // Obtener los IDs de sus espacios
  const { data: spaces } = await supabase
    .from('spaces')
    .select('id, name, slug')
    .eq('host_id', user.id)

  if (!spaces?.length) return []
  const spaceIds = spaces.map(s => s.id)

  const { data } = await supabase
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

  // Verificar que la reseña pertenece a un espacio del host
  const { data: review } = await supabase
    .from('reviews')
    .select('space_id, spaces!space_id(host_id)')
    .eq('id', reviewId)
    .single()

  if (!review) return { error: 'Reseña no encontrada' }
  if ((review.spaces as any)?.host_id !== user.id) return { error: 'No autorizado' }

  const { error } = await supabase
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

export async function getUserPendingReview(_userId?: string): Promise<{
  bookingId: string
  spaceId:   string
  spaceName: string
} | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: bookings } = await supabase
    .from('bookings')
    .select('id, space_id, spaces!space_id(name), event_date')
    .eq('guest_id', user.id)
    .eq('status', 'confirmed')
    .in('payment_status', ['advance', 'partial', 'paid'])
    .lt('event_date', new Date().toISOString().split('T')[0])
    .order('event_date', { ascending: false })
    .limit(10)

  if (!bookings?.length) return null

  const bookingIds = bookings.map(b => b.id)
  const { data: existing } = await supabase
    .from('reviews').select('booking_id').in('booking_id', bookingIds)

  const reviewed = new Set((existing ?? []).map((r: any) => r.booking_id))
  const pending  = bookings.find(b => !reviewed.has(b.id))
  if (!pending) return null

  return {
    bookingId: pending.id,
    spaceId:   pending.space_id,
    spaceName: (pending.spaces as any)?.name ?? 'Espacio',
  }
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

  const today = new Date().toISOString().split('T')[0]
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

  revalidatePath('/espacios', 'layout')
  return {}
}
