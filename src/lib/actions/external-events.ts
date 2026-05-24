'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { ExternalEvent, ExternalEventStatus, ExternalEventSource, ExternalPaymentMethod } from '@/types'

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

  let q = supabase
    .from('external_events')
    .select(`
      *,
      client:host_clients(id, full_name, email, phone),
      space:spaces(id, name, city),
      payments:external_event_payments(*)
    `)
    .eq('host_id', user.id)
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

  const { data, error } = await supabase
    .from('external_events')
    .select(`
      *,
      client:host_clients(id, full_name, email, phone, company),
      space:spaces(id, name, city),
      payments:external_event_payments(*)
    `)
    .eq('id', eventId)
    .eq('host_id', user.id)
    .single()

  if (error) return null
  return data
}

// ── Crear evento manual ───────────────────────────────────────
export async function createExternalEvent(payload: CreateExternalEventPayload) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { data, error } = await supabase
    .from('external_events')
    .insert({
      host_id:     user.id,
      title:       payload.title.trim(),
      event_type:  payload.event_type?.trim() || null,
      event_date:  payload.event_date,
      start_time:  payload.start_time || null,
      end_time:    payload.end_time || null,
      guest_count: payload.guest_count || null,
      status:      payload.status ?? 'tentativo',
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

  const { id, ...fields } = payload
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
    .eq('host_id', user.id)
    .select()
    .single()

  if (error) return { error: error.message }

  revalidatePath('/dashboard/host/eventos')
  revalidatePath('/dashboard/host/calendario')
  return { data }
}

// ── Eliminar evento manual ────────────────────────────────────
export async function deleteExternalEvent(eventId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { error } = await supabase
    .from('external_events')
    .delete()
    .eq('id', eventId)
    .eq('host_id', user.id)

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

  // Verificar que el evento pertenece al host
  const { data: ev } = await supabase
    .from('external_events')
    .select('id')
    .eq('id', payload.event_id)
    .eq('host_id', user.id)
    .single()
  if (!ev) return { error: 'Evento no encontrado' }

  const { data, error } = await supabase
    .from('external_event_payments')
    .insert({
      event_id:       payload.event_id,
      host_id:        user.id,
      amount:         payload.amount,
      payment_method: payload.payment_method ?? 'efectivo',
      payment_date:   payload.payment_date,
      notes:          payload.notes?.trim() || null,
      is_deposit:     payload.is_deposit ?? false,
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

  const { error } = await supabase
    .from('external_event_payments')
    .delete()
    .eq('id', paymentId)
    .eq('host_id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/dashboard/host/eventos')
  return { success: true }
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
