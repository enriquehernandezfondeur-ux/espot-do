'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { CalendarDays, Clock, Users, CheckCircle, XCircle, Eye, Search, Loader2, Download } from 'lucide-react'
import { formatCurrency, formatDate, formatTime } from '@/lib/utils'
import { getHostBookings, acceptBooking, rejectBooking, completeBooking } from '@/lib/actions/host'
import { STATUS_LABELS, STATUS_COLORS } from '@/lib/bookingConfig'

function HostInstallmentStatus({ bookingId, totalAmount }: { bookingId: string; totalAmount: number }) {
  const [insts, setInsts] = useState<any[]>([])
  useEffect(() => {
    import('@/lib/actions/installments').then(m => m.getInstallments(bookingId)).then(setInsts).catch(() => {})
  }, [bookingId])

  if (!insts.length) return null

  const paid    = insts.filter((i: any) => i.status === 'paid').reduce((s: number, i: any) => s + Number(i.amount), 0)

  return (
    <div className="rounded-xl overflow-hidden mt-3" style={{ border: '1px solid var(--border-subtle)' }}>
      <div className="px-4 py-2.5 flex items-center justify-between"
        style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border-subtle)' }}>
        <span className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Cobros</span>
        <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
          {insts.filter((i: any) => i.status === 'paid').length}/{insts.length} pagados
        </span>
      </div>
      {insts.map((inst: any) => (
        <div key={inst.id} className="flex items-center justify-between px-4 py-2.5"
          style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <div>
            <div className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
              Cuota {inst.installment_number} — {inst.label ?? ''}
            </div>
            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Vence: {inst.due_date}
              {inst.status !== 'paid' && (
                <span className="ml-2 font-semibold" style={{ color: inst.status === 'overdue' ? '#DC2626' : 'var(--text-muted)' }}>
                  {inst.status === 'overdue' ? 'Vencida' : `Faltan ${Math.max(0, Math.floor((new Date(inst.due_date + 'T12:00').getTime() - Date.now()) / 86400000))} días`}
                </span>
              )}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>
              {formatCurrency(Number(inst.amount))}
            </div>
            <div className="text-[11px] font-semibold"
              style={{ color: inst.status === 'paid' ? '#16A34A' : inst.status === 'overdue' ? '#DC2626' : 'var(--text-muted)' }}>
              {inst.status === 'paid' ? 'Recibido' : inst.status === 'overdue' ? 'Vencido' : 'Pendiente'}
            </div>
          </div>
        </div>
      ))}
      <div className="flex items-center justify-between px-4 py-3">
        <span className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>Cobrado hasta ahora</span>
        <span className="text-sm font-bold" style={{ color: '#16A34A' }}>{formatCurrency(paid)}</span>
      </div>
    </div>
  )
}

type Booking = Awaited<ReturnType<typeof getHostBookings>>[0]

const FILTERS = [
  { key: 'all', label: 'Todas' },
  { key: 'pending', label: 'Pendientes' },
  { key: 'accepted', label: 'Aceptadas' },
  { key: 'confirmed', label: 'Confirmadas' },
  { key: 'completed', label: 'Completadas' },
  { key: 'rejected', label: 'Rechazadas' },
]

