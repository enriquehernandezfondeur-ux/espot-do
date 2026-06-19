'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { resolveHostAccess } from './_resolveHost'
import { requirePro } from './subscription'
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

// ── Obtener cliente individual con historial ──────────────────
export async function getClientWithHistory(clientId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { hostId, db } = await resolveHostAccess(supabase, user.id)

  // Pre-cargar IDs de espacios del host para filtrar bookings por pertenencia
  // (bookings.host_id no existe, la pertenencia se valida via space.host_id)
  const { data: spaces } = await db
    .from('spaces')
    .select('id')
    .eq('host_id', hostId)
  const spaceIds = (spaces ?? []).map((s: any) => s.id)

  const [{ data: client }, { data: events }, { data: bookings }] = await Promise.all([
    db
      .from('host_clients')
      .select('*')
      .eq('id', clientId)
      .eq('host_id', hostId)
      .single(),
    db
      .from('external_events')
      .select('id, title, event_date, status, total_amount, paid_amount, event_type')
      .eq('client_id', clientId)
      .eq('host_id', hostId)
      .order('event_date', { ascending: false }),
    spaceIds.length === 0
      ? Promise.resolve({ data: [] })
      : db
          .from('bookings')
          .select('id, event_date, event_type, total_amount, status')
          .eq('client_id', clientId)
          .in('space_id', spaceIds)
          .order('event_date', { ascending: false }),
  ])

  if (!client) return null

  // Solo cuenta como facturado lo concretado (no canceladas/pendientes/rechazadas)
  const totalRevenue =
    (events ?? [])
      .filter((e: any) => ['confirmado', 'en_curso', 'completado'].includes(e.status))
      .reduce((sum: number, e: any) => sum + Number(e.total_amount ?? 0), 0) +
    (bookings ?? [])
      .filter((b: any) => ['confirmed', 'completed'].includes(b.status))
      .reduce((sum: number, b: any) => sum + Number(b.total_amount ?? 0), 0)

  return {
    ...client,
    total_events: (events?.length ?? 0) + (bookings?.length ?? 0),
    total_revenue: totalRevenue,
    events: events ?? [],
    bookings: bookings ?? [],
  }
}

// ── Vista unificada: host_clients + guests de Espot sin duplicar ──
export async function getUnifiedClients() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  const { hostId, db } = await resolveHostAccess(supabase, user.id)

  const [{ data: directClients }, { data: spaces }] = await Promise.all([
    db.from('host_clients').select('*').eq('host_id', hostId).order('full_name'),
    db.from('spaces').select('id').eq('host_id', hostId),
  ])

  const direct = (directClients ?? []) as HostClient[]
  const spaceIds = (spaces ?? []).map((s: any) => s.id)

  if (!spaceIds.length) return direct

  const { data: bookings } = await db
    .from('bookings')
    .select('guest_id, guest:profiles!guest_id(id, full_name, email, phone)')
    .in('space_id', spaceIds)
    .not('guest_id', 'is', null)

  const directEmails = new Set(direct.map((c: any) => c.email?.toLowerCase()).filter(Boolean))
  const seenGuestIds = new Set<string>()
  const espotGuests: HostClient[] = []

  for (const b of bookings ?? []) {
    const g = (b as any).guest
    if (!g || seenGuestIds.has(g.id)) continue
    seenGuestIds.add(g.id)
    if (g.email && directEmails.has(g.email.toLowerCase())) continue
    espotGuests.push({
      id:        g.id,
      host_id:   hostId,
      full_name: g.full_name ?? 'Cliente Espot',
      email:     g.email ?? null,
      phone:     g.phone ?? null,
      company:   null,
      notes:     null,
      tags:      [],
      source:    'espot' as ClientSource,
      created_at: '',
    } as any)
  }

  return [...direct, ...espotGuests.sort((a, b) => a.full_name.localeCompare(b.full_name))]
}

