import { getAdminStats } from '@/lib/actions/admin'
import { formatCurrency } from '@/lib/utils'
import {
  Building2, CalendarDays, Users, CreditCard,
  TrendingUp, Clock, CheckCircle, AlertCircle,
  ArrowRight, Shield,
} from 'lucide-react'
import Link from 'next/link'

export default async function AdminDashboard() {
  const stats = await getAdminStats()

  const metrics = [
    {
      label: 'Total espacios',
      value: stats?.totalSpaces ?? 0,
      sub: `${stats?.pendingSpaces ?? 0} pendientes de aprobación`,
      icon: Building2,
      color: '#7C3AED',
      alert: (stats?.pendingSpaces ?? 0) > 0,
      href: '/admin/espacios?status=pending',
    },
    {
      label: 'Reservas',
      value: stats?.totalBookings ?? 0,
      sub: `${stats?.pendingBookings ?? 0} pendientes de confirmar`,
      icon: CalendarDays,
      color: '#2563EB',
      alert: (stats?.pendingBookings ?? 0) > 0,
      href: '/admin/reservas?status=pending',
    },
    {
      label: 'Usuarios',
      value: stats?.totalUsers ?? 0,
      sub: `${stats?.totalHosts ?? 0} propietarios registrados`,
      icon: Users,
      color: '#16A34A',
      alert: false,
      href: '/admin/usuarios',
    },
    {
      label: 'Comisión total',
      value: formatCurrency(stats?.totalRevenue ?? 0),
      sub: `${formatCurrency(stats?.monthlyRevenue ?? 0)} este mes`,
      icon: CreditCard,
      color: '#35C493',
      alert: false,
      href: '/admin/pagos',
    },
  ]

  const quickActions = [
    { label: 'Espacios por aprobar',  count: stats?.pendingSpaces ?? 0,   href: '/admin/espacios?status=pending', color: '#7C3AED', urgent: true },
    { label: 'Reservas pendientes',   count: stats?.pendingBookings ?? 0,  href: '/admin/reservas?status=pending', color: '#2563EB', urgent: true },
    { label: 'Propietarios',          count: stats?.totalHosts ?? 0,      href: '/admin/usuarios?role=host',      color: '#16A34A', urgent: false },
  ]

  return (
    <div className="p-8 max-w-6xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Shield size={18} style={{ color: 'var(--brand)' }} />
            <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--brand)' }}>
              Admin Panel
            </span>
          </div>
          <h1 className="text-2xl font-bold" style={{ color: '#0F1623', letterSpacing: '-0.02em' }}>
            Dashboard
          </h1>
          <p className="text-sm mt-0.5 text-slate-500">
            {new Date().toLocaleDateString('es-DO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <Link href="/admin/espacios?status=pending"
          className="flex items-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-xl transition-all"
          style={{ background: 'var(--brand)', color: '#fff', boxShadow: '0 2px 8px rgba(53,196,147,0.3)' }}>
          Ver pendientes <ArrowRight size={15} />
        </Link>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {metrics.map(({ label, value, sub, icon: Icon, color, alert, href }) => (
          <Link key={label} href={href}
            className="group relative rounded-2xl p-5 transition-all hover:-translate-y-0.5"
            style={{ background: '#fff', border: '1px solid #E8ECF0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: `${color}12` }}>
                <Icon size={18} style={{ color }} />
              </div>
              {alert && (
                <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
              )}
            </div>
            <div className="text-2xl font-bold mb-1" style={{ color: '#0F1623', letterSpacing: '-0.02em' }}>
              {value}
            </div>
            <div className="text-xs font-medium text-slate-400 mb-0.5">{label}</div>
            <div className="text-xs text-slate-400">{sub}</div>
          </Link>
        ))}
      </div>

      {/* Two column layout */}
      <div className="grid grid-cols-[1fr_320px] gap-6">

        {/* Acciones rápidas */}
        <div className="rounded-2xl overflow-hidden"
          style={{ background: '#fff', border: '1px solid #E8ECF0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
          <div className="px-6 py-4" style={{ borderBottom: '1px solid #F0F2F5' }}>
            <h2 className="font-bold text-sm" style={{ color: '#0F1623' }}>Requieren atención</h2>
          </div>
          <div className="divide-y divide-[#F0F2F5]">
            {quickActions.map(({ label, count, href, color, urgent }) => (
              <Link key={label} href={href}
                className="flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ background: `${color}12` }}>
                    {urgent && count > 0
                      ? <AlertCircle size={15} style={{ color }} />
                      : <CheckCircle size={15} style={{ color }} />}
                  </div>
                  <span className="text-sm font-medium" style={{ color: '#0F1623' }}>{label}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold px-2.5 py-1 rounded-full"
                    style={{ background: urgent && count > 0 ? `${color}12` : '#F4F6F8', color: urgent && count > 0 ? color : '#6B7280' }}>
                    {count}
                  </span>
                  <ArrowRight size={14} className="text-slate-400" />
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Accesos directos */}
        <div className="space-y-3">
          <div className="rounded-2xl p-5"
            style={{ background: 'linear-gradient(135deg, #0F2A22 0%, #1A4D38 100%)', boxShadow: '0 4px 16px rgba(53,196,147,0.15)' }}>
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp size={16} style={{ color: 'var(--brand)' }} />
              <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.5)' }}>
                Este mes
              </span>
            </div>
            <div className="text-3xl font-bold text-gray-900 mb-1" style={{ letterSpacing: '-0.02em' }}>
              {formatCurrency(stats?.monthlyRevenue ?? 0)}
            </div>
            <div className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>
              Comisión de plataforma
            </div>
          </div>

          {[
            { label: 'Gestionar espacios',  href: '/admin/espacios',      icon: Building2  },
            { label: 'Ver reservas',         href: '/admin/reservas',      icon: CalendarDays },
            { label: 'Usuarios',             href: '/admin/usuarios',      icon: Users },
            { label: 'Reportes',             href: '/admin/reportes',      icon: TrendingUp },
            { label: 'Configuración',        href: '/admin/configuracion', icon: Clock },
          ].map(({ label, href, icon: Icon }) => (
            <Link key={href} href={href}
              className="flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all hover:bg-white group"
              style={{ background: '#fff', border: '1px solid #E8ECF0' }}>
              <Icon size={15} style={{ color: 'var(--brand)' }} />
              <span className="text-sm font-medium flex-1" style={{ color: '#374151' }}>{label}</span>
              <ArrowRight size={13} className="text-slate-300 group-hover:text-slate-500 transition-colors" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
