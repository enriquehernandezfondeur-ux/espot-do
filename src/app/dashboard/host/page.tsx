'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { TrendingUp, TrendingDown, Clock, CheckCircle, CalendarDays, MessageSquareQuote, ArrowRight, Users, Loader2 } from 'lucide-react'
import { formatCurrency, formatDate, formatTime } from '@/lib/utils'
import Link from 'next/link'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { getHostStats, getHostBookings, confirmBooking, rejectBooking } from '@/lib/actions/host'
import { cn } from '@/lib/utils'

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

function PublishedToast() {
  const searchParams = useSearchParams()
  const [show, setShow] = useState(searchParams.get('published') === '1')
  useEffect(() => { if (show) setTimeout(() => setShow(false), 4000) }, [show])
  if (!show) return null
  return (
    <div className="fixed top-6 right-6 z-50 bg-green-600 text-white px-5 py-3 rounded-xl shadow-lg flex items-center gap-2">
      <CheckCircle size={18} /> ¡Tu Espot fue publicado exitosamente!
    </div>
  )
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Awaited<ReturnType<typeof getHostStats>>>(null)
  const [bookings, setBookings] = useState<Awaited<ReturnType<typeof getHostBookings>>>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([getHostStats(), getHostBookings()]).then(([s, b]) => {
      setStats(s)
      setBookings(b)
      setLoading(false)
    })
  }, [])

  async function handleConfirm(id: string) {
    await confirmBooking(id)
    setBookings(prev => prev.map(b => b.id === id ? { ...b, status: 'confirmed' } : b))
    setStats(prev => prev ? { ...prev, pendingCount: Math.max(0, prev.pendingCount - 1), confirmedCount: prev.confirmedCount + 1 } : prev)
  }

  async function handleReject(id: string) {
    await rejectBooking(id)
    setBookings(prev => prev.map(b => b.id === id ? { ...b, status: 'cancelled_host' } : b))
    setStats(prev => prev ? { ...prev, pendingCount: Math.max(0, prev.pendingCount - 1) } : prev)
  }

  const growth = stats && stats.revenuePrevMonth > 0
    ? ((stats.revenueThisMonth - stats.revenuePrevMonth) / stats.revenuePrevMonth * 100).toFixed(1)
    : null
  const isPositive = (stats?.revenueThisMonth ?? 0) >= (stats?.revenuePrevMonth ?? 0)

  const upcomingBookings = bookings
    .filter(b => b.event_date >= new Date().toISOString().split('T')[0] && !['cancelled_guest', 'cancelled_host'].includes(b.status))
    .slice(0, 5)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 text-[#35C493] animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <Suspense fallback={null}><PublishedToast /></Suspense>

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Buenos días 👋</h1>
        <p className="text-slate-400 mt-1">Aquí está el resumen de tu espacio en espot.do</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="bg-gradient-to-br from-[#35C493]/20 to-purple-700/20 border border-[rgba(53,196,147,0.20)] rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-slate-400 text-sm">Ingresos del mes</span>
            {growth !== null && (
              <div className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${isPositive ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                {growth}%
              </div>
            )}
          </div>
          <div className="text-2xl font-bold text-white">{formatCurrency(stats?.revenueThisMonth ?? 0)}</div>
          <div className="text-slate-500 text-xs mt-1">
            {stats?.revenuePrevMonth ? `vs ${formatCurrency(stats.revenuePrevMonth)} el mes pasado` : 'Sin eventos aún'}
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-slate-400 text-sm">Pendientes de confirmar</span>
            <div className="w-8 h-8 bg-amber-500/10 rounded-lg flex items-center justify-center">
              <Clock size={16} className="text-amber-400" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white">{stats?.pendingCount ?? 0}</div>
          <div className="text-slate-500 text-xs mt-1">
            {stats?.pendingCount ? 'Requieren tu respuesta' : 'Todo al día ✓'}
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-slate-400 text-sm">Confirmadas este mes</span>
            <div className="w-8 h-8 bg-green-500/10 rounded-lg flex items-center justify-center">
              <CheckCircle size={16} className="text-green-400" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white">{stats?.confirmedCount ?? 0}</div>
          <div className="text-slate-500 text-xs mt-1">eventos este mes</div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-slate-400 text-sm">Cotizaciones pendientes</span>
            <div className="w-8 h-8 bg-blue-500/10 rounded-lg flex items-center justify-center">
              <MessageSquareQuote size={16} className="text-blue-400" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white">{stats?.pendingQuotes ?? 0}</div>
          <div className="text-slate-500 text-xs mt-1">sin responder</div>
        </div>
      </div>

      {/* Chart + Next booking */}
      <div className="grid grid-cols-3 gap-6 mb-8">
        <div className="col-span-2 bg-white/5 border border-white/10 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-white font-semibold">Ingresos por mes</h2>
              <p className="text-slate-500 text-sm">Últimos 6 meses</p>
            </div>
            <div className="text-right">
              <div className="text-[#35C493] font-bold text-lg">{formatCurrency(stats?.revenueThisMonth ?? 0)}</div>
              <div className="text-slate-500 text-xs">este mes</div>
            </div>
          </div>
          {(stats?.monthlyRevenue?.some(m => m.ingresos > 0)) ? (
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={stats?.monthlyRevenue ?? []}>
                <defs>
                  <linearGradient id="colorIngresos" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="mes" stroke="#475569" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip
                  contentStyle={{ background: '#1e1b4b', border: '1px solid #4c1d95', borderRadius: 12, color: '#fff' }}
                  formatter={(value) => [formatCurrency(Number(value)), 'Ingresos']}
                />
                <Area type="monotone" dataKey="ingresos" stroke="#7c3aed" strokeWidth={2} fill="url(#colorIngresos)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-44 text-slate-600 text-sm">
              Aquí aparecerá tu gráfica cuando tengas reservas confirmadas
            </div>
          )}
        </div>

        {/* Next booking */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <h2 className="text-white font-semibold mb-4">Próximo evento</h2>
          {stats?.nextBooking ? (
            <div className="bg-[rgba(53,196,147,0.07)] border border-[rgba(53,196,147,0.20)] rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className={cn('w-2 h-2 rounded-full', stats.nextBooking.status === 'confirmed' ? 'bg-green-400 animate-pulse' : 'bg-amber-400')} />
                <span className={cn('text-xs font-medium', stats.nextBooking.status === 'confirmed' ? 'text-green-400' : 'text-amber-400')}>
                  {statusConfig[stats.nextBooking.status]?.label}
                </span>
              </div>
              <p className="text-white font-semibold">{(stats.nextBooking as any).profiles?.full_name ?? 'Cliente'}</p>
              <p className="text-[#4DD9A7] text-sm">🎊 {stats.nextBooking.event_type}</p>
              <div className="mt-3 space-y-1.5">
                <div className="flex items-center gap-2 text-slate-400 text-xs">
                  <CalendarDays size={12} />{formatDate(stats.nextBooking.event_date)}
                </div>
                <div className="flex items-center gap-2 text-slate-400 text-xs">
                  <Clock size={12} />{formatTime(stats.nextBooking.start_time)} – {formatTime(stats.nextBooking.end_time)}
                </div>
                <div className="flex items-center gap-2 text-slate-400 text-xs">
                  <Users size={12} />{stats.nextBooking.guest_count} personas
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-[rgba(53,196,147,0.20)] flex items-center justify-between">
                <span className="text-slate-400 text-xs">Total</span>
                <span className="text-white font-bold">{formatCurrency(Number(stats.nextBooking.total_amount))}</span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-40 text-center">
              <CalendarDays className="w-8 h-8 text-slate-600 mb-2" />
              <p className="text-slate-500 text-sm">Sin eventos próximos</p>
              <Link href="/" className="text-[#35C493] text-xs mt-2 hover:text-[#4DD9A7]">Ver marketplace →</Link>
            </div>
          )}
        </div>
      </div>

      {/* Bookings table */}
      <div className="bg-white/5 border border-white/10 rounded-2xl">
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div className="flex items-center gap-2">
            <h2 className="text-white font-semibold">Reservas próximas</h2>
            {stats?.pendingCount ? (
              <span className="bg-amber-500 text-white text-xs px-2 py-0.5 rounded-full">{stats.pendingCount} pendientes</span>
            ) : null}
          </div>
          <Link href="/dashboard/reservas" className="flex items-center gap-1 text-[#35C493] text-sm hover:text-[#4DD9A7] transition-colors">
            Ver todas <ArrowRight size={14} />
          </Link>
        </div>

        {upcomingBookings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <CalendarDays className="w-8 h-8 text-slate-600 mb-2" />
            <p className="text-slate-500 text-sm">No hay reservas próximas</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {upcomingBookings.map((booking: any) => (
              <div key={booking.id} className="flex items-center gap-4 p-5 hover:bg-white/2 transition-colors">
                <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-[#28A87C] rounded-full flex items-center justify-center shrink-0">
                  <span className="text-white font-bold text-sm">
                    {booking.profiles?.full_name?.charAt(0) ?? '?'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-white font-medium text-sm">{booking.profiles?.full_name ?? 'Cliente'}</span>
                    <span className="text-slate-500 text-xs">· {booking.event_type}</span>
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
                <div className="flex items-center gap-2">
                  <span className={cn('text-xs px-2.5 py-1 rounded-full border flex items-center gap-1.5', statusConfig[booking.status]?.className)}>
                    <span className={cn('w-1.5 h-1.5 rounded-full', statusConfig[booking.status]?.dot)} />
                    {statusConfig[booking.status]?.label}
                  </span>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-white font-bold">{formatCurrency(Number(booking.total_amount))}</div>
                  <div className={cn('text-xs', paymentConfig[booking.payment_status]?.className)}>
                    {paymentConfig[booking.payment_status]?.label}
                  </div>
                </div>
                {booking.status === 'pending' && (
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => handleConfirm(booking.id)}
                      className="bg-green-600/20 hover:bg-green-600/30 text-green-400 text-xs px-3 py-1.5 rounded-lg transition-colors border border-green-500/20"
                    >
                      Confirmar
                    </button>
                    <button
                      onClick={() => handleReject(booking.id)}
                      className="bg-red-600/20 hover:bg-red-600/30 text-red-400 text-xs px-3 py-1.5 rounded-lg transition-colors border border-red-500/20"
                    >
                      Rechazar
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
