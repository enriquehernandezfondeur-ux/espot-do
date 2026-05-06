'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { CalendarDays, Clock, CheckCircle, XCircle, ArrowRight, MapPin, Users, CreditCard, Heart, Star, Loader2 } from 'lucide-react'
import { formatCurrency, formatDate, formatTime } from '@/lib/utils'
import { getClientStats } from '@/lib/actions/client'
import { cn } from '@/lib/utils'

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
    <div className="p-8 max-w-5xl mx-auto">

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
          Bienvenido 👋
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          Aquí tienes el resumen de tus reservas y actividad
        </p>
      </div>

      {/* Próxima reserva destacada */}
      {next && (
        <div className="mb-8 rounded-3xl overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #0F2A22 0%, #1A4D38 100%)', boxShadow: '0 8px 32px rgba(53,196,147,0.15)' }}>
          <div className="px-8 py-7 flex items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.6)' }}>
                  {daysUntilNext === 0 ? '¡Hoy!' : daysUntilNext === 1 ? 'Mañana' : `En ${daysUntilNext} días`}
                </span>
              </div>
              <h2 className="text-2xl font-bold mb-1" style={{ color: '#fff' }}>{(next.spaces as any)?.name}</h2>
              <p className="text-sm mb-4" style={{ color: 'rgba(255,255,255,0.65)' }}>{next.event_type}</p>
              <div className="flex items-center gap-5">
                <span className="flex items-center gap-2 text-sm" style={{ color: 'rgba(255,255,255,0.8)' }}>
                  <CalendarDays size={14} /> {formatDate(next.event_date)}
                </span>
                <span className="flex items-center gap-2 text-sm" style={{ color: 'rgba(255,255,255,0.8)' }}>
                  <Clock size={14} /> {formatTime(next.start_time)} – {formatTime(next.end_time)}
                </span>
                <span className="flex items-center gap-2 text-sm" style={{ color: 'rgba(255,255,255,0.8)' }}>
                  <Users size={14} /> {next.guest_count} personas
                </span>
              </div>
            </div>
            <div className="shrink-0 text-right">
              <div className="text-3xl font-bold mb-1" style={{ color: '#fff' }}>{formatCurrency(Number(next.total_amount))}</div>
              <div className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>total del evento</div>
              <Link href={`/dashboard/reservas`}
                className="inline-flex items-center gap-2 mt-4 text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
                style={{ background: 'rgba(53,196,147,0.2)', color: '#6EE7C7', border: '1px solid rgba(53,196,147,0.3)' }}>
                Ver detalle <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total reservas',   value: stats?.total ?? 0,     icon: CalendarDays, color: 'var(--brand)' },
          { label: 'Pendientes',       value: stats?.pending ?? 0,   icon: Clock,        color: '#D97706' },
          { label: 'Confirmadas',      value: stats?.confirmed ?? 0, icon: CheckCircle,  color: '#16A34A' },
          { label: 'Total gastado',    value: formatCurrency(stats?.totalSpent ?? 0), icon: CreditCard, color: '#7C3AED' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="rounded-2xl p-5"
            style={{ background: '#fff', border: '1px solid var(--border-subtle)', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{label}</span>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: `${color}15` }}>
                <Icon size={15} style={{ color }} />
              </div>
            </div>
            <div className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Reservas recientes */}
      <div className="rounded-3xl overflow-hidden mb-8"
        style={{ background: '#fff', border: '1px solid var(--border-subtle)', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
        <div className="flex items-center justify-between px-6 py-5" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <h2 className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>Reservas recientes</h2>
          <Link href="/dashboard/reservas" className="flex items-center gap-1 text-sm font-medium" style={{ color: 'var(--brand)' }}>
            Ver todas <ArrowRight size={14} />
          </Link>
        </div>

        {!stats?.recent?.length ? (
          <div className="flex flex-col items-center justify-center py-14 text-center">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
              style={{ background: 'var(--bg-elevated)' }}>
              <CalendarDays size={24} style={{ color: 'var(--text-muted)' }} />
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
                  className="flex items-center gap-4 px-6 py-4 hover:bg-[var(--bg-elevated)] transition-colors block">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shrink-0"
                    style={{ background: 'linear-gradient(135deg, var(--brand), var(--brand-dark))' }}>
                    {space?.name?.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm truncate" style={{ color: 'var(--text-primary)' }}>
                      {space?.name}
                    </div>
                    <div className="text-xs mt-0.5 flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
                      <CalendarDays size={10} /> {formatDate(bk.event_date)}
                      <span>·</span> {bk.event_type}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full"
                      style={{ background: st.bg, color: st.color }}>
                      <span className={cn('w-1.5 h-1.5 rounded-full', st.dot)} />
                      {st.label}
                    </span>
                    <span className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
                      {formatCurrency(Number(bk.total_amount))}
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { href: '/buscar',             label: 'Explorar espacios', sub: 'Descubre nuevos lugares',    icon: MapPin,   color: 'var(--brand)' },
          { href: '/dashboard/favoritos',label: 'Mis favoritos',     sub: 'Espacios que guardaste',     icon: Heart,    color: '#EF4444' },
          { href: '/dashboard/pagos',    label: 'Historial de pagos',sub: 'Revisa tus transacciones',   icon: CreditCard, color: '#7C3AED' },
        ].map(({ href, label, sub, icon: Icon, color }) => (
          <Link key={href} href={href}
            className="flex items-center gap-4 p-5 rounded-2xl transition-all card-hover"
            style={{ background: '#fff', border: '1px solid var(--border-subtle)' }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: `${color}15` }}>
              <Icon size={18} style={{ color }} />
            </div>
            <div>
              <div className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{label}</div>
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{sub}</div>
            </div>
            <ArrowRight size={15} className="ml-auto shrink-0" style={{ color: 'var(--text-muted)' }} />
          </Link>
        ))}
      </div>
    </div>
  )
}
