import type { ActivityStatus } from './types'

/**
 * Estado mostrado: una actividad publicada cuya fecha ya pasó se ve como
 * 'finalizada' aunque en BD siga 'publicada' (no hay cron que la transicione).
 * 'cancelada' y 'borrador' se respetan tal cual.
 */
export function effectiveStatus(
  a: { status: ActivityStatus; event_date: string | null },
  today: string,
): ActivityStatus {
  if (a.status === 'cancelada' || a.status === 'borrador') return a.status
  if (a.event_date && a.event_date < today) return 'finalizada'
  return a.status
}

export interface Capacity {
  pct: number | null      // null si no hay aforo esperado
  reached: boolean        // true si confirmados >= esperado
  label: string
}

/** Progreso de confirmaciones contra el aforo esperado. */
export function capacity(expected: number | null, confirmedGuests: number): Capacity {
  if (!expected || expected <= 0) {
    return { pct: null, reached: false, label: `${confirmedGuests} confirmado${confirmedGuests === 1 ? '' : 's'}` }
  }
  const pct = Math.min(100, Math.round((confirmedGuests / expected) * 100))
  return { pct, reached: confirmedGuests >= expected, label: `${confirmedGuests} de ${expected}` }
}
