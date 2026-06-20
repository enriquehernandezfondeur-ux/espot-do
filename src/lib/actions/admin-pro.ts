'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { resolvePlan } from '@/lib/plans'
import type { SupabaseClient } from '@supabase/supabase-js'

// ============================================================
// Módulo administrativo "Espot Pro".
// Acciones de LECTURA del listado de propietarios + sus suscripciones.
// Las acciones de gestión (activar/cancelar/etc.) viven en subscription.ts.
// Todas gateadas por requireAdmin (servicio-rol, bypass RLS).
// ============================================================

const SUPERADMIN_EMAIL = process.env.SUPERADMIN_EMAIL ?? 'enriquehernandezfondeur@gmail.com'
const LIVE = ['trialing', 'active', 'pending_payment', 'past_due', 'suspended']
const DAY_MS = 86_400_000

/** Mismo criterio que requireAdmin() de admin.ts. Devuelve el cliente service-role + el admin. */
async function requireAdmin(): Promise<{ svc: SupabaseClient; adminId: string } | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  if (user.email !== SUPERADMIN_EMAIL) {
    const { data } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
    if (data?.role !== 'admin') return null
  }
  try { return { svc: createServiceClient(), adminId: user.id } } catch { return null }
}

export interface ProOwnerSub {
  status: string
  activation_type: string | null
  payment_provider: string | null
  current_period_start: string | null
  current_period_end: string | null
  cancel_at_period_end: boolean | null
  started_at: string | null
  cancelled_at: string | null
}

export interface ProOwnerRow {
  id: string
  full_name: string | null
  email: string | null
  phone: string | null
  created_at: string | null
  spacesCount: number
  publishedCount: number
  externalCount: number
  plan: 'free' | 'pro'
  proTrialUsed: boolean
  sub: ProOwnerSub | null
  daysLeft: number | null
}

export interface ProStats {
  total: number
  normal: number
  trialsActive: number
  proActive: number
  pendingPayment: number
  expiringSoon: number   // ≤7 días
  expired: number
  cancelled: number
  suspended: number
  // Ingresos — solo Azul pagado cuenta; manual/prueba/pendiente NO.
  mrr: number            // ingreso mensual estimado (Pro activos pagados por Azul)
  payingPro: number      // Pro activos pagados (Azul)
  manualPro: number      // Pro activos por activación manual gratuita
}

export interface ProOwnersResult {
  owners: ProOwnerRow[]
  stats: ProStats
}

