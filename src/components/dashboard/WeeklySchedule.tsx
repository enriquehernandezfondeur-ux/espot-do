'use client'

import { useState, useEffect } from 'react'
import { Plus, X, Pencil, Copy, Check } from 'lucide-react'

// ── Tipos (sin cambios) ────────────────────────────────────
interface TimeRange {
  id:    string
  start: string
  end:   string
}

interface DaySchedule {
  enabled: boolean
  ranges:  TimeRange[]
}

type DayKey = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun'
type WeekSchedule = Record<DayKey, DaySchedule>

export interface TimeBlock {
  block_name: string
  start_time: string
  end_time:   string
  days:       number[]
}

interface Props {
  onChange: (blocks: TimeBlock[]) => void
  initial?: TimeBlock[]
}

// ── Constantes (sin cambios) ───────────────────────────────
const DAYS: { key: DayKey; label: string; num: number }[] = [
  { key: 'mon', label: 'Lunes',     num: 1 },
  { key: 'tue', label: 'Martes',    num: 2 },
  { key: 'wed', label: 'Miércoles', num: 3 },
  { key: 'thu', label: 'Jueves',    num: 4 },
  { key: 'fri', label: 'Viernes',   num: 5 },
  { key: 'sat', label: 'Sábado',    num: 6 },
  { key: 'sun', label: 'Domingo',   num: 0 },
]

function makeId()    { return Math.random().toString(36).slice(2, 9) }

