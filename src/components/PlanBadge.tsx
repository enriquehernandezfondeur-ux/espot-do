import { Crown } from 'lucide-react'

/** Badge "Espot Pro". Usa tokens del tema (sin colores hardcodeados). */
export function PlanBadge({ className = '' }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${className}`}
      style={{ color: 'var(--pro-strong)', background: 'var(--pro-dim)', border: '1px solid var(--pro-border)' }}
    >
      <Crown size={11} style={{ color: 'var(--pro)' }} /> Espot Pro
    </span>
  )
}
