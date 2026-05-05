'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { CalendarDays, Users, X, ChevronLeft, ChevronRight, Search } from 'lucide-react'
import Link from 'next/link'

// ── Actividades con emojis para el dropdown ───────────────
const ACTIVITIES = [
  { key: 'cumpleanos',         label: 'Cumpleaños',       emoji: '🎂', group: 'Celebraciones' },
  { key: 'boda',               label: 'Boda',              emoji: '💍', group: 'Celebraciones' },
  { key: 'quinceanera',        label: 'Quinceañera',       emoji: '👑', group: 'Celebraciones' },
  { key: 'graduacion',         label: 'Graduación',        emoji: '🎓', group: 'Celebraciones' },
  { key: 'baby-shower',        label: 'Baby Shower',       emoji: '👶', group: 'Celebraciones' },
  { key: 'celebracion',        label: 'Celebración',       emoji: '🥂', group: 'Celebraciones' },
  { key: 'evento-corporativo', label: 'Corporativo',       emoji: '💼', group: 'Empresa' },
  { key: 'networking',         label: 'Networking',        emoji: '🤝', group: 'Empresa' },
  { key: 'lanzamiento',        label: 'Lanzamiento',       emoji: '🚀', group: 'Empresa' },
  { key: 'taller',             label: 'Taller',            emoji: '📝', group: 'Empresa' },
  { key: 'sesion-fotos',       label: 'Sesión de fotos',   emoji: '📸', group: 'Producción' },
  { key: 'rodaje',             label: 'Rodaje / Video',    emoji: '🎬', group: 'Producción' },
  { key: 'reunion-trabajo',    label: 'Reunión',           emoji: '📋', group: 'Reuniones' },
  { key: 'coworking',          label: 'Coworking',         emoji: '💻', group: 'Reuniones' },
]
const GROUPS = ['Celebraciones', 'Empresa', 'Producción', 'Reuniones']

const MONTHS = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre',
]
const DAY_LABELS = ['Do','Lu','Ma','Mi','Ju','Vi','Sa']
const QUICK_SECTORS = ['Piantini','Naco','Bella Vista','Arroyo Hondo','Santiago']

type ActivePanel = 'activity' | 'date' | 'guests' | null

function toYMD(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}
function fmtDate(val: string) {
  return new Date(val + 'T12:00').toLocaleDateString('es-DO', { day: 'numeric', month: 'long' })
}

