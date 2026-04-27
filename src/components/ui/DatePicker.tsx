'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react'
import { cn } from '@/lib/utils'

const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const DAYS_HEADER = ['Do','Lu','Ma','Mi','Ju','Vi','Sa']

interface Props {
  value: string        // YYYY-MM-DD
  onChange: (v: string) => void
  minDate?: string
  placeholder?: string
}

export default function DatePicker({ value, onChange, minDate, placeholder = 'Seleccionar fecha' }: Props) {
  const [open, setOpen]   = useState(false)
  const ref               = useRef<HTMLDivElement>(null)
  const today             = new Date()
  today.setHours(0,0,0,0)

  const initDate = value ? new Date(value + 'T12:00') : today
  const [view, setView]   = useState({ year: initDate.getFullYear(), month: initDate.getMonth() })

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const firstDay    = new Date(view.year, view.month, 1).getDay()
  const daysInMonth = new Date(view.year, view.month + 1, 0).getDate()
  const minD        = minDate ? new Date(minDate + 'T12:00') : today

  function prevMonth() {
    setView(v => v.month === 0 ? { year: v.year - 1, month: 11 } : { ...v, month: v.month - 1 })
  }
  function nextMonth() {
    setView(v => v.month === 11 ? { year: v.year + 1, month: 0 } : { ...v, month: v.month + 1 })
  }

  function selectDay(day: number) {
    const d = new Date(view.year, view.month, day)
    if (d < minD) return
    const yyyy = d.getFullYear()
    const mm   = String(d.getMonth() + 1).padStart(2, '0')
    const dd   = String(d.getDate()).padStart(2, '0')
    onChange(`${yyyy}-${mm}-${dd}`)
    setOpen(false)
  }

  function formatDisplay(val: string): string {
    if (!val) return placeholder
    const d = new Date(val + 'T12:00')
    return d.toLocaleDateString('es-DO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
      .replace(/^\w/, c => c.toUpperCase())
  }

  const selectedDay  = value ? new Date(value + 'T12:00').getDate() : null
  const selectedMonth = value ? new Date(value + 'T12:00').getMonth() : null
  const selectedYear  = value ? new Date(value + 'T12:00').getFullYear() : null

  return (
    <div className="relative" ref={ref}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-4 rounded-2xl text-left transition-all"
        style={{
          background: 'var(--bg-surface)',
          border: `1.5px solid ${open ? 'var(--brand)' : 'var(--border-medium)'}`,
          boxShadow: open ? '0 0 0 3px var(--brand-dim)' : 'none',
        }}>
        <CalendarDays size={18} style={{ color: value ? 'var(--brand)' : 'var(--text-muted)', flexShrink: 0 }} />
        <span className={cn('flex-1 text-sm font-medium')}
          style={{ color: value ? 'var(--text-primary)' : 'var(--text-muted)' }}>
          {formatDisplay(value)}
        </span>
        <ChevronRight size={15} className={cn('transition-transform shrink-0', open && 'rotate-90')}
          style={{ color: 'var(--text-muted)' }} />
      </button>

      {/* Calendar dropdown */}
      {open && (
        <div className="absolute left-0 right-0 mt-2 rounded-2xl overflow-hidden"
          style={{
            background: '#fff',
            border: '1px solid var(--border-medium)',
            boxShadow: '0 16px 48px rgba(0,0,0,0.18)',
            zIndex: 9999,
          }}>
          {/* Month nav */}
          <div className="flex items-center justify-between px-4 py-3"
            style={{ borderBottom: '1px solid var(--border-subtle)' }}>
            <button onClick={prevMonth}
              className="w-8 h-8 rounded-xl flex items-center justify-center transition-colors hover:bg-gray-100"
              style={{ color: 'var(--text-secondary)' }}>
              <ChevronLeft size={16} />
            </button>
            <span className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
              {MONTHS[view.month]} {view.year}
            </span>
            <button onClick={nextMonth}
              className="w-8 h-8 rounded-xl flex items-center justify-center transition-colors hover:bg-gray-100"
              style={{ color: 'var(--text-secondary)' }}>
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 px-3 py-2">
            {DAYS_HEADER.map(d => (
              <div key={d} className="text-center text-xs font-semibold py-1"
                style={{ color: 'var(--text-muted)' }}>{d}</div>
            ))}
          </div>

          {/* Days */}
          <div className="grid grid-cols-7 px-3 pb-3 gap-y-1">
            {Array(firstDay).fill(null).map((_, i) => <div key={`e${i}`} />)}
            {Array(daysInMonth).fill(null).map((_, i) => {
              const day     = i + 1
              const date    = new Date(view.year, view.month, day)
              const isToday = date.getTime() === today.getTime()
              const isPast  = date < minD
              const isSel   = day === selectedDay && view.month === selectedMonth && view.year === selectedYear

              return (
                <button key={day}
                  onClick={() => selectDay(day)}
                  disabled={isPast}
                  className={cn('aspect-square rounded-xl text-sm font-medium transition-all flex items-center justify-center')}
                  style={isSel ? {
                    background: 'var(--brand)',
                    color: '#fff',
                    fontWeight: 700,
                  } : isToday ? {
                    background: 'var(--brand-dim)',
                    color: 'var(--brand)',
                    fontWeight: 700,
                  } : isPast ? {
                    color: 'var(--border-medium)',
                    cursor: 'not-allowed',
                  } : {
                    color: 'var(--text-primary)',
                  }}
                  onMouseEnter={e => { if (!isSel && !isPast) (e.currentTarget as HTMLElement).style.background = 'var(--bg-elevated)' }}
                  onMouseLeave={e => { if (!isSel && !isPast) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                >
                  {day}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
