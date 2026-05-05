'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { CalendarDays, Clock, Users, MapPin, ChevronRight, Loader2, Search, CreditCard, CheckCircle } from 'lucide-react'
import { formatCurrency, formatDate, formatTime } from '@/lib/utils'
import { getClientBookings } from '@/lib/actions/client'
import { confirmPayment } from '@/lib/actions/booking'
import { STATUS_LABELS, STATUS_COLORS } from '@/lib/bookingConfig'
import { cn } from '@/lib/utils'

type Booking = Awaited<ReturnType<typeof getClientBookings>>[0]

const FILTERS = ['Todas', 'Pendientes', 'Aceptadas', 'Confirmadas', 'Completadas', 'Canceladas']

export default function MisReservasPage() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading]   = useState(true)
  const [filter, setFilter]     = useState('Todas')
  const [search, setSearch]     = useState('')
  const [selected, setSelected] = useState<Booking | null>(null)
  const [paying, setPaying]     = useState<string | null>(null)

  useEffect(() => {
    getClientBookings().then(d => { setBookings(d); setLoading(false) })
  }, [])

  const filtered = bookings.filter(b => {
    const matchFilter =
      filter === 'Todas'      ||
      (filter === 'Pendientes'  && b.status === 'pending') ||
      (filter === 'Aceptadas'   && b.status === 'accepted') ||
      (filter === 'Confirmadas' && b.status === 'confirmed') ||
      (filter === 'Completadas' && b.status === 'completed') ||
      (filter === 'Canceladas'  && b.status.startsWith('cancelled'))
    const matchSearch =
      ((b as any).spaces?.name ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (b.event_type ?? '').toLowerCase().includes(search.toLowerCase())
    return matchFilter && matchSearch
  })

  async function handlePay(bookingId: string) {
    setPaying(bookingId)
    const result = await confirmPayment(bookingId)
    if (!('error' in result)) {
      setBookings(prev => prev.map(b =>
        b.id === bookingId ? { ...b, status: 'confirmed' as const, payment_status: 'partial' } : b
      ))
      if (selected?.id === bookingId) {
        setSelected((p: Booking | null) => p ? { ...p, status: 'confirmed' as const, payment_status: 'partial' } : null)
      }
    }
    setPaying(null)
  }

  // Cuántas reservas están esperando pago
  const pendingPayment = bookings.filter(b => b.status === 'accepted').length

  if (loading) return (
    <div className="flex items-center justify-center h-screen">
      <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--brand)' }} />
    </div>
  )

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Mis reservas</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          {bookings.length} reserva{bookings.length !== 1 ? 's' : ''} en total
          {pendingPayment > 0 && (
            <span className="ml-2 font-semibold" style={{ color: '#2563EB' }}>
              · {pendingPayment} esperan tu pago
            </span>
          )}
        </p>
      </div>

      {/* Alerta de pago pendiente */}
      {pendingPayment > 0 && (
        <div className="mb-6 rounded-2xl px-5 py-4 flex items-center justify-between"
          style={{ background: 'rgba(37,99,235,0.06)', border: '1.5px solid rgba(37,99,235,0.2)' }}>
          <div>
            <div className="font-semibold text-sm" style={{ color: '#1D4ED8' }}>
              🎉 ¡Tu reserva fue aceptada!
            </div>
            <div className="text-sm" style={{ color: '#3B82F6' }}>
              Completa el pago del 10% para confirmar tu fecha.
            </div>
          </div>
          <button onClick={() => setFilter('Aceptadas')}
            className="text-xs font-semibold px-4 py-2 rounded-xl shrink-0"
            style={{ background: '#2563EB', color: '#fff' }}>
            Ver ahora
          </button>
        </div>
      )}

      {/* Filtros */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="flex gap-1 p-1 rounded-2xl overflow-x-auto" style={{ background: 'var(--bg-elevated)' }}>
          {FILTERS.map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className="px-3 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap"
              style={filter === f
                ? { background: '#fff', color: 'var(--text-primary)', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }
                : { color: 'var(--text-secondary)' }}>
              {f}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 rounded-xl px-4 py-2.5 input-base shrink-0">
          <Search size={15} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar..."
            className="bg-transparent text-sm focus:outline-none w-36"
            style={{ color: 'var(--text-primary)' }} />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 rounded-3xl text-center"
          style={{ background: '#fff', border: '2px dashed var(--border-medium)' }}>
          <CalendarDays size={32} className="mb-3" style={{ color: 'var(--text-muted)' }} />
          <p className="font-medium mb-1" style={{ color: 'var(--text-primary)' }}>Sin reservas</p>
          <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
            {filter === 'Todas' ? 'Aún no has hecho ninguna reserva' : `No tienes reservas ${filter.toLowerCase()}`}
          </p>
          <Link href="/buscar" className="btn-brand text-sm font-semibold px-5 py-2.5 rounded-xl">
            Explorar espacios
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((bk: any) => {
            const sc    = STATUS_COLORS[bk.status as keyof typeof STATUS_COLORS] ?? { color: '#6B7280', bg: '#F4F6F8' }
            const sl    = STATUS_LABELS[bk.status as keyof typeof STATUS_LABELS] ?? bk.status
            const space = bk.spaces
            const cover = space?.space_images?.find((i: any) => i.is_cover)?.url ?? space?.space_images?.[0]?.url
            const isSelected = selected?.id === bk.id

            return (
              <div key={bk.id} className="rounded-2xl overflow-hidden transition-all"
                style={{ background: '#fff', border: `1.5px solid ${isSelected ? 'var(--brand)' : bk.status === 'accepted' ? 'rgba(37,99,235,0.3)' : 'var(--border-subtle)'}` }}>

                <button className="w-full text-left" onClick={() => setSelected(isSelected ? null : bk)}>
                  <div className="flex items-center gap-4 p-5">
                    {/* Imagen */}
                    <div className="w-20 h-16 rounded-xl overflow-hidden shrink-0" style={{ background: 'var(--bg-elevated)' }}>
                      {cover
                        ? <img src={cover} alt="" className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center text-2xl">🏛️</div>}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-semibold" style={{ color: 'var(--text-primary)' }}>{space?.name}</div>
                          <div className="flex items-center gap-1.5 text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                            <MapPin size={10} /> {space?.sector ? `${space.sector}, ` : ''}{space?.city}
                          </div>
                        </div>
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full shrink-0"
                          style={{ background: sc.bg, color: sc.color }}>
                          {sl}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 mt-2">
                        <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
                          <CalendarDays size={11} /> {formatDate(bk.event_date)}
                        </span>
                        <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
                          <Clock size={11} /> {formatTime(bk.start_time)} – {formatTime(bk.end_time)}
                        </span>
                        <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
                          <Users size={11} /> {bk.guest_count}
                        </span>
                        <span className="ml-auto font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
                          {formatCurrency(Number(bk.total_amount))}
                        </span>
                      </div>
                    </div>
                    <ChevronRight size={16}
                      className={cn('shrink-0 transition-transform', isSelected && 'rotate-90')}
                      style={{ color: 'var(--text-muted)' }} />
                  </div>
                </button>

                {/* ── CTA de pago cuando está aceptada ── */}
                {bk.status === 'accepted' && (
                  <div className="mx-5 mb-4 px-4 py-3.5 rounded-2xl flex items-center justify-between"
                    style={{ background: 'rgba(37,99,235,0.05)', border: '1px solid rgba(37,99,235,0.2)' }}>
                    <div>
                      <div className="text-sm font-semibold" style={{ color: '#1D4ED8' }}>
                        🎉 ¡El propietario aceptó tu reserva!
                      </div>
                      <div className="text-xs mt-0.5" style={{ color: '#3B82F6' }}>
                        Confirma pagando {formatCurrency(Number(bk.platform_fee))} (10% del total)
                      </div>
                    </div>
                    <button
                      onClick={() => handlePay(bk.id)}
                      disabled={paying === bk.id}
                      className="flex items-center gap-1.5 text-sm font-bold px-4 py-2.5 rounded-xl shrink-0 transition-all disabled:opacity-50"
                      style={{ background: '#2563EB', color: '#fff', boxShadow: '0 2px 8px rgba(37,99,235,0.3)' }}>
                      {paying === bk.id
                        ? <><Loader2 size={15} className="animate-spin" /> Procesando...</>
                        : <><CreditCard size={15} /> Pagar {formatCurrency(Number(bk.platform_fee))}</>}
                    </button>
                  </div>
                )}

                {/* ── Detalle expandido ── */}
                {isSelected && (
                  <div className="px-5 pb-5 pt-2" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                    <div className="grid grid-cols-2 gap-4 mt-3">
                      <div className="space-y-3">
                        <div>
                          <div className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>Tipo de evento</div>
                          <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{bk.event_type}</div>
                        </div>
                        {bk.event_notes && (
                          <div>
                            <div className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>Nota enviada</div>
                            <div className="text-sm italic" style={{ color: 'var(--text-secondary)' }}>"{bk.event_notes}"</div>
                          </div>
                        )}
                        {bk.booking_addons?.length > 0 && (
                          <div>
                            <div className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>Adicionales</div>
                            {bk.booking_addons.map((a: any, i: number) => (
                              <div key={i} className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                                · {a.space_addons?.name} — {formatCurrency(a.subtotal)}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="rounded-2xl p-4 space-y-2" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
                        <div className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>Resumen de pago</div>
                        <div className="flex justify-between text-xs" style={{ color: 'var(--text-secondary)' }}>
                          <span>Precio del evento</span>
                          <span>{formatCurrency(Number(bk.total_amount))}</span>
                        </div>
                        <div className="flex justify-between text-xs" style={{ color: 'var(--text-secondary)' }}>
                          <span>Pago inicial (10%) · ahora</span>
                          <span>{formatCurrency(Number(bk.platform_fee))}</span>
                        </div>
                        <div className="flex justify-between font-bold text-sm pt-2"
                          style={{ borderTop: '1px solid var(--border-medium)', color: 'var(--text-primary)' }}>
                          <span>Balance en el espacio</span>
                          <span>{formatCurrency(Number(bk.total_amount) - Number(bk.platform_fee))}</span>
                        </div>
                        <div className="flex items-center gap-1 text-xs font-semibold mt-1"
                          style={{ color: bk.payment_status === 'partial' || bk.payment_status === 'paid' ? '#16A34A' : '#D97706' }}>
                          {bk.payment_status === 'partial' || bk.payment_status === 'paid'
                            ? <><CheckCircle size={11} /> Pago inicial confirmado</>
                            : '⏳ Pago inicial pendiente'}
                        </div>
                      </div>
                    </div>

                    {/* Guías por estado */}
                    {bk.status === 'pending' && (
                      <div className="mt-4 px-4 py-3 rounded-xl text-sm"
                        style={{ background: 'rgba(217,119,6,0.05)', border: '1px solid rgba(217,119,6,0.15)', color: '#92400E' }}>
                        El propietario tiene 24 horas para aceptar o rechazar tu solicitud.
                      </div>
                    )}
                    {bk.status === 'confirmed' && (
                      <div className="mt-4 px-4 py-3 rounded-xl text-sm"
                        style={{ background: 'rgba(22,163,74,0.05)', border: '1px solid rgba(22,163,74,0.15)', color: '#166534' }}>
                        Reserva confirmada. El balance de {formatCurrency(Number(bk.total_amount) - Number(bk.platform_fee))} lo pagas directamente en el espacio el día del evento.
                      </div>
                    )}
                    {bk.status === 'rejected' && (
                      <div className="mt-4 space-y-3">
                        <div className="px-4 py-3 rounded-xl text-sm"
                          style={{ background: 'rgba(220,38,38,0.05)', border: '1px solid rgba(220,38,38,0.15)', color: '#991B1B' }}>
                          El propietario no pudo aceptar tu solicitud para esta fecha.
                          {bk.rejection_reason && (
                            <p className="mt-1 font-medium">Motivo: {bk.rejection_reason}</p>
                          )}
                        </div>
                        <Link href="/buscar" className="btn-brand text-sm font-semibold px-5 py-2.5 rounded-xl inline-block">
                          Buscar otro espacio
                        </Link>
                      </div>
                    )}
                    {bk.status === 'cancelled_host' && (
                      <div className="mt-4 space-y-3">
                        <div className="px-4 py-3 rounded-xl text-sm"
                          style={{ background: 'rgba(220,38,38,0.05)', border: '1px solid rgba(220,38,38,0.15)', color: '#991B1B' }}>
                          El propietario canceló esta reserva.
                          {bk.cancellation_reason && (
                            <p className="mt-1 font-medium">Motivo: {bk.cancellation_reason}</p>
                          )}
                        </div>
                        <Link href="/buscar" className="btn-brand text-sm font-semibold px-5 py-2.5 rounded-xl inline-block">
                          Buscar otro espacio
                        </Link>
                      </div>
                    )}
                    {bk.status === 'cancelled_guest' && (
                      <div className="mt-4 px-4 py-3 rounded-xl text-sm"
                        style={{ background: 'rgba(107,114,128,0.05)', border: '1px solid rgba(107,114,128,0.15)', color: '#6B7280' }}>
                        Cancelaste esta reserva.
                        {bk.cancellation_reason && (
                          <p className="mt-1">Motivo: {bk.cancellation_reason}</p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
