'use client'

import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import { formatCurrency } from '@/lib/utils'
import { getHostStats, getHostBookings } from '@/lib/actions/host'
import { Loader2, TrendingUp, CalendarDays, Users, Building2 } from 'lucide-react'

const CATEGORY_LABELS: Record<string, string> = {
  salon: 'Salones', restaurante: 'Restaurantes', rooftop: 'Rooftops',
  bar: 'Bares', terraza: 'Terrazas', estudio: 'Estudios',
  hotel: 'Hoteles', villa: 'Villas', coworking: 'Coworking',
}

const PIE_COLORS = ['#35C493', '#3B82F6', '#F59E0B', '#EC4899', '#8B5CF6', '#EF4444']

export default function AnalyticsPage() {
  const [stats, setStats]       = useState<any>(null)
  const [bookings, setBookings] = useState<any[]>([])
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    Promise.all([getHostStats(), getHostBookings()]).then(([s, b]) => {
      setStats(s)
      setBookings(b)
      setLoading(false)
    })
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center h-screen" style={{ background: 'var(--bg-base)' }}>
      <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--brand)' }} />
    </div>
  )

  // ── Calcular métricas reales ────────────────────────────
  const confirmed = bookings.filter(b => b.status === 'confirmed' || b.status === 'completed')
  const totalRevenue = confirmed.reduce((s, b) => s + Number(b.total_amount), 0)
  const avgTicket = confirmed.length > 0 ? Math.round(totalRevenue / confirmed.length) : 0

  // Tipos de evento
  const eventTypeMap: Record<string, number> = {}
  bookings.forEach(b => {
    if (b.event_type) eventTypeMap[b.event_type] = (eventTypeMap[b.event_type] ?? 0) + 1
  })
  const eventTypeData = Object.entries(eventTypeMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, value]) => ({ name, value }))

  // Días más populares
  const dayMap: Record<number, number> = { 0:0, 1:0, 2:0, 3:0, 4:0, 5:0, 6:0 }
  const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
  bookings.forEach(b => {
    if (b.event_date) {
      const day = new Date(b.event_date + 'T12:00').getDay()
      dayMap[day] = (dayMap[day] ?? 0) + 1
    }
  })
  const popularDays = Object.entries(dayMap).map(([d, count]) => ({
    day: dayNames[parseInt(d)], eventos: count,
  }))
  const maxDay = Math.max(...popularDays.map(d => d.eventos), 1)

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      <div className="mb-5 md:mb-8">
        <h1 className="text-xl md:text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Analytics</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          Rendimiento real de tu espacio
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8">
        {[
          { label: 'Ingresos confirmados',  value: formatCurrency(totalRevenue),       color: 'var(--brand)', icon: TrendingUp },
          { label: 'Total de eventos',       value: confirmed.length,                  color: '#3B82F6',       icon: CalendarDays },
          { label: 'Ticket promedio',        value: formatCurrency(avgTicket),          color: '#F59E0B',       icon: Building2 },
          { label: 'Tasa de confirmación',   value: bookings.length > 0 ? `${Math.round(confirmed.length / bookings.length * 100)}%` : '0%', color: '#8B5CF6', icon: Users },
        ].map(({ label, value, color, icon: Icon }) => (
          <div key={label} className="rounded-2xl p-5"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{label}</span>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: `${color}15` }}>
                <Icon size={15} style={{ color }} />
              </div>
            </div>
            <div className="text-xl md:text-2xl font-bold" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>{value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-5 md:mb-6">
        {/* Ingresos mensuales */}
        <div className="rounded-2xl p-6"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
          <h2 className="font-bold text-sm mb-5" style={{ color: 'var(--text-primary)' }}>Ingresos mensuales</h2>
          {(stats?.monthlyRevenue?.some((m: any) => m.ingresos > 0)) ? (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={stats.monthlyRevenue}>
                <XAxis dataKey="mes" stroke="#475569" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip
                  contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 12, color: 'var(--text-primary)' }}
                  formatter={(v) => [formatCurrency(Number(v)), 'Ingresos']} />
                <Bar dataKey="ingresos" fill="#35C493" radius={[6,6,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-44 text-sm" style={{ color: 'var(--text-muted)' }}>
              Sin reservas confirmadas aún
            </div>
          )}
        </div>

        {/* Tipos de evento */}
        <div className="rounded-2xl p-6"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
          <h2 className="font-bold text-sm mb-5" style={{ color: 'var(--text-primary)' }}>Tipos de evento</h2>
          {eventTypeData.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={eventTypeData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} dataKey="value" paddingAngle={3}>
                  {eventTypeData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 10 }} />
                <Legend formatter={v => <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-44 text-sm" style={{ color: 'var(--text-muted)' }}>
              Sin datos de tipos de evento
            </div>
          )}
        </div>
      </div>

      {/* Días populares */}
      <div className="rounded-2xl p-6"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
        <h2 className="font-bold text-sm mb-5" style={{ color: 'var(--text-primary)' }}>
          Días más populares
        </h2>
        <div className="flex items-end gap-3 h-32">
          {popularDays.map(d => (
            <div key={d.day} className="flex-1 flex flex-col items-center gap-2">
              <span className="text-xs font-bold" style={{ color: 'var(--text-secondary)' }}>
                {d.eventos > 0 ? d.eventos : ''}
              </span>
              <div className="w-full rounded-t-lg transition-all"
                style={{
                  height: `${Math.max(8, (d.eventos / maxDay) * 96)}px`,
                  background: d.eventos === Math.max(...popularDays.map(x => x.eventos))
                    ? 'var(--brand)'
                    : 'var(--bg-elevated)',
                }} />
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{d.day}</span>
            </div>
          ))}
        </div>
        {bookings.length === 0 && (
          <p className="text-center text-sm mt-4" style={{ color: 'var(--text-muted)' }}>
            Sin reservas registradas aún
          </p>
        )}
      </div>
    </div>
  )
}
