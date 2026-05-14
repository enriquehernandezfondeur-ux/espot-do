'use client'

import React, { useState, useRef } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { MapPin, Users, ArrowRight, Check, X, Building2, ChevronLeft, ChevronRight, Zap, Calendar } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { CATEGORIES, PRICING_TYPES } from './constants'

const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

function getAvailableDays(space: any): string | null {
  const blocks = (space.space_time_blocks ?? []).filter((b: any) => b.is_active !== false)
  if (!blocks.length) return null
  const allDays = new Set<number>()
  blocks.forEach((b: any) => (b.days_of_week ?? []).forEach((d: number) => allDays.add(d)))
  if (allDays.size === 0) return null
  if (allDays.size === 7) return 'Todos los días'
  const sorted = [...allDays].sort((a, b) => a - b)
  // Detectar rangos consecutivos
  if (sorted.join(',') === '1,2,3,4,5') return 'Lun – Vie'
  if (sorted.join(',') === '0,6')       return 'Sáb y Dom'
  if (sorted.join(',') === '5,6')       return 'Vie y Sáb'
  if (sorted.join(',') === '1,2,3,4,5,6') return 'Lun – Sáb'
  if (sorted.length <= 4) return sorted.map(d => DAY_NAMES[d]).join(' · ')
  return `${DAY_NAMES[sorted[0]]} – ${DAY_NAMES[sorted[sorted.length - 1]]}`
}

const FavoriteButton = dynamic(() => import('@/components/marketplace/FavoriteButton'), { ssr: false })

export function getCover(space: any) {
  return space.space_images?.find((i: any) => i.is_cover)?.url
      ?? space.space_images?.[0]?.url
      ?? null
}

export function getImages(space: any): string[] {
  const imgs: any[] = space.space_images ?? []
  const sorted = [...imgs].sort((a, b) => {
    if (a.is_cover && !b.is_cover) return -1
    if (!a.is_cover && b.is_cover) return 1
    return (a.position ?? 99) - (b.position ?? 99)
  })
  return sorted.map((i: any) => i.url).filter(Boolean)
}

export function getSpaceRating(space: any): { avg: number; count: number } | null {
  const reviews = (space.reviews ?? []).filter((r: any) => r.is_public && r.rating > 0)
  if (!reviews.length) return null
  const avg = reviews.reduce((s: number, r: any) => s + r.rating, 0) / reviews.length
  return { avg: Math.round(avg * 10) / 10, count: reviews.length }
}

export function getPriceInfo(space: any) {
  const p = space.space_pricing?.find((x: any) => x.is_active) ?? space.space_pricing?.[0]
  if (!p) return null
  if (p.pricing_type === 'hourly') {
    const v = p.hourly_price
    if (!v) return { type: 'Por hora', unit: '/ hora', amount: null, full: 'Cotizar precio' }
    return { type: 'Por hora', unit: '/ hora', amount: formatCurrency(v), full: `${formatCurrency(v)} / hora` }
  }
  if (p.pricing_type === 'minimum_consumption') {
    const v = p.minimum_consumption
    if (!v) return { type: 'Consumo mínimo', unit: '', amount: null, full: 'Cotizar precio' }
    return { type: 'Consumo mínimo', unit: '', amount: formatCurrency(v), full: formatCurrency(v) }
  }
  if (p.pricing_type === 'fixed_package') {
    const v = p.fixed_price
    if (!v) return { type: 'Paquete', unit: 'paquete', amount: null, full: 'Cotizar precio' }
    return { type: 'Paquete', unit: 'paquete', amount: formatCurrency(v), full: formatCurrency(v) }
  }
  return { type: 'Cotizar', unit: '', amount: null, full: 'Cotizar precio' }
}

