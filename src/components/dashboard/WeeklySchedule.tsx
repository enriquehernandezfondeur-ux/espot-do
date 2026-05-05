'use client'

import { useState, useEffect } from 'react'
import { Plus, X, Copy, ChevronDown } from 'lucide-react'

// ── Tipos ──────────────────────────────────────────────────
interface TimeRange {
  id:    string
  start: string  // "08:00"
  end:   string  // "12:00"
}

interface DaySchedule {
  enabled: boolean
  ranges:  TimeRange[]
}

type DayKey = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun'

type WeekSchedule = Record<DayKey, DaySchedule>

// Formato de salida compatible con el wizard existente
export interface TimeBlock {
  block_name: string
  start_time: string
  end_time:   string
  days:       number[]  // 0=Dom, 1=Lun … 6=Sáb
}

interface Props {
  onChange: (blocks: TimeBlock[]) => void
  initial?: TimeBlock[]
}

// ── Constantes ─────────────────────────────────────────────
const DAYS: { key: DayKey; label: string; short: string; num: number }[] = [
  { key: 'mon', label: 'Lunes',     short: 'Lu', num: 1 },
  { key: 'tue', label: 'Martes',    short: 'Ma', num: 2 },
  { key: 'wed', label: 'Miércoles', short: 'Mi', num: 3 },
  { key: 'thu', label: 'Jueves',    short: 'Ju', num: 4 },
  { key: 'fri', label: 'Viernes',   short: 'Vi', num: 5 },
  { key: 'sat', label: 'Sábado',    short: 'Sa', num: 6 },
  { key: 'sun', label: 'Domingo',   short: 'Do', num: 0 },
]

const PRESETS = [
  { label: 'Mañana',  start: '08:00', end: '12:00' },
  { label: 'Tarde',   start: '12:00', end: '18:00' },
  { label: 'Noche',   start: '18:00', end: '00:00' },
]

const DEFAULT_EMPTY: DaySchedule = { enabled: false, ranges: [] }

function makeId() { return Math.random().toString(36).slice(2, 9) }

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

