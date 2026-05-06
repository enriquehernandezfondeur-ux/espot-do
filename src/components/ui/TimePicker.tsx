'use client'

import { useState, useRef, useEffect } from 'react'
import { Clock, ChevronDown, Check } from 'lucide-react'

const ALL_SLOTS = [
  { v: '06:00', l: '6:00 AM',  g: 'Mañana' },
  { v: '06:30', l: '6:30 AM',  g: 'Mañana' },
  { v: '07:00', l: '7:00 AM',  g: 'Mañana' },
  { v: '07:30', l: '7:30 AM',  g: 'Mañana' },
  { v: '08:00', l: '8:00 AM',  g: 'Mañana' },
  { v: '08:30', l: '8:30 AM',  g: 'Mañana' },
  { v: '09:00', l: '9:00 AM',  g: 'Mañana' },
  { v: '09:30', l: '9:30 AM',  g: 'Mañana' },
  { v: '10:00', l: '10:00 AM', g: 'Mañana' },
  { v: '10:30', l: '10:30 AM', g: 'Mañana' },
  { v: '11:00', l: '11:00 AM', g: 'Mañana' },
  { v: '11:30', l: '11:30 AM', g: 'Mañana' },
  { v: '12:00', l: '12:00 PM', g: 'Tarde' },
  { v: '12:30', l: '12:30 PM', g: 'Tarde' },
  { v: '13:00', l: '1:00 PM',  g: 'Tarde' },
  { v: '13:30', l: '1:30 PM',  g: 'Tarde' },
  { v: '14:00', l: '2:00 PM',  g: 'Tarde' },
  { v: '14:30', l: '2:30 PM',  g: 'Tarde' },
  { v: '15:00', l: '3:00 PM',  g: 'Tarde' },
  { v: '15:30', l: '3:30 PM',  g: 'Tarde' },
  { v: '16:00', l: '4:00 PM',  g: 'Tarde' },
  { v: '16:30', l: '4:30 PM',  g: 'Tarde' },
  { v: '17:00', l: '5:00 PM',  g: 'Tarde' },
  { v: '17:30', l: '5:30 PM',  g: 'Tarde' },
  { v: '18:00', l: '6:00 PM',  g: 'Noche' },
  { v: '18:30', l: '6:30 PM',  g: 'Noche' },
  { v: '19:00', l: '7:00 PM',  g: 'Noche' },
  { v: '19:30', l: '7:30 PM',  g: 'Noche' },
  { v: '20:00', l: '8:00 PM',  g: 'Noche' },
  { v: '20:30', l: '8:30 PM',  g: 'Noche' },
  { v: '21:00', l: '9:00 PM',  g: 'Noche' },
  { v: '21:30', l: '9:30 PM',  g: 'Noche' },
  { v: '22:00', l: '10:00 PM', g: 'Noche' },
  { v: '22:30', l: '10:30 PM', g: 'Noche' },
  { v: '23:00', l: '11:00 PM', g: 'Noche' },
  { v: '23:30', l: '11:30 PM', g: 'Noche' },
  { v: '00:00', l: '12:00 AM', g: 'Madrugada' },
  { v: '00:30', l: '12:30 AM', g: 'Madrugada' },
  { v: '01:00', l: '1:00 AM',  g: 'Madrugada' },
  { v: '01:30', l: '1:30 AM',  g: 'Madrugada' },
  { v: '02:00', l: '2:00 AM',  g: 'Madrugada' },
  { v: '03:00', l: '3:00 AM',  g: 'Madrugada' },
]

export function hourToNum(h: string) {
  const n = parseInt(h.split(':')[0])
  return n < 6 ? n + 24 : n
}

interface Props {
  value:            string
  onChange:         (v: string) => void
  placeholder?:     string
  afterValue?:      string
  minMinutesAfter?: number
  maxMinutesAfter?: number
  allowedRange?:    { start: string; end: string } | null
  disabled?:        boolean
}

