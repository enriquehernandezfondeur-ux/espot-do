'use client'

import { useState, useRef, useEffect } from 'react'
import { Clock, Check } from 'lucide-react'

// Horarios disponibles de 6am a 3am (siguiente día)
const SLOTS = [
  { value: '06:00', label: '6:00 AM',  period: '☀️ Mañana' },
  { value: '06:30', label: '6:30 AM',  period: '☀️ Mañana' },
  { value: '07:00', label: '7:00 AM',  period: '☀️ Mañana' },
  { value: '07:30', label: '7:30 AM',  period: '☀️ Mañana' },
  { value: '08:00', label: '8:00 AM',  period: '☀️ Mañana' },
  { value: '08:30', label: '8:30 AM',  period: '☀️ Mañana' },
  { value: '09:00', label: '9:00 AM',  period: '☀️ Mañana' },
  { value: '09:30', label: '9:30 AM',  period: '☀️ Mañana' },
  { value: '10:00', label: '10:00 AM', period: '☀️ Mañana' },
  { value: '10:30', label: '10:30 AM', period: '☀️ Mañana' },
  { value: '11:00', label: '11:00 AM', period: '☀️ Mañana' },
  { value: '11:30', label: '11:30 AM', period: '☀️ Mañana' },
  { value: '12:00', label: '12:00 PM', period: '🌤️ Mediodía' },
  { value: '12:30', label: '12:30 PM', period: '🌤️ Mediodía' },
  { value: '13:00', label: '1:00 PM',  period: '🌤️ Mediodía' },
  { value: '13:30', label: '1:30 PM',  period: '🌤️ Mediodía' },
  { value: '14:00', label: '2:00 PM',  period: '🌤️ Mediodía' },
  { value: '14:30', label: '2:30 PM',  period: '🌤️ Mediodía' },
  { value: '15:00', label: '3:00 PM',  period: '🌅 Tarde' },
  { value: '15:30', label: '3:30 PM',  period: '🌅 Tarde' },
  { value: '16:00', label: '4:00 PM',  period: '🌅 Tarde' },
  { value: '16:30', label: '4:30 PM',  period: '🌅 Tarde' },
  { value: '17:00', label: '5:00 PM',  period: '🌅 Tarde' },
  { value: '17:30', label: '5:30 PM',  period: '🌅 Tarde' },
  { value: '18:00', label: '6:00 PM',  period: '🌆 Noche' },
  { value: '18:30', label: '6:30 PM',  period: '🌆 Noche' },
  { value: '19:00', label: '7:00 PM',  period: '🌆 Noche' },
  { value: '19:30', label: '7:30 PM',  period: '🌆 Noche' },
  { value: '20:00', label: '8:00 PM',  period: '🌆 Noche' },
  { value: '20:30', label: '8:30 PM',  period: '🌆 Noche' },
  { value: '21:00', label: '9:00 PM',  period: '🌆 Noche' },
  { value: '21:30', label: '9:30 PM',  period: '🌆 Noche' },
  { value: '22:00', label: '10:00 PM', period: '🌙 Madrugada' },
  { value: '22:30', label: '10:30 PM', period: '🌙 Madrugada' },
  { value: '23:00', label: '11:00 PM', period: '🌙 Madrugada' },
  { value: '23:30', label: '11:30 PM', period: '🌙 Madrugada' },
  { value: '00:00', label: '12:00 AM', period: '🌙 Madrugada' },
  { value: '00:30', label: '12:30 AM', period: '🌙 Madrugada' },
  { value: '01:00', label: '1:00 AM',  period: '🌙 Madrugada' },
  { value: '01:30', label: '1:30 AM',  period: '🌙 Madrugada' },
  { value: '02:00', label: '2:00 AM',  period: '🌙 Madrugada' },
  { value: '03:00', label: '3:00 AM',  period: '🌙 Madrugada' },
]

const PERIODS = [...new Set(SLOTS.map(s => s.period))]

interface Props {
  value:            string
  onChange:         (v: string) => void
  placeholder?:     string
  afterValue?:      string   // para "Hasta" — solo muestra horas después de "Desde"
  minMinutesAfter?: number   // mínimo de minutos después de afterValue (ej: 4h = 240)
  maxMinutesAfter?: number   // máximo de minutos después de afterValue (ej: 12h = 720)
}

function hourToNum(h: string) {
  const n = parseInt(h.split(':')[0])
  return n < 6 ? n + 24 : n
}

