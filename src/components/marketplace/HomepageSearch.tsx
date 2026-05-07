'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { CalendarDays, MapPin, X, ChevronLeft, ChevronRight, Search, ChevronDown } from 'lucide-react'

const ACTIVITIES = [
  { key: 'cumpleanos',         label: 'Cumpleaños' },
  { key: 'boda',               label: 'Boda' },
  { key: 'quinceanera',        label: 'Quinceañera' },
  { key: 'graduacion',         label: 'Graduación' },
  { key: 'baby-shower',        label: 'Baby Shower' },
  { key: 'celebracion',        label: 'Celebración' },
  { key: 'karaoke',            label: 'Karaoke' },
  { key: 'cena',               label: 'Cena / Comida' },
  { key: 'despedida',          label: 'Despedida' },
  { key: 'evento-corporativo', label: 'Corporativo' },
  { key: 'networking',         label: 'Networking' },
  { key: 'lanzamiento',        label: 'Lanzamiento' },
  { key: 'taller',             label: 'Taller' },
  { key: 'sesion-fotos',       label: 'Sesión de fotos' },
  { key: 'rodaje',             label: 'Rodaje' },
  { key: 'reunion-trabajo',    label: 'Reunión de trabajo' },
  { key: 'coworking',          label: 'Coworking' },
]

const SECTORS = [
  // ── Santo Domingo (sectores) ──
  'Piantini', 'Naco', 'Bella Vista', 'Evaristo Morales',
  'Arroyo Hondo', 'Gazcue', 'Zona Colonial', 'Los Prados',
  'Serrallés', 'Esperilla', 'Los Cacicazgos', 'Mirador Norte',
  'Ciudad Nueva', 'La Julia', 'Paraíso', 'Renacimiento',
  'Fernández', 'La Castellana', 'Urbanización Real',
  'Miraflores', 'Alma Rosa', 'Ensanche Ozama', 'Los Mameyes',
  'Mirador Sur', 'Los Ríos', 'Jardines del Sur', 'El Millón',
  'Santo Domingo Este', 'Santo Domingo Norte', 'Santo Domingo Oeste',
  // ── Otras ciudades ──
  'Santiago', 'Puerto Plata', 'La Romana', 'Punta Cana',
  'Boca Chica', 'Juan Dolio', 'Las Terrenas', 'Samaná',
  'Higüey', 'San Pedro de Macorís', 'San Cristóbal',
  'La Vega', 'Jarabacoa', 'Constanza',
  'Sosúa', 'Cabarete', 'Cotuí', 'Moca',
  'Cap Cana', 'Bayahíbe', 'Cabrera',
  'Bonao', 'Nagua', 'Monte Cristi',
]

const MONTHS = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre',
]
const DAYS = ['Do','Lu','Ma','Mi','Ju','Vi','Sa']

type Panel = 'activity' | 'city' | 'date' | null
type MobileModal = 'activity' | 'city' | 'date' | null

