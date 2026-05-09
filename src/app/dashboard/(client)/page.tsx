'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { CalendarDays, Clock, CheckCircle, ArrowRight, MapPin, Users, CreditCard, Heart, Loader2 } from 'lucide-react'
import { formatCurrency, formatDate, formatTime } from '@/lib/utils'
import { getClientStats } from '@/lib/actions/client'

const statusConfig: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  pending:         { label: 'Pendiente',  color: '#D97706', bg: 'rgba(217,119,6,0.08)',   dot: 'bg-amber-400' },
  confirmed:       { label: 'Confirmada', color: '#16A34A', bg: 'rgba(22,163,74,0.08)',   dot: 'bg-green-500' },
  completed:       { label: 'Completada', color: '#2563EB', bg: 'rgba(37,99,235,0.08)',   dot: 'bg-blue-500' },
  cancelled_guest: { label: 'Cancelada',  color: '#DC2626', bg: 'rgba(220,38,38,0.08)',   dot: 'bg-red-500' },
  cancelled_host:  { label: 'Cancelada',  color: '#DC2626', bg: 'rgba(220,38,38,0.08)',   dot: 'bg-red-500' },
}

export default function ClientDashboard() {
  const [stats, setStats] = useState<Awaited<ReturnType<typeof getClientStats>>>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getClientStats().then(s => { setStats(s); setLoading(false) })
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center h-screen">
      <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--brand)' }} />
    </div>
  )

  const next = stats?.nextBooking as any
  const today = new Date()
  const daysUntilNext = next ? Math.ceil((new Date(next.event_date).getTime() - today.getTime()) / (1000*60*60*24)) : null

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">

      {/* Header */}
      <div className="mb-6 md:mb-8">
        <h1 className="text-xl md:text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
          Bienvenido 👋
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          Aquí tienes el resumen de tus reservas y actividad
        </p>
      </div>

      {/* Próxima reserva destacada */}
      {next && (
        <div className="mb-6 md:mb-8 rounded-3xl overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #0F2A22 0%, #1A4D38 100%)', boxShadow: '0 8px 32px rgba(53,196,147,0.15)' }}>
          <div className="px-5 md:px-8 py-6 md:py-7">
            {/* Badge de tiempo */}
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.6)' }}>
                Próximo · {daysUntilNext === 0 ? '¡Hoy!' : daysUntilNext === 1 ? 'Mañana' : `En ${daysUntilNext} días`}
              </span>
            </div>

            {/* Nombre del espacio + evento */}
            <h2 className="font-bold mb-1" style={{ color: '#fff', fontSize: 'clamp(1.2rem,4vw,1.5rem)' }}>
              {(next.spaces as any)?.name}
            </h2>
            <p className="text-sm mb-4" style={{ color: 'rgba(255,255,255,0.65)' }}>{next.event_type}</p>

            {/* Meta info — flex-wrap para móvil */}
            <div className="flex items-center gap-3 md:gap-5 flex-wrap mb-5">
              <span className="flex items-center gap-1.5 text-xs md:text-sm" style={{ color: 'rgba(255,255,255,0.8)' }}>
                <CalendarDays size={13} /> {formatDate(next.event_date)}
              </span>
              <span className="flex items-center gap-1.5 text-xs md:text-sm" style={{ color: 'rgba(255,255,255,0.8)' }}>
                <Clock size={13} /> {formatTime(next.start_time)} – {formatTime(next.end_time)}
              </span>
              <span className="flex items-center gap-1.5 text-xs md:text-sm" style={{ color: 'rgba(255,255,255,0.8)' }}>
                <Users size={13} /> {next.guest_count} personas
              </span>
            </div>

            {/* Footer: monto + CTA */}
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-2xl md:text-3xl font-bold" style={{ color: '#fff' }}>
                  {formatCurrency(Number(next.total_amount))}
                </div>
                <div className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>total del evento</div>
              </div>
              <Link href="/dashboard/reservas"
                className="inline-flex items-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-xl shrink-0"
                style={{ background: 'rgba(53,196,147,0.2)', color: '#6EE7C7', border: '1px solid rgba(53,196,147,0.3)' }}>
                Ver detalle <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Stats — 2 cols en móvil, 4 en desktop */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8">
        {[
          { label: 'Total reservas', value: stats?.total ?? 0,     icon: CalendarDays, color: 'var(--brand)' },
          { label: 'Pendientes',     value: stats?.pending ?? 0,   icon: Clock,        color: '#D97706' },
          { label: 'Confirmadas',    value: stats?.confirmed ?? 0, icon: CheckCircle,  color: '#16A34A' },
          { label: 'Total gastado',  value: formatCurrency(stats?.totalSpent ?? 0), icon: CreditCard, color: '#7C3AED' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="rounded-2xl p-4 md:p-5"
            style={{ background: '#fff', border: '1px solid var(--border-subtle)', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs md:text-sm" style={{ color: 'var(--text-secondary)' }}>{label}</span>
              <div className="w-7 h-7 md:w-8 md:h-8 rounded-lg flex items-center justify-center"
                style={{ background: `${color}15` }}>
                <Icon size={14} style={{ color }} />
              </div>
            </div>
            <div className="text-xl md:text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Reservas recientes */}
      <div className="rounded-2xl md:rounded-3xl overflow-hidden mb-6 md:mb-8"
        style={{ background: '#fff', border: '1px solid var(--border-subtle)', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
        <div className="flex items-center justify-between px-4 md:px-6 py-4 md:py-5"
          style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <h2 className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>Reservas recientes</h2>
          <Link href="/dashboard/reservas" className="flex items-center gap-1 text-sm font-medium" style={{ color: 'var(--brand)' }}>
            Ver todas <ArrowRight size={14} />
          </Link>
        </div>

        {!stats?.recent?.length ? (
          <div className="flex flex-col items-center justify-center py-12 md:py-14 text-center px-4">
            <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center mb-4"
              style={{ background: 'var(--bg-elevated)' }}>
              <CalendarDays size={22} style={{ color: 'var(--text-muted)' }} />
            </div>
            <p className="font-medium mb-1" style={{ color: 'var(--text-primary)' }}>Sin reservas aún</p>
            <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>Explora espacios y realiza tu primera reserva</p>
            <Link href="/buscar" className="btn-brand text-sm font-semibold px-5 py-2.5 rounded-xl">
              Explorar espacios
            </Link>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
            {stats.recent.map((bk: any) => {
              const st = statusConfig[bk.status]
              const space = bk.spaces as any
              return (
                <Link key={bk.id} href="/dashboard/reservas"
                  className="flex items-start gap-3 px-4 md:px-6 py-3.5 md:py-4 transition-colors hover:bg-[var(--bg-elevated)] block">
                  <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl flex items-center justify-center font-bold text-white shrink-0 text-sm"
                    style={{ background: 'linear-gradient(135deg, var(--brand), var(--brand-dark))' }}>
                    {space?.name?.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-semibold text-sm truncate" style={{ color: 'var(--text-primary)' }}>
                        {space?.name}
                      </div>
                      <span className="font-bold text-sm shrink-0" style={{ color: 'var(--text-primary)' }}>
                        {formatCurrency(Number(bk.total_amount))}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <div className="text-xs flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
                        <CalendarDays size={10} /> {formatDate(bk.event_date)}
                        <span style={{ color: 'var(--border-medium)' }}>·</span>
                        {bk.event_type}
                      </div>
                      <span className="flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-full shrink-0"
                        style={{ background: st.bg, color: st.color }}>
                        {st.label}
                      </span>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>

      {/* Quick links — 1 col en móvil, 3 en desktop */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
        {[
          { href: '/buscar',             label: 'Explorar espacios', sub: 'Descubre nuevos lugares',  icon: MapPin,   color: 'var(--brand)' },
          { href: '/dashboard/favoritos',label: 'Mis favoritos',     sub: 'Espacios que guardaste',   icon: Heart,    color: '#EF4444' },
          { href: '/dashboard/pagos',    label: 'Historial de pagos',sub: 'Revisa tus transacciones', icon: CreditCard, color: '#7C3AED' },
        ].map(({ href, label, sub, icon: Icon, color }) => (
          <Link key={href} href={href}
            className="flex items-center gap-4 p-4 md:p-5 rounded-2xl transition-all card-hover"
            style={{ background: '#fff', border: '1px solid var(--border-subtle)' }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: `${color}15` }}>
              <Icon size={18} style={{ color }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{label}</div>
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{sub}</div>
            </div>
            <ArrowRight size={15} className="shrink-0" style={{ color: 'var(--text-muted)' }} />
          </Link>
        ))}
      </div>
    </div>
  )
}
