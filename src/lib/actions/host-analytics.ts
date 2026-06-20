'use server'

import { createClient } from '@/lib/supabase/server'
import { resolveHostId } from './_resolveHost'
import { hostNetOf } from '@/lib/pricing'

// ============================================================
// Analytics del host — agregación server-side.
//
// Arregla los bugs del panel viejo:
//  - "días/horas más demandados" cuentan SOLO reservas reales
//    (confirmadas/completadas + directos), no canceladas/rechazadas
//  - serie mensual de ingresos usa neto consistente con Finanzas
//  - agrega métricas nuevas: embudo vistas→solicitudes→confirmadas,
//    tasa de conversión, tasa de aceptación, rating, demanda por hora,
//    top espacios.
// ============================================================

const CANCELLED = ['rejected', 'cancelled_guest', 'cancelled_host']
const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

export interface HostAnalytics {
  views: { total: number; prevTotal: number; weekly: { week: string; views: number }[] }
  funnel: { views: number; requests: number; confirmed: number }
  conversionRate: number | null   // confirmadas / vistas (%)
  acceptanceRate: number | null   // aceptadas / (aceptadas + rechazadas) (%)
  avgTicket: number
  rating: { average: number; count: number }
  totals: { events: number; espotNet: number; directo: number; combined: number }
  monthly: { mes: string; eventos: number; ingresos: number }[]
  byDay: { day: string; eventos: number }[]
  byHour: { hour: string; eventos: number }[]
  topSpaces: { name: string; net: number; views: number; count: number }[]
  eventTypes: { name: string; value: number }[]
  clicks: { total: number; byType: Record<string, number> }   // Pro (F6b)
}

function feeNet(total: number, fee: number | null): number {
  return Math.max(0, hostNetOf({ total_amount: total, platform_fee: fee }))
}
function ym(d: string): string { return d.slice(0, 7) }

