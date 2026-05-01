'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import {
  Search, MapPin, Users, SlidersHorizontal, X,
  Shield, Star, Map, LayoutGrid,
  Check, Building2, UtensilsCrossed,
  Sunset, Wine, Trees, Camera, Briefcase, Home, Hotel,
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

// ── Categorías de Espot ───────────────────────────────────
const CATEGORIES = [
  { value: '',             label: 'Todos los espacios', icon: LayoutGrid },
  { value: 'restaurante',  label: 'Restaurantes y bares', icon: UtensilsCrossed },
  { value: 'salon',        label: 'Salones privados',   icon: Building2 },
  { value: 'terraza',      label: 'Terrazas',           icon: Trees },
  { value: 'rooftop',      label: 'Rooftops',           icon: Sunset },
  { value: 'hotel',        label: 'Hoteles',            icon: Hotel },
  { value: 'coworking',    label: 'Coworkings',         icon: Briefcase },
  { value: 'villa',        label: 'Villas y casas',     icon: Home },
  { value: 'estudio',      label: 'Estudios',           icon: Camera },
  { value: 'bar',          label: 'Bares',              icon: Wine },
]

const QUICK_CAPACITIES = [20, 50, 100, 150]

const AMENITIES = [
  { key: 'allows_external_decoration', label: 'Permite decoración' },
  { key: 'allows_external_food',       label: 'Permite comida externa' },
  { key: 'allows_external_alcohol',    label: 'Permite alcohol externo' },
  { key: 'parking',    label: 'Tiene parqueo' },
  { key: 'ac',         label: 'Aire acondicionado' },
  { key: 'sound',      label: 'Sistema de sonido' },
  { key: 'kitchen',    label: 'Cocina equipada' },
  { key: 'terrace',    label: 'Tiene terraza' },
  { key: 'verified',   label: 'Espacio verificado' },
]

function getCover(space: any) {
  return space.space_images?.find((i: any) => i.is_cover)?.url ?? space.space_images?.[0]?.url ?? null
}

function getPriceInfo(space: any) {
  const p = space.space_pricing?.find((x: any) => x.is_active) ?? space.space_pricing?.[0]
  if (!p) return null
  if (p.pricing_type === 'hourly') return { label: `${formatCurrency(p.hourly_price)} / hora`, type: 'hourly' }
  if (p.pricing_type === 'minimum_consumption') return { label: `Consumo mín. ${formatCurrency(p.minimum_consumption)}`, type: 'consumption' }
  if (p.pricing_type === 'fixed_package') return { label: formatCurrency(p.fixed_price), type: 'package' }
  return { label: 'Cotizar', type: 'quote' }
}

interface Props {
  spaces: any[]
  initialParams: Record<string, string | undefined>
}

