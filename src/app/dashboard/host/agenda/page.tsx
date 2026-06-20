'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import {
  Check, X, Search, Loader2, Plus, LayoutList, Paperclip,
  CalendarDays, ArrowUpDown, CalendarRange,
} from 'lucide-react'
import Pagination from '@/components/ui/Pagination'
import { formatCurrency, formatDate, formatTime, cn, todayInRD } from '@/lib/utils'
import { hostNetOf, platformFeeOf } from '@/lib/pricing'
import { EXTERNAL_EVENT_STATUS } from '@/lib/statusConfig'
import {
  getExternalEvents, updateExternalEvent, addEventPayment,
  deleteExternalEvent, deleteEventPayment,
} from '@/lib/actions/external-events'
import { getHostBookings, acceptBooking, rejectBooking, completeBooking } from '@/lib/actions/host'
import { STATUS_LABELS, STATUS_COLORS } from '@/lib/bookingConfig'
import { createClient } from '@/lib/supabase/client'
import DatePicker from '@/components/ui/DatePicker'
import type { ExternalEvent, ExternalEventStatus, ExternalPaymentMethod } from '@/types'

type Booking      = Awaited<ReturnType<typeof getHostBookings>>[0]
type AgendaItem   = { source: 'espot'; data: Booking } | { source: 'direct'; data: ExternalEvent }
type SimpleStatus = 'all' | 'pendiente' | 'confirmado' | 'completado' | 'cancelado'
type OriginFilter = 'all' | 'espot' | 'directo'

// Estilos de estado de eventos externos: fuente única (statusConfig).
const EXT_STATUS = EXTERNAL_EVENT_STATUS

const ORIGIN_OPTIONS = [
  { value: 'all',     label: 'Todos'   },
  { value: 'espot',   label: 'Espot'   },
  { value: 'directo', label: 'Directo' },
]

const STATUS_OPTIONS: { value: SimpleStatus; label: string }[] = [
  { value: 'all',        label: 'Todos'       },
  { value: 'pendiente',  label: 'Pendientes'  },
  { value: 'confirmado', label: 'Confirmados' },
  { value: 'completado', label: 'Completados' },
  { value: 'cancelado',  label: 'Cancelados'  },
]

function simpleStatus(item: AgendaItem): Exclude<SimpleStatus, 'all'> {
  if (item.source === 'espot') {
    const s = item.data.status
    if (s === 'pending' || s === 'quote_requested') return 'pendiente'
    if (s === 'accepted' || s === 'confirmed')      return 'confirmado'
    if (s === 'completed')                          return 'completado'
    return 'cancelado'
  }
  const s = item.data.status
  if (s === 'pendiente')                       return 'pendiente'
  if (s === 'confirmado' || s === 'en_curso') return 'confirmado'
  if (s === 'completado')                     return 'completado'
  return 'cancelado'
}

function itemKey(item: AgendaItem)    { return `${item.source}-${item.data.id}` }
function itemDate(item: AgendaItem)   { return item.data.event_date }
function itemAmount(item: AgendaItem) { return Number(item.source === 'espot' ? item.data.total_amount : (item.data.total_amount ?? 0)) }

const PAGE_SIZE = 20

const DATE_FILTERS = [
  { key: 'all',     label: 'Todas las fechas' },
  { key: 'upcoming', label: 'Próximas' },
  { key: 'today',   label: 'Hoy' },
  { key: 'week',    label: 'Esta semana' },
  { key: 'month',   label: 'Este mes' },
  { key: 'custom',  label: 'Rango' },
]

function daysFromNow(dateStr: string): { label: string; urgent: boolean; isPast: boolean } {
  const d = new Date(dateStr + 'T12:00:00Z')
  const today = new Date(todayInRD() + 'T12:00:00Z')
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000)
  if (diff === 0) return { label: 'Hoy',                           urgent: true,  isPast: false }
  if (diff === 1) return { label: 'Mañana',                        urgent: true,  isPast: false }
  if (diff > 0)   return { label: `En ${diff} día${diff>1?'s':''}`, urgent: diff <= 7, isPast: false }
  return            { label: `Hace ${Math.abs(diff)}d`,            urgent: false, isPast: true  }
}

function itemTitle(item: AgendaItem): string {
  if (item.source === 'espot') return (item.data as any).profiles?.full_name ?? 'Cliente'
  return item.data.title
}

function itemSubtitle(item: AgendaItem): string {
  if (item.source === 'espot') return item.data.event_type ?? '—'
  const client = (item.data as any).client_name ?? item.data.client?.full_name ?? ''
  return [client, item.data.event_type].filter(Boolean).join(' · ') || '—'
}

function itemStatusChip(item: AgendaItem): { label: string; color: string; bg: string } {
  if (item.source === 'espot') {
    const sc = STATUS_COLORS[item.data.status as keyof typeof STATUS_COLORS] ?? { color: '#6B7280', bg: 'var(--bg-elevated)' }
    const sl = STATUS_LABELS[item.data.status as keyof typeof STATUS_LABELS] ?? item.data.status
    return { label: sl, color: sc.color, bg: sc.bg }
  }
  return EXT_STATUS[item.data.status]
}

