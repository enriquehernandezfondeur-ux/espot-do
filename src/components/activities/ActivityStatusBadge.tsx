import type { ActivityStatus } from '@/lib/activities/types'

// Paleta unificada con el resto del dashboard:
//   Verde → publicada/en_curso · Gris → borrador/finalizada · Rojo → cancelada
const ACTIVITY_STATUS: Record<ActivityStatus, { label: string; color: string; bg: string }> = {
  borrador:   { label: 'Borrador',   color: '#6B7280', bg: 'rgba(107,114,128,0.10)' },
  publicada:  { label: 'Publicada',  color: '#16A34A', bg: 'rgba(22,163,74,0.10)' },
  en_curso:   { label: 'En curso',   color: '#0891B2', bg: 'rgba(8,145,178,0.10)' },
  finalizada: { label: 'Finalizada', color: '#6B7280', bg: 'rgba(107,114,128,0.10)' },
  cancelada:  { label: 'Cancelada',  color: 'var(--danger)', bg: 'rgba(220,38,38,0.10)' },
}

export function ActivityStatusBadge({ status }: { status: ActivityStatus }) {
  const s = ACTIVITY_STATUS[status] ?? { label: status, color: '#6B7280', bg: 'rgba(107,114,128,0.10)' }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full"
      style={{ background: s.bg, color: s.color, backdropFilter: 'blur(8px)' }}>
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: s.color }} />
      {s.label}
    </span>
  )
}