export default function BuscarClient({ spaces, initialParams }: Props) {
  // ── Estado de filtros ─────────────────────────────────
  const [q, setQ]                     = useState(initialParams.q ?? '')
  const [sector, setSector]           = useState(initialParams.sector ?? '')
  const [categoria, setCategoria]     = useState(initialParams.categoria ?? '')
  const [capacidad, setCapacidad]     = useState(initialParams.capacidad ?? '')
  const [capacidadInput, setCapacidadInput] = useState(initialParams.capacidad ?? '')
  const [moreOpen, setMoreOpen]       = useState(false)
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([])
  const [viewMode, setViewMode]       = useState<'list' | 'map'>('list')
  const [priceMin, setPriceMin]       = useState('')
  const [priceMax, setPriceMax]       = useState('')

  // ── Filtrado en el cliente ────────────────────────────
  const filtered = useMemo(() => {
    let result = [...spaces]

    if (q) {
      const ql = q.toLowerCase()
      result = result.filter(s =>
        s.name?.toLowerCase().includes(ql) ||
        s.description?.toLowerCase().includes(ql) ||
        s.category?.toLowerCase().includes(ql) ||
        s.sector?.toLowerCase().includes(ql)
      )
    }
    if (categoria) result = result.filter(s => s.category === categoria)
    if (sector)    result = result.filter(s => s.sector?.toLowerCase().includes(sector.toLowerCase()) || s.city?.toLowerCase().includes(sector.toLowerCase()))
    if (capacidad) result = result.filter(s => s.capacity_max >= parseInt(capacidad))

    // Filtro de amenidades (basado en conditions)
    if (selectedAmenities.includes('verified')) {
      result = result.filter(s => s.is_verified)
    }
    if (selectedAmenities.includes('allows_external_decoration')) {
      result = result.filter(s => s.space_conditions?.[0]?.allows_external_decoration)
    }
    if (selectedAmenities.includes('allows_external_food')) {
      result = result.filter(s => s.space_conditions?.[0]?.allows_external_food)
    }
    if (selectedAmenities.includes('allows_external_alcohol')) {
      result = result.filter(s => s.space_conditions?.[0]?.allows_external_alcohol)
    }

    return result
  }, [spaces, q, categoria, sector, capacidad, selectedAmenities])

  function applyCapacity(val: string) {
    setCapacidad(val)
    setCapacidadInput(val)
  }

  function toggleAmenity(key: string) {
    setSelectedAmenities(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    )
  }

  const activeFiltersCount = [
    categoria, sector, capacidad, ...selectedAmenities, priceMin, priceMax
  ].filter(Boolean).length

  function clearAll() {
    setQ(''); setSector(''); setCategoria(''); setCapacidad(''); setCapacidadInput('')
    setSelectedAmenities([]); setPriceMin(''); setPriceMax('')
  }

  return (
    <div style={{ background: 'var(--bg-base)', minHeight: '100vh' }}>

      {/* ── Barra de búsqueda sticky ── */}
      <div className="sticky top-16 z-40 px-4 md:px-6 py-3"
        style={{ background: 'rgba(244,246,245,0.97)', backdropFilter: 'blur(16px)', borderBottom: '1px solid var(--border-subtle)', boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>
        <div className="max-w-7xl mx-auto">
          {/* Search row */}
          <div className="flex gap-2 mb-3">
            <div className="flex-1 flex items-center gap-3 rounded-2xl px-4 py-3 input-base">
              <Search size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
              <input
                value={q}
                onChange={e => setQ(e.target.value)}
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
            <div className="flex items-center gap-2 rounded-2xl px-4 py-3 input-base w-48">
              <MapPin size={15} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
              <input
                value={sector}
                onChange={e => setSector(e.target.value)}
                placeholder="Sector o ciudad"
                className="w-full bg-transparent text-sm focus:outline-none"
                style={{ color: 'var(--text-primary)' }}
              />
            </div>
            {/* Más filtros */}
            <button onClick={() => setMoreOpen(true)}
              className="flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-semibold transition-all shrink-0"
              style={{
                background: activeFiltersCount > 0 ? 'var(--brand)' : '#fff',
                color: activeFiltersCount > 0 ? '#fff' : 'var(--text-primary)',
                border: '1.5px solid var(--border-medium)',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
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
          <div className="flex gap-2 overflow-x-auto pb-1">
            {CATEGORIES.map(cat => {
              const isActive = categoria === cat.value
              const Icon = cat.icon
              return (
                <button key={cat.value}
                  onClick={() => setCategoria(isActive ? '' : cat.value)}
                  className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all shrink-0"
                  style={isActive ? {
                    background: 'var(--brand)', color: '#fff',
                    boxShadow: '0 2px 8px rgba(53,196,147,0.3)',
                  } : {
                    background: '#fff', color: 'var(--text-secondary)',
                    border: '1px solid var(--border-medium)',
                  }}>
                  <Icon size={13} />
                  {cat.label}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── Contenido principal ── */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6">

        {/* Results header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
              {filtered.length} espacio{filtered.length !== 1 ? 's' : ''} encontrado{filtered.length !== 1 ? 's' : ''}
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              {categoria && CATEGORIES.find(c => c.value === categoria)?.label}
              {sector && ` · ${sector}`}
              {capacidad && ` · Mín. ${capacidad} personas`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {activeFiltersCount > 0 && (
              <button onClick={clearAll}
                className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-xl transition-colors"
                style={{ color: '#DC2626', background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.15)' }}>
                <X size={12} /> Limpiar filtros
              </button>
            )}
            {/* Vista lista/mapa */}
            <div className="flex gap-1 p-1 rounded-xl" style={{ background: '#fff', border: '1px solid var(--border-subtle)' }}>
              <button onClick={() => setViewMode('list')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                style={viewMode === 'list' ? { background: 'var(--brand)', color: '#fff' } : { color: 'var(--text-secondary)' }}>
                <LayoutGrid size={13} /> Lista
              </button>
              <button onClick={() => setViewMode('map')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                style={viewMode === 'map' ? { background: 'var(--brand)', color: '#fff' } : { color: 'var(--text-secondary)' }}>
                <Map size={13} /> Mapa
              </button>
            </div>
          </div>
        </div>

        {/* ── Layout split lista + mapa ── */}
        <div className={`flex gap-5 ${viewMode === 'map' ? 'lg:flex-row' : ''}`}>

          {/* Lista de espacios */}
          <div className={viewMode === 'map' ? 'flex-1 lg:w-[55%]' : 'w-full'}>
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 rounded-3xl text-center"
                style={{ background: '#fff', border: '2px dashed var(--border-medium)' }}>
                <div className="text-5xl mb-4">🔍</div>
                <h3 className="font-bold text-lg mb-2" style={{ color: 'var(--text-primary)' }}>
                  Sin resultados
                </h3>
                <p className="text-sm mb-5" style={{ color: 'var(--text-secondary)' }}>
                  Intenta con otros filtros o términos de búsqueda
                </p>
                <button onClick={clearAll}
                  className="btn-brand text-sm font-semibold px-5 py-2.5 rounded-xl">
                  Limpiar búsqueda
                </button>
              </div>
            ) : (
              <div className={`grid gap-4 ${viewMode === 'map' ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'}`}>
                {filtered.map(space => {
                  const cover     = getCover(space)
                  const priceInfo = getPriceInfo(space)
                  const catLabel  = CATEGORIES.find(c => c.value === space.category)?.label ?? space.category
                  const CatIcon   = CATEGORIES.find(c => c.value === space.category)?.icon ?? Building2

                  return (
                    <Link key={space.id} href={`/espacios/${space.slug}`} className="group block">
                      <div className="card-hover rounded-2xl overflow-hidden h-full flex flex-col"
                        style={{ background: '#fff', border: '1px solid var(--border-subtle)' }}>

                        {/* Imagen */}
                        <div className="relative overflow-hidden" style={{ height: 200, flexShrink: 0 }}>
                          {cover ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={cover} alt={space.name}
                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center"
                              style={{ background: 'linear-gradient(135deg, #667eea, #764ba2)' }}>
                              <CatIcon size={40} className="text-white opacity-60" />
                            </div>
                          )}

                          {/* Badges */}
                          <div className="absolute top-3 left-3 flex gap-1.5">
                            {space.is_verified && (
                              <span className="flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full"
                                style={{ background: 'rgba(53,196,147,0.9)', color: '#fff' }}>
                                <Shield size={10} /> Verificado
                              </span>
                            )}
                          </div>

                          {/* Precio flotante */}
                          {priceInfo && (
                            <div className="absolute bottom-3 left-3 text-xs font-bold px-3 py-1.5 rounded-full"
                              style={{ background: 'rgba(0,0,0,0.75)', color: '#fff', backdropFilter: 'blur(8px)' }}>
                              {priceInfo.label}
                            </div>
                          )}

                          {/* Capacidad */}
                          <div className="absolute bottom-3 right-3 flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-full"
                            style={{ background: 'rgba(0,0,0,0.6)', color: '#fff', backdropFilter: 'blur(8px)' }}>
                            <Users size={11} /> {space.capacity_max}
                          </div>
                        </div>

                        {/* Info */}
                        <div className="p-4 flex flex-col flex-1">
                          <div className="flex items-start justify-between gap-2 mb-1.5">
                            <h3 className="font-bold text-sm leading-tight group-hover:text-[#35C493] transition-colors"
                              style={{ color: 'var(--text-primary)' }}>
                              {space.name}
                            </h3>
                            {space.space_addons?.length > 0 && (
                              <div className="flex items-center gap-0.5 shrink-0"
                                style={{ color: '#F59E0B' }}>
                                <Star size={11} className="fill-current" />
                                <span className="text-xs font-semibold">{space.space_addons.length}</span>
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-1 text-xs mb-2" style={{ color: 'var(--text-muted)' }}>
                            <MapPin size={10} />
                            {space.sector ? `${space.sector}, ` : ''}{space.city}
                          </div>

                          {space.description && (
                            <p className="text-xs line-clamp-2 mb-3 flex-1" style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                              {space.description}
                            </p>
                          )}

                          <div className="flex items-center justify-between mt-auto pt-3"
                            style={{ borderTop: '1px solid var(--border-subtle)' }}>
                            <div className="flex items-center gap-1.5">
                              <div className="w-6 h-6 rounded-lg flex items-center justify-center"
                                style={{ background: 'var(--brand-dim)' }}>
                                <CatIcon size={12} style={{ color: 'var(--brand)' }} />
                              </div>
                              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{catLabel}</span>
                            </div>
                            <span className="text-xs font-bold"
                              style={{ color: 'var(--brand)' }}>
                              Ver espacio →
                            </span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>

          {/* Mapa placeholder */}
          {viewMode === 'map' && (
            <div className="hidden lg:block lg:w-[45%] sticky top-44" style={{ height: 'calc(100vh - 12rem)' }}>
              <div className="w-full h-full rounded-3xl overflow-hidden relative"
                style={{ background: '#E8EDE9', border: '1px solid var(--border-subtle)' }}>
                {/* Fake map tiles pattern */}
                <div className="absolute inset-0 opacity-30"
                  style={{
                    backgroundImage: `
                      linear-gradient(rgba(53,196,147,0.3) 1px, transparent 1px),
                      linear-gradient(90deg, rgba(53,196,147,0.3) 1px, transparent 1px)
                    `,
                    backgroundSize: '40px 40px',
                  }} />

                {/* Pins de espacios */}
                {filtered.slice(0, 8).map((space, i) => {
                  const priceInfo = getPriceInfo(space)
                  const angle = (i / 8) * Math.PI * 2
                  const r = 25 + (i % 3) * 12
                  const left = 50 + r * Math.cos(angle)
                  const top  = 45 + r * Math.sin(angle) * 0.7
                  return (
                    <Link key={space.id} href={`/espacios/${space.slug}`}
                      className="absolute transform -translate-x-1/2 -translate-y-1/2 group z-10"
                      style={{ left: `${left}%`, top: `${top}%` }}>
                      <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full shadow-lg transition-all group-hover:scale-110"
                        style={{ background: '#fff', border: '2px solid var(--brand)', boxShadow: '0 4px 16px rgba(53,196,147,0.3)' }}>
                        <span className="text-xs font-bold" style={{ color: 'var(--brand)', whiteSpace: 'nowrap' }}>
                          {priceInfo?.label.split(' ')[0] ?? 'Ver'}
                        </span>
                      </div>
                      {/* Tooltip */}
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                        style={{ zIndex: 20 }}>
                        <div className="bg-white rounded-xl p-2 shadow-xl text-xs whitespace-nowrap"
                          style={{ border: '1px solid var(--border-subtle)' }}>
                          <div className="font-bold" style={{ color: 'var(--text-primary)' }}>{space.name}</div>
                          <div style={{ color: 'var(--text-muted)' }}>{space.sector ?? space.city}</div>
                        </div>
                      </div>
                    </Link>
                  )
                })}

                {/* Overlay mensaje */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
                  <div className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium"
                    style={{ background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(8px)', color: 'var(--text-secondary)', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                    <Map size={12} style={{ color: 'var(--brand)' }} />
                    Próximamente mapa interactivo completo
                  </div>
                </div>

                {/* Resultado count */}
                <div className="absolute top-4 left-4">
                  <div className="px-3 py-1.5 rounded-full text-xs font-bold"
                    style={{ background: '#fff', color: 'var(--text-primary)', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                    {filtered.length} espacio{filtered.length !== 1 ? 's' : ''}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Modal: Más filtros ── */}
      {moreOpen && (
        <>
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" onClick={() => setMoreOpen(false)} />
          <div className="fixed right-0 top-0 h-full w-full max-w-md z-50 flex flex-col overflow-hidden"
            style={{ background: '#fff', boxShadow: '-8px 0 40px rgba(0,0,0,0.12)' }}>

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5"
              style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              <div>
                <h2 className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>Más filtros</h2>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Ajusta tu búsqueda</p>
              </div>
              <button onClick={() => setMoreOpen(false)}
                className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors"
                style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8">

              {/* Capacidad */}
              <div>
                <h3 className="font-bold text-sm mb-1" style={{ color: 'var(--text-primary)' }}>
                  ¿Cuántos invitados tendrás?
                </h3>
                <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
                  Se mostrarán espacios con esa capacidad o mayor
                </p>
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex-1 flex items-center gap-2 rounded-xl px-4 py-3 input-base">
                    <Users size={15} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                    <input
                      type="number"
                      value={capacidadInput}
                      onChange={e => { setCapacidadInput(e.target.value); setCapacidad(e.target.value) }}
                      placeholder="Número exacto de personas"
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
                    <button key={n}
                      onClick={() => applyCapacity(String(n))}
                      className="px-4 py-2 rounded-xl text-sm font-semibold transition-all"
                      style={capacidad === String(n) ? {
                        background: 'var(--brand)', color: '#fff',
                      } : {
                        background: 'var(--bg-elevated)', color: 'var(--text-secondary)',
                        border: '1px solid var(--border-subtle)',
                      }}>
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
                        style={isActive ? {
                          background: 'var(--brand-dim)', color: 'var(--brand)',
                          border: '1.5px solid var(--brand-border)',
                        } : {
                          background: 'var(--bg-elevated)', color: 'var(--text-secondary)',
                          border: '1px solid var(--border-subtle)',
                        }}>
                        <Icon size={14} className="shrink-0" />
                        <span className="text-xs font-medium">{cat.label}</span>
                        {isActive && <Check size={12} className="ml-auto shrink-0" />}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Rango de precio */}
              <div>
                <h3 className="font-bold text-sm mb-3" style={{ color: 'var(--text-primary)' }}>Precio por hora</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs mb-1.5" style={{ color: 'var(--text-muted)' }}>Mínimo (RD$)</label>
                    <input type="number" value={priceMin} onChange={e => setPriceMin(e.target.value)}
                      placeholder="0" className="input-base w-full rounded-xl px-4 py-3 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs mb-1.5" style={{ color: 'var(--text-muted)' }}>Máximo (RD$)</label>
                    <input type="number" value={priceMax} onChange={e => setPriceMax(e.target.value)}
                      placeholder="Sin límite" className="input-base w-full rounded-xl px-4 py-3 text-sm" />
                  </div>
                </div>
              </div>

              {/* Características y amenidades */}
              <div>
                <h3 className="font-bold text-sm mb-3" style={{ color: 'var(--text-primary)' }}>
                  Características del espacio
                </h3>
                <div className="space-y-2">
                  {AMENITIES.map(am => {
                    const isActive = selectedAmenities.includes(am.key)
                    return (
                      <button key={am.key}
                        onClick={() => toggleAmenity(am.key)}
                        className="w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all"
                        style={isActive ? {
                          background: 'var(--brand-dim)', border: '1.5px solid var(--brand-border)',
                        } : {
                          background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)',
                        }}>
                        <span className="text-sm" style={{ color: isActive ? 'var(--brand)' : 'var(--text-primary)' }}>
                          {am.label}
                        </span>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all`}
                          style={isActive ? {
                            background: 'var(--brand)', borderColor: 'var(--brand)',
                          } : { borderColor: 'var(--border-medium)' }}>
                          {isActive && <Check size={11} className="text-white" />}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-5 flex gap-3"
              style={{ borderTop: '1px solid var(--border-subtle)' }}>
              <button onClick={clearAll}
                className="flex-1 py-3 rounded-2xl text-sm font-semibold transition-all btn-outline">
                Limpiar todo
              </button>
              <button onClick={() => setMoreOpen(false)}
                className="flex-1 py-3 rounded-2xl text-sm font-bold btn-brand">
                Ver {filtered.length} espacio{filtered.length !== 1 ? 's' : ''}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
