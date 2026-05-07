import { getAdminReports } from '@/lib/actions/admin'
import { formatCurrency } from '@/lib/utils'
import { BarChart3, TrendingUp, Building2, Tag } from 'lucide-react'

const CATEGORY_LABELS: Record<string, string> = {
  salon: 'Salones', restaurante: 'Restaurantes', rooftop: 'Rooftops',
  bar: 'Bares', terraza: 'Terrazas', estudio: 'Estudios',
  hotel: 'Hoteles', villa: 'Villas', coworking: 'Coworking', otro: 'Otros',
}

export default async function AdminReportesPage() {
  const reports = await getAdminReports()

  const maxMonthly = Math.max(...(reports?.monthly ?? []).map(m => m.ingresos), 1)

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold" style={{ color: '#0F1623', letterSpacing: '-0.02em' }}>Reportes</h1>
        <p className="text-sm text-slate-500 mt-0.5">Métricas de rendimiento del marketplace</p>
      </div>

      <div className="grid grid-cols-2 gap-6 mb-6">
        {/* Ingresos mensuales */}
        <div className="rounded-2xl p-6" style={{ background: '#fff', border: '1px solid #E8ECF0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
          <div className="flex items-center gap-2 mb-5">
            <TrendingUp size={16} style={{ color: 'var(--brand)' }} />
            <h2 className="font-bold text-sm" style={{ color: '#0F1623' }}>Comisión mensual</h2>
          </div>
          <div className="space-y-3">
            {(reports?.monthly ?? []).map(m => (
              <div key={m.mes} className="flex items-center gap-3">
                <div className="w-8 text-xs text-right text-slate-400 shrink-0">{m.mes}</div>
                <div className="flex-1 h-6 rounded-lg overflow-hidden" style={{ background: '#F4F6F8' }}>
                  <div className="h-full rounded-lg transition-all"
                    style={{ width: `${m.ingresos > 0 ? (m.ingresos / maxMonthly * 100) : 0}%`, background: 'var(--brand)' }} />
                </div>
                <div className="w-24 text-xs font-bold text-right shrink-0" style={{ color: '#0F1623' }}>
                  {formatCurrency(m.ingresos)}
                </div>
                <div className="w-8 text-xs text-slate-400 shrink-0">{m.reservas}r</div>
              </div>
            ))}
          </div>
        </div>

        {/* Por categoría */}
        <div className="rounded-2xl p-6" style={{ background: '#fff', border: '1px solid #E8ECF0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
          <div className="flex items-center gap-2 mb-5">
            <Tag size={16} style={{ color: '#7C3AED' }} />
            <h2 className="font-bold text-sm" style={{ color: '#0F1623' }}>Espacios por categoría</h2>
          </div>
          <div className="space-y-3">
            {Object.entries(reports?.byCategory ?? {})
              .sort((a, b) => b[1] - a[1])
              .map(([cat, count]) => {
                const maxCat = Math.max(...Object.values(reports?.byCategory ?? {}), 1)
                return (
                  <div key={cat} className="flex items-center gap-3">
                    <div className="w-24 text-xs text-slate-500 truncate shrink-0">
                      {CATEGORY_LABELS[cat] ?? cat}
                    </div>
                    <div className="flex-1 h-5 rounded-lg overflow-hidden" style={{ background: '#F4F6F8' }}>
                      <div className="h-full rounded-lg"
                        style={{ width: `${(count / maxCat) * 100}%`, background: '#7C3AED' }} />
                    </div>
                    <div className="w-6 text-xs font-bold text-right shrink-0" style={{ color: '#0F1623' }}>{count}</div>
                  </div>
                )
              })}
          </div>
        </div>
      </div>

      {/* Top espacios */}
      <div className="rounded-2xl overflow-hidden" style={{ background: '#fff', border: '1px solid #E8ECF0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
        <div className="px-6 py-4 flex items-center gap-2" style={{ borderBottom: '1px solid #F0F2F5' }}>
          <Building2 size={16} style={{ color: '#2563EB' }} />
          <h2 className="font-bold text-sm" style={{ color: '#0F1623' }}>Espacios más reservados</h2>
        </div>
        <div className="divide-y divide-[#F0F2F5]">
          {reports?.topSpaces?.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-sm">Sin datos aún</div>
          ) : (
            reports?.topSpaces?.map((space, i) => (
              <div key={i} className="flex items-center gap-4 px-6 py-4">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0"
                  style={{ background: i === 0 ? '#F59E0B' : i === 1 ? '#9CA3AF' : i === 2 ? '#CD7C2F' : '#E8ECF0', color: i < 3 ? '#fff' : '#6B7280' }}>
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm truncate" style={{ color: '#0F1623' }}>{space.name}</div>
                  <div className="text-xs text-slate-400 capitalize">{CATEGORY_LABELS[space.category] ?? space.category}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-bold text-sm" style={{ color: '#0F1623' }}>{space.count} reservas</div>
                  <div className="text-xs" style={{ color: 'var(--brand)' }}>{formatCurrency(space.revenue)}</div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
