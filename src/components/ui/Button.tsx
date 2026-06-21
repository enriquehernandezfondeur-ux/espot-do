import { cn } from '@/lib/utils'

type Variant = 'primary' | 'outline' | 'danger' | 'pro'
type Size = 'sm' | 'md'

const VARIANTS: Record<Variant, React.CSSProperties> = {
  primary: { background: 'var(--brand)', color: '#fff' },
  outline: { background: 'var(--bg-card)', color: 'var(--text-secondary)', border: '1.5px solid var(--border-medium)' },
  danger:  { background: '#fff', color: 'var(--danger)', border: '1px solid #FCA5A5' },
  pro:     { background: 'var(--pro)', color: '#fff' },
}
const SIZES: Record<Size, string> = {
  sm: 'text-xs px-3 py-2 rounded-xl',
  md: 'text-sm px-4 py-2.5 rounded-xl',
}

/**
 * Botón estándar con variantes de marca. Sustituye los `<button>` crudos que
 * repiten color + padding + radius inline.
 */
export function Button({
  variant = 'primary',
  size = 'md',
  className,
  style,
  children,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  return (
    <button
      className={cn('font-semibold inline-flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed', SIZES[size], className)}
      style={{ ...VARIANTS[variant], ...style }}
      {...rest}
    >
      {children}
    </button>
  )
}
