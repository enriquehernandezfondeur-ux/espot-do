'use client'

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import {
  Search, MapPin, Users, SlidersHorizontal, X, CalendarDays, Clock,
  LayoutList, Map,
  Check, Building2, UtensilsCrossed, ChevronDown,
  Wine, Trees, Camera,
  Car, Volume2, Music2, Waves, Minus, Plus, Wifi,
  Wind, Projector, Zap, ShowerHead, MonitorPlay,
} from 'lucide-react'
import { CATEGORIES, PRICING_TYPES } from './constants'
import { formatCurrency } from '@/lib/utils'
import { SUB_ACTIVITIES, SUB_TO_BASE } from '@/lib/activities'
import { SpaceCard } from './SpaceCard'
import { DateTimePicker } from './DateTimePicker'
import { getPublishedSpaces } from '@/lib/actions/marketplace'

const SpacesMap = dynamic(() => import('@/components/map/SpacesMap'), {
  ssr:     false,
  loading: () => (
    <div className="w-full h-full rounded-2xl animate-pulse"
      style={{ background: '#E8EDE9' }} />
  ),
})

const QUICK_CAPACITIES = [20, 50, 100, 150]

// Actividades que se muestran en el homepage — deben coincidir con SUB_ACTIVITIES
// Actividades rápidas para el drawer mobile — slugs alineados con SUB_ACTIVITIES
const QUICK_ACTIVITIES = [
  { slug: 'cumpleanos',         label: 'Cumpleaños'    },
  { slug: 'boda',               label: 'Boda'          },
  { slug: 'evento-corporativo', label: 'Corporativo'   },
  { slug: 'graduacion',         label: 'Graduación'    },
  { slug: 'quinceanera',        label: 'Quinceañera'   },
  { slug: 'baby-shower',        label: 'Baby Shower'   },
  { slug: 'sesion-fotos',       label: 'Sesión fotos'  },
  { slug: 'team-building',      label: 'Team Building' },
  { slug: 'networking',         label: 'Networking'    },
  { slug: 'reunion-trabajo',    label: 'Reunión'       },
]

const AMENITIES = [
  { key: 'allows_external_decoration', label: 'Permite decoración externa' },
  { key: 'allows_external_food',       label: 'Permite comida externa' },
  { key: 'allows_external_alcohol',    label: 'Permite alcohol externo' },
  { key: 'verified',                   label: 'Espacio verificado' },
]

const FACILITIES: { key: string; label: string; icon: React.ElementType; dbField: string; isCount?: boolean }[] = [
  { key: 'has_parking',       label: 'Parking',            icon: Car,             dbField: 'has_parking' },
  { key: 'has_valet_parking', label: 'Valet parking',      icon: Car,             dbField: 'has_valet_parking' },
  { key: 'has_wifi',          label: 'WiFi',               icon: Wifi,            dbField: 'has_wifi' },
  { key: 'has_ac',            label: 'Aire acondicionado', icon: Wind,            dbField: 'has_ac' },
  { key: 'has_kitchen',       label: 'Cocina equipada',    icon: UtensilsCrossed, dbField: 'has_kitchen' },
  { key: 'has_sound_system',  label: 'Sistema de sonido',  icon: Volume2,         dbField: 'has_sound_system' },
  { key: 'has_projector',     label: 'Proyector',          icon: Projector,       dbField: 'has_projector' },
  { key: 'has_dance_floor',   label: 'Pista de baile',     icon: Music2,          dbField: 'has_dance_floor' },
  { key: 'has_outdoor_area',  label: 'Área exterior',      icon: Trees,           dbField: 'has_outdoor_area' },
  { key: 'has_pool',          label: 'Piscina',            icon: Waves,           dbField: 'has_pool' },
  { key: 'has_bar',           label: 'Barra de bar',       icon: Wine,            dbField: 'has_bar' },
  { key: 'has_stage',         label: 'Escenario',          icon: MonitorPlay,     dbField: 'has_stage' },
  { key: 'has_generator',     label: 'Planta eléctrica',   icon: Zap,             dbField: 'has_generator' },
  { key: 'has_dressing_room', label: 'Camerino',           icon: ShowerHead,      dbField: 'has_dressing_room' },
  { key: 'has_cyclorama',     label: 'Ciclorama',          icon: Camera,          dbField: 'has_cyclorama' },
  { key: 'chairs_count',      label: 'Sillas incluidas',   icon: Users,           dbField: 'chairs_count',    isCount: true },
  { key: 'tables_count',      label: 'Mesas incluidas',    icon: Building2,       dbField: 'tables_count',    isCount: true },
  { key: 'bathrooms_count',   label: 'Baños privados',     icon: ShowerHead,      dbField: 'bathrooms_count', isCount: true },
]

const SECTORS = [
  // ── Santo Domingo (sectores) ──
  'Piantini','Naco','Bella Vista','Evaristo Morales','Arroyo Hondo',
  'Gazcue','Zona Colonial','Los Prados','Serrallés','Esperilla',
  'Los Cacicazgos','Mirador Norte','Ciudad Nueva','La Julia','Paraíso',
  'Renacimiento','Fernández','La Castellana','Urbanización Real',
  'Miraflores','Alma Rosa','Ensanche Ozama','Los Mameyes',
  'Mirador Sur','Los Ríos','Jardines del Sur','El Millón',
  'Santo Domingo Este','Santo Domingo Norte','Santo Domingo Oeste',
  // ── Otras ciudades ──
  'Santiago','Puerto Plata','La Romana','Punta Cana',
  'Boca Chica','Juan Dolio','Las Terrenas','Samaná',
  'Higüey','San Pedro de Macorís','San Cristóbal',
  'La Vega','Jarabacoa','Constanza',
  'Sosúa','Cabarete','Cotuí','Moca',
  'Cap Cana','Bayahíbe','Cabrera',
  'Bonao','Nagua','Monte Cristi',
]

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

const PAGE_SIZE = 100

