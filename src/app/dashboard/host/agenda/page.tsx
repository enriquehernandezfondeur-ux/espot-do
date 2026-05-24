'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import {
  Check, X, Search, Loader2, Plus, LayoutList, Paperclip,
} from 'lucide-react'
import { formatCurrency, formatDate, formatTime, cn } from '@/lib/utils'
import {
  getExternalEvents, updateExternalEvent, addEventPayment,
  deleteExternalEvent, deleteEventPayment,
} from '@/lib/actions/external-events'
import { getHostBookings, acceptBooking, rejectBooking, completeBooking } from '@/lib/actions/host'
import { STATUS_LABELS, STATUS_COLORS } from '@/lib/bookingConfig'
import { createClient } from '@/lib/supabase/client'
import type { ExternalEvent, ExternalEventStatus, ExternalPaymentMethod } from '@/types'

type Booking      = Awaited<ReturnType<typeof getHostBookings>>[0]
type AgendaItem   = { source: 'espot'; data: Booking } | { source: 'direct'; data: ExternalEvent }
type SimpleStatus = 'all' | 'pendiente' | 'confirmado' | 'completado' | 'cancelado'
type OriginFilter = 'all' | 'espot' | 'directo'

const EXT_STATUS: Record<ExternalEventStatus, { label: string; color: string; bg: string }> = {
  tentativo:  { label: 'Pendiente',  color: '#D97706', bg: 'rgba(217,119,6,0.1)'   },
  confirmado: { label: 'Confirmado', color: '#16A34A', bg: 'rgba(22,163,74,0.1)'   },
  en_curso:   { label: 'En curso',   color: '#2563EB', bg: 'rgba(37,99,235,0.1)'   },
  completado: { label: 'Completado', color: '#35C493', bg: 'rgba(53,196,147,0.1)'  },
  cancelado:  { label: 'Cancelado',  color: '#6B7280', bg: 'rgba(107,114,128,0.1)' },
}

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
  if (s === 'tentativo')                      return 'pendiente'
  if (s === 'confirmado' || s === 'en_curso') return 'confirmado'
  if (s === 'completado')                     return 'completado'
  return 'cancelado'
}

