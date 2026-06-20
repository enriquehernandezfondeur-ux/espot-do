import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'

/**
 * Tarjeta de KPI/métrica. Sustituye los grids de "card con icono coloreado +
 * valor + label" reimplementados en admin/page, host/page y cliente/overview.
 */
export function StatCard({
  label,
  value,
  icon: Icon,
  color = 'var(--brand)',
  sub,
  href,
}: {
  label: string
  value: React.ReactNode
  icon: LucideIcon
  color?: string
  sub?: string
  href?: string
}) {
  const inner = (
    <div className="rounded-2xl p-4 h-full"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-card)' }}>
      <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
        style={{ background: `color-mix(in srgb, ${color} 10%, transparent)` }}>
        <Icon size={18} style={{ color }} />
      </div>
      <div className="text-xl font-bold tabular-nums" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>{value}</div>
      <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{label}</div>
      {sub && <div className="text-[11px] mt-1" style={{ color: 'var(--text-muted)' }}>{sub}</div>}
    </div>
  )
  return href ? <Link href={href} className="block transition-transform hover:-translate-y-0.5">{inner}</Link> : inner
}
