'use server'

import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { sendEmail } from '@/lib/email/send'
import { tplDisputaAbierta } from '@/lib/email/templates'

const SITE        = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://espot.do'
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'contacto@espot.do'

export type DisputeCategory =
  | 'espacio_diferente'
  | 'cancelacion_injusta'
  | 'pago_incorrecto'
  | 'host_no_responde'
  | 'cliente_no_responde'
  | 'danos'
  | 'otro'

export type DisputeStatus =
  | 'abierta'
  | 'en_revision'
  | 'resuelta_cliente'
  | 'resuelta_host'
  | 'cerrada'

export const CATEGORY_LABELS: Record<DisputeCategory, string> = {
  espacio_diferente:   'Espacio diferente a lo prometido',
  cancelacion_injusta: 'Cancelación injusta',
  pago_incorrecto:     'Pago incorrecto',
  host_no_responde:    'Host no responde',
  cliente_no_responde: 'Cliente no responde',
  danos:               'Daños al espacio',
  otro:                'Otro motivo',
}

export const STATUS_LABELS_DISPUTE: Record<DisputeStatus, string> = {
  abierta:          'Abierta',
  en_revision:      'En revisión',
  resuelta_cliente: 'Resuelta a favor del cliente',
  resuelta_host:    'Resuelta a favor del host',
  cerrada:          'Cerrada',
}

// ── 1. ABRIR DISPUTA ─────────────────────────────────────────

export async function openDispute(
  bookingId: string,
  reason: string,
  category: DisputeCategory,
): Promise<{ error?: string; disputeId?: string }> {
  if (!bookingId || !reason || !category) return { error: 'Todos los campos son obligatorios' }
  if (reason.trim().length < 20) return { error: 'La descripción debe tener al menos 20 caracteres' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Debes iniciar sesión' }

  // Obtener la reserva con datos del guest, host y espacio
  const { data: booking, error: bookingError } = await supabase
    .from('bookings')
    .select(`
      id, status, guest_id, space_id,
      spaces!space_id(id, name, host_id,
        profiles!host_id(id, full_name, email)
      ),
      profiles!guest_id(id, full_name, email)
    `)
    .eq('id', bookingId)
    .single()

  if (bookingError || !booking) return { error: 'Reserva no encontrada' }

  // Verificar que el usuario es parte de esta reserva
  const space    = (booking as any).spaces
  const hostId   = space?.host_id as string
  const guestId  = booking.guest_id as string
  const isGuest  = user.id === guestId
  const isHost   = user.id === hostId

  if (!isGuest && !isHost) return { error: 'No tienes permiso para abrir una disputa en esta reserva' }

  // Solo en reservas confirmadas o completadas
  const allowedStatuses = ['confirmed', 'completed']
  if (!allowedStatuses.includes(booking.status)) {
    return { error: 'Solo puedes abrir una disputa en reservas confirmadas o completadas' }
  }

  // Verificar que no hay otra disputa abierta para esta reserva
  const { data: existing } = await supabase
    .from('disputes')
    .select('id, status')
    .eq('booking_id', bookingId)
    .in('status', ['abierta', 'en_revision'])
    .maybeSingle()

  if (existing) return { error: 'Ya existe una disputa activa para esta reserva' }

  // Determinar against: si es guest → against = host, y viceversa
  const againstId = isGuest ? hostId : guestId

  const { data: dispute, error: insertError } = await supabase
    .from('disputes')
    .insert({
      booking_id: bookingId,
      opened_by:  user.id,
      against:    againstId,
      reason:     reason.trim(),
      category,
      status:     'abierta',
    })
    .select('id')
    .single()

  if (insertError || !dispute) {
    console.error('[openDispute] Insert error:', insertError)
    return { error: 'No se pudo abrir la disputa. Intenta de nuevo.' }
  }

  // Emails de notificación (no bloqueantes)
  const guestProfile = (booking as any).profiles as any
  const hostProfile  = (space as any)?.profiles as any
  const spaceName    = space?.name ?? 'espacio'
  const disputeUrl   = `${SITE}/admin/disputas`
  const clientUrl    = `${SITE}/dashboard/reservas/${bookingId}`

  try {
    const categoryLabel = CATEGORY_LABELS[category] ?? category

    // Email al que abre la disputa
    const openerProfile = isGuest ? guestProfile : hostProfile
    if (openerProfile?.email) {
      await sendEmail({
        to:      openerProfile.email,
        subject: `Disputa recibida — Reserva ${bookingId.slice(0, 8).toUpperCase()}`,
        html:    tplDisputaAbierta({
          variant:       'opener',
          recipientName: openerProfile.full_name ?? 'Usuario',
          spaceName,
          bookingId,
          category:      categoryLabel,
          reason:        reason.trim(),
          disputeId:     dispute.id,
          ctaUrl:        clientUrl,
        }),
      })
    }

    // Email al acusado
    const againstProfile = isGuest ? hostProfile : guestProfile
    if (againstProfile?.email) {
      await sendEmail({
        to:      againstProfile.email,
        subject: `Hay una disputa en tu contra — Reserva ${bookingId.slice(0, 8).toUpperCase()}`,
        html:    tplDisputaAbierta({
          variant:       'respondent',
          recipientName: againstProfile.full_name ?? 'Usuario',
          spaceName,
          bookingId,
          category:      categoryLabel,
          reason:        reason.trim(),
          disputeId:     dispute.id,
          ctaUrl:        clientUrl,
        }),
      })
    }

    // Email al admin
    await sendEmail({
      to:      ADMIN_EMAIL,
      subject: `[DISPUTA] Nueva disputa — ${categoryLabel} — ${bookingId.slice(0, 8).toUpperCase()}`,
      html:    tplDisputaAbierta({
        variant:         'admin',
        recipientName:   'Admin',
        spaceName,
        bookingId,
        category:        categoryLabel,
        reason:          reason.trim(),
        disputeId:       dispute.id,
        ctaUrl:          disputeUrl,
        openerName:      isGuest ? guestProfile?.full_name : hostProfile?.full_name,
        openerEmail:     isGuest ? guestProfile?.email : hostProfile?.email,
        againstName:     isGuest ? hostProfile?.full_name : guestProfile?.full_name,
        againstEmail:    isGuest ? hostProfile?.email : guestProfile?.email,
        openerRole:      isGuest ? 'Cliente' : 'Host',
      }),
    })
  } catch (emailErr) {
    // Emails fallaron pero la disputa fue creada — no retornar error
    console.error('[openDispute] Email error:', emailErr)
  }

  return { disputeId: dispute.id }
}

// ── 1b. DISPUTA ACTIVA DE UN BOOKING ─────────────────────────

export async function getDisputeForBooking(bookingId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('disputes')
    .select('id, status, category, reason, created_at, resolution')
    .eq('booking_id', bookingId)
    .or(`opened_by.eq.${user.id},against.eq.${user.id}`)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return data ?? null
}

// ── 2. MIS DISPUTAS (las partes) ─────────────────────────────

export async function getMyDisputes() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('disputes')
    .select(`
      id, booking_id, category, status, created_at, updated_at,
      reason,
      bookings!booking_id(
        id, event_date,
        spaces!space_id(id, name)
      ),
      opener:profiles!opened_by(id, full_name),
      respondent:profiles!against(id, full_name)
    `)
    .or(`opened_by.eq.${user.id},against.eq.${user.id}`)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[getMyDisputes]', error)
    return []
  }

  return data ?? []
}