export default function HostReservasPage() {
  const router = useRouter()
  const [bookings, setBookings]         = useState<Booking[]>([])
  const [loading, setLoading]           = useState(true)
  const [filter, setFilter]             = useState('all')
  const [search, setSearch]             = useState('')
  const [selected, setSelected]         = useState<Booking | null>(null)
  const [actionId, setActionId]         = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [showRejectForm, setShowRejectForm] = useState(false)
  const [actionError, setActionError]   = useState('')

  useEffect(() => {
    setLoading(true)
    getHostBookings(filter === 'all' ? undefined : filter)
      .then(d => { setBookings(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [filter])

  const filtered = bookings.filter(b => {
    const g = (b as any).profiles
    return (g?.full_name ?? '').toLowerCase().includes(search.toLowerCase()) ||
           (b.event_type ?? '').toLowerCase().includes(search.toLowerCase())
  })

  const pending  = bookings.filter(b => b.status === 'pending' || b.status === 'quote_requested').length
  const accepted = bookings.filter(b => b.status === 'accepted').length

  // Notificación en el título de la pestaña
  useEffect(() => {
    const base = 'Reservas — Espot'
    document.title = pending > 0 ? `(${pending}) ${base}` : base
    return () => { document.title = 'Panel — Espot' }
  }, [pending])

  function showError(msg: string) {
    setActionError(msg)
    setTimeout(() => setActionError(''), 4000)
  }

  async function doAccept(id: string) {
    const status = bookings.find(b => b.id === id)?.status
    if (status !== 'pending' && status !== 'quote_requested') return
    setActionId(id + 'a')
    const r = await acceptBooking(id)
    if ('error' in r) { showError(r.error ?? 'Error al aceptar'); }
    else {
      setBookings(p => p.map(b => b.id === id ? { ...b, status: 'accepted' as const } : b))
      if (selected?.id === id) setSelected((p: Booking | null) => p ? { ...p, status: 'accepted' as const } : null)
    }
    setActionId(null)
  }

  async function doReject(id: string) {
    const status = bookings.find(b => b.id === id)?.status
    if (status !== 'pending' && status !== 'quote_requested') return
    setActionId(id + 'r')
    const r = await rejectBooking(id, rejectReason || undefined)
    if ('error' in r) { showError(r.error ?? 'Error al rechazar'); }
    else {
      setBookings(p => p.map(b => b.id === id ? { ...b, status: 'rejected' as const } : b))
      if (selected?.id === id) setSelected((p: Booking | null) => p ? { ...p, status: 'rejected' as const } : null)
      setShowRejectForm(false)
      setRejectReason('')
    }
    setActionId(null)
  }

  async function doComplete(id: string) {
    setActionId(id + 'c')
    const r = await completeBooking(id)
    if ('error' in r) { showError(r.error ?? 'Error al completar'); }
    else {
      setBookings(p => p.map(b => b.id === id ? { ...b, status: 'completed' as const } : b))
      if (selected?.id === id) setSelected((p: Booking | null) => p ? { ...p, status: 'completed' as const } : null)
    }
    setActionId(null)
  }

  if (loading) return (
    <div className="flex items-center justify-center h-dvh" style={{ background: 'var(--bg-base)' }}>
      <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--brand)' }} />
    </div>
  )

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      {actionError && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-2xl text-sm font-semibold shadow-xl"
          style={{ background: '#DC2626', color: '#fff' }}>
          ✕ {actionError}
        </div>
      )}
      <div className="mb-5 md:mb-6 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Reservas</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            {bookings.length} en total
            {pending > 0 && <span className="ml-2 font-semibold" style={{ color: '#D97706' }}>· {pending} por aceptar</span>}
            {accepted > 0 && <span className="ml-2 font-semibold" style={{ color: '#2563EB' }}>· {accepted} esperando pago</span>}
          </p>
        </div>
        {bookings.length > 0 && (
          <button
            onClick={() => {
              const headers = ['ID', 'Cliente', 'Espacio', 'Fecha evento', 'Hora inicio', 'Hora fin', 'Personas', 'Tipo evento', 'Total', 'Estado', 'Creada']
              const rows = bookings.map(b => {
                const g = (b as any).profiles
                const s = (b as any).spaces
                return [
                  b.id.slice(0, 8).toUpperCase(),
                  g?.full_name ?? '—',
                  s?.name ?? '—',
                  b.event_date,
                  b.start_time?.slice(0,5) ?? '—',
                  b.end_time?.slice(0,5) ?? '—',
                  b.guest_count,
                  b.event_type ?? '—',
                  b.total_amount,
                  b.status,
                  b.created_at?.slice(0, 10) ?? '—',
                ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')
              })
              const csv  = [headers.join(','), ...rows].join('\n')
              const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
              const a    = document.createElement('a')
              a.href     = URL.createObjectURL(blob)
              a.download = `espot-reservas-${new Date().toISOString().slice(0,10)}.csv`
              a.click()
              URL.revokeObjectURL(a.href)
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold shrink-0 transition-all"
            style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}>
            <Download size={13} /> Exportar CSV
          </button>
        )}
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-2 mb-5">
        {/* Pills — flex-1 en cada uno para distribución simétrica (estilo Airbnb) */}
        <div className="flex flex-1 gap-1 p-1 rounded-2xl"
          style={{ background: 'var(--bg-elevated)' }}>
          {FILTERS.map(f => {
            const badge = f.key === 'pending' ? pending : f.key === 'accepted' ? accepted : 0
            const active = filter === f.key
            return (
              <button key={f.key} onClick={() => setFilter(f.key)}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap"
                style={active
                  ? { background: '#fff', color: 'var(--text-primary)', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }
                  : { color: 'var(--text-secondary)', background: 'transparent' }}>
                {f.label}
                {badge > 0 && (
                  <span className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                    style={{ background: active ? 'var(--brand)' : '#EF4444', color: '#fff' }}>
                    {badge}
                  </span>
                )}
              </button>
            )
          })}
        </div>
        {/* Buscador compacto */}
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl shrink-0 w-44"
          style={{ background: '#fff', border: '1px solid var(--border-subtle)', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
          <Search size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar reserva..."
            className="bg-transparent text-sm flex-1 focus:outline-none min-w-0" style={{ color: 'var(--text-primary)' }} />
        </div>
      </div>

      <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>

        {/* Header tabla — solo desktop */}
        {filtered.length > 0 && (
          <div className="hidden md:grid px-5 py-3 text-xs font-semibold uppercase tracking-wide"
            style={{ gridTemplateColumns: '1fr 1fr 1.2fr 80px 100px 110px 120px', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}>
            <span>Cliente</span>
            <span>Evento</span>
            <span>Fecha y horario</span>
            <span className="text-center">Personas</span>
            <span className="text-right">Monto</span>
            <span className="text-center">Estado</span>
            <span className="text-center">Acciones</span>
          </div>
        )}

        {filtered.length === 0 ? (
          <div className="text-center py-16 px-4">
            <p className="font-medium mb-1" style={{ color: 'var(--text-primary)' }}>Sin reservas</p>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              {filter === 'all' ? 'Aún no tienes reservas. Aparecerán aquí cuando los clientes reserven tu espacio.' : 'No hay reservas en este estado.'}
            </p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
            {filtered.map((bk: any) => {
              const sc  = STATUS_COLORS[bk.status as keyof typeof STATUS_COLORS] ?? { color: '#6B7280', bg: '#F4F6F8' }
              const sl  = STATUS_LABELS[bk.status as keyof typeof STATUS_LABELS] ?? bk.status
              const g   = bk.profiles
              const isSelected = selected?.id === bk.id
              return (
                <div key={bk.id}>
                  {/* ── DESKTOP: fila tabla ── */}
                  <div className="hidden md:grid items-center px-5 py-3.5 hover:bg-[var(--bg-elevated)] transition-colors cursor-pointer"
                    style={{ gridTemplateColumns: '1fr 1fr 1.2fr 80px 100px 110px 120px', background: isSelected ? 'var(--bg-elevated)' : 'transparent' }}
                    onClick={() => setSelected(isSelected ? null : bk)}>

                    {/* Cliente */}
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
                        style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>
                        {g?.full_name?.charAt(0) ?? '?'}
                      </div>
                      <span className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                        {g?.full_name ?? 'Cliente'}
                      </span>
                    </div>

                    {/* Evento */}
                    <span className="text-sm truncate" style={{ color: 'var(--text-secondary)' }}>
                      {bk.event_type ?? '—'}
                    </span>

                    {/* Fecha y horario */}
                    <div className="min-w-0">
                      <div className="text-sm" style={{ color: 'var(--text-primary)' }}>{formatDate(bk.event_date)}</div>
                      <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {bk.start_time ? `${formatTime(bk.start_time)} – ${formatTime(bk.end_time)}` : '—'}
                      </div>
                    </div>

                    {/* Personas */}
                    <div className="text-sm text-center" style={{ color: 'var(--text-secondary)' }}>
                      {bk.guest_count}
                    </div>

                    {/* Monto */}
                    <div className="text-sm font-semibold text-right" style={{ color: 'var(--text-primary)' }}>
                      {formatCurrency(Number(bk.total_amount))}
                    </div>

                    {/* Estado */}
                    <div className="flex justify-center">
                      <span className="text-xs font-semibold px-2 py-1 rounded-full"
                        style={{ background: sc.bg, color: sc.color }}>{sl}</span>
                    </div>

                    {/* Acciones */}
                    <div className="flex items-center justify-center gap-1.5" onClick={e => e.stopPropagation()}>
                      {bk.status === 'pending' && (
                        <button onClick={() => doAccept(bk.id)} disabled={!!actionId}
                          className="text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-colors"
                          style={{ background: 'var(--bg-elevated)', color: 'var(--brand)', border: '1px solid var(--border-subtle)' }}>
                          {actionId === bk.id + 'a' ? '...' : 'Aceptar'}
                        </button>
                      )}
                      {bk.status === 'quote_requested' && (
                        <button onClick={() => router.push('/dashboard/host/cotizaciones')}
                          className="text-xs font-semibold px-2 py-1.5 rounded-lg"
                          style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}>
                          Cotizar →
                        </button>
                      )}
                      {(bk.status === 'pending' || bk.status === 'quote_requested') && (
                        <button onClick={() => { setSelected(bk); setRejectReason(''); setShowRejectForm(true) }} disabled={!!actionId}
                          className="text-xs font-semibold px-2.5 py-1.5 rounded-lg"
                          style={{ background: 'var(--bg-elevated)', color: '#DC2626', border: '1px solid var(--border-subtle)' }}>
                          ✕
                        </button>
                      )}
                      {bk.status === 'confirmed' && (
                        <button onClick={() => doComplete(bk.id)} disabled={!!actionId}
                          className="text-xs font-semibold px-2 py-1.5 rounded-lg"
                          style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}>
                          {actionId === bk.id + 'c' ? '...' : 'Completar'}
                        </button>
                      )}
                      <Link href={`/dashboard/host/reservas/${bk.id}`} onClick={e => e.stopPropagation()}
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-xs"
                        style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)', border: '1px solid var(--border-subtle)' }}
                        title="Ver detalle">
                        ↗
                      </Link>
                    </div>
                  </div>

                  {/* ── MÓVIL: card (igual que antes) ── */}
                  <div className="md:hidden px-4 py-4 cursor-pointer transition-colors hover:bg-[var(--bg-elevated)]"
                    style={{ background: isSelected ? 'var(--bg-elevated)' : 'transparent' }}
                    onClick={() => setSelected(isSelected ? null : bk)}>
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-semibold shrink-0"
                        style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>
                        {g?.full_name?.charAt(0) ?? '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{g?.full_name ?? 'Cliente'}</span>
                          <span className="font-bold text-sm shrink-0" style={{ color: 'var(--text-primary)' }}>{formatCurrency(Number(bk.total_amount))}</span>
                        </div>
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <span className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{bk.event_type}</span>
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full shrink-0" style={{ background: sc.bg, color: sc.color }}>{sl}</span>
                        </div>
                        <div className="flex gap-2 flex-wrap text-xs" style={{ color: 'var(--text-muted)' }}>
                          <span className="flex items-center gap-1"><CalendarDays size={10} />{formatDate(bk.event_date)}</span>
                          <span className="flex items-center gap-1"><Clock size={10} />{formatTime(bk.start_time)}–{formatTime(bk.end_time)}</span>
                          <span className="flex items-center gap-1"><Users size={10} />{bk.guest_count}</span>
                        </div>
                        {(bk.status === 'pending' || bk.status === 'quote_requested') && (
                          <div className="flex gap-2 mt-3" onClick={e => e.stopPropagation()}>
                            {bk.status === 'pending' && (
                              <button onClick={() => doAccept(bk.id)} disabled={!!actionId}
                                className="flex-1 text-xs font-semibold py-2.5 rounded-xl"
                                style={{ background: 'var(--bg-elevated)', color: 'var(--brand)', border: '1px solid var(--border-subtle)' }}>
                                {actionId === bk.id + 'a' ? '...' : 'Aceptar'}
                              </button>
                            )}
                            <button onClick={() => { setSelected(bk); setRejectReason(''); setShowRejectForm(true) }} disabled={!!actionId}
                              className="flex-1 text-xs font-semibold py-2.5 rounded-xl"
                              style={{ background: 'var(--bg-elevated)', color: '#DC2626', border: '1px solid var(--border-subtle)' }}>
                              Rechazar
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Panel detalle inline (expandible) */}
                  {isSelected && (
                    <div className="border-t" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-elevated)' }}>
                      <div className="px-5 py-3 flex justify-between items-center" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <span className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Detalle de la reserva</span>
                        <button onClick={() => { setSelected(null); setShowRejectForm(false); setRejectReason('') }} style={{ color: 'var(--text-muted)' }}>✕</button>
                      </div>

            {/* Rechazar form */}
            {showRejectForm && (
              <div className="p-4" style={{ borderBottom: '1px solid var(--border-subtle)', background: 'rgba(220,38,38,0.03)' }}>
                <p className="text-xs font-semibold mb-2" style={{ color: '#DC2626' }}>Motivo (opcional)</p>
                <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)}
                  placeholder="Ej: Sin disponibilidad para esa fecha"
                  rows={2} className="w-full text-xs px-3 py-2 rounded-xl resize-none focus:outline-none"
                  style={{ background: 'var(--bg-elevated)', border: '1.5px solid var(--border-medium)', color: 'var(--text-primary)' }} />
                <div className="flex gap-2 mt-2">
                  <button onClick={() => doReject(selected.id)} disabled={!!actionId}
                    className="flex-1 text-xs font-semibold py-2 rounded-xl"
                    style={{ background: '#DC2626', color: '#fff' }}>
                    {actionId === selected.id + 'r' ? 'Enviando...' : 'Confirmar rechazo'}
                  </button>
                  <button onClick={() => { setShowRejectForm(false); setRejectReason('') }}
                    className="px-3 py-2 text-xs rounded-xl"
                    style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>Cancelar</button>
                </div>
              </div>
            )}

            <div className="p-4 space-y-4">
              {/* Cliente */}
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--text-muted)' }}>Cliente</div>
                <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{(selected as any).profiles?.full_name}</div>
                {(selected as any).profiles?.email && (
                  <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>{(selected as any).profiles?.email}</div>
                )}
                {(selected as any).profiles?.phone && (
                  <a href={`tel:${(selected as any).profiles.phone}`}
                    className="text-xs" style={{ color: 'var(--brand)' }}>
                    {(selected as any).profiles.phone}
                  </a>
                )}
              </div>

              {/* Estado */}
              <div className="py-2 px-3 rounded-xl text-xs font-semibold text-center"
                style={{
                  background: STATUS_COLORS[selected.status as keyof typeof STATUS_COLORS]?.bg ?? '#F4F6F8',
                  color: STATUS_COLORS[selected.status as keyof typeof STATUS_COLORS]?.color ?? '#6B7280',
                }}>
                {STATUS_LABELS[selected.status as keyof typeof STATUS_LABELS] ?? selected.status}
              </div>

              {/* Evento */}
              <div className="rounded-xl p-3 space-y-2" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
                {[
                  ['Evento', selected.event_type],
                  ['Fecha', formatDate(selected.event_date)],
                  ['Horario', `${formatTime(selected.start_time)} – ${formatTime(selected.end_time)}`],
                  ['Personas', String(selected.guest_count)],
                ].map(([l, v]) => (
                  <div key={l} className="flex justify-between text-xs">
                    <span style={{ color: 'var(--text-muted)' }}>{l}</span>
                    <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{v}</span>
                  </div>
                ))}
                {(selected as any).event_notes && (
                  <div className="pt-2 text-xs italic" style={{ borderTop: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
                    "{(selected as any).event_notes}"
                  </div>
                )}
              </div>

              {/* Contenido del paquete */}
              {(selected as any).space_pricing?.pricing_type === 'fixed_package' && (selected as any).space_pricing?.package_includes && (
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--text-muted)' }}>
                    {(selected as any).space_pricing.package_name ? `Paquete · ${(selected as any).space_pricing.package_name}` : 'Incluye el paquete'}
                  </div>
                  <div className="rounded-xl px-3 py-2.5 text-xs whitespace-pre-line"
                    style={{ background: 'rgba(53,196,147,0.05)', border: '1px solid rgba(53,196,147,0.15)', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                    {(selected as any).space_pricing.package_includes}
                  </div>
                </div>
              )}

              {/* Finanzas */}
              <div className="rounded-xl p-3 space-y-1.5" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
                <div className="flex justify-between text-xs">
                  <span style={{ color: 'var(--text-secondary)' }}>Total evento</span>
                  <span className="font-bold" style={{ color: 'var(--text-primary)' }}>{formatCurrency(Number(selected.total_amount))}</span>
                </div>
                <div className="flex justify-between text-xs" style={{ color: 'var(--text-muted)' }}>
                  <span>Comisión Espot (10%)</span>
                  <span>{formatCurrency(Number(selected.platform_fee))}</span>
                </div>
                <div className="flex justify-between text-xs font-semibold pt-1" style={{ borderTop: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}>
                  <span>Tu neto</span>
                  <span style={{ color: 'var(--brand)' }}>{formatCurrency(Math.round(Number(selected.total_amount) * 0.90))}</span>
                </div>
              </div>

              {/* Estado de cuotas — solo lectura para el host */}
              {(selected.status === 'accepted' || selected.status === 'confirmed') && (
                <HostInstallmentStatus bookingId={selected.id} totalAmount={Number(selected.total_amount)} />
              )}

              {/* Acciones */}
              {selected.status === 'pending' && !showRejectForm && (
                <div className="flex gap-2">
                  <button onClick={() => doAccept(selected.id)} disabled={!!actionId}
                    className="flex-1 flex items-center justify-center gap-1 text-xs font-semibold py-2.5 rounded-xl"
                    style={{ background: '#16A34A', color: '#fff' }}>
                    <CheckCircle size={13} /> Aceptar
                  </button>
                  <button onClick={() => setShowRejectForm(true)}
                    className="flex-1 flex items-center justify-center gap-1 text-xs font-semibold py-2.5 rounded-xl"
                    style={{ background: 'rgba(220,38,38,0.1)', color: '#DC2626', border: '1px solid rgba(220,38,38,0.2)' }}>
                    <XCircle size={13} /> Rechazar
                  </button>
                </div>
              )}
              {selected.status === 'accepted' && (
                <div className="rounded-xl px-3 py-2.5 text-xs text-center"
                  style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
                  Esperando pago del cliente — {formatCurrency(Number(selected.platform_fee))}
                </div>
              )}
              {selected.status === 'confirmed' && (
                <button onClick={() => doComplete(selected.id)} disabled={!!actionId}
                  className="w-full text-xs font-semibold py-2.5 rounded-xl"
                  style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}>
                  {actionId === selected.id + 'c' ? 'Procesando...' : 'Marcar evento como completado'}
                </button>
              )}
            </div>
          </div>
        )}
              </div>
            )
          })}
        </div>
      )}
      </div>
    </div>
  )
}
