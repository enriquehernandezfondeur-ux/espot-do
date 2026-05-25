'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { formatCurrency, formatDate } from '@/lib/utils'
import { getHostBookings, getHostStats } from '@/lib/actions/host'
import { getExternalEvents } from '@/lib/actions/external-events'
import { Loader2, TrendingUp, CreditCard, DollarSign, Download, ArrowUpRight, Clock, Building2, Banknote, Handshake, LayoutGrid, ListFilter, CalendarCheck, CheckCheck } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

// ── Estados de pago unificados ─────────────────────────────
const paymentLabel: Record<string, { label: string; color: string; bg: string }> = {
  unpaid:  { label: 'Sin pago',         color: '#D97706', bg: 'rgba(217,119,6,0.08)' },
  partial: { label: 'Pago parcial',     color: 'var(--brand)', bg: 'var(--bg-elevated)' },
  advance: { label: 'Anticipo recibido',color: '#D97706', bg: 'rgba(217,119,6,0.08)' },
  paid:    { label: 'Pagado completo',  color: 'var(--brand)', bg: 'var(--bg-elevated)' },
}

// ── Estado de payout por reserva (simplificado) ───────────
function getPayoutStatus(booking: any): { label: string; color: string; bg: string } {
  if (booking.status === 'completed' && booking.payment_status === 'paid')
    return { label: 'Pago recibido',    color: 'var(--brand)', bg: 'var(--bg-elevated)' }
  if (booking.status === 'confirmed')
    return { label: 'Cuotas activas',   color: '#D97706', bg: 'rgba(217,119,6,0.08)' }
  if (['cancelled_guest', 'cancelled_host', 'rejected'].includes(booking.status))
    return { label: 'Cancelada',        color: '#DC2626', bg: 'rgba(220,38,38,0.08)' }
  return { label: 'En proceso',         color: '#6B7280', bg: 'rgba(107,114,128,0.08)' }
}