export async function getProOwners(): Promise<ProOwnersResult | null> {
  const auth = await requireAdmin()
  if (!auth) return null
  const { svc } = auth

  const nowISO = new Date().toISOString()
  const nowMs = Date.now()

  const [{ data: hosts }, { data: subs }, { data: spaces }, { data: external }] = await Promise.all([
    svc.from('profiles')
      .select('id, full_name, email, phone, created_at, pro_trial_used')
      .eq('role', 'host' as any)
      .order('created_at', { ascending: false }),
    svc.from('host_subscriptions')
      .select('host_id, status, activation_type, payment_provider, current_period_start, current_period_end, cancel_at_period_end, started_at, cancelled_at, created_at')
      .in('status', LIVE)
      .order('created_at', { ascending: false }),
    svc.from('spaces').select('host_id, is_published'),
    svc.from('external_events').select('host_id'),
  ])

  const externalByHost = new Map<string, number>()
  for (const e of (external ?? []) as any[]) externalByHost.set(e.host_id, (externalByHost.get(e.host_id) ?? 0) + 1)

  // Sub viva más reciente por host (la query ya viene ordenada desc).
  const subByHost = new Map<string, ProOwnerSub>()
  for (const s of (subs ?? []) as any[]) {
    if (!subByHost.has(s.host_id)) {
      subByHost.set(s.host_id, {
        status: s.status,
        activation_type: s.activation_type,
        payment_provider: s.payment_provider,
        current_period_start: s.current_period_start,
        current_period_end: s.current_period_end,
        cancel_at_period_end: s.cancel_at_period_end,
        started_at: s.started_at,
        cancelled_at: s.cancelled_at,
      })
    }
  }

  // Conteo de espacios por host.
  const spaceCount = new Map<string, { total: number; published: number }>()
  for (const sp of (spaces ?? []) as any[]) {
    const c = spaceCount.get(sp.host_id) ?? { total: 0, published: 0 }
    c.total += 1
    if (sp.is_published) c.published += 1
    spaceCount.set(sp.host_id, c)
  }

  const owners: ProOwnerRow[] = (hosts ?? []).map((h: any) => {
    const sub = subByHost.get(h.id) ?? null
    const plan = resolvePlan(sub, nowISO)
    let daysLeft: number | null = null
    if (plan === 'pro' && sub?.current_period_end) {
      daysLeft = Math.max(0, Math.ceil((new Date(sub.current_period_end).getTime() - nowMs) / DAY_MS))
    }
    const counts = spaceCount.get(h.id) ?? { total: 0, published: 0 }
    return {
      id: h.id,
      full_name: h.full_name,
      email: h.email,
      phone: h.phone,
      created_at: h.created_at,
      spacesCount: counts.total,
      publishedCount: counts.published,
      externalCount: externalByHost.get(h.id) ?? 0,
      plan,
      proTrialUsed: !!h.pro_trial_used,
      sub,
      daysLeft,
    }
  })

  const PRICE = 499
  const payingPro = owners.filter(o => o.plan === 'pro' && o.sub?.status === 'active' && o.sub?.activation_type === 'azul').length
  const manualPro = owners.filter(o => o.plan === 'pro' && o.sub?.status === 'active' && o.sub?.activation_type !== 'azul').length
  const stats: ProStats = {
    total: owners.length,
    normal: owners.filter(o => o.plan === 'free').length,
    trialsActive: owners.filter(o => o.plan === 'pro' && o.sub?.status === 'trialing').length,
    proActive: owners.filter(o => o.plan === 'pro' && o.sub?.status === 'active').length,
    pendingPayment: owners.filter(o => o.sub?.status === 'pending_payment').length,
    expiringSoon: owners.filter(o => o.plan === 'pro' && o.daysLeft != null && o.daysLeft <= 7).length,
    expired: owners.filter(o => o.sub && o.plan === 'free' && (o.sub.status === 'past_due' || o.sub.status === 'expired')).length,
    cancelled: owners.filter(o => o.sub?.status === 'cancelled').length,
    suspended: owners.filter(o => o.sub?.status === 'suspended').length,
    mrr: payingPro * PRICE,
    payingPro,
    manualPro,
  }

  return { owners, stats }
}

// ── Marketing: registrar una comunicación a un segmento ──────
// Deja constancia (en subscription_notifications) de que se contactó a estos
// propietarios. NO envía nada (la integración email/WhatsApp llega después);
// sirve para tracking de campañas y para "ver última comunicación".
export async function logCommunication(
  hostIds: string[], channel: 'email' | 'whatsapp', label: string,
): Promise<{ ok: true; count: number } | { error: string }> {
  const auth = await requireAdmin()
  if (!auth) return { error: 'No autorizado' }
  const ids = (hostIds ?? []).filter(Boolean).slice(0, 2000)
  if (!ids.length) return { error: 'No hay propietarios en el segmento.' }
  const clean = (label || 'campaña').trim().slice(0, 80)
  if (channel !== 'email' && channel !== 'whatsapp') return { error: 'Canal inválido.' }

  const nowISO = new Date().toISOString()
  // period_key con timestamp evita el choque del índice único (cada registro es uno nuevo).
  const rows = ids.map(host_id => ({
    host_id, subscription_id: null, event_type: `campaña: ${clean}`,
    channel, status: 'sent', period_key: nowISO, sent_at: nowISO,
  }))
  const { error } = await auth.svc.from('subscription_notifications').insert(rows)
  if (error) return { error: error.message }
  revalidatePath('/admin/pro')
  return { ok: true, count: ids.length }
}

// ── Configuración del módulo ─────────────────────────────────
const PRO_CONFIG_KEYS = ['pro_auto_trial_enabled', 'pro_trial_days', 'pro_price_dop'] as const
export type ProConfigKey = typeof PRO_CONFIG_KEYS[number]
export interface ProConfig { autoTrialEnabled: boolean; trialDays: number; priceDop: number }

