'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'

interface Props {
  page:     number
  total:    number
  pageSize: number
  onChange: (page: number) => void
  className?: string
}

export default function Pagination({ page, total, pageSize, onChange, className = '' }: Props) {
  const totalPages = Math.ceil(total / pageSize)
  if (totalPages <= 1) return null

  const from = (page - 1) * pageSize + 1
  const to   = Math.min(page * pageSize, total)

  function pages(): (number | '…')[] {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1)
    if (page <= 4) return [1, 2, 3, 4, 5, '…', totalPages]
    if (page >= totalPages - 3) return [1, '…', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages]
    return [1, '…', page - 1, page, page + 1, '…', totalPages]
  }

  const btn = (active: boolean): React.CSSProperties => ({
    minWidth: 40, height: 40, borderRadius: 10, fontSize: 13, fontWeight: active ? 700 : 500,
    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
    border: active ? '1.5px solid var(--brand)' : '1px solid var(--border-subtle)',
    background: active ? 'var(--brand)' : 'var(--bg-card)',
    color: active ? '#fff' : 'var(--text-secondary)',
    transition: 'all .15s',
  })

  const arrow = (disabled: boolean): React.CSSProperties => ({
    width: 40, height: 40, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
    border: '1px solid var(--border-subtle)', background: 'var(--bg-card)',
    color: disabled ? 'var(--text-muted)' : 'var(--text-secondary)',
    cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.4 : 1,
  })

  return (
    <div className={`flex items-center justify-between gap-4 pt-4 mt-1 ${className}`}
      style={{ borderTop: '1px solid var(--border-subtle)' }}>
      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
        {from}–{to} de {total}
      </span>
      <div className="flex items-center gap-1">
        <button
          style={arrow(page === 1)}
          onClick={() => page > 1 && onChange(page - 1)}
          disabled={page === 1}>
          <ChevronLeft size={14} />
        </button>

        {pages().map((p, i) =>
          p === '…' ? (
            <span key={`e${i}`} style={{ fontSize: 13, color: 'var(--text-muted)', padding: '0 4px' }}>…</span>
          ) : (
            <button key={p} style={btn(p === page)} onClick={() => onChange(p as number)}>
              {p}
            </button>
          )
        )}

        <button
          style={arrow(page === totalPages)}
          onClick={() => page < totalPages && onChange(page + 1)}
          disabled={page === totalPages}>
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  )
}
