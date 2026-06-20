'use client'

import { useState } from 'react'
import { ChevronDown, Check } from 'lucide-react'

export interface FilterOption { value: string; label: string }

/**
 * Dropdown de filtro con el lenguaje visual del CRM (reemplaza los <select>
 * nativos que desentonan). Botón estilizado + menú custom.
 */
export function FilterDropdown({ value, options, onChange, label }: {
  value: string
  options: FilterOption[]
  onChange: (v: string) => void
  /** Texto del botón cuando el valor seleccionado no tiene label propio. */
  label?: string
}) {
  const [open, setOpen] = useState(false)
  const current = options.find(o => o.value === value)
  return (
    <div className="relative shrink-0">
      <button type="button" onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
        {current?.label ?? label}
        <ChevronDown size={13} style={{ opacity: 0.5, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1.5 z-50 rounded-xl overflow-hidden min-w-[190px] max-h-72 overflow-y-auto"
            style={{ background: '#fff', border: '1px solid var(--border-subtle)', boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}>
            {options.map(o => {
              const active = o.value === value
              return (
                <button key={o.value} type="button"
                  onClick={() => { onChange(o.value); setOpen(false) }}
                  className="w-full flex items-center justify-between gap-3 px-3.5 py-2.5 text-sm text-left transition-colors hover:bg-[var(--bg-elevated)]"
                  style={{ color: active ? 'var(--brand)' : 'var(--text-secondary)', fontWeight: active ? 600 : 400 }}>
                  {o.label}
                  {active && <Check size={14} style={{ color: 'var(--brand)', flexShrink: 0 }} />}
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