export async function getHostAnalytics(): Promise<HostAnalytics | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { hostId } = await resolveHostId(supabase, user.id)

  const { data: spaceRows } = await supabase
    .from('spaces').select('id, name').eq('host_id', hostId)
  const spaceIds = (spaceRows ?? []).map(s => s.id)
  const spaceName: Record<string, string> = {}
  ;(spaceRows ?? []).forEach(s => { spaceName[s.id] = s.name ?? 'Espacio' })

  const empty: HostAnalytics = {
    views: { total: 0, prevTotal: 0, weekly: [] },
    funnel: { views: 0, requests: 0, confirmed: 0 },
    conversionRate: null, acceptanceRate: null, avgTicket: 0,
    rating: { average: 0, count: 0 },
    totals: { events: 0, espotNet: 0, directo: 0, combined: 0 },
    monthly: [], byDay: [], byHour: [], topSpaces: [], eventTypes: [],
    clicks: { total: 0, byType: {} },
  }
  if (!spaceIds.length) return empty

  const now = new Date()
  const since56 = new Date(now); since56.setDate(since56.getDate() - 55)
  const since56Str = since56.toISOString().split('T')[0]
  const since28 = new Date(now); since28.setDate(since28.getDate() - 27)
  const since28Str = since28.toISOString().split('T')[0]

  const [{ data: bRows }, { data: extRows }, { data: viewRows }, { data: revRows }, { data: clickRows }] = await Promise.all([
    supabase.from('bookings')
      .select('id, status, payment_status, total_amount, platform_fee, event_date, confirmed_at, start_time, event_type, space_id')
      .in('space_id', spaceIds),
    supabase.from('external_events')
      .select('id, status, paid_amount, event_date, event_type, title, space_id')
      .eq('host_id', hostId),
    supabase.from('space_views')
      .select('space_id, view_date, view_count')
      .in('space_id', spaceIds)
      .gte('view_date', since56Str),
    supabase.from('reviews')
      .select('rating, space_id')
      .in('space_id', spaceIds),
    supabase.from('space_clicks')
      .select('click_type, click_count, click_date')
      .in('space_id', spaceIds)
      .gte('click_date', since28Str),
  ])

  const bookings = bRows ?? []
  const ext = (extRows ?? []).filter(e => ['confirmado', 'en_curso', 'completado'].includes((e as any).status))
  const confirmed = bookings.filter(b => ['confirmed', 'completed'].includes(b.status))

  // ── Vistas (últimas 4 semanas vs 4 anteriores) ──
  let viewsTotal = 0, viewsPrev = 0
  const weekMap: Record<string, number> = {}
  ;(viewRows ?? []).forEach(r => {
    const vc = Number(r.view_count ?? 0)
    if (r.view_date >= since28Str) {
      viewsTotal += vc
      const d = new Date(r.view_date + 'T12:00')
      const diff = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24 * 7))
      const wk = diff <= 0 ? 'Esta semana' : diff === 1 ? 'Semana pasada' : `Hace ${diff} sem`
      weekMap[wk] = (weekMap[wk] ?? 0) + vc
    } else {
      viewsPrev += vc
    }
  })
  const weekOrder = ['Hace 3 sem', 'Hace 2 sem', 'Semana pasada', 'Esta semana']
  const weekly = weekOrder.filter(k => weekMap[k] !== undefined).map(k => ({ week: k, views: weekMap[k] }))

  // ── Clics de intención (28 días) — Pro (F6b) ──
  let clicksTotal = 0
  const clicksByType: Record<string, number> = {}
  ;(clickRows ?? []).forEach((r: any) => {
    const c = Number(r.click_count ?? 0)
    clicksTotal += c
    clicksByType[r.click_type] = (clicksByType[r.click_type] ?? 0) + c
  })

  // ── Embudo + tasas ──
  const requests = bookings.filter(b => !CANCELLED.includes(b.status)).length
  const accepted = bookings.filter(b => ['accepted', 'confirmed', 'completed'].includes(b.status)).length
  const rejected = bookings.filter(b => b.status === 'rejected').length
  const conversionRate = viewsTotal > 0 ? Math.round((confirmed.length / viewsTotal) * 1000) / 10 : null
  const acceptanceRate = (accepted + rejected) > 0 ? Math.round((accepted / (accepted + rejected)) * 100) : null

  // ── Ingresos / ticket ──
  const espotNet = confirmed.reduce((s, b) => s + feeNet(Number(b.total_amount ?? 0), b.platform_fee), 0)
  const directo  = ext.reduce((s, e) => s + Number((e as any).paid_amount ?? 0), 0)
  const combined = espotNet + directo
  const totalEvents = confirmed.length + ext.length
  const avgTicket = totalEvents > 0 ? Math.round(combined / totalEvents) : 0

  // ── Rating ──
  const ratings = (revRows ?? []).map(r => Number(r.rating)).filter(n => !isNaN(n))
  const rating = {
    average: ratings.length ? Math.round((ratings.reduce((s, n) => s + n, 0) / ratings.length) * 10) / 10 : 0,
    count: ratings.length,
  }

  // ── Serie mensual (6 meses): eventos + ingreso neto ──
  const monthly = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const mes = d.toLocaleDateString('es-DO', { month: 'short' })
    const mb = confirmed.filter(b => b.confirmed_at && ym(b.confirmed_at) === key)
    const me = ext.filter(e => (e as any).event_date && ym((e as any).event_date) === key)
    const ingresos = mb.reduce((s, b) => s + feeNet(Number(b.total_amount ?? 0), b.platform_fee), 0)
                   + me.reduce((s, e) => s + Number((e as any).paid_amount ?? 0), 0)
    return { mes: mes.charAt(0).toUpperCase() + mes.slice(1), eventos: mb.length + me.length, ingresos }
  })

  // ── Demanda por día (solo reservas reales: confirmadas + directos) ──
  const dayMap: Record<number, number> = { 0:0,1:0,2:0,3:0,4:0,5:0,6:0 }
  const addDay = (dateStr?: string | null) => {
    if (!dateStr) return
    dayMap[new Date(dateStr + 'T12:00').getDay()] += 1
  }
  confirmed.forEach(b => addDay(b.event_date))
  ext.forEach(e => addDay((e as any).event_date))
  const byDay = dayNames.map((day, i) => ({ day, eventos: dayMap[i] }))

  // ── Demanda por hora (de start_time de confirmadas) ──
  const hourMap: Record<number, number> = {}
  confirmed.forEach(b => {
    if (!b.start_time) return
    const h = parseInt(String(b.start_time).slice(0, 2), 10)
    if (!isNaN(h)) hourMap[h] = (hourMap[h] ?? 0) + 1
  })
  const byHour = Object.entries(hourMap)
    .map(([h, eventos]) => ({ hour: `${h.padStart(2, '0')}:00`, eventos, _h: Number(h) }))
    .sort((a, b) => a._h - b._h)
    .map(({ hour, eventos }) => ({ hour, eventos }))

  // ── Top espacios (neto + vistas + reservas) ──
  const viewBySpace: Record<string, number> = {}
  ;(viewRows ?? []).forEach(r => {
    if (r.view_date >= since28Str) viewBySpace[r.space_id] = (viewBySpace[r.space_id] ?? 0) + Number(r.view_count ?? 0)
  })
  const spaceAgg: Record<string, { net: number; count: number }> = {}
  confirmed.forEach(b => {
    const k = b.space_id ?? 'na'
    if (!spaceAgg[k]) spaceAgg[k] = { net: 0, count: 0 }
    spaceAgg[k].net += feeNet(Number(b.total_amount ?? 0), b.platform_fee)
    spaceAgg[k].count += 1
  })
  const topSpaces = spaceIds.map(id => ({
    name: spaceName[id] ?? 'Espacio',
    net: spaceAgg[id]?.net ?? 0,
    views: viewBySpace[id] ?? 0,
    count: spaceAgg[id]?.count ?? 0,
  })).sort((a, b) => b.net - a.net || b.views - a.views)

  // ── Tipos de evento (confirmadas + directos) ──
  const typeMap: Record<string, number> = {}
  confirmed.forEach(b => { if (b.event_type) typeMap[b.event_type] = (typeMap[b.event_type] ?? 0) + 1 })
  ext.forEach(e => { const t = (e as any).event_type ?? (e as any).title; if (t) typeMap[t] = (typeMap[t] ?? 0) + 1 })
  const eventTypes = Object.entries(typeMap)
    .sort((a, b) => b[1] - a[1]).slice(0, 5)
    .map(([name, value]) => ({ name, value }))

  return {
    views: { total: viewsTotal, prevTotal: viewsPrev, weekly },
    funnel: { views: viewsTotal, requests, confirmed: confirmed.length },
    conversionRate, acceptanceRate, avgTicket,
    rating,
    totals: { events: totalEvents, espotNet, directo, combined },
    monthly, byDay, byHour, topSpaces, eventTypes,
    clicks: { total: clicksTotal, byType: clicksByType },
  }
}
