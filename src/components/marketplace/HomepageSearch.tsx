'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { CalendarDays, MapPin, X, ChevronLeft, ChevronRight, Search } from 'lucide-react'

// ── Actividades ────────────────────────────────────────────
const ACTIVITIES = [
  { key: 'cumpleanos',         label: 'Cumpleaños' },
  { key: 'boda',               label: 'Boda' },
  { key: 'quinceanera',        label: 'Quinceañera' },
  { key: 'graduacion',         label: 'Graduación' },
  { key: 'baby-shower',        label: 'Baby Shower' },
  { key: 'celebracion',        label: 'Celebración' },
  { key: 'evento-corporativo', label: 'Corporativo' },
  { key: 'networking',         label: 'Networking' },
  { key: 'lanzamiento',        label: 'Lanzamiento' },
  { key: 'taller',             label: 'Taller' },
  { key: 'sesion-fotos',       label: 'Sesión de fotos' },
  { key: 'rodaje',             label: 'Rodaje' },
  { key: 'reunion-trabajo',    label: 'Reunión de trabajo' },
  { key: 'coworking',          label: 'Coworking' },
]

// ── Sectores de Santo Domingo y otras ciudades ─────────────
const SECTORS = [
  'Piantini', 'Naco', 'Bella Vista', 'Evaristo Morales',
  'Arroyo Hondo', 'Gazcue', 'Zona Colonial', 'Los Prados',
  'Serrallés', 'Esperilla', 'Los Cacicazgos', 'Mirador Norte',
  'Ciudad Nueva', 'La Julia', 'Paraíso', 'Renacimiento',
  'Fernández', 'La Castellana', 'Urbanización Real',
  'Santiago', 'La Romana', 'Boca Chica', 'Juan Dolio',
  'Punta Cana', 'Las Terrenas', 'Puerto Plata',
]

const MONTHS = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre',
]
const DAYS = ['Do','Lu','Ma','Mi','Ju','Vi','Sa']

type Panel = 'activity' | 'city' | 'date' | null

function toYMD(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}
function fmtDate(v: string) {
  return new Date(v + 'T12:00').toLocaleDateString('es-DO', { day: 'numeric', month: 'long', year: 'numeric' })
}
function getRect(el: HTMLElement | null): DOMRect | null {
  return el ? el.getBoundingClientRect() : null
}

