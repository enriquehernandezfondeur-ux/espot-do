'use client'

import { useState, useMemo } from 'react'
import { Clock, ChevronLeft, ChevronRight } from 'lucide-react'

const TIME_SLOTS = [
  {v:'08:00',l:'8am'},{v:'09:00',l:'9am'},{v:'10:00',l:'10am'},{v:'11:00',l:'11am'},
  {v:'12:00',l:'12pm'},{v:'13:00',l:'1pm'},{v:'14:00',l:'2pm'},{v:'15:00',l:'3pm'},
  {v:'16:00',l:'4pm'},{v:'17:00',l:'5pm'},{v:'18:00',l:'6pm'},{v:'19:00',l:'7pm'},
  {v:'20:00',l:'8pm'},{v:'21:00',l:'9pm'},{v:'22:00',l:'10pm'},{v:'23:00',l:'11pm'},
]
const MONTH_NAMES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const DAY_NAMES = ['Do','Lu','Ma','Mi','Ju','Vi','Sá']

function fmtTime(t: string) {
  if (!t) return ''
  const h = parseInt(t.split(':')[0])
  return `${h % 12 || 12}${h >= 12 ? 'pm' : 'am'}`
}

export function DateTimePicker({
  date, time, onDate, onTime, loading,
}: {
  date: string; time: string
  onDate: (d: string) => void; onTime: (t: string) => void
  loading?: boolean
}) {
  const today = useMemo(() => { const d = new Date(); d.setHours(0,0,0,0); return d }, [])
  const initD = date ? new Date(date + 'T12:00') : new Date()
  const [yr, setYr] = useState(initD.getFullYear())
  const [mo, setMo] = useState(initD.getMonth())

  const cells = useMemo(() => {
    const startOffset = new Date(yr, mo, 1).getDay() // 0=Dom, 1=Lun … 6=Sáb
    const totalDays = new Date(yr, mo + 1, 0).getDate()
    const arr: (number | null)[] = Array(startOffset).fill(null)
    for (let d = 1; d <= totalDays; d++) arr.push(d)
    return arr
  }, [yr, mo])

  function iso(d: number) {
    return `${yr}-${String(mo + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  }
  function prevMo() { mo === 0 ? (setYr(y => y - 1), setMo(11)) : setMo(m => m - 1) }
  function nextMo() { mo === 11 ? (setYr(y => y + 1), setMo(0)) : setMo(m => m + 1) }

  return (
    <div className="p-4 select-none" style={{ minWidth: 288 }}>

      {/* Navegación de mes */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={prevMo}
          className="w-8 h-8 flex items-center justify-center rounded-xl transition-all"
          style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>
          <ChevronLeft size={16} />
        </button>
        <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
          {MONTH_NAMES[mo]} {yr}
        </span>
        <button onClick={nextMo}
          className="w-8 h-8 flex items-center justify-center rounded-xl transition-all"
          style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Nombres de día */}
      <div className="grid grid-cols-7 mb-1">
        {DAY_NAMES.map(d => (
          <span key={d} className="text-center text-xs font-semibold py-1"
            style={{ color: 'var(--text-muted)' }}>{d}</span>
        ))}
      </div>

      {/* Grid de días */}
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((day, i) => {
          if (!day) return <div key={i} className="aspect-square" />
          const cellDate = new Date(yr, mo, day)
          const isPast = cellDate < today
          const isoStr = iso(day)
          const isSelected = date === isoStr
          const isToday = cellDate.toDateString() === today.toDateString()
          return (
            <button key={i} disabled={isPast}
              onClick={() => !isPast && onDate(isSelected ? '' : isoStr)}
              className="aspect-square flex items-center justify-center rounded-xl text-xs font-semibold transition-all"
              style={{
                background: isSelected ? 'var(--brand)' : 'transparent',
                color: isSelected ? '#fff' : isPast ? 'var(--text-muted)' : 'var(--text-primary)',
                cursor: isPast ? 'default' : 'pointer',
                fontWeight: isToday && !isSelected ? 800 : undefined,
                outline: isToday && !isSelected ? '2px solid var(--brand)' : undefined,
                outlineOffset: isToday && !isSelected ? '-2px' : undefined,
              }}>
              {day}
            </button>
          )
        })}
      </div>

      {/* Selector de hora — solo si hay fecha seleccionada */}
      {date && (
        <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--border-subtle)' }}>
          <div className="flex items-center gap-2 mb-3">
            {loading
              ? <div className="w-3.5 h-3.5 rounded-full border-2 border-t-transparent animate-spin shrink-0"
                  style={{ borderColor: 'var(--brand)', borderTopColor: 'transparent' }} />
              : <Clock size={13} style={{ color: 'var(--text-muted)' }} />
            }
            <span className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>
              Hora del evento
            </span>
            {time && (
              <span className="ml-auto text-xs font-semibold px-2 py-0.5 rounded-full"
                style={{ background: 'var(--brand-dim)', color: 'var(--brand)' }}>
                {fmtTime(time)}
              </span>
            )}
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {TIME_SLOTS.map(slot => {
              const isActive = time === slot.v
              return (
                <button key={slot.v} onClick={() => onTime(isActive ? '' : slot.v)}
                  className="py-2 rounded-xl text-xs font-semibold transition-all"
                  style={isActive
                    ? { background: 'var(--brand)', color: '#fff', boxShadow: '0 2px 8px rgba(53,196,147,0.3)' }
                    : { background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }
                  }>
                  {slot.l}
                </button>
              )
            })}
          </div>
          {!time && (
            <p className="text-xs mt-2 text-center" style={{ color: 'var(--text-muted)' }}>
              Selecciona una hora para ver disponibilidad exacta
            </p>
          )}
        </div>
      )}
    </div>
  )
}
