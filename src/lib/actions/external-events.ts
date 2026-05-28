'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email/send'
import { tplEventoDirectoConfirmado, tplEventoDirectoCancelado, tplNuevaSolicitudDirectaHost, tplSolicitudDirectaCliente } from '@/lib/email/templates'
import { createServiceClient } from '@/lib/supabase/service'
import { createBookingEvent, deleteBookingEvent, isGoogleCalendarConfigured } from '@/lib/google-calendar'
import { formatDate } from '@/lib/utils'
import type { ExternalEvent, ExternalEventStatus, ExternalEventSource, ExternalPaymentMethod } from '@/types'
import { resolveHostId } from './_resolveHost'

export interface CreateExternalEventPayload {
  title: string
  event_type?: string
  event_date: string
  start_time?: string
  end_time?: string
  guest_count?: number
  status?: ExternalEventStatus
  total_amount?: number
  notes?: string
  source?: ExternalEventSource
  space_id?: string
  client_id?: string
  client_name?: string   // texto libre — no requiere registro en host_clients
  quote_id?: string
}

export interface UpdateExternalEventPayload extends Partial<CreateExternalEventPayload> {
  id: string
}

export interface AddEventPaymentPayload {
  event_id: string
  amount: number
  payment_method?: ExternalPaymentMethod
  payment_date: string
  notes?: string
  is_deposit?: boolean
  receipt_url?: string
}

// ── Obtener eventos manuales del host ─────────────────────────
export async function getExternalEvents(filters?: {
  status?: ExternalEventStatus
  space_id?: string
  from?: string
  to?: string
}): Promise<ExternalEvent[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { hostId } = await resolveHostId(supabase, user.id)

  let q = supabase
    .from('external_events')
    .select(`
      *,
      client:host_clients(id, full_name, email, phone),
      space:spaces(id, name, city),
      payments:external_event_payments(*)
    `)
    .eq('host_id', hostId)
    .order('event_date', { ascending: false })

  if (filters?.status)   q = q.eq('status', filters.status)
  if (filters?.space_id) q = q.eq('space_id', filters.space_id)
  if (filters?.from)     q = q.gte('event_date', filters.from)
  if (filters?.to)       q = q.lte('event_date', filters.to)

  const { data, error } = await q
  if (error) return []
  return data ?? []
}

// ── Obtener un evento manual por ID ──────────────────────────
export async function getExternalEvent(eventId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { hostId } = await resolveHostId(supabase, user.id)

  const { data, error } = await supabase
    .from('external_events')
    .select(`
      *,
      client:host_clients(id, full_name, email, phone, company),
      space:spaces(id, name, city),
      payments:external_event_payments(*)
    `)
    .eq('id', eventId)
    .eq('host_id', hostId)
    .single()

  if (error) return null
  return data
}

// ── Crear evento manual ───────────────────────────────────────
export async function createExternalEvent(payload: CreateExternalEventPayload) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { hostId } = await resolveHostId(supabase, user.id)

  const { data, error } = await supabase
    .from('external_events')
    .insert({
      host_id:     hostId,
      title:       payload.title.trim(),
      event_type:  payload.event_type?.trim() || null,
      event_date:  payload.event_date,
      start_time:  payload.start_time || null,
      end_time:    payload.end_time || null,
      guest_count: payload.guest_count || null,
      status:      payload.status ?? 'pendiente',
      total_amount:payload.total_amount || null,
      notes:       payload.notes?.trim() || null,
      source:      payload.source ?? 'directo',
      space_id:    payload.space_id || null,
      client_id:   payload.client_id || null,
      client_name: payload.client_name?.trim() || null,
      quote_id:    payload.quote_id || null,
    })
    .select(`
      *,
      client:host_clients(id, full_name, email, phone),
      space:spaces(id, name, city)
    `)
    .single()

  if (error) return { error: error.message }

  revalidatePath('/dashboard/host/eventos')
  revalidatePath('/dashboard/host/calendario')
  return { data }
}

