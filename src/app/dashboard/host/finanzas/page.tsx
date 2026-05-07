'use client'

import { useEffect, useState } from 'react'
import { formatCurrency, formatDate } from '@/lib/utils'
import { getHostBookings, getHostStats } from '@/lib/actions/host'
import { Loader2, TrendingUp, CreditCard, DollarSign, Download, ArrowUpRight, Clock, CheckCircle, Building2, Banknote } from 'lucide-react'
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from 'recharts'

// ── Estados de pago unificados ─────────────────────────────
const paymentLabel: Record<string, { label: string; color: string; bg: string }> = {
  unpaid:  { label: 'Sin pago',         color: '#D97706', bg: 'rgba(217,119,6,0.08)' },
  partial: { label: 'Pago parcial',     color: '#2563EB', bg: 'rgba(37,99,235,0.08)' },
  advance: { label: 'Anticipo recibido',color: '#7C3AED', bg: 'rgba(124,58,237,0.08)' },
  paid:    { label: 'Pagado completo',  color: '#16A34A', bg: 'rgba(22,163,74,0.08)' },
}

// ── Estado de payout por reserva (simplificado) ───────────
function getPayoutStatus(booking: any): { label: string; color: string; bg: string } {
  if (booking.status === 'completed' && booking.payment_status === 'paid')
    return { label: 'Payout enviado',   color: '#16A34A', bg: 'rgba(22,163,74,0.08)' }
  if (booking.status === 'confirmed')
    return { label: 'Payout pendiente', color: '#D97706', bg: 'rgba(217,119,6,0.08)' }
  if (['cancelled_guest', 'cancelled_host', 'rejected'].includes(booking.status))
    return { label: 'Cancelada',        color: '#DC2626', bg: 'rgba(220,38,38,0.08)' }
  return { label: 'En proceso',         color: '#6B7280', bg: 'rgba(107,114,128,0.08)' }
}

