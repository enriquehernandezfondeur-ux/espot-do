'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { CalendarDays, Clock, CheckCircle, ArrowRight, MapPin, Users, CreditCard, Heart, Loader2, MessageCircle, AlertTriangle, Bell, Sparkles } from 'lucide-react'
import { formatCurrency, formatDate, formatTime } from '@/lib/utils'
import { getClientStats } from '@/lib/actions/client'

const statusConfig: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  pending:         { label: 'Pendiente',    color: '#D97706', bg: 'rgba(217,119,6,0.08)',    dot: 'bg-amber-400' },
  accepted:        { label: 'Por pagar',    color: '#2563EB', bg: 'rgba(37,99,235,0.08)',    dot: 'bg-blue-400' },
  confirmed:       { label: 'Confirmada',   color: '#16A34A', bg: 'rgba(22,163,74,0.08)',    dot: 'bg-green-500' },
  completed:       { label: 'Completada',   color: '#35C493', bg: 'rgba(53,196,147,0.08)',   dot: 'bg-emerald-400' },
  quote_requested: { label: 'Cotización',   color: '#7C3AED', bg: 'rgba(124,58,237,0.08)',   dot: 'bg-purple-400' },
  rejected:        { label: 'Rechazada',    color: '#DC2626', bg: 'rgba(220,38,38,0.08)',    dot: 'bg-red-500' },
  cancelled_guest: { label: 'Cancelada',    color: '#6B7280', bg: 'rgba(107,114,128,0.08)', dot: 'bg-gray-400' },
  cancelled_host:  { label: 'Cancelada',    color: '#6B7280', bg: 'rgba(107,114,128,0.08)', dot: 'bg-gray-400' },
}