export default function BuscarClient({ spaces: initialSpaces, initialParams }: Props) {
  // Acumulación de páginas: inicialmente los espacios cargados en el servidor
  const [spaces,       setSpaces]       = useState<any[]>(initialSpaces ?? [])
  const [currentPage,  setCurrentPage]  = useState(0)
  const [hasMore,      setHasMore]      = useState((initialSpaces ?? []).length === PAGE_SIZE)
  const [loadingMore,  setLoadingMore]  = useState(false)
  const [activity,       setActivity]       = useState(initialParams.activity ?? '')
  const [actQ,           setActQ]           = useState('')
  const [actOpen,        setActOpen]        = useState(false)
  const actRef = useRef<HTMLDivElement>(null)
  const [q,              setQ]              = useState(initialParams.q ?? '')
  const [sector,         setSector]         = useState(initialParams.sector ?? '')
  const [sectorQ,        setSectorQ]        = useState(initialParams.sector ?? '')
  const [categoria,      setCategoria]      = useState(initialParams.categoria ?? '')
  const [capacidad,      setCapacidad]      = useState(initialParams.capacidad ?? '')
  const [capacidadInput, setCapacidadInput] = useState(initialParams.capacidad ?? '')
  const [dateFrom,       setDateFrom]       = useState(initialParams.dateFrom ?? '')
  const [timeFrom,       setTimeFrom]       = useState(initialParams.timeFrom ?? '')
  const [datePickerOpen, setDatePickerOpen] = useState(false)
  const datePickerRef  = useRef<HTMLDivElement>(null)
  const [priceMin,       setPriceMin]       = useState('')
  const [priceMax,       setPriceMax]       = useState('')
  const [selectedAmenities,   setSelectedAmenities]   = useState<string[]>([])
  const [selectedFacilities,  setSelectedFacilities]  = useState<string[]>([])
  const [pricingFilter,       setPricingFilter]       = useState('')
  const [moreOpen,       setMoreOpen]       = useState(false)
  const [drawerFocus,    setDrawerFocus]    = useState<string | null>(null)
  const drawerContentRef = useRef<HTMLDivElement>(null)

  async function loadMore() {
    if (loadingMore || !hasMore) return
    setLoadingMore(true)
    const nextPage = currentPage + 1
    try {
      // Pasar los mismos filtros activos para que la paginación sea coherente
      const newSpaces = await getPublishedSpaces({
        page:         nextPage,
        pageSize:     PAGE_SIZE,
        category:     categoria || undefined,
        sector:       sector || undefined,
        search:       q || undefined,
        activity:     activity || undefined,
        capacity:     capacidad ? parseInt(capacidad) : undefined,
        dateFrom:     dateFrom || undefined,
        dateTo:       dateFrom || undefined,
      })
      setSpaces(prev => [...prev, ...newSpaces])
      setCurrentPage(nextPage)
      setHasMore(newSpaces.length === PAGE_SIZE)
    } finally {
      setLoadingMore(false)
    }
  }

  function openDrawer(section?: string) {
    setMoreOpen(true)
    if (section) setDrawerFocus(section)
  }
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
      .catch((err) => { if (err?.name !== 'AbortError') setAvailLoading(false) })
    return () => controller.abort()
  }, [dateFrom, timeFrom])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') { setDatePickerOpen(false); setMoreOpen(false) }
    }
    if (datePickerOpen || moreOpen) document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [datePickerOpen, moreOpen])

  useEffect(() => {
    function onScroll() {
      setCatOpen(false)
      setCapOpen(false)
      setSecOpen(false)
      setPriceOpen(false)
      setSortOpen(false)
      setDatePickerOpen(false)
      setActOpen(false)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Scroll al section del drawer cuando se abre con foco
  useEffect(() => {
    if (!moreOpen || !drawerFocus || !drawerContentRef.current) return
    // Pequeño delay para que el drawer termine de montar
    const timer = setTimeout(() => {
      const el = drawerContentRef.current?.querySelector(`[data-section="${drawerFocus}"]`) as HTMLElement | null
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      setDrawerFocus(null)
    }, 120)
    return () => clearTimeout(timer)
  }, [moreOpen, drawerFocus])


  // Bloquear scroll cuando el drawer de filtros está abierto
  useEffect(() => {
    if (moreOpen) document.body.style.overflow = 'hidden'
    else          document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [moreOpen])

  const [recentIds, setRecentIds] = useState<string[]>([])
  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('espot_recent') ?? '[]')
      if (Array.isArray(stored)) setRecentIds(stored.slice(0, 6))
    } catch {}
  }, [])

  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [mobileView, setMobileView] = useState<'list' | 'map'>('list')
  const [sortBy, setSortBy] = useState<'relevancia' | 'precio_asc' | 'precio_desc' | 'capacidad'>('relevancia')
  const [sortOpen, setSortOpen] = useState(false)
  const [capOpen,   setCapOpen]   = useState(false)
  const [secOpen,   setSecOpen]   = useState(false)
  const [catOpen,   setCatOpen]   = useState(false)
  const [priceOpen, setPriceOpen] = useState(false)
  const capRef      = useRef<HTMLDivElement>(null)
  const secRef      = useRef<HTMLDivElement>(null)
  const priceRef    = useRef<HTMLDivElement>(null)
  const cardStripRef = useRef<HTMLDivElement>(null)

  // Sectores filtrados por búsqueda en el drawer
  const filteredSectors = SECTORS.filter(s =>
    !sectorQ || s.toLowerCase().includes(sectorQ.toLowerCase())
  )

  const filtered = useMemo(() => {
    let result = [...spaces]
    if (q) {
      const ql = q.toLowerCase()
      // Actividades que coinciden con el texto escrito
      const actMatch = SUB_ACTIVITIES.find(a =>
        a.label.toLowerCase().includes(ql) || a.key.replace('-', ' ').includes(ql)
      )
      const actBase = actMatch ? actMatch.base : null
      result = result.filter(s =>
        s.name?.toLowerCase().includes(ql) ||
        s.description?.toLowerCase().includes(ql) ||
        s.category?.toLowerCase().includes(ql) ||
        s.sector?.toLowerCase().includes(ql) ||
        (actBase && (
          s.primary_activity === actBase ||
          (Array.isArray(s.secondary_activities) && s.secondary_activities.includes(actBase))
        )),
      )
    }
    if (activity) {
      const base = SUB_TO_BASE[activity] ?? activity
      result = result.filter(s =>
        s.primary_activity === base ||
        (Array.isArray(s.secondary_activities) && s.secondary_activities.includes(base))
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
        // Precio normalizado: para hourly, multiplica por mínimo de horas (o 1h si no hay mínimo)
        // para que la comparación sea equivalente a lo que el cliente pagaría mínimo
        const normalizedPrice: number | null =
          p.pricing_type === 'hourly'
            ? (p.hourly_price ?? 0) * (p.min_hours ?? 1)
          : p.pricing_type === 'minimum_consumption'
            ? p.minimum_consumption
          : p.pricing_type === 'fixed_package'
            ? p.fixed_price
          : null
        if (normalizedPrice === null) return true
        if (priceMin && normalizedPrice < parseInt(priceMin)) return false
        if (priceMax && normalizedPrice > parseInt(priceMax)) return false
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
    if (selectedFacilities.length > 0) {
      result = result.filter(s => {
        const cond = s.space_conditions?.[0]
        if (!cond) return false
        return selectedFacilities.every(fk => {
          const fac = FACILITIES.find(f => f.key === fk)
          if (!fac) return true
          return fac.isCount ? (cond[fac.dbField] ?? 0) > 0 : cond[fac.dbField] === true
        })
      })
    }
    if (pricingFilter) {
      result = result.filter(s => {
        const p = s.space_pricing?.find((x: any) => x.is_active) ?? s.space_pricing?.[0]
        return p?.pricing_type === pricingFilter
      })
    }
    // Ordenar
    if (sortBy === 'precio_asc' || sortBy === 'precio_desc') {
      result.sort((a, b) => {
        const getPrice = (s: any) => {
          const p = s.space_pricing?.find((x: any) => x.is_active) ?? s.space_pricing?.[0]
          if (!p) return 0
          if (p.pricing_type === 'hourly') return (p.hourly_price ?? 0) * (p.min_hours ?? 1)
          return p.minimum_consumption ?? p.fixed_price ?? p.hourly_price ?? 0
        }
        return sortBy === 'precio_asc' ? getPrice(a) - getPrice(b) : getPrice(b) - getPrice(a)
      })
    } else if (sortBy === 'capacidad') {
      result.sort((a, b) => (b.capacity_max ?? 0) - (a.capacity_max ?? 0))
    }

    return result
  }, [spaces, q, activity, categoria, sector, capacidad, priceMin, priceMax, selectedAmenities, selectedFacilities, pricingFilter, sortBy])

  function applyCapacity(val: string) {
    setCapacidad(val); setCapacidadInput(val)
  }
  function stepCapacity(delta: number) {
    const current = parseInt(capacidadInput || '0')
    const next = Math.max(0, current + delta)
    applyCapacity(next === 0 ? '' : String(next))
  }
  function toggleAmenity(key: string) {
    setSelectedAmenities(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key],
    )
  }
  function toggleFacility(key: string) {
    setSelectedFacilities(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key],
    )
  }
  function pickSector(s: string) {
    setSector(s); setSectorQ(s)
  }
  function clearSector() {
    setSector(''); setSectorQ('')
  }

  function closeAllDropdowns() {
    setCatOpen(false); setActOpen(false); setCapOpen(false)
    setSecOpen(false); setPriceOpen(false); setSortOpen(false); setDatePickerOpen(false)
  }

  const activeFiltersCount = [
    activity, categoria, sector, capacidad, dateFrom, pricingFilter, ...selectedAmenities, ...selectedFacilities, priceMin, priceMax,
  ].filter(Boolean).length

  function clearAll() {
    closeAllDropdowns()
    setActQ(''); setQ(''); setActivity(''); setSector(''); setSectorQ(''); setCategoria(''); setCapacidad(''); setCapacidadInput('')
    setSelectedAmenities([]); setSelectedFacilities([]); setPricingFilter(''); setPriceMin(''); setPriceMax(''); setDateFrom(''); setTimeFrom('')
  }

  const handleCardHover = useCallback((id: string | null) => setHoveredId(id), [])

  // Chips de filtros activos (para móvil)
  const activityLabel = activity
    ? (QUICK_ACTIVITIES.find(a => a.slug === activity)?.label ?? SUB_ACTIVITIES.find(a => a.key === activity)?.label ?? activity)
    : ''

  const categoriaLabel = CATEGORIES.find(c => c.value === categoria)?.label ?? ''

  const activeChips = [
    activity  && { key: 'activity',  label: activityLabel,  onRemove: () => setActivity('') },
    categoria && { key: 'categoria', label: categoriaLabel, onRemove: () => setCategoria('') },
    sector    && { key: 'sector',    label: sector,         onRemove: () => clearSector() },
    dateFrom  && { key: 'date',   label: timeFrom ? `${fmtDateShort(dateFrom)} · ${fmtTime(timeFrom)}` : fmtDateShort(dateFrom), onRemove: () => { setDateFrom(''); setTimeFrom('') } },
    capacidad && { key: 'cap',    label: `${capacidad}+ personas`, onRemove: () => applyCapacity('') },
    priceMin  && { key: 'priceMin',  label: `Desde ${formatCurrency(parseInt(priceMin))}`,   onRemove: () => setPriceMin('') },
    priceMax  && { key: 'priceMax',  label: `Hasta ${formatCurrency(parseInt(priceMax))}`,   onRemove: () => setPriceMax('') },
    ...selectedAmenities.map(k => ({
      key: k,
      label: AMENITIES.find(a => a.key === k)?.label ?? k,
      onRemove: () => toggleAmenity(k),
    })),
    ...selectedFacilities.map(k => ({
      key: `fac_${k}`,
      label: FACILITIES.find(f => f.key === k)?.label ?? k,
      onRemove: () => toggleFacility(k),
    })),
    pricingFilter && {
      key: 'pricing',
      label: PRICING_TYPES.find(p => p.value === pricingFilter)?.label ?? pricingFilter,
      onRemove: () => setPricingFilter(''),
    },
  ].filter(Boolean) as { key: string; label: string; onRemove: () => void }[]

  return (
    <div className="white-theme" style={{ background: 'var(--bg-base)', minHeight: '100dvh', width: '100%' }}>

      {/* ── Barra de filtros sticky ── */}
      <div className="sticky top-16 z-40 w-full"
        style={{
          background:     '#F4F6F5',
          backdropFilter: 'blur(16px)',
          borderBottom:   '1px solid var(--border-subtle)',
          boxShadow:      '0 1px 8px rgba(0,0,0,0.05)',
        }}>
        <div className="max-w-screen-2xl mx-auto px-4 md:px-6 py-3 w-full">

          {/* ── Desktop: filtros ── */}
          <div className="hidden md:flex items-center gap-2">

              {/* Búsqueda de texto — filtra en tiempo real */}
              <div className="flex items-center gap-2 rounded-xl px-3.5 py-2 shrink-0"
                style={{
                  background: '#fff',
                  border: `1.5px solid ${q ? 'var(--brand-border)' : 'var(--border-medium)'}`,
                  width: 220,
                }}>
                <Search size={14} style={{ color: q ? 'var(--brand)' : 'var(--text-muted)', flexShrink: 0 }} />
                <input
                  value={q}
                  onChange={e => setQ(e.target.value)}
                  placeholder="Buscar espacios..."
                  className="flex-1 min-w-0 bg-transparent focus:outline-none text-sm"
                  style={{ color: 'var(--text-primary)' }}
                />
                {q && (
                  <button onClick={() => setQ('')} className="shrink-0">
                    <X size={10} style={{ color: 'var(--text-muted)' }} />
                  </button>
                )}
              </div>

              <div className="w-px h-5 shrink-0" style={{ background: 'var(--border-medium)' }} />

              {/* Tipo de espacio */}
              <div className="relative">
                {catOpen && <div className="fixed inset-0 z-40" onClick={() => setCatOpen(false)} />}
                <button onClick={() => { const o = catOpen; closeAllDropdowns(); setCatOpen(!o) }}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap"
                  style={{
                    background: categoria ? 'var(--brand-dim)' : '#fff',
                    border: `1.5px solid ${categoria ? 'var(--brand-border)' : 'var(--border-medium)'}`,
                    color: categoria ? 'var(--brand)' : 'var(--text-primary)',
                  }}>
                  {(() => { const cat = CATEGORIES.find(c => c.value === categoria); const Icon = cat?.icon ?? LayoutList; return <Icon size={14} style={{ flexShrink: 0 }} /> })()}
                  <span>{categoria ? CATEGORIES.find(c => c.value === categoria)?.label : 'Tipo de espacio'}</span>
                  {categoria
                    ? <button onClick={e => { e.stopPropagation(); setCategoria('') }}><X size={12} /></button>
                    : <ChevronDown size={13} style={{ opacity: 0.5 }} />
                  }
                </button>
                {catOpen && (
                  <div className="absolute left-0 top-full mt-2 z-50 rounded-2xl overflow-hidden py-1.5"
                    style={{ background: '#fff', border: '1px solid var(--border-subtle)', boxShadow: '0 8px 32px rgba(0,0,0,0.12)', minWidth: 200 }}>
                    {CATEGORIES.map(cat => {
                      const Icon = cat.icon
                      const isActive = categoria === cat.value
                      return (
                        <button key={cat.value} onClick={() => { setCategoria(isActive ? '' : cat.value); setCatOpen(false) }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-all"
                          style={{ color: isActive ? 'var(--brand)' : 'var(--text-primary)', fontWeight: isActive ? 600 : 400 }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-elevated)' }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}>
                          <Icon size={14} style={{ color: isActive ? 'var(--brand)' : 'var(--text-muted)', flexShrink: 0 }} />
                          {cat.label}
                          {isActive && <Check size={13} style={{ color: 'var(--brand)', marginLeft: 'auto' }} />}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>

              <div className="w-px h-5 shrink-0" style={{ background: 'var(--border-medium)' }} />

              {/* Tipo de evento */}
              <div className="relative" ref={actRef}>
                {actOpen && <div className="fixed inset-0 z-40" onClick={() => { setActOpen(false); setActQ('') }} />}
                <button onClick={() => { const o = actOpen; closeAllDropdowns(); setActOpen(!o); if (actOpen) setActQ('') }}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap"
                  style={{
                    background: activity ? 'var(--brand-dim)' : '#fff',
                    border: `1.5px solid ${activity ? 'var(--brand-border)' : 'var(--border-medium)'}`,
                    color: activity ? 'var(--brand)' : 'var(--text-primary)',
                  }}>
                  <LayoutList size={14} style={{ flexShrink: 0 }} />
                  <span>{activityLabel || 'Tipo de evento'}</span>
                  {activity
                    ? <button onClick={e => { e.stopPropagation(); setActivity(''); setActQ('') }}><X size={12} /></button>
                    : <ChevronDown size={13} style={{ opacity: 0.5 }} />
                  }
                </button>
                {actOpen && (
                  <div className="absolute left-0 top-full mt-2 z-50 rounded-2xl overflow-hidden"
                    style={{ background: '#fff', border: '1px solid var(--border-subtle)', boxShadow: '0 8px 32px rgba(0,0,0,0.12)', width: 260 }}>
                    {/* Input búsqueda */}
                    <div className="p-3 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
                      <div className="flex items-center gap-2 rounded-xl px-3 py-2 input-base">
                        <Search size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                        <input
                          value={actQ} autoFocus
                          onChange={e => setActQ(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter' && actQ.trim()) {
                              setQ(actQ.trim()); setActivity(''); setActQ(''); setActOpen(false)
                            }
                          }}
                          placeholder="Ej: bautizo, afterwork..."
                          className="flex-1 bg-transparent text-sm focus:outline-none"
                          style={{ color: 'var(--text-primary)', fontSize: 16 }}
                        />
                        {actQ && <button onClick={() => setActQ('')} style={{ color: 'var(--text-muted)' }}><X size={11} /></button>}
                      </div>
                    </div>
                    {/* Lista plana ordenada por popularidad */}
                    <div style={{ maxHeight: 280, overflowY: 'auto' }}>
                      {(actQ
                        ? SUB_ACTIVITIES.filter(a => a.label.toLowerCase().includes(actQ.toLowerCase()))
                        : QUICK_ACTIVITIES.map(q => ({ key: q.slug, label: q.label }))
                      ).map(a => {
                          const isActive = activity === a.key
                          return (
                            <button key={a.key} onClick={() => { setActivity(isActive ? '' : a.key); setActQ(''); setActOpen(false) }}
                              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-all text-left"
                              style={{ color: isActive ? 'var(--brand)' : 'var(--text-primary)', fontWeight: isActive ? 600 : 400 }}
                              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-elevated)' }}
                              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}>
                              <LayoutList size={11} style={{ color: isActive ? 'var(--brand)' : 'var(--text-muted)', flexShrink: 0 }} />
                              {a.label}
                              {isActive && <Check size={13} style={{ color: 'var(--brand)', marginLeft: 'auto' }} />}
                            </button>
                          )
                        })}
                      {/* Opción búsqueda personalizada */}
                      {actQ.trim() && !SUB_ACTIVITIES.some(a => a.label.toLowerCase() === actQ.toLowerCase()) && (
                        <button
                          onClick={() => { setQ(actQ.trim()); setActivity(''); setActQ(''); setActOpen(false) }}
                          className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-all text-left border-t"
                          style={{ color: 'var(--brand)', borderColor: 'var(--border-subtle)' }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-elevated)' }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}>
                          <Search size={12} style={{ flexShrink: 0 }} />
                          Buscar "{actQ.trim()}"
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="w-px h-5 shrink-0" style={{ background: 'var(--border-medium)' }} />

              {/* Personas */}
              <div className="relative" ref={capRef}>
                {capOpen && <div className="fixed inset-0 z-40" onClick={() => setCapOpen(false)} />}
                <button onClick={() => { const o = capOpen; closeAllDropdowns(); setCapOpen(!o) }}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all"
                  style={{
                    background: capacidad ? 'var(--brand-dim)' : '#fff',
                    border: `1.5px solid ${capacidad ? 'var(--brand-border)' : 'var(--border-medium)'}`,
                    color: capacidad ? 'var(--brand)' : 'var(--text-primary)',
                  }}>
                  <Users size={14} style={{ flexShrink: 0 }} />
                  <span>{capacidad ? `${capacidad}+ personas` : 'Personas'}</span>
                  {capacidad
                    ? <button onClick={e => { e.stopPropagation(); applyCapacity('') }}><X size={12} /></button>
                    : <ChevronDown size={13} style={{ opacity: 0.5 }} />
                  }
                </button>
                {capOpen && (
                  <div className="absolute left-0 top-full mt-2 z-50 rounded-2xl p-4"
                    style={{ background: '#fff', border: '1px solid var(--border-subtle)', boxShadow: '0 8px 32px rgba(0,0,0,0.12)', width: 280 }}>
                    <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>
                      Mínimo de personas
                    </p>
                    {/* Stepper — igual que BookingWidget paso 2 */}
                    <div className="flex items-stretch gap-0 rounded-2xl overflow-hidden mb-3"
                      style={{ border: '1.5px solid var(--border-medium)' }}>
                      <button onClick={() => stepCapacity(-10)}
                        className="w-14 flex items-center justify-center transition-colors shrink-0"
                        style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)' }}>
                        <Minus size={18} />
                      </button>
                      <div className="flex-1 flex flex-col items-center justify-center py-3 border-x"
                        style={{ borderColor: 'var(--border-medium)' }}>
                        <input
                          type="number" value={capacidadInput}
                          onChange={e => { setCapacidadInput(e.target.value); setCapacidad(e.target.value) }}
                          placeholder="0"
                          className="text-2xl font-bold text-center bg-transparent focus:outline-none w-20 tabular-nums"
                          style={{ color: 'var(--text-primary)', fontSize: 16 }}
                        />
                        <span className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>personas</span>
                      </div>
                      <button onClick={() => stepCapacity(+10)}
                        className="w-14 flex items-center justify-center transition-colors shrink-0"
                        style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)' }}>
                        <Plus size={18} />
                      </button>
                    </div>
                    {/* Quick presets */}
                    <div className="grid grid-cols-4 gap-1.5">
                      {QUICK_CAPACITIES.map(n => (
                        <button key={n} onClick={() => { applyCapacity(String(n)); setCapOpen(false) }}
                          className="py-2 rounded-xl text-xs font-semibold transition-all"
                          style={capacidad === String(n)
                            ? { background: 'var(--brand)', color: '#fff' }
                            : { background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }
                          }>
                          {n === 150 ? '150+' : n}
                        </button>
                      ))}
                    </div>
                    {capacidad && (
                      <button onClick={() => { applyCapacity(''); setCapOpen(false) }}
                        className="flex items-center gap-1 mt-3 text-xs font-medium mx-auto"
                        style={{ color: '#DC2626' }}>
                        <X size={10} /> Quitar filtro
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Sector / Ciudad */}
              <div className="relative" ref={secRef}>
                {secOpen && <div className="fixed inset-0 z-40" onClick={() => { setSecOpen(false); setSectorQ(sector) }} />}
                <button onClick={() => { const o = secOpen; closeAllDropdowns(); setSecOpen(!o); if (!secOpen) setSectorQ(sector) }}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all"
                  style={{
                    background: sector ? 'var(--brand-dim)' : '#fff',
                    border: `1.5px solid ${sector ? 'var(--brand-border)' : 'var(--border-medium)'}`,
                    color: sector ? 'var(--brand)' : 'var(--text-primary)',
                  }}>
                  <MapPin size={14} style={{ flexShrink: 0 }} />
                  <span className="max-w-[120px] truncate">{sector || 'Dónde'}</span>
                  {sector
                    ? <button onClick={e => { e.stopPropagation(); clearSector(); setSecOpen(false) }}><X size={12} /></button>
                    : <ChevronDown size={13} style={{ opacity: 0.5 }} />
                  }
                </button>
                {secOpen && (
                  <div className="absolute left-0 top-full mt-2 z-50 rounded-2xl overflow-hidden"
                    style={{ background: '#fff', border: '1px solid var(--border-subtle)', boxShadow: '0 8px 32px rgba(0,0,0,0.12)', width: 260 }}>
                    <div className="p-3 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
                      <div className="flex items-center gap-2 rounded-xl px-3 py-2 input-base">
                        <Search size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                        <input
                          value={sectorQ} autoFocus
                          onChange={e => { setSectorQ(e.target.value); setSector('') }}
                          placeholder="Buscar sector o ciudad..."
                          className="flex-1 bg-transparent text-sm focus:outline-none"
                          style={{ color: 'var(--text-primary)', fontSize: 16 }}
                        />
                      </div>
                    </div>
                    <div style={{ maxHeight: 220, overflowY: 'auto' }}>
                      {filteredSectors.slice(0, 20).map(s => (
                        <button key={s} onClick={() => { pickSector(s); setSecOpen(false) }}
                          className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-all text-left"
                          style={{ color: sector === s ? 'var(--brand)' : 'var(--text-primary)', fontWeight: sector === s ? 600 : 400 }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-elevated)' }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}>
                          <MapPin size={12} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                          {s}
                          {sector === s && <Check size={13} style={{ color: 'var(--brand)', marginLeft: 'auto' }} />}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Fecha */}
              <div className="relative" ref={datePickerRef}>
                <button onClick={() => { const o = datePickerOpen; closeAllDropdowns(); setDatePickerOpen(!o) }}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all"
                  style={{
                    background: dateFrom ? 'var(--brand-dim)' : '#fff',
                    border: `1.5px solid ${dateFrom || datePickerOpen ? 'var(--brand-border)' : 'var(--border-medium)'}`,
                    color: dateFrom ? 'var(--brand)' : 'var(--text-primary)',
                  }}>
                  {availLoading
                    ? <div className="w-3.5 h-3.5 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'var(--brand)', borderTopColor: 'transparent' }} />
                    : <CalendarDays size={14} style={{ flexShrink: 0 }} />
                  }
                  <span>{dateFrom ? (timeFrom ? `${fmtDateShort(dateFrom)} · ${fmtTime(timeFrom)}` : fmtDateShort(dateFrom)) : 'Fecha'}</span>
                  {dateFrom
                    ? <button onClick={e => { e.stopPropagation(); setDateFrom(''); setTimeFrom('') }}><X size={12} /></button>
                    : <ChevronDown size={13} style={{ opacity: 0.5 }} />
                  }
                </button>
                {datePickerOpen && (
                  <>
                    <div className="fixed inset-0 z-[9998]" onClick={() => setDatePickerOpen(false)} />
                    <div className="absolute top-full mt-2 z-[9999]"
                      style={{
                        right: 0,
                        background: '#fff', borderRadius: 16,
                        border: '1px solid var(--border-subtle)',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.14)',
                        maxHeight: 'calc(100dvh - 200px)', overflowY: 'auto',
                      }}>
                      <DateTimePicker date={dateFrom} time={timeFrom} onDate={setDateFrom}
                        onTime={t => { setTimeFrom(t); if (t) setTimeout(() => setDatePickerOpen(false), 200) }}
                        loading={availLoading} />
                    </div>
                  </>
                )}
              </div>

              {/* Tipo de precio */}
              <div className="relative" ref={priceRef}>
                {priceOpen && <div className="fixed inset-0 z-40" onClick={() => setPriceOpen(false)} />}
                <button onClick={() => { const o = priceOpen; closeAllDropdowns(); setPriceOpen(!o) }}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap"
                  style={{
                    background: pricingFilter ? (PRICING_TYPES.find(p => p.value === pricingFilter)?.bg ?? 'var(--brand-dim)') : '#fff',
                    border: `1.5px solid ${pricingFilter ? (PRICING_TYPES.find(p => p.value === pricingFilter)?.border ?? 'var(--brand-border)') : 'var(--border-medium)'}`,
                    color: pricingFilter ? (PRICING_TYPES.find(p => p.value === pricingFilter)?.text ?? 'var(--brand)') : 'var(--text-primary)',
                  }}>
                  <Clock size={14} style={{ flexShrink: 0 }} />
                  <span>{pricingFilter ? PRICING_TYPES.find(p => p.value === pricingFilter)?.label : 'Tipo de reserva'}</span>
                  {pricingFilter
                    ? <button onClick={e => { e.stopPropagation(); setPricingFilter('') }}><X size={12} /></button>
                    : <ChevronDown size={13} style={{ opacity: 0.5 }} />
                  }
                </button>
                {priceOpen && (
                  <div className="absolute left-0 top-full mt-2 z-50 rounded-2xl overflow-hidden py-1.5"
                    style={{ background: '#fff', border: '1px solid var(--border-subtle)', boxShadow: '0 8px 32px rgba(0,0,0,0.12)', minWidth: 220 }}>
                    <p className="px-4 py-2 text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                      ¿Cómo prefieres pagar?
                    </p>
                    {PRICING_TYPES.filter(p => p.value).map(pt => {
                      const Icon = pt.icon
                      const isActive = pricingFilter === pt.value
                      return (
                        <button key={pt.value} onClick={() => { setPricingFilter(isActive ? '' : pt.value); setPriceOpen(false) }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-all"
                          style={{ color: isActive ? pt.text : 'var(--text-primary)', fontWeight: isActive ? 600 : 400 }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-elevated)' }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}>
                          <span className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
                            style={{ background: pt.bg, border: `1px solid ${pt.border}` }}>
                            {Icon && <Icon size={12} style={{ color: pt.text }} />}
                          </span>
                          {pt.label}
                          {isActive && <Check size={13} style={{ color: pt.text, marginLeft: 'auto' }} />}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Sort + Más filtros — agrupados al final */}
              <div className="flex items-center gap-1.5 ml-auto">

                {/* Ordenar */}
                <div className="relative">
                  {sortOpen && <div className="fixed inset-0 z-40" onClick={() => setSortOpen(false)} />}
                  <button onClick={() => { const o = sortOpen; closeAllDropdowns(); setSortOpen(!o) }}
                    className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium transition-all"
                    style={{
                      background: sortBy !== 'relevancia' ? 'var(--brand-dim)' : '#fff',
                      border: `1.5px solid ${sortBy !== 'relevancia' ? 'var(--brand-border)' : 'var(--border-medium)'}`,
                      color: sortBy !== 'relevancia' ? 'var(--brand)' : 'var(--text-primary)',
                    }}>
                    <SlidersHorizontal size={13} />
                    {sortBy === 'relevancia' ? 'Ordenar' : sortBy === 'precio_asc' ? 'Precio ↑' : sortBy === 'precio_desc' ? 'Precio ↓' : 'Capacidad'}
                  </button>
                  {sortOpen && (
                    <div className="absolute right-0 top-full mt-2 z-50 rounded-2xl overflow-hidden"
                      style={{ background: '#fff', border: '1px solid var(--border-subtle)', boxShadow: '0 8px 32px rgba(0,0,0,0.12)', minWidth: 210 }}>
                      {[
                        { value: 'relevancia',  label: 'Relevancia',            sub: 'Orden por defecto' },
                        { value: 'precio_asc',  label: 'Precio: menor a mayor', sub: 'Más económicos primero' },
                        { value: 'precio_desc', label: 'Precio: mayor a menor', sub: 'Más premium primero' },
                        { value: 'capacidad',   label: 'Mayor capacidad',        sub: 'Más personas primero' },
                      ].map(opt => (
                        <button key={opt.value}
                          onClick={() => { setSortBy(opt.value as typeof sortBy); setSortOpen(false) }}
                          className="w-full flex items-center justify-between px-4 py-3 text-left"
                          style={{ borderBottom: '1px solid var(--border-subtle)' }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-elevated)' }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}>
                          <div>
                            <p className="text-xs font-semibold" style={{ color: sortBy === opt.value ? 'var(--brand)' : 'var(--text-primary)' }}>{opt.label}</p>
                            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{opt.sub}</p>
                          </div>
                          {sortBy === opt.value && <Check size={13} style={{ color: 'var(--brand)' }} />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Más filtros */}
                <button onClick={() => setMoreOpen(true)}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium transition-all"
                  style={{
                    background: activeFiltersCount > 0 ? 'var(--brand)' : '#fff',
                    color:      activeFiltersCount > 0 ? '#fff' : 'var(--text-primary)',
                    border:     `1.5px solid ${activeFiltersCount > 0 ? 'var(--brand)' : 'var(--border-medium)'}`,
                  }}>
                  <SlidersHorizontal size={13} />
                  Filtros
                  {activeFiltersCount > 0 && (
                    <span className="w-4 h-4 rounded-full flex items-center justify-center text-xs font-bold"
                      style={{ background: 'rgba(255,255,255,0.3)' }}>
                      {activeFiltersCount}
                    </span>
                  )}
                </button>
              </div>
            </div>

          {/* ── Móvil: buscador compacto ── */}
          <div className="md:hidden flex items-center gap-2 rounded-xl px-3.5 py-2.5 mb-2.5"
            style={{ background: '#fff', border: `1.5px solid ${q ? 'var(--brand-border)' : 'var(--border-medium)'}` }}>
            <Search size={14} style={{ color: q ? 'var(--brand)' : 'var(--text-muted)', flexShrink: 0 }} />
            <input
              value={q} onChange={e => setQ(e.target.value)}
              placeholder="Buscar espacios, eventos, sectores..."
              className="flex-1 min-w-0 bg-transparent focus:outline-none text-sm"
              style={{ color: 'var(--text-primary)', fontSize: 16 }}
            />
            {q && (
              <button onClick={() => setQ('')}
                className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}>
                <X size={10} />
              </button>
            )}
          </div>

          {/* ── Móvil: fila de filtros (igual estilo que desktop) ── */}
          <div className="md:hidden flex gap-2 overflow-x-auto pb-2 pr-4 scrollbar-hide">

            {/* Filtros — primero */}
            <button onClick={() => setMoreOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 transition-all"
              style={{ background: activeFiltersCount > 0 ? 'var(--brand)' : '#fff', border: `1.5px solid ${activeFiltersCount > 0 ? 'var(--brand)' : 'var(--border-medium)'}`, color: activeFiltersCount > 0 ? '#fff' : 'var(--text-primary)' }}>
              <SlidersHorizontal size={13} />
              Filtros
              {activeFiltersCount > 0 && <span className="w-4 h-4 rounded-full flex items-center justify-center text-xs font-black" style={{ background: 'rgba(255,255,255,0.3)' }}>{activeFiltersCount}</span>}
            </button>

            <div className="w-px shrink-0 self-stretch my-1" style={{ background: 'var(--border-medium)' }} />

            {/* Tipo de espacio */}
            {(() => { const cat = CATEGORIES.find(c => c.value === categoria); const Icon = cat?.icon ?? LayoutList; return (
              <button onClick={() => openDrawer('tipo-espacio')}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium whitespace-nowrap shrink-0 transition-all"
                style={{ background: categoria ? 'var(--brand-dim)' : '#fff', border: `1.5px solid ${categoria ? 'var(--brand-border)' : 'var(--border-medium)'}`, color: categoria ? 'var(--brand)' : 'var(--text-primary)' }}>
                <Icon size={13} style={{ flexShrink: 0 }} />
                <span>{categoria ? cat?.label : 'Espacio'}</span>
                {categoria ? <span onClick={e => { e.stopPropagation(); setCategoria('') }} className="flex items-center justify-center w-7 h-7 -mr-1"><X size={12} /></span> : <ChevronDown size={11} style={{ opacity: 0.5 }} />}
              </button>
            )})()}

            {/* Tipo de evento */}
            <button onClick={() => openDrawer('tipo-evento')}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium whitespace-nowrap shrink-0 transition-all"
              style={{ background: activity ? 'var(--brand-dim)' : '#fff', border: `1.5px solid ${activity ? 'var(--brand-border)' : 'var(--border-medium)'}`, color: activity ? 'var(--brand)' : 'var(--text-primary)' }}>
              <LayoutList size={13} style={{ flexShrink: 0 }} />
              <span>{activityLabel || 'Evento'}</span>
              {activity ? <span onClick={e => { e.stopPropagation(); setActivity('') }} className="flex items-center justify-center w-7 h-7 -mr-1"><X size={12} /></span> : <ChevronDown size={11} style={{ opacity: 0.5 }} />}
            </button>

            {/* Personas */}
            <button onClick={() => openDrawer('personas')}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium whitespace-nowrap shrink-0 transition-all"
              style={{ background: capacidad ? 'var(--brand-dim)' : '#fff', border: `1.5px solid ${capacidad ? 'var(--brand-border)' : 'var(--border-medium)'}`, color: capacidad ? 'var(--brand)' : 'var(--text-primary)' }}>
              <Users size={13} style={{ flexShrink: 0 }} />
              <span>{capacidad ? `${capacidad}+` : 'Personas'}</span>
              {capacidad ? <span onClick={e => { e.stopPropagation(); applyCapacity('') }} className="flex items-center justify-center w-7 h-7 -mr-1"><X size={12} /></span> : <ChevronDown size={11} style={{ opacity: 0.5 }} />}
            </button>

            {/* Sector */}
            <button onClick={() => openDrawer('sector')}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium whitespace-nowrap shrink-0 transition-all"
              style={{ background: sector ? 'var(--brand-dim)' : '#fff', border: `1.5px solid ${sector ? 'var(--brand-border)' : 'var(--border-medium)'}`, color: sector ? 'var(--brand)' : 'var(--text-primary)' }}>
              <MapPin size={13} style={{ flexShrink: 0 }} />
              <span className="max-w-[90px] truncate">{sector || 'Dónde'}</span>
              {sector ? <span onClick={e => { e.stopPropagation(); clearSector() }} className="flex items-center justify-center w-7 h-7 -mr-1"><X size={12} /></span> : <ChevronDown size={11} style={{ opacity: 0.5 }} />}
            </button>

            {/* Fecha */}
            <button onClick={() => openDrawer('fecha')}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium whitespace-nowrap shrink-0 transition-all"
              style={{ background: dateFrom ? 'var(--brand-dim)' : '#fff', border: `1.5px solid ${dateFrom ? 'var(--brand-border)' : 'var(--border-medium)'}`, color: dateFrom ? 'var(--brand)' : 'var(--text-primary)' }}>
              <CalendarDays size={13} style={{ flexShrink: 0 }} />
              <span>{dateFrom ? fmtDateShort(dateFrom) : 'Fecha'}</span>
              {dateFrom ? <span onClick={e => { e.stopPropagation(); setDateFrom(''); setTimeFrom('') }} className="flex items-center justify-center w-7 h-7 -mr-1"><X size={12} /></span> : <ChevronDown size={11} style={{ opacity: 0.5 }} />}
            </button>

            {/* Precio */}
            <button onClick={() => openDrawer('precio')}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium whitespace-nowrap shrink-0 transition-all"
              style={{ background: pricingFilter ? (PRICING_TYPES.find(p=>p.value===pricingFilter)?.bg ?? 'var(--brand-dim)') : '#fff', border: `1.5px solid ${pricingFilter ? (PRICING_TYPES.find(p=>p.value===pricingFilter)?.border ?? 'var(--brand-border)') : 'var(--border-medium)'}`, color: pricingFilter ? (PRICING_TYPES.find(p=>p.value===pricingFilter)?.text ?? 'var(--brand)') : 'var(--text-primary)' }}>
              <Clock size={13} style={{ flexShrink: 0 }} />
              <span>{pricingFilter ? PRICING_TYPES.find(p=>p.value===pricingFilter)?.label : 'Tipo de reserva'}</span>
              {pricingFilter ? <span onClick={e => { e.stopPropagation(); setPricingFilter('') }} className="flex items-center justify-center w-7 h-7 -mr-1"><X size={12} /></span> : <ChevronDown size={11} style={{ opacity: 0.5 }} />}
            </button>
          </div>

          {/* Chips activos mobile */}
          {activeChips.length > 0 && (
            <div className="md:hidden flex gap-2 mt-2 flex-wrap">
              {activeChips.map(chip => (
                <button key={chip.key} onClick={chip.onRemove}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold shrink-0"
                  style={{ background: 'var(--brand-dim)', color: 'var(--brand)', border: '1px solid var(--brand-border)' }}>
                  {chip.label} <X size={10} />
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
      </div>

      {/* ── Contenido principal ── */}
      <div className="max-w-screen-2xl mx-auto px-4 md:px-6 w-full">


        {/* Header de resultados */}
        <div className="py-3 md:py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-wrap">
              <p className="text-sm font-semibold shrink-0" style={{ color: 'var(--text-primary)' }}>
                {filtered.length} espacio{filtered.length !== 1 ? 's' : ''}
              </p>
              {/* Chips de filtros activos — desktop */}
              <div className="hidden md:flex items-center gap-2 flex-wrap">
                {activeChips.map(chip => (
                  <button key={chip.key} onClick={chip.onRemove}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
                    style={{ background: 'var(--brand-dim)', color: 'var(--brand)', border: '1px solid var(--brand-border)' }}>
                    {chip.label} <X size={9} />
                  </button>
                ))}
                {activeFiltersCount > 0 && (
                  <button onClick={clearAll}
                    className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full"
                    style={{ color: '#DC2626', background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.12)' }}>
                    <X size={9} /> Limpiar
                  </button>
                )}
              </div>
            </div>

          </div>
        </div>

        {/* ── DESKTOP: Lista (60%) + Mapa (40%) ── */}
        <div
          className="hidden md:flex gap-5"
          style={{ height: 'calc(100dvh - 174px)' }}
        >
          <div className="overflow-y-auto pr-2" style={{ flex: '0 0 60%' }}>
            {filtered.length === 0
              ? <EmptyState onClear={clearAll} recentSpaces={recentIds.map(id => spaces.find(s => s.id === id)).filter(Boolean)} hasDateFilter={!!dateFrom} />
              : (
                <div className="relative">
                  {availLoading && (
                    <div className="absolute inset-0 z-10 flex items-start justify-center pt-8 rounded-xl pointer-events-none"
                      style={{ background: 'rgba(255,255,255,0.6)' }}>
                      <div className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin"
                        style={{ borderColor: 'var(--brand)', borderTopColor: 'transparent' }} />
                    </div>
                  )}
                  <div className={`grid grid-cols-2 xl:grid-cols-3 gap-4 pb-6 transition-opacity${availLoading ? ' opacity-50' : ''}`}>
                    {filtered.map(space => (
                      <SpaceCard key={space.id} space={space} isHovered={hoveredId === space.id}
                        onHover={handleCardHover} dateFilter={dateFrom || undefined} timeFilter={timeFrom || undefined}
                        isAvailable={dateFrom ? !blockedIds.has(space.id) : undefined} />
                    ))}
                  </div>
                  {hasMore && (
                    <div className="flex justify-center pb-6">
                      <button
                        onClick={loadMore}
                        disabled={loadingMore}
                        className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all"
                        style={{
                          background: loadingMore ? 'var(--brand-dim)' : 'var(--brand)',
                          color: '#fff',
                          opacity: loadingMore ? 0.7 : 1,
                          border: 'none',
                        }}
                      >
                        {loadingMore
                          ? <><span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin inline-block" /> Cargando...</>
                          : 'Cargar más espacios'
                        }
                      </button>
                    </div>
                  )}
                </div>
              )
            }
          </div>
          {/* El wrapper solo aplica border-radius + sombra, sin overflow:hidden
              para que los popups de Leaflet no queden recortados */}
          <div style={{ flex: '0 0 40%', position: 'sticky', top: 0, height: 'calc(100dvh - 226px)', borderRadius: 20, boxShadow: '0 4px 24px rgba(0,0,0,0.08)', border: '1px solid var(--border-subtle)' }}>
            {/* Capa interna que sí tiene overflow:hidden para recortar el tile del mapa */}
            <div style={{ width: '100%', height: '100%', borderRadius: 20, overflow: 'hidden' }}>
              <SpacesMap spaces={filtered} hoveredId={hoveredId} cityFilter={sector} onSpaceHover={handleCardHover} />
            </div>
          </div>
        </div>

        {/* ── MÓVIL: Vista lista ── */}
        {mobileView === 'list' && (
          <div className="md:hidden w-full" style={{ overflowX: 'hidden' }}>
            {filtered.length === 0
              ? <EmptyState onClear={clearAll} recentSpaces={recentIds.map(id => spaces.find(s => s.id === id)).filter(Boolean)} hasDateFilter={!!dateFrom} />
              : (
                <div className="grid grid-cols-1 gap-4 w-full"
                  style={{ paddingBottom: hasMore ? '1rem' : 'calc(6rem + env(safe-area-inset-bottom, 0px))' }}>
                  {filtered.map(space => (
                    <SpaceCard key={space.id} space={space} isHovered={false} onHover={() => {}}
                      dateFilter={dateFrom || undefined} timeFilter={timeFrom || undefined}
                      isAvailable={dateFrom ? !blockedIds.has(space.id) : undefined} />
                  ))}
                  {hasMore && (
                    <div className="flex justify-center"
                      style={{ paddingBottom: 'calc(6rem + env(safe-area-inset-bottom, 0px))' }}>
                      <button
                        onClick={loadMore}
                        disabled={loadingMore}
                        className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-all w-full justify-center"
                        style={{
                          background: loadingMore ? 'var(--brand-dim)' : 'var(--brand)',
                          color: '#fff',
                          opacity: loadingMore ? 0.7 : 1,
                          border: 'none',
                        }}
                      >
                        {loadingMore
                          ? <><span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin inline-block" /> Cargando...</>
                          : 'Cargar más espacios'
                        }
                      </button>
                    </div>
                  )}
                </div>
              )
            }
          </div>
        )}

        {/* ── MÓVIL: Vista mapa — overlay fijo sobre la página ── */}
        {mobileView === 'map' && (
          <div className="md:hidden" style={{
            position: 'fixed',
            top: 128,   /* navbar 64 + filtros ~64 */
            left: 0, right: 0,
            bottom: 'calc(72px + env(safe-area-inset-bottom, 0px))',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 30,
            background: '#fff',
          }}>
            {/* Mapa — ocupa todo el espacio disponible menos el strip */}
            <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
              <SpacesMap
                key="mobile-map"
                spaces={filtered}
                cityFilter={sector}
                onSpaceHover={id => {
                  setHoveredId(id)
                  if (!id || !cardStripRef.current) return
                  // Scroll horizontal dentro del strip — sin mover la página
                  const strip = cardStripRef.current
                  const cardEl = strip.querySelector(`[data-id="${id}"]`) as HTMLElement | null
                  if (cardEl) {
                    strip.scrollTo({
                      left: cardEl.offsetLeft - 16,
                      behavior: 'smooth',
                    })
                  }
                }}
              />
            </div>

            {/* Strip de cards — altura fija, no mueve la página */}
            <div style={{ background: '#fff', borderTop: '1px solid var(--border-subtle)', flexShrink: 0 }}>
              <div className="flex items-center px-4 pt-2.5 pb-1.5">
                <span className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
                  {filtered.length} espacio{filtered.length !== 1 ? 's' : ''}
                  {hoveredId ? '' : ' · desliza las cards'}
                </span>
              </div>
              <div
                ref={cardStripRef}
                className="flex gap-3 px-4 pb-3 overflow-x-auto scrollbar-hide"
                style={{ scrollSnapType: 'x mandatory' }}>
                {filtered.map(space => {
                  const cover   = space.space_images?.find((i: any) => i.is_cover)?.url ?? space.space_images?.[0]?.url
                  const p       = space.space_pricing?.find((x: any) => x.is_active) ?? space.space_pricing?.[0]
                  const price   = p?.pricing_type === 'hourly'              ? `${formatCurrency(p.hourly_price)}/hr`
                                : p?.pricing_type === 'minimum_consumption' ? `Desde ${formatCurrency(p.minimum_consumption)}`
                                : p?.pricing_type === 'fixed_package'       ? formatCurrency(p.fixed_price)
                                : 'Cotizar'
                  const isActive = hoveredId === space.id
                  return (
                    <Link
                      key={space.id}
                      data-id={space.id}
                      href={`/espacios/${space.slug}`}
                      className="shrink-0 rounded-2xl overflow-hidden"
                      style={{
                        width: 200,
                        scrollSnapAlign: 'start',
                        border: `2px solid ${isActive ? 'var(--brand)' : 'var(--border-subtle)'}`,
                        background: '#fff',
                        boxShadow: isActive ? '0 4px 16px rgba(53,196,147,0.2)' : '0 1px 4px rgba(0,0,0,0.05)',
                        transition: 'border-color 0.2s, box-shadow 0.2s',
                      }}>
                      <div style={{ height: 90, overflow: 'hidden', background: 'var(--bg-elevated)' }}>
                        {cover
                          // eslint-disable-next-line @next/next/no-img-element
                          ? <img src={cover} alt={space.name} className="w-full h-full object-cover" />
                          : <div className="w-full h-full flex items-center justify-center">
                              <Building2 size={24} style={{ color: 'var(--text-muted)', opacity: 0.2 }} />
                            </div>
                        }
                      </div>
                      <div className="px-3 py-2">
                        <div className="text-xs font-bold truncate" style={{ color: 'var(--text-primary)' }}>{space.name}</div>
                        <div className="text-[10px] truncate" style={{ color: 'var(--text-muted)' }}>
                          {[space.sector, space.city].filter(Boolean).join(', ')}
                        </div>
                        <div className="text-xs font-bold mt-0.5" style={{ color: 'var(--brand)' }}>{price}</div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Botón flotante Lista/Mapa — compacto ── */}
      <div className="md:hidden fixed right-4 z-50"
        style={{ bottom: 'calc(5.5rem + env(safe-area-inset-bottom, 0px))' }}>
        <button
          onClick={() => setMobileView(v => v === 'list' ? 'map' : 'list')}
          className="flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-bold text-white shadow-lg"
          style={{
            background: mobileView === 'map' ? '#03313C' : 'var(--brand)',
            boxShadow: mobileView === 'map'
              ? '0 4px 16px rgba(3,49,60,0.4)'
              : '0 4px 16px rgba(53,196,147,0.45)',
          }}>
          {mobileView === 'list'
            ? <><Map size={14} /> Mapa</>
            : <><LayoutList size={14} /> Lista</>
          }
        </button>
      </div>

      {/* ── PANEL DE FILTROS (drawer lateral) ── */}
      {moreOpen && (
        <>
          <div className="fixed inset-0 z-[49] bg-black/40 backdrop-blur-sm" onClick={() => { setMoreOpen(false); setActQ('') }} />
          <div className="fixed right-0 top-0 h-full w-full max-w-md z-50 flex flex-col overflow-hidden pt-safe"
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
              <button onClick={() => { setMoreOpen(false); setActQ('') }}
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>
                <X size={18} />
              </button>
            </div>

            {/* Contenido scrolleable */}
            <div ref={drawerContentRef} className="flex-1 overflow-y-auto px-5 py-5 space-y-7" style={{ WebkitOverflowScrolling: 'touch' }}>

              {/* ── SECTOR / CIUDAD ── */}
              <div data-section="sector" />
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
                    style={{ color: 'var(--text-primary)', fontSize: 16 }}
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
              <div data-section="fecha" />
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
              <div data-section="personas" />
              <div>
                <h3 className="font-bold text-sm mb-1" style={{ color: 'var(--text-primary)' }}>
                  ¿Cuántos invitados?
                </h3>
                <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
                  Muestra espacios con esa capacidad o mayor
                </p>
                {/* Stepper — idéntico a BookingWidget paso 2 */}
                <div className="flex items-stretch gap-0 rounded-2xl overflow-hidden mb-3"
                  style={{ border: '1.5px solid var(--border-medium)' }}>
                  <button onClick={() => stepCapacity(-10)}
                    disabled={!capacidadInput || parseInt(capacidadInput) <= 0}
                    className="w-14 flex items-center justify-center transition-colors shrink-0 disabled:opacity-30"
                    style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)' }}>
                    <Minus size={18} />
                  </button>
                  <div className="flex-1 flex flex-col items-center justify-center py-4 border-x"
                    style={{ borderColor: 'var(--border-medium)' }}>
                    <input
                      type="number" value={capacidadInput}
                      onChange={e => { setCapacidadInput(e.target.value); setCapacidad(e.target.value) }}
                      onBlur={() => { if (capacidadInput && parseInt(capacidadInput) < 0) applyCapacity('') }}
                      placeholder="0"
                      className="text-3xl font-bold text-center bg-transparent focus:outline-none w-24 tabular-nums"
                      style={{ color: 'var(--text-primary)', fontSize: 16 }}
                    />
                    <span className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>personas</span>
                  </div>
                  <button onClick={() => stepCapacity(+10)}
                    className="w-14 flex items-center justify-center transition-colors shrink-0"
                    style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)' }}>
                    <Plus size={18} />
                  </button>
                </div>
                <div className="flex justify-between mb-3 text-xs px-1" style={{ color: 'var(--text-muted)' }}>
                  <span>Desde 1 persona</span>
                  {capacidadInput && <button onClick={() => applyCapacity('')} style={{ color: '#DC2626' }}>Quitar</button>}
                </div>
                {/* Quick presets */}
                <div className="grid grid-cols-4 gap-2">
                  {QUICK_CAPACITIES.map(n => (
                    <button key={n} onClick={() => applyCapacity(String(n))}
                      className="py-2.5 rounded-xl text-sm font-semibold transition-all"
                      style={capacidad === String(n)
                        ? { background: 'var(--brand)', color: '#fff', boxShadow: '0 2px 8px rgba(53,196,147,0.3)' }
                        : { background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }
                      }>
                      {n === 150 ? '150+' : n}
                    </button>
                  ))}
                </div>
              </div>

              {/* ── TIPO DE EVENTO ── */}
              <div data-section="tipo-evento" />
              <div>
                <h3 className="font-bold text-sm mb-1" style={{ color: 'var(--text-primary)' }}>Tipo de evento</h3>
                <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>¿Qué tipo de evento vas a celebrar?</p>
                {/* Input libre */}
                <div className="relative mb-3">
                  <LayoutList size={15} className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
                    style={{ color: activity ? 'var(--brand)' : 'var(--text-muted)' }} />
                  <input
                    value={actQ}
                    onChange={e => setActQ(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && actQ.trim()) {
                        setQ(actQ.trim()); setActivity(''); setActQ(''); setMoreOpen(false)
                      }
                    }}
                    placeholder="Ej: bautizo, afterwork, karaoke..."
                    className="input-base w-full rounded-xl pl-10 pr-10 py-3.5 text-sm"
                    style={{ color: 'var(--text-primary)', fontSize: 16 }}
                  />
                  {actQ && (
                    <button onClick={() => setActQ('')}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2"
                      style={{ color: 'var(--text-muted)' }}>
                      <X size={14} />
                    </button>
                  )}
                </div>
                {/* Opciones predefinidas filtradas */}
                <div className="flex flex-wrap gap-2">
                  {QUICK_ACTIVITIES
                    .filter(a => !actQ || a.label.toLowerCase().includes(actQ.toLowerCase()))
                    .map(a => {
                      const isActive = activity === a.slug
                      return (
                        <button key={a.slug}
                          onClick={() => { setActivity(isActive ? '' : a.slug); setActQ('') }}
                          className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold transition-all"
                          style={isActive
                            ? { background: '#0F1623', color: '#fff' }
                            : { background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }
                          }>
                          {a.label}
                          {isActive && <X size={9} />}
                        </button>
                      )
                    })}
                  {/* Búsqueda personalizada si no hay coincidencia exacta */}
                  {actQ.trim() && !SUB_ACTIVITIES.some(a => a.label.toLowerCase() === actQ.toLowerCase()) && (
                    <button
                      onClick={() => { setQ(actQ.trim()); setActivity(''); setActQ(''); setMoreOpen(false) }}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold transition-all"
                      style={{ background: 'var(--brand-dim)', color: 'var(--brand)', border: '1px solid var(--brand-border)' }}>
                      <Search size={11} />
                      Buscar "{actQ.trim()}"
                    </button>
                  )}
                </div>
                {activity && (
                  <button onClick={() => { setActivity(''); setActQ('') }}
                    className="flex items-center gap-1.5 mt-2.5 text-xs font-medium"
                    style={{ color: '#DC2626' }}>
                    <X size={11} /> Quitar tipo de evento
                  </button>
                )}
              </div>

              {/* ── TIPO DE ESPACIO ── */}
              <div data-section="tipo-espacio" />
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

              {/* ── TIPO DE PRECIO ── */}
              <div data-section="precio" />
              <div>
                <h3 className="font-bold text-sm mb-1" style={{ color: 'var(--text-primary)' }}>Tipo de reserva</h3>
                <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>¿Cómo prefieres pagar?</p>
                <div className="grid grid-cols-2 gap-2">
                  {PRICING_TYPES.filter(p => p.value).map(pt => {
                    const isActive = pricingFilter === pt.value
                    const Icon = pt.icon
                    return (
                      <button key={pt.value} onClick={() => setPricingFilter(isActive ? '' : pt.value)}
                        className="flex items-center gap-2.5 px-3 py-3 rounded-xl text-left transition-all"
                        style={isActive
                          ? { background: pt.bg, border: `1.5px solid ${pt.border}`, color: pt.text }
                          : { background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }
                        }>
                        {Icon && <Icon size={14} className="shrink-0" style={{ color: isActive ? pt.text : 'var(--text-muted)' }} />}
                        <span className="text-xs font-medium leading-tight">{pt.label}</span>
                        {isActive && <Check size={12} className="ml-auto shrink-0" style={{ color: pt.text }} />}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* ── PRECIO ── */}
              <div>
                <h3 className="font-bold text-sm mb-3" style={{ color: 'var(--text-primary)' }}>Rango de precio (RD$)</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs mb-1.5" style={{ color: 'var(--text-muted)' }}>Mínimo</label>
                    <input type="number" value={priceMin} onChange={e => setPriceMin(e.target.value)}
                      placeholder="0" className="input-base w-full rounded-xl px-4 py-3.5 text-sm" style={{ fontSize: 16 }} />
                  </div>
                  <div>
                    <label className="block text-xs mb-1.5" style={{ color: 'var(--text-muted)' }}>Máximo</label>
                    <input type="number" value={priceMax} onChange={e => setPriceMax(e.target.value)}
                      placeholder="Sin límite" className="input-base w-full rounded-xl px-4 py-3.5 text-sm" style={{ fontSize: 16 }} />
                  </div>
                </div>
              </div>

              {/* ── FACILIDADES ── */}
              <div>
                <h3 className="font-bold text-sm mb-1" style={{ color: 'var(--text-primary)' }}>Facilidades</h3>
                <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>¿Qué necesitas que tenga el espacio?</p>
                <div className="grid grid-cols-2 gap-2">
                  {FACILITIES.map(fac => {
                    const isActive = selectedFacilities.includes(fac.key)
                    const Icon = fac.icon
                    return (
                      <button key={fac.key} onClick={() => toggleFacility(fac.key)}
                        className="flex items-center gap-2.5 px-3 py-3 rounded-xl text-left transition-all"
                        style={isActive
                          ? { background: 'var(--brand-dim)', border: '1.5px solid var(--brand-border)', color: 'var(--brand)' }
                          : { background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }
                        }>
                        <Icon size={15} className="shrink-0" style={{ color: isActive ? 'var(--brand)' : 'var(--text-muted)' }} />
                        <span className="text-xs font-medium leading-tight flex-1">{fac.label}</span>
                        {isActive && <Check size={12} className="shrink-0" style={{ color: 'var(--brand)' }} />}
                      </button>
                    )
                  })}
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
            <div className="px-5 pt-4 pb-safe flex gap-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
              <button onClick={clearAll}
                className="flex-1 py-3.5 rounded-2xl text-sm font-semibold btn-outline">
                Limpiar todo
              </button>
              <button onClick={() => { setMoreOpen(false); setActQ('') }}
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

// ── Empty state ───────────────────────────────────────────
function EmptyState({ onClear, recentSpaces, hasDateFilter }: { onClear: () => void; recentSpaces?: any[]; hasDateFilter?: boolean }) {
  return (
    <div>
      <div className="flex flex-col items-center justify-center py-14 rounded-3xl text-center"
        style={{ background: '#fff', border: '2px dashed var(--border-medium)' }}>
        <Search size={32} className="mb-3" style={{ color: 'var(--text-muted)' }} />
        <h3 className="font-bold text-lg mb-2" style={{ color: 'var(--text-primary)' }}>Sin resultados</h3>
        <p className="text-sm mb-5 px-4" style={{ color: 'var(--text-secondary)' }}>
          {hasDateFilter
            ? 'No hay disponibilidad para esa fecha con los filtros actuales. Prueba otra fecha o limpia los filtros.'
            : 'Intenta con otros filtros o términos de búsqueda'}
        </p>
        <button onClick={onClear} className="btn-brand text-sm font-semibold px-5 py-3 rounded-xl">
          {hasDateFilter ? 'Ver todos los espacios' : 'Limpiar búsqueda'}
        </button>
      </div>
      {recentSpaces && recentSpaces.length > 0 && (
        <RecentlyViewed spaces={recentSpaces} />
      )}
    </div>
  )
}

function RecentlyViewed({ spaces }: { spaces: any[] }) {
  return (
    <div className="mt-8">
      <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>
        Vistos recientemente
      </p>
      <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
        {spaces.map(space => (
          <SpaceCard key={space.id} space={space} isHovered={false} onHover={() => {}} />
        ))}
      </div>
    </div>
  )
}