// ── Actualizar evento manual ──────────────────────────────────
export async function updateExternalEvent(payload: UpdateExternalEventPayload) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { hostId } = await resolveHostId(supabase, user.id)
  const { id, ...fields } = payload

  // Leer el evento actual antes de actualizar para detectar cambios de estado
  const { data: current } = await supabase
    .from('external_events')
    .select(`
      status, google_calendar_event_id, confirmed_at,
      title, event_date, start_time, end_time, event_type, guest_count, total_amount,
      client_name,
      client:host_clients(full_name, email),
      space:spaces(id, name, address, sector, city)
    `)
    .eq('id', id)
    .eq('host_id', hostId)
    .single()

  if (!current) return { error: 'Evento no encontrado' }

  const update: Record<string, any> = { updated_at: new Date().toISOString() }

  if (fields.title       !== undefined) update.title        = fields.title.trim()
  if (fields.event_type  !== undefined) update.event_type   = fields.event_type?.trim() || null
  if (fields.event_date  !== undefined) update.event_date   = fields.event_date
  if (fields.start_time  !== undefined) update.start_time   = fields.start_time || null
  if (fields.end_time    !== undefined) update.end_time     = fields.end_time || null
  if (fields.guest_count !== undefined) update.guest_count  = fields.guest_count || null
  if (fields.status      !== undefined) update.status       = fields.status
  if (fields.total_amount!== undefined) update.total_amount = fields.total_amount || null
  if (fields.notes       !== undefined) update.notes        = fields.notes?.trim() || null
  if (fields.source      !== undefined) update.source       = fields.source
  if (fields.space_id    !== undefined) update.space_id     = fields.space_id || null
  if (fields.client_id   !== undefined) update.client_id    = fields.client_id || null
  if (fields.client_name !== undefined) update.client_name  = fields.client_name?.trim() || null

  const { data, error } = await supabase
    .from('external_events')
    .update(update)
    .eq('id', id)
    .eq('host_id', hostId)
    .select()
    .single()

  if (error) return { error: error.message }

  // Detectar cambio de estado para triggers de email + calendario
  const prevStatus = current.status
  const newStatus  = fields.status

  if (newStatus && newStatus !== prevStatus) {
    const client      = (current as any).client as { full_name: string; email: string } | null
    const space       = (current as any).space  as { id: string; name: string; address?: string; sector?: string; city?: string } | null
    const clientName  = client?.full_name || current.client_name || 'Cliente'
    const clientEmail = client?.email ?? null

    // Obtener nombre del host y token de Google Calendar
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, google_calendar_refresh_token, google_calendar_connected')
      .eq('id', hostId)
      .single()

    const hostName = profile?.full_name ?? 'El organizador'

    // ── Confirmado ────────────────────────────────────────────
    if (newStatus === 'confirmado') {
      const firstConfirmation = !current.confirmed_at

      // Email al cliente — solo en la PRIMERA confirmación (evita spam)
      if (clientEmail && firstConfirmation) {
        await sendEmail({
          to:      clientEmail,
          subject: `Tu evento está confirmado — ${formatDate(current.event_date)}`,
          html:    tplEventoDirectoConfirmado({
            clientName:  clientName,
            hostName,
            spaceName:   space?.name ?? '',
            eventTitle:  current.title,
            eventDate:   current.event_date,
            startTime:   current.start_time ?? undefined,
            endTime:     current.end_time   ?? undefined,
            guestCount:  current.guest_count  ?? undefined,
            totalAmount: current.total_amount ?? undefined,
          }),
        }).catch(() => {}) // No bloquear si el email falla
      }

      // Google Calendar sync — crear si no existe ya
      if (isGoogleCalendarConfigured() && profile?.google_calendar_connected && profile?.google_calendar_refresh_token && !current.google_calendar_event_id) {
        const gcalId = await createBookingEvent(
          profile.google_calendar_refresh_token,
          {
            id:                        id,
            event_date:                current.event_date,
            start_time:                current.start_time ?? '12:00:00',
            end_time:                  current.end_time   ?? '23:00:00',
            event_type:                current.event_type,
            guest_count:               current.guest_count ?? 0,
            google_calendar_event_id:  null,
          },
          {
            name:    space?.name    ?? current.title,
            address: space?.address ?? null,
            sector:  space?.sector  ?? null,
            city:    space?.city    ?? null,
          },
          clientName,
        ).catch(() => null)

        if (gcalId) {
          await supabase
            .from('external_events')
            .update({ google_calendar_event_id: gcalId })
            .eq('id', id)
        }
      }

      // Marcar la primera confirmación para no reenviar email después
      if (firstConfirmation) {
        await supabase
          .from('external_events')
          .update({ confirmed_at: new Date().toISOString() })
          .eq('id', id)
      }
    }

    // ── Pendiente (downgrade desde confirmado) ───────────────
    // Limpiar el evento de Google Calendar para que no quede fantasma
    if (newStatus === 'pendiente' && current.google_calendar_event_id) {
      if (isGoogleCalendarConfigured() && profile?.google_calendar_refresh_token) {
        await deleteBookingEvent(profile.google_calendar_refresh_token, current.google_calendar_event_id).catch(() => {})
      }
      await supabase
        .from('external_events')
        .update({ google_calendar_event_id: null })
        .eq('id', id)
    }

    // ── Cancelado ─────────────────────────────────────────────
    if (newStatus === 'cancelado') {
      // Email al cliente
      if (clientEmail) {
        await sendEmail({
          to:      clientEmail,
          subject: `Evento cancelado — ${current.title}`,
          html:    tplEventoDirectoCancelado({
            clientName: clientName,
            hostName,
            eventTitle: current.title,
            eventDate:  current.event_date,
          }),
        }).catch(() => {})
      }

      // Eliminar de Google Calendar
      const gcalId = (data as any)?.google_calendar_event_id ?? current.google_calendar_event_id
      if (isGoogleCalendarConfigured() && profile?.google_calendar_refresh_token && gcalId) {
        await deleteBookingEvent(profile.google_calendar_refresh_token, gcalId).catch(() => {})
        await supabase
          .from('external_events')
          .update({ google_calendar_event_id: null })
          .eq('id', id)
      }
    }
  }

  revalidatePath('/dashboard/host/eventos')
  revalidatePath('/dashboard/host/calendario')
  return { data }
}

