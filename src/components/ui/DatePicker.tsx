'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react'
import { cn } from '@/lib/utils'

const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const DAYS_HEADER = ['Do','Lu','Ma','Mi','Ju','Vi','Sa']

interface Props {
  value:       string
  onChange:    (v: string) => void
  minDate?:    string
  placeholder?: string
}

export default function DatePicker({ value, onChange, minDate, placeholder = 'Seleccionar fecha' }: Props) {
  const [open, setOpen]   = useState(false)
  const [calPos, setCalPos] = useState({ top: 0, left: 0, width: 0 })
  const triggerRef          = useRef<HTMLButtonElement>(null)

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const minD  = minDate ? new Date(minDate + 'T12:00') : today

  const initDate = value ? new Date(value + 'T12:00') : today
  const [view, setView] = useState({ year: initDate.getFullYear(), month: initDate.getMonth() })

  const firstDay    = new Date(view.year, view.month, 1).getDay()
  const daysInMonth = new Date(view.year, view.month + 1, 0).getDate()

  const prevMonth = useCallback(() =>
    setView(v => v.month === 0 ? { year: v.year - 1, month: 11 } : { ...v, month: v.month - 1 }), [])
  const nextMonth = useCallback(() =>
    setView(v => v.month === 11 ? { year: v.year + 1, month: 0 } : { ...v, month: v.month + 1 }), [])

  function openCal() {
    if (!triggerRef.current) return
    const r   = triggerRef.current.getBoundingClientRect()
    const w   = Math.max(r.width, 300)
    const left = Math.min(r.left, window.innerWidth - w - 8)
    setCalPos({ top: r.bottom + 6, left, width: w })
    setOpen(true)
  }

  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent) {
      if (triggerRef.current?.contains(e.target as Node)) return
      const cal = document.getElementById('dp-calendar')
      if (cal?.contains(e.target as Node)) return
      setOpen(false)
    }
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setOpen(false) }
    function onScroll() { setOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', onScroll)
    }
  }, [open])

  function selectDay(day: number) {
    const d    = new Date(view.year, view.month, day)
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

  const selD  = value ? new Date(value + 'T12:00') : null
  const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`

  return (
    <>
      {/* Trigger */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => open ? setOpen(false) : openCal()}
        className="w-full flex items-center gap-3 px-4 py-4 rounded-2xl text-left transition-all"
        style={{
          background: 'var(--bg-surface)',
          border: `1.5px solid ${open ? 'var(--brand)' : 'var(--border-medium)'}`,
          boxShadow: open ? '0 0 0 3px var(--brand-dim)' : 'none',
        }}
      >
        <CalendarDays size={18} style={{ color: value ? 'var(--brand)' : 'var(--text-muted)', flexShrink: 0 }} />
        <span className={cn('flex-1 text-sm font-medium')}
          style={{ color: value ? 'var(--text-primary)' : 'var(--text-muted)' }}>
          {formatDisplay(value)}
        </span>
        <ChevronRight size={15}
          className={cn('transition-transform shrink-0', open && 'rotate-90')}
          style={{ color: 'var(--text-muted)' }} />
      </button>

      {/* Calendar — position:fixed para escapar cualquier overflow:hidden */}
      {open && (
        <div
          id="dp-calendar"
          style={{
            position: 'fixed',
            top:      calPos.top,
            left:     calPos.left,
            width:    calPos.width,
            background: '#fff',
            border: '1px solid var(--border-medium)',
            borderRadius: 16,
            boxShadow: '0 16px 48px rgba(0,0,0,0.18)',
            zIndex: 9999,
            overflow: 'hidden',
          }}
        >
          {/* Month nav */}
          <div className="flex items-center justify-between px-4 py-3"
            style={{ borderBottom: '1px solid var(--border-subtle)' }}>
            <button type="button" onClick={prevMonth}
              className="w-8 h-8 rounded-xl flex items-center justify-center transition-colors hover:bg-gray-100"
              style={{ color: 'var(--text-secondary)' }}>
              <ChevronLeft size={16} />
            </button>
            <span className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
              {MONTHS[view.month]} {view.year}
            </span>
            <button type="button" onClick={nextMonth}
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
              const day  = i + 1
              const dYMD = `${view.year}-${String(view.month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`
              const date = new Date(view.year, view.month, day)
              const isToday = dYMD === todayStr
              const isPast  = date < minD
              const isSel   = selD
                ? date.getFullYear() === selD.getFullYear() &&
                  date.getMonth()    === selD.getMonth()    &&
                  date.getDate()     === selD.getDate()
                : false

              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => selectDay(day)}
                  disabled={isPast}
                  className={cn('aspect-square rounded-xl text-sm font-medium transition-all flex items-center justify-center')}
                  style={
                    isSel   ? { background: 'var(--brand)', color: '#fff', fontWeight: 700 } :
                    isToday ? { background: 'var(--brand-dim)', color: 'var(--brand)', fontWeight: 700 } :
                    isPast  ? { color: 'var(--border-medium)', cursor: 'not-allowed' } :
                              { color: 'var(--text-primary)' }
                  }
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
    </>
  )
}
