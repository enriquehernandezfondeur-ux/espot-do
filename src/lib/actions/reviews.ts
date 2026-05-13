'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export interface Review {
  id:         string
  rating:     number
  comment:    string | null
  created_at: string
  guest:      { full_name: string | null }
}

export interface ReviewsSummary {
  average:  number
  total:    number
  reviews:  Review[]
}

export async function getSpaceReviews(spaceId: string): Promise<ReviewsSummary> {
  const supabase = await createClient()

  const { data } = await supabase
    .from('reviews')
    .select('id, rating, comment, created_at, profiles!guest_id(full_name)')
    .eq('space_id', spaceId)
    .eq('is_public', true)
    .order('created_at', { ascending: false })

  const reviews = (data ?? []).map((r: any) => ({
    id:         r.id,
    rating:     r.rating,
    comment:    r.comment,
    created_at: r.created_at,
    guest:      { full_name: r.profiles?.full_name ?? null },
  }))

  const total   = reviews.length
  const average = total > 0
    ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / total) * 10) / 10
    : 0

  return { average, total, reviews }
}

export async function getUserPendingReview(userId: string): Promise<{
  bookingId: string
  spaceId:   string
  spaceName: string
} | null> {
  const supabase = await createClient()

  // Buscar reservas completadas sin reseña
  const { data: bookings } = await supabase
    .from('bookings')
    .select('id, space_id, spaces!space_id(name), event_date')
    .eq('guest_id', userId)
    .eq('status', 'confirmed')
    .in('payment_status', ['advance', 'partial', 'paid'])
    .lt('event_date', new Date().toISOString().split('T')[0])
    .order('event_date', { ascending: false })
    .limit(10)

  if (!bookings?.length) return null

  // Verificar cuáles ya tienen reseña
  const bookingIds = bookings.map(b => b.id)
  const { data: existing } = await supabase
    .from('reviews')
    .select('booking_id')
    .in('booking_id', bookingIds)

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
    .from('reviews')
    .select('booking_id')
    .eq('guest_id', user.id)

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

  // Verificar que la reserva pertenece al usuario y el evento ya ocurrió
  const today = new Date().toISOString().split('T')[0]
  const { data: booking } = await supabase
    .from('bookings')
    .select('event_date, guest_id')
    .eq('id', data.bookingId)
    .single()
  if (!booking || booking.guest_id !== user.id) return { error: 'Reserva no encontrada' }
  if (booking.event_date >= today) return { error: 'Solo puedes dejar una reseña después de tu evento' }

  const { error } = await supabase.from('reviews').insert({
    booking_id: data.bookingId,
    space_id:   data.spaceId,
    guest_id:   user.id,
    rating:     data.rating,
    comment:    data.comment.trim() || null,
  })

  if (error) {
    if (error.code === '23505') return { error: 'Ya dejaste una reseña para esta reserva' }
    return { error: error.message }
  }

  revalidatePath(`/espacios`)
  return {}
}
