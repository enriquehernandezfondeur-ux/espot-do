import { cn } from '@/lib/utils'

/**
 * Contenedor estándar (tokens del tema). Sustituye los cientos de
 * `rounded-2xl + bg-card + border-subtle + shadow-card` ad-hoc.
 */
export function Card({
  className,
  children,
  padding = true,
  style,
  ...rest
}: React.HTMLAttributes<HTMLDivElement> & { padding?: boolean }) {
  return (
    <div
      className={cn('rounded-2xl', padding && 'p-5', className)}
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-subtle)',
        boxShadow: 'var(--shadow-card)',
        ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  )
}
