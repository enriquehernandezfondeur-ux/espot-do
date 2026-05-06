'use client'

import { useState, useRef, useEffect } from 'react'
import { Clock, ChevronDown, X } from 'lucide-react'

// Slots de media hora, 6am → 3am
const ALL_SLOTS = [
  { value: '06:00', label: '6:00 AM',  group: 'Mañana' },
  { value: '06:30', label: '6:30 AM',  group: 'Mañana' },
  { value: '07:00', label: '7:00 AM',  group: 'Mañana' },
  { value: '07:30', label: '7:30 AM',  group: 'Mañana' },
  { value: '08:00', label: '8:00 AM',  group: 'Mañana' },
  { value: '08:30', label: '8:30 AM',  group: 'Mañana' },
  { value: '09:00', label: '9:00 AM',  group: 'Mañana' },
  { value: '09:30', label: '9:30 AM',  group: 'Mañana' },
  { value: '10:00', label: '10:00 AM', group: 'Mañana' },
  { value: '10:30', label: '10:30 AM', group: 'Mañana' },
  { value: '11:00', label: '11:00 AM', group: 'Mañana' },
  { value: '11:30', label: '11:30 AM', group: 'Mañana' },
  { value: '12:00', label: '12:00 PM', group: 'Tarde' },
  { value: '12:30', label: '12:30 PM', group: 'Tarde' },
  { value: '13:00', label: '1:00 PM',  group: 'Tarde' },
  { value: '13:30', label: '1:30 PM',  group: 'Tarde' },
  { value: '14:00', label: '2:00 PM',  group: 'Tarde' },
  { value: '14:30', label: '2:30 PM',  group: 'Tarde' },
  { value: '15:00', label: '3:00 PM',  group: 'Tarde' },
  { value: '15:30', label: '3:30 PM',  group: 'Tarde' },
  { value: '16:00', label: '4:00 PM',  group: 'Tarde' },
  { value: '16:30', label: '4:30 PM',  group: 'Tarde' },
  { value: '17:00', label: '5:00 PM',  group: 'Tarde' },
  { value: '17:30', label: '5:30 PM',  group: 'Tarde' },
  { value: '18:00', label: '6:00 PM',  group: 'Noche' },
  { value: '18:30', label: '6:30 PM',  group: 'Noche' },
  { value: '19:00', label: '7:00 PM',  group: 'Noche' },
  { value: '19:30', label: '7:30 PM',  group: 'Noche' },
  { value: '20:00', label: '8:00 PM',  group: 'Noche' },
  { value: '20:30', label: '8:30 PM',  group: 'Noche' },
  { value: '21:00', label: '9:00 PM',  group: 'Noche' },
  { value: '21:30', label: '9:30 PM',  group: 'Noche' },
  { value: '22:00', label: '10:00 PM', group: 'Noche' },
  { value: '22:30', label: '10:30 PM', group: 'Noche' },
  { value: '23:00', label: '11:00 PM', group: 'Noche' },
  { value: '23:30', label: '11:30 PM', group: 'Noche' },
  { value: '00:00', label: '12:00 AM', group: 'Madrugada' },
  { value: '00:30', label: '12:30 AM', group: 'Madrugada' },
  { value: '01:00', label: '1:00 AM',  group: 'Madrugada' },
  { value: '01:30', label: '1:30 AM',  group: 'Madrugada' },
  { value: '02:00', label: '2:00 AM',  group: 'Madrugada' },
  { value: '03:00', label: '3:00 AM',  group: 'Madrugada' },
]

const GROUPS = ['Mañana', 'Tarde', 'Noche', 'Madrugada']

interface Props {
  value:            string
  onChange:         (v: string) => void
  placeholder?:     string
  // Filtro por hora anterior (selector "Hasta")
  afterValue?:      string
  minMinutesAfter?: number
  maxMinutesAfter?: number
  // Rango permitido por el propietario (de time_blocks)
  // undefined = sin restricción | null = día sin disponibilidad | {start,end} = rango específico
  allowedRange?: { start: string; end: string } | null
  disabled?:        boolean
}

export function hourToNum(h: string) {
  const n = parseInt(h.split(':')[0])
  return n < 6 ? n + 24 : n
}

function minutesDiff(from: string, to: string): number {
  const f = hourToNum(from) * 60 + parseInt(from.split(':')[1] ?? '0')
  const t = hourToNum(to)   * 60 + parseInt(to.split(':')[1]  ?? '0')
  return t - f
}

