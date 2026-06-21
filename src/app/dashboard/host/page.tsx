'use client'

import React, { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  Clock, CheckCircle, CalendarDays,
  ArrowRight, Users, DollarSign, CalendarCheck,
  Plus, Building2, MessageCircle, Banknote, Loader2, X, Crown, Sparkles,
} from 'lucide-react'
import { formatCurrency, formatTime, todayInRD } from '@/lib/utils'
import Link from 'next/link'
import { getHostStats, getHostBookings, acceptBooking, rejectBooking } from '@/lib/actions/host'
import { getMySubscription } from '@/lib/actions/subscription'
import { PlanBadge } from '@/components/PlanBadge'
import { getExternalEvents } from '@/lib/actions/external-events'
import { getUpcomingFollowups } from '@/lib/actions/clients'
import type { ExternalEvent, HostClient } from '@/types'
import { StatusBadge } from '@/components/StatusBadge'
import { externalEventStyle } from '@/lib/statusConfig'
import { useConfirm } from '@/components/ui/ConfirmDialog'
export { StatusBadge }

function PublishedToast() {
  const searchParams = useSearchParams()
  const [show, setShow] = useState(searchParams.get('published') === '1')
  useEffect(() => { if (show) setTimeout(() => setShow(false), 4000) }, [show])
  if (!show) return null
  return (
    <div className="fixed top-6 right-6 z-50 px-5 py-3 rounded-xl shadow-lg flex items-center gap-2 text-sm font-medium text-white"
      style={{ background: 'var(--brand)' }}>
      <CheckCircle size={16} /> Espacio publicado correctamente
    </div>
  )
}


type CalBooking = Awaited<ReturnType<typeof getHostBookings>>[0]

