'use server'

import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { resolvePlan } from '@/lib/plans'

// ============================================================
// Módulo administrativo "Espot Pro".
// Acciones de LECTURA del listado de propietarios + sus suscripciones.
// Las acciones de gestión (activar/cancelar/etc.) viven en subscription.ts.
// Todas gateadas por requireAdmin (servicio-rol, bypass RLS).
// ============================================================

const SUPERADMIN_EMAIL = process.env.SUPERADMIN_EMAIL ?? 'enriquehernandezfondeur@gmail.com'
const LIVE = ['trialing', 'active', 'pending_payment', 'past_due', 'suspended']
const DAY_MS = 86_400_000

/** Mismo criterio que requireAdmin() de admin.ts. */
async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  if (user.email !== SUPERADMIN_EMAIL) {
    const { data } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
    if (data?.role !== 'admin') return null
  }
  try { return createServiceClient() } catch { return null }
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
}

export interface ProOwnersResult {
  owners: ProOwnerRow[]
  stats: ProStats
}

export async function getProOwners(): Promise<ProOwnersResult | null> {
  const svc = await requireAdmin()
  if (!svc) return null

  const nowISO = new Date().toISOString()
  const nowMs = Date.now()

  const [{ data: hosts }, { data: subs }, { data: spaces }] = await Promise.all([
    svc.from('profiles')
      .select('id, full_name, email, phone, created_at, pro_trial_used')
      .eq('role', 'host' as any)
      .order('created_at', { ascending: false }),
    svc.from('host_subscriptions')
      .select('host_id, status, activation_type, payment_provider, current_period_start, current_period_end, cancel_at_period_end, started_at, cancelled_at, created_at')
      .in('status', LIVE)
      .order('created_at', { ascending: false }),
    svc.from('spaces').select('host_id, is_published'),
  ])

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
      plan,
      proTrialUsed: !!h.pro_trial_used,
      sub,
      daysLeft,
    }
  })

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
  }

  return { owners, stats }
}