// ── Main page ────────────────────────────────────────────────────
export default function AgendaPage() {
  const [items,    setItems]    = useState<AgendaItem[]>([])
  const [loading,  setLoading]  = useState(true)
  const [origin,   setOrigin]   = useState<OriginFilter>('all')
  const [status,   setStatus]   = useState<SimpleStatus>('all')
  const [dateFilter, setDateFilter] = useState('all')
  const [dateFrom,   setDateFrom]   = useState('')
  const [dateTo,     setDateTo]     = useState('')
  const [sortOrder,  setSortOrder]  = useState<'priority'|'date_asc'|'date_desc'|'recent'>('priority')
  const [search,   setSearch]   = useState('')
  const [selected, setSelected] = useState<AgendaItem | null>(null)
  // En móvil el panel de detalle queda debajo de la lista: al seleccionar, llévalo a la vista
  const detailRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (selected && typeof window !== 'undefined' && window.innerWidth < 1024)
      detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [selected])
  const [toast,    setToast]    = useState<{ msg: string; ok: boolean } | null>(null)
  const [actionId,       setActionId]       = useState<string | null>(null)
  const [rejectReason,   setRejectReason]   = useState('')
  const [showRejectForm, setShowRejectForm] = useState(false)
  const [page,           setPage]           = useState(1)

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3000)
  }

  useEffect(() => {
    setLoading(true)
    Promise.all([
      getHostBookings().catch(() => [] as Booking[]),
      getExternalEvents().catch(() => [] as ExternalEvent[]),
    ]).then(([bookings, events]) => {
      const all: AgendaItem[] = [
        ...bookings.map(b => ({ source: 'espot'   as const, data: b })),
        ...events.map(e  => ({ source: 'direct'   as const, data: e })),
      ]
      setItems(all)
      setLoading(false)
    })
  }, [])

  // Reset page when filters change
  useEffect(() => { setPage(1) }, [origin, status, dateFilter, dateFrom, dateTo, sortOrder, search])

  const todayStr = todayInRD()

  const statusPriority = (item: AgendaItem): number => {
    const s = simpleStatus(item)
    if (s === 'pendiente')  return 0
    if (s === 'confirmado') return 1
    if (s === 'completado') return 2
    return 3
  }

  const filtered = items
    .filter(item => {
      if (origin !== 'all') {
        if (origin === 'espot'   && item.source !== 'espot')  return false
        if (origin === 'directo' && item.source !== 'direct') return false
      }
      if (status !== 'all' && simpleStatus(item) !== status) return false
      // Date filter
      const bDate = itemDate(item)
      if (dateFilter === 'upcoming') { if (bDate < todayStr) return false }
      else if (dateFilter === 'today') { if (bDate !== todayStr) return false }
      else if (dateFilter === 'week') {
        const cutoff = new Date(todayStr + 'T12:00:00Z'); cutoff.setUTCDate(cutoff.getUTCDate() + 7)
        const cutoffStr = cutoff.toISOString().split('T')[0]
        if (bDate < todayStr || bDate > cutoffStr) return false
      } else if (dateFilter === 'month') {
        // Fin de mes en hora RD (último día del mes de todayStr)
        const [yy, mm] = todayStr.split('-').map(Number)
        const end = new Date(Date.UTC(yy, mm, 0)).toISOString().split('T')[0]
        if (bDate < todayStr || bDate > end) return false
      } else if (dateFilter === 'custom') {
        if (dateFrom && bDate < dateFrom) return false
        if (dateTo   && bDate > dateTo)   return false
      }
      // Text search
      const q = search.toLowerCase()
      if (!q) return true
      return (
        itemTitle(item).toLowerCase().includes(q) ||
        itemSubtitle(item).toLowerCase().includes(q) ||
        itemDate(item).includes(q)
      )
    })
    .sort((a, b_) => {
      if (sortOrder === 'date_asc')  return itemDate(a).localeCompare(itemDate(b_))
      if (sortOrder === 'date_desc') return itemDate(b_).localeCompare(itemDate(a))
      if (sortOrder === 'recent') {
        return new Date((b_.data as any).created_at ?? 0).getTime() - new Date((a.data as any).created_at ?? 0).getTime()
      }
      // priority: status priority then date
      const pd = statusPriority(a) - statusPriority(b_)
      return pd !== 0 ? pd : itemDate(a).localeCompare(itemDate(b_))
    })

  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  // Próxima reserva/evento activo
  const nextItem = items
    .filter(item => simpleStatus(item) === 'confirmado' && itemDate(item) >= todayStr)
    .sort((a, b_) => itemDate(a).localeCompare(itemDate(b_)))[0] ?? null

  const pendingEspot = items.filter(i =>
    i.source === 'espot' && (i.data.status === 'pending' || i.data.status === 'quote_requested')
  ).length

  // ── Espot booking actions ────────────────────────────────────
  function patchBooking(id: string, patch: Partial<Booking>) {
    setItems(prev => prev.map(item =>
      item.source === 'espot' && item.data.id === id
        ? { ...item, data: { ...item.data, ...patch } } : item
    ))
    setSelected(prev =>
      prev?.source === 'espot' && prev.data.id === id
        ? { ...prev, data: { ...prev.data, ...patch } } : prev
    )
  }

  async function doAccept(id: string) {
    setActionId(id + 'a')
    const r = await acceptBooking(id)
    if (!('error' in r)) { patchBooking(id, { status: 'accepted' as const }); showToast('Reserva aceptada', true) }
    else showToast((r as any).error ?? 'Error', false)
    setActionId(null)
  }

  async function doReject(id: string) {
    setActionId(id + 'r')
    const r = await rejectBooking(id, rejectReason || undefined)
    if (!('error' in r)) {
      patchBooking(id, { status: 'rejected' as const })
      setShowRejectForm(false); setRejectReason('')
      showToast('Reserva rechazada', true)
    } else showToast((r as any).error ?? 'Error', false)
    setActionId(null)
  }

  async function doComplete(id: string) {
    setActionId(id + 'c')
    const r = await completeBooking(id)
    if (!('error' in r)) { patchBooking(id, { status: 'completed' as const }); showToast('Evento completado', true) }
    else showToast((r as any).error ?? 'Error', false)
    setActionId(null)
  }

  // ── Direct event actions ─────────────────────────────────────
  function patchEvent(updated: ExternalEvent) {
    setItems(prev => prev.map(item =>
      item.source === 'direct' && item.data.id === updated.id
        ? { ...item, data: updated } : item
    ))
    setSelected(prev =>
      prev?.source === 'direct' && prev.data.id === updated.id
        ? { ...prev, data: updated } : prev
    )
  }

  function removeEvent(id: string) {
    setItems(prev => prev.filter(item => !(item.source === 'direct' && item.data.id === id)))
    setSelected(null)
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      {toast && (
        <div className="fixed top-16 right-4 md:top-5 md:right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold shadow-xl"
          style={{ background: toast.ok ? '#16A34A' : '#DC2626', color: '#fff' }}>
          {toast.ok ? <Check size={14} /> : <X size={14} />} {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Reservas</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {items.length} eventos en total
            {pendingEspot > 0 && <span className="ml-2 font-semibold" style={{ color: '#D97706' }}>· {pendingEspot} por aceptar</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex rounded-xl overflow-hidden" style={{ border: '1px solid var(--border-subtle)' }}>
            <span className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold"
              style={{ background: 'var(--brand)', color: '#fff' }}>
              <LayoutList size={13} /> Reservas
            </span>
            <Link href="/dashboard/host/calendario"
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold transition-colors"
              style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>
              <CalendarDays size={13} /> Calendario
            </Link>
          </div>
          <Link href="/dashboard/host/eventos/nuevo"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all active:scale-95"
            style={{ background: 'var(--brand)' }}>
            <Plus size={15} /> Nuevo evento
          </Link>
        </div>
      </div>

      {/* Banner: próximo evento confirmado */}
      {nextItem && (() => {
        const dfl = daysFromNow(itemDate(nextItem))
        const isEspot = nextItem.source === 'espot'
        const chip = itemStatusChip(nextItem)
        return (
          <div className="rounded-2xl p-4 mb-5 flex items-center justify-between gap-3"
            style={{ background: 'rgba(53,196,147,0.06)', border: '1.5px solid rgba(53,196,147,0.25)' }}>
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: 'rgba(53,196,147,0.14)' }}>
                <CalendarDays size={18} style={{ color: 'var(--brand)' }} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: 'var(--brand)' }}>Próximo evento</span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                    style={isEspot
                      ? { background: 'rgba(53,196,147,0.15)', color: '#16A34A' }
                      : { background: 'rgba(37,99,235,0.1)', color: '#2563EB' }}>
                    {isEspot ? 'Espot' : 'Directo'}
                  </span>
                </div>
                <div className="text-sm font-bold truncate" style={{ color: 'var(--text-primary)' }}>
                  {itemTitle(nextItem)}{itemSubtitle(nextItem) !== '—' ? ` · ${itemSubtitle(nextItem)}` : ''}
                </div>
                <div className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>
                  {formatDate(itemDate(nextItem))}
                  {nextItem.source === 'espot' && (nextItem.data as any).start_time
                    ? ` · ${(nextItem.data as any).start_time?.slice(0,5)} – ${(nextItem.data as any).end_time?.slice(0,5)}`
                    : ''}
                  {(nextItem.source === 'espot' ? (nextItem.data as any).guest_count : (nextItem.data as any).guest_count)
                    ? ` · ${(nextItem.data as any).guest_count} personas` : ''}
                </div>
              </div>
            </div>
            <div className="text-right shrink-0">
              <span className="text-xs font-bold px-2.5 py-1 rounded-full block mb-1"
                style={{ background: dfl.urgent ? 'rgba(53,196,147,0.18)' : 'var(--bg-elevated)', color: dfl.urgent ? 'var(--brand)' : 'var(--text-secondary)' }}>
                {dfl.label}
              </span>
              {itemAmount(nextItem) > 0 && (
                <div className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                  {formatCurrency(itemAmount(nextItem))}
                </div>
              )}
            </div>
          </div>
        )
      })()}

      {/* Origin cards */}
      <div className="grid grid-cols-3 gap-3 mb-3">
        {([
          { value: 'all',     label: 'Todos',   count: items.length,
            dot: '#94A3B8', activeBg: '#EEF2F7', activeBorder: '#94A3B8', activeNum: 'var(--text-primary)', activeLabel: '#64748B' },
          { value: 'espot',   label: 'Espot',   count: items.filter(i => i.source === 'espot').length,
            dot: 'var(--brand)', activeBg: 'rgba(53,196,147,0.1)', activeBorder: 'var(--brand)', activeNum: '#0D7A56', activeLabel: 'var(--brand)' },
          { value: 'directo', label: 'Directo', count: items.filter(i => i.source === 'direct').length,
            dot: '#818CF8', activeBg: 'rgba(99,102,241,0.08)', activeBorder: '#818CF8', activeNum: '#4338CA', activeLabel: '#818CF8' },
        ] as const).map(o => {
          const active = origin === o.value
          return (
            <button key={o.value} onClick={() => setOrigin(o.value)}
              className="flex flex-col items-start p-3 md:p-4 rounded-2xl transition-all text-left"
              style={{
                background: active ? o.activeBg : 'var(--bg-card)',
                border: `2px solid ${active ? o.activeBorder : 'var(--border-subtle)'}`,
              }}>
              <div className="flex items-center gap-1.5 mb-2">
                <div className="w-2 h-2 rounded-full shrink-0"
                  style={{ background: active ? o.dot : '#D1D5DB' }} />
                <span className="text-xs font-semibold"
                  style={{ color: active ? o.activeLabel : 'var(--text-muted)' }}>
                  {o.label}
                </span>
              </div>
              <span className="text-2xl font-bold leading-none"
                style={{ color: active ? o.activeNum : 'var(--text-primary)' }}>
                {o.count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Status + fecha + búsqueda */}
      <div className="flex flex-col gap-2 mb-5">
        {/* Status pills */}
        <div className="flex gap-1 p-1 rounded-xl overflow-x-auto scrollbar-hide"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
          {STATUS_OPTIONS.map(o => (
            <button key={o.value} onClick={() => setStatus(o.value)}
              className="flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap text-center"
              style={status === o.value ? { background: 'var(--brand)', color: '#fff' } : { color: '#6B7280' }}>
              {o.label}
            </button>
          ))}
        </div>

        {/* Date filter pills + sort */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex flex-1 gap-1 p-1 rounded-xl overflow-x-auto scrollbar-hide"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
            {DATE_FILTERS.map(f => {
              const active = dateFilter === f.key
              return (
                <button key={f.key} onClick={() => setDateFilter(f.key)}
                  className="flex-1 flex items-center justify-center gap-1 py-2 px-2 rounded-lg text-xs font-medium transition-all whitespace-nowrap text-center min-h-[36px]"
                  style={active ? { background: 'var(--text-primary)', color: '#fff' } : { color: '#6B7280' }}>
                  {f.key === 'custom' && <CalendarRange size={11} />}
                  {f.label}
                </button>
              )
            })}
          </div>
          <button
            onClick={() => setSortOrder(s => s === 'priority' ? 'date_asc' : s === 'date_asc' ? 'date_desc' : s === 'date_desc' ? 'recent' : 'priority')}
            className="flex items-center justify-center gap-1.5 px-3 rounded-xl text-xs font-medium transition-all min-h-[36px]"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', color: '#6B7280' }}
            title="Cambiar orden">
            <ArrowUpDown size={12} />
            {sortOrder === 'priority' ? 'Por estado' : sortOrder === 'date_asc' ? 'Fecha ↑' : sortOrder === 'date_desc' ? 'Fecha ↓' : 'Recientes'}
          </button>
        </div>

        {/* Rango personalizado */}
        {dateFilter === 'custom' && (
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium px-1" style={{ color: 'var(--text-muted)' }}>Desde</span>
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                className="w-full rounded-xl px-3 py-2.5 focus:outline-none"
                style={{ background: 'var(--bg-card)', border: '1.5px solid var(--border-medium)', color: 'var(--text-primary)', fontSize: 16 }} />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium px-1" style={{ color: 'var(--text-muted)' }}>Hasta</span>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                className="w-full rounded-xl px-3 py-2.5 focus:outline-none"
                style={{ background: 'var(--bg-card)', border: '1.5px solid var(--border-medium)', color: 'var(--text-primary)', fontSize: 16 }} />
            </div>
            {(dateFrom || dateTo) && (
              <button onClick={() => { setDateFrom(''); setDateTo('') }}
                className="col-span-2 text-xs px-3 py-2 rounded-xl"
                style={{ color: '#DC2626', background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.15)' }}>
                Limpiar rango
              </button>
            )}
          </div>
        )}

        {/* Búsqueda */}
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
          <Search size={15} className="text-gray-400 shrink-0" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar cliente, tipo de evento..."
            className="bg-transparent text-sm flex-1 focus:outline-none text-gray-700 placeholder-gray-400"
            style={{ fontSize: 16 }} />
          {search && <button onClick={() => setSearch('')} className="text-gray-400"><X size={14} /></button>}
          {(status !== 'all' || dateFilter !== 'all' || origin !== 'all' || search) && (
            <span className="text-xs text-gray-400 shrink-0">{filtered.length} resultado{filtered.length !== 1 ? 's' : ''}</span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className={cn('flex flex-col gap-5 items-start', selected && 'lg:grid lg:grid-cols-[1fr_380px]')}>
        {/* List */}
        <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
          <div className="overflow-x-auto scrollbar-hide">
            <div className="hidden md:grid gap-3 px-5 py-3 text-xs font-semibold uppercase tracking-widest text-gray-400 md:min-w-[520px]"
              style={{ gridTemplateColumns: '2fr 1fr 1fr auto', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-elevated)' }}>
              <span>Evento</span><span>Fecha</span><span>Total</span><span>Estado</span>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--brand)' }} />
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-16">
                <LayoutList size={32} className="mx-auto mb-3 text-gray-200" />
                <p className="text-sm text-gray-400">
                  {search || status !== 'all' || origin !== 'all' ? 'Sin resultados' : 'Sin eventos registrados'}
                </p>
                {!search && status === 'all' && origin === 'all' && (
                  <Link href="/dashboard/host/eventos/nuevo"
                    className="mt-3 inline-block text-sm font-semibold" style={{ color: 'var(--brand)' }}>
                    Registrar primer evento
                  </Link>
                )}
              </div>
            ) : (
              <div className="divide-y divide-[var(--border-subtle)]">
                {paginated.map(item => {
                  const k         = itemKey(item)
                  const chip      = itemStatusChip(item)
                  const amt       = itemAmount(item)
                  const isEspot   = item.source === 'espot'
                  const isSelected = selected ? itemKey(selected) === k : false
                  const balance   = !isEspot && (item.data as ExternalEvent).total_amount
                    ? (item.data as ExternalEvent).total_amount! - ((item.data as ExternalEvent).paid_amount ?? 0)
                    : null
                  const dfl = daysFromNow(itemDate(item))
                  return (
                    <button key={k}
                      onClick={() => { setSelected(isSelected ? null : item); setShowRejectForm(false); setRejectReason('') }}
                      className={cn(
                        'w-full flex flex-col md:grid gap-2 md:gap-3 md:items-center px-5 py-4 md:min-w-[520px] text-left transition-colors hover:bg-slate-50',
                        isSelected && 'bg-slate-50'
                      )}
                      style={{ gridTemplateColumns: '2fr 1fr 1fr auto', borderLeft: `3px solid ${isEspot ? 'var(--brand)' : '#2563EB'}` }}>
                      <div className="min-w-0">
                        <div className="mb-0.5">
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                            style={isEspot
                              ? { background: 'rgba(53,196,147,0.12)', color: '#16A34A' }
                              : { background: 'rgba(37,99,235,0.08)', color: '#2563EB' }}>
                            {isEspot ? 'Espot' : 'Directo'}
                          </span>
                        </div>
                        <div className="font-semibold text-sm truncate" style={{ color: 'var(--text-primary)' }}>
                          {itemTitle(item)}
                        </div>
                        <div className="text-xs text-gray-400 truncate">{itemSubtitle(item)}</div>
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm text-gray-600">{formatDate(itemDate(item))}</div>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                          style={dfl.isPast
                            ? { background: 'rgba(107,114,128,0.1)', color: '#6B7280' }
                            : dfl.urgent
                            ? { background: 'rgba(53,196,147,0.12)', color: 'var(--brand)' }
                            : { background: 'var(--bg-elevated)', color: '#9CA3AF' }}>
                          {dfl.label}
                        </span>
                      </div>
                      <div className="text-sm">
                        <div className="font-bold" style={{ color: 'var(--text-primary)' }}>
                          {amt > 0 ? formatCurrency(amt) : '—'}
                        </div>
                        {balance !== null && balance > 0 && (
                          <div className="text-xs text-orange-500">Pend: {formatCurrency(balance)}</div>
                        )}
                      </div>
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full shrink-0"
                        style={{ background: chip.bg, color: chip.color }}>
                        {chip.label}
                      </span>
                    </button>
                  )
                })}
              </div>
            )}
            <Pagination page={page} total={filtered.length} pageSize={PAGE_SIZE} onChange={p => { setPage(p); setSelected(null) }} className="px-5 pb-4" />
          </div>
        </div>

        {/* Detail panel */}
        <div ref={detailRef}>
        {selected ? (
          selected.source === 'espot' ? (
            <EspotPanel
              booking={selected.data as any}
              actionId={actionId}
              rejectReason={rejectReason}
              showRejectForm={showRejectForm}
              onClose={() => { setSelected(null); setShowRejectForm(false); setRejectReason('') }}
              onAccept={() => doAccept((selected.data as Booking).id)}
              onReject={() => doReject((selected.data as Booking).id)}
              onComplete={() => doComplete((selected.data as Booking).id)}
              setRejectReason={setRejectReason}
              setShowRejectForm={setShowRejectForm}
            />
          ) : (
            <DirectPanel
              event={selected.data as ExternalEvent}
              onClose={() => setSelected(null)}
              onUpdated={patchEvent}
              onDeleted={() => { removeEvent((selected.data as ExternalEvent).id); showToast('Evento eliminado', true) }}
              showToast={showToast}
            />
          )
        ) : (
          <div className="rounded-2xl p-8 text-center" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
            <LayoutList size={24} className="mx-auto mb-3 text-gray-300" />
            <p className="text-sm text-gray-400">Selecciona un evento para ver el detalle</p>
          </div>
        )}
        </div>
      </div>
    </div>
  )
}

// ── Espot booking detail panel ───────────────────────────────────
function EspotPanel({ booking, actionId, rejectReason, showRejectForm, onClose, onAccept, onReject, onComplete, setRejectReason, setShowRejectForm }: {
  booking: any
  actionId: string | null
  rejectReason: string
  showRejectForm: boolean
  onClose: () => void
  onAccept: () => void
  onReject: () => void
  onComplete: () => void
  setRejectReason: (v: string) => void
  setShowRejectForm: (v: boolean) => void
}) {
  const [insts, setInsts] = useState<any[]>([])
  useEffect(() => {
    let cancelled = false
    import('@/lib/actions/installments')
      .then(m => m.getInstallments(booking.id))
      .then(data => { if (!cancelled) setInsts(data) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [booking.id])

  const sc = STATUS_COLORS[booking.status as keyof typeof STATUS_COLORS] ?? { color: '#6B7280', bg: 'var(--bg-elevated)' }
  const sl = STATUS_LABELS[booking.status as keyof typeof STATUS_LABELS] ?? booking.status
  const g  = booking.profiles

  return (
    <div className="rounded-2xl overflow-hidden sticky top-8"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
      <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded"
              style={{ background: 'rgba(53,196,147,0.12)', color: '#16A34A' }}>Espot</span>
            <span className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>Detalle de reserva</span>
          </div>
          <div className="text-xs text-gray-400 mt-0.5">ID: {booking.id.slice(0, 8).toUpperCase()}</div>
        </div>
        <div className="flex items-center gap-1">
          <Link href={`/dashboard/host/reservas/${booking.id}`}
            className="text-xs px-3 py-1.5 rounded-lg font-semibold hover:bg-slate-100 text-gray-500">
            Detalle ↗
          </Link>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-gray-400"><X size={13} /></button>
        </div>
      </div>

      {showRejectForm && (
        <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--border-subtle)', background: 'rgba(220,38,38,0.02)' }}>
          <p className="text-xs font-semibold mb-2" style={{ color: '#DC2626' }}>Motivo de rechazo (opcional)</p>
          <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)}
            placeholder="Ej: Sin disponibilidad para esa fecha" rows={2}
            className="w-full text-xs px-3 py-2 rounded-xl resize-none focus:outline-none"
            style={{ background: 'var(--bg-elevated)', border: '1.5px solid #E8ECF0', color: 'var(--text-primary)' }} />
          <div className="flex gap-2 mt-2">
            <button onClick={onReject} disabled={!!actionId}
              className="flex-1 text-xs font-semibold py-2 rounded-xl disabled:opacity-50"
              style={{ background: '#DC2626', color: '#fff' }}>
              {actionId ? 'Enviando...' : 'Confirmar rechazo'}
            </button>
            <button onClick={() => { setShowRejectForm(false); setRejectReason('') }}
              className="px-3 py-2 text-xs rounded-xl"
              style={{ background: 'var(--bg-elevated)', color: '#6B7280' }}>Cancelar</button>
          </div>
        </div>
      )}

      <div className="p-5 space-y-4">
        <div className="py-2 px-3 rounded-xl text-xs font-semibold text-center"
          style={{ background: sc.bg, color: sc.color }}>{sl}</div>

        <div>
          <div className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-1">Cliente</div>
          <div className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{g?.full_name ?? '—'}</div>
          {g?.email && <div className="text-xs text-gray-500">{g.email}</div>}
          {g?.phone && <a href={`tel:${g.phone}`} className="text-xs" style={{ color: 'var(--brand)' }}>{g.phone}</a>}
        </div>

        <div className="rounded-xl p-4 space-y-2" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
          {([
            { label: 'Tipo',     value: booking.event_type ?? '—' },
            { label: 'Fecha',    value: formatDate(booking.event_date) },
            { label: 'Horario',  value: booking.start_time ? `${formatTime(booking.start_time)} – ${formatTime(booking.end_time)}` : '—' },
            { label: 'Personas', value: String(booking.guest_count) },
            ...(booking.spaces?.name ? [{ label: 'Espacio', value: booking.spaces.name }] : []),
          ] as { label: string; value: string }[]).map(({ label, value }) => (
            <div key={label} className="flex items-baseline justify-between gap-4 text-sm">
              <span className="text-gray-500 shrink-0">{label}</span>
              <span className="font-medium text-right break-words min-w-0" style={{ color: 'var(--text-primary)' }}>{value}</span>
            </div>
          ))}
        </div>

        {booking.space_pricing?.pricing_type === 'fixed_package' && booking.space_pricing?.package_includes && (
          <div>
            <div className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-1">
              {booking.space_pricing.package_name ? `Paquete · ${booking.space_pricing.package_name}` : 'Incluye'}
            </div>
            <div className="rounded-xl px-3 py-2.5 text-xs whitespace-pre-line"
              style={{ background: 'rgba(53,196,147,0.05)', border: '1px solid rgba(53,196,147,0.15)', color: '#6B7280' }}>
              {booking.space_pricing.package_includes}
            </div>
          </div>
        )}

        <div className="rounded-xl p-4 space-y-2" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Total evento</span>
            <span className="font-bold" style={{ color: 'var(--text-primary)' }}>{formatCurrency(Number(booking.total_amount))}</span>
          </div>
          <div className="flex justify-between text-sm text-gray-500">
            <span>Comisión Espot (10%)</span>
            <span>{formatCurrency(platformFeeOf(booking))}</span>
          </div>
          <div className="flex justify-between text-sm font-bold pt-1"
            style={{ borderTop: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}>
            <span>Tu neto</span>
            <span style={{ color: 'var(--brand)' }}>{formatCurrency(hostNetOf(booking))}</span>
          </div>
        </div>

        {insts.length > 0 && (
          <div>
            <div className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">
              Cuotas · {insts.filter((i: any) => i.status === 'paid').length}/{insts.length} pagadas
            </div>
            <div className="space-y-1.5">
              {insts.map((inst: any) => (
                <div key={inst.id} className="flex items-center justify-between text-xs py-2 px-3 rounded-lg"
                  style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
                  <div>
                    <span className="font-semibold text-gray-700">Cuota {inst.installment_number}</span>
                    <span className="text-gray-400 ml-2">{inst.due_date}</span>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-xs" style={{ color: 'var(--text-primary)' }}>{formatCurrency(Number(inst.amount))}</div>
                    <div className="text-[11px] font-semibold"
                      style={{ color: inst.status === 'paid' ? 'var(--brand)' : inst.status === 'overdue' ? '#DC2626' : '#6B7280' }}>
                      {inst.status === 'paid' ? 'Recibido' : inst.status === 'overdue' ? 'Vencido' : 'Pendiente'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {(booking.status === 'pending' || booking.status === 'quote_requested') && !showRejectForm && (
          <div className="flex gap-2">
            <button onClick={onAccept} disabled={!!actionId}
              className="flex-1 flex items-center justify-center gap-1 text-xs font-semibold py-2.5 rounded-xl disabled:opacity-50"
              style={{ background: 'var(--brand)', color: '#fff' }}>
              <Check size={13} /> Aceptar
            </button>
            <button onClick={() => setShowRejectForm(true)}
              className="flex-1 flex items-center justify-center gap-1 text-xs font-semibold py-2.5 rounded-xl"
              style={{ background: 'rgba(220,38,38,0.1)', color: '#DC2626', border: '1px solid rgba(220,38,38,0.2)' }}>
              <X size={13} /> Rechazar
            </button>
          </div>
        )}
        {booking.status === 'accepted' && (
          <div className="rounded-xl px-3 py-2.5 text-xs text-center"
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', color: '#6B7280' }}>
            Esperando pago del cliente
          </div>
        )}
        {booking.status === 'confirmed' && (
          <button onClick={onComplete} disabled={!!actionId}
            className="w-full text-xs font-semibold py-2.5 rounded-xl disabled:opacity-50"
            style={{ background: 'var(--bg-elevated)', color: '#6B7280', border: '1px solid var(--border-subtle)' }}>
            {actionId ? 'Procesando...' : 'Marcar como completado'}
          </button>
        )}
      </div>
    </div>
  )
}

// ── Direct event detail panel ────────────────────────────────────
function DirectPanel({ event, onClose, onUpdated, onDeleted, showToast }: {
  event: ExternalEvent
  onClose: () => void
  onUpdated: (ev: ExternalEvent) => void
  onDeleted: () => void
  showToast: (msg: string, ok: boolean) => void
}) {
  const [saving,      setSaving]      = useState(false)
  const [deleting,    setDeleting]    = useState(false)
  const [showPay,     setShowPay]     = useState(false)
  const [receiptFile, setReceiptFile] = useState<File | null>(null)
  const [payForm,     setPayForm]     = useState({
    amount: '', method: 'efectivo' as ExternalPaymentMethod,
    date: todayInRD(), notes: '', is_deposit: false,
  })
  const supabaseRef = useRef(createClient())

  const client  = (event as any).client_name ?? event.client?.full_name ?? ''
  const balance = (event.total_amount ?? 0) - (event.paid_amount ?? 0)

  async function handleStatusChange(status: ExternalEventStatus) {
    if (status === 'pendiente' && event.status === 'confirmado') {
      if (!confirm('¿Volver el evento a "Pendiente"? Se quitará del calendario sincronizado.')) return
    }
    setSaving(true)
    const r = await updateExternalEvent({ id: event.id, status })
    if ('error' in r) {
      showToast(`Error: ${r.error ?? 'no se pudo cambiar el estado'}`, false)
    } else {
      onUpdated({ ...event, status })
      showToast('Estado actualizado', true)
    }
    setSaving(false)
  }

  async function handleAddPayment(e: React.FormEvent) {
    e.preventDefault()
    if (!payForm.amount || Number(payForm.amount) <= 0) return
    setSaving(true)

    // Upload receipt if provided
    let receipt_url: string | undefined
    if (receiptFile) {
      const supabase = supabaseRef.current
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const ext  = receiptFile.name.split('.').pop()
        const path = `${user.id}/receipts/${event.id}/${Date.now()}.${ext}`
        const { data: uploaded } = await supabase.storage
          .from('host-documents')
          .upload(path, receiptFile, { upsert: true })
        if (uploaded) {
          const { data: { publicUrl } } = supabase.storage.from('host-documents').getPublicUrl(path)
          receipt_url = publicUrl
        }
      }
    }

    const r = await addEventPayment({
      event_id: event.id, amount: Number(payForm.amount),
      payment_method: payForm.method, payment_date: payForm.date,
      notes: payForm.notes, is_deposit: payForm.is_deposit,
      receipt_url,
    })
    if (!('error' in r)) {
      const newPaid = (event.paid_amount ?? 0) + Number(payForm.amount)
      onUpdated({ ...event, paid_amount: newPaid, payments: [...(event.payments ?? []), (r as any).data] })
      setShowPay(false)
      setReceiptFile(null)
      setPayForm({ amount: '', method: 'efectivo', date: todayInRD(), notes: '', is_deposit: false })
      showToast('Pago registrado', true)
    }
    setSaving(false)
  }

  async function handleDeletePayment(paymentId: string, amount: number) {
    if (!confirm('¿Eliminar este pago?')) return
    const r = await deleteEventPayment(paymentId)
    if (!('error' in r)) {
      onUpdated({
        ...event,
        paid_amount: Math.max(0, (event.paid_amount ?? 0) - amount),
        payments: (event.payments ?? []).filter(p => p.id !== paymentId),
      })
    }
  }

  async function handleDelete() {
    if (!confirm('¿Eliminar este evento? No se puede deshacer.')) return
    setDeleting(true)
    const r = await deleteExternalEvent(event.id)
    if (!('error' in r)) onDeleted()
    setDeleting(false)
  }

  return (
    <div className="rounded-2xl overflow-hidden sticky top-8"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
      <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded"
              style={{ background: 'rgba(37,99,235,0.08)', color: '#2563EB' }}>Directo</span>
            <span className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>Detalle del evento</span>
          </div>
          <div className="text-xs text-gray-400 mt-0.5">ID: {event.id.slice(0, 8).toUpperCase()}</div>
        </div>
        <div className="flex items-center gap-1">
          <Link href={`/dashboard/host/eventos/nuevo?id=${event.id}`}
            className="text-xs px-3 py-1.5 rounded-lg font-semibold hover:bg-slate-100 text-gray-500">
            Editar
          </Link>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-gray-400"><X size={13} /></button>
        </div>
      </div>

      <div className="p-5 space-y-4">
        <div>
          <div className="font-semibold text-sm mb-3" style={{ color: 'var(--text-primary)' }}>{event.title}</div>
          <div className="rounded-xl p-4 space-y-2" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
            {([
              { label: 'Tipo',     value: event.event_type ?? '—' },
              { label: 'Fecha',    value: formatDate(event.event_date) },
              ...(event.start_time ? [{ label: 'Horario', value: `${formatTime(event.start_time)}${event.end_time ? ` – ${formatTime(event.end_time)}` : ''}` }] : []),
              ...(event.guest_count ? [{ label: 'Personas', value: String(event.guest_count) }] : []),
              ...(event.space?.name ? [{ label: 'Espacio', value: event.space.name }] : []),
            ] as { label: string; value: string }[]).map(({ label, value }) => (
              <div key={label} className="flex items-baseline justify-between gap-4 text-sm">
                <span className="text-gray-500 shrink-0">{label}</span>
                <span className="font-medium text-right break-words min-w-0" style={{ color: 'var(--text-primary)' }}>{value}</span>
              </div>
            ))}
          </div>
        </div>

        {client && (
          <div>
            <div className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-1">Cliente</div>
            <div className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{client}</div>
            {event.client?.email && <div className="text-xs text-gray-500">{event.client.email}</div>}
            {event.client?.phone && <div className="text-xs text-gray-500">{event.client.phone}</div>}
          </div>
        )}

        <div className="rounded-xl p-4 space-y-2"
          style={{ background: 'rgba(53,196,147,0.05)', border: '1px solid rgba(53,196,147,0.15)' }}>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Total evento</span>
            <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{event.total_amount ? formatCurrency(event.total_amount) : '—'}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Cobrado</span>
            <span className="font-semibold" style={{ color: '#16A34A' }}>{formatCurrency(event.paid_amount ?? 0)}</span>
          </div>
          {event.total_amount && balance > 0 && (
            <div className="flex justify-between text-sm font-bold pt-1"
              style={{ borderTop: '1px solid rgba(53,196,147,0.15)', color: '#D97706' }}>
              <span>Pendiente</span><span>{formatCurrency(balance)}</span>
            </div>
          )}
        </div>

        {(event.payments?.length ?? 0) > 0 && (
          <div>
            <div className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">Pagos registrados</div>
            <div className="space-y-1.5">
              {event.payments!.map(p => (
                <div key={p.id} className="flex items-center justify-between text-xs py-1.5 px-3 rounded-lg group"
                  style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
                  <div className="min-w-0">
                    <span className="font-semibold text-gray-700">{formatCurrency(p.amount)}</span>
                    <span className="text-gray-400 ml-2">{formatDate(p.payment_date)} · {p.payment_method}</span>
                    {p.is_deposit && <span className="ml-1 text-purple-600">· Depósito</span>}
                    {(p as any).receipt_url && (
                      <a href={(p as any).receipt_url} target="_blank" rel="noopener noreferrer"
                        className="ml-2 inline-flex items-center gap-0.5 text-[10px] font-semibold"
                        style={{ color: 'var(--brand)' }}>
                        <Paperclip size={9} /> Ver
                      </a>
                    )}
                  </div>
                  <button onClick={() => handleDeletePayment(p.id, p.amount)}
                    className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition-all shrink-0">
                    <X size={11} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {showPay ? (
          <form onSubmit={handleAddPayment} className="rounded-xl p-4 space-y-3"
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
            <div className="text-xs font-semibold text-gray-600">Registrar pago</div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Monto (RD$)</label>
                <input type="number" required min="1" value={payForm.amount}
                  onChange={e => setPayForm(f => ({ ...f, amount: e.target.value }))}
                  placeholder="0" className="w-full px-3 py-2 rounded-lg text-sm border focus:outline-none"
                  style={{ border: '1px solid var(--border-subtle)', fontSize: 16 }} />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Método</label>
                <select value={payForm.method}
                  onChange={e => setPayForm(f => ({ ...f, method: e.target.value as ExternalPaymentMethod }))}
                  className="w-full px-3 py-2 rounded-lg text-sm border focus:outline-none"
                  style={{ border: '1px solid var(--border-subtle)', fontSize: 16 }}>
                  <option value="efectivo">Efectivo</option>
                  <option value="transferencia">Transferencia</option>
                  <option value="tarjeta">Tarjeta</option>
                  <option value="otro">Otro</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Fecha del pago</label>
              <DatePicker value={payForm.date} onChange={date => setPayForm(f => ({ ...f, date }))} />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Comprobante (foto/PDF)</label>
              <label className="flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer transition-colors hover:bg-slate-100"
                style={{ border: '1px dashed #D0D7DE' }}>
                <Paperclip size={14} className="text-gray-400 shrink-0" />
                <span className="text-xs text-gray-500 truncate">
                  {receiptFile ? receiptFile.name : 'Adjuntar comprobante...'}
                </span>
                <input type="file" accept="image/*,.pdf" className="hidden"
                  onChange={e => setReceiptFile(e.target.files?.[0] ?? null)} />
              </label>
              {receiptFile && (
                <button type="button" onClick={() => setReceiptFile(null)}
                  className="text-[11px] text-gray-400 hover:text-red-400 mt-1 flex items-center gap-1">
                  <X size={10} /> Quitar archivo
                </button>
              )}
            </div>
            <label className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer">
              <input type="checkbox" checked={payForm.is_deposit}
                onChange={e => setPayForm(f => ({ ...f, is_deposit: e.target.checked }))} className="rounded" />
              Marcar como depósito/anticipo
            </label>
            <div className="flex gap-2">
              <button type="button" onClick={() => { setShowPay(false); setReceiptFile(null) }}
                className="flex-1 py-2 rounded-lg text-xs font-semibold text-gray-500 hover:bg-slate-100"
                style={{ border: '1px solid var(--border-subtle)' }}>
                Cancelar
              </button>
              <button type="submit" disabled={saving}
                className="flex-1 py-2 rounded-lg text-xs font-semibold text-white disabled:opacity-50"
                style={{ background: 'var(--brand)' }}>
                {saving ? <Loader2 size={12} className="animate-spin mx-auto" /> : 'Guardar'}
              </button>
            </div>
          </form>
        ) : (
          <button onClick={() => setShowPay(true)}
            className="w-full py-2.5 rounded-xl text-sm font-semibold"
            style={{ background: 'rgba(53,196,147,0.08)', color: 'var(--brand)', border: '1px solid rgba(53,196,147,0.2)' }}>
            + Registrar pago
          </button>
        )}

        <div>
          <div className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">Cambiar estado</div>
          <div className="grid grid-cols-2 gap-2">
            {(['pendiente', 'confirmado'] as ExternalEventStatus[]).map(st => {
              const s = EXT_STATUS[st]
              return (
                <button key={st} onClick={() => handleStatusChange(st)}
                  disabled={saving || event.status === st}
                  className="text-xs font-semibold px-3 py-2 rounded-lg transition-all disabled:opacity-40"
                  style={event.status === st
                    ? { background: s.bg, color: s.color, border: `1px solid ${s.color}30` }
                    : { background: 'var(--bg-elevated)', color: '#6B7280', border: '1px solid var(--border-subtle)' }}>
                  {s.label}
                </button>
              )
            })}
          </div>
        </div>

        {event.notes && (
          <div className="rounded-xl p-3 text-xs text-gray-500" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
            {event.notes}
          </div>
        )}

        <button onClick={handleDelete} disabled={deleting}
          className="w-full py-2 rounded-xl text-xs font-semibold text-red-400 hover:bg-red-50 transition-colors disabled:opacity-40">
          {deleting ? <Loader2 size={13} className="animate-spin mx-auto" /> : 'Eliminar evento'}
        </button>
      </div>
    </div>
  )
}