export default function ClientDashboard() {
  const [stats, setStats] = useState<Awaited<ReturnType<typeof getClientStats>>>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getClientStats().then(s => { setStats(s); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center h-dvh">
      <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--brand)' }} />
    </div>
  )

  const next        = stats?.nextBooking as any
  const today       = new Date()
  const daysUntilNext = next ? Math.ceil((new Date(next.event_date).getTime() - today.getTime()) / (1000*60*60*24)) : null
  const hasBookings = (stats?.total ?? 0) > 0

  // ── Empty state: usuario sin reservas ─────────────────
  if (!loading && !hasBookings) return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      {/* Bienvenida */}
      <div className="text-center py-10 md:py-14">
        <div className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-5"
          style={{ background: 'linear-gradient(135deg, rgba(53,196,147,0.15), rgba(53,196,147,0.05))', border: '1.5px solid var(--brand-border)' }}>
          <Sparkles size={32} style={{ color: 'var(--brand)' }} />
        </div>
        <h1 className="text-2xl md:text-3xl font-bold mb-2" style={{ color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>
          {stats?.userName ? `¡Hola, ${stats.userName}!` : '¡Bienvenido a EspotHub!'}
        </h1>
        <p className="text-base mb-8 max-w-md mx-auto" style={{ color: 'var(--text-secondary)' }}>
          Reserva salones, rooftops, restaurantes y más para tu próximo evento en República Dominicana.
        </p>
        <Link href="/buscar"
          className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl text-base font-bold"
          style={{ background: 'var(--brand)', color: '#fff', boxShadow: '0 4px 24px rgba(53,196,147,0.35)' }}>
          <MapPin size={18} /> Explorar espacios
        </Link>
      </div>

      {/* Cómo funciona */}
      <div className="rounded-3xl overflow-hidden mb-6"
        style={{ background: '#fff', border: '1px solid var(--border-subtle)' }}>
        <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <h2 className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>¿Cómo funciona?</h2>
        </div>
        <div className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
          {[
            { num: '1', title: 'Elige tu espacio', desc: 'Busca por sector, tipo de evento o capacidad. Todos los espacios son verificados.', color: 'var(--brand)' },
            { num: '2', title: 'Selecciona fecha y horario', desc: 'Elige el día y las horas que necesitas. El propietario confirma disponibilidad.', color: '#2563EB' },
            { num: '3', title: 'Paga en cuotas', desc: 'Solo pagas al confirmar. El resto según el plan de cuotas según cuánto falta para tu evento.', color: '#7C3AED' },
          ].map(step => (
            <div key={step.num} className="flex items-start gap-4 px-5 py-4">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold text-white shrink-0"
                style={{ background: step.color }}>
                {step.num}
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{step.title}</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { href: '/buscar', label: 'Buscar espacios', sub: 'Explora ahora', icon: MapPin, color: 'var(--brand)' },
          { href: '/para-clientes', label: 'Cómo reservar', sub: 'Aprende más', icon: CalendarDays, color: '#2563EB' },
        ].map(({ href, label, sub, icon: Icon, color }) => (
          <Link key={href} href={href}
            className="flex items-center gap-3 p-4 rounded-2xl transition-all card-hover"
            style={{ background: '#fff', border: '1px solid var(--border-subtle)' }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: `${color}15` }}>
              <Icon size={16} style={{ color }} />
            </div>
            <div className="min-w-0">
              <div className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{label}</div>
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{sub}</div>
            </div>
            <ArrowRight size={14} className="shrink-0 ml-auto" style={{ color: 'var(--text-muted)' }} />
          </Link>
        ))}
      </div>
    </div>
  )

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">

      {/* Header */}
      <div className="mb-5 md:mb-7">
        <h1 className="text-xl md:text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
          {stats?.userName ? `Hola, ${stats.userName}` : 'Mi panel'}
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          Aquí tienes el resumen de tus reservas y actividad
        </p>
      </div>

      {/* ── Alertas críticas ── */}
      {(stats?.overdueInstallments?.length ?? 0) > 0 && (
        <div className="mb-4 rounded-2xl px-4 py-4 flex items-start gap-3"
          style={{ background: 'rgba(220,38,38,0.06)', border: '1.5px solid rgba(220,38,38,0.25)' }}>
          <AlertTriangle size={18} style={{ color: '#DC2626', flexShrink: 0, marginTop: 1 }} />
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-sm" style={{ color: '#DC2626' }}>
              {stats!.overdueInstallments!.length === 1
                ? 'Tienes una cuota vencida'
                : `Tienes ${stats!.overdueInstallments!.length} cuotas vencidas`}
            </div>
            <div className="text-xs mt-0.5" style={{ color: '#B91C1C' }}>
              Revisa tu plan de pagos para evitar la cancelación de tu reserva.
            </div>
          </div>
          <Link href="/dashboard/reservas"
            className="text-xs font-bold px-3 py-2 rounded-xl shrink-0"
            style={{ background: '#DC2626', color: '#fff' }}>
            Ver ahora
          </Link>
        </div>
      )}

      {(stats?.pendingPayment ?? 0) > 0 && (stats?.overdueInstallments?.length ?? 0) === 0 && (
        <div className="mb-4 rounded-2xl overflow-hidden"
          style={{ border: '1.5px solid rgba(37,99,235,0.2)' }}>
          <div className="px-4 py-3 flex items-center gap-2.5"
            style={{ background: 'rgba(37,99,235,0.06)', borderBottom: '1px solid rgba(37,99,235,0.12)' }}>
            <Bell size={15} style={{ color: '#2563EB', flexShrink: 0 }} />
            <span className="text-sm font-semibold flex-1" style={{ color: '#1D4ED8' }}>
              {stats!.pendingPayment === 1
                ? 'Reserva aceptada — pendiente de pago'
                : `${stats!.pendingPayment} reservas pendientes de pago`}
            </span>
          </div>
          {(stats!.pendingPaymentBookings ?? []).map((bk: any) => {
            const sp = (bk.spaces as any)
            const cover = sp?.space_images?.find((i: any) => i.is_cover)?.url ?? sp?.space_images?.[0]?.url
            return (
            <div key={bk.id} className="flex items-center gap-3 justify-between px-4 py-3"
              style={{ borderBottom: '1px solid rgba(37,99,235,0.08)', background: '#fff' }}>
              <Link href={`/dashboard/reservas/${bk.id}`} className="min-w-0 flex-1 flex items-center gap-3">
                {cover
                  ? <img src={cover} alt={sp?.name} className="w-10 h-10 rounded-xl object-cover shrink-0" />
                  : <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shrink-0 text-sm"
                      style={{ background: 'linear-gradient(135deg, #2563EB, #1D4ED8)' }}>
                      {sp?.name?.charAt(0)}
                    </div>
                }
                <div className="min-w-0">
                <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                  {sp?.name}
                </p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {formatDate(bk.event_date)} · {formatCurrency(Number(bk.total_amount))}
                </p>
                </div>
              </Link>
              <Link href={`/pago/${bk.id}`}
                className="text-xs font-bold px-3 py-2 rounded-xl shrink-0"
                style={{ background: '#2563EB', color: '#fff', whiteSpace: 'nowrap' }}>
                Pagar →
              </Link>
            </div>
          )})}

        </div>
      )}

      {/* ── Recién confirmadas — aparecen 48h después de pagar ── */}
      {(stats?.recentlyConfirmed?.length ?? 0) > 0 && (
        <div className="mb-4 rounded-2xl overflow-hidden"
          style={{ border: '1.5px solid rgba(22,163,74,0.25)', background: 'rgba(22,163,74,0.04)' }}>
          <div className="flex items-center gap-2.5 px-4 py-3"
            style={{ borderBottom: '1px solid rgba(22,163,74,0.15)' }}>
            <CheckCircle size={14} style={{ color: '#16A34A' }} />
            <span className="text-sm font-semibold" style={{ color: '#16A34A' }}>
              {stats!.recentlyConfirmed!.length === 1 ? 'Reserva confirmada' : `${stats!.recentlyConfirmed!.length} reservas confirmadas`} recientemente
            </span>
          </div>
          {stats!.recentlyConfirmed!.map((bk: any) => {
            const sp    = (bk.spaces as any)
            const cover = sp?.space_images?.find((i: any) => i.is_cover)?.url ?? sp?.space_images?.[0]?.url
            return (
              <Link key={bk.id} href={`/dashboard/reservas/${bk.id}`}
                className="flex items-center justify-between px-4 py-3 transition-colors hover:bg-[rgba(22,163,74,0.06)]"
                style={{ borderBottom: '1px solid rgba(22,163,74,0.08)' }}>
                <div className="flex items-center gap-3 min-w-0">
                  {cover
                    ? <img src={cover} alt={sp?.name} className="w-9 h-9 rounded-xl object-cover shrink-0" />
                    : <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold text-white shrink-0"
                        style={{ background: 'linear-gradient(135deg, #35C493, #16A34A)' }}>
                        {sp?.name?.charAt(0)}
                      </div>
                  }
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                      {sp?.name}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {formatDate(bk.event_date)} · {bk.event_type}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                    {formatCurrency(Number(bk.total_amount))}
                  </span>
                  <ArrowRight size={14} style={{ color: 'var(--text-muted)' }} />
                </div>
              </Link>
            )
          })}
        </div>
      )}

      {stats?.nextInstallment && (stats?.overdueInstallments?.length ?? 0) === 0 && (stats?.pendingPayment ?? 0) === 0 && (() => {
        const inst = stats.nextInstallment!
        const daysLeft = Math.ceil((new Date(inst.due_date + 'T12:00').getTime() - new Date().setHours(0,0,0,0)) / 86400000)
        const isUrgent = daysLeft <= 7
        const color = isUrgent ? '#D97706' : '#2563EB'
        const bg    = isUrgent ? 'rgba(217,119,6,0.06)' : 'rgba(37,99,235,0.05)'
        const bdr   = isUrgent ? 'rgba(217,119,6,0.2)'  : 'rgba(37,99,235,0.2)'
        return (
          <div className="mb-4 rounded-2xl px-4 py-3.5 flex items-center gap-3"
            style={{ background: bg, border: `1.5px solid ${bdr}` }}>
            <CreditCard size={16} style={{ color, flexShrink: 0 }} />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold" style={{ color }}>
                {formatCurrency(Number(inst.amount))}
                <span className="font-normal ml-1.5 text-xs" style={{ color: isUrgent ? '#92400E' : '#1D4ED8' }}>
                  · {daysLeft === 0 ? 'vence hoy' : daysLeft === 1 ? 'vence mañana' : `vence en ${daysLeft} días`}
                </span>
              </div>
              <div className="text-xs mt-0.5" style={{ color: isUrgent ? '#B45309' : '#3B82F6' }}>
                Próxima cuota · {formatDate(inst.due_date)}
              </div>
            </div>
            <Link href="/dashboard/reservas"
              className="text-xs font-semibold px-3 py-2 rounded-xl shrink-0"
              style={{ background: color, color: '#fff' }}>
              Ver plan
            </Link>
          </div>
        )
      })()}

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
              <Link href={`/dashboard/reservas/${next.id}`}
                className="inline-flex items-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-xl shrink-0"
                style={{ background: 'rgba(53,196,147,0.2)', color: '#6EE7C7', border: '1px solid rgba(53,196,147,0.3)' }}>
                Ver detalle <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Stats — 2 cols en móvil, 4 en desktop */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8">
        {[
          { label: 'Total reservas', value: stats?.total ?? 0,            icon: CalendarDays, color: 'var(--brand)' },
          { label: 'Por pagar',      value: stats?.pendingPayment ?? 0,   icon: Clock,        color: '#2563EB',
            urgent: (stats?.pendingPayment ?? 0) > 0 },
          { label: 'Confirmadas',    value: stats?.confirmed ?? 0,        icon: CheckCircle,  color: '#16A34A' },
          { label: 'Total gastado',  value: formatCurrency(stats?.totalSpent ?? 0), icon: CreditCard, color: '#7C3AED' },
        ].map(({ label, value, icon: Icon, color, urgent }) => (
          <div key={label} className="rounded-2xl p-4 md:p-5"
            style={{
              background: urgent ? 'rgba(37,99,235,0.04)' : '#fff',
              border: urgent ? '1.5px solid rgba(37,99,235,0.25)' : '1px solid var(--border-subtle)',
              boxShadow: '0 1px 4px rgba(0,0,0,0.04)'
            }}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs md:text-sm" style={{ color: 'var(--text-secondary)' }}>{label}</span>
              <div className="w-7 h-7 md:w-8 md:h-8 rounded-lg flex items-center justify-center"
                style={{ background: `${color}18` }}>
                <Icon size={14} style={{ color }} />
              </div>
            </div>
            <div className="text-xl md:text-2xl font-bold" style={{ color: urgent ? color : 'var(--text-primary)' }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Reservas recientes */}
      <div className="rounded-2xl md:rounded-3xl overflow-hidden mb-6 md:mb-8"
        style={{ background: '#fff', border: '1px solid var(--border-subtle)', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
        <div className="flex items-center justify-between px-4 md:px-6 py-4 md:py-5"
          style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <h2 className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>Actividad reciente</h2>
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
              const st = statusConfig[bk.status] ?? statusConfig.pending
              const space = bk.spaces as any
              return (
                <Link key={bk.id} href={`/dashboard/reservas/${bk.id}`}
                  className="flex items-start gap-3 px-4 md:px-6 py-3.5 md:py-4 transition-colors hover:bg-[var(--bg-elevated)] block">
                  {/* Foto del espacio */}
                  {(() => {
                    const cover = space?.space_images?.find((i: any) => i.is_cover)?.url ?? space?.space_images?.[0]?.url
                    return cover
                      ? <img src={cover} alt={space?.name} className="w-10 h-10 rounded-xl object-cover shrink-0" />
                      : <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shrink-0 text-sm"
                          style={{ background: 'linear-gradient(135deg, var(--brand), var(--brand-dark))' }}>
                          {space?.name?.charAt(0)}
                        </div>
                  })()}
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

      {/* Quick links — 2 cols en móvil, 4 en desktop */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {[
          { href: '/buscar',              label: 'Explorar',     sub: 'Buscar espacios',        icon: MapPin,         color: 'var(--brand)' },
          { href: '/dashboard/mensajes',  label: 'Mensajes',     sub: 'Hablar con el host',     icon: MessageCircle,  color: '#0891B2' },
          { href: '/dashboard/favoritos', label: 'Favoritos',    sub: 'Espacios guardados',     icon: Heart,          color: '#EF4444' },
          { href: '/dashboard/pagos',     label: 'Mis pagos',    sub: 'Historial y cuotas',     icon: CreditCard,     color: '#7C3AED' },
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
