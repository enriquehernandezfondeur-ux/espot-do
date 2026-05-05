'use client'

import { useEffect, useState } from 'react'
import { formatCurrency, formatDate } from '@/lib/utils'
import { getHostBookings, getHostStats } from '@/lib/actions/host'
import { Loader2, TrendingUp, CreditCard, DollarSign, Download } from 'lucide-react'

const paymentStatusLabel: Record<string, { label: string; color: string }> = {
  unpaid:  { label: 'Sin pago',    color: '#D97706' },
  partial: { label: '10% pagado',  color: '#3B82F6' },
  advance: { label: 'Anticipo',    color: '#8B5CF6' },
  paid:    { label: 'Pagado',      color: '#16A34A' },
}

export default function FinanzasPage() {
  const [bookings, setBookings] = useState<any[]>([])
  const [stats, setStats]       = useState<any>(null)
  const [loading, setLoading]   = useState(true)
  const [filter, setFilter]     = useState<'all' | 'confirmed' | 'pending'>('all')

  useEffect(() => {
    Promise.all([getHostBookings(), getHostStats()]).then(([b, s]) => {
      setBookings(b)
      setStats(s)
      setLoading(false)
    })
  }, [])

  const filtered = bookings.filter(b => {
    if (filter === 'confirmed') return b.status === 'confirmed' || b.status === 'completed'
    if (filter === 'pending')   return b.status === 'accepted' || b.status === 'pending'
    return !['cancelled_guest', 'cancelled_host', 'rejected'].includes(b.status)
  })

  const totalBruto   = filtered.reduce((s, b) => s + Number(b.total_amount), 0)
  const totalComision = filtered.reduce((s, b) => s + Number(b.platform_fee), 0)
  const totalNeto    = totalBruto - totalComision

  function exportCSV() {
    const rows = [
      ['Fecha', 'Cliente', 'Evento', 'Total', 'Comisión Espot (10%)', 'Neto', 'Estado pago'],
      ...filtered.map(b => [
        formatDate(b.event_date),
        (b.profiles as any)?.full_name ?? 'Cliente',
        b.event_type ?? '',
        Number(b.total_amount).toFixed(2),
        Number(b.platform_fee).toFixed(2),
        (Number(b.total_amount) - Number(b.platform_fee)).toFixed(2),
        b.payment_status,
      ])
    ]
    const csv = rows.map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url
    a.download = `finanzas-espot-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) return (
    <div className="flex items-center justify-center h-screen" style={{ background: 'var(--bg-base)' }}>
      <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--brand)' }} />
    </div>
  )

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Finanzas</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            Historial de ingresos y comisiones
          </p>
        </div>
        <button onClick={exportCSV}
          className="flex items-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-xl transition-all"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}>
          <Download size={15} /> Exportar CSV
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Ingresos brutos',   value: formatCurrency(totalBruto),     icon: TrendingUp,  color: 'var(--brand)' },
          { label: 'Comisión Espot',    value: formatCurrency(totalComision),   icon: CreditCard,  color: '#EF4444' },
          { label: 'Ingresos netos',    value: formatCurrency(totalNeto),       icon: DollarSign,  color: '#16A34A' },
          { label: 'Este mes',          value: formatCurrency(stats?.monthlyRevenue?.slice(-1)[0]?.ingresos ?? 0), icon: TrendingUp, color: '#3B82F6' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="rounded-2xl p-5"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{label}</span>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${color}15` }}>
                <Icon size={15} style={{ color }} />
              </div>
            </div>
            <div className="text-xl font-bold" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex gap-2 mb-5">
        {[
          { key: 'all',       label: 'Todas' },
          { key: 'confirmed', label: 'Confirmadas' },
          { key: 'pending',   label: 'Pendientes' },
        ].map(f => (
          <button key={f.key} onClick={() => setFilter(f.key as any)}
            className="px-4 py-2 rounded-xl text-sm font-medium transition-all"
            style={filter === f.key
              ? { background: 'var(--brand)', color: '#fff' }
              : { background: 'var(--bg-card)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Tabla */}
      <div className="rounded-2xl overflow-hidden"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
        <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 px-5 py-3 text-xs font-semibold uppercase tracking-widest"
          style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)', background: 'var(--bg-elevated)' }}>
          <span>Reserva</span><span>Fecha</span><span>Total bruto</span><span>Comisión</span><span>Estado pago</span>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-16 text-sm" style={{ color: 'var(--text-muted)' }}>
            Sin transacciones registradas
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
            {filtered.map(b => {
              const ps = paymentStatusLabel[b.payment_status] ?? { label: b.payment_status, color: '#6B7280' }
              const guest = (b as any).profiles
              return (
                <div key={b.id} className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 items-center px-5 py-4">
                  <div>
                    <div className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                      {guest?.full_name ?? 'Cliente'} · {b.event_type}
                    </div>
                    <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {(b as any).spaces?.name}
                    </div>
                  </div>
                  <div className="text-sm text-right" style={{ color: 'var(--text-secondary)' }}>
                    {formatDate(b.event_date)}
                  </div>
                  <div className="font-bold text-sm text-right" style={{ color: 'var(--text-primary)' }}>
                    {formatCurrency(Number(b.total_amount))}
                  </div>
                  <div className="text-sm text-right" style={{ color: '#EF4444' }}>
                    − {formatCurrency(Number(b.platform_fee))}
                  </div>
                  <div>
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
                      style={{ background: `${ps.color}12`, color: ps.color }}>
                      {ps.label}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Total de la tabla */}
        {filtered.length > 0 && (
          <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 items-center px-5 py-4 font-bold"
            style={{ borderTop: '2px solid var(--border-medium)', background: 'var(--bg-elevated)' }}>
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Total ({filtered.length} reservas)</span>
            <span></span>
            <span className="text-sm text-right" style={{ color: 'var(--text-primary)' }}>{formatCurrency(totalBruto)}</span>
            <span className="text-sm text-right" style={{ color: '#EF4444' }}>− {formatCurrency(totalComision)}</span>
            <span className="text-sm" style={{ color: '#16A34A' }}>{formatCurrency(totalNeto)} neto</span>
          </div>
        )}
      </div>
    </div>
  )
}
