'use client'

import { useState, useEffect } from 'react'
import { getAdminBookings, updateBookingStatus } from '@/lib/actions/admin'
import { formatCurrency, formatDate, formatTime } from '@/lib/utils'
import { Search, ChevronDown, Loader2, CalendarDays, Clock, Users, MapPin, Check, X } from 'lucide-react'
import Pagination from '@/components/ui/Pagination'
import { STATUS_SHORT, STATUS_COLORS } from '@/lib/bookingConfig'

const PAGE_SIZE = 25
import { cn } from '@/lib/utils'

const STATUS_OPTIONS = [
  { value: 'all',             label: 'Todas' },
  { value: 'pending',         label: 'Pendientes' },
  { value: 'accepted',        label: 'Por pagar' },
  { value: 'confirmed',       label: 'Confirmadas' },
  { value: 'completed',       label: 'Completadas' },
  { value: 'quote_requested', label: 'Cotizaciones' },
  { value: 'cancelled_guest', label: 'Canceladas (cliente)' },
  { value: 'cancelled_host',  label: 'Canceladas (host)' },
  { value: 'rejected',        label: 'Rechazadas' },
]

// Config de estado unificado desde bookingConfig (mismo color/etiqueta en todo el app)
const statusConfig: Record<string, { label: string; color: string; bg: string }> =
  Object.fromEntries(
    (Object.keys(STATUS_COLORS) as (keyof typeof STATUS_COLORS)[])
      .map(k => [k, { label: STATUS_SHORT[k], ...STATUS_COLORS[k] }]),
  )