export default function TimePicker({
  value, onChange, placeholder = 'Seleccionar hora',
  afterValue, minMinutesAfter, maxMinutesAfter,
  allowedRange, disabled,
}: Props) {
  const [open, setOpen]   = useState(false)
  const ref               = useRef<HTMLDivElement>(null)
  const listRef           = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function h(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  // Auto-scroll al elemento seleccionado
  useEffect(() => {
    if (open && value && listRef.current) {
      setTimeout(() => {
        const el = listRef.current?.querySelector(`[data-v="${value}"]`) as HTMLElement
        el?.scrollIntoView({ block: 'center', behavior: 'smooth' })
      }, 60)
    }
  }, [open, value])

  // Filtrar slots disponibles
  const available = ALL_SLOTS.filter(s => {
    if (allowedRange === null) return false
    if (allowedRange) {
      const n  = hourToNum(s.v)
      const sn = hourToNum(allowedRange.start)
      const en = (allowedRange.end === '00:00' || allowedRange.end === '24:00') ? 24 : hourToNum(allowedRange.end)
      if (n < sn || n >= en) return false
    }
    if (afterValue) {
      const fa = hourToNum(afterValue) * 60 + parseInt(afterValue.split(':')[1] ?? '0')
      const fs = hourToNum(s.v)       * 60 + parseInt(s.v.split(':')[1]       ?? '0')
      const diff = fs - fa
      if (diff <= 0) return false
      if (minMinutesAfter && diff < minMinutesAfter) return false
      if (maxMinutesAfter && diff > maxMinutesAfter) return false
    }
    return true
  })

  // Agrupar por momento
  const groups: Record<string, typeof ALL_SLOTS> = {}
  for (const s of available) {
    if (!groups[s.g]) groups[s.g] = []
    groups[s.g].push(s)
  }

  const label = ALL_SLOTS.find(s => s.v === value)?.l ?? null

  return (
    <div ref={ref} style={{ position: 'relative' }}>

      {/* ── Trigger ── */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen(o => !o)}
        style={{
          width:       '100%',
          display:     'flex',
          alignItems:  'center',
          gap:         10,
          padding:     '14px 16px',
          borderRadius: 14,
          border:      `1.5px solid ${open ? '#35C493' : value ? '#D1D5DB' : '#E5E7EB'}`,
          background:  disabled ? '#F9FAFB' : '#fff',
          boxShadow:   open ? '0 0 0 3px rgba(53,196,147,0.12)' : '0 1px 3px rgba(0,0,0,0.05)',
          cursor:      disabled ? 'not-allowed' : 'pointer',
          opacity:     disabled ? 0.55 : 1,
          transition:  'border-color 0.15s, box-shadow 0.15s',
          textAlign:   'left',
        }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8, display: 'flex',
          alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          background: value ? 'rgba(53,196,147,0.1)' : '#F3F4F6',
        }}>
          <Clock size={15} color={value ? '#35C493' : '#9CA3AF'} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize:   11, fontWeight: 600, textTransform: 'uppercase',
            letterSpacing: '0.07em', color: '#9CA3AF', marginBottom: 2,
          }}>
            {placeholder.includes('inicio') ? 'Hora de inicio' : placeholder.includes('salida') ? 'Hora de salida' : 'Hora'}
          </div>
          <div style={{
            fontSize: 14, fontWeight: value ? 600 : 400,
            color:    value ? '#111827' : '#9CA3AF',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {label ?? placeholder}
          </div>
        </div>

        <ChevronDown
          size={16}
          color="#9CA3AF"
          style={{ flexShrink: 0, transition: 'transform 0.18s', transform: open ? 'rotate(180deg)' : 'none' }}
        />
      </button>

      {/* ── Dropdown ── */}
      {open && (
        <div style={{
          position:    'absolute',
          top:         'calc(100% + 6px)',
          left:         0,
          right:        0,
          background:  '#fff',
          border:      '1px solid #E5E7EB',
          borderRadius: 16,
          boxShadow:   '0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)',
          zIndex:       9999,
          overflow:    'hidden',
          animation:   'tpIn 0.14s ease-out',
        }}>
          <style>{`@keyframes tpIn{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:translateY(0)}}`}</style>

          {available.length === 0 ? (
            <div style={{ padding: '24px 20px', textAlign: 'center' }}>
              <Clock size={24} color="#D1D5DB" style={{ margin: '0 auto 10px' }} />
              <p style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 4 }}>
                Sin horarios disponibles
              </p>
              <p style={{ fontSize: 12, color: '#9CA3AF', lineHeight: 1.5 }}>
                {allowedRange === null
                  ? 'Este día no tiene horario habilitado. Prueba con otra fecha.'
                  : minMinutesAfter
                  ? `Se requieren mínimo ${Math.round(minMinutesAfter / 60)}h. Elige una hora de inicio más temprana.`
                  : 'Selecciona primero la hora de inicio.'}
              </p>
            </div>
          ) : (
            <div ref={listRef} style={{ maxHeight: 280, overflowY: 'auto' }}>
              {Object.entries(groups).map(([group, slots]) => (
                <div key={group}>
                  {/* Cabecera de grupo */}
                  <div style={{
                    padding:       '8px 16px 6px',
                    fontSize:      10,
                    fontWeight:    700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    color:         '#9CA3AF',
                    background:    '#F9FAFB',
                    borderBottom:  '1px solid #F3F4F6',
                    position:      'sticky',
                    top:           0,
                  }}>
                    {group}
                  </div>

                  {/* Slots */}
                  {slots.map(slot => {
                    const isSel = slot.v === value
                    return (
                      <button
                        key={slot.v}
                        data-v={slot.v}
                        type="button"
                        onClick={() => { onChange(slot.v); setOpen(false) }}
                        style={{
                          width:       '100%',
                          display:     'flex',
                          alignItems:  'center',
                          justifyContent: 'space-between',
                          padding:     '10px 16px',
                          border:      'none',
                          background:  isSel ? 'rgba(53,196,147,0.08)' : 'transparent',
                          cursor:      'pointer',
                          transition:  'background 0.1s',
                          borderLeft:  isSel ? '3px solid #35C493' : '3px solid transparent',
                        }}
                        onMouseEnter={e => { if (!isSel) (e.currentTarget as HTMLElement).style.background = '#F9FAFB' }}
                        onMouseLeave={e => { if (!isSel) (e.currentTarget as HTMLElement).style.background = 'transparent' }}>
                        <span style={{
                          fontSize:   14,
                          fontWeight: isSel ? 700 : 400,
                          color:      isSel ? '#35C493' : '#374151',
                        }}>
                          {slot.l}
                        </span>
                        {isSel && <Check size={15} color="#35C493" />}
                      </button>
                    )
                  })}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
