'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { HostClient, ClientSource } from '@/types'

export interface CreateClientPayload {
  full_name: string
  email?: string
  phone?: string
  company?: string
  notes?: string
  tags?: string[]
  source?: ClientSource
}

export interface UpdateClientPayload extends Partial<CreateClientPayload> {
  id: string
}

// ── Obtener todos los clientes del host ───────────────────────
export async function getClients(): Promise<HostClient[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('host_clients')
    .select('*')
    .eq('host_id', user.id)
    .order('full_name')

  if (error) return []
  return data ?? []
}

// ── Obtener cliente individual con historial ──────────────────
export async function getClientWithHistory(clientId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const [{ data: client }, { data: events }, { data: bookings }] = await Promise.all([
    supabase
      .from('host_clients')
      .select('*')
      .eq('id', clientId)
      .eq('host_id', user.id)
      .single(),
    supabase
      .from('external_events')
      .select('id, title, event_date, status, total_amount, paid_amount, event_type')
      .eq('client_id', clientId)
      .eq('host_id', user.id)
      .order('event_date', { ascending: false }),
    supabase
      .from('bookings')
      .select('id, event_date, event_type, total_amount, status')
      .eq('client_id', clientId)
      .order('event_date', { ascending: false }),
  ])

  if (!client) return null

  const totalRevenue =
    (events ?? []).reduce((sum: number, e: any) => sum + Number(e.total_amount ?? 0), 0) +
    (bookings ?? []).reduce((sum: number, b: any) => sum + Number(b.total_amount ?? 0), 0)

  return {
    ...client,
    total_events: (events?.length ?? 0) + (bookings?.length ?? 0),
    total_revenue: totalRevenue,
    events: events ?? [],
    bookings: bookings ?? [],
  }
}

// ── Buscar clientes por nombre o email (para autocomplete) ────
export async function searchClients(query: string): Promise<HostClient[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const q = query.trim().toLowerCase()
  if (!q) return []

  const { data } = await supabase
    .from('host_clients')
    .select('*')
    .eq('host_id', user.id)
    .or(`full_name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%`)
    .limit(10)

  return data ?? []
}

// ── Crear cliente ─────────────────────────────────────────────
export async function createClient_(payload: CreateClientPayload) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  // Verificar si ya existe un cliente con ese email para este host
  if (payload.email) {
    const { data: existing } = await supabase
      .from('host_clients')
      .select('id, full_name')
      .eq('host_id', user.id)
      .eq('email', payload.email)
      .single()
    if (existing) return { error: `Ya existe un cliente con ese email: ${existing.full_name}` }
  }

  const { data, error } = await supabase
    .from('host_clients')
    .insert({
      host_id: user.id,
      full_name: payload.full_name.trim(),
      email: payload.email?.trim() || null,
      phone: payload.phone?.trim() || null,
      company: payload.company?.trim() || null,
      notes: payload.notes?.trim() || null,
      tags: payload.tags ?? [],
      source: payload.source ?? 'manual',
    })
    .select()
    .single()

  if (error) return { error: error.message }

  revalidatePath('/dashboard/host/clientes')
  return { data }
}

// ── Actualizar cliente ────────────────────────────────────────
export async function updateClient(payload: UpdateClientPayload) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { id, ...fields } = payload
  const update: Record<string, any> = { updated_at: new Date().toISOString() }

  if (fields.full_name !== undefined) update.full_name = fields.full_name.trim()
  if (fields.email     !== undefined) update.email     = fields.email?.trim() || null
  if (fields.phone     !== undefined) update.phone     = fields.phone?.trim() || null
  if (fields.company   !== undefined) update.company   = fields.company?.trim() || null
  if (fields.notes     !== undefined) update.notes     = fields.notes?.trim() || null
  if (fields.tags      !== undefined) update.tags      = fields.tags
  if (fields.source    !== undefined) update.source    = fields.source

  const { data, error } = await supabase
    .from('host_clients')
    .update(update)
    .eq('id', id)
    .eq('host_id', user.id)
    .select()
    .single()

  if (error) return { error: error.message }

  revalidatePath('/dashboard/host/clientes')
  revalidatePath('/dashboard/host/eventos')
  return { data }
}

// ── Eliminar cliente ──────────────────────────────────────────
export async function deleteClient(clientId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { error } = await supabase
    .from('host_clients')
    .delete()
    .eq('id', clientId)
    .eq('host_id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/dashboard/host/clientes')
  revalidatePath('/dashboard/host/eventos')
  return { success: true }
}
