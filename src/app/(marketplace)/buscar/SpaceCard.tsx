'use client'

import React, { useState, useRef } from 'react'
import dynamic from 'next/dynamic'
import Image from 'next/image'
import Link from 'next/link'
import { MapPin, Users, Check, X, ChevronLeft, ChevronRight, Zap, Star, Wine, KeyRound, ArrowLeftRight } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { summarizePricing, getActivePricing } from '@/lib/pricing'
import { PRICING_TYPES } from './constants'
import { getCategoryLabel, getCategoryIcon } from '@/lib/categories'

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

export function SpaceCard({
  space, isHovered, onHover, dateFilter, timeFilter, isAvailable, eager = false,
}: {
  space: any
  isHovered: boolean
  onHover: (id: string | null) => void
  dateFilter?: string
  timeFilter?: string
  isAvailable?: boolean
  /** Solo las primeras cards above-the-fold deben precargar (priority) para no romper el LCP */
  eager?: boolean
}) {
  const images     = getImages(space)
  const pricing    = getActivePricing(space.space_pricing)
  const summary    = summarizePricing(pricing)
  const rating     = getSpaceRating(space)
  const catLabel   = getCategoryLabel(space.category, { plural: true })
  const CatIcon    = getCategoryIcon(space.category)
  const pricingDef = PRICING_TYPES.find(p => p.value === summary?.typeKey)
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
  const pricingTip = summary?.typeKey ? PRICING_TIPS[summary.typeKey] : null

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
              style={{ background: 'linear-gradient(135deg,var(--brand-navy),#0D4A3A)' }}>
              <CatIcon size={36} style={{ color: 'var(--brand)', opacity: 0.6 }} />
            </div>
          ) : images.map((url, i) => (
            <Image key={i} src={url} alt={space.name} fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              priority={eager && i === 0}
              loading={eager && i === 0 ? undefined : 'lazy'}
              className="object-cover transition-opacity duration-[400ms]"
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

          {/* Contador de fotos — solo cuando hay hover, discreto en esquina */}
          {images.length > 1 && isHovered && (
            <div className="absolute bottom-2.5 right-3 z-20 flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold"
              style={{ background: 'rgba(0,0,0,0.45)', color: '#fff', backdropFilter: 'blur(4px)' }}>
              {photoIdx + 1} / {images.length}
            </div>
          )}

          {/* Favorito — top right */}
          <div className="absolute top-3 right-3 z-20">
            <FavoriteButton spaceId={space.id} size="sm" />
          </div>

          {/* Badge top-left: disponibilidad > instantánea */}
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
          ) : null}

          {/* Badge bottom-left: destacado por el equipo (is_featured).
              Va abajo-izquierda para no solaparse con el botón de Favorito (top-right). */}
          {space.is_featured && (
            <span className="absolute bottom-3 left-3 z-20 flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full"
              style={{ background: 'rgba(3,49,60,0.9)', color: '#fff', backdropFilter: 'blur(8px)' }}>
              <Star size={9} style={{ fill: '#F5C451', color: '#F5C451' }} /> Destacado
            </span>
          )}
        </div>

        {/* ── Info ── */}
        <div className="p-4 flex flex-col gap-2 flex-1">

          {/* Nombre */}
          <div className="flex items-center gap-1.5 min-w-0">
            <h3 className="font-semibold text-sm leading-snug truncate min-w-0"
              title={space.name}
              style={{ color: '#0F1623', letterSpacing: '-0.01em' }}>
              {space.name}
            </h3>
            {space.is_verified && (
              <span className="flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center"
                style={{ background: 'var(--brand)' }}>
                <Check size={9} style={{ color: '#fff', strokeWidth: 3 }} />
              </span>
            )}
            {/* El plan Pro es información interna del propietario — no se muestra al público. */}
          </div>

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

          {/* ── Bloque de precio ──────────────────────────────────────
              Jerarquía: ① mínimo real ("Desde RD$X") → ② tarifa + horas
              → ③ tipo + condición de consumo + fin de semana. */}
          <div className="pt-2.5 mt-auto" style={{ borderTop: '1px solid #F0F2F5' }}>

            {/* ① Mínimo real para alquilar + capacidad */}
            <div className="flex items-end justify-between gap-2">
              <div className="min-w-0">
                {summary?.minTotal != null ? (
                  <div className="flex items-baseline gap-1 flex-wrap">
                    {summary.typeKey !== 'fixed_package' && (
                      <span className="text-[11px] font-medium" style={{ color: 'var(--text-muted)' }}>Desde</span>
                    )}
                    <span className="font-bold leading-none" style={{ fontSize: 18, color: '#0F1623', letterSpacing: '-0.02em' }}>
                      {formatCurrency(summary.minTotal)}
                    </span>
                  </div>
                ) : (
                  <span className="font-bold text-sm" style={{ color: 'var(--text-muted)' }}>Cotizar precio</span>
                )}

                {/* ② Tarifa por hora + rango de horas */}
                {(summary?.rate || summary?.hoursLabel) && (
                  <div className="text-[11px] mt-1 truncate" style={{ color: 'var(--text-muted)' }} title={[
                    summary?.rate ? `${formatCurrency(summary.rate)}/hora` : null,
                    summary?.hoursLabel,
                  ].filter(Boolean).join(' · ')}>
                    {summary?.rate && <>{formatCurrency(summary.rate)}/hora</>}
                    {summary?.rate && summary?.hoursLabel && ' · '}
                    {summary?.hoursLabel}
                  </div>
                )}
              </div>

              <span className="flex items-center gap-1 text-xs font-medium shrink-0" style={{ color: 'var(--text-muted)' }}>
                <Users size={12} style={{ color: 'var(--brand)', flexShrink: 0 }} />
                {space.capacity_min && space.capacity_min !== space.capacity_max
                  ? `${space.capacity_min}–${space.capacity_max}`
                  : space.capacity_max ?? '—'}
              </span>
            </div>

            {/* ③ Tipo + condición de consumo + fin de semana — envuelve, sin recorte */}
            <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
              {pricingDef?.value && (
                <div className="relative">
                  <button
                    type="button"
                    onClick={e => { e.preventDefault(); e.stopPropagation(); setShowPriceInfo(o => !o) }}
                    className="text-[11px] font-semibold px-1.5 py-0.5 rounded-md whitespace-nowrap"
                    style={{ background: pricingDef.bg, color: pricingDef.text, border: `1px solid ${pricingDef.border}` }}>
                    {summary?.typeLabel ?? pricingDef.label}
                  </button>
                  {showPriceInfo && pricingTip && (
                    <>
                      {/* Backdrop para cerrar en móvil */}
                      <div className="fixed inset-0 z-40" onClick={e => { e.preventDefault(); e.stopPropagation(); setShowPriceInfo(false) }} />
                      <div className="absolute bottom-full mb-1.5 left-0 z-50 w-52 rounded-xl px-3 py-2.5 shadow-xl text-xs leading-relaxed"
                        style={{ background: '#0F1623', color: '#E2E8F0' }}
                        onClick={e => e.stopPropagation()}>
                        {pricingTip}
                        <div style={{ position: 'absolute', bottom: -5, left: 12, width: 10, height: 10,
                          background: '#0F1623', transform: 'rotate(45deg)' }} />
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Condición de consumo (solo cuando es informativa: tarifa por hora).
                  Para "Consumibles" el propio tipo ya lo dice → no se repite. */}
              {summary?.typeKey === 'hourly' && summary.consumption === 'consumable' && (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-1.5 py-0.5 rounded-md whitespace-nowrap"
                  style={{ background: 'rgba(180,83,9,0.09)', color: '#B45309', border: '1px solid rgba(180,83,9,0.22)' }}>
                  <Wine size={10} /> Consumible
                </span>
              )}
              {summary?.typeKey === 'hourly' && summary.consumption === 'space' && (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-1.5 py-0.5 rounded-md whitespace-nowrap"
                  style={{ background: 'rgba(71,85,105,0.08)', color: '#475569', border: '1px solid rgba(71,85,105,0.2)' }}>
                  <KeyRound size={10} /> Uso del espacio
                </span>
              )}
              {/* El host permite que el cliente elija la modalidad al reservar. */}
              {summary?.typeKey === 'hourly' && summary.consumption === 'optional' && (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-1.5 py-0.5 rounded-md whitespace-nowrap"
                  style={{ background: 'rgba(53,196,147,0.09)', color: '#0B7A55', border: '1px solid rgba(53,196,147,0.25)' }}>
                  <ArrowLeftRight size={10} /> Tú eliges
                </span>
              )}

              {/* Recargo/descuento de fin de semana */}
              {summary?.weekend && (
                <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded-md whitespace-nowrap"
                  style={{
                    background: summary.weekend.isDiscount ? 'rgba(34,197,94,0.1)' : 'rgba(245,158,11,0.1)',
                    color:      summary.weekend.isDiscount ? '#16A34A' : '#D97706',
                    border:     `1px solid ${summary.weekend.isDiscount ? 'rgba(34,197,94,0.25)' : 'rgba(245,158,11,0.25)'}`,
                  }}>
                  {summary.weekend.isDiscount ? `-${summary.weekend.pct}%` : `+${summary.weekend.pct}%`} fines
                </span>
              )}
            </div>

          </div>

        </div>
      </div>
    </Link>
  )
}