export default function FinanzasPage() {
  const [bookings, setBookings] = useState<any[]>([])
  const [stats,    setStats]    = useState<any>(null)
  const [loading,  setLoading]  = useState(true)
  const [filter,   setFilter]   = useState<'all' | 'confirmed' | 'completed' | 'pending'>('all')

  useEffect(() => {
    Promise.all([getHostBookings(), getHostStats()]).then(([b, s]) => {
      setBookings(b); setStats(s); setLoading(false)
    })
  }, [])

  const active = bookings.filter(b =>
    !['cancelled_guest', 'cancelled_host', 'rejected'].includes(b.status)
  )
  const filtered = bookings.filter(b => {
    if (filter === 'confirmed')  return b.status === 'confirmed'
    if (filter === 'completed')  return b.status === 'completed'
    if (filter === 'pending')    return ['pending', 'accepted'].includes(b.status)
    return !['cancelled_guest', 'cancelled_host', 'rejected'].includes(b.status)
  })

  const totalBruto     = active.reduce((s, b) => s + Number(b.total_amount), 0)
  const totalComision  = active.reduce((s, b) => s + Number(b.platform_fee), 0)
  const totalNeto      = totalBruto - totalComision
  const pendingPayout  = active
    .filter(b => b.status === 'confirmed')
    .reduce((s, b) => s + (Number(b.total_amount) - Number(b.platform_fee)), 0)
  const thisMonth = stats?.revenueThisMonth ?? 0

  function exportCSV() {
    const rows = [
      ['Fecha', 'Cliente', 'Evento', 'Total', 'Comisión Espot (10%)', 'Neto', 'Estado'],
      ...filtered.map(b => [
        formatDate(b.event_date),
        (b.profiles as any)?.full_name ?? 'Cliente',
        b.event_type ?? '',
        Number(b.total_amount).toFixed(2),
        Number(b.platform_fee).toFixed(2),
        (Number(b.total_amount) - Number(b.platform_fee)).toFixed(2),
        b.status,
      ])
    ]
    const csv  = rows.map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url
    a.download = `espot-finanzas-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) return (
    <div className="flex items-center justify-center h-screen" style={{ background: 'var(--bg-base)' }}>
      <Loader2 size={28} className="animate-spin" style={{ color: 'var(--brand)' }} />
    </div>
  )

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-5 md:mb-8">
        <div>
          <h1 className="text-xl md:text-2xl font-bold" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            Finanzas
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Espot gestiona todos los pagos y te transfiere el neto luego de cada evento.
          </p>
        </div>
        <button onClick={exportCSV}
          className="flex items-center gap-1.5 text-xs md:text-sm font-semibold px-3 md:px-4 py-2 md:py-2.5 rounded-xl shrink-0 transition-all"
          style={{ background: '#fff', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <Download size={13} /> <span className="hidden sm:inline">Exportar</span> CSV
        </button>
      </div>

      {/* Banner de payout pendiente */}
      {pendingPayout > 0 && (
        <div className="rounded-2xl p-5 mb-5 md:mb-6"
          style={{ background: 'linear-gradient(135deg, #03313C 0%, #0A4A3A 100%)', boxShadow: '0 4px 20px rgba(3,49,60,0.15)' }}>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'rgba(53,196,147,0.15)', border: '1px solid rgba(53,196,147,0.25)' }}>
              <Banknote size={18} color="#35C493" />
            </div>
            <p className="text-xs font-semibold uppercase tracking-widest"
              style={{ color: 'rgba(255,255,255,0.5)' }}>
              Payout pendiente
            </p>
          </div>
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-2xl md:text-3xl font-bold" style={{ color: '#fff', letterSpacing: '-0.03em' }}>
                {formatCurrency(pendingPayout)}
              </p>
              <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.5)' }}>
                Se libera automáticamente luego de cada evento confirmado
              </p>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0"
              style={{ background: 'rgba(53,196,147,0.15)', color: '#35C493', border: '1px solid rgba(53,196,147,0.2)' }}>
              <Clock size={11} /> En proceso
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-5 md:mb-8">
        {[
          { label: 'Ingresos brutos',   value: formatCurrency(totalBruto),    icon: TrendingUp,  color: '#35C493', sub: 'cobrado a clientes' },
          { label: 'Comisión Espot',    value: formatCurrency(totalComision),  icon: Building2,   color: '#D97706', sub: '10% por transacción' },
          { label: 'Neto a recibir',    value: formatCurrency(totalNeto),      icon: DollarSign,  color: '#16A34A', sub: 'descontada comisión' },
          { label: 'Este mes',          value: formatCurrency(thisMonth),      icon: ArrowUpRight, color: '#2563EB', sub: 'ingresos del mes' },
        ].map(({ label, value, icon: Icon, color, sub }) => (
          <div key={label} className="rounded-2xl p-5"
            style={{ background: '#fff', border: '1px solid var(--border-subtle)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>{label}</span>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${color}12` }}>
                <Icon size={14} style={{ color }} />
              </div>
            </div>
            <div className="font-bold text-lg" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>{value}</div>
            <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{sub}</div>
          </div>
        ))}
      </div>

      {/* ── Gráfica de ingresos mensuales ── */}
      <div className="rounded-2xl p-6 mb-6"
        style={{ background: '#fff', border: '1px solid #E5E7EB', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="font-bold text-sm" style={{ color: '#03313C' }}>Ingresos por mes</h2>
            <p className="text-xs mt-0.5" style={{ color: '#9CA3AF' }}>Últimos 6 meses · Ingresos brutos confirmados</p>
          </div>
          <div className="text-right">
            <div className="font-bold text-lg" style={{ color: '#35C493', letterSpacing: '-0.02em' }}>
              {formatCurrency(thisMonth)}
            </div>
            <div className="text-xs" style={{ color: '#9CA3AF' }}>este mes</div>
          </div>
        </div>

        {stats?.monthlyRevenue?.some((m: any) => m.ingresos > 0) ? (
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={stats.monthlyRevenue}>
              <defs>
                <linearGradient id="gradFinanzas" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#35C493" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#35C493" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="mes" stroke="#F3F4F6"
                tick={{ fill: '#9CA3AF', fontSize: 11 }}
                axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{
                  background: '#fff', border: '1px solid #E5E7EB',
                  borderRadius: 12, color: '#03313C', fontSize: 12,
                  boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
                }}
                formatter={(v: any) => [formatCurrency(Number(v)), 'Ingresos']}
              />
              <Area type="monotone" dataKey="ingresos"
                stroke="#35C493" strokeWidth={2.5}
                fill="url(#gradFinanzas)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-44 rounded-2xl text-sm"
            style={{ background: '#F9FAFB', border: '1px dashed #E5E7EB', color: '#9CA3AF' }}>
            La gráfica aparece cuando tengas reservas confirmadas
          </div>
        )}
      </div>

      {/* Cómo funciona */}
      <div className="rounded-2xl p-5 mb-6 flex items-start gap-4"
        style={{ background: 'rgba(53,196,147,0.04)', border: '1px solid rgba(53,196,147,0.15)' }}>
        <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: 'rgba(53,196,147,0.1)' }}>
          <CreditCard size={14} color="#35C493" />
        </div>
        <div>
          <p className="text-sm font-semibold mb-1" style={{ color: '#0A7A50' }}>
            Cómo funciona el sistema de pagos
          </p>
          <p className="text-xs leading-relaxed" style={{ color: '#166534' }}>
            El cliente paga por Espot → Espot retiene el dinero → Después del evento, Espot descuenta el 10% de comisión y transfiere el neto a tu cuenta registrada.
            <span className="font-semibold"> El propietario nunca cobra directamente al cliente.</span>
          </p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 mb-4 overflow-x-auto scrollbar-hide">
        {[
          { key: 'all',       label: 'Todas' },
          { key: 'confirmed', label: 'Confirmadas' },
          { key: 'completed', label: 'Completadas' },
          { key: 'pending',   label: 'Pendientes' },
        ].map(f => (
          <button key={f.key} onClick={() => setFilter(f.key as any)}
            className="px-4 py-2.5 rounded-xl text-sm font-medium transition-all shrink-0"
            style={filter === f.key
              ? { background: 'var(--brand)', color: '#fff' }
              : { background: '#fff', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Tabla de reservas */}
      <div className="rounded-2xl overflow-hidden"
        style={{ background: '#fff', border: '1px solid var(--border-subtle)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <div className="overflow-x-auto">
        <div style={{ minWidth: 580 }}>
        {/* Header de tabla */}
        <div className="grid gap-4 px-5 py-3 text-xs font-semibold uppercase tracking-widest"
          style={{
            gridTemplateColumns: '1fr auto auto auto auto',
            borderBottom: '1px solid var(--border-subtle)',
            color: 'var(--text-muted)',
            background: 'var(--bg-elevated)',
          }}>
          <span>Reserva</span>
          <span>Fecha evento</span>
          <span className="text-right">Total cliente</span>
          <span className="text-right">Neto tuyo</span>
          <span>Payout</span>
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
              style={{ background: 'var(--bg-elevated)' }}>
              <DollarSign size={20} style={{ color: 'var(--text-muted)' }} />
            </div>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Sin transacciones registradas</p>
          </div>
        ) : (
          <>
            <div className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
              {filtered.map(b => {
                const guest  = (b as any).profiles as any
                const neto   = Number(b.total_amount) - Number(b.platform_fee)
                const payout = getPayoutStatus(b)
                return (
                  <div key={b.id} className="grid gap-4 items-center px-5 py-4"
                    style={{ gridTemplateColumns: '1fr auto auto auto auto' }}>
                    <div>
                      <div className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                        {guest?.full_name ?? 'Cliente'}
                      </div>
                      <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                        {b.event_type} · {(b as any).spaces?.name}
                      </div>
                    </div>
                    <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                      {formatDate(b.event_date)}
                    </div>
                    <div className="font-semibold text-sm text-right" style={{ color: 'var(--text-primary)' }}>
                      {formatCurrency(Number(b.total_amount))}
                    </div>
                    <div className="font-bold text-sm text-right" style={{ color: '#16A34A' }}>
                      {formatCurrency(neto)}
                    </div>
                    <div>
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
                        style={{ background: payout.bg, color: payout.color }}>
                        {payout.label}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Totales */}
            <div className="grid gap-4 items-center px-5 py-4 font-bold"
              style={{
                gridTemplateColumns: '1fr auto auto auto auto',
                borderTop: '2px solid var(--border-medium)',
                background: 'var(--bg-elevated)',
              }}>
              <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Total ({filtered.length} reservas)
              </span>
              <span></span>
              <span className="text-sm text-right" style={{ color: 'var(--text-primary)' }}>
                {formatCurrency(filtered.reduce((s, b) => s + Number(b.total_amount), 0))}
              </span>
              <span className="text-sm text-right" style={{ color: '#16A34A' }}>
                {formatCurrency(filtered.reduce((s, b) => s + Number(b.total_amount) - Number(b.platform_fee), 0))}
              </span>
              <span></span>
            </div>
          </>
        )}
        </div>{/* minWidth wrapper */}
        </div>{/* overflow-x-auto */}
      </div>

      {/* Nota de cuenta bancaria */}
      <div className="mt-6 rounded-2xl p-5 flex items-center justify-between gap-4"
        style={{ background: '#fff', border: '1px solid var(--border-subtle)' }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'var(--bg-elevated)' }}>
            <Banknote size={18} style={{ color: 'var(--text-muted)' }} />
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              Cuenta para payouts
            </p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Agrega tu cuenta bancaria para recibir los pagos automáticamente
            </p>
          </div>
        </div>
        <button className="text-sm font-semibold px-4 py-2 rounded-xl shrink-0 transition-all"
          style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}>
          Configurar cuenta
        </button>
      </div>
    </div>
  )
}
