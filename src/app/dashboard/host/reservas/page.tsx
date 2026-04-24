'use client'

import { useState, useEffect } from 'react'
import { CalendarDays, Clock, Users, CheckCircle, XCircle, Eye, Search, Loader2 } from 'lucide-react'
import { formatCurrency, formatDate, formatTime } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { getHostBookings, confirmBooking, rejectBooking } from '@/lib/actions/host'

type Booking = Awaited<ReturnType<typeof getHostBookings>>[0]

const statusConfig: Record<string, { label: string; className: string; dot: string }> = {
  pending:         { label: 'Pendiente',  className: 'bg-amber-500/10 text-amber-400 border-amber-500/20',  dot: 'bg-amber-400' },
  confirmed:       { label: 'Confirmada', className: 'bg-green-500/10 text-green-400 border-green-500/20',  dot: 'bg-green-400' },
  completed:       { label: 'Completada', className: 'bg-blue-500/10 text-blue-400 border-blue-500/20',    dot: 'bg-blue-400' },
  cancelled_guest: { label: 'Cancelada',  className: 'bg-red-500/10 text-red-400 border-red-500/20',       dot: 'bg-red-400' },
  cancelled_host:  { label: 'Cancelada',  className: 'bg-red-500/10 text-red-400 border-red-500/20',       dot: 'bg-red-400' },
}

const paymentConfig: Record<string, { label: string; className: string }> = {
  unpaid:  { label: 'Sin pago',    className: 'text-red-400' },
  partial: { label: '10% pagado',  className: 'text-amber-400' },
  advance: { label: 'Anticipo OK', className: 'text-blue-400' },
  paid:    { label: 'Pagado',      className: 'text-green-400' },
}

const filters = ['Todas', 'Pendientes', 'Confirmadas', 'Completadas', 'Canceladas']