export async function getProConfig(): Promise<ProConfig | null> {
  const auth = await requireAdmin()
  if (!auth) return null
  const { data } = await auth.svc.from('marketplace_config').select('key, value').in('key', PRO_CONFIG_KEYS as unknown as string[])
  const m = new Map((data ?? []).map((c: any) => [c.key, c.value]))
  return {
    autoTrialEnabled: m.get('pro_auto_trial_enabled') === 'true',
    trialDays: Number(m.get('pro_trial_days')) || 30,
    priceDop:  Number(m.get('pro_price_dop')) || 499,
  }
}

export async function setProConfig(key: ProConfigKey, value: string): Promise<{ ok: true } | { error: string }> {
  if (!PRO_CONFIG_KEYS.includes(key)) return { error: 'Clave no permitida' }
  const auth = await requireAdmin()
  if (!auth) return { error: 'No autorizado' }
  if (key === 'pro_trial_days' || key === 'pro_price_dop') {
    const n = Number(value)
    if (!Number.isFinite(n) || n < 1) return { error: 'Valor numérico inválido.' }
  }
  if (key === 'pro_auto_trial_enabled' && value !== 'true' && value !== 'false') return { error: 'Valor inválido.' }
  const { error } = await auth.svc.from('marketplace_config').update({ value }).eq('key', key)
  if (error) return { error: error.message }
  revalidatePath('/admin/pro')
  return { ok: true }
}

// ── Detalle de un propietario ────────────────────────────────
export interface ProAuditEntry {
  id: string; action: string; old_status: string | null; new_status: string | null
  note: string | null; admin_id: string | null; created_at: string
}
export interface ProNotifEntry {
  id: string; event_type: string; channel: string; status: string
  error: string | null; sent_at: string | null; created_at: string
}
export interface ProOwnerDetail {
  profile: any
  sub: (ProOwnerSub & { id: string; price_amount: number | null; admin_note: string | null }) | null
  plan: 'free' | 'pro'
  daysLeft: number | null
  spaces: { id: string; name: string; is_published: boolean }[]
  audit: ProAuditEntry[]
  notifications: ProNotifEntry[]
  bookingsCount: number
  externalCount: number
  lastActivity: string | null
}

export async function getProOwnerDetail(hostId: string): Promise<ProOwnerDetail | null> {
  const auth = await requireAdmin()
  if (!auth) return null
  const { svc } = auth
  const nowISO = new Date().toISOString()

  const [{ data: profile }, { data: sub }, { data: spaces }, { data: audit }, { data: notifs }, spaceIdsRes] = await Promise.all([
    svc.from('profiles').select('*').eq('id', hostId).maybeSingle(),
    svc.from('host_subscriptions')
      .select('id, status, activation_type, payment_provider, current_period_start, current_period_end, cancel_at_period_end, started_at, cancelled_at, price_amount, admin_note')
      .eq('host_id', hostId).in('status', LIVE).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    svc.from('spaces').select('id, name, is_published').eq('host_id', hostId).order('created_at', { ascending: false }),
    svc.from('subscription_audit_log').select('id, action, old_status, new_status, note, admin_id, created_at').eq('host_id', hostId).order('created_at', { ascending: false }).limit(50),
    svc.from('subscription_notifications').select('id, event_type, channel, status, error, sent_at, created_at').eq('host_id', hostId).order('created_at', { ascending: false }).limit(50),
    svc.from('spaces').select('id').eq('host_id', hostId),
  ])

  const spaceIds = (spaceIdsRes.data ?? []).map((s: any) => s.id)
  let bookingsCount = 0, externalCount = 0, lastActivity: string | null = profile?.created_at ?? null
  if (spaceIds.length) {
    const [{ count: bc, data: lastBk }, { count: ec, data: lastEv }] = await Promise.all([
      svc.from('bookings').select('updated_at', { count: 'exact' }).in('space_id', spaceIds).order('updated_at', { ascending: false }).limit(1),
      svc.from('external_events').select('updated_at', { count: 'exact' }).eq('host_id', hostId).order('updated_at', { ascending: false }).limit(1),
    ])
    bookingsCount = bc ?? 0; externalCount = ec ?? 0
    const cands = [lastActivity, (lastBk as any)?.[0]?.updated_at, (lastEv as any)?.[0]?.updated_at].filter(Boolean) as string[]
    if (cands.length) lastActivity = cands.sort().reverse()[0]
  }

  const plan = resolvePlan(sub, nowISO)
  let daysLeft: number | null = null
  if (plan === 'pro' && sub?.current_period_end) {
    daysLeft = Math.max(0, Math.ceil((new Date(sub.current_period_end).getTime() - Date.now()) / DAY_MS))
  }

  return {
    profile, sub: sub as any, plan, daysLeft,
    spaces: (spaces ?? []) as any,
    audit: (audit ?? []) as any,
    notifications: (notifs ?? []) as any,
    bookingsCount, externalCount, lastActivity,
  }
}

