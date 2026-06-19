// Helpers puros de analítica (testables, sin I/O).

/** Click-through rate: clics ÷ vistas, en %. Null si no hay vistas. */
export function clickThroughRate(views: number, clicks: number): number | null {
  if (views <= 0) return null
  return Math.round((clicks / views) * 1000) / 10
}
