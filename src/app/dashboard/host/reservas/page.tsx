'use client'

import { useState, useEffect } from 'react'
import { CalendarDays, Clock, Users, CheckCircle, XCircle, Eye, Search, Loader2 } from 'lucide-react'
import { formatCurrency, formatDate, formatTime } from '@/lib/utils'
import { getHostBookings, acceptBooking, rejectBooking, completeBooking } from '@/lib/actions/host'
import { STATUS_LABELS, STATUS_COLORS } from '@/lib/bookingConfig'

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
  const [bookings, setBookings]         = useState<Booking[]>([])
  const [loading, setLoading]           = useState(true)
  const [filter, setFilter]             = useState('all')
  const [search, setSearch]             = useState('')
  const [selected, setSelected]         = useState<Booking | null>(null)
  const [actionId, setActionId]         = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [showRejectForm, setShowRejectForm] = useState(false)

  useEffect(() => {
    setLoading(true)
    getHostBookings(filter === 'all' ? undefined : filter)
      .then(d => { setBookings(d); setLoading(false) })
  }, [filter])

  const filtered = bookings.filter(b => {
    const g = (b as any).profiles
    return (g?.full_name ?? '').toLowerCase().includes(search.toLowerCase()) ||
           (b.event_type ?? '').toLowerCase().includes(search.toLowerCase())
  })

  const pending  = bookings.filter(b => b.status === 'pending').length
  const accepted = bookings.filter(b => b.status === 'accepted').length

  async function doAccept(id: string) {
    setActionId(id + 'a')
    const r = await acceptBooking(id)
    if (!('error' in r)) {
      setBookings(p => p.map(b => b.id === id ? { ...b, status: 'accepted' as const } : b))
      if (selected?.id === id) setSelected((p: Booking | null) => p ? { ...p, status: 'accepted' as const } : null)
    }
    setActionId(null)
  }

  async function doReject(id: string) {
    setActionId(id + 'r')
    await rejectBooking(id, rejectReason || undefined)
    setBookings(p => p.map(b => b.id === id ? { ...b, status: 'rejected' as const } : b))
    if (selected?.id === id) setSelected((p: Booking | null) => p ? { ...p, status: 'rejected' as const } : null)
    setShowRejectForm(false)
    setRejectReason('')
    setActionId(null)
  }

  async function doComplete(id: string) {
    setActionId(id + 'c')
    await completeBooking(id)
    setBookings(p => p.map(b => b.id === id ? { ...b, status: 'completed' as const } : b))
    if (selected?.id === id) setSelected((p: Booking | null) => p ? { ...p, status: 'completed' as const } : null)
    setActionId(null)
  }

  if (loading) return (
    <div className="flex items-center justify-center h-screen" style={{ background: 'var(--bg-base)' }}>
      <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--brand)' }} />
    </div>
  )

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <div className="mb-5 md:mb-6">
        <h1 className="text-xl md:text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Reservas</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          {bookings.length} en total
          {pending > 0 && <span className="ml-2 font-semibold" style={{ color: '#D97706' }}>· {pending} por aceptar</span>}
          {accepted > 0 && <span className="ml-2 font-semibold" style={{ color: '#2563EB' }}>· {accepted} esperando pago</span>}
        </p>
      </div>

      {/* Métricas rápidas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-5 md:mb-6">
        {[
          { l: 'Por aceptar',    v: pending,   c: '#D97706' },
          { l: 'Esperan pago',   v: accepted,  c: '#2563EB' },
          { l: 'Confirmadas',    v: bookings.filter(b => b.status === 'confirmed').length, c: '#16A34A' },
          { l: 'Ingresos conf.', v: formatCurrency(bookings.filter(b => b.status === 'confirmed').reduce((s, b) => s + Number(b.total_amount), 0)), c: 'var(--brand)' },
        ].map(m => (
          <div key={m.l} className="rounded-2xl p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
            <div className="text-xl font-bold" style={{ color: m.c }}>{m.v}</div>
            <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{m.l}</div>
          </div>
        ))}
      </div>

      {/* Filtros — scrollable en móvil */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 mb-4">
        <div className="flex gap-1 p-1 rounded-xl overflow-x-auto scrollbar-hide"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
          {FILTERS.map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              className="px-3 py-2 rounded-lg text-xs font-medium transition-all whitespace-nowrap shrink-0"
              style={filter === f.key ? { background: 'var(--brand)', color: '#fff' } : { color: 'var(--text-secondary)' }}>
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 px-3 py-3 rounded-xl flex-1"
          style={{ background: 'var(--bg-card)', border: '1.5px solid var(--border-medium)' }}>
          <Search size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar reserva..."
            className="bg-transparent text-sm flex-1 focus:outline-none" style={{ color: 'var(--text-primary)' }} />
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-5 items-start">
        {/* Lista */}
        <div className="flex-1 min-w-0 rounded-2xl overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
          {filtered.length === 0 ? (
            <div className="text-center py-16" style={{ color: 'var(--text-muted)' }}>Sin reservas</div>
          ) : (
            <div className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
              {filtered.map((bk: any) => {
                const sc  = STATUS_COLORS[bk.status as keyof typeof STATUS_COLORS] ?? { color: '#6B7280', bg: '#F4F6F8' }
                const sl  = STATUS_LABELS[bk.status as keyof typeof STATUS_LABELS] ?? bk.status
                const g   = bk.profiles
                const isSelected = selected?.id === bk.id
                return (
                  <div key={bk.id} onClick={() => setSelected(isSelected ? null : bk)}
                    className="px-4 md:px-5 py-4 cursor-pointer transition-colors"
                    style={{ background: isSelected ? 'var(--brand-dim)' : 'transparent' }}>

                    <div className="flex items-start gap-3">
                      {/* Avatar */}
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold text-white shrink-0"
                        style={{ background: 'linear-gradient(135deg, var(--brand), var(--brand-dark))' }}>
                        {g?.full_name?.charAt(0) ?? '?'}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        {/* Fila: nombre + monto */}
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                            {g?.full_name ?? 'Cliente'}
                          </span>
                          <span className="font-bold text-sm shrink-0" style={{ color: 'var(--text-primary)' }}>
                            {formatCurrency(Number(bk.total_amount))}
                          </span>
                        </div>

                        {/* Fila: evento + estado */}
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <span className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                            {bk.event_type}
                          </span>
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full shrink-0"
                            style={{ background: sc.bg, color: sc.color }}>{sl}</span>
                        </div>

                        {/* Meta: fecha/hora/personas — wrap en móvil */}
                        <div className="flex gap-2 md:gap-3 flex-wrap text-xs" style={{ color: 'var(--text-muted)' }}>
                          <span className="flex items-center gap-1"><CalendarDays size={10} />{formatDate(bk.event_date)}</span>
                          <span className="flex items-center gap-1"><Clock size={10} />{formatTime(bk.start_time)}–{formatTime(bk.end_time)}</span>
                          <span className="flex items-center gap-1"><Users size={10} />{bk.guest_count}</span>
                        </div>

                        {/* Acciones para pendientes */}
                        {bk.status === 'pending' && (
                          <div className="flex gap-2 mt-3" onClick={e => e.stopPropagation()}>
                            <button onClick={() => doAccept(bk.id)} disabled={!!actionId}
                              className="flex-1 text-xs font-semibold py-2.5 rounded-xl transition-colors"
                              style={{ background: 'rgba(22,163,74,0.1)', color: '#16A34A', border: '1px solid rgba(22,163,74,0.2)' }}>
                              {actionId === bk.id + 'a' ? '...' : '✓ Aceptar'}
                            </button>
                            <button onClick={() => { setSelected(bk); setShowRejectForm(true) }} disabled={!!actionId}
                              className="flex-1 text-xs font-semibold py-2.5 rounded-xl transition-colors"
                              style={{ background: 'rgba(220,38,38,0.08)', color: '#DC2626', border: '1px solid rgba(220,38,38,0.15)' }}>
                              ✕ Rechazar
                            </button>
                          </div>
                        )}
                        {bk.status === 'confirmed' && (
                          <div className="mt-2.5" onClick={e => e.stopPropagation()}>
                            <button onClick={() => doComplete(bk.id)} disabled={!!actionId}
                              className="text-xs font-semibold px-4 py-2 rounded-xl"
                              style={{ background: 'rgba(124,58,237,0.1)', color: '#7C3AED', border: '1px solid rgba(124,58,237,0.2)' }}>
                              {actionId === bk.id + 'c' ? '...' : 'Marcar completado'}
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Ver detalle — solo desktop */}
                      <button onClick={e => { e.stopPropagation(); setSelected(isSelected ? null : bk) }}
                        className="hidden md:flex w-8 h-8 items-center justify-center rounded-lg shrink-0"
                        style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}>
                        <Eye size={13} />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Panel de detalle */}
        {selected && (
          <div className="w-72 shrink-0 rounded-2xl overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
            <div className="px-5 py-4 flex justify-between" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              <span className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>Detalle</span>
              <button onClick={() => { setSelected(null); setShowRejectForm(false) }} style={{ color: 'var(--text-muted)' }}>✕</button>
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
                  <button onClick={() => setShowRejectForm(false)}
                    className="px-3 py-2 text-xs rounded-xl"
                    style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>Cancelar</button>
                </div>
              </div>
            )}

            <div className="p-4 space-y-4">
              {/* Cliente */}
              <div>
                <div className="text-xs font-semibold uppercase tracking-widest mb-1.5" style={{ color: 'var(--text-muted)' }}>Cliente</div>
                <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{(selected as any).profiles?.full_name}</div>
                <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>{(selected as any).profiles?.email}</div>
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

              {/* Finanzas */}
              <div className="rounded-xl p-3 space-y-1.5" style={{ background: 'var(--brand-dim)', border: '1px solid var(--brand-border)' }}>
                <div className="flex justify-between text-xs">
                  <span style={{ color: 'var(--text-secondary)' }}>Total evento</span>
                  <span className="font-bold" style={{ color: 'var(--text-primary)' }}>{formatCurrency(Number(selected.total_amount))}</span>
                </div>
                <div className="flex justify-between text-xs font-bold" style={{ color: 'var(--brand)' }}>
                  <span>Comisión Espot</span>
                  <span>{formatCurrency(Number(selected.platform_fee))}</span>
                </div>
              </div>

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
                    style={{ background: 'rgba(220,38,38,0.08)', color: '#DC2626', border: '1px solid rgba(220,38,38,0.2)' }}>
                    <XCircle size={13} /> Rechazar
                  </button>
                </div>
              )}
              {selected.status === 'accepted' && (
                <div className="rounded-xl px-3 py-2.5 text-xs text-center"
                  style={{ background: 'rgba(37,99,235,0.06)', border: '1px solid rgba(37,99,235,0.15)', color: '#2563EB' }}>
                  ⏳ Esperando pago del cliente ({formatCurrency(Number(selected.platform_fee))})
                </div>
              )}
              {selected.status === 'confirmed' && (
                <button onClick={() => doComplete(selected.id)} disabled={!!actionId}
                  className="w-full text-xs font-semibold py-2.5 rounded-xl"
                  style={{ background: 'rgba(124,58,237,0.1)', color: '#7C3AED', border: '1px solid rgba(124,58,237,0.2)' }}>
                  {actionId === selected.id + 'c' ? 'Procesando...' : '✓ Marcar evento como completado'}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