function timeToMin(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

function fmt(t: string): string {
  if (!t) return '—'
  const [h, m] = t.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12  = h % 12 || 12
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`
}

// ── Conversiones (sin cambios) ─────────────────────────────
function toTimeBlocks(week: WeekSchedule): TimeBlock[] {
  const blocks: TimeBlock[] = []
  DAYS.forEach(({ key, num, label }) => {
    const day = week[key]
    if (!day.enabled) return
    day.ranges.forEach(r => {
      if (!r.start || !r.end) return
      blocks.push({ block_name: label, start_time: r.start, end_time: r.end, days: [num] })
    })
  })
  return blocks
}

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
  const [week, setWeek] = useState<WeekSchedule>(() => {
    if (initial.length > 0) return fromTimeBlocks(initial)
    return {
      mon: { enabled: false, ranges: [] },
      tue: { enabled: false, ranges: [] },
      wed: { enabled: false, ranges: [] },
      thu: { enabled: false, ranges: [] },
      fri: { enabled: false, ranges: [] },
      sat: { enabled: false, ranges: [] },
      sun: { enabled: false, ranges: [] },
    }
  })

  // Estado de edición por día: qué rango se está editando / si está añadiendo
  const [adding,   setAdding]   = useState<Partial<Record<DayKey, boolean>>>({})
  const [editing,  setEditing]  = useState<Partial<Record<string, string>>>({}) // rangeId → dayKey
  const [draft,    setDraft]    = useState<Partial<Record<DayKey, { start: string; end: string }>>>({})
  const [errors,   setErrors]   = useState<Record<string, string>>({})

  useEffect(() => { onChange(toTimeBlocks(week)) }, [week])

  function update(fn: (prev: WeekSchedule) => WeekSchedule) {
    setWeek(prev => fn(prev))
  }

  // Toggle día
  function toggleDay(key: DayKey) {
    update(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        enabled: !prev[key].enabled,
        ranges: !prev[key].enabled && prev[key].ranges.length === 0
          ? [{ id: makeId(), start: '09:00', end: '18:00' }] : prev[key].ranges,
      },
    }))
    setAdding(p => ({ ...p, [key]: false }))
  }

  // Abrir formulario de nuevo horario
  function openAdd(key: DayKey) {
    if ((week[key].ranges.length) >= 4) return
    setDraft(p => ({ ...p, [key]: { start: '', end: '' } }))
    setAdding(p => ({ ...p, [key]: true }))
    setErrors({})
  }

  // Confirmar nuevo horario
  function confirmAdd(key: DayKey) {
    const d = draft[key] ?? { start: '', end: '' }
    if (!d.start || !d.end) { setErrors({ [`add-${key}`]: 'Completa ambas horas' }); return }
    if (timeToMin(d.start) >= timeToMin(d.end) && d.end !== '00:00') {
      setErrors({ [`add-${key}`]: 'La hora de fin debe ser después del inicio' }); return
    }
    // Validar solapamiento
    const conflict = week[key].ranges.some(r => {
      const aS = timeToMin(r.start), aE = timeToMin(r.end) || 1440
      const bS = timeToMin(d.start), bE = timeToMin(d.end) || 1440
      return bS < aE && bE > aS
    })
    if (conflict) { setErrors({ [`add-${key}`]: 'Este horario se superpone con uno existente' }); return }
    update(prev => ({
      ...prev,
      [key]: { ...prev[key], ranges: [...prev[key].ranges, { id: makeId(), start: d.start, end: d.end }] },
    }))
    setAdding(p => ({ ...p, [key]: false }))
    setDraft(p => ({ ...p, [key]: { start: '', end: '' } }))
    setErrors({})
  }

  function cancelAdd(key: DayKey) {
    setAdding(p => ({ ...p, [key]: false }))
    setErrors({})
  }

  // Eliminar rango
  function removeRange(key: DayKey, id: string) {
    update(prev => ({
      ...prev,
      [key]: { ...prev[key], ranges: prev[key].ranges.filter(r => r.id !== id) },
    }))
    setEditing(p => { const n = { ...p }; delete n[id]; return n })
  }

  // Editar rango existente
  function startEdit(key: DayKey, range: TimeRange) {
    setEditing(p => ({ ...p, [range.id]: key }))
    setDraft(p => ({ ...p, [`edit-${range.id}`]: { start: range.start, end: range.end } }))
    setAdding(p => ({ ...p, [key]: false }))
    setErrors({})
  }

  function confirmEdit(key: DayKey, id: string) {
    const d = (draft as any)[`edit-${id}`] ?? { start: '', end: '' }
    if (!d.start || !d.end) { setErrors({ [`edit-${id}`]: 'Completa ambas horas' }); return }
    if (timeToMin(d.start) >= timeToMin(d.end) && d.end !== '00:00') {
      setErrors({ [`edit-${id}`]: 'La hora de fin debe ser después del inicio' }); return
    }
    update(prev => ({
      ...prev,
      [key]: { ...prev[key], ranges: prev[key].ranges.map(r => r.id === id ? { ...r, start: d.start, end: d.end } : r) },
    }))
    setEditing(p => { const n = { ...p }; delete n[id]; return n })
    setErrors({})
  }

  function cancelEdit(id: string) {
    setEditing(p => { const n = { ...p }; delete n[id]; return n })
    setErrors({})
  }

  // Copiar a todos
  function copyToAll(fromKey: DayKey) {
    const src = week[fromKey]
    if (!src.enabled || !src.ranges.length) return
    update(prev => {
      const next = { ...prev }
      DAYS.forEach(({ key }) => {
        if (key === fromKey) return
        next[key] = { enabled: true, ranges: src.ranges.map(r => ({ ...r, id: makeId() })) }
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
    <div className="space-y-4">

      {/* Resumen + acciones rápidas */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          {enabledCount === 0
            ? 'Activa los días en los que aceptas reservas'
            : <span>Has configurado horarios en <strong style={{ color: 'var(--text-primary)' }}>{enabledCount} {enabledCount === 1 ? 'día' : 'días'}</strong></span>}
        </p>
        {enabledCount > 0 && week.mon.enabled && week.mon.ranges.length > 0 && (
          <div className="flex gap-2">
            <button onClick={copyWeekdays}
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-all"
              style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}>
              <Copy size={11} /> Lun – Vie
            </button>
            <button onClick={copyWeekend}
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-all"
              style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}>
              <Copy size={11} /> Fin de semana
            </button>
          </div>
        )}
      </div>

      {/* Lista de días */}
      <div className="space-y-2.5">
        {DAYS.map(({ key, label }) => {
          const day     = week[key]
          const isAdding = !!adding[key]
          const draftDay = draft[key] ?? { start: '', end: '' }

          return (
            <div key={key}
              className="rounded-2xl transition-all overflow-hidden"
              style={{
                background: day.enabled ? 'rgba(53,196,147,0.06)' : 'var(--bg-elevated)',
                border: day.enabled
                  ? '1.5px solid rgba(53,196,147,0.25)'
                  : '1px solid var(--border-subtle)',
              }}>

              {/* ── Cabecera del día ── */}
              <div className="flex items-center gap-4 px-5 py-4">
                {/* Toggle */}
                <button onClick={() => toggleDay(key)}
                  className="relative w-11 h-6 rounded-full transition-all shrink-0"
                  style={{ background: day.enabled ? '#35C493' : 'var(--border-medium)' }}>
                  <span className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all"
                    style={{ left: day.enabled ? 22 : 2 }} />
                </button>

                {/* Nombre */}
                <span className="text-sm font-semibold w-24 shrink-0"
                  style={{ color: day.enabled ? '#fff' : 'var(--text-muted)' }}>
                  {label}
                </span>

                {/* Resumen o "No disponible" */}
                {!day.enabled ? (
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>No disponible</span>
                ) : day.ranges.length > 0 ? (
                  <div className="flex gap-2 flex-wrap flex-1">
                    {day.ranges.filter(r => r.start && r.end && !editing[r.id]).map(r => (
                      <span key={r.id} className="text-xs font-medium px-2.5 py-1 rounded-lg"
                        style={{ background: 'rgba(53,196,147,0.1)', color: '#35C493', border: '1px solid rgba(53,196,147,0.2)' }}>
                        {fmt(r.start)} – {fmt(r.end)}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-xs italic" style={{ color: 'var(--text-muted)' }}>Sin horarios</span>
                )}

                {/* Copiar a todos */}
                {day.enabled && day.ranges.length > 0 && !isAdding && (
                  <button onClick={() => copyToAll(key)}
                    className="ml-auto text-xs px-2.5 py-1.5 rounded-lg transition-all shrink-0"
                    style={{ color: 'var(--text-muted)', background: 'transparent' }}
                    title="Aplicar a todos los días">
                    <Copy size={12} />
                  </button>
                )}
              </div>

              {/* ── Contenido del día (solo si activo) ── */}
              {day.enabled && (
                <div className="px-5 pb-4 space-y-2" style={{ borderTop: '1px solid rgba(53,196,147,0.1)' }}>

                  {/* Bloques existentes */}
                  {day.ranges.map(range => {
                    const isEditingThis = !!editing[range.id]
                    const editDraft = (draft as any)[`edit-${range.id}`] ?? { start: range.start, end: range.end }
                    const editErr   = errors[`edit-${range.id}`]
                    return (
                      <div key={range.id} className="pt-3">
                        {isEditingThis ? (
                          /* Modo edición */
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <input type="time" value={editDraft.start}
                                onChange={e => setDraft(p => ({ ...p, [`edit-${range.id}`]: { ...editDraft, start: e.target.value } }))}
                                className='input-base w-full rounded-xl px-3 py-2 text-sm font-medium' />
                              <span className="text-sm shrink-0" style={{ color: 'var(--text-muted)' }}>–</span>
                              <input type="time" value={editDraft.end}
                                onChange={e => setDraft(p => ({ ...p, [`edit-${range.id}`]: { ...editDraft, end: e.target.value } }))}
                                className='input-base w-full rounded-xl px-3 py-2 text-sm font-medium' />
                              <button onClick={() => confirmEdit(key, range.id)}
                                className="w-9 h-9 flex items-center justify-center rounded-xl transition-all shrink-0"
                                style={{ background: '#35C493', color: '#0B0F0E' }}>
                                <Check size={15} />
                              </button>
                              <button onClick={() => cancelEdit(range.id)}
                                className="w-9 h-9 flex items-center justify-center rounded-xl transition-all shrink-0"
                                style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>
                                <X size={15} />
                              </button>
                            </div>
                            {editErr && <p className="text-xs" style={{ color: '#f87171' }}>{editErr}</p>}
                          </div>
                        ) : (
                          /* Modo lectura — bloque visual */
                          <div className="flex items-center justify-between group">
                            <div className="flex items-center gap-3">
                              <div className="w-2 h-2 rounded-full shrink-0" style={{ background: '#35C493' }} />
                              <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                                {fmt(range.start)} – {fmt(range.end)}
                              </span>
                            </div>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => startEdit(key, range)}
                                className="w-8 h-8 flex items-center justify-center rounded-lg transition-all"
                                style={{ color: 'var(--text-muted)', background: 'var(--bg-elevated)' }}>
                                <Pencil size={13} />
                              </button>
                              <button onClick={() => removeRange(key, range.id)}
                                className="w-8 h-8 flex items-center justify-center rounded-lg transition-all"
                                style={{ color: 'rgba(248,113,113,0.7)', background: 'rgba(248,113,113,0.08)' }}>
                                <X size={13} />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}

                  {/* Formulario: nuevo horario */}
                  {isAdding ? (
                    <div className="pt-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <input type="time" value={draftDay.start}
                          onChange={e => setDraft(p => ({ ...p, [key]: { ...draftDay, start: e.target.value } }))}
                          placeholder="Inicio"
                          className='input-base w-full rounded-xl px-3 py-2 text-sm font-medium' />
                        <span className="text-sm shrink-0" style={{ color: 'var(--text-muted)' }}>–</span>
                        <input type="time" value={draftDay.end}
                          onChange={e => setDraft(p => ({ ...p, [key]: { ...draftDay, end: e.target.value } }))}
                          placeholder="Fin"
                          className='input-base w-full rounded-xl px-3 py-2 text-sm font-medium' />
                        <button onClick={() => confirmAdd(key)}
                          className="w-9 h-9 flex items-center justify-center rounded-xl shrink-0"
                          style={{ background: '#35C493', color: '#0B0F0E' }}>
                          <Check size={15} />
                        </button>
                        <button onClick={() => cancelAdd(key)}
                          className="w-9 h-9 flex items-center justify-center rounded-xl shrink-0"
                          style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>
                          <X size={15} />
                        </button>
                      </div>
                      {errors[`add-${key}`] && (
                        <p className="text-xs" style={{ color: '#f87171' }}>{errors[`add-${key}`]}</p>
                      )}
                    </div>
                  ) : (
                    /* Botón agregar */
                    day.ranges.length < 4 && !Object.values(editing).includes(key as any) && (
                      <div className="pt-2">
                        <button onClick={() => openAdd(key)}
                          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl transition-all"
                          style={{ color: '#35C493', background: 'rgba(53,196,147,0.07)', border: '1px dashed rgba(53,196,147,0.25)' }}>
                          <Plus size={13} /> Agregar horario
                        </button>
                      </div>
                    )
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Estado vacío */}
      {enabledCount === 0 && (
        <div className="text-center py-8 rounded-2xl"
          style={{ background: 'var(--bg-elevated)', border: '1px dashed var(--border-medium)' }}>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Activa los días para configurar tus horarios
          </p>
        </div>
      )}
    </div>
  )
}
