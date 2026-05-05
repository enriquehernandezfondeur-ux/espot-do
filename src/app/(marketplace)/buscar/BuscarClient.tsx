'use client'

import { useState, useMemo, useCallback } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import {
  Search, MapPin, Users, SlidersHorizontal, X, CalendarDays,
  Shield, Star, LayoutList, Map,
  Check, Building2, UtensilsCrossed,
  Sunset, Wine, Trees, Camera, Briefcase, Home, Hotel,
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

// El mapa sólo se carga en el cliente (Leaflet no funciona en SSR)
const SpacesMap = dynamic(() => import('@/components/map/SpacesMap'), {
  ssr:     false,
  loading: () => (
    <div className="w-full h-full rounded-2xl animate-pulse"
      style={{ background: '#E8EDE9' }} />
  ),
})

// ── Categorías ────────────────────────────────────────────
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

const AMENITIES = [
  { key: 'allows_external_decoration', label: 'Permite decoración externa' },
  { key: 'allows_external_food',       label: 'Permite comida externa' },
  { key: 'allows_external_alcohol',    label: 'Permite alcohol externo' },
  { key: 'verified',                   label: 'Espacio verificado' },
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
  if (p.pricing_type === 'minimum_consumption') return { label: `Consumo mín. ${formatCurrency(p.minimum_consumption)}` }
  if (p.pricing_type === 'fixed_package')       return { label: formatCurrency(p.fixed_price) }
  return { label: 'Cotizar' }
}

interface Props {
  spaces:        any[]
  initialParams: Record<string, string | undefined>
}

export default function BuscarClient({ spaces, initialParams }: Props) {
  // ── Filtros ───────────────────────────────────────────
  const [q,              setQ]              = useState(initialParams.q ?? '')
  const [sector,         setSector]         = useState(initialParams.sector ?? '')
  const [categoria,      setCategoria]      = useState(initialParams.categoria ?? '')
  const [capacidad,      setCapacidad]      = useState(initialParams.capacidad ?? '')
  const [capacidadInput, setCapacidadInput] = useState(initialParams.capacidad ?? '')
  const [dateFrom,       setDateFrom]       = useState(initialParams.dateFrom ?? '')
  const [priceMin,       setPriceMin]       = useState('')
  const [priceMax,       setPriceMax]       = useState('')
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([])
  const [moreOpen,       setMoreOpen]       = useState(false)

  // ── Hover coordination carta ↔ pin ────────────────────
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  // ── Vista móvil ───────────────────────────────────────
  const [mobileView, setMobileView] = useState<'list' | 'map'>('list')

  // ── Filtrado en el cliente ────────────────────────────
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
  const activeFiltersCount = [
    categoria, sector, capacidad, dateFrom, ...selectedAmenities, priceMin, priceMax,
  ].filter(Boolean).length

  function clearAll() {
    setQ(''); setSector(''); setCategoria(''); setCapacidad(''); setCapacidadInput('')
    setSelectedAmenities([]); setPriceMin(''); setPriceMax(''); setDateFrom('')
  }

  const handleCardHover = useCallback((id: string | null) => setHoveredId(id), [])

  return (
    <div style={{ background: 'var(--bg-base)', minHeight: '100vh' }}>

      {/* ── Barra de filtros sticky ── */}
      <div className="sticky top-16 z-40 px-4 md:px-6 py-3"
        style={{
          background:     'rgba(244,246,245,0.97)',
          backdropFilter: 'blur(16px)',
          borderBottom:   '1px solid var(--border-subtle)',
          boxShadow:      '0 1px 8px rgba(0,0,0,0.05)',
        }}>
        <div className="max-w-screen-2xl mx-auto">

          {/* Fila de búsqueda */}
          <div className="flex gap-2 mb-3">
            <div className="flex-1 flex items-center gap-3 rounded-2xl px-4 py-2.5 input-base">
              <Search size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
              <input
                value={q} onChange={e => setQ(e.target.value)}
                placeholder="Salón, rooftop, restaurante, cumpleaños..."
                className="flex-1 bg-transparent text-sm focus:outline-none"
                style={{ color: 'var(--text-primary)' }}
              />
              {q && (
                <button onClick={() => setQ('')} style={{ color: 'var(--text-muted)' }}>
                  <X size={14} />
                </button>
              )}
            </div>
            <div className="flex items-center gap-2 rounded-2xl px-4 py-2.5 input-base w-40">
              <MapPin size={15} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
              <input
                value={sector} onChange={e => setSector(e.target.value)}
                placeholder="Sector"
                className="w-full bg-transparent text-sm focus:outline-none"
                style={{ color: 'var(--text-primary)' }}
              />
            </div>
            <div className="flex items-center gap-2 rounded-2xl px-4 py-2.5 input-base w-44">
              <CalendarDays size={15} style={{ color: dateFrom ? 'var(--brand)' : 'var(--text-muted)', flexShrink: 0 }} />
              <input
                type="date" value={dateFrom}
                onChange={e => setDateFrom(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full bg-transparent text-sm focus:outline-none"
                style={{ color: dateFrom ? 'var(--text-primary)' : 'var(--text-muted)' }}
              />
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

          {/* Category pills */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {CATEGORIES.map(cat => {
              const isActive = categoria === cat.value
              const Icon = cat.icon
              return (
                <button key={cat.value}
                  onClick={() => setCategoria(isActive ? '' : cat.value)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all shrink-0"
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
      <div className="max-w-screen-2xl mx-auto px-4 md:px-6">

        {/* Header de resultados */}
        <div className="flex items-center justify-between py-4">
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              {filtered.length} espacio{filtered.length !== 1 ? 's' : ''} encontrado{filtered.length !== 1 ? 's' : ''}
            </p>
            {(categoria || sector || capacidad) && (
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                {[categoria && CATEGORIES.find(c => c.value === categoria)?.label, sector, capacidad && `Mín. ${capacidad} personas`].filter(Boolean).join(' · ')}
              </p>
            )}
          </div>
          {activeFiltersCount > 0 && (
            <button onClick={clearAll}
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-xl"
              style={{ color: '#DC2626', background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.15)' }}>
              <X size={12} /> Limpiar filtros
            </button>
          )}
        </div>

        {/* ── SPLIT LAYOUT: Lista (60%) + Mapa (40%) ── */}
        <div
          className="hidden md:flex gap-5"
          style={{ height: 'calc(100vh - 226px)' }}
        >
          {/* Lista — scrolleable */}
          <div className="overflow-y-auto pr-2" style={{ flex: '0 0 60%' }}>
            {filtered.length === 0 ? (
              <EmptyState onClear={clearAll} />
            ) : (
              <div className="grid grid-cols-2 gap-4 pb-6">
                {filtered.map(space => (
                  <SpaceCard
                    key={space.id}
                    space={space}
                    isHovered={hoveredId === space.id}
                    onHover={handleCardHover}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Mapa sticky */}
          <div style={{ flex: '0 0 40%', position: 'sticky', top: 0, height: 'calc(100vh - 226px)', borderRadius: 16, overflow: 'hidden' }}>
            <SpacesMap
              spaces={filtered}
              hoveredId={hoveredId}
              cityFilter={sector}
              onSpaceHover={handleCardHover}
            />
          </div>
        </div>

        {/* ── MÓVIL: Lista o Mapa ── */}
        <div className="md:hidden">
          {mobileView === 'list' ? (
            filtered.length === 0
              ? <EmptyState onClear={clearAll} />
              : (
                <div className="grid grid-cols-1 gap-4 pb-24">
                  {filtered.map(space => (
                    <SpaceCard key={space.id} space={space} isHovered={false} onHover={() => {}} />
                  ))}
                </div>
              )
          ) : (
            <div style={{ height: 'calc(100vh - 240px)', borderRadius: 12, overflow: 'hidden', marginBottom: 80 }}>
              <SpacesMap spaces={filtered} cityFilter={sector} />
            </div>
          )}
        </div>
      </div>

      {/* ── Botón flotante móvil ── */}
      <div className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
        <button
          onClick={() => setMobileView(v => v === 'list' ? 'map' : 'list')}
          className="flex items-center gap-2 px-6 py-3 rounded-full text-sm font-bold text-white shadow-xl"
          style={{
            background:  'var(--brand)',
            boxShadow:   '0 4px 24px rgba(53,196,147,0.45)',
          }}>
          {mobileView === 'list'
            ? <><Map size={16} /> Ver mapa</>
            : <><LayoutList size={16} /> Ver lista</>
          }
        </button>
      </div>

      {/* ── Modal: Más filtros ── */}
      {moreOpen && (
        <>
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" onClick={() => setMoreOpen(false)} />
          <div className="fixed right-0 top-0 h-full w-full max-w-md z-50 flex flex-col overflow-hidden"
            style={{ background: '#fff', boxShadow: '-8px 0 40px rgba(0,0,0,0.12)' }}>

            <div className="flex items-center justify-between px-6 py-5"
              style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              <h2 className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>Más filtros</h2>
              <button onClick={() => setMoreOpen(false)}
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8">

              {/* Capacidad */}
              <div>
                <h3 className="font-bold text-sm mb-1" style={{ color: 'var(--text-primary)' }}>
                  ¿Cuántos invitados?
                </h3>
                <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
                  Se mostrarán espacios con esa capacidad o mayor
                </p>
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex-1 flex items-center gap-2 rounded-xl px-4 py-3 input-base">
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
                      className="px-4 py-2 rounded-xl text-sm font-semibold transition-all"
                      style={capacidad === String(n)
                        ? { background: 'var(--brand)', color: '#fff' }
                        : { background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }
                      }>
                      {n === 150 ? '150+' : n}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tipo de espacio */}
              <div>
                <h3 className="font-bold text-sm mb-3" style={{ color: 'var(--text-primary)' }}>Tipo de espacio</h3>
                <div className="grid grid-cols-2 gap-2">
                  {CATEGORIES.filter(c => c.value).map(cat => {
                    const Icon = cat.icon
                    const isActive = categoria === cat.value
                    return (
                      <button key={cat.value}
                        onClick={() => setCategoria(isActive ? '' : cat.value)}
                        className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left transition-all"
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

              {/* Precio */}
              <div>
                <h3 className="font-bold text-sm mb-3" style={{ color: 'var(--text-primary)' }}>Precio por hora (RD$)</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs mb-1.5" style={{ color: 'var(--text-muted)' }}>Mínimo</label>
                    <input type="number" value={priceMin} onChange={e => setPriceMin(e.target.value)}
                      placeholder="0" className="input-base w-full rounded-xl px-4 py-3 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs mb-1.5" style={{ color: 'var(--text-muted)' }}>Máximo</label>
                    <input type="number" value={priceMax} onChange={e => setPriceMax(e.target.value)}
                      placeholder="Sin límite" className="input-base w-full rounded-xl px-4 py-3 text-sm" />
                  </div>
                </div>
              </div>

              {/* Características */}
              <div>
                <h3 className="font-bold text-sm mb-3" style={{ color: 'var(--text-primary)' }}>Características</h3>
                <div className="space-y-2">
                  {AMENITIES.map(am => {
                    const isActive = selectedAmenities.includes(am.key)
                    return (
                      <button key={am.key} onClick={() => toggleAmenity(am.key)}
                        className="w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all"
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

            <div className="px-6 py-5 flex gap-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
              <button onClick={clearAll} className="flex-1 py-3 rounded-2xl text-sm font-semibold btn-outline">
                Limpiar todo
              </button>
              <button onClick={() => setMoreOpen(false)} className="flex-1 py-3 rounded-2xl text-sm font-bold btn-brand">
                Ver {filtered.length} espacio{filtered.length !== 1 ? 's' : ''}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ── Componente de card ────────────────────────────────────
function SpaceCard({
  space, isHovered, onHover,
}: {
  space: any
  isHovered: boolean
  onHover: (id: string | null) => void
}) {
  const cover     = getCover(space)
  const priceInfo = getPriceInfo(space)
  const catLabel  = CATEGORIES.find(c => c.value === space.category)?.label ?? space.category
  const CatIcon   = CATEGORIES.find(c => c.value === space.category)?.icon ?? Building2

  return (
    <Link href={`/espacios/${space.slug}`} className="group block">
      <div
        className="rounded-2xl overflow-hidden h-full flex flex-col transition-all duration-200"
        style={{
          background:  '#fff',
          border:      `1.5px solid ${isHovered ? 'var(--brand)' : 'var(--border-subtle)'}`,
          boxShadow:   isHovered ? '0 4px 20px rgba(53,196,147,0.2)' : '0 1px 4px rgba(0,0,0,0.04)',
          transform:   isHovered ? 'translateY(-2px)' : 'none',
        }}
        onMouseEnter={() => onHover(space.id)}
        onMouseLeave={() => onHover(null)}
      >
        {/* Imagen */}
        <div className="relative overflow-hidden" style={{ height: 180, flexShrink: 0 }}>
          {cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={cover} alt={space.name}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
          ) : (
            <div className="w-full h-full flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg,#667eea,#764ba2)' }}>
              <CatIcon size={36} className="text-white opacity-60" />
            </div>
          )}
          {space.is_verified && (
            <span className="absolute top-2 left-2 flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(53,196,147,0.92)', color: '#fff' }}>
              <Shield size={9} /> Verificado
            </span>
          )}
          {priceInfo && (
            <span className="absolute bottom-2 left-2 text-xs font-bold px-2.5 py-1 rounded-full"
              style={{ background: 'rgba(0,0,0,0.72)', color: '#fff', backdropFilter: 'blur(8px)' }}>
              {priceInfo.label}
            </span>
          )}
          <span className="absolute bottom-2 right-2 flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full"
            style={{ background: 'rgba(0,0,0,0.6)', color: '#fff', backdropFilter: 'blur(8px)' }}>
            <Users size={10} /> {space.capacity_max}
          </span>
        </div>

        {/* Info */}
        <div className="p-3.5 flex flex-col flex-1">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="font-bold text-sm leading-tight group-hover:text-[#35C493] transition-colors"
              style={{ color: 'var(--text-primary)' }}>
              {space.name}
            </h3>
            {space.space_addons?.length > 0 && (
              <div className="flex items-center gap-0.5 shrink-0" style={{ color: '#F59E0B' }}>
                <Star size={11} className="fill-current" />
                <span className="text-xs font-semibold">{space.space_addons.length}</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-muted)' }}>
            <MapPin size={10} />
            {space.sector ? `${space.sector}, ` : ''}{space.city}
          </div>
          <div className="mt-auto pt-2.5 flex items-center justify-between"
            style={{ borderTop: '1px solid var(--border-subtle)', marginTop: 8 }}>
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 rounded-md flex items-center justify-center"
                style={{ background: 'var(--brand-dim)' }}>
                <CatIcon size={11} style={{ color: 'var(--brand)' }} />
              </div>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{catLabel}</span>
            </div>
            <span className="text-xs font-bold" style={{ color: 'var(--brand)' }}>
              Ver →
            </span>
          </div>
        </div>
      </div>
    </Link>
  )
}

// ── Empty state ───────────────────────────────────────────
function EmptyState({ onClear }: { onClear: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 rounded-3xl text-center"
      style={{ background: '#fff', border: '2px dashed var(--border-medium)' }}>
      <Search size={32} className="mb-3" style={{ color: 'var(--text-muted)' }} />
      <h3 className="font-bold text-lg mb-2" style={{ color: 'var(--text-primary)' }}>Sin resultados</h3>
      <p className="text-sm mb-5" style={{ color: 'var(--text-secondary)' }}>
        Intenta con otros filtros o términos de búsqueda
      </p>
      <button onClick={onClear} className="btn-brand text-sm font-semibold px-5 py-2.5 rounded-xl">
        Limpiar búsqueda
      </button>
    </div>
  )
}
