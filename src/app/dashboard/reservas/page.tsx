'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { CalendarDays, Clock, Users, MapPin, ChevronRight, Loader2, Search } from 'lucide-react'
import { formatCurrency, formatDate, formatTime } from '@/lib/utils'
import { getClientBookings } from '@/lib/actions/client'
import { cn } from '@/lib/utils'

type Booking = Awaited<ReturnType<typeof getClientBookings>>[0]

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  pending:         { label: 'Pendiente de confirmación', color: '#D97706', bg: 'rgba(217,119,6,0.08)' },
  confirmed:       { label: 'Confirmada',                color: '#16A34A', bg: 'rgba(22,163,74,0.08)' },
  completed:       { label: 'Completada',                color: '#2563EB', bg: 'rgba(37,99,235,0.08)' },
  cancelled_guest: { label: 'Cancelada',                 color: '#DC2626', bg: 'rgba(220,38,38,0.08)' },
  cancelled_host:  { label: 'Cancelada por propietario', color: '#DC2626', bg: 'rgba(220,38,38,0.08)' },
  quote_requested: { label: 'Cotización solicitada',     color: '#7C3AED', bg: 'rgba(124,58,237,0.08)' },
}

const filters = ['Todas', 'Pendientes', 'Confirmadas', 'Completadas', 'Canceladas']

export default function MisReservasPage() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading]   = useState(true)
  const [filter, setFilter]     = useState('Todas')
  const [search, setSearch]     = useState('')
  const [selected, setSelected] = useState<Booking | null>(null)

  useEffect(() => {
    getClientBookings().then(d => { setBookings(d); setLoading(false) })
  }, [])

  const filtered = bookings.filter(b => {
    const f =
      filter === 'Todas'      ||
      (filter === 'Pendientes'  && b.status === 'pending') ||
      (filter === 'Confirmadas' && b.status === 'confirmed') ||
      (filter === 'Completadas' && b.status === 'completed') ||
      (filter === 'Canceladas'  && b.status.startsWith('cancelled'))
    const s = (b as any).spaces?.name?.toLowerCase().includes(search.toLowerCase()) ||
              b.event_type?.toLowerCase().includes(search.toLowerCase())
    return f && s
  })

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
        </p>
      </div>

      {/* Filters + search */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="flex gap-1 p-1 rounded-2xl" style={{ background: 'var(--bg-elevated)' }}>
          {filters.map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className="px-4 py-2 rounded-xl text-sm font-medium transition-all"
              style={filter === f ? { background: '#fff', color: 'var(--text-primary)', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' } : { color: 'var(--text-secondary)' }}>
              {f}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 rounded-xl px-4 py-2.5 input-base">
          <Search size={15} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar reservas..."
            className="bg-transparent text-sm focus:outline-none" style={{ color: 'var(--text-primary)' }} />
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
            const st = statusConfig[bk.status]
            const space = bk.spaces
            const cover = space?.space_images?.find((i: any) => i.is_cover)?.url ?? space?.space_images?.[0]?.url
            return (
              <button key={bk.id} onClick={() => setSelected(selected?.id === bk.id ? null : bk)}
                className="w-full text-left rounded-2xl overflow-hidden transition-all card-hover"
                style={{ background: '#fff', border: `1px solid ${selected?.id === bk.id ? 'var(--brand)' : 'var(--border-subtle)'}` }}>
                <div className="flex items-center gap-4 p-5">
                  {/* Space image */}
                  <div className="w-20 h-16 rounded-xl overflow-hidden shrink-0"
                    style={{ background: 'var(--bg-elevated)' }}>
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
                      <span className="text-xs font-semibold px-3 py-1 rounded-full shrink-0"
                        style={{ background: st.bg, color: st.color }}>
                        {st.label}
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
                        <Users size={11} /> {bk.guest_count} personas
                      </span>
                      <span className="ml-auto font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
                        {formatCurrency(Number(bk.total_amount))}
                      </span>
                    </div>
                  </div>
                  <ChevronRight size={16} className={cn('shrink-0 transition-transform', selected?.id === bk.id && 'rotate-90')}
                    style={{ color: 'var(--text-muted)' }} />
                </div>

                {/* Expandido: detalle */}
                {selected?.id === bk.id && (
                  <div className="px-5 pb-5 pt-1" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                    <div className="grid grid-cols-2 gap-4 mt-4">
                      <div className="space-y-3">
                        <div>
                          <div className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>Tipo de evento</div>
                          <div className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>{bk.event_type}</div>
                        </div>
                        {bk.event_notes && (
                          <div>
                            <div className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>Tu nota</div>
                            <div className="text-sm italic" style={{ color: 'var(--text-secondary)' }}>"{bk.event_notes}"</div>
                          </div>
                        )}
                        {bk.booking_addons?.length > 0 && (
                          <div>
                            <div className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>Adicionales</div>
                            {bk.booking_addons.map((a: any, i: number) => (
                              <div key={i} className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                                · {a.space_addons?.name} — {formatCurrency(a.subtotal)}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="rounded-2xl p-4 space-y-2"
                        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
                        <div className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>Resumen de pago</div>
                        <div className="flex justify-between text-sm" style={{ color: 'var(--text-secondary)' }}>
                          <span>Espacio + adicionales</span>
                          <span>{formatCurrency(Number(bk.total_amount) - Number(bk.platform_fee))}</span>
                        </div>
                        <div className="flex justify-between text-sm" style={{ color: 'var(--text-secondary)' }}>
                          <span>Tarifa de plataforma (10%)</span>
                          <span>{formatCurrency(Number(bk.platform_fee))}</span>
                        </div>
                        <div className="flex justify-between font-bold pt-2 text-sm"
                          style={{ borderTop: '1px solid var(--border-medium)', color: 'var(--text-primary)' }}>
                          <span>Total</span>
                          <span>{formatCurrency(Number(bk.total_amount))}</span>
                        </div>
                        <div className="text-xs pt-1" style={{ color: bk.payment_status === 'paid' ? '#16A34A' : '#D97706' }}>
                          {bk.payment_status === 'paid' ? '✓ Pagado completo' :
                           bk.payment_status === 'partial' ? '· 10% pagado' : '· Sin pago aún'}
                        </div>
                      </div>
                    </div>
                    {bk.status === 'pending' && (
                      <div className="mt-4 p-4 rounded-2xl flex items-center justify-between"
                        style={{ background: 'rgba(217,119,6,0.06)', border: '1px solid rgba(217,119,6,0.15)' }}>
                        <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                          Esperando confirmación del propietario (máx. 24 horas)
                        </div>
                        <Link href={`/espacios/${space?.slug}`} className="btn-brand text-xs font-semibold px-4 py-2 rounded-xl">
                          Ver espacio
                        </Link>
                      </div>
                    )}
                  </div>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
