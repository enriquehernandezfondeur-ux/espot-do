import { getAdminStats, getAdminActivity, getAdminPayouts } from '@/lib/actions/admin'
import { formatCurrency, formatDate } from '@/lib/utils'
import {
  Building2, CalendarDays, Users,
  TrendingUp, CheckCircle, AlertTriangle,
  ArrowRight, Shield, Banknote, Activity,
  Star, UserCheck, BarChart3,
} from 'lucide-react'
import Link from 'next/link'
import { STATUS_SHORT, STATUS_COLORS } from '@/lib/bookingConfig'

// Config de estado unificado desde bookingConfig (consistente con reservas/usuarios)
const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; dot: string }> =
  Object.fromEntries(
    (Object.keys(STATUS_COLORS) as (keyof typeof STATUS_COLORS)[])
      .map(k => [k, { label: STATUS_SHORT[k], ...STATUS_COLORS[k], dot: STATUS_COLORS[k].color }]),
  )

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
  const supabase = await (await import('@/lib/supabase/server')).createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = user
    ? await supabase.from('profiles').select('full_name').eq('id', user.id).single()
    : { data: null }
  const adminName = profile?.full_name?.split(' ')[0] ?? 'Admin'

  const [stats, activity, pendingPayouts] = await Promise.all([
    getAdminStats(),
    getAdminActivity(),
    getAdminPayouts('pending'),
  ])

  const pendingPayoutTotal = pendingPayouts.reduce(
    (s, b: any) => s + (Number(b.total_amount) || 0) * 0.90, 0
  )

  const now = new Date()
  const hour = now.getHours()
  const greeting = hour < 12 ? 'Buenos días' : hour < 19 ? 'Buenas tardes' : 'Buenas noches'
  const dateLabel = now.toLocaleDateString('es-DO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  const alerts = [
    stats?.pendingSpaces  && stats.pendingSpaces  > 0 && { label: `${stats.pendingSpaces} espacio${stats.pendingSpaces > 1 ? 's' : ''} por aprobar`,   href: '/admin/espacios?status=pending', color: '#F59E0B', icon: Building2 },
    stats?.pendingBookings && stats.pendingBookings > 0 && { label: `${stats.pendingBookings} reserva${stats.pendingBookings > 1 ? 's' : ''} pendiente${stats.pendingBookings > 1 ? 's' : ''}`, href: '/admin/reservas?status=pending', color: '#3B82F6', icon: CalendarDays },
    pendingPayouts.length  > 0 && { label: `${pendingPayouts.length} pago${pendingPayouts.length > 1 ? 's' : ''} a propietarios pendiente${pendingPayouts.length > 1 ? 's' : ''} — ${formatCurrency(pendingPayoutTotal)}`, href: '/admin/liquidaciones', color: 'var(--brand)', icon: Banknote },
  ].filter(Boolean) as { label: string; href: string; color: string; icon: React.ElementType }[]

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6 md:space-y-8">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <Shield size={14} style={{ color: 'var(--brand)' }} />
            <span className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--brand)' }}>
              Admin Console
            </span>
          </div>
          <h1 className="text-xl md:text-2xl font-bold" style={{ color: '#0F1623', letterSpacing: '-0.02em' }}>
            {greeting}, {adminName}
          </h1>
          <p className="text-sm mt-0.5 capitalize" style={{ color: '#94A3B8' }}>{dateLabel}</p>
        </div>
      </div>

      {/* Alerts banner */}
      {alerts.length === 0 ? (
        <div className="rounded-2xl px-5 py-4 flex items-center gap-3"
          style={{ background: 'rgba(53,196,147,0.06)', border: '1px solid rgba(53,196,147,0.2)' }}>
          <CheckCircle size={16} style={{ color: 'var(--brand)' }} />
          <span className="text-sm font-semibold" style={{ color: '#0F1623' }}>Todo al día — no hay nada pendiente por revisar.</span>
        </div>
      ) : (
        <div className="rounded-2xl overflow-hidden"
          style={{ background: '#fff', border: '1px solid #E8ECF0', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
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
                    style={{ background: `color-mix(in srgb, ${color} 7%, transparent)` }}>
                    <Icon size={13} style={{ color }} />
                  </div>
                  <span className="text-sm font-medium" style={{ color: '#0F1623' }}>{label}</span>
                </div>
                <ArrowRight size={14} className="text-gray-300 group-hover:text-gray-500 transition-colors" />
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Totales (orientación rápida — lo pendiente vive en el banner, la comisión en la card de la derecha) */}
      <div className="grid grid-cols-3 gap-3 md:gap-4">
        {[
          { label: 'Espacios', value: stats?.totalSpaces ?? 0,   icon: Building2,    color: '#7C3AED', href: '/admin/espacios' },
          { label: 'Reservas', value: stats?.totalBookings ?? 0, icon: CalendarDays, color: '#2563EB', href: '/admin/reservas' },
          { label: 'Usuarios', value: stats?.totalUsers ?? 0,    icon: Users,        color: '#16A34A', href: '/admin/usuarios' },
        ].map(({ label, value, icon: Icon, color, href }) => (
          <Link key={label} href={href}
            className="group rounded-2xl p-4 transition-all hover:-translate-y-1"
            style={{ background: '#fff', border: '1px solid #E8ECF0', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-3"
              style={{ background: `color-mix(in srgb, ${color} 8%, transparent)` }}>
              <Icon size={15} style={{ color }} />
            </div>
            <div className="text-xl font-bold mb-0.5" style={{ color: '#0F1623', letterSpacing: '-0.02em' }}>{value}</div>
            <div className="text-xs font-semibold" style={{ color: '#374151' }}>{label}</div>
          </Link>
        ))}
      </div>

      {/* Main content — 1 col mobile, 2 cols xl */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-6">

        {/* Activity feed */}
        <div className="rounded-2xl overflow-hidden"
          style={{ background: '#fff', border: '1px solid #E8ECF0', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <div className="flex items-center justify-between px-6 py-4"
            style={{ borderBottom: '1px solid #F0F2F5' }}>
            <div className="flex items-center gap-2">
              <Activity size={15} style={{ color: 'var(--brand)' }} />
              <h2 className="font-bold text-sm" style={{ color: '#0F1623' }}>Actividad reciente</h2>
            </div>
            <Link href="/admin/reservas"
              className="text-xs font-semibold" style={{ color: 'var(--brand)' }}>
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

          {/* Comisión del mes — compacta, slate sólido (igual al sidebar) */}
          <div className="rounded-2xl p-4"
            style={{ background: '#1E293B', boxShadow: '0 4px 20px rgba(0,0,0,0.12)' }}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.4)' }}>
                Comisión este mes
              </span>
              <TrendingUp size={13} style={{ color: 'var(--brand)' }} />
            </div>
            <div className="text-2xl font-bold mb-1" style={{ color: 'var(--brand)', letterSpacing: '-0.02em' }}>
              {formatCurrency(stats?.monthlyRevenue ?? 0)}
            </div>
            <div className="flex items-center justify-between text-[11px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
              <span>Acumulado: {formatCurrency(stats?.totalRevenue ?? 0)}</span>
              <Link href="/admin/reportes" className="font-semibold" style={{ color: 'var(--brand)' }}>
                Reportes →
              </Link>
            </div>
          </div>

          {/* Quick nav */}
          <div className="rounded-2xl overflow-hidden"
            style={{ background: '#fff', border: '1px solid #E8ECF0', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <div className="px-5 py-3" style={{ borderBottom: '1px solid #F0F2F5' }}>
              <h3 className="text-xs font-bold uppercase tracking-widest" style={{ color: '#94A3B8' }}>
                Acceso rápido
              </h3>
            </div>
            {[
              { label: 'Gestionar espacios',   href: '/admin/espacios',      icon: Building2 },
              { label: 'Ver reservas',          href: '/admin/reservas',      icon: CalendarDays },
              { label: 'Pagos a propietarios',  href: '/admin/liquidaciones', icon: Banknote },
              { label: 'Gestionar usuarios',    href: '/admin/usuarios',      icon: UserCheck },
              { label: 'Reportes y analytics',  href: '/admin/reportes',      icon: BarChart3 },
              { label: 'Configuración',         href: '/admin/configuracion', icon: Star },
            ].map(({ label, href, icon: Icon }) => (
              <Link key={href} href={href}
                className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 transition-colors group"
                style={{ borderBottom: '1px solid #F8FAFC' }}>
                <Icon size={14} style={{ color: 'var(--brand)' }} />
                <span className="text-sm font-medium flex-1" style={{ color: '#374151' }}>{label}</span>
                <ArrowRight size={13} className="text-gray-300 group-hover:text-gray-500 transition-colors" />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
