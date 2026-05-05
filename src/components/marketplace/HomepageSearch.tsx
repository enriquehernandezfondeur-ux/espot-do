'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Search, MapPin, CalendarDays, X, ChevronLeft, ChevronRight } from 'lucide-react'
import Link from 'next/link'

const MONTHS = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre',
]
const DAY_LABELS = ['Do','Lu','Ma','Mi','Ju','Vi','Sa']
const QUICK_SECTORS = ['Piantini','Naco','Bella Vista','Arroyo Hondo','Santiago']

function toYMD(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

function formatDisplay(val: string): string {
  const d = new Date(val + 'T12:00')
  return d.toLocaleDateString('es-DO', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default function HomepageSearch() {
  const router = useRouter()
  const [q, setQ]           = useState('')
  const [sector, setSector] = useState('')
  const [dateFrom, setDate] = useState('')
  const [calOpen, setCalOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayYMD = toYMD(today)

  const [view, setView] = useState({ year: today.getFullYear(), month: today.getMonth() })

  const firstDay    = new Date(view.year, view.month, 1).getDay()
  const daysInMonth = new Date(view.year, view.month + 1, 0).getDate()

  const prevMonth = useCallback(() =>
    setView(v => v.month === 0 ? { year: v.year - 1, month: 11 } : { ...v, month: v.month - 1 }), [])
  const nextMonth = useCallback(() =>
    setView(v => v.month === 11 ? { year: v.year + 1, month: 0 } : { ...v, month: v.month + 1 }), [])

  // Cerrar calendario al hacer click afuera
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setCalOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Cerrar con Escape
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key === 'Escape') setCalOpen(false)
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  function selectDay(day: number) {
    const dYMD = `${view.year}-${String(view.month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`
    if (dYMD < todayYMD) return
    setDate(dYMD)
    setCalOpen(false)
  }

  function clearDate(e: React.MouseEvent) {
    e.stopPropagation()
    setDate('')
  }

  function search() {
    const p = new URLSearchParams()
    if (q.trim())      p.set('q', q.trim())
    if (sector.trim()) p.set('sector', sector.trim())
    if (dateFrom)      p.set('dateFrom', dateFrom)
    router.push(`/buscar${p.toString() ? '?' + p.toString() : ''}`)
  }

  function onKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter') search()
  }

  return (
    <>
      <style>{`
        @keyframes calIn {
          from { opacity: 0; transform: translateX(-50%) translateY(-8px) scale(0.97); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0)      scale(1);    }
        }
        .espot-cal { animation: calIn 0.18s cubic-bezier(0.16,1,0.3,1) forwards; }

        @media (max-width: 767px) {
          .espot-searchbar { flex-direction: column !important; }
          .espot-divider   { display: none !important; }
          .espot-segment   { width: 100% !important; border-bottom: 1px solid #E8ECF0; }
          .espot-segment:last-child { border-bottom: none !important; }
          .espot-date-trigger { width: 100% !important; }
          .espot-submit    { border-radius: 0 0 16px 16px !important; padding: 16px 24px !important; justify-content: center; }
          .espot-cal {
            animation: none !important;
            position: fixed !important;
            left: 12px !important; right: 12px !important;
            bottom: 16px !important; top: auto !important;
            transform: none !important;
            width: auto !important;
            border-radius: 24px !important;
          }
          .espot-cal-day { min-height: 44px !important; font-size: 15px !important; border-radius: 12px !important; }
        }
      `}</style>

      <div className="relative max-w-4xl mx-auto" ref={containerRef}>

        {/* Barra de búsqueda */}
        <div
          className="espot-searchbar flex items-stretch rounded-2xl"
          style={{ background: '#fff', boxShadow: '0 20px 60px rgba(0,0,0,0.3)', overflow: 'hidden' }}
        >
          {/* Qué buscas */}
          <div className="espot-segment flex items-center gap-3 flex-1 px-5">
            <Search size={18} style={{ color: '#9CA3AF', flexShrink: 0 }} />
            <input
              value={q}
              onChange={e => setQ(e.target.value)}
              onKeyDown={onKey}
              placeholder="Salón, rooftop, restaurante..."
              className="flex-1 bg-transparent py-5 text-sm focus:outline-none"
              style={{ color: '#0F1623' }}
            />
          </div>

          <div className="espot-divider w-px my-3" style={{ background: '#E8ECF0' }} />

          {/* Sector */}
          <div className="espot-segment flex items-center gap-2 px-4" style={{ width: 168 }}>
            <MapPin size={15} style={{ color: '#9CA3AF', flexShrink: 0 }} />
            <input
              value={sector}
              onChange={e => setSector(e.target.value)}
              onKeyDown={onKey}
              placeholder="Sector"
              className="w-full bg-transparent py-5 text-sm focus:outline-none"
              style={{ color: '#0F1623' }}
            />
          </div>

          <div className="espot-divider w-px my-3" style={{ background: '#E8ECF0' }} />

          {/* Fecha — trigger del calendario */}
          <button
            type="button"
            onClick={() => setCalOpen(o => !o)}
            className="espot-date-trigger espot-segment flex items-center gap-2.5 px-5 text-left transition-colors focus:outline-none"
            style={{
              width: 200,
              background: calOpen ? 'rgba(53,196,147,0.04)' : 'transparent',
              cursor: 'pointer',
            }}
          >
            <CalendarDays
              size={15}
              style={{ color: dateFrom ? '#35C493' : '#9CA3AF', flexShrink: 0 }}
            />
            <span
              className="flex-1 text-sm"
              style={{
                color: dateFrom ? '#0F1623' : '#9CA3AF',
                fontWeight: dateFrom ? 500 : 400,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {dateFrom ? formatDisplay(dateFrom) : '¿Cuándo?'}
            </span>
            {dateFrom ? (
              <span
                role="button"
                onClick={clearDate}
                className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 cursor-pointer transition-colors"
                style={{ background: '#F3F4F6', color: '#6B7280' }}
                onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = '#E5E7EB')}
                onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = '#F3F4F6')}
              >
                <X size={10} strokeWidth={2.5} />
              </span>
            ) : (
              <ChevronRight
                size={13}
                style={{
                  color: '#9CA3AF',
                  flexShrink: 0,
                  transition: 'transform 0.2s ease',
                  transform: calOpen ? 'rotate(90deg)' : 'rotate(0deg)',
                }}
              />
            )}
          </button>

          {/* Botón buscar */}
          <button
            type="button"
            onClick={search}
            className="espot-submit flex items-center gap-2 px-8 text-sm font-bold text-white transition-opacity hover:opacity-90 shrink-0"
            style={{
              background: 'linear-gradient(135deg, #35C493, #28A87C)',
              borderRadius: '0 16px 16px 0',
            }}
          >
            Buscar
          </button>
        </div>

        {/* Calendario */}
        {calOpen && (
          <>
            {/* Backdrop móvil */}
            <div
              className="fixed inset-0 md:hidden"
              style={{ background: 'rgba(0,0,0,0.35)', zIndex: 9997 }}
              onClick={() => setCalOpen(false)}
            />

            <div
              className="espot-cal absolute mt-3"
              style={{
                left: '50%',
                transform: 'translateX(-50%)',
                width: 364,
                background: '#fff',
                border: '1px solid #E8ECF0',
                borderRadius: 20,
                boxShadow: '0 24px 64px rgba(0,0,0,0.15), 0 4px 20px rgba(0,0,0,0.08)',
                zIndex: 9998,
                overflow: 'hidden',
              }}
            >
              {/* Encabezado mes */}
              <div
                className="flex items-center justify-between px-5 py-4"
                style={{ borderBottom: '1px solid #F3F4F6' }}
              >
                <button
                  type="button"
                  onClick={prevMonth}
                  className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors hover:bg-gray-100"
                  style={{ color: '#6B7280' }}
                >
                  <ChevronLeft size={17} />
                </button>
                <span className="font-bold text-base tracking-tight" style={{ color: '#0F1623' }}>
                  {MONTHS[view.month]} {view.year}
                </span>
                <button
                  type="button"
                  onClick={nextMonth}
                  className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors hover:bg-gray-100"
                  style={{ color: '#6B7280' }}
                >
                  <ChevronRight size={17} />
                </button>
              </div>

              {/* Cabecera días */}
              <div className="grid grid-cols-7 px-5 pt-4 pb-2">
                {DAY_LABELS.map(d => (
                  <div key={d} className="text-center text-xs font-semibold" style={{ color: '#9CA3AF' }}>
                    {d}
                  </div>
                ))}
              </div>

              {/* Grid de días */}
              <div className="grid grid-cols-7 px-5 pb-4 gap-y-1">
                {Array(firstDay).fill(null).map((_, i) => <div key={`e${i}`} />)}
                {Array(daysInMonth).fill(null).map((_, i) => {
                  const day  = i + 1
                  const dYMD = `${view.year}-${String(view.month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`
                  const isPast  = dYMD < todayYMD
                  const isToday = dYMD === todayYMD
                  const isSel   = dYMD === dateFrom

                  return (
                    <button
                      key={day}
                      type="button"
                      disabled={isPast}
                      onClick={() => selectDay(day)}
                      className="espot-cal-day aspect-square rounded-xl text-sm font-medium transition-all flex items-center justify-center"
                      style={
                        isSel   ? { background: '#35C493', color: '#fff', fontWeight: 700 } :
                        isToday ? { background: 'rgba(53,196,147,0.12)', color: '#35C493', fontWeight: 600 } :
                        isPast  ? { color: '#D1D5DB', cursor: 'not-allowed' } :
                                  { color: '#0F1623' }
                      }
                      onMouseEnter={e => { if (!isSel && !isPast) (e.currentTarget as HTMLElement).style.background = '#F9FAFB' }}
                      onMouseLeave={e => { if (!isSel && !isPast) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                    >
                      {day}
                    </button>
                  )
                })}
              </div>

              {/* Footer */}
              <div
                className="px-5 py-3 flex items-center justify-between"
                style={{ borderTop: '1px solid #F3F4F6' }}
              >
                <span className="text-xs" style={{ color: '#9CA3AF' }}>
                  {dateFrom
                    ? `Filtrando por ${formatDisplay(dateFrom)}`
                    : 'Selecciona una fecha para filtrar disponibilidad'}
                </span>
                {dateFrom && (
                  <button
                    type="button"
                    onClick={() => { setDate(''); setCalOpen(false) }}
                    className="text-xs font-medium ml-3 shrink-0 transition-colors hover:text-gray-900"
                    style={{ color: '#6B7280' }}
                  >
                    Limpiar
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Quick sectors */}
      <div className="flex items-center justify-center gap-2 mt-5 flex-wrap">
        {QUICK_SECTORS.map(s => (
          <Link
            key={s}
            href={`/buscar?sector=${s}`}
            className="text-xs px-3.5 py-1.5 rounded-full transition-all"
            style={{
              background: 'rgba(255,255,255,0.08)',
              color: 'rgba(255,255,255,0.6)',
              border: '1px solid rgba(255,255,255,0.12)',
            }}
          >
            {s}
          </Link>
        ))}
      </div>
    </>
  )
}