export default function HomepageSearch() {
  const router = useRouter()

  // Valores del formulario
  const [activity, setActivity] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [guests,   setGuests]   = useState(20)

  // Panel abierto + su posición (position:fixed para escapar overflow:hidden del hero)
  const [active, setActive]   = useState<ActivePanel>(null)
  const [pos,    setPos]      = useState({ top: 0, left: 0 })
  const [panelW, setPanelW]   = useState(380)

  const actRef   = useRef<HTMLButtonElement>(null)
  const dateRef  = useRef<HTMLButtonElement>(null)
  const guestRef = useRef<HTMLButtonElement>(null)

  // Calendario
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayYMD = toYMD(today)
  const [view, setView] = useState({ year: today.getFullYear(), month: today.getMonth() })
  const firstDay    = new Date(view.year, view.month, 1).getDay()
  const daysInMonth = new Date(view.year, view.month + 1, 0).getDate()
  const prevMonth   = useCallback(() =>
    setView(v => v.month === 0 ? { year: v.year-1, month: 11 } : { ...v, month: v.month-1 }), [])
  const nextMonth   = useCallback(() =>
    setView(v => v.month === 11 ? { year: v.year+1, month: 0 } : { ...v, month: v.month+1 }), [])

  function calcPos(ref: React.RefObject<HTMLButtonElement | null>, width: number) {
    if (!ref.current) return { top: 0, left: 0 }
    const r = ref.current.getBoundingClientRect()
    const safeLeft = Math.min(Math.max(r.left, 12), window.innerWidth - width - 12)
    return { top: r.bottom + 10, left: safeLeft }
  }

  function toggle(panel: ActivePanel, ref: React.RefObject<HTMLButtonElement | null>, width: number) {
    if (active === panel) { setActive(null); return }
    setPanelW(width)
    setPos(calcPos(ref, width))
    setActive(panel)
  }

  // Cerrar al click afuera, scroll o Escape
  useEffect(() => {
    if (!active) return
    const triggers = [actRef, dateRef, guestRef]
    function onDown(e: MouseEvent) {
      if (triggers.some(r => r.current?.contains(e.target as Node))) return
      // Si el click fue dentro de un panel fijo, no cerrar
      const panels = document.querySelectorAll('[data-espot-panel]')
      for (const p of panels) if (p.contains(e.target as Node)) return
      setActive(null)
    }
    function onScroll() { setActive(null) }
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setActive(null) }
    document.addEventListener('mousedown', onDown)
    window.addEventListener('scroll', onScroll, { passive: true })
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      window.removeEventListener('scroll', onScroll)
      document.removeEventListener('keydown', onKey)
    }
  }, [active])

  function pickActivity(key: string) {
    setActivity(prev => prev === key ? '' : key)
    setActive(null)
  }

  function pickDay(day: number) {
    const dYMD = `${view.year}-${String(view.month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`
    if (dYMD < todayYMD) return
    setDateFrom(dYMD)
    setActive(null)
  }

  function search() {
    const p = new URLSearchParams()
    if (activity)  p.set('activity',  activity)
    if (dateFrom)  p.set('dateFrom',  dateFrom)
    if (guests > 1) p.set('capacidad', String(guests))
    router.push(`/buscar${p.toString() ? '?' + p.toString() : ''}`)
  }

  const selActivity = ACTIVITIES.find(a => a.key === activity)

  // Panel base style
  const panelBase: React.CSSProperties = {
    position: 'fixed',
    top:  pos.top,
    left: pos.left,
    width: panelW,
    background: '#fff',
    border: '1px solid #E8ECF0',
    borderRadius: 20,
    boxShadow: '0 24px 64px rgba(0,0,0,0.14), 0 4px 16px rgba(0,0,0,0.06)',
    zIndex: 9998,
    overflow: 'hidden',
  }

  return (
    <>
      <style>{`
        @keyframes panelIn {
          from { opacity:0; transform:translateY(-8px) scale(0.97); }
          to   { opacity:1; transform:translateY(0) scale(1); }
        }
        .ep-panel { animation: panelIn 0.2s cubic-bezier(0.16,1,0.3,1) forwards; }

        .ep-seg-btn { background:transparent; transition:background 0.15s; }
        .ep-seg-btn:hover { background:rgba(0,0,0,0.025); }
        .ep-seg-btn.active { background:rgba(53,196,147,0.05); }

        @media (max-width: 767px) {
          .ep-bar { flex-direction:column !important; }
          .ep-div { display:none !important; }
          .ep-seg { width:100% !important; border-bottom:1px solid #E8ECF0 !important; }
          .ep-seg:last-of-type { border-bottom:none !important; }
          .ep-submit { border-radius:0 0 16px 16px !important; padding:16px !important; justify-content:center; }
          .ep-panel  { left:12px !important; right:12px !important; width:auto !important; animation:none !important; }
        }
      `}</style>

      <div className="max-w-3xl mx-auto">

        {/* ── Barra de búsqueda ── */}
        <div
          className="ep-bar flex items-stretch rounded-2xl"
          style={{ background:'#fff', boxShadow:'0 20px 60px rgba(0,0,0,0.28)', overflow:'hidden' }}
        >

          {/* 1 · Actividad */}
          <button
            ref={actRef} type="button"
            onClick={() => toggle('activity', actRef, 520)}
            className={`ep-seg ep-seg-btn flex items-center gap-3 flex-1 px-6 text-left focus:outline-none${active==='activity' ? ' active' : ''}`}
            style={{ minHeight: 68 }}
          >
            <span className="text-2xl leading-none" style={{ flexShrink: 0 }}>
              {selActivity?.emoji ?? '🎉'}
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold mb-0.5 uppercase tracking-wide" style={{ color:'#9CA3AF' }}>Actividad</div>
              <div className="text-sm truncate" style={{ color: selActivity ? '#0F1623' : '#9CA3AF', fontWeight: selActivity ? 500 : 400 }}>
                {selActivity?.label ?? '¿Qué celebras?'}
              </div>
            </div>
            {selActivity && (
              <button
                type="button"
                onClick={e => { e.stopPropagation(); setActivity('') }}
                className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-colors"
                style={{ background:'#F3F4F6', color:'#6B7280' }}
                onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = '#E5E7EB')}
                onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = '#F3F4F6')}
              >
                <X size={10} strokeWidth={2.5} />
              </button>
            )}
          </button>

          <div className="ep-div w-px my-4" style={{ background:'#E8ECF0' }} />

          {/* 2 · Fecha */}
          <button
            ref={dateRef} type="button"
            onClick={() => toggle('date', dateRef, 364)}
            className={`ep-seg ep-seg-btn flex items-center gap-3 px-6 text-left focus:outline-none${active==='date' ? ' active' : ''}`}
            style={{ width: 188 }}
          >
            <CalendarDays size={16} style={{ color: dateFrom ? '#35C493' : '#9CA3AF', flexShrink: 0 }} />
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold mb-0.5 uppercase tracking-wide" style={{ color:'#9CA3AF' }}>Fecha</div>
              <div className="text-sm truncate" style={{ color: dateFrom ? '#0F1623' : '#9CA3AF', fontWeight: dateFrom ? 500 : 400 }}>
                {dateFrom ? fmtDate(dateFrom) : '¿Cuándo?'}
              </div>
            </div>
            {dateFrom && (
              <button
                type="button"
                onClick={e => { e.stopPropagation(); setDateFrom('') }}
                className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-colors"
                style={{ background:'#F3F4F6', color:'#6B7280' }}
                onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = '#E5E7EB')}
                onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = '#F3F4F6')}
              >
                <X size={10} strokeWidth={2.5} />
              </button>
            )}
          </button>

          <div className="ep-div w-px my-4" style={{ background:'#E8ECF0' }} />

          {/* 3 · Personas */}
          <button
            ref={guestRef} type="button"
            onClick={() => toggle('guests', guestRef, 240)}
            className={`ep-seg ep-seg-btn flex items-center gap-3 px-6 text-left focus:outline-none${active==='guests' ? ' active' : ''}`}
            style={{ width: 156 }}
          >
            <Users size={16} style={{ color:'#9CA3AF', flexShrink: 0 }} />
            <div>
              <div className="text-xs font-semibold mb-0.5 uppercase tracking-wide" style={{ color:'#9CA3AF' }}>Personas</div>
              <div className="text-sm font-medium" style={{ color:'#0F1623' }}>
                {guests} persona{guests !== 1 ? 's' : ''}
              </div>
            </div>
          </button>

          {/* Buscar */}
          <button
            type="button" onClick={search}
            className="ep-submit flex items-center gap-2 px-7 text-sm font-bold text-white transition-opacity hover:opacity-90 shrink-0"
            style={{ background:'linear-gradient(135deg,#35C493,#28A87C)', borderRadius:'0 16px 16px 0' }}
          >
            <Search size={15} />
            Buscar
          </button>
        </div>

        {/* Quick sectors */}
        <div className="flex items-center justify-center gap-2 mt-5 flex-wrap">
          {QUICK_SECTORS.map(s => (
            <Link key={s} href={`/buscar?sector=${s}`}
              className="text-xs px-3.5 py-1.5 rounded-full transition-all"
              style={{ background:'rgba(255,255,255,0.08)', color:'rgba(255,255,255,0.6)', border:'1px solid rgba(255,255,255,0.12)' }}>
              {s}
            </Link>
          ))}
        </div>
      </div>

      {/* ════════════════════════════════════════════════════
          PANELES — position:fixed para escapar overflow:hidden
          ════════════════════════════════════════════════════ */}

      {/* Panel: Actividades */}
      {active === 'activity' && (
        <>
          <div className="fixed inset-0 md:hidden" style={{ background:'rgba(0,0,0,0.35)', zIndex:9996 }} onClick={() => setActive(null)} />
          <div data-espot-panel className="ep-panel" style={{ ...panelBase, padding:'20px 20px 16px' }}>
            <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color:'#9CA3AF' }}>
              ¿Qué tipo de evento planeas?
            </p>
            {GROUPS.map(group => {
              const items = ACTIVITIES.filter(a => a.group === group)
              return (
                <div key={group} className="mb-5 last:mb-0">
                  <p className="text-xs font-semibold mb-2.5" style={{ color:'#6B7280' }}>{group}</p>
                  <div className="flex flex-wrap gap-2">
                    {items.map(act => {
                      const isSel = activity === act.key
                      return (
                        <button
                          key={act.key} type="button"
                          onClick={() => pickActivity(act.key)}
                          className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium transition-all"
                          style={
                            isSel
                              ? { background:'#35C493', color:'#fff', boxShadow:'0 2px 8px rgba(53,196,147,0.3)' }
                              : { background:'#F9FAFB', color:'#374151', border:'1px solid #E8ECF0' }
                          }
                          onMouseEnter={e => { if (!isSel) (e.currentTarget as HTMLElement).style.background = '#F3F4F6' }}
                          onMouseLeave={e => { if (!isSel) (e.currentTarget as HTMLElement).style.background = '#F9FAFB' }}
                        >
                          <span>{act.emoji}</span>
                          {act.label}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* Panel: Calendario */}
      {active === 'date' && (
        <>
          <div className="fixed inset-0 md:hidden" style={{ background:'rgba(0,0,0,0.35)', zIndex:9996 }} onClick={() => setActive(null)} />
          <div data-espot-panel className="ep-panel" style={panelBase}>

            <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom:'1px solid #F5F5F5' }}>
              <button type="button" onClick={prevMonth}
                className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors hover:bg-gray-100"
                style={{ color:'#6B7280' }}>
                <ChevronLeft size={17} />
              </button>
              <span className="font-bold text-base" style={{ color:'#0F1623' }}>
                {MONTHS[view.month]} {view.year}
              </span>
              <button type="button" onClick={nextMonth}
                className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors hover:bg-gray-100"
                style={{ color:'#6B7280' }}>
                <ChevronRight size={17} />
              </button>
            </div>

            <div className="grid grid-cols-7 px-5 pt-4 pb-2">
              {DAY_LABELS.map(d => (
                <div key={d} className="text-center text-xs font-semibold" style={{ color:'#9CA3AF' }}>{d}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 px-5 pb-4 gap-y-1">
              {Array(firstDay).fill(null).map((_, i) => <div key={`e${i}`} />)}
              {Array(daysInMonth).fill(null).map((_, i) => {
                const day  = i + 1
                const dYMD = `${view.year}-${String(view.month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`
                const isPast  = dYMD < todayYMD
                const isToday = dYMD === todayYMD
                const isSel   = dYMD === dateFrom
                return (
                  <button key={day} type="button" disabled={isPast} onClick={() => pickDay(day)}
                    className="aspect-square rounded-xl text-sm font-medium transition-all flex items-center justify-center"
                    style={
                      isSel   ? { background:'#35C493', color:'#fff', fontWeight:700 } :
                      isToday ? { background:'rgba(53,196,147,0.12)', color:'#35C493', fontWeight:600 } :
                      isPast  ? { color:'#D1D5DB', cursor:'not-allowed' } :
                                { color:'#0F1623' }
                    }
                    onMouseEnter={e => { if (!isSel && !isPast) (e.currentTarget as HTMLElement).style.background = '#F5F5F5' }}
                    onMouseLeave={e => { if (!isSel && !isPast) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                  >
                    {day}
                  </button>
                )
              })}
            </div>

            <div className="px-5 py-3 flex items-center justify-between" style={{ borderTop:'1px solid #F5F5F5' }}>
              <span className="text-xs" style={{ color:'#9CA3AF' }}>
                {dateFrom ? `Filtrando: ${fmtDate(dateFrom)}` : 'Selecciona una fecha'}
              </span>
              {dateFrom && (
                <button type="button" onClick={() => { setDateFrom(''); setActive(null) }}
                  className="text-xs font-medium ml-3 transition-colors hover:text-gray-900" style={{ color:'#6B7280' }}>
                  Limpiar
                </button>
              )}
            </div>
          </div>
        </>
      )}

      {/* Panel: Personas */}
      {active === 'guests' && (
        <>
          <div className="fixed inset-0 md:hidden" style={{ background:'rgba(0,0,0,0.35)', zIndex:9996 }} onClick={() => setActive(null)} />
          <div data-espot-panel className="ep-panel" style={{ ...panelBase, padding:24 }}>

            <p className="text-xs font-bold uppercase tracking-widest mb-5" style={{ color:'#9CA3AF' }}>
              Número de personas
            </p>

            <div className="flex items-center justify-between gap-4">
              <button type="button"
                onClick={() => setGuests(g => Math.max(1, g - 5))}
                className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl font-bold transition-all"
                style={{ background:'#F3F4F6', color:'#374151' }}
                onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = '#E5E7EB')}
                onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = '#F3F4F6')}
              >−</button>

              <div className="text-center">
                <div className="text-3xl font-bold tracking-tight" style={{ color:'#0F1623' }}>{guests}</div>
                <div className="text-xs mt-0.5" style={{ color:'#9CA3AF' }}>personas</div>
              </div>

              <button type="button"
                onClick={() => setGuests(g => Math.min(1000, g + 5))}
                className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl font-bold transition-all"
                style={{ background:'#F3F4F6', color:'#374151' }}
                onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = '#E5E7EB')}
                onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = '#F3F4F6')}
              >+</button>
            </div>

            <div className="flex flex-wrap gap-2 mt-5">
              {[10, 25, 50, 100, 200, 500].map(n => (
                <button key={n} type="button" onClick={() => setGuests(n)}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
                  style={
                    guests === n
                      ? { background:'#35C493', color:'#fff' }
                      : { background:'#F9FAFB', color:'#6B7280', border:'1px solid #E8ECF0' }
                  }
                  onMouseEnter={e => { if (guests !== n) (e.currentTarget as HTMLElement).style.background = '#F3F4F6' }}
                  onMouseLeave={e => { if (guests !== n) (e.currentTarget as HTMLElement).style.background = '#F9FAFB' }}
                >
                  {n}+
                </button>
              ))}
            </div>

            <button type="button" onClick={() => setActive(null)}
              className="w-full mt-5 py-3 rounded-xl text-sm font-bold text-white transition-opacity hover:opacity-90"
              style={{ background:'linear-gradient(135deg,#35C493,#28A87C)' }}>
              Listo
            </button>
          </div>
        </>
      )}
    </>
  )
}