function toYMD(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}
function fmtDate(v: string) {
  return new Date(v + 'T12:00').toLocaleDateString('es-DO', { day: 'numeric', month: 'long', year: 'numeric' })
}
function fmtDateShort(v: string) {
  return new Date(v + 'T12:00').toLocaleDateString('es-DO', { day: 'numeric', month: 'short' })
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

  // Desktop: dropdown panels
  const [panel, setPanel]       = useState<Panel>(null)
  const [panelPos, setPanelPos] = useState({ top: 0, left: 0 })

  // Mobile: modal sheets
  const [mobileModal, setMobileModal] = useState<MobileModal>(null)

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

  const filteredActivities = ACTIVITIES.filter(a =>
    !actQ || a.label.toLowerCase().includes(actQ.toLowerCase())
  )
  const filteredSectors = SECTORS.filter(s =>
    !cityQ || s.toLowerCase().includes(cityQ.toLowerCase())
  )

  // Detectar si es móvil
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // Bloquear scroll cuando hay modal móvil abierto
  useEffect(() => {
    if (mobileModal) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [mobileModal])

  function openPanel(p: Panel, el: HTMLElement | null, width: number) {
    if (isMobile) {
      setMobileModal(p as MobileModal)
      return
    }
    if (panel === p) { setPanel(null); return }
    const r = getRect(el)
    if (r) {
      const left = Math.min(Math.max(r.left, 12), window.innerWidth - width - 12)
      setPanelPos({ top: r.bottom + 8, left })
    }
    setPanel(p)
  }

  // Cerrar con Escape o al hacer scroll (el buscador no es sticky)
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setPanel(null) }
    function onScroll() { setPanel(null) }
    if (panel) {
      document.addEventListener('keydown', onKey)
      window.addEventListener('scroll', onScroll, { passive: true })
    }
    return () => {
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', onScroll)
    }
  }, [panel])

  function pickActivity(key: string, label: string) {
    setActivity(key); setActQ(label)
    setPanel(null); setMobileModal(null)
  }
  function pickCity(s: string) {
    setCity(s); setCityQ(s)
    setPanel(null); setMobileModal(null)
  }
  function pickDay(day: number) {
    const dYMD = `${view.year}-${String(view.month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`
    if (dYMD < todayYMD) return
    setDateFrom(dYMD)
    setPanel(null); setMobileModal(null)
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
    boxShadow: '0 12px 40px rgba(0,0,0,0.12)',
    zIndex: 9998,
    overflow: 'hidden',
  }

  // Calendario inline (usado tanto en desktop panel como en móvil modal)
  const CalendarContent = () => (
    <>
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid #F3F4F6' }}>
        <button type="button" onClick={prevMonth}
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ color: '#6B7280', background: '#F9FAFB' }}>
          <ChevronLeft size={16} />
        </button>
        <span className="text-sm font-bold" style={{ color: '#111827' }}>
          {MONTHS[view.month]} {view.year}
        </span>
        <button type="button" onClick={nextMonth}
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ color: '#6B7280', background: '#F9FAFB' }}>
          <ChevronRight size={16} />
        </button>
      </div>
      <div className="grid grid-cols-7 px-3 pt-3 pb-1">
        {DAYS.map(d => (
          <div key={d} className="text-center text-xs font-semibold py-1" style={{ color: '#9CA3AF' }}>{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 px-3 pb-4 gap-y-1">
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
              className="aspect-square rounded-xl text-sm flex items-center justify-center font-medium transition-all"
              style={
                isSel   ? { background: '#35C493', color: '#fff', fontWeight: 700 } :
                isToday ? { background: 'rgba(53,196,147,0.12)', color: '#35C493', fontWeight: 600 } :
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
        <div className="px-4 py-3 flex items-center justify-between" style={{ borderTop: '1px solid #F3F4F6' }}>
          <span className="text-sm font-medium" style={{ color: '#374151' }}>{fmtDate(dateFrom)}</span>
          <button type="button" onClick={() => { setDateFrom(''); setPanel(null); setMobileModal(null) }}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg"
            style={{ background: 'rgba(220,38,38,0.07)', color: '#DC2626' }}>
            Limpiar
          </button>
        </div>
      )}
    </>
  )

  return (
    <>
      {/* ───────────────────────────────────────────────────────
          DESKTOP: Barra horizontal con dropdowns flotantes
          ─────────────────────────────────────────────────── */}
      <div className="hidden md:block max-w-3xl">
        <div className="flex items-stretch rounded-2xl"
          style={{ background: '#fff', boxShadow: '0 20px 60px rgba(0,0,0,0.28)', overflow: 'hidden' }}>

          {/* Actividad */}
          <div ref={actRef}
            className="flex items-center gap-3 px-5 cursor-pointer"
            style={{ width: 210, minHeight: 64, background: panel === 'activity' ? 'rgba(53,196,147,0.04)' : 'transparent', transition: 'background 0.15s' }}>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold uppercase tracking-wide mb-0.5" style={{ color: '#9CA3AF' }}>Actividad</div>
              <input
                value={actQ}
                onChange={e => { setActQ(e.target.value); setActivity(''); if (panel !== 'activity') openPanel('activity', actRef.current, 260) }}
                onFocus={() => { if (panel !== 'activity') openPanel('activity', actRef.current, 260) }}
                placeholder="Cualquier evento"
                className="w-full bg-transparent text-sm focus:outline-none"
                style={{ color: '#111827', fontWeight: activity ? 500 : 400 }}
              />
            </div>
            {(activity || actQ) && (
              <span role="button" onClick={() => { setActivity(''); setActQ('') }}
                className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 cursor-pointer"
                style={{ background: '#F3F4F6' }}>
                <X size={10} strokeWidth={2.5} style={{ color: '#6B7280' }} />
              </span>
            )}
          </div>

          <div className="w-px my-4" style={{ background: '#E5E7EB' }} />

          {/* Ciudad */}
          <div ref={cityRef}
            className="flex items-center gap-3 flex-1 px-5"
            style={{ minHeight: 64 }}>
            <MapPin size={15} style={{ color: city ? '#35C493' : '#9CA3AF', flexShrink: 0 }} />
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold uppercase tracking-wide mb-0.5" style={{ color: '#9CA3AF' }}>Sector / Ciudad</div>
              <input
                value={cityQ}
                onChange={e => { setCityQ(e.target.value); setCity(''); if (panel !== 'city') openPanel('city', cityRef.current, 280) }}
                onFocus={() => { if (panel !== 'city') openPanel('city', cityRef.current, 280) }}
                placeholder="¿Dónde?"
                className="w-full bg-transparent text-sm focus:outline-none"
                style={{ color: '#111827', fontWeight: city ? 500 : 400 }}
              />
            </div>
            {(city || cityQ) && (
              <span role="button" onClick={() => { setCity(''); setCityQ('') }}
                className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 cursor-pointer"
                style={{ background: '#F3F4F6' }}>
                <X size={10} strokeWidth={2.5} style={{ color: '#6B7280' }} />
              </span>
            )}
          </div>

          <div className="w-px my-4" style={{ background: '#E5E7EB' }} />

          {/* Fecha */}
          <button ref={dateRef} type="button"
            onClick={() => openPanel('date', dateRef.current, 308)}
            className="flex items-center gap-3 px-5 text-left focus:outline-none"
            style={{ width: 192, background: panel === 'date' ? 'rgba(53,196,147,0.04)' : 'transparent', transition: 'background 0.15s' }}>
            <CalendarDays size={15} style={{ color: dateFrom ? '#35C493' : '#9CA3AF', flexShrink: 0 }} />
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold uppercase tracking-wide mb-0.5" style={{ color: '#9CA3AF' }}>Fecha</div>
              <div className="text-sm truncate" style={{ color: dateFrom ? '#111827' : '#9CA3AF', fontWeight: dateFrom ? 500 : 400 }}>
                {dateFrom ? fmtDate(dateFrom) : '¿Cuándo?'}
              </div>
            </div>
            {dateFrom && (
              <span role="button" onClick={e => { e.stopPropagation(); setDateFrom('') }}
                className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 cursor-pointer"
                style={{ background: '#F3F4F6' }}>
                <X size={10} strokeWidth={2.5} style={{ color: '#6B7280' }} />
              </span>
            )}
          </button>

          {/* Buscar */}
          <button type="button" onClick={search}
            className="flex items-center gap-2 px-7 text-sm font-bold text-white shrink-0 transition-opacity hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #35C493, #28A87C)', borderRadius: '0 16px 16px 0' }}>
            <Search size={15} />
            Buscar
          </button>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────
          MÓVIL: Barra compacta con campos stacked + modales
          ─────────────────────────────────────────────────── */}
      <div className="md:hidden">
        <div className="rounded-2xl overflow-hidden"
          style={{ background: '#fff', boxShadow: '0 16px 48px rgba(0,0,0,0.28)' }}>

          {/* Campo Actividad */}
          <button type="button" onClick={() => setMobileModal('activity')}
            className="w-full flex items-center gap-3 px-5 py-4 text-left"
            style={{ borderBottom: '1px solid #F3F4F6' }}>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: activity ? 'rgba(53,196,147,0.1)' : '#F9FAFB' }}>
              <Search size={15} style={{ color: activity ? '#35C493' : '#9CA3AF' }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#9CA3AF' }}>Actividad</div>
              <div className="text-sm font-medium mt-0.5 truncate" style={{ color: activity ? '#111827' : '#9CA3AF' }}>
                {actQ || 'Cualquier evento'}
              </div>
            </div>
            {activity ? (
              <span onClick={e => { e.stopPropagation(); setActivity(''); setActQ('') }}
                className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
                style={{ background: '#F3F4F6' }}>
                <X size={11} style={{ color: '#6B7280' }} />
              </span>
            ) : (
              <ChevronDown size={16} style={{ color: '#9CA3AF', flexShrink: 0 }} />
            )}
          </button>

          {/* Fila inferior: Ciudad + Fecha */}
          <div className="flex">
            {/* Ciudad */}
            <button type="button" onClick={() => setMobileModal('city')}
              className="flex-1 flex items-center gap-2.5 px-4 py-3.5 text-left"
              style={{ borderRight: '1px solid #F3F4F6' }}>
              <MapPin size={14} style={{ color: city ? '#35C493' : '#9CA3AF', flexShrink: 0 }} />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#9CA3AF' }}>Sector</div>
                <div className="text-sm font-medium mt-0.5 truncate" style={{ color: city ? '#111827' : '#9CA3AF' }}>
                  {city || '¿Dónde?'}
                </div>
              </div>
            </button>

            {/* Fecha */}
            <button type="button" onClick={() => setMobileModal('date')}
              className="flex-1 flex items-center gap-2.5 px-4 py-3.5 text-left">
              <CalendarDays size={14} style={{ color: dateFrom ? '#35C493' : '#9CA3AF', flexShrink: 0 }} />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#9CA3AF' }}>Fecha</div>
                <div className="text-sm font-medium mt-0.5 truncate" style={{ color: dateFrom ? '#111827' : '#9CA3AF' }}>
                  {dateFrom ? fmtDateShort(dateFrom) : '¿Cuándo?'}
                </div>
              </div>
            </button>
          </div>

          {/* Botón buscar */}
          <button type="button" onClick={search}
            className="w-full flex items-center justify-center gap-2.5 py-4 text-base font-bold text-white"
            style={{ background: 'linear-gradient(135deg, #35C493, #28A87C)' }}>
            <Search size={18} />
            Buscar espacios
          </button>
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────
          DESKTOP: Dropdowns flotantes
          ─────────────────────────────────────────────────── */}

      {/* Backdrop compartido — cierra panel sin importar scrollbar */}
      {!isMobile && panel && (
        <div className="fixed inset-0 z-[9997]" onClick={() => setPanel(null)} />
      )}

      {/* Actividad */}
      {!isMobile && panel === 'activity' && filteredActivities.length > 0 && (
        <div data-ep-panel style={{ ...dropBase, width: 260, zIndex: 9998, animation: 'dropIn 0.15s ease-out' }}>
          <style>{`@keyframes dropIn { from { opacity:0; transform:translateY(-5px) } to { opacity:1; transform:translateY(0) } }`}</style>
          <div className="py-1.5" style={{ maxHeight: 280, overflowY: 'auto' }}>
            {filteredActivities.map(act => (
              <button key={act.key} type="button" onClick={() => pickActivity(act.key, act.label)}
                className="w-full text-left px-4 py-2.5 text-sm flex items-center justify-between"
                style={{ color: activity === act.key ? '#35C493' : '#374151', fontWeight: activity === act.key ? 600 : 400 }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#F9FAFB' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}>
                {act.label}
                {activity === act.key && <span style={{ color: '#35C493', fontSize: 12 }}>✓</span>}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Ciudad */}
      {!isMobile && panel === 'city' && filteredSectors.length > 0 && (
        <div data-ep-panel style={{ ...dropBase, width: 280, zIndex: 9998, animation: 'dropIn 0.15s ease-out' }}>
          <div className="py-1.5" style={{ maxHeight: 260, overflowY: 'auto' }}>
            {filteredSectors.map(s => (
              <button key={s} type="button" onClick={() => pickCity(s)}
                className="w-full text-left px-4 py-2.5 text-sm flex items-center gap-2.5"
                style={{ color: city === s ? '#35C493' : '#374151', fontWeight: city === s ? 600 : 400 }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#F9FAFB' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}>
                <MapPin size={12} style={{ color: city === s ? '#35C493' : '#9CA3AF', flexShrink: 0 }} />
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Fecha */}
      {!isMobile && panel === 'date' && (
        <div data-ep-panel style={{ ...dropBase, width: 308, zIndex: 9998, animation: 'dropIn 0.15s ease-out' }}>
          <CalendarContent />
        </div>
      )}

      {/* ──────────────────────────────────────────────────────
          MÓVIL: Modales de selección (bottom sheets)
          ─────────────────────────────────────────────────── */}
      {mobileModal && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            onClick={() => setMobileModal(null)} />

          {/* Sheet */}
          <div className="fixed inset-x-0 bottom-0 z-50 rounded-t-3xl overflow-hidden slide-in-bottom"
            style={{ background: '#fff', maxHeight: '85dvh', display: 'flex', flexDirection: 'column' }}>

            {/* Header del sheet */}
            <div className="flex items-center justify-between px-5 pt-5 pb-4 shrink-0"
              style={{ borderBottom: '1px solid #F3F4F6' }}>
              <h3 className="font-bold text-base" style={{ color: '#111827' }}>
                {mobileModal === 'activity' ? 'Tipo de evento' :
                 mobileModal === 'city'     ? 'Sector o ciudad' : 'Elige una fecha'}
              </h3>
              <button onClick={() => setMobileModal(null)}
                className="w-9 h-9 flex items-center justify-center rounded-xl"
                style={{ background: '#F3F4F6', color: '#6B7280' }}>
                <X size={18} />
              </button>
            </div>

            {/* Contenido */}
            <div className="flex-1 overflow-y-auto">

              {/* ── ACTIVIDAD ── */}
              {mobileModal === 'activity' && (
                <div className="p-4">
                  {/* Búsqueda rápida */}
                  <div className="flex items-center gap-2 rounded-xl px-4 py-3 mb-4"
                    style={{ background: '#F9FAFB', border: '1.5px solid #E5E7EB' }}>
                    <Search size={15} style={{ color: '#9CA3AF', flexShrink: 0 }} />
                    <input
                      value={actQ}
                      onChange={e => { setActQ(e.target.value); setActivity('') }}
                      placeholder="Buscar tipo de evento..."
                      className="flex-1 bg-transparent focus:outline-none"
                      style={{ color: '#111827', fontSize: 16 }}
                      autoFocus
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {filteredActivities.map(act => (
                      <button key={act.key} type="button" onClick={() => pickActivity(act.key, act.label)}
                        className="flex items-center gap-2 px-4 py-3.5 rounded-xl text-left text-sm font-medium transition-all"
                        style={activity === act.key
                          ? { background: 'rgba(53,196,147,0.1)', color: '#35C493', border: '1.5px solid rgba(53,196,147,0.3)' }
                          : { background: '#F9FAFB', color: '#374151', border: '1.5px solid #E5E7EB' }}>
                        <span className="w-2 h-2 rounded-full shrink-0"
                          style={{ background: activity === act.key ? '#35C493' : '#D1D5DB' }} />
                        {act.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* ── CIUDAD ── */}
              {mobileModal === 'city' && (
                <div className="p-4">
                  <div className="flex items-center gap-2 rounded-xl px-4 py-3 mb-4"
                    style={{ background: '#F9FAFB', border: '1.5px solid #E5E7EB' }}>
                    <MapPin size={15} style={{ color: '#9CA3AF', flexShrink: 0 }} />
                    <input
                      value={cityQ}
                      onChange={e => { setCityQ(e.target.value); setCity('') }}
                      placeholder="Buscar sector o ciudad..."
                      className="flex-1 bg-transparent focus:outline-none"
                      style={{ color: '#111827', fontSize: 16 }}
                      autoFocus
                    />
                    {cityQ && (
                      <button onClick={() => { setCityQ(''); setCity('') }}>
                        <X size={13} style={{ color: '#9CA3AF' }} />
                      </button>
                    )}
                  </div>
                  <div className="space-y-1">
                    {filteredSectors.map(s => (
                      <button key={s} type="button" onClick={() => pickCity(s)}
                        className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm transition-all"
                        style={city === s
                          ? { background: 'rgba(53,196,147,0.08)', color: '#35C493', fontWeight: 600 }
                          : { background: 'transparent', color: '#374151' }}
                        onMouseEnter={e => { if (city !== s) (e.currentTarget as HTMLElement).style.background = '#F9FAFB' }}
                        onMouseLeave={e => { if (city !== s) (e.currentTarget as HTMLElement).style.background = 'transparent' }}>
                        <MapPin size={14} style={{ color: city === s ? '#35C493' : '#9CA3AF', flexShrink: 0 }} />
                        {s}
                        {city === s && <span className="ml-auto text-xs font-bold" style={{ color: '#35C493' }}>✓</span>}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* ── FECHA (calendario) ── */}
              {mobileModal === 'date' && (
                <div className="pb-6">
                  <CalendarContent />
                </div>
              )}
            </div>

            {/* Footer del sheet */}
            <div className="px-4 py-4 shrink-0 pb-safe" style={{ borderTop: '1px solid #F3F4F6' }}>
              <button type="button" onClick={() => setMobileModal(null)}
                className="w-full py-3.5 rounded-2xl text-sm font-bold text-white"
                style={{ background: 'linear-gradient(135deg, #35C493, #28A87C)' }}>
                Confirmar
              </button>
            </div>
          </div>
        </>
      )}
    </>
  )
}