export default function TimePicker({ value, onChange, placeholder = 'Seleccionar hora', afterValue, minMinutesAfter, maxMinutesAfter }: Props) {
  const [open, setOpen]         = useState(false)
  const [activePeriod, setPeriod] = useState<string | null>(null)
  const ref                     = useRef<HTMLDivElement>(null)
  const listRef                 = useRef<HTMLDivElement>(null)

  // Cerrar al click afuera
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  // Auto-scroll al seleccionado
  useEffect(() => {
    if (open && value && listRef.current) {
      setTimeout(() => {
        const el = listRef.current?.querySelector(`[data-val="${value}"]`)
        el?.scrollIntoView({ block: 'center', behavior: 'smooth' })
      }, 80)
    }
  }, [open, value])

  function displayLabel(val: string) {
    return SLOTS.find(s => s.value === val)?.label ?? placeholder
  }

  // Filtrar slots respetando afterValue, min y max
  const afterNum = afterValue ? hourToNum(afterValue) : null

  function minutesDiff(from: string, to: string): number {
    const f = hourToNum(from) * 60 + parseInt(from.split(':')[1])
    const t = hourToNum(to)   * 60 + parseInt(to.split(':')[1])
    return t - f
  }

  const filtered = SLOTS.filter(s => {
    if (activePeriod && s.period !== activePeriod) return false
    if (afterNum === null) return true
    const diff = minutesDiff(afterValue!, s.value)
    if (diff <= 0) return false
    if (minMinutesAfter && diff < minMinutesAfter) return false
    if (maxMinutesAfter && diff > maxMinutesAfter) return false
    return true
  })

  // Agrupar por período
  const grouped: Record<string, typeof SLOTS> = {}
  for (const s of filtered) {
    if (!grouped[s.period]) grouped[s.period] = []
    grouped[s.period].push(s)
  }

  return (
    <div className="relative" ref={ref}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-4 rounded-2xl text-left transition-all"
        style={{
          background: 'var(--bg-surface)',
          border: `1.5px solid ${open ? 'var(--brand)' : value ? 'var(--border-medium)' : 'var(--border-subtle)'}`,
          boxShadow: open ? '0 0 0 3px var(--brand-dim)' : 'none',
        }}>
        <Clock size={17} style={{ color: value ? 'var(--brand)' : 'var(--text-muted)', flexShrink: 0 }} />
        <span className="flex-1 text-sm font-semibold"
          style={{ color: value ? 'var(--text-primary)' : 'var(--text-muted)' }}>
          {value ? displayLabel(value) : placeholder}
        </span>
        {value && (
          <span className="text-xs px-2 py-0.5 rounded-full font-medium shrink-0"
            style={{ background: 'var(--brand-dim)', color: 'var(--brand)' }}>
            {SLOTS.find(s => s.value === value)?.period.split(' ')[1] ?? ''}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute left-0 right-0 mt-2 rounded-2xl overflow-hidden"
          style={{ background: '#fff', border: '1px solid var(--border-medium)', boxShadow: '0 16px 48px rgba(0,0,0,0.16)', zIndex: 9999 }}>

          {/* Filtros de período */}
          <div className="p-2 flex gap-1 overflow-x-auto"
            style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-base)' }}>
            <button
              onClick={() => setPeriod(null)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition-all"
              style={activePeriod === null
                ? { background: 'var(--brand)', color: '#fff' }
                : { color: 'var(--text-secondary)', background: 'transparent' }}>
              Todos
            </button>
            {PERIODS.map(p => (
              <button key={p} onClick={() => setPeriod(activePeriod === p ? null : p)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition-all"
                style={activePeriod === p
                  ? { background: 'var(--brand)', color: '#fff' }
                  : { color: 'var(--text-secondary)', background: 'transparent' }}>
                {p}
              </button>
            ))}
          </div>

          {/* Lista de horarios */}
          <div ref={listRef} className="overflow-y-auto" style={{ maxHeight: 260 }}>
            {Object.keys(grouped).length === 0 ? (
              <div className="px-4 py-6 text-center">
                <div className="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
                  Sin opciones disponibles
                </div>
                <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {minMinutesAfter
                    ? `Este espacio requiere mínimo ${minMinutesAfter / 60}h. Elige una hora de inicio más temprana.`
                    : 'Selecciona una hora de inicio primero.'}
                </div>
              </div>
            ) : (
              Object.entries(grouped).map(([period, slots]) => (
                <div key={period}>
                  {/* Encabezado de período */}
                  <div className="px-4 py-2 text-xs font-bold sticky top-0"
                    style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
                    {period}
                  </div>
                  {/* Slots */}
                  <div className="px-2 pb-1">
                    {slots.map(slot => {
                      const isSel = slot.value === value
                      return (
                        <button
                          key={slot.value}
                          data-val={slot.value}
                          onClick={() => { onChange(slot.value); setOpen(false) }}
                          className="w-full flex items-center justify-between px-3 py-3 rounded-xl text-sm transition-all text-left"
                          style={isSel ? {
                            background: 'var(--brand)',
                            color: '#fff',
                            fontWeight: 700,
                          } : {
                            color: 'var(--text-primary)',
                          }}
                          onMouseEnter={e => { if (!isSel) (e.currentTarget as HTMLElement).style.background = 'var(--bg-elevated)' }}
                          onMouseLeave={e => { if (!isSel) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                        >
                          <span className="font-semibold">{slot.label}</span>
                          {isSel && <Check size={15} />}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
