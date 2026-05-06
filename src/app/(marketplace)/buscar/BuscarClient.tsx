'use client'

import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import {
  Search, MapPin, Users, SlidersHorizontal, X, CalendarDays, Clock,
  ChevronLeft, ChevronRight, Shield, LayoutList, Map, ArrowRight,
  Check, Building2, UtensilsCrossed,
  Sunset, Wine, Trees, Camera, Briefcase, Home, Hotel,
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

const SpacesMap = dynamic(() => import('@/components/map/SpacesMap'), {
  ssr:     false,
  loading: () => (
    <div className="w-full h-full rounded-2xl animate-pulse"
      style={{ background: '#E8EDE9' }} />
  ),
})

const CATEGORIES = [
  { value: '',             label: 'Todos',       icon: LayoutList },
  { value: 'salon',        label: 'Salones',      icon: Building2 },
  { value: 'restaurante',  label: 'Restaurantes', icon: UtensilsCrossed },
  { value: 'rooftop',      label: 'Rooftops',     icon: Sunset },
  { value: 'terraza',      label: 'Terrazas',     icon: Trees },
  { value: 'bar',          label: 'Bares',        icon: Wine },
  { value: 'hotel',        label: 'Hoteles',      icon: Hotel },
  { value: 'coworking',    label: 'Coworking',    icon: Briefcase },
  { value: 'villa',        label: 'Villas',       icon: Home },
  { value: 'estudio',      label: 'Estudios',     icon: Camera },
]

const QUICK_CAPACITIES = [20, 50, 100, 150]

const TIME_SLOTS = [
  {v:'08:00',l:'8am'},{v:'09:00',l:'9am'},{v:'10:00',l:'10am'},{v:'11:00',l:'11am'},
  {v:'12:00',l:'12pm'},{v:'13:00',l:'1pm'},{v:'14:00',l:'2pm'},{v:'15:00',l:'3pm'},
  {v:'16:00',l:'4pm'},{v:'17:00',l:'5pm'},{v:'18:00',l:'6pm'},{v:'19:00',l:'7pm'},
  {v:'20:00',l:'8pm'},{v:'21:00',l:'9pm'},{v:'22:00',l:'10pm'},{v:'23:00',l:'11pm'},
]
const MONTH_NAMES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const DAY_NAMES = ['Do','Lu','Ma','Mi','Ju','Vi','Sá']

const AMENITIES = [
  { key: 'allows_external_decoration', label: 'Permite decoración externa' },
  { key: 'allows_external_food',       label: 'Permite comida externa' },
  { key: 'allows_external_alcohol',    label: 'Permite alcohol externo' },
  { key: 'verified',                   label: 'Espacio verificado' },
]

const SECTORS = [
  'Piantini','Naco','Bella Vista','Evaristo Morales','Arroyo Hondo',
  'Gazcue','Zona Colonial','Los Prados','Serrallés','Esperilla',
  'Los Cacicazgos','Mirador Norte','Ciudad Nueva','La Julia','Paraíso',
  'Renacimiento','Fernández','La Castellana','Urbanización Real',
  'Santiago','La Romana','Boca Chica','Juan Dolio',
  'Punta Cana','Las Terrenas','Puerto Plata',
]

function getCover(space: any) {
  return space.space_images?.find((i: any) => i.is_cover)?.url
      ?? space.space_images?.[0]?.url
      ?? null
}

function getPriceInfo(space: any) {
  const p = space.space_pricing?.find((x: any) => x.is_active) ?? space.space_pricing?.[0]
  if (!p) return null
  if (p.pricing_type === 'hourly')             return { label: `${formatCurrency(p.hourly_price)} / hora` }
  if (p.pricing_type === 'minimum_consumption') return { label: `Desde ${formatCurrency(p.minimum_consumption)}` }
  if (p.pricing_type === 'fixed_package')       return { label: formatCurrency(p.fixed_price) }
  return { label: 'Cotizar' }
}

function fmtDateShort(v: string) {
  if (!v) return ''
  return new Date(v + 'T12:00').toLocaleDateString('es-DO', { day: 'numeric', month: 'short' })
}

function fmtTime(t: string) {
  if (!t) return ''
  const h = parseInt(t.split(':')[0])
  return `${h % 12 || 12}${h >= 12 ? 'pm' : 'am'}`
}

interface Props {
  spaces:        any[]
  initialParams: Record<string, string | undefined>
}

export default function BuscarClient({ spaces, initialParams }: Props) {
  const [q,              setQ]              = useState(initialParams.q ?? '')
  const [sector,         setSector]         = useState(initialParams.sector ?? '')
  const [sectorQ,        setSectorQ]        = useState(initialParams.sector ?? '')
  const [categoria,      setCategoria]      = useState(initialParams.categoria ?? '')
  const [capacidad,      setCapacidad]      = useState(initialParams.capacidad ?? '')
  const [capacidadInput, setCapacidadInput] = useState(initialParams.capacidad ?? '')
  const [dateFrom,       setDateFrom]       = useState(initialParams.dateFrom ?? '')
  const [timeFrom,       setTimeFrom]       = useState(initialParams.timeFrom ?? '')
  const [datePickerOpen, setDatePickerOpen] = useState(false)
  const [pickerPos,      setPickerPos]      = useState({ top: 0, left: 0 })
  const datePickerRef  = useRef<HTMLDivElement>(null)
  const pickerPanelRef = useRef<HTMLDivElement>(null)
  const [priceMin,       setPriceMin]       = useState('')
  const [priceMax,       setPriceMax]       = useState('')
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([])
  const [moreOpen,       setMoreOpen]       = useState(false)
  const [blockedIds,     setBlockedIds]     = useState<Set<string>>(
    () => new Set(spaces.filter((s: any) => s._dateFiltered && !s._available).map((s: any) => s.id))
  )
  const [availLoading, setAvailLoading] = useState(false)

  useEffect(() => {
    if (!dateFrom) { setBlockedIds(new Set()); return }
    setAvailLoading(true)
    const controller = new AbortController()
    const params = new URLSearchParams({ date: dateFrom })
    if (timeFrom) params.set('time', timeFrom)
    fetch(`/api/availability?${params}`, { signal: controller.signal })
      .then(r => r.json())
      .then(({ blockedSpaceIds }) => { setBlockedIds(new Set(blockedSpaceIds)); setAvailLoading(false) })
      .catch(() => { setAvailLoading(false) })
    return () => controller.abort()
  }, [dateFrom, timeFrom])

  useEffect(() => {
    function onOutside(e: MouseEvent) {
      const inBtn   = datePickerRef.current?.contains(e.target as Node)
      const inPanel = pickerPanelRef.current?.contains(e.target as Node)
      if (!inBtn && !inPanel) setDatePickerOpen(false)
    }
    if (datePickerOpen) document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [datePickerOpen])

  function openDatePicker() {
    if (!datePickerOpen && datePickerRef.current) {
      const rect = datePickerRef.current.getBoundingClientRect()
      const pickerW = 310
      const left = rect.left + pickerW > window.innerWidth ? rect.right - pickerW : rect.left
      setPickerPos({ top: rect.bottom + 8, left })
    }
    setDatePickerOpen(o => !o)
  }

  // Bloquear scroll cuando el drawer de filtros está abierto
  useEffect(() => {
    if (moreOpen) document.body.style.overflow = 'hidden'
    else          document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [moreOpen])

  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [mobileView, setMobileView] = useState<'list' | 'map'>('list')

  // Sectores filtrados por búsqueda en el drawer
  const filteredSectors = SECTORS.filter(s =>
    !sectorQ || s.toLowerCase().includes(sectorQ.toLowerCase())
  )

  const filtered = useMemo(() => {
    let result = [...spaces]
    if (q) {
      const ql = q.toLowerCase()
      result = result.filter(s =>
        s.name?.toLowerCase().includes(ql) ||
        s.description?.toLowerCase().includes(ql) ||
        s.category?.toLowerCase().includes(ql) ||
        s.sector?.toLowerCase().includes(ql),
      )
    }
    if (categoria) result = result.filter(s => s.category === categoria)
    if (sector)    result = result.filter(s =>
      s.sector?.toLowerCase().includes(sector.toLowerCase()) ||
      s.city?.toLowerCase().includes(sector.toLowerCase()),
    )
    if (capacidad) result = result.filter(s => s.capacity_max >= parseInt(capacidad))
    if (priceMin || priceMax) {
      result = result.filter(s => {
        const p = s.space_pricing?.find((x: any) => x.is_active) ?? s.space_pricing?.[0]
        if (!p) return true
        const price: number | null =
          p.pricing_type === 'hourly'               ? p.hourly_price :
          p.pricing_type === 'minimum_consumption'  ? p.minimum_consumption :
          p.pricing_type === 'fixed_package'        ? p.fixed_price : null
        if (price === null) return true
        if (priceMin && price < parseInt(priceMin)) return false
        if (priceMax && price > parseInt(priceMax)) return false
        return true
      })
    }
    if (selectedAmenities.includes('verified'))
      result = result.filter(s => s.is_verified)
    if (selectedAmenities.includes('allows_external_decoration'))
      result = result.filter(s => s.space_conditions?.[0]?.allows_external_decoration)
    if (selectedAmenities.includes('allows_external_food'))
      result = result.filter(s => s.space_conditions?.[0]?.allows_external_food)
    if (selectedAmenities.includes('allows_external_alcohol'))
      result = result.filter(s => s.space_conditions?.[0]?.allows_external_alcohol)
    return result
  }, [spaces, q, categoria, sector, capacidad, priceMin, priceMax, selectedAmenities])

  function applyCapacity(val: string) {
    setCapacidad(val); setCapacidadInput(val)
  }
  function toggleAmenity(key: string) {
    setSelectedAmenities(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key],
    )
  }
  function pickSector(s: string) {
    setSector(s); setSectorQ(s)
  }
  function clearSector() {
    setSector(''); setSectorQ('')
  }

  const activeFiltersCount = [
    categoria, sector, capacidad, dateFrom, timeFrom, ...selectedAmenities, priceMin, priceMax,
  ].filter(Boolean).length

  function clearAll() {
    setQ(''); setSector(''); setSectorQ(''); setCategoria(''); setCapacidad(''); setCapacidadInput('')
    setSelectedAmenities([]); setPriceMin(''); setPriceMax(''); setDateFrom(''); setTimeFrom('')
  }

  const handleCardHover = useCallback((id: string | null) => setHoveredId(id), [])

  // Chips de filtros activos (para móvil)
  const activeChips = [
    sector    && { key: 'sector', label: sector, onRemove: () => clearSector() },
    dateFrom  && { key: 'date',   label: timeFrom ? `${fmtDateShort(dateFrom)} · ${fmtTime(timeFrom)}` : fmtDateShort(dateFrom), onRemove: () => { setDateFrom(''); setTimeFrom('') } },
    capacidad && { key: 'cap',    label: `${capacidad}+ personas`, onRemove: () => applyCapacity('') },
    priceMin  && { key: 'priceMin',  label: `Desde RD$${priceMin}`,   onRemove: () => setPriceMin('') },
    priceMax  && { key: 'priceMax',  label: `Hasta RD$${priceMax}`,   onRemove: () => setPriceMax('') },
    ...selectedAmenities.map(k => ({
      key: k,
      label: AMENITIES.find(a => a.key === k)?.label ?? k,
      onRemove: () => toggleAmenity(k),
    })),
  ].filter(Boolean) as { key: string; label: string; onRemove: () => void }[]

  return (
    <div style={{ background: 'var(--bg-base)', minHeight: '100dvh', overflowX: 'hidden', width: '100%' }}>

      {/* ── Barra de filtros sticky ── */}
      <div className="sticky top-16 z-40 w-full"
        style={{
          background:     'rgba(244,246,245,0.97)',
          backdropFilter: 'blur(16px)',
          borderBottom:   '1px solid var(--border-subtle)',
          boxShadow:      '0 1px 8px rgba(0,0,0,0.05)',
        }}>
        <div className="max-w-screen-2xl mx-auto px-4 md:px-6 py-3 w-full">

          {/* ── Desktop: fila única ── */}
          <div className="hidden md:flex gap-2 mb-3">
            <div className="flex-1 flex items-center gap-3 rounded-2xl px-4 py-2.5 input-base">
              <Search size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
              <input
                value={q} onChange={e => setQ(e.target.value)}
                placeholder="Salón, rooftop, restaurante, cumpleaños..."
                className="flex-1 bg-transparent text-sm focus:outline-none"
                style={{ color: 'var(--text-primary)' }}
              />
              {q && <button onClick={() => setQ('')} style={{ color: 'var(--text-muted)' }}><X size={14} /></button>}
            </div>
            <div className="flex items-center gap-2 rounded-2xl px-4 py-2.5 input-base w-40">
              <MapPin size={15} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
              <input
                value={sector} onChange={e => { setSector(e.target.value); setSectorQ(e.target.value) }}
                placeholder="Sector"
                className="w-full bg-transparent text-sm focus:outline-none"
                style={{ color: 'var(--text-primary)' }}
              />
            </div>
            <div className="relative" ref={datePickerRef}>
              <button
                onClick={openDatePicker}
                className="flex items-center gap-2 rounded-2xl px-4 py-2.5 input-base transition-all"
                style={{
                  minWidth: 186,
                  background: '#fff',
                  borderColor: datePickerOpen ? 'var(--brand)' : undefined,
                  boxShadow: datePickerOpen ? '0 0 0 3px var(--brand-dim)' : undefined,
                }}>
                {availLoading
                  ? <div className="w-[15px] h-[15px] rounded-full border-2 border-t-transparent animate-spin shrink-0" style={{ borderColor: 'var(--brand)', borderTopColor: 'transparent' }} />
                  : <CalendarDays size={15} style={{ color: dateFrom ? 'var(--brand)' : 'var(--text-muted)', flexShrink: 0 }} />
                }
                <span className="text-sm flex-1 text-left whitespace-nowrap"
                  style={{ color: dateFrom ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                  {dateFrom
                    ? (timeFrom ? `${fmtDateShort(dateFrom)} · ${fmtTime(timeFrom)}` : fmtDateShort(dateFrom))
                    : 'Fecha y hora'}
                </span>
                {dateFrom && (
                  <button onClick={e => { e.stopPropagation(); setDateFrom(''); setTimeFrom('') }}
                    className="shrink-0" style={{ color: 'var(--text-muted)' }}>
                    <X size={13} />
                  </button>
                )}
              </button>
              {datePickerOpen && (
                <div
                  ref={pickerPanelRef}
                  style={{
                    position: 'fixed',
                    top: pickerPos.top,
                    left: pickerPos.left,
                    zIndex: 9999,
                    background: '#fff',
                    borderRadius: 16,
                    border: '1px solid var(--border-subtle)',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.14)',
                    maxHeight: `calc(100dvh - ${pickerPos.top + 16}px)`,
                    overflowY: 'auto',
                    overscrollBehavior: 'contain',
                  }}>
                  <DateTimePicker
                    date={dateFrom} time={timeFrom}
                    onDate={setDateFrom}
                    onTime={t => { setTimeFrom(t); if (t) setTimeout(() => setDatePickerOpen(false), 200) }}
                    loading={availLoading}
                  />
                </div>
              )}
            </div>
            <button onClick={() => setMoreOpen(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-semibold transition-all shrink-0"
              style={{
                background:  activeFiltersCount > 0 ? 'var(--brand)' : '#fff',
                color:       activeFiltersCount > 0 ? '#fff' : 'var(--text-primary)',
                border:      '1.5px solid var(--border-medium)',
              }}>
              <SlidersHorizontal size={15} />
              Filtros
              {activeFiltersCount > 0 && (
                <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{ background: 'rgba(255,255,255,0.25)' }}>
                  {activeFiltersCount}
                </span>
              )}
            </button>
          </div>

          {/* ── Móvil: UNA sola barra limpia ── */}
          <div className="md:hidden mb-3 w-full overflow-hidden">
            <div className="flex gap-2.5 w-full">
              {/* Search input grande y cómodo */}
              <div className="flex-1 min-w-0 flex items-center gap-3 rounded-2xl px-4 py-3.5 input-base">
                <Search size={17} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                <input
                  value={q} onChange={e => setQ(e.target.value)}
                  placeholder="Salones, rooftops, eventos..."
                  className="flex-1 min-w-0 bg-transparent focus:outline-none font-medium"
                  style={{ color: 'var(--text-primary)', fontSize: 15 }}
                />
                {q && (
                  <button onClick={() => setQ('')}
                    className="w-6 h-6 flex items-center justify-center rounded-full shrink-0"
                    style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}>
                    <X size={12} />
                  </button>
                )}
              </div>
              {/* Botón Filtros — más grande y visible */}
              <button onClick={() => setMoreOpen(true)}
                className="flex items-center justify-center gap-2 px-4 rounded-2xl font-bold shrink-0 transition-all"
                style={{
                  background:  activeFiltersCount > 0 ? 'var(--brand)' : 'var(--bg-surface)',
                  color:       activeFiltersCount > 0 ? '#fff' : 'var(--text-secondary)',
                  border:      `2px solid ${activeFiltersCount > 0 ? 'var(--brand)' : 'var(--border-medium)'}`,
                  minWidth: 52,
                  minHeight: 52,
                }}>
                <SlidersHorizontal size={18} />
                {activeFiltersCount > 0 && (
                  <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-black"
                    style={{ background: 'rgba(255,255,255,0.28)' }}>
                    {activeFiltersCount}
                  </span>
                )}
              </button>
            </div>

            {/* Chips de filtros activos — solo si hay filtros */}
            {activeChips.length > 0 && (
              <div className="flex gap-2 mt-2.5 overflow-x-auto scrollbar-hide">
                {activeChips.map(chip => (
                  <button key={chip.key}
                    onClick={chip.onRemove}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-all"
                    style={{
                      background: 'var(--brand-dim)',
                      color: 'var(--brand)',
                      border: '1px solid var(--brand-border)',
                    }}>
                    {chip.label}
                    <X size={10} />
                  </button>
                ))}
                <button onClick={clearAll}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold shrink-0"
                  style={{ background: 'rgba(220,38,38,0.08)', color: '#DC2626', border: '1px solid rgba(220,38,38,0.15)' }}>
                  Limpiar todo
                </button>
              </div>
            )}
          </div>

          {/* Category pills — igual en ambos */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {CATEGORIES.map(cat => {
              const isActive = categoria === cat.value
              const Icon = cat.icon
              return (
                <button key={cat.value}
                  onClick={() => setCategoria(isActive ? '' : cat.value)}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all shrink-0"
                  style={isActive
                    ? { background: 'var(--brand)', color: '#fff', boxShadow: '0 2px 8px rgba(53,196,147,0.3)' }
                    : { background: '#fff', color: 'var(--text-secondary)', border: '1px solid var(--border-medium)' }
                  }>
                  <Icon size={13} />
                  {cat.label}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── Contenido principal ── */}
      <div className="max-w-screen-2xl mx-auto px-4 md:px-6 w-full">

        {/* Header de resultados */}
        <div className="flex items-center justify-between py-3 md:py-4">
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              {filtered.length} espacio{filtered.length !== 1 ? 's' : ''} encontrado{filtered.length !== 1 ? 's' : ''}
            </p>
            {(categoria) && (
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                {CATEGORIES.find(c => c.value === categoria)?.label}
              </p>
            )}
          </div>
          {/* Limpiar — solo desktop */}
          {activeFiltersCount > 0 && (
            <button onClick={clearAll}
              className="hidden md:flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-xl"
              style={{ color: '#DC2626', background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.15)' }}>
              <X size={12} /> Limpiar filtros
            </button>
          )}
        </div>

        {/* ── DESKTOP: Lista (60%) + Mapa (40%) ── */}
        <div
          className="hidden md:flex gap-5"
          style={{ height: 'calc(100vh - 226px)' }}
        >
          <div className="overflow-y-auto pr-2" style={{ flex: '0 0 60%' }}>
            {filtered.length === 0
              ? <EmptyState onClear={clearAll} />
              : (
                <div className="grid grid-cols-2 gap-4 pb-6">
                  {filtered.map(space => (
                    <SpaceCard key={space.id} space={space} isHovered={hoveredId === space.id}
                      onHover={handleCardHover} dateFilter={dateFrom || undefined} timeFilter={timeFrom || undefined}
                      isAvailable={dateFrom ? !blockedIds.has(space.id) : undefined} />
                  ))}
                </div>
              )
            }
          </div>
          <div style={{ flex: '0 0 40%', position: 'sticky', top: 0, height: 'calc(100vh - 226px)', borderRadius: 16, overflow: 'hidden' }}>
            <SpacesMap spaces={filtered} hoveredId={hoveredId} cityFilter={sector} onSpaceHover={handleCardHover} />
          </div>
        </div>

        {/* ── MÓVIL: Lista o Mapa ── */}
        <div className="md:hidden w-full" style={{ overflowX: 'hidden' }}>
          {mobileView === 'list' ? (
            filtered.length === 0
              ? <EmptyState onClear={clearAll} />
              : (
                <div className="grid grid-cols-1 gap-4 w-full"
                  style={{ paddingBottom: 'calc(7rem + env(safe-area-inset-bottom, 0px))' }}>
                  {filtered.map(space => (
                    <SpaceCard key={space.id} space={space} isHovered={false} onHover={() => {}}
                      dateFilter={dateFrom || undefined} timeFilter={timeFrom || undefined}
                      isAvailable={dateFrom ? !blockedIds.has(space.id) : undefined} />
                  ))}
                </div>
              )
          ) : (
            <div style={{ height: 'calc(100dvh - 290px)', borderRadius: 16, overflow: 'hidden', marginBottom: 'calc(5rem + env(safe-area-inset-bottom, 0px))' }}>
              <SpacesMap spaces={filtered} cityFilter={sector} />
            </div>
          )}
        </div>
      </div>

      {/* ── Botón flotante móvil Lista/Mapa ── */}
      <div className="md:hidden fixed left-1/2 -translate-x-1/2 z-50"
        style={{ bottom: 'calc(1.5rem + env(safe-area-inset-bottom, 0px))' }}>
        <button
          onClick={() => setMobileView(v => v === 'list' ? 'map' : 'list')}
          className="flex items-center gap-2.5 px-6 py-3.5 rounded-full text-sm font-bold text-white shadow-xl"
          style={{ background: 'var(--brand)', boxShadow: '0 4px 24px rgba(53,196,147,0.45)' }}>
          {mobileView === 'list'
            ? <><Map size={16} /> Ver mapa</>
            : <><LayoutList size={16} /> Ver lista</>
          }
        </button>
      </div>

      {/* ── PANEL DE FILTROS (drawer lateral) ── */}
      {moreOpen && (
        <>
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" onClick={() => setMoreOpen(false)} />
          <div className="fixed right-0 top-0 h-full w-full max-w-md z-50 flex flex-col overflow-hidden"
            style={{ background: '#fff', boxShadow: '-8px 0 40px rgba(0,0,0,0.12)' }}>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4"
              style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              <div>
                <h2 className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>Filtros</h2>
                {activeFiltersCount > 0 && (
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    {activeFiltersCount} activo{activeFiltersCount !== 1 ? 's' : ''}
                  </p>
                )}
              </div>
              <button onClick={() => setMoreOpen(false)}
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>
                <X size={18} />
              </button>
            </div>

            {/* Contenido scrolleable */}
            <div className="flex-1 overflow-y-auto px-5 py-5 space-y-7">

              {/* ── SECTOR / CIUDAD ── */}
              <div>
                <h3 className="font-bold text-sm mb-3" style={{ color: 'var(--text-primary)' }}>
                  Sector o ciudad
                </h3>
                <div className="relative">
                  <MapPin size={15} className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
                    style={{ color: sector ? 'var(--brand)' : 'var(--text-muted)' }} />
                  <input
                    value={sectorQ}
                    onChange={e => { setSectorQ(e.target.value); if (!e.target.value) setSector('') }}
                    placeholder="Ej: Piantini, Naco, Santiago..."
                    className="input-base w-full rounded-xl pl-10 pr-10 py-3.5 text-sm"
                    style={{ color: 'var(--text-primary)' }}
                  />
                  {sectorQ && (
                    <button onClick={clearSector}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2"
                      style={{ color: 'var(--text-muted)' }}>
                      <X size={14} />
                    </button>
                  )}
                </div>
                {/* Sugerencias rápidas */}
                <div className="flex gap-2 flex-wrap mt-2.5">
                  {filteredSectors.slice(0, 8).map(s => (
                    <button key={s} onClick={() => pickSector(s)}
                      className="px-3 py-1.5 rounded-xl text-xs font-medium transition-all"
                      style={sector === s
                        ? { background: 'var(--brand)', color: '#fff' }
                        : { background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }
                      }>
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* ── FECHA Y HORA ── */}
              <div>
                <h3 className="font-bold text-sm mb-3" style={{ color: 'var(--text-primary)' }}>
                  Fecha y hora del evento
                </h3>
                <div className="rounded-2xl overflow-hidden"
                  style={{ border: '1.5px solid var(--border-medium)' }}>
                  <DateTimePicker
                    date={dateFrom} time={timeFrom}
                    onDate={setDateFrom} onTime={setTimeFrom}
                    loading={availLoading}
                  />
                </div>
                {(dateFrom || timeFrom) && (
                  <button onClick={() => { setDateFrom(''); setTimeFrom('') }}
                    className="flex items-center gap-1.5 mt-2.5 text-xs font-medium"
                    style={{ color: '#DC2626' }}>
                    <X size={11} /> Quitar fecha y hora
                  </button>
                )}
              </div>

              {/* ── CAPACIDAD ── */}
              <div>
                <h3 className="font-bold text-sm mb-1" style={{ color: 'var(--text-primary)' }}>
                  ¿Cuántos invitados?
                </h3>
                <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
                  Espacios con esa capacidad o mayor
                </p>
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex-1 flex items-center gap-2 rounded-xl px-4 py-3.5 input-base">
                    <Users size={15} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                    <input
                      type="number" value={capacidadInput}
                      onChange={e => { setCapacidadInput(e.target.value); setCapacidad(e.target.value) }}
                      placeholder="Número de personas"
                      className="flex-1 bg-transparent text-sm focus:outline-none"
                      style={{ color: 'var(--text-primary)' }}
                    />
                    {capacidadInput && (
                      <button onClick={() => { setCapacidad(''); setCapacidadInput('') }}>
                        <X size={13} style={{ color: 'var(--text-muted)' }} />
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {QUICK_CAPACITIES.map(n => (
                    <button key={n} onClick={() => applyCapacity(String(n))}
                      className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-all"
                      style={capacidad === String(n)
                        ? { background: 'var(--brand)', color: '#fff' }
                        : { background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }
                      }>
                      {n === 150 ? '150+' : n}
                    </button>
                  ))}
                </div>
              </div>

              {/* ── TIPO DE ESPACIO ── */}
              <div>
                <h3 className="font-bold text-sm mb-3" style={{ color: 'var(--text-primary)' }}>Tipo de espacio</h3>
                <div className="grid grid-cols-2 gap-2">
                  {CATEGORIES.filter(c => c.value).map(cat => {
                    const Icon = cat.icon
                    const isActive = categoria === cat.value
                    return (
                      <button key={cat.value}
                        onClick={() => setCategoria(isActive ? '' : cat.value)}
                        className="flex items-center gap-2.5 px-3 py-3 rounded-xl text-left transition-all"
                        style={isActive
                          ? { background: 'var(--brand-dim)', color: 'var(--brand)', border: '1.5px solid var(--brand-border)' }
                          : { background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }
                        }>
                        <Icon size={14} className="shrink-0" />
                        <span className="text-xs font-medium">{cat.label}</span>
                        {isActive && <Check size={12} className="ml-auto shrink-0" />}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* ── PRECIO ── */}
              <div>
                <h3 className="font-bold text-sm mb-3" style={{ color: 'var(--text-primary)' }}>Precio (RD$)</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs mb-1.5" style={{ color: 'var(--text-muted)' }}>Mínimo</label>
                    <input type="number" value={priceMin} onChange={e => setPriceMin(e.target.value)}
                      placeholder="0" className="input-base w-full rounded-xl px-4 py-3.5 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs mb-1.5" style={{ color: 'var(--text-muted)' }}>Máximo</label>
                    <input type="number" value={priceMax} onChange={e => setPriceMax(e.target.value)}
                      placeholder="Sin límite" className="input-base w-full rounded-xl px-4 py-3.5 text-sm" />
                  </div>
                </div>
              </div>

              {/* ── CARACTERÍSTICAS ── */}
              <div>
                <h3 className="font-bold text-sm mb-3" style={{ color: 'var(--text-primary)' }}>Características</h3>
                <div className="space-y-2">
                  {AMENITIES.map(am => {
                    const isActive = selectedAmenities.includes(am.key)
                    return (
                      <button key={am.key} onClick={() => toggleAmenity(am.key)}
                        className="w-full flex items-center justify-between px-4 py-3.5 rounded-xl transition-all"
                        style={isActive
                          ? { background: 'var(--brand-dim)', border: '1.5px solid var(--brand-border)' }
                          : { background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }
                        }>
                        <span className="text-sm" style={{ color: isActive ? 'var(--brand)' : 'var(--text-primary)' }}>
                          {am.label}
                        </span>
                        <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all"
                          style={isActive
                            ? { background: 'var(--brand)', borderColor: 'var(--brand)' }
                            : { borderColor: 'var(--border-medium)' }
                          }>
                          {isActive && <Check size={11} className="text-white" />}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Footer con acciones */}
            <div className="px-5 py-4 flex gap-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
              <button onClick={clearAll}
                className="flex-1 py-3.5 rounded-2xl text-sm font-semibold btn-outline">
                Limpiar todo
              </button>
              <button onClick={() => setMoreOpen(false)}
                className="flex-1 py-3.5 rounded-2xl text-sm font-bold btn-brand">
                Ver {filtered.length} espacio{filtered.length !== 1 ? 's' : ''}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ── SpaceCard ─────────────────────────────────────────────
function SpaceCard({
  space, isHovered, onHover, dateFilter, timeFilter, isAvailable,
}: {
  space: any
  isHovered: boolean
  onHover: (id: string | null) => void
  dateFilter?: string
  timeFilter?: string
  isAvailable?: boolean
}) {
  const cover     = getCover(space)
  const priceInfo = getPriceInfo(space)
  const catLabel  = CATEGORIES.find(c => c.value === space.category)?.label ?? space.category
  const CatIcon   = CATEGORIES.find(c => c.value === space.category)?.icon ?? Building2
  const href      = dateFilter
    ? `/espacios/${space.slug}?fecha=${dateFilter}${timeFilter ? `&hora=${timeFilter}` : ''}`
    : `/espacios/${space.slug}`

  return (
    <Link href={href} className="group block">
      <div
        className="rounded-2xl overflow-hidden h-full flex flex-col"
        style={{
          background:  '#fff',
          border:      `1px solid ${isHovered ? 'rgba(53,196,147,0.5)' : 'var(--border-subtle)'}`,
          boxShadow:   isHovered ? '0 8px 32px rgba(53,196,147,0.15)' : '0 1px 4px rgba(0,0,0,0.04)',
          transform:   isHovered ? 'translateY(-3px)' : 'none',
          transition:  'transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease',
        }}
        onMouseEnter={() => onHover(space.id)}
        onMouseLeave={() => onHover(null)}
      >
        {/* Imagen */}
        <div className="relative overflow-hidden" style={{ aspectRatio: '4/3', flexShrink: 0 }}>
          {cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={cover} alt={space.name}
              className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]" />
          ) : (
            <div className="w-full h-full flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg,#667eea,#764ba2)' }}>
              <CatIcon size={36} className="text-white opacity-60" />
            </div>
          )}

          {/* Badge disponibilidad o verificado */}
          {isAvailable !== undefined ? (
            <span className="absolute top-2.5 left-2.5 flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full"
              style={{
                background: isAvailable ? 'rgba(53,196,147,0.92)' : 'rgba(220,38,38,0.85)',
                color: '#fff', backdropFilter: 'blur(8px)',
              }}>
              {isAvailable ? <Check size={9} /> : <X size={9} />}
              {isAvailable ? 'Disponible' : 'No disponible'}
            </span>
          ) : space.is_verified ? (
            <span className="absolute top-2.5 left-2.5 flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full"
              style={{ background: 'rgba(53,196,147,0.92)', color: '#fff', backdropFilter: 'blur(8px)' }}>
              <Shield size={9} /> Verificado
            </span>
          ) : null}

          {/* Precio */}
          {priceInfo && (
            <span className="absolute bottom-2.5 left-2.5 text-xs font-bold px-3 py-1.5 rounded-full"
              style={{ background: 'rgba(0,0,0,0.72)', color: '#fff', backdropFilter: 'blur(8px)' }}>
              {priceInfo.label}
            </span>
          )}

          {/* Capacidad */}
          <span className="absolute bottom-2.5 right-2.5 flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-full"
            style={{ background: 'rgba(0,0,0,0.6)', color: '#fff', backdropFilter: 'blur(8px)' }}>
            <Users size={10} /> {space.capacity_max}
          </span>
        </div>

        {/* Info */}
        <div className="p-3.5 flex flex-col flex-1">
          <h3 className="font-semibold text-sm leading-snug mb-1"
            style={{ color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
            {space.name}
          </h3>
          <div className="flex items-center gap-1.5 text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
            <MapPin size={10} />
            {space.sector ? `${space.sector}, ` : ''}{space.city}
          </div>
          <div className="mt-auto pt-2.5 flex items-center justify-between"
            style={{ borderTop: '1px solid var(--border-subtle)' }}>
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 rounded-md flex items-center justify-center"
                style={{ background: 'var(--bg-elevated)' }}>
                <CatIcon size={11} style={{ color: 'var(--text-muted)' }} />
              </div>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{catLabel}</span>
            </div>
            <ArrowRight size={14}
              className="transition-transform duration-200 group-hover:translate-x-0.5"
              style={{ color: 'var(--brand)' }} />
          </div>
        </div>
      </div>
    </Link>
  )
}

// ── DateTimePicker ────────────────────────────────────────
function DateTimePicker({
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

// ── Empty state ───────────────────────────────────────────
function EmptyState({ onClear }: { onClear: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 md:py-20 rounded-3xl text-center mx-0"
      style={{ background: '#fff', border: '2px dashed var(--border-medium)' }}>
      <Search size={32} className="mb-3" style={{ color: 'var(--text-muted)' }} />
      <h3 className="font-bold text-lg mb-2" style={{ color: 'var(--text-primary)' }}>Sin resultados</h3>
      <p className="text-sm mb-5 px-4" style={{ color: 'var(--text-secondary)' }}>
        Intenta con otros filtros o términos de búsqueda
      </p>
      <button onClick={onClear} className="btn-brand text-sm font-semibold px-5 py-3 rounded-xl">
        Limpiar búsqueda
      </button>
    </div>
  )
}
