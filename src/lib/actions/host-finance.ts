'use server'

import { createClient } from '@/lib/supabase/server'
import { resolveHostId } from './_resolveHost'

// ============================================================
// Datos financieros del host — agregación server-side correcta.
//
// Arregla los bugs del panel viejo:
//  - usa platform_fee REAL (no 0.10 hardcodeado)
//  - distingue COBRADO (paid_amount) de FACTURADO (total_amount)
//  - "próximo payout" = lo que Espot debe liquidar (pagado completo y
//    payout pendiente), no las reservas meramente confirmadas
//  - serie mensual y "este mes" usan el MISMO criterio (confirmed_at)
// ============================================================

const ACTIVE = ['accepted', 'confirmed', 'completed']
const REVENUE_PAYMENT = ['advance', 'partial', 'paid']
const CANCELLED = ['rejected', 'cancelled_guest', 'cancelled_host']

type B = {
  id: string
  status: string
  payment_status: string | null
  payout_status: string | null
  total_amount: number | null
  paid_amount: number | null
  platform_fee: number | null
  event_date: string | null
  confirmed_at: string | null
  event_type: string | null
  guest_id: string | null
  space_id: string | null
  profiles?: { full_name?: string | null } | null
  spaces?: { name?: string | null } | null
}

/** Comisión real de la reserva (cae a 10% si platform_fee no está poblado). */
function feeOf(b: B): number {
  return b.platform_fee != null ? Number(b.platform_fee) : Math.round(Number(b.total_amount ?? 0) * 0.10)
}
/** Neto al host = total − comisión. */
function netOf(b: B): number {
  return Math.max(0, Number(b.total_amount ?? 0) - feeOf(b))
}
function ym(dateStr: string): string { return dateStr.slice(0, 7) } // YYYY-MM

export interface HostFinance {
  netEarned: number          // neto (después de comisión) de toda la reserva confirmada — HERO
  collectedTotal: number     // cash realmente cobrado (Espot + directo)
  collectedThisMonth: number
  collectedPrevMonth: number
  monthChangePct: number | null
  receivable: number         // por cobrar (facturado − cobrado), Espot + directo
  nextPayout: number         // neto que Espot debe liquidar ya (pagado completo, payout pendiente)
  espot:   { gross: number; commission: number; net: number; collected: number; count: number }
  directo: { total: number; collected: number; count: number }
  monthly: { mes: string; espot: number; directo: number }[]
  bySpace: { name: string; net: number; count: number }[]
  payouts: { id: string; guest: string; space: string; event_date: string | null; net: number; status: 'pendiente' | 'pagado' | 'en_curso' }[]
  upcoming: { id: string; due_date: string; amount: number; status: string; guest: string; space: string; overdue: boolean }[]
}

