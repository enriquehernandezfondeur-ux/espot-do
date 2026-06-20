import type { LucideIcon } from 'lucide-react'

/**
 * Estado vacío estándar. Sustituye los ~20 bloques "No hay / Aún no" ad-hoc.
 */
export function EmptyState({
  icon: Icon,
  title,
  subtitle,
  action,
}: {
  icon: LucideIcon
  title: string
  subtitle?: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3"
        style={{ background: 'var(--bg-elevated)' }}>
        <Icon size={22} style={{ color: 'var(--text-muted)' }} />
      </div>
      <p className="font-semibold text-sm mb-1" style={{ color: 'var(--text-primary)' }}>{title}</p>
      {subtitle && <p className="text-sm mb-4 max-w-xs" style={{ color: 'var(--text-muted)' }}>{subtitle}</p>}
      {action}
    </div>
  )
}
