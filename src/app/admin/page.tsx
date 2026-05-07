import { getAdminStats, getAdminActivity, getAdminPayouts } from '@/lib/actions/admin'
import { formatCurrency, formatDate } from '@/lib/utils'
import {
  Building2, CalendarDays, Users, CreditCard,
  TrendingUp, Clock, CheckCircle, AlertTriangle,
  ArrowRight, Shield, Banknote, Activity,
  Star, UserCheck, BarChart3,
} from 'lucide-react'
import Link from 'next/link'

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  pending:          { label: 'Pendiente',   color: '#D97706', bg: 'rgba(217,119,6,0.1)',    dot: '#D97706' },
  accepted:         { label: 'Aceptada',    color: '#2563EB', bg: 'rgba(37,99,235,0.1)',    dot: '#2563EB' },
  confirmed:        { label: 'Confirmada',  color: '#16A34A', bg: 'rgba(22,163,74,0.1)',    dot: '#16A34A' },
  completed:        { label: 'Completada',  color: '#35C493', bg: 'rgba(53,196,147,0.1)',   dot: '#35C493' },
  rejected:         { label: 'Rechazada',   color: '#DC2626', bg: 'rgba(220,38,38,0.08)',   dot: '#DC2626' },
  cancelled_guest:  { label: 'Cancelada',   color: '#6B7280', bg: 'rgba(107,114,128,0.08)', dot: '#6B7280' },
  cancelled_host:   { label: 'Cancelada',   color: '#6B7280', bg: 'rgba(107,114,128,0.08)', dot: '#6B7280' },
  quote_requested:  { label: 'Cotización',  color: '#7C3AED', bg: 'rgba(124,58,237,0.08)', dot: '#7C3AED' },
}

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime()
  const mins  = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days  = Math.floor(diff / 86400000)
  if (mins < 60)  return `hace ${mins}m`
  if (hours < 24) return `hace ${hours}h`
  return `hace ${days}d`
}