export default function DashboardPage() {
  const [stats,          setStats]          = useState<Awaited<ReturnType<typeof getHostStats>>>(null)
  const [bookings,       setBookings]       = useState<CalBooking[]>([])
  const [externalEvents, setExternalEvents] = useState<ExternalEvent[]>([])
  const [loading,        setLoading]        = useState(true)
  const [actionError,    setActionError]    = useState('')
  const [actionId,       setActionId]       = useState<string | null>(null)
  const [isPro,          setIsPro]          = useState(false)
  const [isTrial,        setIsTrial]        = useState(false)
  const [daysLeft,       setDaysLeft]       = useState<number | null>(null)
  const [followups,      setFollowups]      = useState<HostClient[]>([])
  const { confirm, dialog } = useConfirm()

  useEffect(() => {
    Promise.all([
      getHostStats(),
      getHostBookings(),
      getExternalEvents().catch(() => [] as ExternalEvent[]),
      getUpcomingFollowups().catch(() => [] as HostClient[]),
    ]).then(([s, b, ev, fu]) => {
      setStats(s); setBookings(b); setExternalEvents(ev); setFollowups(fu); setLoading(false)
    }).catch(() => setLoading(false))
  }, [])
  useEffect(() => {
    getMySubscription().then(s => { setIsPro(s.isPro); setIsTrial(s.isTrial); setDaysLeft(s.daysLeft) }).catch(() => {})
  }, [])

  async function handleConfirm(id: string) {
    if (actionId) return
    setActionId(id)
    try {
      const r = await acceptBooking(id)
      if ('error' in r) { setActionError(r.error ?? 'Error'); setTimeout(() => setActionError(''), 3000) }
      else {
        setBookings(prev => prev.map(b => b.id === id ? { ...b, status: 'accepted' } : b))
        // Aceptar pasa a 'accepted' (aún sin pagar) — no incrementar confirmedCount
        // (que en getHostStats significa "ingresos confirmados del mes")
        setStats(prev => prev ? { ...prev, pendingCount: Math.max(0, prev.pendingCount - 1), acceptedCount: (prev.acceptedCount ?? 0) + 1 } : prev)
      }
    } finally { setActionId(null) }
  }
  async function handleReject(id: string) {
    if (actionId) return
    const ok = await confirm({ title: '¿Rechazar esta solicitud?', message: 'No se puede deshacer.', confirmText: 'Rechazar', tone: 'danger' })
    if (!ok) return
    setActionId(id)
    try {
      const r = await rejectBooking(id)
      if ('error' in r) { setActionError(r.error ?? 'Error'); setTimeout(() => setActionError(''), 3000) }
      else {
        setBookings(prev => prev.map(b => b.id === id ? { ...b, status: 'rejected' } : b))
        setStats(prev => prev ? { ...prev, pendingCount: Math.max(0, prev.pendingCount - 1) } : prev)
      }
    } finally { setActionId(null) }
  }

  const todayStr = todayInRD()

  type Item =
    | { kind: 'espot';  date: string; b:  CalBooking    }
    | { kind: 'manual'; date: string; ev: ExternalEvent }

  const upcomingItems: Item[] = [
    ...bookings
      .filter(b => b.event_date >= todayStr && !['cancelled_guest','cancelled_host','rejected'].includes(b.status))
      .map(b  => ({ kind: 'espot'  as const, date: b.event_date,  b  })),
    ...externalEvents
      .filter(ev => ev.event_date >= todayStr && ev.status !== 'cancelado')
      .map(ev => ({ kind: 'manual' as const, date: ev.event_date, ev })),
  ].sort((a, z) => a.date.localeCompare(z.date))

  // Monto total por cobrar de eventos manuales próximos
  const porCobrar = externalEvents
    .filter(ev => ev.event_date >= todayStr && !['cancelado','completado'].includes(ev.status) && ev.total_amount)
    .reduce((s, ev) => s + Math.max(0, Number(ev.total_amount ?? 0) - Number(ev.paid_amount ?? 0)), 0)

  // Grupo de fecha para separador
  function getGroup(dateStr: string): 'hoy' | 'semana' | 'despues' {
    const diff = Math.round((new Date(dateStr + 'T12:00').getTime() - new Date(todayStr + 'T12:00').getTime()) / 86400000)
    if (diff === 0) return 'hoy'
    if (diff <= 6)  return 'semana'
    return 'despues'
  }
  const GROUP_LABEL: Record<string, string> = { hoy: 'Hoy', semana: 'Esta semana', despues: 'Próximamente' }

  function dateShort(dateStr: string) {
    const d    = new Date(dateStr + 'T12:00')
    const diff = Math.round((d.getTime() - new Date(todayStr + 'T12:00').getTime()) / 86400000)
    if (diff === 0) return 'Hoy'
    if (diff === 1) return 'Mañana'
    if (diff <= 6)  return d.toLocaleDateString('es-DO', { weekday: 'short', day: 'numeric', month: 'short' }).replace('.','')
    return d.toLocaleDateString('es-DO', { day: 'numeric', month: 'short' }).replace('.','')
  }

  if (loading) return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-4 animate-pulse">
      <div className="h-7 w-48 rounded-xl" style={{ background: 'var(--bg-elevated)' }} />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => <div key={i} className="h-20 rounded-2xl" style={{ background: 'var(--bg-elevated)' }} />)}
      </div>
      <div className="h-96 rounded-2xl" style={{ background: 'var(--bg-elevated)' }} />
    </div>
  )

  let lastGroup = ''

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      {dialog}
      <Suspense fallback={null}><PublishedToast /></Suspense>

      {actionError && (
        <div className="fixed top-16 right-4 md:top-5 md:right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold shadow-xl"
          style={{ background: 'var(--danger)', color: '#fff' }}>
          <X size={15} /> {actionError}
        </div>
      )}

      {/* ── Header ── */}
      <div className="flex items-start justify-between mb-5 md:mb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-bold" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            Panel de control
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {new Date().toLocaleDateString('es-DO', { weekday: 'long', day: 'numeric', month: 'long' }).replace(/^\w/, c => c.toUpperCase())}
          </p>
        </div>
        <Link href="/dashboard/host/eventos/nuevo"
          className="flex items-center gap-1.5 text-sm font-semibold px-4 py-2.5 rounded-xl shrink-0"
          style={{ background: 'var(--brand)', color: '#fff' }}>
          <Plus size={15} /> Nuevo evento
        </Link>
      </div>

      {/* ── Estado del plan (color distinto si es Pro) ── */}
      <Link href="/dashboard/host/pro"
        className="flex items-center gap-3 rounded-2xl p-4 mb-5 md:mb-6 transition-all"
        style={isPro
          ? { background: 'var(--pro-dim)', border: '1px solid var(--pro-border)' }
          : { background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-card)' }}>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: isPro ? 'var(--pro)' : 'var(--pro-dim)' }}>
          {isPro ? <Crown size={20} style={{ color: '#fff' }} /> : <Sparkles size={20} style={{ color: 'var(--pro)' }} />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-bold text-sm flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            {isTrial ? 'Prueba gratuita' : isPro ? 'Espot Pro activo' : 'Plan Normal'}
            {isPro && <PlanBadge />}
          </div>
          <div className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            {isPro
              ? (daysLeft != null
                  ? `${isTrial ? 'Tu prueba termina' : 'Se renueva'} en ${daysLeft} día${daysLeft === 1 ? '' : 's'} · todas las funciones Pro activas.`
                  : 'Tienes todas las herramientas Pro desbloqueadas.')
              : 'Desbloquea Espot Directo, reservas externas y más por RD$499/mes.'}
          </div>
        </div>
        {!isPro && (
          <span className="hidden sm:inline-flex shrink-0 text-sm font-semibold px-4 py-2 rounded-xl"
            style={{ background: 'var(--pro)', color: '#fff' }}>Mejora a Pro</span>
        )}
        <ArrowRight size={16} className="shrink-0" style={{ color: isPro ? 'var(--pro)' : 'var(--text-muted)' }} />
      </Link>

      {/* ── Zona de acción urgente: solicitudes pendientes ── */}
      {(() => {
        const pending = bookings.filter(b => b.status === 'pending')
        if (pending.length === 0) return null

        // Calcular cuántas llevan más de 24h (urgentes)
        const urgentCount = pending.filter(b => {
          const created = (b as any).created_at
          if (!created) return false
          return Date.now() - new Date(created).getTime() > 24 * 60 * 60 * 1000
        }).length

        return (
          <div className="rounded-2xl overflow-hidden mb-5"
            style={{ border: '1px solid rgba(217,119,6,0.3)', background: 'rgba(254,243,199,0.6)' }}>

            {/* Header de la zona */}
            <div className="flex items-center justify-between px-5 py-3"
              style={{ borderBottom: '1px solid rgba(217,119,6,0.15)' }}>
              <div className="flex items-center gap-2.5">
                <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#D97706' }} />
                <span className="text-sm font-bold" style={{ color: '#92400E' }}>
                  {pending.length} solicitud{pending.length !== 1 ? 'es' : ''} esperando tu respuesta
                </span>
              </div>
              {urgentCount > 0 && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                  style={{ background: 'rgba(217,119,6,0.15)', color: '#B45309' }}>
                  {urgentCount} urgente{urgentCount !== 1 ? 's' : ''} +24h
                </span>
              )}
            </div>

            {/* Lista de pendientes (máx 3) */}
            {pending.slice(0, 3).map((b, idx) => {
              const guest     = (b as any).profiles
              const spaceName = (b as any).spaces?.name ?? ''
              const daysLeft  = Math.max(0, Math.ceil(
                (new Date((b.event_date ?? '') + 'T12:00').getTime() - Date.now()) / 86400000
              ))
              const isUrgent  = (b as any).created_at
                ? Date.now() - new Date((b as any).created_at).getTime() > 24 * 60 * 60 * 1000
                : false

              return (
                <div key={b.id}
                  className="flex items-center gap-3 px-5 py-3"
                  style={{ borderTop: idx > 0 ? '1px solid rgba(217,119,6,0.12)' : undefined }}>

                  {/* Avatar */}
                  <div className="w-8 h-8 rounded-xl shrink-0 flex items-center justify-center text-xs font-bold"
                    style={{ background: 'rgba(217,119,6,0.15)', color: '#B45309' }}>
                    {guest?.full_name?.charAt(0)?.toUpperCase() ?? '?'}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: '#78350F' }}>
                      {guest?.full_name ?? 'Cliente'} · {b.event_type ?? 'Evento'}
                    </p>
                    <p className="text-xs truncate" style={{ color: '#92400E' }}>
                      {spaceName && `${spaceName} · `}
                      {new Date((b.event_date ?? '') + 'T12:00').toLocaleDateString('es-DO', { day: 'numeric', month: 'short' })}
                      {b.guest_count ? ` · ${b.guest_count} personas` : ''}
                      {daysLeft <= 14 && (
                        <span className="ml-1.5 font-semibold" style={{ color: daysLeft <= 7 ? 'var(--danger)' : '#D97706' }}>
                          · en {daysLeft}d
                        </span>
                      )}
                    </p>
                  </div>

                  {/* Acciones */}
                  <div className="flex items-center gap-2 shrink-0">
                    {isUrgent && (
                      <span className="hidden sm:block text-[10px] font-bold px-1.5 py-0.5 rounded"
                        style={{ background: 'rgba(220,38,38,0.1)', color: 'var(--danger)' }}>
                        URGENTE
                      </span>
                    )}
                    <button
                      onClick={() => handleConfirm(b.id)}
                      disabled={actionId === b.id}
                      className="text-xs font-bold px-3 py-1.5 rounded-lg transition-all disabled:opacity-60 inline-flex items-center gap-1"
                      style={{ background: 'var(--brand)', color: '#fff' }}>
                      {actionId === b.id ? <Loader2 size={12} className="animate-spin" /> : null} Aceptar
                    </button>
                    <Link href={`/dashboard/host/reservas/${b.id}`}
                      className="text-xs font-semibold px-3 py-1.5 rounded-lg"
                      style={{ background: 'rgba(217,119,6,0.12)', color: '#92400E' }}>
                      Ver
                    </Link>
                  </div>
                </div>
              )
            })}

            {/* Footer con warning y link a todas */}
            <div className="flex items-center justify-between px-5 py-2.5"
              style={{ borderTop: '1px solid rgba(217,119,6,0.15)', background: 'rgba(217,119,6,0.05)' }}>
              <p className="text-xs inline-flex items-center gap-1.5" style={{ color: '#92400E' }}>
                <Clock size={13} /> Las solicitudes se auto-rechazan a las 72h si no respondes
              </p>
              {pending.length > 3 && (
                <Link href="/dashboard/host/agenda"
                  className="text-xs font-semibold"
                  style={{ color: '#B45309' }}>
                  Ver {pending.length - 3} más →
                </Link>
              )}
            </div>
          </div>
        )
      })()}

      {/* ── Stats (4 tarjetas) ── */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-5">

        {/* Próximos eventos */}
        <Link href="/dashboard/host/agenda"
          className="rounded-2xl p-4 block transition-all hover:shadow-md"
          style={{ background: '#fff', border: '1px solid var(--border-subtle)' }}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Próximos eventos</span>
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(53,196,147,0.1)' }}>
              <CalendarCheck size={13} style={{ color: 'var(--brand)' }} />
            </div>
          </div>
          <div className="text-2xl font-bold" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>{upcomingItems.length}</div>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Espot + directos</p>
        </Link>

        {/* Reservas pendientes */}
        <Link href="/dashboard/host/agenda"
          className="rounded-2xl p-4 block transition-all hover:shadow-md"
          style={{ background: '#fff', border: `1px solid ${(stats?.pendingCount ?? 0) > 0 ? 'rgba(217,119,6,0.25)' : 'var(--border-subtle)'}` }}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Por aceptar</span>
            <div className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: (stats?.pendingCount ?? 0) > 0 ? 'rgba(217,119,6,0.1)' : 'var(--bg-elevated)' }}>
              <Clock size={13} style={{ color: (stats?.pendingCount ?? 0) > 0 ? '#D97706' : 'var(--text-muted)' }} />
            </div>
          </div>
          <div className="text-2xl font-bold" style={{ color: (stats?.pendingCount ?? 0) > 0 ? '#D97706' : 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            {stats?.pendingCount ?? 0}
          </div>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>reservas de Espot</p>
        </Link>

        {/* Por cobrar */}
        <Link href="/dashboard/host/agenda"
          className="rounded-2xl p-4 block transition-all hover:shadow-md"
          style={{ background: '#fff', border: `1px solid ${porCobrar > 0 ? 'rgba(37,99,235,0.2)' : 'var(--border-subtle)'}` }}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Por cobrar</span>
            <div className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: porCobrar > 0 ? 'rgba(37,99,235,0.08)' : 'var(--bg-elevated)' }}>
              <Banknote size={13} style={{ color: porCobrar > 0 ? 'var(--info)' : 'var(--text-muted)' }} />
            </div>
          </div>
          <div className="text-lg font-bold truncate" style={{ color: porCobrar > 0 ? 'var(--info)' : 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            {formatCurrency(porCobrar)}
          </div>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>en eventos directos</p>
        </Link>

      </div>

      {/* ── Seguimientos pendientes (próxima acción del CRM) ── */}
      {followups.length > 0 && (
        <div className="rounded-2xl overflow-hidden mb-5" style={{ background: '#fff', border: '1px solid var(--border-subtle)' }}>
          <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
            <h2 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Seguimientos pendientes</h2>
            <Link href="/dashboard/host/clientes" className="text-xs font-medium" style={{ color: 'var(--brand)' }}>Ver clientes</Link>
          </div>
          <div>
            {followups.map((c, i) => {
              const overdue = !!c.next_action_date && c.next_action_date < todayInRD()
              const today = c.next_action_date === todayInRD()
              return (
                <div key={c.id} className="flex items-center gap-3 px-4 py-3"
                  style={{ borderTop: i > 0 ? '1px solid var(--border-subtle)' : 'none' }}>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{c.full_name}</p>
                    <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{c.next_action}</p>
                  </div>
                  <span className="text-xs font-semibold shrink-0"
                    style={{ color: overdue ? 'var(--danger)' : today ? 'var(--brand)' : 'var(--text-muted)' }}>
                    {overdue ? 'Vencido' : today ? 'Hoy' : c.next_action_date}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Próximos eventos (lista unificada con grupos) ── */}
      <div className="rounded-2xl overflow-hidden mb-5"
        style={{ background: '#fff', border: '1px solid var(--border-subtle)' }}>

        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <div className="flex items-center gap-3">
            <h2 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Agenda</h2>
            {upcomingItems.length > 0 && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: 'rgba(53,196,147,0.1)', color: 'var(--brand)' }}>
                {upcomingItems.length} eventos
              </span>
            )}
            {(stats?.pendingCount ?? 0) > 0 && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: 'rgba(217,119,6,0.1)', color: '#D97706' }}>
                {stats?.pendingCount} sin aceptar
              </span>
            )}
          </div>
          <Link href="/dashboard/host/agenda" className="flex items-center gap-1 text-xs font-medium" style={{ color: 'var(--brand)' }}>
            Ver todos <ArrowRight size={13} />
          </Link>
        </div>

        {upcomingItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 gap-3 text-center px-6">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'var(--bg-elevated)' }}>
              <CalendarDays size={20} style={{ color: 'var(--text-muted)' }} />
            </div>
            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Sin eventos próximos</p>
            <p className="text-xs max-w-xs" style={{ color: 'var(--text-muted)' }}>
              Crea un evento directo o espera solicitudes desde el marketplace.
            </p>
            <Link href="/dashboard/host/eventos/nuevo" className="mt-1 text-xs font-semibold px-4 py-2 rounded-xl" style={{ background: 'var(--brand)', color: '#fff' }}>
              + Nuevo evento
            </Link>
          </div>
        ) : (() => {
          const shown = upcomingItems.slice(0, 10)
          const rows: React.ReactElement[] = []
          let lastG = ''

          shown.forEach((item, i) => {
            const isEspot   = item.kind === 'espot'
            const isPending = isEspot && item.b.status === 'pending'
            const group     = getGroup(item.date)
            const ds        = dateShort(item.date)

            // Separador de grupo
            if (group !== lastG) {
              lastG = group
              rows.push(
                <div key={`g-${group}`} className="px-5 py-2 flex items-center gap-2"
                  style={{ background: 'var(--bg-elevated)', borderTop: rows.length > 0 ? '1px solid var(--border-subtle)' : undefined }}>
                  {group === 'hoy' && <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'var(--brand)' }} />}
                  <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: group === 'hoy' ? 'var(--brand)' : 'var(--text-muted)' }}>
                    {GROUP_LABEL[group]}
                  </span>
                </div>
              )
            }

            // Color barra
            const barColor = isEspot
              ? item.b.status === 'confirmed' ? '#16A34A' : item.b.status === 'pending' ? '#D97706' : '#9CA3AF'
              : item.ev.status === 'confirmado' ? 'var(--brand)' : item.ev.status === 'en_curso' ? 'var(--info)' : '#D97706'

            // Espacio/salon
            const spaceName = isEspot
              ? (item.b as any).spaces?.name
              : item.ev.space?.name

            // Progreso de cobro (solo eventos manuales con monto parcial)
            const totalAmt  = Number(isEspot ? item.b.total_amount : (item.ev.total_amount ?? 0))
            const paidAmt   = isEspot ? 0 : Number(item.ev.paid_amount ?? 0)
            const showProgress = !isEspot && totalAmt > 0 && paidAmt > 0 && paidAmt < totalAmt
            const pctPaid = totalAmt > 0 ? Math.round((paidAmt / totalAmt) * 100) : 0

            rows.push(
              <div key={isEspot ? item.b.id : item.ev.id}
                className="px-5 py-4 transition-colors hover:bg-slate-50"
                style={{ borderTop: '1px solid var(--border-subtle)' }}>
                <div className="flex items-start gap-3">
                  {/* Barra + Avatar */}
                  <div className="flex items-start gap-2.5 shrink-0 mt-0.5">
                    <div className="w-1 h-10 rounded-full" style={{ background: barColor }} />
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold"
                      style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>
                      {isEspot
                        ? (item.b as any).profiles?.full_name?.charAt(0)?.toUpperCase() ?? '?'
                        : (item.ev.client?.full_name ?? (item.ev as any).client_name ?? item.ev.title)?.charAt(0)?.toUpperCase() ?? 'E'
                      }
                    </div>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    {/* Título + monto */}
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="min-w-0">
                        <span className="text-sm font-semibold truncate block" style={{ color: 'var(--text-primary)' }}>
                          {isEspot
                            ? ((item.b as any).profiles?.full_name ?? 'Cliente')
                            : item.ev.title
                          }
                        </span>
                        <span className="text-xs truncate block" style={{ color: 'var(--text-muted)' }}>
                          {isEspot
                            ? item.b.event_type
                            : (item.ev.client?.full_name ?? (item.ev as any).client_name ?? item.ev.event_type ?? 'Evento directo')
                          }
                        </span>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                          {totalAmt > 0 ? formatCurrency(totalAmt) : '—'}
                        </span>
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                          style={isEspot
                            ? { background: 'rgba(37,99,235,0.08)', color: 'var(--info)' }
                            : { background: 'rgba(53,196,147,0.1)',  color: 'var(--brand)' }
                          }>
                          {isEspot ? 'Espot' : 'Directo'}
                        </span>
                      </div>
                    </div>

                    {/* Meta: fecha · hora · salón · personas · status */}
                    <div className="flex items-center gap-x-3 gap-y-1 flex-wrap">
                      <span className="flex items-center gap-1 text-xs font-medium"
                        style={{ color: group === 'hoy' ? 'var(--brand)' : 'var(--text-muted)' }}>
                        <CalendarDays size={10} /> {ds}
                      </span>
                      {(isEspot ? item.b.start_time : item.ev.start_time) && (
                        <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                          <span style={{ color: 'var(--text-muted)' }}>·</span>
                          {isEspot
                            ? `${formatTime(item.b.start_time)} – ${formatTime(item.b.end_time)}`
                            : item.ev.start_time!.slice(0,5)
                          }
                        </span>
                      )}
                      {spaceName && (
                        <span className="flex items-center gap-1 text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                          <Building2 size={10} style={{ color: 'var(--brand)', flexShrink: 0 }} />
                          {spaceName}
                        </span>
                      )}
                      {(isEspot ? item.b.guest_count : item.ev.guest_count) && (
                        <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                          <Users size={10} />
                          {isEspot ? item.b.guest_count : item.ev.guest_count}
                        </span>
                      )}
                      {isEspot
                        ? <StatusBadge status={item.b.status} />
                        : (() => {
                            const st = externalEventStyle(item.ev.status)
                            return st ? (
                              <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full"
                                style={{ background: st.bg, color: st.color }}>
                                <span className="w-1.5 h-1.5 rounded-full" style={{ background: st.color }} />
                                {st.label}
                              </span>
                            ) : null
                          })()
                      }
                    </div>

                    {/* Progreso de cobro (eventos directos con abono parcial) */}
                    {showProgress && (
                      <div className="mt-2">
                        <div className="flex items-center justify-between text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
                          <span>Cobrado {formatCurrency(paidAmt)}</span>
                          <span style={{ color: 'var(--info)' }}>{formatCurrency(totalAmt - paidAmt)} pendiente</span>
                        </div>
                        <div className="h-1 rounded-full overflow-hidden" style={{ background: 'var(--bg-elevated)' }}>
                          <div className="h-1 rounded-full" style={{ width: `${pctPaid}%`, background: 'var(--brand)' }} />
                        </div>
                      </div>
                    )}

                    {/* Aceptar / Rechazar para reservas pendientes de Espot */}
                    {isPending && (
                      <div className="flex gap-2 mt-2">
                        <button onClick={() => handleConfirm(item.b.id)}
                          disabled={actionId === item.b.id}
                          className="flex-1 text-xs font-semibold py-1.5 rounded-lg disabled:opacity-60 inline-flex items-center justify-center gap-1"
                          style={{ background: 'var(--bg-elevated)', color: 'var(--brand)', border: '1px solid var(--border-subtle)' }}>
                          {actionId === item.b.id ? <Loader2 size={12} className="animate-spin" /> : null} Aceptar
                        </button>
                        <button onClick={() => handleReject(item.b.id)}
                          disabled={actionId === item.b.id}
                          className="flex-1 text-xs font-semibold py-1.5 rounded-lg disabled:opacity-60"
                          style={{ background: 'rgba(220,38,38,0.06)', color: 'var(--danger)', border: '1px solid rgba(220,38,38,0.15)' }}>
                          Rechazar
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })

          return (
            <>
              {rows}
              {upcomingItems.length > 10 && (
                <div className="px-5 py-3 text-center" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                  <Link href="/dashboard/host/agenda" className="text-xs font-medium" style={{ color: 'var(--brand)' }}>
                    Ver {upcomingItems.length - 10} eventos más →
                  </Link>
                </div>
              )}
            </>
          )
        })()}
      </div>

      {/* ── Acciones rápidas ── */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { href: '/dashboard/host/eventos/nuevo', icon: Plus,               label: 'Nuevo evento', color: 'var(--brand)', bg: 'rgba(53,196,147,0.1)' },
          { href: '/dashboard/host/calendario',    icon: CalendarDays,       label: 'Calendario',   color: 'var(--info)',      bg: 'rgba(37,99,235,0.08)' },
          { href: '/dashboard/host/mensajes',      icon: MessageCircle,      label: 'Mensajes',     color: 'var(--accent-purple)',      bg: 'rgba(124,58,237,0.08)' },
          { href: '/dashboard/host/clientes',      icon: Users,              label: 'Clientes',     color: '#D97706',      bg: 'rgba(217,119,6,0.08)' },
        ].map(({ href, icon: Icon, label, color, bg }) => (
          <Link key={href} href={href}
            className="rounded-2xl p-3 md:p-4 flex flex-col items-center gap-2 text-center transition-all hover:shadow-md"
            style={{ background: '#fff', border: '1px solid var(--border-subtle)' }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: bg }}>
              <Icon size={16} style={{ color }} />
            </div>
            <span className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>{label}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
