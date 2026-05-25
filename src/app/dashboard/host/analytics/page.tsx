'use client'

import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { formatCurrency } from '@/lib/utils'
import { getHostStats, getHostBookings, getHostSpaces, getSpaceViews } from '@/lib/actions/host'
import { getExternalEvents } from '@/lib/actions/external-events'
import { Loader2, TrendingUp, CalendarDays, Users, Building2, Eye, Handshake } from 'lucide-react'

const CATEGORY_LABELS: Record<string, string> = {
  salon: 'Salones', restaurante: 'Restaurantes', rooftop: 'Rooftops',
  bar: 'Bares', terraza: 'Terrazas', estudio: 'Estudios',
  hotel: 'Hoteles', villa: 'Villas', coworking: 'Coworking',
}

const PIE_COLORS = ['#35C493', '#3B82F6', '#F59E0B', '#EC4899', '#8B5CF6', '#EF4444']

export default function AnalyticsPage() {
  const [stats, setStats]               = useState<any>(null)
  const [bookings, setBookings]         = useState<any[]>([])
  const [directEvents, setDirectEvents] = useState<any[]>([])
  const [loading, setLoading]           = useState(true)
  const [spaceViews, setSpaceViews]         = useState<{ week: string; views: number }[]>([])
  const [viewsLoading, setViewsLoading]     = useState(true)
  const [spaces, setSpaces]                 = useState<any[]>([])
  const [selectedSpaceId, setSelectedSpaceId] = useState<string>('')

  useEffect(() => {
    Promise.all([getHostStats(), getHostBookings(), getExternalEvents()]).then(([s, b, ev]) => {
      setStats(s)
      setBookings(b)
      setDirectEvents(ev.filter((e: any) => ['confirmado','en_curso','completado'].includes(e.status)))
      setLoading(false)
    }).catch(() => setLoading(false))

    getHostSpaces().then(async sp => {
      if (!sp.length) { setViewsLoading(false); return }
      setSpaces(sp)
      const firstId = sp[0].id
      setSelectedSpaceId(firstId)
      const views = await getSpaceViews(firstId)
      setSpaceViews(views)
      setViewsLoading(false)
    }).catch(() => setViewsLoading(false))
  }, [])

  async function handleSpaceChange(spaceId: string) {
    setSelectedSpaceId(spaceId)
    setViewsLoading(true)
    const views = await getSpaceViews(spaceId)
    setSpaceViews(views)
    setViewsLoading(false)
  }

  if (loading) return (
    <div className="flex items-center justify-center h-dvh" style={{ background: 'var(--bg-base)' }}>
      <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--brand)' }} />
    </div>
  )

  // ── Calcular métricas reales ────────────────────────────
  const confirmed      = bookings.filter(b => b.status === 'confirmed' || b.status === 'completed')
  const totalRevenue   = confirmed.reduce((s, b) => s + Number(b.total_amount), 0)
  const totalDirecto   = directEvents.reduce((s, e) => s + Number(e.paid_amount ?? 0), 0)
  const totalEventos   = confirmed.length + directEvents.length
  const totalCombinado = totalRevenue * 0.9 + totalDirecto
  // Ticket promedio: usar paid_amount para directos (lo cobrado, no lo cotizado)
  const avgTicket      = totalEventos > 0 ? Math.round((totalRevenue * 0.9 + totalDirecto) / totalEventos) : 0

  // Tipos de evento — Espot + Directo combinados
  const eventTypeMap: Record<string, number> = {}
  bookings.forEach(b => {
    if (b.event_type) eventTypeMap[b.event_type] = (eventTypeMap[b.event_type] ?? 0) + 1
  })
  directEvents.forEach(e => {
    const t = e.event_type ?? e.title
    if (t) eventTypeMap[t] = (eventTypeMap[t] ?? 0) + 1
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
          { label: 'Ingresos totales',       value: formatCurrency(totalCombinado),     color: 'var(--brand)', icon: TrendingUp },
          { label: 'Eventos totales',        value: totalEventos,                        color: '#3B82F6',      icon: CalendarDays },
          { label: 'Ticket promedio',        value: formatCurrency(avgTicket),           color: '#F59E0B',      icon: Building2 },
          { label: 'Directos / Espot',       value: `${directEvents.length} / ${confirmed.length}`, color: '#8B5CF6', icon: Handshake },
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
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={eventTypeData} cx="50%" cy="50%" innerRadius={50} outerRadius={72} dataKey="value" paddingAngle={3}>
                    {eventTypeData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 10 }} />
                </PieChart>
              </ResponsiveContainer>
              {/* Leyenda HTML — sin colisión con el donut */}
              <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 mt-3">
                {eventTypeData.map((entry, i) => (
                  <div key={entry.name} className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                    <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{entry.name}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-44 text-sm" style={{ color: 'var(--text-muted)' }}>
              Sin datos de tipos de evento
            </div>
          )}
        </div>
      </div>

      {/* Visitas a tu espacio */}
      <div className="rounded-2xl p-6 mb-5 md:mb-6"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
        <div className="flex items-center gap-2 mb-5 flex-wrap">
          <Eye size={16} style={{ color: 'var(--brand)' }} />
          <h2 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
            Visitas a tu espacio
          </h2>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Último mes</span>
          {spaces.length > 1 && (
            <select value={selectedSpaceId} onChange={e => handleSpaceChange(e.target.value)}
              className="ml-auto text-xs px-2.5 py-1.5 rounded-lg focus:outline-none"
              style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)', fontSize: 12 }}>
              {spaces.map((s: any) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          )}
        </div>

        {viewsLoading ? (
          <div className="flex items-center justify-center h-20">
            <Loader2 size={20} className="animate-spin" style={{ color: 'var(--brand)' }} />
          </div>
        ) : spaceViews.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-20 gap-2">
            <Eye size={28} style={{ color: 'var(--text-muted)', opacity: 0.3 }} />
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Sin visitas registradas aún
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {spaceViews.map(item => {
              const maxViews = Math.max(...spaceViews.map(v => v.views), 1)
              const pct      = Math.round((item.views / maxViews) * 100)
              return (
                <div key={item.week} className="flex items-center gap-3">
                  <span className="text-xs w-32 shrink-0" style={{ color: 'var(--text-secondary)' }}>
                    {item.week}
                  </span>
                  <div className="flex-1 h-2 rounded-full overflow-hidden"
                    style={{ background: 'var(--bg-elevated)' }}>
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, background: 'var(--brand)' }}
                    />
                  </div>
                  <span className="text-xs font-bold w-8 text-right tabular-nums"
                    style={{ color: 'var(--text-primary)' }}>
                    {item.views}
                  </span>
                </div>
              )
            })}
            <p className="text-xs mt-3 pt-3" style={{ color: 'var(--text-muted)', borderTop: '1px solid var(--border-subtle)' }}>
              Total últimas 4 semanas: {spaceViews.reduce((s, v) => s + v.views, 0)} visitas
            </p>
          </div>
        )}
      </div>

      {/* Canal breakdown */}
      {totalEventos > 0 && (
      <div className="rounded-2xl p-6 mb-5 md:mb-6"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
        <div className="flex items-center gap-2 mb-5">
          <Handshake size={16} style={{ color: 'var(--brand)' }} />
          <h2 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>Canales de ingreso</h2>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {[
            { label: 'Espot (marketplace)', amount: totalRevenue * 0.9, count: confirmed.length, color: '#35C493', pct: totalCombinado > 0 ? Math.round((totalRevenue * 0.9 / totalCombinado) * 100) : 0 },
            { label: 'Directo',             amount: totalDirecto,        count: directEvents.length, color: '#8B5CF6', pct: totalCombinado > 0 ? Math.round((totalDirecto / totalCombinado) * 100) : 0 },
          ].map(ch => (
            <div key={ch.label} className="rounded-xl p-4"
              style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: ch.color }} />
                <span className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>{ch.label}</span>
              </div>
              <div className="text-xl font-bold mb-1" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                {formatCurrency(ch.amount)}
              </div>
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {ch.count} eventos · {ch.pct}% del total
              </div>
              <div className="mt-3 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border-subtle)' }}>
                <div className="h-full rounded-full" style={{ width: `${ch.pct}%`, background: ch.color }} />
              </div>
            </div>
          ))}
        </div>
      </div>
      )}

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
                  background: d.eventos === maxDay
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