export default function HomepageSearch() {
  const router = useRouter()

  const [activity, setActivity] = useState('')
  const [actQ,     setActQ]     = useState('')
  const [city,     setCity]     = useState('')
  const [cityQ,    setCityQ]    = useState('')
  const [dateFrom, setDateFrom] = useState('')

  const [panel, setPanel]       = useState<Panel>(null)
  const [panelPos, setPanelPos] = useState({ top: 0, left: 0 })

  const actRef  = useRef<HTMLDivElement>(null)
  const cityRef = useRef<HTMLDivElement>(null)
  const dateRef = useRef<HTMLButtonElement>(null)

  // Calendario
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayYMD = toYMD(today)
  const [view, setView] = useState({ year: today.getFullYear(), month: today.getMonth() })
  const firstDay    = new Date(view.year, view.month, 1).getDay()
  const daysInMonth = new Date(view.year, view.month + 1, 0).getDate()
  const prevMonth   = useCallback(() => setView(v => v.month === 0 ? { year: v.year-1, month: 11 } : { ...v, month: v.month-1 }), [])
  const nextMonth   = useCallback(() => setView(v => v.month === 11 ? { year: v.year+1, month: 0 } : { ...v, month: v.month+1 }), [])

  // Actividades filtradas por lo que escribió el usuario
  const filteredActivities = ACTIVITIES.filter(a =>
    !actQ || a.label.toLowerCase().includes(actQ.toLowerCase())
  )

  // Sectores filtrados por lo que escribió el usuario
  const filteredSectors = SECTORS.filter(s =>
    !cityQ || s.toLowerCase().includes(cityQ.toLowerCase())
  )

  function openPanel(p: Panel, el: HTMLElement | null, width: number) {
    if (panel === p) { setPanel(null); return }
    const r = getRect(el)
    if (r) {
      const left = Math.min(Math.max(r.left, 12), window.innerWidth - width - 12)
      setPanelPos({ top: r.bottom + 8, left })
    }
    setPanel(p)
  }

  // Cerrar al click afuera, scroll o Escape
  useEffect(() => {
    if (!panel) return
    function onDown(e: MouseEvent) {
      const t = e.target as Node
      if (
        actRef.current?.contains(t) ||
        cityRef.current?.contains(t) ||
        dateRef.current?.contains(t)
      ) return
      const panels = document.querySelectorAll('[data-ep-panel]')
      for (const el of panels) if (el.contains(t)) return
      setPanel(null)
    }
    function onScroll() { setPanel(null) }
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setPanel(null) }
    document.addEventListener('mousedown', onDown)
    window.addEventListener('scroll', onScroll, { passive: true })
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      window.removeEventListener('scroll', onScroll)
      document.removeEventListener('keydown', onKey)
    }
  }, [panel])

  function pickActivity(key: string, label: string) {
    setActivity(key)
    setActQ(label)
    setPanel(null)
  }

  function pickCity(s: string) {
    setCity(s)
    setCityQ(s)
    setPanel(null)
  }

  function pickDay(day: number) {
    const dYMD = `${view.year}-${String(view.month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`
    if (dYMD < todayYMD) return
    setDateFrom(dYMD)
    setPanel(null)
  }

  function search() {
    const p = new URLSearchParams()
    if (activity) p.set('activity', activity)
    if (city)     p.set('sector',   city)
    if (dateFrom) p.set('dateFrom', dateFrom)
    router.push(`/buscar${p.toString() ? '?' + p.toString() : ''}`)
  }

  const dropBase: React.CSSProperties = {
    position: 'fixed',
    top: panelPos.top,
    left: panelPos.left,
    background: '#fff',
    border: '1px solid #E5E7EB',
    borderRadius: 14,
    boxShadow: '0 12px 40px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.05)',
    zIndex: 9998,
    overflow: 'hidden',
  }

  return (
    <>
      <style>{`
        @keyframes dropIn {
          from { opacity: 0; transform: translateY(-5px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .ep-drop { animation: dropIn 0.15s ease-out forwards; }

        @media (max-width: 767px) {
          .ep-bar    { flex-direction: column !important; }
          .ep-div    { display: none !important; }
          .ep-seg    { width: 100% !important; border-bottom: 1px solid #E5E7EB !important; }
          .ep-seg:last-of-type { border-bottom: none !important; }
          .ep-submit { border-radius: 0 0 16px 16px !important; padding: 14px !important; justify-content: center; }
          .ep-drop   { left: 12px !important; right: 12px !important; width: auto !important; animation: none !important; }
        }
      `}</style>

      <div className="max-w-3xl mx-auto">

        {/* ── Barra principal ── */}
        <div
          className="ep-bar flex items-stretch rounded-2xl"
          style={{ background: '#fff', boxShadow: '0 20px 60px rgba(0,0,0,0.28)', overflow: 'hidden' }}
        >

          {/* 1. Actividad */}
          <div
            ref={actRef}
            className="ep-seg flex items-center gap-3 px-5"
            style={{
              width: 210,
              minHeight: 64,
              background: panel === 'activity' ? 'rgba(53,196,147,0.04)' : 'transparent',
              transition: 'background 0.15s',
            }}
          >
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold uppercase tracking-wide mb-0.5" style={{ color: '#9CA3AF' }}>
                Actividad
              </div>
              <input
                value={actQ}
                onChange={e => {
                  setActQ(e.target.value)
                  setActivity('')
                  if (panel !== 'activity') openPanel('activity', actRef.current, 260)
                }}
                onFocus={() => { if (panel !== 'activity') openPanel('activity', actRef.current, 260) }}
                placeholder="Cualquier evento"
                className="w-full bg-transparent text-sm focus:outline-none"
                style={{ color: '#111827', fontWeight: activity ? 500 : 400 }}
              />
            </div>
            {(activity || actQ) && (
              <span
                role="button"
                onClick={() => { setActivity(''); setActQ('') }}
                className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 cursor-pointer"
                style={{ background: '#F3F4F6' }}
              >
                <X size={10} strokeWidth={2.5} style={{ color: '#6B7280' }} />
              </span>
            )}
          </div>

          <div className="ep-div w-px my-4" style={{ background: '#E5E7EB' }} />

          {/* 2. Ciudad / Sector */}
          <div
            ref={cityRef}
            className="ep-seg flex items-center gap-3 flex-1 px-5"
            style={{ minHeight: 64 }}
          >
            <MapPin size={15} style={{ color: city ? '#35C493' : '#9CA3AF', flexShrink: 0 }} />
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold uppercase tracking-wide mb-0.5" style={{ color: '#9CA3AF' }}>
                Sector / Ciudad
              </div>
              <input
                value={cityQ}
                onChange={e => {
                  setCityQ(e.target.value)
                  setCity('')
                  if (panel !== 'city') openPanel('city', cityRef.current, 280)
                }}
                onFocus={() => { if (panel !== 'city') openPanel('city', cityRef.current, 280) }}
                placeholder="¿Dónde?"
                className="w-full bg-transparent text-sm focus:outline-none"
                style={{ color: '#111827', fontWeight: city ? 500 : 400 }}
              />
            </div>
            {(city || cityQ) && (
              <span
                role="button"
                onClick={() => { setCity(''); setCityQ('') }}
                className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 cursor-pointer"
                style={{ background: '#F3F4F6' }}
              >
                <X size={10} strokeWidth={2.5} style={{ color: '#6B7280' }} />
              </span>
            )}
          </div>

          <div className="ep-div w-px my-4" style={{ background: '#E5E7EB' }} />

          {/* 3. Fecha */}
          <button
            ref={dateRef}
            type="button"
            onClick={() => openPanel('date', dateRef.current, 308)}
            className="ep-seg flex items-center gap-3 px-5 text-left focus:outline-none"
            style={{
              width: 192,
              background: panel === 'date' ? 'rgba(53,196,147,0.04)' : 'transparent',
              transition: 'background 0.15s',
            }}
          >
            <CalendarDays size={15} style={{ color: dateFrom ? '#35C493' : '#9CA3AF', flexShrink: 0 }} />
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold uppercase tracking-wide mb-0.5" style={{ color: '#9CA3AF' }}>
                Fecha
              </div>
              <div
                className="text-sm truncate"
                style={{ color: dateFrom ? '#111827' : '#9CA3AF', fontWeight: dateFrom ? 500 : 400 }}
              >
                {dateFrom ? fmtDate(dateFrom) : '¿Cuándo?'}
              </div>
            </div>
            {dateFrom && (
              <span
                role="button"
                onClick={e => { e.stopPropagation(); setDateFrom('') }}
                className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 cursor-pointer"
                style={{ background: '#F3F4F6' }}
              >
                <X size={10} strokeWidth={2.5} style={{ color: '#6B7280' }} />
              </span>
            )}
          </button>

          {/* Buscar */}
          <button
            type="button"
            onClick={search}
            className="ep-submit flex items-center gap-2 px-7 text-sm font-bold text-white shrink-0 transition-opacity hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #35C493, #28A87C)', borderRadius: '0 16px 16px 0' }}
          >
            <Search size={15} />
            Buscar
          </button>
        </div>

      </div>

      {/* ══════════════════════════════════════════════════════
          DROPDOWNS — position:fixed para escapar overflow:hidden
          ══════════════════════════════════════════════════════ */}

      {/* Actividad */}
      {panel === 'activity' && filteredActivities.length > 0 && (
        <div data-ep-panel className="ep-drop" style={{ ...dropBase, width: 260 }}>
          <div className="py-1.5" style={{ maxHeight: 280, overflowY: 'auto' }}>
            {filteredActivities.map(act => (
              <button
                key={act.key}
                type="button"
                onClick={() => pickActivity(act.key, act.label)}
                className="w-full text-left px-4 py-2.5 text-sm flex items-center justify-between"
                style={{ color: activity === act.key ? '#35C493' : '#374151', fontWeight: activity === act.key ? 600 : 400, background: 'transparent' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#F9FAFB' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
              >
                {act.label}
                {activity === act.key && (
                  <span style={{ color: '#35C493', fontSize: 12 }}>✓</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Ciudad / Sector */}
      {panel === 'city' && filteredSectors.length > 0 && (
        <div data-ep-panel className="ep-drop" style={{ ...dropBase, width: 280 }}>
          <div className="py-1.5" style={{ maxHeight: 260, overflowY: 'auto' }}>
            {filteredSectors.map(s => (
              <button
                key={s}
                type="button"
                onClick={() => pickCity(s)}
                className="w-full text-left px-4 py-2.5 text-sm flex items-center gap-2.5"
                style={{ color: city === s ? '#35C493' : '#374151', fontWeight: city === s ? 600 : 400, background: 'transparent' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#F9FAFB' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
              >
                <MapPin size={12} style={{ color: city === s ? '#35C493' : '#9CA3AF', flexShrink: 0 }} />
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Fecha */}
      {panel === 'date' && (
        <div data-ep-panel className="ep-drop" style={{ ...dropBase, width: 308 }}>

          <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid #F3F4F6' }}>
            <button type="button" onClick={prevMonth}
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-gray-100"
              style={{ color: '#6B7280' }}>
              <ChevronLeft size={15} />
            </button>
            <span className="text-sm font-semibold" style={{ color: '#111827' }}>
              {MONTHS[view.month]} {view.year}
            </span>
            <button type="button" onClick={nextMonth}
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-gray-100"
              style={{ color: '#6B7280' }}>
              <ChevronRight size={15} />
            </button>
          </div>

          <div className="grid grid-cols-7 px-3 pt-3 pb-1">
            {DAYS.map(d => (
              <div key={d} className="text-center text-xs font-semibold py-1" style={{ color: '#9CA3AF' }}>{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 px-3 pb-3 gap-y-0.5">
            {Array(firstDay).fill(null).map((_, i) => <div key={`e${i}`} />)}
            {Array(daysInMonth).fill(null).map((_, i) => {
              const day  = i + 1
              const dYMD = `${view.year}-${String(view.month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`
              const isPast  = dYMD < todayYMD
              const isToday = dYMD === todayYMD
              const isSel   = dYMD === dateFrom
              return (
                <button
                  key={day} type="button" disabled={isPast}
                  onClick={() => pickDay(day)}
                  className="aspect-square rounded-lg text-sm transition-all flex items-center justify-center"
                  style={
                    isSel   ? { background: '#35C493', color: '#fff', fontWeight: 700 } :
                    isToday ? { background: 'rgba(53,196,147,0.1)', color: '#35C493', fontWeight: 600 } :
                    isPast  ? { color: '#D1D5DB', cursor: 'not-allowed' } :
                              { color: '#374151' }
                  }
                  onMouseEnter={e => { if (!isSel && !isPast) (e.currentTarget as HTMLElement).style.background = '#F5F5F5' }}
                  onMouseLeave={e => { if (!isSel && !isPast) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                >
                  {day}
                </button>
              )
            })}
          </div>

          {dateFrom && (
            <div className="px-4 py-2.5 flex items-center justify-between" style={{ borderTop: '1px solid #F3F4F6' }}>
              <span className="text-xs" style={{ color: '#6B7280' }}>{fmtDate(dateFrom)}</span>
              <button type="button" onClick={() => { setDateFrom(''); setPanel(null) }}
                className="text-xs font-medium transition-colors hover:text-gray-900" style={{ color: '#9CA3AF' }}>
                Limpiar
              </button>
            </div>
          )}
        </div>
      )}
    </>
  )
}