export default function TimePicker({
  value, onChange, placeholder = 'Seleccionar hora',
  afterValue, minMinutesAfter, maxMinutesAfter,
  allowedRange, disabled,
}: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  // ── Filtrar slots disponibles ─────────────────────────────
  const available = ALL_SLOTS.filter(s => {
    // Día sin disponibilidad configurada por el propietario
    if (allowedRange === null) return false

    // Rango del propietario (time_blocks)
    if (allowedRange) {
      const slotN  = hourToNum(s.value)
      const startN = hourToNum(allowedRange.start)
      // end_time "00:00" o "24:00" = medianoche = número 24
      const endRaw = allowedRange.end
      const endN   = (endRaw === '00:00' || endRaw === '24:00') ? 24 : hourToNum(endRaw)
      if (slotN < startN || slotN >= endN) return false
    }

    // Filtro por hora anterior (selector "Hasta")
    if (afterValue) {
      const diff = minutesDiff(afterValue, s.value)
      if (diff <= 0) return false
      if (minMinutesAfter && diff < minMinutesAfter) return false
      if (maxMinutesAfter && diff > maxMinutesAfter) return false
    }

    return true
  })

  // Agrupar por momento del día
  const grouped: Record<string, typeof ALL_SLOTS> = {}
  for (const s of available) {
    if (!grouped[s.group]) grouped[s.group] = []
    grouped[s.group].push(s)
  }

  const hasSlots   = available.length > 0
  const displayLabel = ALL_SLOTS.find(s => s.value === value)?.label ?? null

  // Mensaje cuando no hay opciones
  function emptyMessage() {
    if (allowedRange === null)
      return { title: 'Sin horario disponible', sub: 'El propietario no tiene este día habilitado. Selecciona otra fecha.' }
    if (afterValue && minMinutesAfter)
      return { title: 'Sin opciones válidas', sub: `Este espacio requiere mínimo ${Math.round(minMinutesAfter / 60)}h. Elige una hora de inicio más temprana.` }
    return { title: 'Sin opciones', sub: 'Selecciona primero la hora de inicio.' }
  }

  return (
    <div className="relative" ref={ref}>

      {/* ── Trigger ── */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen(o => !o)}
        className="w-full flex items-center gap-2.5 px-4 py-3.5 rounded-2xl text-left transition-all"
        style={{
          background:  disabled ? 'var(--bg-elevated)' : 'var(--bg-surface)',
          border:      `1.5px solid ${open ? 'var(--brand)' : value ? 'var(--border-medium)' : 'var(--border-subtle)'}`,
          boxShadow:   open ? '0 0 0 3px var(--brand-dim)' : 'none',
          cursor:      disabled ? 'not-allowed' : 'pointer',
          opacity:     disabled ? 0.6 : 1,
        }}>
        <Clock size={15} style={{ color: value ? 'var(--brand)' : 'var(--text-muted)', flexShrink: 0 }} />
        <span className="flex-1 text-sm font-medium truncate"
          style={{ color: value ? 'var(--text-primary)' : 'var(--text-muted)' }}>
          {displayLabel ?? placeholder}
        </span>
        {value ? (
          <span
            role="button"
            onClick={e => { e.stopPropagation(); onChange(''); setOpen(false) }}
            className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-colors"
            style={{ background: 'var(--bg-elevated)' }}>
            <X size={10} strokeWidth={2.5} style={{ color: 'var(--text-muted)' }} />
          </span>
        ) : (
          <ChevronDown size={14} style={{
            color:     'var(--text-muted)',
            flexShrink: 0,
            transition: 'transform 0.15s',
            transform:  open ? 'rotate(180deg)' : 'none',
          }} />
        )}
      </button>

      {/* ── Dropdown ── */}
      {open && (
        <div className="absolute left-0 right-0 mt-1.5 rounded-2xl overflow-hidden"
          style={{
            background: '#fff',
            border:     '1px solid var(--border-medium)',
            boxShadow:  '0 12px 40px rgba(0,0,0,0.14)',
            zIndex:     9999,
          }}>

          {!hasSlots ? (
            // Sin opciones disponibles
            <div className="px-5 py-6 text-center">
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center mx-auto mb-3"
                style={{ background: 'var(--bg-elevated)' }}>
                <Clock size={18} style={{ color: 'var(--text-muted)' }} />
              </div>
              <p className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
                {emptyMessage().title}
              </p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {emptyMessage().sub}
              </p>
            </div>
          ) : (
            // Grid de horas disponibles
            <div style={{ maxHeight: 320, overflowY: 'auto' }}>
              {GROUPS.filter(g => grouped[g]?.length).map(group => (
                <div key={group}>
                  <div className="px-4 py-2 text-xs font-semibold sticky top-0"
                    style={{
                      background:    'var(--bg-base)',
                      color:         'var(--text-muted)',
                      borderBottom:  '1px solid var(--border-subtle)',
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                    }}>
                    {group}
                  </div>
                  <div className="grid grid-cols-4 gap-1.5 p-3">
                    {grouped[group].map(slot => {
                      const isSel = slot.value === value
                      return (
                        <button
                          key={slot.value}
                          type="button"
                          onClick={() => { onChange(slot.value); setOpen(false) }}
                          className="py-2 px-1 rounded-xl text-xs font-semibold text-center transition-all"
                          style={isSel ? {
                            background: 'var(--brand)',
                            color:      '#fff',
                            boxShadow:  '0 2px 8px rgba(53,196,147,0.3)',
                          } : {
                            background: 'var(--bg-elevated)',
                            color:      'var(--text-primary)',
                          }}
                          onMouseEnter={e => { if (!isSel) (e.currentTarget as HTMLElement).style.background = 'var(--brand-dim)' }}
                          onMouseLeave={e => { if (!isSel) (e.currentTarget as HTMLElement).style.background = 'var(--bg-elevated)' }}>
                          {slot.label}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