export default async function AdminDashboard() {
  const [stats, activity, pendingPayouts] = await Promise.all([
    getAdminStats(),
    getAdminActivity(),
    getAdminPayouts('pending'),
  ])

  const pendingPayoutTotal = pendingPayouts.reduce(
    (s, b: any) => s + (Number(b.total_amount) - Number(b.platform_fee)), 0
  )

  const now = new Date()
  const hour = now.getHours()
  const greeting = hour < 12 ? 'Buenos días' : hour < 19 ? 'Buenas tardes' : 'Buenas noches'
  const dateLabel = now.toLocaleDateString('es-DO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  const alerts = [
    stats?.pendingSpaces  && stats.pendingSpaces  > 0 && { label: `${stats.pendingSpaces} espacio${stats.pendingSpaces > 1 ? 's' : ''} por aprobar`,   href: '/admin/espacios?status=pending', color: '#F59E0B', icon: Building2 },
    stats?.pendingBookings && stats.pendingBookings > 0 && { label: `${stats.pendingBookings} reserva${stats.pendingBookings > 1 ? 's' : ''} pendiente${stats.pendingBookings > 1 ? 's' : ''}`, href: '/admin/reservas?status=pending', color: '#3B82F6', icon: CalendarDays },
    pendingPayouts.length  > 0 && { label: `${pendingPayouts.length} payout${pendingPayouts.length > 1 ? 's' : ''} pendiente${pendingPayouts.length > 1 ? 's' : ''} — ${formatCurrency(pendingPayoutTotal)}`, href: '/admin/payouts', color: '#35C493', icon: Banknote },
  ].filter(Boolean) as { label: string; href: string; color: string; icon: React.ElementType }[]

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-5 md:space-y-8">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <Shield size={14} style={{ color: '#35C493' }} />
            <span className="text-xs font-bold uppercase tracking-widest" style={{ color: '#35C493' }}>
              Admin Console
            </span>
          </div>
          <h1 className="text-xl md:text-2xl font-bold" style={{ color: '#0F1623', letterSpacing: '-0.02em' }}>
            {greeting}, Enrique 👋
          </h1>
          <p className="text-sm mt-0.5 capitalize" style={{ color: '#94A3B8' }}>{dateLabel}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Link href="/admin/espacios?status=pending"
            className="flex items-center gap-2 text-xs md:text-sm font-semibold px-3 md:px-4 py-2 md:py-2.5 rounded-xl transition-all"
            style={{ background: '#0F1623', color: '#fff' }}>
            <Building2 size={13} /> Aprobar espacios
          </Link>
          <Link href="/admin/payouts"
            className="flex items-center gap-2 text-xs md:text-sm font-semibold px-3 md:px-4 py-2 md:py-2.5 rounded-xl transition-all"
            style={{ background: '#35C493', color: '#0B0F0E' }}>
            <Banknote size={13} /> Payouts
          </Link>
        </div>
      </div>

      {/* Alerts banner */}
      {alerts.length > 0 && (
        <div className="rounded-2xl overflow-hidden"
          style={{ background: '#fff', border: '1px solid #E8ECF0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
          <div className="px-5 py-3 flex items-center gap-2"
            style={{ background: 'rgba(245,158,11,0.04)', borderBottom: '1px solid #FEF3C7' }}>
            <AlertTriangle size={14} style={{ color: '#F59E0B' }} />
            <span className="text-xs font-bold uppercase tracking-widest" style={{ color: '#92400E' }}>
              Requieren atención
            </span>
          </div>
          <div className="divide-y divide-[#F8FAFC]">
            {alerts.map(({ label, href, color, icon: Icon }) => (
              <Link key={href} href={href}
                className="flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 transition-colors group">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: `${color}12` }}>
                    <Icon size={13} style={{ color }} />
                  </div>
                  <span className="text-sm font-medium" style={{ color: '#0F1623' }}>{label}</span>
                </div>
                <ArrowRight size={14} className="text-slate-300 group-hover:text-slate-500 transition-colors" />
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Metric cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
        {[
          { label: 'Espacios',      value: stats?.totalSpaces ?? 0,                  sub: `${stats?.pendingSpaces ?? 0} por aprobar`,      icon: Building2,  color: '#7C3AED', href: '/admin/espacios',      format: 'num' },
          { label: 'Reservas',      value: stats?.totalBookings ?? 0,                sub: `${stats?.pendingBookings ?? 0} pendientes`,      icon: CalendarDays,color: '#2563EB', href: '/admin/reservas',      format: 'num' },
          { label: 'Usuarios',      value: stats?.totalUsers ?? 0,                   sub: `${stats?.totalHosts ?? 0} propietarios`,        icon: Users,      color: '#16A34A', href: '/admin/usuarios',      format: 'num' },
          { label: 'Ingresos mes',  value: stats?.monthlyRevenue ?? 0,               sub: 'comisión este mes',                              icon: TrendingUp, color: '#35C493', href: '/admin/pagos',          format: 'currency' },
          { label: 'Total comisión',value: stats?.totalRevenue ?? 0,                 sub: 'histórico acumulado',                            icon: CreditCard, color: '#0EA5E9', href: '/admin/pagos',          format: 'currency' },
          { label: 'Payouts pend.', value: pendingPayoutTotal,                       sub: `${pendingPayouts.length} propietarios`,          icon: Banknote,   color: '#F59E0B', href: '/admin/payouts',        format: 'currency' },
        ].map(({ label, value, sub, icon: Icon, color, href, format }) => (
          <Link key={label} href={href}
            className="group rounded-2xl p-4 transition-all hover:-translate-y-0.5 hover:shadow-md"
            style={{ background: '#fff', border: '1px solid #E8ECF0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-3"
              style={{ background: `${color}12` }}>
              <Icon size={15} style={{ color }} />
            </div>
            <div className="text-xl font-bold mb-0.5" style={{ color: '#0F1623', letterSpacing: '-0.02em' }}>
              {format === 'currency' ? formatCurrency(value as number) : value}
            </div>
            <div className="text-xs font-semibold mb-0.5" style={{ color: '#374151' }}>{label}</div>
            <div className="text-xs" style={{ color: '#94A3B8' }}>{sub}</div>
          </Link>
        ))}
      </div>

      {/* Main content — 2 columns */}
      <div className="grid grid-cols-[1fr_340px] gap-6">

        {/* Activity feed */}
        <div className="rounded-2xl overflow-hidden"
          style={{ background: '#fff', border: '1px solid #E8ECF0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
          <div className="flex items-center justify-between px-6 py-4"
            style={{ borderBottom: '1px solid #F0F2F5' }}>
            <div className="flex items-center gap-2">
              <Activity size={15} style={{ color: '#35C493' }} />
              <h2 className="font-bold text-sm" style={{ color: '#0F1623' }}>Actividad reciente</h2>
            </div>
            <Link href="/admin/reservas"
              className="text-xs font-semibold" style={{ color: '#35C493' }}>
              Ver todas →
            </Link>
          </div>
          <div className="divide-y divide-[#F8FAFC]">
            {activity.length === 0 ? (
              <div className="px-6 py-10 text-center text-sm" style={{ color: '#94A3B8' }}>
                Sin actividad reciente
              </div>
            ) : activity.map((bk: any) => {
              const sc = STATUS_CONFIG[bk.status] ?? STATUS_CONFIG.pending
              const space   = bk.spaces as any
              const guest   = bk.profiles as any
              const hostAmt = Number(bk.total_amount) - Number(bk.platform_fee)
              return (
                <Link key={bk.id} href={`/admin/reservas`}
                  className="flex items-center gap-4 px-6 py-3.5 hover:bg-slate-50 transition-colors">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ background: sc.dot }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold truncate" style={{ color: '#0F1623' }}>
                        {space?.name ?? '—'}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full shrink-0 font-medium"
                        style={{ background: sc.bg, color: sc.color }}>
                        {sc.label}
                      </span>
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: '#94A3B8' }}>
                      {guest?.full_name ?? 'Cliente'} · {bk.event_type} · {formatDate(bk.event_date)}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-bold" style={{ color: '#0F1623' }}>
                      {formatCurrency(Number(bk.total_amount))}
                    </div>
                    <div className="text-xs" style={{ color: '#94A3B8' }}>
                      {timeAgo(bk.updated_at)}
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-4">

          {/* Revenue card */}
          <div className="rounded-2xl p-5"
            style={{ background: 'linear-gradient(135deg, #0A1019 0%, #0F2A22 100%)', boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}>
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp size={14} style={{ color: '#35C493' }} />
              <span className="text-xs font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.4)' }}>
                Comisión este mes
              </span>
            </div>
            <div className="text-3xl font-bold text-white mb-0.5" style={{ letterSpacing: '-0.03em' }}>
              {formatCurrency(stats?.monthlyRevenue ?? 0)}
            </div>
            <div className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
              Total acumulado: {formatCurrency(stats?.totalRevenue ?? 0)}
            </div>
            <div className="mt-4 pt-4 flex items-center justify-between" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
              <span className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
                {stats?.totalBookings ?? 0} reservas en total
              </span>
              <Link href="/admin/reportes"
                className="text-xs font-semibold" style={{ color: '#35C493' }}>
                Ver reportes →
              </Link>
            </div>
          </div>

          {/* Quick nav */}
          <div className="rounded-2xl overflow-hidden"
            style={{ background: '#fff', border: '1px solid #E8ECF0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            <div className="px-5 py-3" style={{ borderBottom: '1px solid #F0F2F5' }}>
              <h3 className="text-xs font-bold uppercase tracking-widest" style={{ color: '#94A3B8' }}>
                Acceso rápido
              </h3>
            </div>
            {[
              { label: 'Gestionar espacios',  href: '/admin/espacios',      icon: Building2,   badge: stats?.pendingSpaces ?? 0,   badgeColor: '#7C3AED' },
              { label: 'Ver reservas',         href: '/admin/reservas',      icon: CalendarDays, badge: stats?.pendingBookings ?? 0, badgeColor: '#2563EB' },
              { label: 'Payouts pendientes',   href: '/admin/payouts',       icon: Banknote,    badge: pendingPayouts.length,       badgeColor: '#F59E0B' },
              { label: 'Gestionar usuarios',   href: '/admin/usuarios',      icon: UserCheck,   badge: 0, badgeColor: '' },
              { label: 'Reportes y analytics', href: '/admin/reportes',      icon: BarChart3,   badge: 0, badgeColor: '' },
              { label: 'Configuración',        href: '/admin/configuracion', icon: Star,        badge: 0, badgeColor: '' },
            ].map(({ label, href, icon: Icon, badge, badgeColor }) => (
              <Link key={href} href={href}
                className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 transition-colors group"
                style={{ borderBottom: '1px solid #F8FAFC' }}>
                <Icon size={14} style={{ color: '#35C493' }} />
                <span className="text-sm font-medium flex-1" style={{ color: '#374151' }}>{label}</span>
                {badge > 0 ? (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center"
                    style={{ background: badgeColor, color: '#fff' }}>
                    {badge}
                  </span>
                ) : (
                  <ArrowRight size={13} className="text-slate-300 group-hover:text-slate-500 transition-colors" />
                )}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