// ── Eliminar evento manual ────────────────────────────────────
export async function deleteExternalEvent(eventId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { hostId } = await resolveHostId(supabase, user.id)

  const { error } = await supabase
    .from('external_events')
    .delete()
    .eq('id', eventId)
    .eq('host_id', hostId)

  if (error) return { error: error.message }

  revalidatePath('/dashboard/host/eventos')
  revalidatePath('/dashboard/host/calendario')
  return { success: true }
}

// ── Registrar abono/pago en evento manual ─────────────────────
export async function addEventPayment(payload: AddEventPaymentPayload) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { hostId } = await resolveHostId(supabase, user.id)

  // Verificar que el evento pertenece al host
  const { data: ev } = await supabase
    .from('external_events')
    .select('id')
    .eq('id', payload.event_id)
    .eq('host_id', hostId)
    .single()
  if (!ev) return { error: 'Evento no encontrado' }

  const { data, error } = await supabase
    .from('external_event_payments')
    .insert({
      event_id:       payload.event_id,
      host_id:        hostId,
      amount:         payload.amount,
      payment_method: payload.payment_method ?? 'efectivo',
      payment_date:   payload.payment_date,
      notes:          payload.notes?.trim() || null,
      is_deposit:     payload.is_deposit ?? false,
      receipt_url:    payload.receipt_url || null,
    })
    .select()
    .single()

  if (error) return { error: error.message }

  // paid_amount se actualiza via trigger en DB
  revalidatePath('/dashboard/host/eventos')
  return { data }
}

// ── Eliminar un pago de evento manual ────────────────────────
export async function deleteEventPayment(paymentId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { hostId } = await resolveHostId(supabase, user.id)

  const { error } = await supabase
    .from('external_event_payments')
    .delete()
    .eq('id', paymentId)
    .eq('host_id', hostId)

  if (error) return { error: error.message }

  revalidatePath('/dashboard/host/eventos')
  return { success: true }
}

// ── Obtener perfil público del host por slug ─────────────────
export async function getHostPublicProfile(slug: string) {
  const sb = createServiceClient()
  const { data } = await sb
    .from('profiles')
    .select('id, full_name, avatar_url, slug')
    .eq('slug', slug)
    .eq('role', 'host' as any)
    .single()
  if (!data) return null

  // Obtener espacios activos del host
  const { data: spaces } = await sb
    .from('spaces')
    .select('id, name, category, city, sector')
    .eq('host_id', (data as any).id)
    .eq('is_published', true)
    .eq('is_active', true)
    .order('name')

  return { ...data, spaces: spaces ?? [] }
}

// ── Crear evento desde formulario público ────────────────────
export interface PublicFormPayload {
  hostId:      string
  clientName:  string
  clientEmail: string
  clientPhone?: string
  eventDate:   string
  eventType?:  string
  guestCount?: number
  message?:    string
  spaceId?:    string
}