export default function AdminReservasPage() {
  const [bookings, setBookings] = useState<any[]>([])
  const [loading, setLoading]   = useState(true)
  const [filter, setFilter]     = useState('all')
  const [search, setSearch]     = useState('')
  const [selected, setSelected]       = useState<any | null>(null)
  const [updating, setUpdating]       = useState<string | null>(null)
  const [toast, setToast]             = useState<{ msg: string; ok: boolean } | null>(null)
  const [page,  setPage]              = useState(1)

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3000)
  }

  useEffect(() => {
    setLoading(true)
    getAdminBookings({ status: filter === 'all' ? undefined : filter })
      .then(d => { setBookings(d ?? []); setLoading(false) })
      .catch(() => { setBookings([]); setLoading(false) })
  }, [filter])

  useEffect(() => { setPage(1) }, [filter, search])

  const filtered = bookings.filter(b =>
    (b.spaces?.name ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (b.profiles?.full_name ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (b.event_type ?? '').toLowerCase().includes(search.toLowerCase())
  )
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  async function handleStatusChange(bookingId: string, status: string) {
    // Confirmar acciones destructivas (cancelar/rechazar afectan pagos en producción)
    if (['cancelled_host', 'cancelled_guest', 'rejected'].includes(status) &&
        !window.confirm(`¿Seguro que quieres cambiar el estado a "${statusConfig[status]?.label ?? status}"? Esta acción afecta la reserva y sus pagos.`)) {
      return
    }
    setUpdating(bookingId)
    const result = await updateBookingStatus(bookingId, status)
    if ('error' in result) {
      showToast(`Error: ${result.error}`, false)
    } else {
      setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status } : b))
      if (selected?.id === bookingId) setSelected((p: any) => ({ ...p, status }))
      showToast(`Estado cambiado a "${statusConfig[status]?.label ?? status}"`, true)
    }
    setUpdating(null)
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      {toast && (
        <div className="fixed top-16 right-4 md:top-5 md:right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold shadow-xl"
          style={{ background: toast.ok ? '#16A34A' : '#DC2626', color: '#fff' }}>
          {toast.ok ? <Check size={15} /> : <X size={15} />} {toast.msg}
        </div>
      )}
      <div className="mb-8">
        <h1 className="text-2xl font-bold" style={{ color: '#0F1623', letterSpacing: '-0.02em' }}>Reservas</h1>
        <p className="text-sm text-gray-500 mt-0.5">{bookings.length} reservas en total</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 mb-6">
        {/* Status pills */}
        <div className="flex gap-1 p-1 rounded-xl overflow-x-auto scrollbar-hide"
          style={{ background: '#fff', border: '1px solid #E8ECF0' }}>
          {STATUS_OPTIONS.map(o => (
            <button key={o.value} onClick={() => setFilter(o.value)}
              className="px-3 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap shrink-0"
              style={filter === o.value ? { background: '#0F1623', color: '#fff' } : { color: '#6B7280' }}>
              {o.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex items-center gap-2 flex-1 px-4 py-2.5 rounded-xl"
            style={{ background: '#fff', border: '1px solid #E8ECF0' }}>
            <Search size={15} className="text-gray-400 shrink-0" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Buscar espacio, cliente o evento..."
              className="bg-transparent text-sm flex-1 focus:outline-none text-gray-700 placeholder-gray-400"
              style={{ fontSize: 16 }} />
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:grid lg:grid-cols-[1fr_360px] gap-5 items-start">
        {/* Table */}
        <div className="rounded-2xl overflow-hidden" style={{ background: '#fff', border: '1px solid #E8ECF0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
          <div className="overflow-x-auto scrollbar-hide">
          <div className="grid grid-cols-[2fr_1fr_1fr_auto] gap-3 px-5 py-3 text-xs font-semibold min-w-[500px] uppercase tracking-widest text-gray-400"
            style={{ borderBottom: '1px solid #F0F2F5', background: '#FAFBFC' }}>
            <span>Reserva</span><span>Fecha</span><span>Total</span><span>Estado</span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--brand)' }} />
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: '#F8FAFC' }}>
                <CalendarDays size={24} style={{ color: '#9CA3AF' }} />
              </div>
              <p className="text-base font-semibold mb-1" style={{ color: '#374151' }}>No hay reservas en esta vista</p>
              <p className="text-sm" style={{ color: '#9CA3AF' }}>Prueba cambiando el filtro o la búsqueda</p>
            </div>
          ) : (
            <div className="divide-y divide-[#F0F2F5]">
              {paginated.map(bk => {
                const st = statusConfig[bk.status] ?? statusConfig.pending
                return (
                  <button key={bk.id} onClick={() => setSelected(selected?.id === bk.id ? null : bk)}
                    className={cn('w-full grid grid-cols-[2fr_1fr_1fr_auto] gap-3 items-center px-5 py-4 min-w-[500px] text-left transition-colors hover:bg-slate-50',
                      selected?.id === bk.id && 'bg-slate-50'
                    )}>
                    <div className="min-w-0">
                      <div className="font-semibold text-sm truncate" style={{ color: '#0F1623' }}>
                        {bk.spaces?.name}
                      </div>
                      <div className="text-xs text-gray-400 truncate">
                        {bk.profiles?.full_name} · {bk.event_type}
                      </div>
                    </div>
                    <div className="text-sm text-gray-600">{formatDate(bk.event_date)}</div>
                    <div className="text-sm font-bold" style={{ color: '#0F1623' }}>{formatCurrency(Number(bk.total_amount))}</div>
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
                      style={{ background: st.bg, color: st.color }}>
                      {st.label}
                    </span>
                  </button>
                )
              })}
            </div>
          )}
          <Pagination page={page} total={filtered.length} pageSize={PAGE_SIZE} onChange={p => { setPage(p); setSelected(null) }} className="px-5 pb-4" />
          </div>{/* end overflow-x-auto */}
        </div>

        {/* Detail panel */}
        {selected ? (
          <div className="rounded-2xl overflow-hidden lg:sticky lg:top-8"
            style={{ background: '#fff', border: '1px solid #E8ECF0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            <div className="px-5 py-4" style={{ borderBottom: '1px solid #F0F2F5' }}>
              <div className="font-bold text-sm" style={{ color: '#0F1623' }}>Detalle de reserva</div>
              <div className="text-xs text-gray-400 mt-0.5">ID: {selected.id.slice(0,8).toUpperCase()}</div>
            </div>
            <div className="p-5 space-y-4">
              {/* Space */}
              <div>
                <div className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">Espacio</div>
                <div className="font-semibold text-sm" style={{ color: '#0F1623' }}>{selected.spaces?.name}</div>
                <div className="text-xs text-gray-500 flex items-center gap-1">
                  <MapPin size={10} /> {selected.spaces?.city}
                </div>
              </div>

              {/* Client */}
              <div>
                <div className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">Cliente</div>
                <div className="font-semibold text-sm" style={{ color: '#0F1623' }}>{selected.profiles?.full_name}</div>
                <div className="text-xs text-gray-500">{selected.profiles?.email}</div>
                {selected.profiles?.phone && <div className="text-xs text-gray-500">{selected.profiles.phone}</div>}
              </div>

              {/* Host */}
              <div>
                <div className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">Propietario</div>
                <div className="text-sm" style={{ color: '#374151' }}>{selected.spaces?.profiles?.full_name}</div>
              </div>

              {/* Event details */}
              <div className="rounded-xl p-4 space-y-2" style={{ background: '#F8FAFB', border: '1px solid #E8ECF0' }}>
                {[
                  { label: 'Evento',    value: selected.event_type },
                  { label: 'Fecha',     value: formatDate(selected.event_date) },
                  { label: 'Horario',   value: `${formatTime(selected.start_time)} – ${formatTime(selected.end_time)}` },
                  { label: 'Personas',  value: `${selected.guest_count}` },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between text-sm">
                    <span className="text-gray-500">{label}</span>
                    <span className="font-medium" style={{ color: '#0F1623' }}>{value}</span>
                  </div>
                ))}
              </div>

              {/* Paquete incluye */}
              {(selected as any).space_pricing?.pricing_type === 'fixed_package' && (selected as any).space_pricing?.package_includes && (
                <div>
                  <div className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">
                    {(selected as any).space_pricing.package_name ? `Paquete · ${(selected as any).space_pricing.package_name}` : 'Incluye el paquete'}
                  </div>
                  <div className="rounded-xl px-3 py-2.5 text-xs whitespace-pre-line"
                    style={{ background: 'rgba(53,196,147,0.05)', border: '1px solid rgba(53,196,147,0.15)', color: '#6B7280', lineHeight: 1.7 }}>
                    {(selected as any).space_pricing.package_includes}
                  </div>
                </div>
              )}

              {/* Addons */}
              {selected.booking_addons?.length > 0 && (
                <div>
                  <div className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">Adicionales</div>
                  {selected.booking_addons.map((a: any, i: number) => (
                    <div key={i} className="flex justify-between text-xs py-1" style={{ color: '#6B7280' }}>
                      <span>{a.space_addons?.name}</span>
                      <span className="font-medium">{formatCurrency(a.subtotal)}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Financials */}
              <div className="rounded-xl p-4 space-y-2" style={{ background: 'rgba(53,196,147,0.05)', border: '1px solid rgba(53,196,147,0.15)' }}>
                <div className="flex justify-between text-sm text-gray-500">
                  <span>Total evento</span><span>{formatCurrency(Number(selected.total_amount))}</span>
                </div>
                <div className="flex justify-between text-sm font-bold" style={{ color: 'var(--brand)' }}>
                  <span>Comisión Espot</span><span>{formatCurrency(Number(selected.platform_fee ?? Number(selected.total_amount) * 0.10))}</span>
                </div>
                <div className="flex justify-between text-xs pt-1" style={{ borderTop: '1px solid rgba(53,196,147,0.15)', color: '#6B7280' }}>
                  <span>Estado de pago</span>
                  <span className="font-medium capitalize">{selected.payment_status}</span>
                </div>
              </div>

              {/* Change status */}
              <div>
                <div className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">Cambiar estado</div>
                <div className="grid grid-cols-2 gap-2">
                  {['confirmed', 'pending', 'completed', 'cancelled_host'].map(status => {
                    const s = statusConfig[status]
                    return (
                      <button key={status}
                        onClick={() => handleStatusChange(selected.id, status)}
                        disabled={updating === selected.id || selected.status === status}
                        className="text-xs font-semibold px-3 py-2 rounded-lg transition-all disabled:opacity-40"
                        style={selected.status === status
                          ? { background: s.bg, color: s.color, border: `1px solid color-mix(in srgb, ${s.color} 19%, transparent)` }
                          : { background: '#F4F6F8', color: '#6B7280', border: '1px solid #E8ECF0' }}>
                        {s.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl p-8 text-center" style={{ background: '#fff', border: '1px solid #E8ECF0' }}>
            <CalendarDays size={24} className="mx-auto mb-3 text-gray-300" />
            <p className="text-sm text-gray-400">Selecciona una reserva para ver el detalle</p>
          </div>
        )}
      </div>
    </div>
  )
}
