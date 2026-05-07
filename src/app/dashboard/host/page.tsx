'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  TrendingUp, TrendingDown, Clock, CheckCircle,
  CalendarDays, MessageSquareQuote, ArrowRight,
  Users, Loader2, DollarSign,
} from 'lucide-react'
import { formatCurrency, formatDate, formatTime } from '@/lib/utils'
import Link from 'next/link'
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { getHostStats, getHostBookings, acceptBooking, rejectBooking } from '@/lib/actions/host'
import { STATUS_LABELS, STATUS_COLORS } from '@/lib/bookingConfig'

// ── Sistema de colores de estado unificado ────────────────
// Verde = confirmado / completado
// Naranja = pendiente / por pagar
// Azul = aceptado / cotización
// Rojo = cancelado / rechazado
// Gris = neutral

function StatusBadge({ status }: { status: string }) {
  const sc = STATUS_COLORS[status as keyof typeof STATUS_COLORS]
  const label = STATUS_LABELS[status as keyof typeof STATUS_LABELS] ?? status
  if (!sc) return null
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full"
      style={{ background: sc.bg, color: sc.color }}>
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: sc.color }} />
      {label}
    </span>
  )
}

// ── Card base — todos los stats siguen este patrón ────────
function StatCard({
  label, value, sub, icon: Icon, iconColor, trend,
}: {
  label:       string
  value:       string | number
  sub?:        string
  icon:        React.ElementType
  iconColor:   string
  trend?:      { value: string; positive: boolean } | null
}) {
  return (
    <div className="rounded-2xl p-5 flex flex-col gap-3"
      style={{ background: '#fff', border: '1px solid var(--border-subtle)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>{label}</span>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: `${iconColor}12` }}>
          <Icon size={15} style={{ color: iconColor }} />
        </div>
      </div>
      <div className="font-bold text-2xl" style={{ color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>
        {value}
      </div>
      <div className="flex items-center justify-between">
        {sub && <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{sub}</span>}
        {trend && (
          <div className="flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full"
            style={{
              background: trend.positive ? 'rgba(22,163,74,0.08)' : 'rgba(220,38,38,0.08)',
              color:      trend.positive ? '#16A34A' : '#DC2626',
            }}>
            {trend.positive ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
            {trend.value}
          </div>
        )}
      </div>
    </div>
  )
}

function PublishedToast() {
  const searchParams = useSearchParams()
  const [show, setShow] = useState(searchParams.get('published') === '1')
  useEffect(() => { if (show) setTimeout(() => setShow(false), 4000) }, [show])
  if (!show) return null
  return (
    <div className="fixed top-6 right-6 z-50 px-5 py-3 rounded-xl shadow-lg flex items-center gap-2 text-sm font-medium text-white"
      style={{ background: '#35C493' }}>
      <CheckCircle size={16} /> Espacio publicado correctamente
    </div>
  )
}

export default function DashboardPage() {
  const [stats,    setStats]    = useState<Awaited<ReturnType<typeof getHostStats>>>(null)
  const [bookings, setBookings] = useState<Awaited<ReturnType<typeof getHostBookings>>>([])
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    Promise.all([getHostStats(), getHostBookings()]).then(([s, b]) => {
      setStats(s); setBookings(b); setLoading(false)
    })
  }, [])

  async function handleConfirm(id: string) {
    await acceptBooking(id)
    setBookings(prev => prev.map(b => b.id === id ? { ...b, status: 'accepted' } : b))
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
    .filter(b => b.event_date >= new Date().toISOString().split('T')[0]
      && !['cancelled_guest', 'cancelled_host', 'rejected'].includes(b.status))
    .slice(0, 6)

  if (loading) return (
    <div className="flex items-center justify-center h-screen">
      <Loader2 size={28} className="animate-spin" style={{ color: 'var(--brand)' }} />
    </div>
  )

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      <Suspense fallback={null}><PublishedToast /></Suspense>

      {/* ── Encabezado ── */}
      <div className="mb-6 md:mb-8">
        <h1 className="text-xl md:text-2xl font-bold" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
          Panel de control
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
          Resumen de tu actividad en espot.do
        </p>
      </div>

      {/* ── Métricas principales ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8">
        <StatCard
          label="Ingresos del mes"
          value={formatCurrency(stats?.revenueThisMonth ?? 0)}
          sub={stats?.revenuePrevMonth ? `vs ${formatCurrency(stats.revenuePrevMonth)} anterior` : 'Sin eventos aún'}
          icon={DollarSign}
          iconColor="#35C493"
          trend={growth ? { value: `${growth}%`, positive: isPositive } : null}
        />
        <StatCard
          label="Reservas pendientes"
          value={stats?.pendingCount ?? 0}
          sub={stats?.pendingCount ? 'Requieren respuesta' : 'Sin pendientes'}
          icon={Clock}
          iconColor="#D97706"
        />
        <StatCard
          label="Confirmadas este mes"
          value={stats?.confirmedCount ?? 0}
          sub="eventos confirmados"
          icon={CheckCircle}
          iconColor="#16A34A"
        />
        <StatCard
          label="Cotizaciones abiertas"
          value={stats?.pendingQuotes ?? 0}
          sub="sin responder"
          icon={MessageSquareQuote}
          iconColor="#2563EB"
        />
      </div>

      {/* ── Gráfica + Próximo evento ── */}
      <div className="grid lg:grid-cols-3 gap-4 md:gap-5 mb-6 md:mb-8">

        {/* Gráfica */}
        <div className="lg:col-span-2 rounded-2xl p-6"
          style={{ background: '#fff', border: '1px solid var(--border-subtle)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Ingresos por mes</h2>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Últimos 6 meses</p>
            </div>
            <span className="font-bold text-lg" style={{ color: 'var(--brand)', letterSpacing: '-0.02em' }}>
              {formatCurrency(stats?.revenueThisMonth ?? 0)}
            </span>
          </div>
          {stats?.monthlyRevenue?.some(m => m.ingresos > 0) ? (
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={stats.monthlyRevenue}>
                <defs>
                  <linearGradient id="gradIngresos" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#35C493" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#35C493" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="mes" stroke="#E5E7EB" tick={{ fill: '#9CA3AF', fontSize: 11 }}
                  axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 10, color: '#111827', fontSize: 12 }}
                  formatter={(v) => [formatCurrency(Number(v)), 'Ingresos']}
                />
                <Area type="monotone" dataKey="ingresos"
                  stroke="#35C493" strokeWidth={2} fill="url(#gradIngresos)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-40 text-sm rounded-xl"
              style={{ color: 'var(--text-muted)', background: 'var(--bg-elevated)', border: '1px dashed var(--border-medium)' }}>
              Aquí aparecerá la gráfica cuando tengas reservas confirmadas
            </div>
          )}
        </div>

        {/* Próximo evento */}
        <div className="rounded-2xl p-6"
          style={{ background: '#fff', border: '1px solid var(--border-subtle)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <h2 className="font-semibold text-sm mb-4" style={{ color: 'var(--text-primary)' }}>Próximo evento</h2>
          {stats?.nextBooking ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <StatusBadge status={stats.nextBooking.status} />
              </div>
              <div>
                <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                  {(stats.nextBooking as any).profiles?.full_name ?? 'Cliente'}
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  {stats.nextBooking.event_type}
                </p>
              </div>
              <div className="space-y-2">
                {[
                  { icon: CalendarDays, text: formatDate(stats.nextBooking.event_date) },
                  { icon: Clock, text: `${formatTime(stats.nextBooking.start_time)} – ${formatTime(stats.nextBooking.end_time)}` },
                  { icon: Users, text: `${stats.nextBooking.guest_count} personas` },
                ].map(({ icon: Icon, text }) => (
                  <div key={text} className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
                    <Icon size={12} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                    {text}
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between pt-3"
                style={{ borderTop: '1px solid var(--border-subtle)' }}>
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Total del evento</span>
                <span className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
                  {formatCurrency(Number(stats.nextBooking.total_amount))}
                </span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-44 text-center gap-3">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
                style={{ background: 'var(--bg-elevated)' }}>
                <CalendarDays size={20} style={{ color: 'var(--text-muted)' }} />
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Sin eventos próximos</p>
                <Link href="/" className="text-xs mt-1 inline-block" style={{ color: 'var(--brand)' }}>
                  Ver marketplace
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Tabla de reservas ── */}
      <div className="rounded-2xl overflow-hidden"
        style={{ background: '#fff', border: '1px solid var(--border-subtle)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <div className="flex items-center gap-3">
            <h2 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
              Reservas próximas
            </h2>
            {(stats?.pendingCount ?? 0) > 0 && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                style={{ background: 'rgba(217,119,6,0.1)', color: '#D97706' }}>
                {stats?.pendingCount} pendiente{stats?.pendingCount !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          <Link href="/dashboard/host/reservas"
            className="flex items-center gap-1 text-xs font-medium transition-colors"
            style={{ color: 'var(--brand)' }}>
            Ver todas <ArrowRight size={13} />
          </Link>
        </div>

        {/* Filas */}
        {upcomingBookings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 gap-3">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
              style={{ background: 'var(--bg-elevated)' }}>
              <CalendarDays size={20} style={{ color: 'var(--text-muted)' }} />
            </div>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No hay reservas próximas</p>
          </div>
        ) : (
          <div>
            {upcomingBookings.map((booking: any, i) => (
              <div key={booking.id}
                className="px-4 md:px-6 py-4 transition-colors"
                style={{ borderTop: i > 0 ? '1px solid var(--border-subtle)' : undefined }}>

                {/* ── Layout móvil: card compacta ── */}
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold mt-0.5"
                    style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>
                    {booking.profiles?.full_name?.charAt(0)?.toUpperCase() ?? '?'}
                  </div>

                  {/* Info + acciones */}
                  <div className="flex-1 min-w-0">
                    {/* Fila superior: nombre + monto */}
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                        {booking.profiles?.full_name ?? 'Cliente'}
                      </span>
                      <span className="text-sm font-bold shrink-0" style={{ color: 'var(--text-primary)' }}>
                        {formatCurrency(Number(booking.total_amount))}
                      </span>
                    </div>

                    {/* Fila media: evento + status */}
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                        {booking.event_type}
                      </span>
                      <StatusBadge status={booking.status} />
                    </div>

                    {/* Meta: fecha + hora + personas */}
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                        <CalendarDays size={10} /> {formatDate(booking.event_date)}
                      </span>
                      <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                        <Clock size={10} /> {formatTime(booking.start_time)} – {formatTime(booking.end_time)}
                      </span>
                      <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                        <Users size={10} /> {booking.guest_count}
                      </span>
                    </div>

                    {/* Acciones para pendientes */}
                    {booking.status === 'pending' && (
                      <div className="flex gap-2 mt-3">
                        <button onClick={() => handleConfirm(booking.id)}
                          className="flex-1 text-xs font-semibold py-2 rounded-xl transition-all"
                          style={{ background: 'rgba(22,163,74,0.08)', color: '#16A34A', border: '1px solid rgba(22,163,74,0.2)' }}>
                          Aceptar
                        </button>
                        <button onClick={() => handleReject(booking.id)}
                          className="flex-1 text-xs font-semibold py-2 rounded-xl transition-all"
                          style={{ background: 'rgba(220,38,38,0.06)', color: '#DC2626', border: '1px solid rgba(220,38,38,0.15)' }}>
                          Rechazar
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