export async function createFromPublicForm(payload: PublicFormPayload) {
  const sb = createServiceClient()

  // Validar que el host existe
  const { data: host } = await sb
    .from('profiles')
    .select('id, full_name, email')
    .eq('id', payload.hostId)
    .eq('role', 'host' as any)
    .single()
  if (!host) return { error: 'Organizador no encontrado' }

  // Si el cliente ya existe en el CRM del host, vincular
  const { data: existingClient } = await sb
    .from('host_clients')
    .select('id')
    .eq('host_id', payload.hostId)
    .eq('email', payload.clientEmail)
    .single()

  let clientId: string | null = existingClient?.id ?? null

  // Si no existe, crear en el CRM del host
  if (!clientId && payload.clientEmail) {
    const { data: newClient } = await sb
      .from('host_clients')
      .insert({
        host_id:   payload.hostId,
        full_name: payload.clientName.trim(),
        email:     payload.clientEmail.trim(),
        phone:     payload.clientPhone?.trim() || null,
        source:    'directo',
      })
      .select('id')
      .single()
    clientId = newClient?.id ?? null
  }

  // Crear el evento manual
  const { data: event, error } = await sb
    .from('external_events')
    .insert({
      host_id:    payload.hostId,
      title:      `Solicitud de ${payload.clientName.trim()}`,
      event_type: payload.eventType?.trim() || null,
      event_date: payload.eventDate,
      guest_count:payload.guestCount || null,
      status:     'pendiente',
      source:     'directo',
      notes:      payload.message?.trim() || null,
      client_id:  clientId,
      client_name:payload.clientName.trim(),
      space_id:   payload.spaceId || null,
    })
    .select('id')
    .single()

  if (error) return { error: 'No se pudo registrar la solicitud' }

  const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://espot.do'

  // Email al host
  if (host.email) {
    await sendEmail({
      to:      host.email,
      subject: `Nueva solicitud directa — ${payload.clientName}`,
      html:    tplNuevaSolicitudDirectaHost({
        hostName:    host.full_name ?? 'Organizador',
        clientName:  payload.clientName,
        clientEmail: payload.clientEmail || undefined,
        clientPhone: payload.clientPhone || undefined,
        eventDate:   payload.eventDate,
        eventType:   payload.eventType || undefined,
        guestCount:  payload.guestCount || undefined,
        message:     payload.message || undefined,
        formUrl:     SITE,
      }),
    }).catch(() => {})
  }

  // Email al cliente
  if (payload.clientEmail) {
    await sendEmail({
      to:      payload.clientEmail,
      subject: `Tu solicitud fue recibida — ${host.full_name}`,
      html:    tplSolicitudDirectaCliente({
        clientName: payload.clientName,
        hostName:   host.full_name ?? 'El organizador',
        eventDate:  payload.eventDate,
        eventType:  payload.eventType || undefined,
      }),
    }).catch(() => {})
  }

  revalidatePath('/dashboard/host/eventos')
  return { success: true, eventId: event.id }
}

// ── Convertir cotización a evento manual ──────────────────────
export async function convertQuoteToEvent(quoteId: string, eventData: CreateExternalEventPayload) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  // Crear el evento
  const result = await createExternalEvent({ ...eventData, quote_id: quoteId })
  if ('error' in result) return result

  // Marcar la cotización como convertida
  await supabase
    .from('quotes')
    .update({ converted_to_event: result.data.id })
    .eq('id', quoteId)

  revalidatePath('/dashboard/host/cotizaciones')
  return result
}

// ── Datos públicos de evento para link de pago ────────────────
export async function getExternalEventForPayment(eventId: string) {
  const sb = createServiceClient()
  const { data } = await sb
    .from('external_events')
    .select(`
      id, title, event_date, event_type, guest_count,
      total_amount, paid_amount, status,
      client_name,
      host:profiles!host_id(id, full_name, avatar_url),
      space:spaces(name, city),
      bank:host_bank_accounts(account_holder, bank_name, account_type, account_number, cedula_or_rnc)
    `)
    .eq('id', eventId)
    .single()
  return data ?? null
}

// ── Cliente notifica que realizó transferencia ────────────────
export async function notifyPaymentMade(eventId: string, clientNote?: string) {
  const sb = createServiceClient()

  const { data: event } = await sb
    .from('external_events')
    .select('id, title, event_date, client_name, host_id, host:profiles!host_id(email, full_name)')
    .eq('id', eventId)
    .single()

  if (!event) return { error: 'Evento no encontrado' }

  const host = (event as any).host
  if (host?.email) {
    const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://espot.do'
    await sendEmail({
      to:      host.email,
      subject: `Pago notificado — ${(event as any).client_name ?? (event as any).title}`,
      html: `
        <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px">
          <h2 style="color:#0F1623;margin-bottom:8px">Notificación de pago recibida</h2>
          <p style="color:#374151">
            <strong>${(event as any).client_name ?? 'Tu cliente'}</strong>
            indica que realizó una transferencia para el evento
            <strong>${(event as any).title}</strong>
            (${(event as any).event_date}).
          </p>
          ${clientNote ? `<p style="background:#F3F4F6;padding:12px 16px;border-radius:8px;color:#374151">"${clientNote}"</p>` : ''}
          <a href="${SITE}/dashboard/host/eventos/${eventId}"
            style="display:inline-block;margin-top:16px;background:#35C493;color:#fff;padding:12px 24px;border-radius:50px;text-decoration:none;font-weight:700">
            Ver evento →
          </a>
        </div>`,
    }).catch(() => {})
  }

  return { success: true }
}

