import { STATUS_LABELS, STATUS_SHORT, STATUS_COLORS } from '@/lib/bookingConfig'

export function StatusBadge({ status, short = false }: { status: string; short?: boolean }) {
  const sc       = STATUS_COLORS[status as keyof typeof STATUS_COLORS]
  const labelMap = short ? STATUS_SHORT : STATUS_LABELS
  const label    = labelMap[status as keyof typeof labelMap] ?? status
  const color    = sc?.color ?? '#6B7280'
  const bg       = sc?.bg    ?? 'rgba(107,114,128,0.08)'
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full"
      style={{ background: bg, color }}>
      <span data-testid="status-dot" className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: color }} />
      {label}
    </span>
  )
}