function itemKey(item: AgendaItem)    { return `${item.source}-${item.data.id}` }
function itemDate(item: AgendaItem)   { return item.data.event_date }
function itemAmount(item: AgendaItem) { return Number(item.source === 'espot' ? item.data.total_amount : (item.data.total_amount ?? 0)) }

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
    const sc = STATUS_COLORS[item.data.status as keyof typeof STATUS_COLORS] ?? { color: '#6B7280', bg: '#F4F6F8' }
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
  const [search,   setSearch]   = useState('')
  const [selected, setSelected] = useState<AgendaItem | null>(null)
  const [toast,    setToast]    = useState<{ msg: string; ok: boolean } | null>(null)
  const [actionId,       setActionId]       = useState<string | null>(null)
  const [rejectReason,   setRejectReason]   = useState('')
  const [showRejectForm, setShowRejectForm] = useState(false)

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
      all.sort((a, b) => itemDate(a).localeCompare(itemDate(b)))
      setItems(all)
      setLoading(false)
    })
  }, [])

  const filtered = items.filter(item => {
    if (origin !== 'all') {
      if (origin === 'espot'   && item.source !== 'espot')  return false
      if (origin === 'directo' && item.source !== 'direct') return false
    }
    if (status !== 'all' && simpleStatus(item) !== status) return false
    const q = search.toLowerCase()
    if (!q) return true
    return (
      itemTitle(item).toLowerCase().includes(q) ||
      itemSubtitle(item).toLowerCase().includes(q) ||
      itemDate(item).includes(q)
    )
  })

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
        <div className="fixed top-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold shadow-xl"
          style={{ background: toast.ok ? '#16A34A' : '#DC2626', color: '#fff' }}>
          {toast.ok ? <Check size={14} /> : <X size={14} />} {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#0F1623', letterSpacing: '-0.02em' }}>Agenda</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {items.length} eventos en total
            {pendingEspot > 0 && <span className="ml-2 font-semibold" style={{ color: '#D97706' }}>· {pendingEspot} por aceptar</span>}
          </p>
        </div>
        <Link href="/dashboard/host/eventos/nuevo"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all active:scale-95"
          style={{ background: 'var(--brand)' }}>
          <Plus size={15} /> Nuevo evento
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-2 mb-5">
        <div className="flex gap-1 p-1 rounded-xl overflow-x-auto scrollbar-hide"
          style={{ background: '#fff', border: '1px solid #E8ECF0' }}>
          {ORIGIN_OPTIONS.map(o => (
            <button key={o.value} onClick={() => setOrigin(o.value as OriginFilter)}
              className="px-3 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap shrink-0"
              style={origin === o.value ? { background: '#0F1623', color: '#fff' } : { color: '#6B7280' }}>
              {o.label}
            </button>
          ))}
        </div>
        <div className="flex gap-1 p-1 rounded-xl overflow-x-auto scrollbar-hide"
          style={{ background: '#fff', border: '1px solid #E8ECF0' }}>
          {STATUS_OPTIONS.map(o => (
            <button key={o.value} onClick={() => setStatus(o.value)}
              className="px-3 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap shrink-0"
              style={status === o.value ? { background: 'var(--brand)', color: '#fff' } : { color: '#6B7280' }}>
              {o.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl"
          style={{ background: '#fff', border: '1px solid #E8ECF0' }}>
          <Search size={15} className="text-gray-400 shrink-0" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar cliente, tipo de evento..."
            className="bg-transparent text-sm flex-1 focus:outline-none text-gray-700 placeholder-gray-400"
            style={{ fontSize: 16 }} />
          {search && <button onClick={() => setSearch('')} className="text-gray-400"><X size={14} /></button>}
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-col lg:grid lg:grid-cols-[1fr_380px] gap-5 items-start">
        {/* List */}
        <div className="rounded-2xl overflow-hidden" style={{ background: '#fff', border: '1px solid #E8ECF0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
          <div className="overflow-x-auto scrollbar-hide">
            <div className="grid gap-3 px-5 py-3 text-xs font-semibold uppercase tracking-widest text-gray-400 min-w-[520px]"
              style={{ gridTemplateColumns: '2fr 1fr 1fr auto', borderBottom: '1px solid #F0F2F5', background: '#FAFBFC' }}>
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
              <div className="divide-y divide-[#F0F2F5]">
                {filtered.map(item => {
                  const k         = itemKey(item)
                  const chip      = itemStatusChip(item)
                  const amt       = itemAmount(item)
                  const isEspot   = item.source === 'espot'
                  const isSelected = selected ? itemKey(selected) === k : false
                  const balance   = !isEspot && (item.data as ExternalEvent).total_amount
                    ? (item.data as ExternalEvent).total_amount! - ((item.data as ExternalEvent).paid_amount ?? 0)
                    : null
                  return (
                    <button key={k}
                      onClick={() => { setSelected(isSelected ? null : item); setShowRejectForm(false); setRejectReason('') }}
                      className={cn(
                        'w-full grid gap-3 items-center px-5 py-4 min-w-[520px] text-left transition-colors hover:bg-slate-50',
                        isSelected && 'bg-slate-50'
                      )}
                      style={{ gridTemplateColumns: '2fr 1fr 1fr auto', borderLeft: `3px solid ${isEspot ? '#35C493' : '#2563EB'}` }}>
                      <div className="min-w-0">
                        <div className="mb-0.5">
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                            style={isEspot
                              ? { background: 'rgba(53,196,147,0.12)', color: '#16A34A' }
                              : { background: 'rgba(37,99,235,0.08)', color: '#2563EB' }}>
                            {isEspot ? 'Espot' : 'Directo'}
                          </span>
                        </div>
                        <div className="font-semibold text-sm truncate" style={{ color: '#0F1623' }}>
                          {itemTitle(item)}
                        </div>
                        <div className="text-xs text-gray-400 truncate">{itemSubtitle(item)}</div>
                      </div>
                      <div className="text-sm text-gray-600">{formatDate(itemDate(item))}</div>
                      <div className="text-sm">
                        <div className="font-bold" style={{ color: '#0F1623' }}>
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
          </div>
        </div>

        {/* Detail panel */}
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
          <div className="rounded-2xl p-8 text-center" style={{ background: '#fff', border: '1px solid #E8ECF0' }}>
            <LayoutList size={24} className="mx-auto mb-3 text-gray-300" />
            <p className="text-sm text-gray-400">Selecciona un evento para ver el detalle</p>
          </div>
        )}
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
    import('@/lib/actions/installments').then(m => m.getInstallments(booking.id)).then(setInsts).catch(() => {})
  }, [booking.id])

  const sc = STATUS_COLORS[booking.status as keyof typeof STATUS_COLORS] ?? { color: '#6B7280', bg: '#F4F6F8' }
  const sl = STATUS_LABELS[booking.status as keyof typeof STATUS_LABELS] ?? booking.status
  const g  = booking.profiles

  return (
    <div className="rounded-2xl overflow-hidden sticky top-8"
      style={{ background: '#fff', border: '1px solid #E8ECF0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
      <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid #F0F2F5' }}>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded"
              style={{ background: 'rgba(53,196,147,0.12)', color: '#16A34A' }}>Espot</span>
            <span className="font-bold text-sm" style={{ color: '#0F1623' }}>Detalle de reserva</span>
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
        <div className="px-5 py-4" style={{ borderBottom: '1px solid #F0F2F5', background: 'rgba(220,38,38,0.02)' }}>
          <p className="text-xs font-semibold mb-2" style={{ color: '#DC2626' }}>Motivo de rechazo (opcional)</p>
          <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)}
            placeholder="Ej: Sin disponibilidad para esa fecha" rows={2}
            className="w-full text-xs px-3 py-2 rounded-xl resize-none focus:outline-none"
            style={{ background: '#F8FAFB', border: '1.5px solid #E8ECF0', color: '#0F1623' }} />
          <div className="flex gap-2 mt-2">
            <button onClick={onReject} disabled={!!actionId}
              className="flex-1 text-xs font-semibold py-2 rounded-xl disabled:opacity-50"
              style={{ background: '#DC2626', color: '#fff' }}>
              {actionId ? 'Enviando...' : 'Confirmar rechazo'}
            </button>
            <button onClick={() => { setShowRejectForm(false); setRejectReason('') }}
              className="px-3 py-2 text-xs rounded-xl"
              style={{ background: '#F8FAFB', color: '#6B7280' }}>Cancelar</button>
          </div>
        </div>
      )}

      <div className="p-5 space-y-4">
        <div className="py-2 px-3 rounded-xl text-xs font-semibold text-center"
          style={{ background: sc.bg, color: sc.color }}>{sl}</div>

        <div>
          <div className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-1">Cliente</div>
          <div className="font-semibold text-sm" style={{ color: '#0F1623' }}>{g?.full_name ?? '—'}</div>
          {g?.email && <div className="text-xs text-gray-500">{g.email}</div>}
          {g?.phone && <a href={`tel:${g.phone}`} className="text-xs" style={{ color: 'var(--brand)' }}>{g.phone}</a>}
        </div>

        <div className="rounded-xl p-4 space-y-2" style={{ background: '#F8FAFB', border: '1px solid #E8ECF0' }}>
          {([
            { label: 'Tipo',     value: booking.event_type ?? '—' },
            { label: 'Fecha',    value: formatDate(booking.event_date) },
            { label: 'Horario',  value: booking.start_time ? `${formatTime(booking.start_time)} – ${formatTime(booking.end_time)}` : '—' },
            { label: 'Personas', value: String(booking.guest_count) },
            ...(booking.spaces?.name ? [{ label: 'Espacio', value: booking.spaces.name }] : []),
          ] as { label: string; value: string }[]).map(({ label, value }) => (
            <div key={label} className="flex justify-between text-sm">
              <span className="text-gray-500">{label}</span>
              <span className="font-medium" style={{ color: '#0F1623' }}>{value}</span>
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

        <div className="rounded-xl p-4 space-y-2" style={{ background: '#F8FAFB', border: '1px solid #E8ECF0' }}>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Total evento</span>
            <span className="font-bold" style={{ color: '#0F1623' }}>{formatCurrency(Number(booking.total_amount))}</span>
          </div>
          <div className="flex justify-between text-sm text-gray-500">
            <span>Comisión Espot (10%)</span>
            <span>{formatCurrency(Number(booking.platform_fee))}</span>
          </div>
          <div className="flex justify-between text-sm font-bold pt-1"
            style={{ borderTop: '1px solid #E8ECF0', color: '#0F1623' }}>
            <span>Tu neto</span>
            <span style={{ color: 'var(--brand)' }}>{formatCurrency(Math.round(Number(booking.total_amount) * 0.90))}</span>
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
                  style={{ background: '#F8FAFB', border: '1px solid #F0F2F5' }}>
                  <div>
                    <span className="font-semibold text-gray-700">Cuota {inst.installment_number}</span>
                    <span className="text-gray-400 ml-2">{inst.due_date}</span>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-xs" style={{ color: '#0F1623' }}>{formatCurrency(Number(inst.amount))}</div>
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
        {booking.status === 'quote_requested' && !showRejectForm && (
          <Link href="/dashboard/host/cotizaciones"
            className="block w-full text-center text-xs font-semibold py-2.5 rounded-xl"
            style={{ background: 'rgba(53,196,147,0.08)', color: 'var(--brand)', border: '1px solid rgba(53,196,147,0.2)' }}>
            Ver en Cotizaciones →
          </Link>
        )}
        {booking.status === 'accepted' && (
          <div className="rounded-xl px-3 py-2.5 text-xs text-center"
            style={{ background: '#F8FAFB', border: '1px solid #E8ECF0', color: '#6B7280' }}>
            Esperando pago del cliente
          </div>
        )}
        {booking.status === 'confirmed' && (
          <button onClick={onComplete} disabled={!!actionId}
            className="w-full text-xs font-semibold py-2.5 rounded-xl disabled:opacity-50"
            style={{ background: '#F8FAFB', color: '#6B7280', border: '1px solid #E8ECF0' }}>
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
    date: new Date().toISOString().slice(0, 10), notes: '', is_deposit: false,
  })
  const supabaseRef = useRef(createClient())

  const client  = (event as any).client_name ?? event.client?.full_name ?? ''
  const balance = (event.total_amount ?? 0) - (event.paid_amount ?? 0)

  async function handleStatusChange(status: ExternalEventStatus) {
    setSaving(true)
    const r = await updateExternalEvent({ id: event.id, status })
    if (!('error' in r)) { onUpdated({ ...event, status }); showToast('Estado actualizado', true) }
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
      setPayForm({ amount: '', method: 'efectivo', date: new Date().toISOString().slice(0, 10), notes: '', is_deposit: false })
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
      style={{ background: '#fff', border: '1px solid #E8ECF0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
      <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid #F0F2F5' }}>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded"
              style={{ background: 'rgba(37,99,235,0.08)', color: '#2563EB' }}>Directo</span>
            <span className="font-bold text-sm" style={{ color: '#0F1623' }}>Detalle del evento</span>
          </div>
          <div className="text-xs text-gray-400 mt-0.5">ID: {event.id.slice(0, 8).toUpperCase()}</div>
        </div>
        <div className="flex items-center gap-1">
          <Link href={`/dashboard/host/eventos/${event.id}/editar`}
            className="text-xs px-3 py-1.5 rounded-lg font-semibold hover:bg-slate-100 text-gray-500">
            Editar
          </Link>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-gray-400"><X size={13} /></button>
        </div>
      </div>

      <div className="p-5 space-y-4">
        <div>
          <div className="font-semibold text-sm mb-3" style={{ color: '#0F1623' }}>{event.title}</div>
          <div className="rounded-xl p-4 space-y-2" style={{ background: '#F8FAFB', border: '1px solid #E8ECF0' }}>
            {([
              { label: 'Tipo',     value: event.event_type ?? '—' },
              { label: 'Fecha',    value: formatDate(event.event_date) },
              ...(event.start_time ? [{ label: 'Horario', value: `${formatTime(event.start_time)}${event.end_time ? ` – ${formatTime(event.end_time)}` : ''}` }] : []),
              ...(event.guest_count ? [{ label: 'Personas', value: String(event.guest_count) }] : []),
              ...(event.space?.name ? [{ label: 'Espacio', value: event.space.name }] : []),
            ] as { label: string; value: string }[]).map(({ label, value }) => (
              <div key={label} className="flex justify-between text-sm">
                <span className="text-gray-500">{label}</span>
                <span className="font-medium" style={{ color: '#0F1623' }}>{value}</span>
              </div>
            ))}
          </div>
        </div>

        {client && (
          <div>
            <div className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-1">Cliente</div>
            <div className="font-semibold text-sm" style={{ color: '#0F1623' }}>{client}</div>
            {event.client?.email && <div className="text-xs text-gray-500">{event.client.email}</div>}
            {event.client?.phone && <div className="text-xs text-gray-500">{event.client.phone}</div>}
          </div>
        )}

        <div className="rounded-xl p-4 space-y-2"
          style={{ background: 'rgba(53,196,147,0.05)', border: '1px solid rgba(53,196,147,0.15)' }}>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Total evento</span>
            <span className="font-medium" style={{ color: '#0F1623' }}>{event.total_amount ? formatCurrency(event.total_amount) : '—'}</span>
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
                  style={{ background: '#F8FAFB', border: '1px solid #F0F2F5' }}>
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
            style={{ background: '#F8FAFB', border: '1px solid #E8ECF0' }}>
            <div className="text-xs font-semibold text-gray-600">Registrar pago</div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Monto (RD$)</label>
                <input type="number" required min="1" value={payForm.amount}
                  onChange={e => setPayForm(f => ({ ...f, amount: e.target.value }))}
                  placeholder="0" className="w-full px-3 py-2 rounded-lg text-sm border focus:outline-none"
                  style={{ border: '1px solid #E8ECF0', fontSize: 16 }} />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Método</label>
                <select value={payForm.method}
                  onChange={e => setPayForm(f => ({ ...f, method: e.target.value as ExternalPaymentMethod }))}
                  className="w-full px-3 py-2 rounded-lg text-sm border focus:outline-none"
                  style={{ border: '1px solid #E8ECF0', fontSize: 16 }}>
                  <option value="efectivo">Efectivo</option>
                  <option value="transferencia">Transferencia</option>
                  <option value="tarjeta">Tarjeta</option>
                  <option value="otro">Otro</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Fecha del pago</label>
              <input type="date" required value={payForm.date}
                onChange={e => setPayForm(f => ({ ...f, date: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg text-sm border focus:outline-none"
                style={{ border: '1px solid #E8ECF0', fontSize: 16 }} />
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
                style={{ border: '1px solid #E8ECF0' }}>
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
            {(['tentativo', 'confirmado', 'completado', 'cancelado'] as ExternalEventStatus[]).map(st => {
              const s = EXT_STATUS[st]
              return (
                <button key={st} onClick={() => handleStatusChange(st)}
                  disabled={saving || event.status === st}
                  className="text-xs font-semibold px-3 py-2 rounded-lg transition-all disabled:opacity-40"
                  style={event.status === st
                    ? { background: s.bg, color: s.color, border: `1px solid ${s.color}30` }
                    : { background: '#F4F6F8', color: '#6B7280', border: '1px solid #E8ECF0' }}>
                  {s.label}
                </button>
              )
            })}
          </div>
        </div>

        {event.notes && (
          <div className="rounded-xl p-3 text-xs text-gray-500" style={{ background: '#F8FAFB', border: '1px solid #E8ECF0' }}>
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