export default function FinanzasPage() {
  const [bookings,        setBookings]       = useState<any[]>([])
  const [directEvents,    setDirectEvents]   = useState<any[]>([])
  const [stats,           setStats]          = useState<any>(null)
  const [loading,         setLoading]        = useState(true)
  const [filter,          setFilter]         = useState<'all' | 'confirmed' | 'completed' | 'pending'>('all')
  const [channel,         setChannel]        = useState<'espot' | 'directo' | 'all'>('all')

  useEffect(() => {
    Promise.all([getHostBookings(), getHostStats(), getExternalEvents()]).then(([b, s, ev]) => {
      setBookings(b); setStats(s)
      setDirectEvents(ev.filter((e: any) => ['confirmado','en_curso','completado'].includes(e.status)))
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  // Espot: solo reservas con pago real
  const paidBookings = bookings.filter(b =>
    ['accepted', 'confirmed', 'completed'].includes(b.status) &&
    ['advance', 'partial', 'paid'].includes(b.payment_status)
  )
  const filteredEspot = bookings.filter(b => {
    if (filter === 'confirmed')  return b.status === 'confirmed'
    if (filter === 'completed')  return b.status === 'completed'
    if (filter === 'pending')    return ['pending', 'accepted'].includes(b.status)
    return !['cancelled_guest', 'cancelled_host', 'rejected'].includes(b.status)
  })

  // Directo: eventos manuales con cobros registrados
  const totalDirecto   = directEvents.reduce((s, e) => s + Number(e.paid_amount ?? 0), 0)
  const totalBruto     = paidBookings.reduce((s, b) => s + Number(b.total_amount), 0)
  const totalComision  = paidBookings.reduce((s, b) => s + Number(b.total_amount) * 0.10, 0)
  const totalNeto      = totalBruto - totalComision
  const totalCombinado = totalNeto + totalDirecto
  const pendingPayout  = paidBookings
    .filter(b => b.status === 'confirmed')
    .reduce((s, b) => s + Number(b.total_amount) * 0.90, 0)
  const thisMonth    = stats?.revenueThisMonth ?? 0
  const prevMonth    = stats?.revenuePrevMonth ?? 0
  const monthChange  = prevMonth > 0 ? Math.round((thisMonth - prevMonth) / prevMonth * 100) : null

  const monthlyChartData = (stats?.monthlyRevenue ?? []).map((m: any, i: number) => {
    const now   = new Date()
    const d     = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1)
    const start = d.toISOString().split('T')[0]
    const end   = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0]
    const directo = directEvents.reduce((s: number, e: any) => {
      const date = e.event_date
      if (date >= start && date <= end) return s + Number(e.paid_amount ?? 0)
      return s
    }, 0)
    return { ...m, directo }
  })

  const espotCounts = {
    all:       bookings.filter(b => !['cancelled_guest','cancelled_host','rejected'].includes(b.status)).length,
    confirmed: bookings.filter(b => b.status === 'confirmed').length,
    completed: bookings.filter(b => b.status === 'completed').length,
    pending:   bookings.filter(b => ['pending','accepted'].includes(b.status)).length,
  }

  function exportCSV() {
    const espotRows = filteredEspot.map(b => [
      formatDate(b.event_date),
      (b.profiles as any)?.full_name ?? 'Cliente',
      b.event_type ?? '',
      Number(b.total_amount).toFixed(2),
      (Number(b.total_amount) * 0.10).toFixed(2),
      (Number(b.total_amount) * 0.90).toFixed(2),
      b.status,
      'Espot',
    ])
    const directRows = directEvents.map(e => [
      formatDate(e.event_date),
      (e.client as any)?.full_name || e.client_name || 'Cliente',
      e.event_type ?? e.title ?? '',
      Number(e.total_amount ?? 0).toFixed(2),
      '0.00',
      Number(e.paid_amount ?? 0).toFixed(2),
      e.status,
      'Directo',
    ])
    const rows = [
      ['Fecha', 'Cliente', 'Evento', 'Total', 'Comisión (10%)', 'Cobrado', 'Estado', 'Canal'],
      ...espotRows,
      ...directRows,
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
    <div className="flex items-center justify-center h-dvh" style={{ background: 'var(--bg-base)' }}>
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
            Ingresos Espot + Directos · Comisiones y liquidaciones
          </p>
        </div>
        <button onClick={exportCSV}
          className="flex items-center gap-1.5 text-xs md:text-sm font-semibold px-3 md:px-4 py-2 md:py-2.5 rounded-xl shrink-0 transition-all"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
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
            <p className="text-xs font-semibold uppercase tracking-wide"
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
                Espot te transfiere el neto después de cada evento completado
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
          { label: 'Total combinado',   value: formatCurrency(totalCombinado), icon: TrendingUp,   sub: 'Espot neto + Directo cobrado' },
          { label: 'Espot (neto)',       value: formatCurrency(totalNeto),      icon: Building2,    sub: `Bruto ${formatCurrency(totalBruto)} − 10%` },
          { label: 'Directo cobrado',   value: formatCurrency(totalDirecto),   icon: Handshake,    sub: `${directEvents.length} eventos directos` },
          { label: 'Este mes',          value: formatCurrency(thisMonth),      icon: ArrowUpRight, sub: 'ingresos Espot del mes' },
        ].map(({ label, value, icon: Icon, sub }) => (
          <div key={label} className="rounded-2xl p-5"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>{label}</span>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--bg-elevated)' }}>
                <Icon size={14} style={{ color: 'var(--text-secondary)' }} />
              </div>
            </div>
            <div className="font-bold text-lg" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>{value}</div>
            <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{sub}</div>
          </div>
        ))}
      </div>

      {/* ── Gráfica de ingresos mensuales ── */}
      <div className="rounded-2xl p-5 md:p-6 mb-6"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-5">
          <div>
            <h2 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>Ingresos por mes</h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Últimos 6 meses · Espot + Directo</p>
          </div>
          <div className="flex items-end gap-3">
            <div className="text-right">
              <div className="font-bold text-xl sm:text-2xl" style={{ color: 'var(--brand)', letterSpacing: '-0.02em', whiteSpace: 'nowrap' }}>
                {formatCurrency(thisMonth)}
              </div>
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>este mes</div>
            </div>
            {monthChange !== null && (
              <span className="text-xs font-bold px-2 py-1 rounded-lg mb-0.5 shrink-0"
                style={{
                  background: monthChange >= 0 ? 'rgba(53,196,147,0.1)' : 'rgba(220,38,38,0.08)',
                  color: monthChange >= 0 ? '#0A7A50' : '#DC2626',
                }}>
                {monthChange >= 0 ? '+' : ''}{monthChange}%
              </span>
            )}
          </div>
        </div>

        {/* Leyenda */}
        <div className="flex items-center gap-4 mb-4">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-2 rounded-full" style={{ background: '#35C493' }} />
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Espot</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-2 rounded-full" style={{ background: '#D97706' }} />
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Directo</span>
          </div>
        </div>

        {monthlyChartData.some((m: any) => m.ingresos > 0 || m.directo > 0) ? (
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={monthlyChartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="gradEspot" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#35C493" stopOpacity={0.18} />
                  <stop offset="95%" stopColor="#35C493" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradDirecto" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#D97706" stopOpacity={0.14} />
                  <stop offset="95%" stopColor="#D97706" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="var(--border-subtle)" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="mes"
                tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
                axisLine={false} tickLine={false} width={52}
                tickFormatter={(v: number) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : `${v}`} />
              <Tooltip
                contentStyle={{
                  background: 'var(--bg-card)', border: '1px solid var(--border-subtle)',
                  borderRadius: 12, color: 'var(--text-primary)', fontSize: 12,
                  boxShadow: '0 4px 16px rgba(0,0,0,0.1)', padding: '10px 14px',
                }}
                formatter={(v: any, name: any) => [
                  formatCurrency(Number(v)),
                  name === 'ingresos' ? 'Espot' : 'Directo',
                ]}
                labelStyle={{ fontWeight: 600, marginBottom: 4, color: 'var(--text-primary)' }}
              />
              <Area type="monotone" dataKey="ingresos"
                stroke="#35C493" strokeWidth={2.5}
                fill="url(#gradEspot)" dot={false} activeDot={{ r: 4, fill: '#35C493' }} />
              <Area type="monotone" dataKey="directo"
                stroke="#D97706" strokeWidth={2}
                fill="url(#gradDirecto)" dot={false} activeDot={{ r: 4, fill: '#D97706' }} />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-44 rounded-2xl text-sm"
            style={{ background: 'var(--bg-elevated)', border: '1px dashed var(--border-subtle)', color: 'var(--text-muted)' }}>
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
            Los pagos de eventos directos los gestionas tú y se registran en la sección Reservas.
          </p>
        </div>
      </div>

      {/* Filtros de canal + estado */}
      <div className="flex flex-col gap-2 mb-5">
        {/* Canal */}
        <div className="flex gap-1 p-1 rounded-2xl"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
          {([
            { key: 'all',     label: 'Todos los canales', Icon: LayoutGrid },
            { key: 'espot',   label: 'Espot',             Icon: Building2  },
            { key: 'directo', label: 'Directo',           Icon: Handshake  },
          ] as const).map(({ key, label, Icon }) => (
            <button key={key} onClick={() => setChannel(key)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-semibold transition-all whitespace-nowrap min-h-[40px]"
              style={channel === key
                ? { background: 'var(--text-primary)', color: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.12)' }
                : { color: 'var(--text-muted)' }}>
              <Icon size={12} />
              {label}
            </button>
          ))}
        </div>

        {/* Estado — solo Espot o Todos */}
        {channel !== 'directo' && (
          <div className="flex gap-1 p-1 rounded-2xl"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
            {([
              { key: 'all',       label: 'Todas',       Icon: ListFilter,   count: espotCounts.all       },
              { key: 'confirmed', label: 'Confirmadas', Icon: CalendarCheck, count: espotCounts.confirmed },
              { key: 'completed', label: 'Completadas', Icon: CheckCheck,   count: espotCounts.completed },
              { key: 'pending',   label: 'Pendientes',  Icon: Clock,        count: espotCounts.pending   },
            ] as const).map(({ key, label, Icon, count }) => (
              <button key={key} onClick={() => setFilter(key)}
                className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2 px-1 rounded-xl text-xs font-semibold transition-all whitespace-nowrap min-h-[44px]"
                style={filter === key
                  ? { background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border-medium)' }
                  : { color: 'var(--text-muted)' }}>
                <div className="flex items-center gap-1">
                  <Icon size={11} />
                  <span>{label}</span>
                </div>
                {count > 0 && (
                  <span className="text-[10px] font-bold tabular-nums"
                    style={{ color: filter === key ? 'var(--brand)' : 'var(--text-muted)', opacity: filter === key ? 1 : 0.7 }}>
                    {count}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Tabla — Espot */}
      {channel !== 'directo' && (
      <div className="rounded-2xl overflow-hidden mb-4"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <div className="overflow-x-auto">
        <div style={{ minWidth: 580 }}>
        <div className="grid gap-4 px-5 py-3 text-xs font-semibold uppercase tracking-wide"
          style={{ gridTemplateColumns: '1fr auto auto auto auto', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)', background: 'var(--bg-elevated)' }}>
          <span>Reserva Espot</span>
          <span>Fecha</span>
          <span className="text-right">Total</span>
          <span className="text-right">Neto (90%)</span>
          <span>Payout</span>
        </div>
        {filteredEspot.length === 0 ? (
          <div className="flex items-center justify-center py-12 gap-2">
            <DollarSign size={18} style={{ color: 'var(--text-muted)' }} />
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Sin transacciones Espot</p>
          </div>
        ) : (
          <>
            <div className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
              {filteredEspot.map(b => {
                const guest  = (b as any).profiles as any
                const neto   = Number(b.total_amount) * 0.90
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
                    <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>{formatDate(b.event_date)}</div>
                    <div className="font-semibold text-sm text-right" style={{ color: 'var(--text-primary)' }}>{formatCurrency(Number(b.total_amount))}</div>
                    <div className="font-bold text-sm text-right" style={{ color: 'var(--brand)' }}>{formatCurrency(neto)}</div>
                    <div>
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
                        style={{ background: payout.bg, color: payout.color }}>{payout.label}</span>
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="grid gap-4 items-center px-5 py-4 font-bold"
              style={{ gridTemplateColumns: '1fr auto auto auto auto', borderTop: '2px solid var(--border-medium)', background: 'var(--bg-elevated)' }}>
              <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Total ({filteredEspot.length} reservas)</span>
              <span></span>
              <span className="text-sm text-right" style={{ color: 'var(--text-primary)' }}>{formatCurrency(filteredEspot.reduce((s, b) => s + Number(b.total_amount), 0))}</span>
              <span className="text-sm text-right" style={{ color: 'var(--brand)' }}>{formatCurrency(filteredEspot.reduce((s, b) => s + Number(b.total_amount) * 0.90, 0))}</span>
              <span></span>
            </div>
          </>
        )}
        </div></div>
      </div>
      )}

      {/* Tabla — Directo */}
      {channel !== 'espot' && (
      <div className="rounded-2xl overflow-hidden mb-4"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <div className="overflow-x-auto">
        <div style={{ minWidth: 520 }}>
        <div className="grid gap-4 px-5 py-3 text-xs font-semibold uppercase tracking-wide"
          style={{ gridTemplateColumns: '1fr auto auto auto', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)', background: 'var(--bg-elevated)' }}>
          <span>Evento Directo</span>
          <span>Fecha</span>
          <span className="text-right">Valor total</span>
          <span className="text-right">Cobrado</span>
        </div>
        {directEvents.length === 0 ? (
          <div className="flex items-center justify-center py-12 gap-2">
            <Handshake size={18} style={{ color: 'var(--text-muted)' }} />
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Sin eventos directos registrados</p>
          </div>
        ) : (
          <>
            <div className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
              {directEvents.map(e => {
                const clientName = (e.client as any)?.full_name || e.client_name || 'Cliente'
                const cobrado    = Number(e.paid_amount ?? 0)
                const pending    = Math.max(0, Number(e.total_amount ?? 0) - cobrado)
                return (
                  <div key={e.id} className="grid gap-4 items-center px-5 py-4"
                    style={{ gridTemplateColumns: '1fr auto auto auto' }}>
                    <div>
                      <div className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{clientName}</div>
                      <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{e.event_type ?? e.title}</div>
                    </div>
                    <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>{formatDate(e.event_date)}</div>
                    <div className="font-semibold text-sm text-right" style={{ color: 'var(--text-primary)' }}>
                      {e.total_amount ? formatCurrency(Number(e.total_amount)) : '—'}
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-sm" style={{ color: cobrado > 0 ? 'var(--brand)' : 'var(--text-muted)' }}>
                        {formatCurrency(cobrado)}
                      </div>
                      {pending > 0 && (
                        <div className="text-xs" style={{ color: '#D97706' }}>Pendiente: {formatCurrency(pending)}</div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="grid gap-4 items-center px-5 py-4 font-bold"
              style={{ gridTemplateColumns: '1fr auto auto auto', borderTop: '2px solid var(--border-medium)', background: 'var(--bg-elevated)' }}>
              <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Total ({directEvents.length} eventos)</span>
              <span></span>
              <span className="text-sm text-right" style={{ color: 'var(--text-primary)' }}>{formatCurrency(directEvents.reduce((s, e) => s + Number(e.total_amount ?? 0), 0))}</span>
              <span className="text-sm text-right" style={{ color: 'var(--brand)' }}>{formatCurrency(totalDirecto)}</span>
            </div>
          </>
        )}
        </div></div>
      </div>
      )}

      {/* Nota de cuenta bancaria */}
      <div className="mt-6 rounded-2xl p-5 flex items-center justify-between gap-4"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
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
        <Link href="/dashboard/host/pagos"
          className="text-sm font-semibold px-4 py-2 rounded-xl shrink-0 transition-all"
          style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)', textDecoration: 'none' }}>
          Configurar cuenta
        </Link>
      </div>
    </div>
  )
}
