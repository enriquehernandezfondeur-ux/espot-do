'use client'

import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { formatCurrency } from '@/lib/utils'
import { getHostAnalytics, type HostAnalytics } from '@/lib/actions/host-analytics'
import {
  Loader2, TrendingUp, TrendingDown, Eye, Target, CheckCircle2, Star,
  CalendarDays, Clock, Building2, Filter,
} from 'lucide-react'

const PIE_COLORS = ['#35C493', '#3B82F6', '#F59E0B', '#EC4899', '#8B5CF6', '#EF4444']
const CARD: React.CSSProperties = { background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }

export default function AnalyticsPage() {
  const [a, setA] = useState<HostAnalytics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getHostAnalytics().then(d => { setA(d); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center h-dvh" style={{ background: 'var(--bg-base)' }}>
      <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--brand)' }} />
    </div>
  )

  const d = a ?? {
    views: { total: 0, prevTotal: 0, weekly: [] }, funnel: { views: 0, requests: 0, confirmed: 0 },
    conversionRate: null, acceptanceRate: null, avgTicket: 0, rating: { average: 0, count: 0 },
    totals: { events: 0, espotNet: 0, directo: 0, combined: 0 },
    monthly: [], byDay: [], byHour: [], topSpaces: [], eventTypes: [],
  } as HostAnalytics

  const viewsChange = d.views.prevTotal > 0
    ? Math.round((d.views.total - d.views.prevTotal) / d.views.prevTotal * 100) : null
  const maxDay  = Math.max(...d.byDay.map(x => x.eventos), 1)
  const maxHour = Math.max(...d.byHour.map(x => x.eventos), 1)
  const maxView = Math.max(...d.views.weekly.map(w => w.views), 1)
  const monthlyHasData = d.monthly.some(m => m.ingresos > 0)
  const maxTopNet = Math.max(...d.topSpaces.map(s => s.net), 1)

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      <div className="mb-5 md:mb-7">
        <h1 className="text-xl md:text-2xl font-bold" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Analytics</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Demanda, conversión y rendimiento de tus espacios</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-5 md:mb-6">
        <Kpi icon={Eye} color="#3B82F6" label="Vistas (28 días)" value={String(d.views.total)}
          foot={viewsChange === null
            ? <span style={{ color: 'var(--text-muted)' }}>—</span>
            : <span className="inline-flex items-center gap-1 font-semibold" style={{ color: viewsChange >= 0 ? '#0A7A50' : '#DC2626' }}>
                {viewsChange >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}{viewsChange >= 0 ? '+' : ''}{viewsChange}%
              </span>} />
        <Kpi icon={Target} color="#35C493" label="Conversión" value={d.conversionRate === null ? '—' : `${d.conversionRate}%`}
          foot={<span style={{ color: 'var(--text-muted)' }}>vistas → reservas</span>} />
        <Kpi icon={CheckCircle2} color="#8B5CF6" label="Aceptación" value={d.acceptanceRate === null ? '—' : `${d.acceptanceRate}%`}
          foot={<span style={{ color: 'var(--text-muted)' }}>solicitudes aceptadas</span>} />
        <Kpi icon={Star} color="#F59E0B" label="Rating" value={d.rating.count ? `${d.rating.average} ★` : '—'}
          foot={<span style={{ color: 'var(--text-muted)' }}>{d.rating.count} reseña{d.rating.count !== 1 ? 's' : ''}</span>} />
      </div>

      {/* Embudo de conversión */}
      <div className="rounded-2xl p-5 md:p-6 mb-5 md:mb-6" style={CARD}>
        <div className="flex items-center gap-2 mb-5">
          <Filter size={16} style={{ color: 'var(--brand)' }} />
          <h2 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>Embudo de conversión</h2>
        </div>
        {d.funnel.views === 0 && d.funnel.requests === 0 ? (
          <Empty text="Aún no hay vistas ni solicitudes" />
        ) : (
          <div className="space-y-3">
            {[
              { label: 'Vistas', value: d.funnel.views, color: '#3B82F6' },
              { label: 'Solicitudes', value: d.funnel.requests, color: '#8B5CF6' },
              { label: 'Confirmadas', value: d.funnel.confirmed, color: '#35C493' },
            ].map((step, i, arr) => {
              const top = Math.max(arr[0].value, 1)
              const pct = Math.round((step.value / top) * 100)
              const prev = i > 0 ? arr[i - 1].value : null
              const stepPct = prev && prev > 0 ? Math.round((step.value / prev) * 100) : null
              return (
                <div key={step.label}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>{step.label}</span>
                    <span className="text-sm font-bold tabular-nums" style={{ color: 'var(--text-primary)' }}>
                      {step.value}
                      {stepPct !== null && <span className="text-xs font-semibold ml-2" style={{ color: 'var(--text-muted)' }}>{stepPct}%</span>}
                    </span>
                  </div>
                  <div className="h-3 rounded-full overflow-hidden" style={{ background: 'var(--bg-elevated)' }}>
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.max(pct, step.value > 0 ? 4 : 0)}%`, background: step.color }} />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Tendencia mensual + Tipos de evento */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5 mb-5 md:mb-6">
        <div className="rounded-2xl p-5 md:p-6" style={CARD}>
          <h2 className="font-bold text-sm mb-1" style={{ color: 'var(--text-primary)' }}>Ingresos netos por mes</h2>
          <p className="text-xs mb-5" style={{ color: 'var(--text-muted)' }}>Últimos 6 meses · {d.totals.events} eventos en total</p>
          {monthlyHasData ? (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={d.monthly}>
                <XAxis dataKey="mes" tick={{ fill: 'var(--text-muted)', fontSize: 12 }} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={8} />
                <YAxis hide />
                <Tooltip cursor={{ fill: 'var(--bg-elevated)' }}
                  contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 12, color: 'var(--text-primary)', fontSize: 12 }}
                  formatter={(v: any, _n: any, p: any) => [`${formatCurrency(Number(v))} · ${p?.payload?.eventos ?? 0} ev.`, 'Neto']} />
                <Bar dataKey="ingresos" fill="#35C493" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <Empty text="Sin reservas confirmadas aún" h={44} />}
        </div>

        <div className="rounded-2xl p-5 md:p-6" style={CARD}>
          <h2 className="font-bold text-sm mb-5" style={{ color: 'var(--text-primary)' }}>Tipos de evento</h2>
          {d.eventTypes.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={d.eventTypes} cx="50%" cy="50%" innerRadius={50} outerRadius={72} dataKey="value" paddingAngle={3}>
                    {d.eventTypes.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 10, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 mt-3">
                {d.eventTypes.map((e, i) => (
                  <div key={e.name} className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                    <span className="text-xs capitalize" style={{ color: 'var(--text-secondary)' }}>{e.name}</span>
                  </div>
                ))}
              </div>
            </>
          ) : <Empty text="Sin datos de tipos de evento" h={44} />}
        </div>
      </div>

      {/* Demanda: días + horas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5 mb-5 md:mb-6">
        <div className="rounded-2xl p-5 md:p-6" style={CARD}>
          <div className="flex items-center gap-2 mb-5">
            <CalendarDays size={16} style={{ color: 'var(--brand)' }} />
            <h2 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>Días más solicitados</h2>
          </div>
          <div className="flex items-end gap-2 h-32">
            {d.byDay.map(x => (
              <div key={x.day} className="flex-1 flex flex-col items-center gap-2">
                <span className="text-xs font-bold tabular-nums" style={{ color: 'var(--text-secondary)' }}>{x.eventos > 0 ? x.eventos : ''}</span>
                <div className="w-full rounded-t-lg transition-all" style={{ height: `${Math.max(6, (x.eventos / maxDay) * 92)}px`, background: x.eventos === maxDay && x.eventos > 0 ? 'var(--brand)' : 'var(--bg-elevated)' }} />
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{x.day}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl p-5 md:p-6" style={CARD}>
          <div className="flex items-center gap-2 mb-5">
            <Clock size={16} style={{ color: 'var(--brand)' }} />
            <h2 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>Horas más solicitadas</h2>
          </div>
          {d.byHour.length === 0 ? (
            <Empty text="Sin horarios registrados" h={28} />
          ) : (
            <div className="space-y-2.5">
              {d.byHour.map(x => (
                <div key={x.hour} className="flex items-center gap-3">
                  <span className="text-xs w-12 shrink-0 tabular-nums" style={{ color: 'var(--text-secondary)' }}>{x.hour}</span>
                  <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-elevated)' }}>
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.round((x.eventos / maxHour) * 100)}%`, background: 'var(--brand)' }} />
                  </div>
                  <span className="text-xs font-bold w-6 text-right tabular-nums" style={{ color: 'var(--text-primary)' }}>{x.eventos}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Vistas por semana */}
      <div className="rounded-2xl p-5 md:p-6 mb-5 md:mb-6" style={CARD}>
        <div className="flex items-center gap-2 mb-5">
          <Eye size={16} style={{ color: 'var(--brand)' }} />
          <h2 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>Vistas por semana</h2>
          <span className="text-xs ml-auto" style={{ color: 'var(--text-muted)' }}>Total 28 días: {d.views.total}</span>
        </div>
        {d.views.weekly.length === 0 ? (
          <Empty text="Sin visitas registradas aún" h={20} />
        ) : (
          <div className="space-y-3">
            {d.views.weekly.map(w => (
              <div key={w.week} className="flex items-center gap-3">
                <span className="text-xs w-28 shrink-0" style={{ color: 'var(--text-secondary)' }}>{w.week}</span>
                <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-elevated)' }}>
                  <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.round((w.views / maxView) * 100)}%`, background: 'var(--brand)' }} />
                </div>
                <span className="text-xs font-bold w-8 text-right tabular-nums" style={{ color: 'var(--text-primary)' }}>{w.views}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Top espacios */}
      <div className="rounded-2xl p-5 md:p-6" style={CARD}>
        <div className="flex items-center gap-2 mb-5">
          <Building2 size={16} style={{ color: 'var(--brand)' }} />
          <h2 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>Tus espacios</h2>
        </div>
        {d.topSpaces.length === 0 ? (
          <Empty text="Sin espacios registrados" h={28} />
        ) : (
          <div className="space-y-4">
            {d.topSpaces.map(s => (
              <div key={s.name}>
                <div className="flex items-center justify-between mb-1.5 gap-2">
                  <span className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{s.name}</span>
                  <span className="text-sm font-bold shrink-0" style={{ color: 'var(--brand)' }}>{formatCurrency(s.net)}</span>
                </div>
                <div className="h-2 rounded-full overflow-hidden mb-1.5" style={{ background: 'var(--bg-elevated)' }}>
                  <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.round((s.net / maxTopNet) * 100)}%`, background: 'var(--brand)' }} />
                </div>
                <div className="flex items-center gap-4 text-xs" style={{ color: 'var(--text-muted)' }}>
                  <span>{s.count} reserva{s.count !== 1 ? 's' : ''}</span>
                  <span>{s.views} vistas</span>
                  {s.views > 0 && <span>{Math.round((s.count / s.views) * 1000) / 10}% conversión</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Subcomponentes ──────────────────────────────────────────
function Kpi({ icon: Icon, color, label, value, foot }: { icon: any; color: string; label: string; value: string; foot: React.ReactNode }) {
  return (
    <div className="rounded-2xl p-4 md:p-5" style={CARD}>
      <div className="flex items-center justify-between mb-2.5">
        <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>{label}</span>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${color}15` }}>
          <Icon size={14} style={{ color }} />
        </div>
      </div>
      <div className="text-xl md:text-2xl font-bold" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>{value}</div>
      <div className="text-xs mt-1">{foot}</div>
    </div>
  )
}

function Empty({ text, h = 32 }: { text: string; h?: number }) {
  return (
    <div className="flex items-center justify-center text-sm" style={{ height: h * 4, color: 'var(--text-muted)' }}>{text}</div>
  )
}
