import { cn } from '@/lib/utils'

/**
 * Bloque de carga (shimmer). Sustituye los `animate-pulse` con fondos ad-hoc.
 * Usa el token --bg-elevated para verse bien en cualquier tema.
 */
export function Skeleton({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={cn('animate-pulse rounded-xl', className)}
      style={{ background: 'var(--bg-elevated)', ...style }}
    />
  )
}