function formatDisplay(t: string): string {
  if (!t) return '—'
  const [h, m] = t.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12  = h % 12 || 12
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`
}

// Convierte WeekSchedule → TimeBlock[] para el wizard
function toTimeBlocks(week: WeekSchedule): TimeBlock[] {
  const blocks: TimeBlock[] = []
  DAYS.forEach(({ key, num, label }) => {
    const day = week[key]
    if (!day.enabled) return
    day.ranges.forEach(r => {
      if (!r.start || !r.end) return
      blocks.push({
        block_name: label,
        start_time: r.start,
        end_time:   r.end,
        days:       [num],
      })
    })
  })
  return blocks
}

// Construye WeekSchedule inicial desde TimeBlock[]
function fromTimeBlocks(blocks: TimeBlock[]): WeekSchedule {
  const week: WeekSchedule = {
    mon: { enabled: false, ranges: [] },
    tue: { enabled: false, ranges: [] },
    wed: { enabled: false, ranges: [] },
    thu: { enabled: false, ranges: [] },
    fri: { enabled: false, ranges: [] },
    sat: { enabled: false, ranges: [] },
    sun: { enabled: false, ranges: [] },
  }
  blocks.forEach(b => {
    b.days.forEach(num => {
      const day = DAYS.find(d => d.num === num)
      if (!day) return
      week[day.key].enabled = true
      week[day.key].ranges.push({ id: makeId(), start: b.start_time, end: b.end_time })
    })
  })
  return week
}

// ── Componente ─────────────────────────────────────────────
export default function WeeklySchedule({ onChange, initial = [] }: Props) {
  const [week, setWeek] = useState<WeekSchedule>(() =>
    initial.length > 0
      ? fromTimeBlocks(initial)
      : {
          mon: { enabled: false, ranges: [] },
          tue: { enabled: false, ranges: [] },
          wed: { enabled: false, ranges: [] },
          thu: { enabled: false, ranges: [] },
          fri: { enabled: false, ranges: [] },
          sat: { enabled: false, ranges: [] },
          sun: { enabled: false, ranges: [] },
        }
  )
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [quickOpen, setQuickOpen] = useState<DayKey | null>(null)

  // Notificar al padre cuando cambia
  useEffect(() => {
    onChange(toTimeBlocks(week))
  }, [week])

  // ── Helpers ────────────────────────────────────────────
  function update(updater: (prev: WeekSchedule) => WeekSchedule) {
    setWeek(prev => updater(prev))
  }

  function toggleDay(key: DayKey) {
    update(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        enabled: !prev[key].enabled,
        ranges: !prev[key].enabled && prev[key].ranges.length === 0
          ? [{ id: makeId(), start: '09:00', end: '18:00' }]
          : prev[key].ranges,
      },
    }))
  }

  function addRange(key: DayKey) {
    update(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        ranges: [...prev[key].ranges, { id: makeId(), start: '', end: '' }],
      },
    }))
  }

  function removeRange(key: DayKey, id: string) {
    update(prev => ({
      ...prev,
      [key]: { ...prev[key], ranges: prev[key].ranges.filter(r => r.id !== id) },
    }))
  }

  function updateRange(key: DayKey, id: string, field: 'start' | 'end', value: string) {
    setErrors(prev => ({ ...prev, [`${key}-${id}`]: '' }))
    update(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        ranges: prev[key].ranges.map(r => r.id === id ? { ...r, [field]: value } : r),
      },
    }))

    // Validar solapamientos
    setTimeout(() => validateDay(key), 100)
  }

  function validateDay(key: DayKey) {
    const ranges = week[key].ranges.filter(r => r.start && r.end)
    const newErrors: Record<string, string> = {}

    ranges.forEach((r, i) => {
      if (timeToMinutes(r.start) >= timeToMinutes(r.end) && r.end !== '00:00') {
        newErrors[`${key}-${r.id}`] = 'La hora de fin debe ser después del inicio'
        return
      }
      ranges.forEach((r2, j) => {
        if (i >= j) return
        const aStart = timeToMinutes(r.start), aEnd = timeToMinutes(r.end) || 1440
        const bStart = timeToMinutes(r2.start), bEnd = timeToMinutes(r2.end) || 1440
        if (aStart < bEnd && aEnd > bStart) {
          newErrors[`${key}-${r.id}`]  = 'Los horarios se superponen'
          newErrors[`${key}-${r2.id}`] = 'Los horarios se superponen'
        }
      })
    })
    setErrors(prev => ({ ...prev, ...newErrors }))
  }

  function applyPreset(key: DayKey, preset: typeof PRESETS[0]) {
    update(prev => ({
      ...prev,
      [key]: {
        enabled: true,
        ranges: [...prev[key].ranges, { id: makeId(), start: preset.start, end: preset.end }],
      },
    }))
    setQuickOpen(null)
  }

  // ── Acciones rápidas globales ───────────────────────────
  function copyToAll(fromKey: DayKey) {
    const source = week[fromKey]
    if (!source.enabled || !source.ranges.length) return
    update(prev => {
      const next = { ...prev }
      DAYS.forEach(({ key }) => {
        if (key === fromKey) return
        next[key] = {
          enabled: true,
          ranges:  source.ranges.map(r => ({ ...r, id: makeId() })),
        }
      })
      return next
    })
  }

  function copyWeekdays() {
    const mon = week.mon
    if (!mon.enabled || !mon.ranges.length) return
    update(prev => {
      const next = { ...prev }
      ;(['mon','tue','wed','thu','fri'] as DayKey[]).forEach(k => {
        next[k] = { enabled: true, ranges: mon.ranges.map(r => ({ ...r, id: makeId() })) }
      })
      return next
    })
  }

  function copyWeekend() {
    const mon = week.mon
    if (!mon.enabled || !mon.ranges.length) return
    update(prev => ({
      ...prev,
      sat: { enabled: true, ranges: mon.ranges.map(r => ({ ...r, id: makeId() })) },
      sun: { enabled: true, ranges: mon.ranges.map(r => ({ ...r, id: makeId() })) },
    }))
  }

  const enabledCount = DAYS.filter(d => week[d.key].enabled).length

  // ── Render ─────────────────────────────────────────────
  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Define en qué horarios aceptas reservas. Los clientes solo podrán elegir dentro de estos rangos.
        </p>
      </div>

      {/* Acciones rápidas globales */}
      {enabledCount > 0 && (
        <div className="flex flex-wrap gap-2 pb-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <span className="text-xs font-semibold self-center" style={{ color: 'var(--text-muted)' }}>
            Acciones rápidas:
          </span>
          {week.mon.enabled && week.mon.ranges.length > 0 && (
            <>
              <button onClick={copyWeekdays}
                className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-all"
                style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}>
                <Copy size={11} /> Copiar lunes a viernes
              </button>
              <button onClick={copyWeekend}
                className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-all"
                style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}>
                <Copy size={11} /> Copiar a fin de semana
              </button>
            </>
          )}
        </div>
      )}

      {/* Lista de días */}
      <div className="space-y-2">
        {DAYS.map(({ key, label }) => {
          const day     = week[key]
          const hasError = day.ranges.some(r => errors[`${key}-${r.id}`])

          return (
            <div key={key}
              className="rounded-2xl overflow-hidden transition-all"
              style={{
                background: '#fff',
                border: `1px solid ${day.enabled ? (hasError ? 'rgba(239,68,68,0.3)' : 'var(--brand-border)') : 'var(--border-subtle)'}`,
                boxShadow: day.enabled ? '0 1px 6px rgba(53,196,147,0.08)' : 'none',
              }}>

              {/* Cabecera del día */}
              <div className="flex items-center gap-4 px-5 py-4">
                {/* Toggle ON/OFF */}
                <button
                  onClick={() => toggleDay(key)}
                  className="relative w-12 h-6 rounded-full transition-all shrink-0"
                  style={{ background: day.enabled ? 'var(--brand)' : 'var(--border-medium)' }}>
                  <span className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all"
                    style={{ left: day.enabled ? 26 : 2 }} />
                </button>

                {/* Nombre del día */}
                <span className="text-sm font-semibold w-24 shrink-0"
                  style={{ color: day.enabled ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                  {label}
                </span>

                {/* Resumen cuando está activo y colapsado */}
                {day.enabled && day.ranges.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 flex-1 min-w-0">
                    {day.ranges.filter(r => r.start && r.end).map(r => (
                      <span key={r.id}
                        className="text-xs px-2.5 py-1 rounded-lg font-medium"
                        style={{ background: 'var(--brand-dim)', color: 'var(--brand)' }}>
                        {formatDisplay(r.start)} – {formatDisplay(r.end)}
                      </span>
                    ))}
                  </div>
                )}

                {!day.enabled && (
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>No disponible</span>
                )}

                {/* Acción: copiar a todos */}
                {day.enabled && day.ranges.length > 0 && (
                  <button onClick={() => copyToAll(key)}
                    className="ml-auto text-xs flex items-center gap-1 px-2.5 py-1.5 rounded-lg transition-all shrink-0"
                    style={{ color: 'var(--text-muted)', background: 'var(--bg-elevated)' }}
                    title="Aplicar a todos los días">
                    <Copy size={11} /> A todos
                  </button>
                )}
              </div>

              {/* Rangos de horario */}
              {day.enabled && (
                <div className="px-5 pb-4 space-y-2.5" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                  <div className="pt-3 space-y-2">
                    {day.ranges.map((range, ri) => {
                      const errKey = `${key}-${range.id}`
                      const hasErr = !!errors[errKey]
                      return (
                        <div key={range.id}>
                          <div className="flex items-center gap-2">
                            {/* Hora inicio */}
                            <div className="flex items-center gap-1.5 flex-1">
                              <input
                                type="time"
                                value={range.start}
                                onChange={e => updateRange(key, range.id, 'start', e.target.value)}
                                className="flex-1 px-3 py-2 rounded-xl text-sm font-medium focus:outline-none transition-all"
                                style={{
                                  background: 'var(--bg-base)',
                                  border: `1.5px solid ${hasErr ? 'rgba(239,68,68,0.5)' : 'var(--border-medium)'}`,
                                  color: 'var(--text-primary)',
                                }}
                              />
                              <span className="text-sm font-medium shrink-0" style={{ color: 'var(--text-muted)' }}>—</span>
                              <input
                                type="time"
                                value={range.end}
                                onChange={e => updateRange(key, range.id, 'end', e.target.value)}
                                className="flex-1 px-3 py-2 rounded-xl text-sm font-medium focus:outline-none transition-all"
                                style={{
                                  background: 'var(--bg-base)',
                                  border: `1.5px solid ${hasErr ? 'rgba(239,68,68,0.5)' : 'var(--border-medium)'}`,
                                  color: 'var(--text-primary)',
                                }}
                              />
                            </div>

                            {/* Shortcuts de preset */}
                            <div className="relative shrink-0">
                              <button
                                onClick={() => setQuickOpen(quickOpen === key ? null : key)}
                                className="flex items-center gap-1 text-xs px-2.5 py-2 rounded-xl transition-all"
                                style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}>
                                Rápido <ChevronDown size={12} />
                              </button>
                              {quickOpen === key && (
                                <div className="absolute right-0 top-9 z-30 rounded-xl overflow-hidden shadow-xl"
                                  style={{ background: '#fff', border: '1px solid var(--border-medium)', minWidth: 130 }}>
                                  {PRESETS.map(p => (
                                    <button key={p.label}
                                      onClick={() => {
                                        updateRange(key, range.id, 'start', p.start)
                                        updateRange(key, range.id, 'end', p.end)
                                        setQuickOpen(null)
                                      }}
                                      className="w-full text-left px-4 py-2.5 text-xs font-medium transition-colors hover:bg-[var(--bg-elevated)]"
                                      style={{ color: 'var(--text-primary)' }}>
                                      <div>{p.label}</div>
                                      <div style={{ color: 'var(--text-muted)' }}>
                                        {formatDisplay(p.start)} – {formatDisplay(p.end)}
                                      </div>
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* Eliminar rango */}
                            {day.ranges.length > 1 && (
                              <button onClick={() => removeRange(key, range.id)}
                                className="w-8 h-8 flex items-center justify-center rounded-xl transition-colors shrink-0"
                                style={{ color: 'var(--text-muted)', background: 'var(--bg-elevated)' }}>
                                <X size={14} />
                              </button>
                            )}
                          </div>

                          {/* Error del rango */}
                          {hasErr && (
                            <p className="text-xs mt-1 ml-1" style={{ color: '#DC2626' }}>
                              {errors[errKey]}
                            </p>
                          )}
                        </div>
                      )
                    })}
                  </div>

                  {/* Agregar rango */}
                  {day.ranges.length < 4 && (
                    <button onClick={() => addRange(key)}
                      className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl transition-all"
                      style={{ color: 'var(--brand)', background: 'var(--brand-dim)', border: '1px solid var(--brand-border)' }}>
                      <Plus size={13} /> Agregar horario
                    </button>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Estado vacío */}
      {enabledCount === 0 && (
        <div className="text-center py-6 rounded-2xl"
          style={{ background: 'var(--bg-elevated)', border: '1px dashed var(--border-medium)' }}>
          <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
            Aún no has definido horarios disponibles
          </p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Activa los días en los que aceptas reservas
          </p>
        </div>
      )}

      {/* Resumen */}
      {enabledCount > 0 && (
        <div className="text-xs px-1" style={{ color: 'var(--text-muted)' }}>
          {enabledCount} día{enabledCount !== 1 ? 's' : ''} con disponibilidad configurada
        </div>
      )}
    </div>
  )
}