// ── Acción administrativa integral (con auditoría) ───────────
export type ProAction =
  | 'activar_prueba' | 'activar_pro' | 'extender' | 'renovar_30' | 'cambiar_fin'
  | 'marcar_pagado' | 'marcar_pendiente' | 'cancelar_fin_periodo' | 'cancelar_ahora'
  | 'suspender' | 'restaurar' | 'volver_normal' | 'nota'

export interface ProActionParams {
  days?: number
  endDate?: string            // 'YYYY-MM-DD'
  note?: string
  activationType?: 'manual' | 'azul'
}

function clampDays(d?: number): number { return Math.min(3650, Math.max(1, Math.round(d || 30))) }

export async function adminProAction(
  hostId: string, action: ProAction, params: ProActionParams = {},
): Promise<{ ok: true } | { error: string }> {
  const auth = await requireAdmin()
  if (!auth) return { error: 'No autorizado' }
  const { svc, adminId } = auth

  const now = Date.now()
  const nowISO = new Date(now).toISOString()

  // Suscripción viva actual
  const { data: existing } = await svc.from('host_subscriptions')
    .select('id, status, current_period_end, activation_type, cancel_at_period_end')
    .eq('host_id', hostId).in('status', LIVE).order('created_at', { ascending: false }).limit(1).maybeSingle()

  const oldStatus: string | null = existing?.status ?? null
  const vigenteFin = existing?.current_period_end ? new Date(existing.current_period_end).getTime() : 0
  const baseMs = vigenteFin > now ? vigenteFin : now

  // Construye el "siguiente" estado de la suscripción (campos a escribir).
  let next: Record<string, any> = { updated_at: nowISO }
  let needsExisting = true          // la acción requiere una sub viva
  let endForPlan: string | null = existing?.current_period_end ?? null
  let statusForPlan = oldStatus

  const periodFrom = (fromMs: number, days: number) => new Date(fromMs + clampDays(days) * DAY_MS).toISOString()

  switch (action) {
    case 'activar_prueba': {
      needsExisting = false
      const end = periodFrom(now, params.days ?? 30)
      next = { ...next, status: 'trialing', activation_type: 'trial', payment_provider: 'manual', activated_by: adminId, current_period_start: nowISO, current_period_end: end, cancel_at_period_end: false }
      statusForPlan = 'trialing'; endForPlan = end
      break
    }
    case 'activar_pro': {
      needsExisting = false
      const end = periodFrom(now, params.days ?? 30)
      next = { ...next, status: 'active', activation_type: params.activationType ?? 'manual', payment_provider: params.activationType === 'azul' ? 'azul' : 'manual', activated_by: adminId, current_period_start: nowISO, current_period_end: end, cancel_at_period_end: false }
      statusForPlan = 'active'; endForPlan = end
      break
    }
    case 'extender':
    case 'renovar_30': {
      const days = action === 'renovar_30' ? 30 : (params.days ?? 30)
      const end = periodFrom(baseMs, days)
      const st = action === 'renovar_30' ? 'active' : (oldStatus === 'trialing' ? 'trialing' : 'active')
      next = { ...next, status: st, current_period_end: end, cancel_at_period_end: false }
      statusForPlan = st; endForPlan = end
      break
    }
    case 'cambiar_fin': {
      if (!params.endDate) return { error: 'Indica la fecha de vencimiento.' }
      const ms = new Date(params.endDate + 'T12:00').getTime()
      if (isNaN(ms)) return { error: 'Fecha inválida.' }
      if (ms <= now) return { error: 'La fecha de fin debe ser futura.' }
      if (ms > now + 3650 * DAY_MS) return { error: 'La fecha de fin no puede superar 10 años.' }
      const end = new Date(ms).toISOString()
      next = { ...next, current_period_end: end }
      endForPlan = end
      break
    }
    case 'marcar_pagado': {
      const end = vigenteFin > now ? existing!.current_period_end! : periodFrom(now, 30)
      next = { ...next, status: 'active', activation_type: 'azul', payment_provider: 'azul', current_period_start: nowISO, current_period_end: end, cancel_at_period_end: false }
      statusForPlan = 'active'; endForPlan = end
      break
    }
    case 'marcar_pendiente':
      next = { ...next, status: 'pending_payment' }
      statusForPlan = 'pending_payment'
      break
    case 'cancelar_fin_periodo':
      next = { ...next, cancel_at_period_end: true }
      break // mantiene el estado/plan vigente hasta el fin
    case 'cancelar_ahora':
    case 'volver_normal':
      next = { ...next, status: 'cancelled', cancelled_at: nowISO }
      statusForPlan = 'cancelled'
      break
    case 'suspender':
      next = { ...next, status: 'suspended' }
      statusForPlan = 'suspended'
      break
    case 'restaurar': {
      const end = vigenteFin > now ? existing!.current_period_end! : periodFrom(now, 30)
      next = { ...next, status: 'active', current_period_start: nowISO, current_period_end: end, cancel_at_period_end: false, cancelled_at: null }
      statusForPlan = 'active'; endForPlan = end
      break
    }
    case 'nota':
      if (params.note == null) return { error: 'Escribe la nota.' }
      next = { ...next, admin_note: params.note }
      break
    default:
      return { error: 'Acción no reconocida.' }
  }

  if (needsExisting && !existing) return { error: 'Este propietario no tiene una suscripción activa.' }
  if (params.note != null && action !== 'nota') next.admin_note = params.note

  // Escribe la suscripción (update existente o insert nueva)
  let subId = existing?.id ?? null
  if (existing) {
    const { error } = await svc.from('host_subscriptions').update(next).eq('id', existing.id)
    if (error) return { error: `No se pudo actualizar la suscripción: ${error.message}` }
  } else {
    const { data: ins, error } = await svc.from('host_subscriptions')
      .insert({ host_id: hostId, price_amount: 499, started_at: nowISO, ...next })
      .select('id').maybeSingle()
    if (error) return { error: `No se pudo crear la suscripción: ${error.message}` }
    subId = ins?.id ?? null
  }

  // Sincroniza el caché plan_type (fuente de verdad = la sub) y marca prueba usada
  const plan = resolvePlan({ status: statusForPlan ?? '', current_period_end: endForPlan }, nowISO)
  const profilePatch: Record<string, any> = { plan_type: plan }
  if (action === 'activar_prueba') profilePatch.pro_trial_used = true
  const { error: ep } = await svc.from('profiles').update(profilePatch).eq('id', hostId)
  if (ep) return { error: `Suscripción guardada, pero no se pudo sincronizar el plan: ${ep.message}` }

  // Registro de auditoría
  await svc.from('subscription_audit_log').insert({
    host_id: hostId, subscription_id: subId, admin_id: adminId,
    action, old_status: oldStatus, new_status: statusForPlan ?? oldStatus, note: params.note ?? null,
  })

  // Sincronización inmediata de las superficies que dependen del plan
  for (const p of ['/admin/pro', `/admin/usuarios/${hostId}`, '/dashboard/host', '/dashboard/host/pro', '/buscar']) {
    try { revalidatePath(p) } catch {}
  }
  return { ok: true }
}
