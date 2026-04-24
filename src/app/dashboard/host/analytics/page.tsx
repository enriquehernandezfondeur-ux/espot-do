'use client'

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import { formatCurrency } from '@/lib/utils'

const monthlyData = [
  { mes: 'Nov', ingresos: 45000, eventos: 3 },
  { mes: 'Dic', ingresos: 78000, eventos: 5 },
  { mes: 'Ene', ingresos: 52000, eventos: 4 },
  { mes: 'Feb', ingresos: 91000, eventos: 6 },
  { mes: 'Mar', ingresos: 67000, eventos: 5 },
  { mes: 'Abr', ingresos: 112000, eventos: 8 },
]

const eventTypes = [
  { name: 'Cumpleaños', value: 35, color: '#7c3aed' },
  { name: 'Corporativo', value: 25, color: '#2563eb' },
  { name: 'Boda',        value: 20, color: '#db2777' },
  { name: 'Graduación',  value: 12, color: '#d97706' },
  { name: 'Otros',       value: 8,  color: '#475569' },
]

const popularDays = [
  { day: 'Dom', events: 12 }, { day: 'Lun', events: 2 }, { day: 'Mar', events: 3 },
  { day: 'Mié', events: 4 }, { day: 'Jue', events: 5 }, { day: 'Vie', events: 18 }, { day: 'Sáb', events: 22 },
]

export default function AnalyticsPage() {
  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Analytics</h1>
        <p className="text-slate-400 mt-1">Rendimiento de tu espacio en los últimos 6 meses</p>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Ingresos totales', value: formatCurrency(445000), change: '+24%', positive: true },
          { label: 'Total de eventos', value: '31', change: '+8 vs período anterior', positive: true },
          { label: 'Ticket promedio', value: formatCurrency(14355), change: '+12%', positive: true },
          { label: 'Tasa de confirmación', value: '87%', change: '13 canceladas', positive: false },
        ].map(stat => (
          <div key={stat.label} className="bg-white/5 border border-white/10 rounded-xl p-4">
            <div className="text-slate-400 text-xs mb-2">{stat.label}</div>
            <div className="text-white font-bold text-xl">{stat.value}</div>
            <div className={`text-xs mt-1 ${stat.positive ? 'text-green-400' : 'text-red-400'}`}>{stat.change}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6 mb-6">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <h2 className="text-white font-semibold mb-4">Ingresos mensuales</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={monthlyData}>
              <XAxis dataKey="mes" stroke="#475569" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip contentStyle={{ background: '#1e1b4b', border: '1px solid #4c1d95', borderRadius: 12, color: '#fff' }} formatter={(v) => [formatCurrency(Number(v)), 'Ingresos']} />
              <Bar dataKey="ingresos" fill="#7c3aed" radius={[6,6,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <h2 className="text-white font-semibold mb-4">Tipos de evento</h2>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={eventTypes} cx="50%" cy="50%" innerRadius={55} outerRadius={80} dataKey="value" paddingAngle={3}>
                {eventTypes.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 10, color: '#fff' }} formatter={(v) => [`${v}%`, '']} />
              <Legend formatter={(v) => <span style={{color:'#94a3b8',fontSize:12}}>{v}</span>} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
        <h2 className="text-white font-semibold mb-4">Días más populares</h2>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={popularDays}>
            <XAxis dataKey="day" stroke="#475569" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis hide />
            <Tooltip contentStyle={{ background: '#1e1b4b', border: '1px solid #4c1d95', borderRadius: 12, color: '#fff' }} formatter={(v) => [v, 'Eventos']} />
            <Bar dataKey="events" fill="#4c1d95" radius={[6,6,0,0]}>
              {popularDays.map((entry, i) => <Cell key={i} fill={entry.events >= 18 ? '#7c3aed' : '#4c1d95'} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <p className="text-slate-500 text-xs mt-3">Viernes y Sábados concentran el 65% de todos tus eventos.</p>
      </div>
    </div>
  )
}