// ── Historial de un guest de Espot (por profile id) ───────────
export async function getEspotGuestHistory(profileId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { hostId, db } = await resolveHostAccess(supabase, user.id)

  const { data: spaces } = await db.from('spaces').select('id').eq('host_id', hostId)
  const spaceIds = (spaces ?? []).map((s: any) => s.id)
  if (!spaceIds.length) return null

  const { data: bookings } = await db
    .from('bookings')
    .select('id, event_date, event_type, total_amount, status')
    .eq('guest_id', profileId)
    .in('space_id', spaceIds)
    .order('event_date', { ascending: false })

  const b = bookings ?? []
  const totalRevenue = b
    .filter((bk: any) => ['confirmed', 'completed'].includes(bk.status))
    .reduce((s: number, bk: any) => s + Number(bk.total_amount ?? 0), 0)

  return {
    total_events: b.length,
    total_revenue: totalRevenue,
    events: [],
    bookings: b,
  }
}

// ── Buscar clientes por nombre o email (para autocomplete) ────
export async function searchClients(query: string): Promise<HostClient[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  const { hostId, db } = await resolveHostAccess(supabase, user.id)

  const q = query.trim().toLowerCase()
  if (!q) return []

  const { data } = await db
    .from('host_clients')
    .select('*')
    .eq('host_id', hostId)
    .or(`full_name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%`)
    .limit(10)

  return data ?? []
}

// ── Crear cliente ─────────────────────────────────────────────
export async function createClient_(payload: CreateClientPayload) {
  const gate = await requirePro()
  if (!gate.ok) return { error: gate.error }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }
  const { hostId, db, canManageClients } = await resolveHostAccess(supabase, user.id)
  if (!canManageClients) return { error: 'No tienes permiso para gestionar clientes' }

  // Verificar si ya existe un cliente con ese email para este host
  if (payload.email) {
    const { data: existing } = await db
      .from('host_clients')
      .select('id, full_name')
      .eq('host_id', hostId)
      .eq('email', payload.email)
      .single()
    if (existing) return { error: `Ya existe un cliente con ese email: ${existing.full_name}` }
  }

  const { data, error } = await db
    .from('host_clients')
    .insert({
      host_id: hostId,
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
  const gate = await requirePro()
  if (!gate.ok) return { error: gate.error }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }
  const { hostId, db, canManageClients } = await resolveHostAccess(supabase, user.id)
  if (!canManageClients) return { error: 'No tienes permiso para gestionar clientes' }

  const { id, ...fields } = payload
  const update: Record<string, any> = { updated_at: new Date().toISOString() }

  if (fields.full_name !== undefined) update.full_name = fields.full_name.trim()
  if (fields.email     !== undefined) update.email     = fields.email?.trim() || null
  if (fields.phone     !== undefined) update.phone     = fields.phone?.trim() || null
  if (fields.company   !== undefined) update.company   = fields.company?.trim() || null
  if (fields.notes     !== undefined) update.notes     = fields.notes?.trim() || null
  if (fields.tags      !== undefined) update.tags      = fields.tags
  if (fields.source    !== undefined) update.source    = fields.source

  const { data, error } = await db
    .from('host_clients')
    .update(update)
    .eq('id', id)
    .eq('host_id', hostId)
    .select()
    .single()

  if (error) return { error: error.message }

  revalidatePath('/dashboard/host/clientes')
  revalidatePath('/dashboard/host/eventos')
  return { data }
}

// ── Eliminar cliente ──────────────────────────────────────────
export async function deleteClient(clientId: string) {
  const gate = await requirePro()
  if (!gate.ok) return { error: gate.error }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }
  const { hostId, db, canManageClients } = await resolveHostAccess(supabase, user.id)
  if (!canManageClients) return { error: 'No tienes permiso para gestionar clientes' }

  const { error } = await db
    .from('host_clients')
    .delete()
    .eq('id', clientId)
    .eq('host_id', hostId)

  if (error) return { error: error.message }

  revalidatePath('/dashboard/host/clientes')
  revalidatePath('/dashboard/host/eventos')
  return { success: true }
}