export default function ReservasPage() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [activeFilter, setActiveFilter] = useState('Todas')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Booking | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  useEffect(() => {
    getHostBookings().then(data => { setBookings(data); setLoading(false) })
  }, [])

  async function handleConfirm(id: string) {
    setActionLoading(id)
    await confirmBooking(id)
    setBookings(prev => prev.map(b => b.id === id ? { ...b, status: 'confirmed' as const } : b))
    if (selected?.id === id) setSelected((prev: Booking | null) => prev ? { ...prev, status: 'confirmed' as const } : null)
    setActionLoading(null)
  }

  async function handleReject(id: string) {
    setActionLoading(id)
    await rejectBooking(id)
    setBookings(prev => prev.map(b => b.id === id ? { ...b, status: 'cancelled_host' as const } : b))
    if (selected?.id === id) setSelected((prev: Booking | null) => prev ? { ...prev, status: 'cancelled_host' as const } : null)
    setActionLoading(null)
  }

  const filtered = bookings.filter(b => {
    const matchFilter =
      activeFilter === 'Todas' ||
      (activeFilter === 'Pendientes'  && b.status === 'pending') ||
      (activeFilter === 'Confirmadas' && b.status === 'confirmed') ||
      (activeFilter === 'Completadas' && b.status === 'completed') ||
      (activeFilter === 'Canceladas'  && ['cancelled_guest','cancelled_host'].includes(b.status))
    const guest = (b as any).profiles
    const matchSearch =
      (guest?.full_name ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (b.event_type ?? '').toLowerCase().includes(search.toLowerCase())
    return matchFilter && matchSearch
  })

  const statCounts = {
    pending:   bookings.filter(b => b.status === 'pending').length,
    confirmed: bookings.filter(b => b.status === 'confirmed').length,
    completed: bookings.filter(b => b.status === 'completed').length,
    revenue:   bookings.filter(b => b.status === 'confirmed').reduce((s, b) => s + Number(b.total_amount), 0),
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 text-[#35C493] animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Reservas</h1>
        <p className="text-slate-400 mt-1">{bookings.length} reserva{bookings.length !== 1 ? 's' : ''} en total</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Pendientes',          value: statCounts.pending,   color: 'text-amber-400' },
          { label: 'Confirmadas',         value: statCounts.confirmed, color: 'text-green-400' },
          { label: 'Completadas',         value: statCounts.completed, color: 'text-blue-400' },
          { label: 'Ingresos confirmados',value: formatCurrency(statCounts.revenue), color: 'text-[#35C493]' },
        ].map(stat => (
          <div key={stat.label} className="bg-white/5 border border-white/10 rounded-xl p-4">
            <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
            <div className="text-slate-500 text-xs mt-1">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Filters & Search */}
      <div className="flex items-center justify-between gap-4 mb-4">
        <div className="flex gap-1 bg-white/5 rounded-xl p-1">
          {filters.map(f => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium transition-all',
                activeFilter === f ? 'bg-[#35C493] text-white' : 'text-slate-400 hover:text-white'
              )}
            >
              {f}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar cliente o evento..."
            className="bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-[#35C493] text-sm w-64 transition-colors"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <CalendarDays className="w-8 h-8 text-slate-600 mb-2" />
            <p className="text-slate-500">No hay reservas{activeFilter !== 'Todas' ? ` ${activeFilter.toLowerCase()}` : ''}</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {filtered.map((booking: any) => {
              const guest = booking.profiles
              const isLoading = actionLoading === booking.id
              return (
                <div key={booking.id} className="flex items-center gap-4 px-5 py-4 hover:bg-white/2 transition-colors">
                  <div className="w-9 h-9 bg-gradient-to-br from-violet-500 to-[#28A87C] rounded-full flex items-center justify-center shrink-0">
                    <span className="text-white font-bold text-sm">{guest?.full_name?.charAt(0) ?? '?'}</span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-white text-sm font-medium truncate">{guest?.full_name ?? 'Cliente'}</span>
                      <span className="text-slate-500 text-xs">· {booking.event_type}</span>
                      {booking.booking_addons?.length > 0 && (
                        <span className="text-[#35C493] text-xs">+{booking.booking_addons.length} extras</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-slate-500 text-xs flex items-center gap-1">
                        <CalendarDays size={10} /> {formatDate(booking.event_date)}
                      </span>
                      <span className="text-slate-500 text-xs flex items-center gap-1">
                        <Clock size={10} /> {formatTime(booking.start_time)} – {formatTime(booking.end_time)}
                      </span>
                      <span className="text-slate-500 text-xs flex items-center gap-1">
                        <Users size={10} /> {booking.guest_count}
                      </span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-white font-bold text-sm">{formatCurrency(Number(booking.total_amount))}</div>
                    <div className={cn('text-xs', paymentConfig[booking.payment_status]?.className)}>
                      {paymentConfig[booking.payment_status]?.label}
                    </div>
                  </div>

                  <span className={cn('flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border shrink-0', statusConfig[booking.status]?.className)}>
                    <span className={cn('w-1.5 h-1.5 rounded-full', statusConfig[booking.status]?.dot)} />
                    {statusConfig[booking.status]?.label}
                  </span>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => setSelected(booking)}
                      className="p-2 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white rounded-lg transition-colors"
                    >
                      <Eye size={15} />
                    </button>
                    {booking.status === 'pending' && (
                      <>
                        <button
                          onClick={() => handleConfirm(booking.id)}
                          disabled={!!isLoading}
                          className="p-2 bg-green-600/20 hover:bg-green-600/30 text-green-400 rounded-lg border border-green-500/20 transition-colors disabled:opacity-50"
                        >
                          {isLoading ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle size={15} />}
                        </button>
                        <button
                          onClick={() => handleReject(booking.id)}
                          disabled={!!isLoading}
                          className="p-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg border border-red-500/20 transition-colors disabled:opacity-50"
                        >
                          <XCircle size={15} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelected(null)}>
          <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 max-w-lg w-full" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-white font-bold text-lg">Detalle de reserva</h3>
              <button onClick={() => setSelected(null)} className="text-slate-500 hover:text-white text-xl">✕</button>
            </div>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-violet-500 to-[#28A87C] rounded-full flex items-center justify-center">
                  <span className="text-white font-bold">{(selected as any).profiles?.full_name?.charAt(0) ?? '?'}</span>
                </div>
                <div>
                  <div className="text-white font-semibold">{(selected as any).profiles?.full_name ?? 'Cliente'}</div>
                  <div className="text-slate-400 text-sm">{(selected as any).profiles?.email}</div>
                  {(selected as any).profiles?.phone && (
                    <div className="text-slate-400 text-sm">{(selected as any).profiles.phone}</div>
                  )}
                </div>
                <span className={cn('ml-auto text-xs px-2.5 py-1 rounded-full border', statusConfig[selected.status]?.className)}>
                  {statusConfig[selected.status]?.label}
                </span>
              </div>

              <div className="bg-white/5 rounded-xl p-4 space-y-2.5">
                {[
                  { label: 'Evento',    value: selected.event_type },
                  { label: 'Fecha',     value: formatDate(selected.event_date) },
                  { label: 'Horario',   value: `${formatTime(selected.start_time)} – ${formatTime(selected.end_time)}` },
                  { label: 'Personas',  value: String(selected.guest_count) },
                ].map(row => (
                  <div key={row.label} className="flex justify-between text-sm">
                    <span className="text-slate-400">{row.label}</span>
                    <span className="text-white font-medium">{row.value}</span>
                  </div>
                ))}
                {(selected as any).booking_addons?.length > 0 && (
                  <div className="pt-2 border-t border-white/10">
                    <div className="text-slate-400 text-xs mb-1">Adicionales</div>
                    {(selected as any).booking_addons.map((ba: any, i: number) => (
                      <div key={i} className="flex justify-between text-sm">
                        <span className="text-slate-300">{ba.space_addons?.name}</span>
                        <span className="text-white">{formatCurrency(ba.subtotal)}</span>
                      </div>
                    ))}
                  </div>
                )}
                {selected.event_notes && (
                  <div className="pt-2 border-t border-white/10">
                    <div className="text-slate-400 text-xs mb-1">Nota del cliente</div>
                    <p className="text-slate-300 text-sm italic">"{selected.event_notes}"</p>
                  </div>
                )}
              </div>

              <div className="bg-[rgba(53,196,147,0.07)] border border-[rgba(53,196,147,0.20)] rounded-xl p-4">
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="text-slate-400">Espacio + extras</span>
                  <span className="text-white">{formatCurrency(Number(selected.total_amount) - Number(selected.platform_fee))}</span>
                </div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-slate-400">Comisión Espot (10%)</span>
                  <span className="text-[#35C493]">– {formatCurrency(Number(selected.platform_fee))}</span>
                </div>
                <div className="flex justify-between font-bold border-t border-[rgba(53,196,147,0.20)] pt-2">
                  <span className="text-white">Total</span>
                  <span className="text-white">{formatCurrency(Number(selected.total_amount))}</span>
                </div>
                <div className={cn('text-xs mt-1 text-right', paymentConfig[selected.payment_status]?.className)}>
                  {paymentConfig[selected.payment_status]?.label}
                </div>
              </div>

              {selected.status === 'pending' && (
                <div className="flex gap-3">
                  <button
                    onClick={() => handleConfirm(selected.id)}
                    disabled={actionLoading === selected.id}
                    className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl transition-colors"
                  >
                    {actionLoading === selected.id ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                    Confirmar
                  </button>
                  <button
                    onClick={() => handleReject(selected.id)}
                    disabled={actionLoading === selected.id}
                    className="flex-1 flex items-center justify-center gap-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/20 font-semibold py-2.5 rounded-xl transition-colors"
                  >
                    <XCircle size={16} /> Rechazar
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