// ── 3. DETALLE DE UNA DISPUTA ─────────────────────────────────

export async function getDisputeById(disputeId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('disputes')
    .select(`
      id, booking_id, category, status, reason, evidence_urls,
      admin_notes, resolution, created_at, updated_at, resolved_at,
      bookings!booking_id(
        id, event_date, start_time, end_time,
        spaces!space_id(id, name, address)
      ),
      opener:profiles!opened_by(id, full_name, email),
      respondent:profiles!against(id, full_name, email)
    `)
    .eq('id', disputeId)
    .or(`opened_by.eq.${user.id},against.eq.${user.id}`)
    .single()

  if (error) {
    console.error('[getDisputeById]', error)
    return null
  }

  return data
}

// ── 4. DISPUTAS PARA EL ADMIN ─────────────────────────────────

export async function getAdminDisputes(status?: DisputeStatus) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  // Verificar que es admin con el cliente anon (respeta RLS de profiles)
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') return []

  // Usar service client para bypasear RLS en disputes (la política solo permite
  // ver disputas propias, pero el admin necesita verlas todas)
  const sb = createServiceClient()

  let query = sb
    .from('disputes')
    .select(`
      id, booking_id, category, status, reason, evidence_urls,
      admin_notes, resolution, created_at, updated_at, resolved_at,
      bookings!booking_id(
        id, event_date, start_time, end_time,
        spaces!space_id(id, name)
      ),
      opener:profiles!opened_by(id, full_name, email),
      respondent:profiles!against(id, full_name, email)
    `)
    .order('created_at', { ascending: false })

  if (status) {
    query = query.eq('status', status)
  }

  const { data, error } = await query

  if (error) {
    console.error('[getAdminDisputes]', error)
    return []
  }

  return data ?? []
}

// ── 5. ACTUALIZAR ESTADO (solo admin) ─────────────────────────

export async function updateDisputeStatus(
  disputeId: string,
  status: DisputeStatus,
  resolution?: string,
  adminNotes?: string,
): Promise<{ error?: string; success?: boolean }> {
  // Verificar identidad con el cliente anon primero
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const SUPERADMIN = process.env.SUPERADMIN_EMAIL ?? 'enriquehernandezfondeur@gmail.com'
  if (user.email !== SUPERADMIN) {
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'admin') return { error: 'No autorizado' }
  }

  // Usar service role para bypasear RLS en el UPDATE
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) return { error: 'Configuración de servidor incorrecta' }
  const { createClient: createServiceClient } = await import('@supabase/supabase-js')
  const sb = createServiceClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const updates: Record<string, unknown> = { status }
  if (resolution !== undefined) updates.resolution = resolution
  if (adminNotes !== undefined) updates.admin_notes = adminNotes
  if (['resuelta_cliente', 'resuelta_host', 'cerrada'].includes(status)) {
    updates.resolved_at = new Date().toISOString()
  }

  const { error } = await sb.from('disputes').update(updates).eq('id', disputeId)

  if (error) {
    console.error('[updateDisputeStatus]', error)
    return { error: 'No se pudo actualizar la disputa' }
  }

  return { success: true }
}