export async function getHostFinance(): Promise<HostFinance | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { hostId } = await resolveHostId(supabase, user.id)

  const { data: spaceRows } = await supabase.from('spaces').select('id, name').eq('host_id', hostId)
  const spaceIds = (spaceRows ?? []).map(s => s.id)
  const spaceName: Record<string, string> = {}
  ;(spaceRows ?? []).forEach(s => { spaceName[s.id] = s.name ?? 'Espacio' })

  const empty: HostFinance = {
    netEarned: 0, collectedTotal: 0, collectedThisMonth: 0, collectedPrevMonth: 0, monthChangePct: null,
    receivable: 0, nextPayout: 0,
    espot: { gross: 0, commission: 0, net: 0, collected: 0, count: 0 },
    directo: { total: 0, collected: 0, count: 0 },
    monthly: [], bySpace: [], payouts: [], upcoming: [],
  }
  if (!spaceIds.length) return empty

  const today = new Date().toISOString().split('T')[0]
  const [{ data: bRows }, { data: extRows }, { data: instRows }] = await Promise.all([
    supabase.from('bookings')
      .select('id, status, payment_status, payout_status, total_amount, paid_amount, platform_fee, event_date, confirmed_at, event_type, guest_id, space_id, profiles!guest_id(full_name), spaces!space_id(name)')
      .in('space_id', spaceIds),
    supabase.from('external_events')
      .select('id, status, total_amount, paid_amount, event_date')
      .eq('host_id', hostId),
    supabase.from('booking_installments')
      .select('id, due_date, amount, status, booking_id, bookings!booking_id(space_id, event_type, profiles!guest_id(full_name), spaces!space_id(name))')
      .in('status', ['pending', 'overdue'])
      .order('due_date', { ascending: true }),
  ])

  const bookings = (bRows ?? []) as unknown as B[]
  const active   = bookings.filter(b => !CANCELLED.includes(b.status))
  const revenue  = active.filter(b => REVENUE_PAYMENT.includes(b.payment_status ?? ''))

  // ── Espot ──
  const espotGross      = revenue.reduce((s, b) => s + Number(b.total_amount ?? 0), 0)
  const espotCommission = revenue.reduce((s, b) => s + feeOf(b), 0)
  const espotNet        = revenue.reduce((s, b) => s + netOf(b), 0)
  const espotCollected  = revenue.reduce((s, b) => s + Number(b.paid_amount ?? 0), 0)

  // ── Directo (eventos manuales) ──
  const ext = (extRows ?? []).filter(e => ['confirmado', 'en_curso', 'completado'].includes((e as any).status))
  const directoTotal     = ext.reduce((s, e) => s + Number((e as any).total_amount ?? 0), 0)
  const directoCollected = ext.reduce((s, e) => s + Number((e as any).paid_amount ?? 0), 0)

  // ── Por cobrar (facturado − cobrado) ──
  const receivableEspot   = active.reduce((s, b) => s + Math.max(0, Number(b.total_amount ?? 0) - Number(b.paid_amount ?? 0)), 0)
  const receivableDirecto = ext.reduce((s, e) => s + Math.max(0, Number((e as any).total_amount ?? 0) - Number((e as any).paid_amount ?? 0)), 0)

  // ── Próximo payout: pagado completo y aún sin liquidar ──
  const nextPayout = revenue
    .filter(b => b.payment_status === 'paid' && b.payout_status !== 'paid')
    .reduce((s, b) => s + netOf(b), 0)

  // ── Cobrado este mes vs anterior (por confirmed_at) ──
  const now = new Date()
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const prevD = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const prevMonth = `${prevD.getFullYear()}-${String(prevD.getMonth() + 1).padStart(2, '0')}`
  const collectedThisMonth = revenue
    .filter(b => b.confirmed_at && ym(b.confirmed_at) === thisMonth)
    .reduce((s, b) => s + netOf(b), 0)
  const collectedPrevMonth = revenue
    .filter(b => b.confirmed_at && ym(b.confirmed_at) === prevMonth)
    .reduce((s, b) => s + netOf(b), 0)
  const monthChangePct = collectedPrevMonth > 0
    ? Math.round((collectedThisMonth - collectedPrevMonth) / collectedPrevMonth * 100)
    : null

  // ── Serie mensual (12 meses) — neto Espot (confirmed_at) + directo (event_date) ──
  const monthly = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const mes = d.toLocaleDateString('es-DO', { month: 'short' })
    const espot = revenue
      .filter(b => b.confirmed_at && ym(b.confirmed_at) === key)
      .reduce((s, b) => s + netOf(b), 0)
    const directo = ext
      .filter(e => (e as any).event_date && ym((e as any).event_date) === key)
      .reduce((s, e) => s + Number((e as any).paid_amount ?? 0), 0)
    return { mes: mes.charAt(0).toUpperCase() + mes.slice(1), espot, directo }
  })

  // ── Mix por espacio (neto Espot) ──
  const bySpaceMap: Record<string, { net: number; count: number }> = {}
  revenue.forEach(b => {
    const k = b.space_id ?? 'na'
    if (!bySpaceMap[k]) bySpaceMap[k] = { net: 0, count: 0 }
    bySpaceMap[k].net += netOf(b)
    bySpaceMap[k].count += 1
  })
  const bySpace = Object.entries(bySpaceMap)
    .map(([id, v]) => ({ name: spaceName[id] ?? 'Espacio', net: v.net, count: v.count }))
    .sort((a, b) => b.net - a.net)

  // ── Liquidaciones (payouts) derivadas de bookings ──
  const payouts = revenue
    .filter(b => ['confirmed', 'completed'].includes(b.status))
    .sort((a, b) => (b.confirmed_at ?? '').localeCompare(a.confirmed_at ?? ''))
    .map(b => ({
      id: b.id,
      guest: b.profiles?.full_name ?? 'Cliente',
      space: b.spaces?.name ?? 'Espacio',
      event_date: b.event_date,
      net: netOf(b),
      status: (b.payout_status === 'paid'
        ? 'pagado'
        : b.payment_status === 'paid'
          ? 'pendiente'   // cobrado completo, listo para liquidar
          : 'en_curso') as 'pendiente' | 'pagado' | 'en_curso',
    }))

  // ── Próximas cuotas por cobrar ──
  const upcoming = (instRows ?? []).map((i: any) => {
    const bk = i.bookings as any
    return {
      id: i.id as string,
      due_date: i.due_date as string,
      amount: Number(i.amount ?? 0),
      status: i.status as string,
      guest: bk?.profiles?.full_name ?? 'Cliente',
      space: bk?.spaces?.name ?? 'Espacio',
      overdue: i.status === 'overdue' || (i.due_date && i.due_date < today),
    }
  }).slice(0, 8)

  return {
    netEarned: espotNet,
    collectedTotal: espotCollected + directoCollected,
    collectedThisMonth, collectedPrevMonth, monthChangePct,
    receivable: receivableEspot + receivableDirecto,
    nextPayout,
    espot:   { gross: espotGross, commission: espotCommission, net: espotNet, collected: espotCollected, count: revenue.length },
    directo: { total: directoTotal, collected: directoCollected, count: ext.length },
    monthly, bySpace, payouts, upcoming,
  }
}