export function SpaceCard({
  space, isHovered, onHover, dateFilter, timeFilter, isAvailable,
}: {
  space: any
  isHovered: boolean
  onHover: (id: string | null) => void
  dateFilter?: string
  timeFilter?: string
  isAvailable?: boolean
}) {
  const images     = getImages(space)
  const priceInfo  = getPriceInfo(space)
  const rating     = getSpaceRating(space)
  const catLabel   = CATEGORIES.find(c => c.value === space.category)?.label ?? (space.category || 'Espacio')
  const CatIcon    = CATEGORIES.find(c => c.value === space.category)?.icon ?? Building2
  const pricingDef = PRICING_TYPES.find(p => {
    const pt = space.space_pricing?.find((x: any) => x.is_active) ?? space.space_pricing?.[0]
    return p.value === pt?.pricing_type
  })
  const href = dateFilter
    ? `/espacios/${space.slug}?fecha=${dateFilter}${timeFilter ? `&hora=${timeFilter}` : ''}`
    : `/espacios/${space.slug}`

  const [photoIdx, setPhotoIdx]     = useState(0)
  const [showPriceInfo, setShowPriceInfo] = useState(false)
  const touchX = useRef<number | null>(null)

  const availableDays = getAvailableDays(space)

  // Tooltip explicativo del tipo de precio
  const PRICING_TIPS: Record<string, string> = {
    hourly:              'Pagas según las horas que uses el espacio.',
    minimum_consumption: 'Pagas este monto a través de Espot y lo usas en comida y bebidas en el lugar.',
    fixed_package:       'Precio fijo por el paquete completo, sin importar cuántas horas uses.',
    custom_quote:        'El propietario te envía un precio personalizado según tu evento.',
  }
  const currentPricingType = space.space_pricing?.find((p: any) => p.is_active)?.pricing_type
    ?? space.space_pricing?.[0]?.pricing_type
  const pricingTip = currentPricingType ? PRICING_TIPS[currentPricingType] : null

  function prevPhoto(e: React.MouseEvent) {
    e.preventDefault(); e.stopPropagation()
    setPhotoIdx(i => (i - 1 + images.length) % images.length)
  }
  function nextPhoto(e: React.MouseEvent) {
    e.preventDefault(); e.stopPropagation()
    setPhotoIdx(i => (i + 1) % images.length)
  }
  function dotClick(e: React.MouseEvent, idx: number) {
    e.preventDefault(); e.stopPropagation()
    setPhotoIdx(idx)
  }
  function onTouchStart(e: React.TouchEvent) { touchX.current = e.touches[0].clientX }
  function onTouchEnd(e: React.TouchEvent) {
    if (touchX.current === null) return
    const dx = e.changedTouches[0].clientX - touchX.current
    if (Math.abs(dx) > 40) {
      e.preventDefault(); e.stopPropagation()
      setPhotoIdx(i => dx < 0 ? (i + 1) % images.length : (i - 1 + images.length) % images.length)
    }
    touchX.current = null
  }

  function trackRecent() {
    try {
      const prev: string[] = JSON.parse(localStorage.getItem('espot_recent') ?? '[]')
      const next = [space.id, ...prev.filter((id: string) => id !== space.id)].slice(0, 6)
      localStorage.setItem('espot_recent', JSON.stringify(next))
    } catch {}
  }

  return (
    <Link href={href} className="group block" onClick={trackRecent}>
      <div
        className="rounded-2xl overflow-hidden h-full flex flex-col"
        style={{
          background: '#fff',
          border:     `1px solid ${isHovered ? 'rgba(53,196,147,0.45)' : 'var(--border-subtle)'}`,
          boxShadow:  isHovered ? '0 10px 36px rgba(0,0,0,0.1)' : '0 1px 6px rgba(0,0,0,0.05)',
          transform:  isHovered ? 'translateY(-3px)' : 'none',
          transition: 'transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease',
        }}
        onMouseEnter={() => onHover(space.id)}
        onMouseLeave={() => onHover(null)}
      >
        {/* ── Foto con slider ── */}
        <div className="relative overflow-hidden" style={{ aspectRatio: '16/10', flexShrink: 0 }}
          onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>

          {images.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg,#667eea,#764ba2)' }}>
              <CatIcon size={36} className="text-white opacity-60" />
            </div>
          ) : images.map((url, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={i} src={url} alt={space.name} loading="lazy"
              className="absolute inset-0 w-full h-full object-cover transition-opacity duration-[400ms]"
              style={{ opacity: i === photoIdx ? 1 : 0, zIndex: i === photoIdx ? 1 : 0,
                transform: i === photoIdx && isHovered ? 'scale(1.06)' : 'scale(1)',
                transition: 'opacity 0.35s ease, transform 0.7s ease' }} />
          ))}

          {/* Flechas prev/next — visibles en hover si hay >1 foto */}
          {images.length > 1 && isHovered && (
            <>
              {[
                { onClick: prevPhoto, icon: ChevronLeft, side: 'left' as const },
                { onClick: nextPhoto, icon: ChevronRight, side: 'right' as const },
              ].map(({ onClick, icon: Icon, side }) => (
                <button key={side} type="button" onClick={onClick}
                  className="absolute top-1/2 -translate-y-1/2 z-20 flex items-center justify-center rounded-full transition-all duration-150"
                  style={{
                    [side]: 10,
                    width: 32, height: 32,
                    background: '#fff',
                    boxShadow: '0 2px 12px rgba(0,0,0,0.22), 0 0 0 1px rgba(0,0,0,0.06)',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.transform = 'translateY(-50%) scale(1.1)'
                    ;(e.currentTarget as HTMLElement).style.boxShadow = '0 4px 16px rgba(0,0,0,0.28), 0 0 0 1px rgba(0,0,0,0.08)'
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.transform = 'translateY(-50%) scale(1)'
                    ;(e.currentTarget as HTMLElement).style.boxShadow = '0 2px 12px rgba(0,0,0,0.22), 0 0 0 1px rgba(0,0,0,0.06)'
                  }}>
                  <Icon size={16} style={{ color: '#0F1623' }} />
                </button>
              ))}
            </>
          )}

          {/* Dots — visibles si hay >1 foto */}
          {images.length > 1 && (
            <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1 z-20">
              {images.slice(0, 8).map((_, i) => (
                <button type="button" key={i} onClick={e => dotClick(e, i)}
                  style={{ width: i === photoIdx ? 20 : 7, height: 7, borderRadius: 4, padding: 0, border: 'none', cursor: 'pointer',
                    background: i === photoIdx ? '#fff' : 'rgba(255,255,255,0.55)', transition: 'all 0.3s ease' }} />
              ))}
            </div>
          )}

          {/* Favorito — top right */}
          <div className="absolute top-3 right-3 z-20">
            <FavoriteButton spaceId={space.id} size="sm" />
          </div>

          {/* Badge top-left: disponibilidad > instantánea > verificado */}
          {isAvailable !== undefined ? (
            <span className="absolute top-3 left-3 z-20 flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full"
              style={{ background: isAvailable ? 'rgba(53,196,147,0.92)' : 'rgba(220,38,38,0.85)', color: '#fff', backdropFilter: 'blur(8px)' }}>
              {isAvailable ? <Check size={9} /> : <X size={9} />}
              {isAvailable ? 'Disponible' : 'No disponible'}
            </span>
          ) : space.instant_booking ? (
            <span className="absolute top-3 left-3 z-20 flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full"
              style={{ background: 'rgba(37,99,235,0.9)', color: '#fff', backdropFilter: 'blur(8px)' }}>
              <Zap size={9} style={{ fill: '#fff' }} /> Instantánea
            </span>
          ) : space.is_verified ? (
            <span className="absolute top-3 left-3 z-20 flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full"
              style={{ background: 'rgba(53,196,147,0.9)', color: '#fff', backdropFilter: 'blur(8px)' }}>
              <Check size={9} /> Verificado
            </span>
          ) : null}
        </div>

        {/* ── Info ── */}
        <div className="p-4 flex flex-col gap-2 flex-1">

          {/* Nombre */}
          <h3 className="font-semibold text-sm leading-snug truncate"
            style={{ color: '#0F1623', letterSpacing: '-0.01em' }}>
            {space.name}
          </h3>

          {/* Ubicación + categoría + rating — todo en una línea */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1 text-xs min-w-0" style={{ color: 'var(--text-muted)' }}>
              <MapPin size={10} className="shrink-0" />
              <span className="truncate">{[space.sector, space.city].filter(Boolean).join(', ') || 'Santo Domingo'}</span>
              <span className="shrink-0" style={{ color: '#D1D5DB' }}>·</span>
              <CatIcon size={10} className="shrink-0" />
              <span className="shrink-0 whitespace-nowrap">{catLabel}</span>
            </div>
            {rating && (
              <div className="flex items-center gap-0.5 shrink-0">
                <span style={{ color: '#F59E0B', fontSize: 11 }}>★</span>
                <span className="text-xs font-semibold" style={{ color: '#0F1623' }}>{rating.avg}</span>
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>({rating.count})</span>
              </div>
            )}
          </div>

          {/* Días disponibles (#3) */}
          {availableDays && (
            <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-muted)' }}>
              <Calendar size={10} className="shrink-0" />
              <span>{availableDays}</span>
            </div>
          )}

          {/* Precio · badge tipo · capacidad */}
          <div className="flex items-center gap-2 pt-2.5 mt-auto"
            style={{ borderTop: '1px solid #F0F2F5' }}>

            {/* Grupo izquierdo: precio + badge + tooltip (#4) */}
            <div className="flex items-center gap-1.5 min-w-0 flex-1 overflow-hidden">
              {priceInfo?.amount ? (
                <span className="font-bold text-sm shrink-0" style={{ color: '#0F1623' }}>
                  {priceInfo.amount}
                </span>
              ) : (
                <span className="text-sm font-semibold shrink-0" style={{ color: 'var(--text-muted)' }}>Cotizar</span>
              )}
              {pricingDef?.value && (
                <div className="relative shrink-0">
                  <button
                    type="button"
                    onClick={e => { e.preventDefault(); e.stopPropagation(); setShowPriceInfo(o => !o) }}
                    className="text-[11px] font-semibold px-1.5 py-0.5 rounded-md whitespace-nowrap"
                    style={{ background: pricingDef.bg, color: pricingDef.text, border: `1px solid ${pricingDef.border}` }}>
                    {pricingDef.value === 'minimum_consumption' ? 'Consumo mínimo' : pricingDef.label}
                  </button>
                  {showPriceInfo && pricingTip && (
                    <div className="absolute bottom-full mb-1.5 left-0 z-50 w-52 rounded-xl px-3 py-2.5 shadow-xl text-xs leading-relaxed"
                      style={{ background: '#0F1623', color: '#E2E8F0' }}
                      onClick={e => e.stopPropagation()}>
                      {pricingTip}
                      <div style={{ position: 'absolute', bottom: -5, left: 12, width: 10, height: 10,
                        background: '#0F1623', transform: 'rotate(45deg)' }} />
                    </div>
                  )}
                </div>
              )}
              {(() => {
                const p   = space.space_pricing?.find((x: any) => x.is_active) ?? space.space_pricing?.[0]
                const wm  = Number(p?.weekend_multiplier ?? 1)
                if (!wm || wm === 1) return null
                const pct = Math.round(Math.abs(wm - 1) * 100)
                if (pct === 0) return null
                const isDiscount = wm < 1
                return (
                  <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded-md whitespace-nowrap shrink-0"
                    style={{
                      background: isDiscount ? 'rgba(34,197,94,0.1)' : 'rgba(245,158,11,0.1)',
                      color:      isDiscount ? '#16A34A' : '#D97706',
                      border:     `1px solid ${isDiscount ? 'rgba(34,197,94,0.25)' : 'rgba(245,158,11,0.25)'}`,
                    }}>
                    {isDiscount ? `-${pct}%` : `+${pct}%`} fines
                  </span>
                )
              })()}
            </div>

            {/* Capacidad + botón Preguntar (#5) */}
            <div className="flex items-center gap-2 shrink-0">
              <span className="flex items-center gap-1 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                <Users size={11} style={{ color: '#35C493', flexShrink: 0 }} />
                {space.capacity_max ?? '—'}
              </span>
              <Link
                href={`/espacios/${space.slug}?chat=1`}
                onClick={e => e.stopPropagation()}
                className="flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-lg shrink-0 transition-all"
                style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}>
                💬 Preguntar
              </Link>
            </div>
          </div>

        </div>
      </div>
    </Link>
  )
}
