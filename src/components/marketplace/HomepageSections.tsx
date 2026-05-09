'use client'

import { useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import {
  ArrowRight, Shield, Users, Search, Clock, CreditCard,
  MapPin, Building2, UtensilsCrossed, Sunset,
  Wine, Trees, Camera, Briefcase, Home,
  ChevronLeft, ChevronRight,
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

const FavoriteButton = dynamic(() => import('@/components/marketplace/FavoriteButton'), { ssr: false })

// ── Hook de animación al entrar en viewport ───────────────
function useReveal(threshold = 0.12) {
  const ref     = useRef<HTMLDivElement>(null)
  const [on, setOn] = useState(false)
  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setOn(true) },
      { threshold }
    )
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [threshold])
  return { ref, on }
}

// ── Utilidades ────────────────────────────────────────────
const categories = [
  { value: 'salon',       label: 'Salones',      icon: Building2 },
  { value: 'restaurante', label: 'Restaurantes', icon: UtensilsCrossed },
  { value: 'rooftop',    label: 'Rooftops',     icon: Sunset },
  { value: 'bar',        label: 'Bares',        icon: Wine },
  { value: 'terraza',    label: 'Terrazas',     icon: Trees },
  { value: 'estudio',    label: 'Estudios',     icon: Camera },
  { value: 'coworking',  label: 'Coworking',    icon: Briefcase },
  { value: 'villa',      label: 'Villas',       icon: Home },
]

const eventTypes = [
  { label: 'Cumpleaños',   slug: 'cumpleanos',    img: 'https://images.unsplash.com/photo-1464349095431-e9a21285b5f3?w=700&q=85&fit=crop' },
  { label: 'Bodas',        slug: 'bodas',         img: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=700&q=85&fit=crop' },
  { label: 'Corporativo',  slug: 'corporativo',   img: 'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=700&q=85&fit=crop' },
  { label: 'Graduación',   slug: 'graduacion',    img: 'https://images.unsplash.com/photo-1627556704302-624286467c65?w=700&q=85&fit=crop' },
  { label: 'Quinceañeras', slug: 'quinceaneras',  img: 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=700&q=85&fit=crop' },
  { label: 'Baby Shower',  slug: 'baby-shower',   img: 'https://images.unsplash.com/photo-1529634806980-85c3dd6d34ac?w=700&q=85&fit=crop' },
]

function getImages(space: any): string[] {
  const imgs: any[] = space.space_images ?? []
  const sorted = [...imgs].sort((a, b) => {
    if (a.is_cover && !b.is_cover) return -1
    if (!a.is_cover && b.is_cover) return 1
    return (a.position ?? 99) - (b.position ?? 99)
  })
  return sorted.map((i: any) => i.url).filter(Boolean)
}

function getPriceLabel(space: any) {
  const p = space.space_pricing?.find((x: any) => x.is_active) ?? space.space_pricing?.[0]
  if (!p) return null
  if (p.pricing_type === 'hourly')              return { price: formatCurrency(p.hourly_price), unit: '/ hora' }
  if (p.pricing_type === 'minimum_consumption') return { price: formatCurrency(p.minimum_consumption), unit: 'consumo mín.' }
  if (p.pricing_type === 'fixed_package')       return { price: formatCurrency(p.fixed_price), unit: 'paquete' }
  return { price: 'Cotizar', unit: '' }
}

function getSpaceRating(space: any): { avg: number; count: number } | null {
  const reviews = (space.reviews ?? []).filter((r: any) => r.is_public && r.rating > 0)
  if (!reviews.length) return null
  const avg = reviews.reduce((s: number, r: any) => s + r.rating, 0) / reviews.length
  return { avg: Math.round(avg * 10) / 10, count: reviews.length }
}

// ── Fade + slide wrapper ──────────────────────────────────
function Reveal({ children, delay = 0, className = '', style = {} }: {
  children: React.ReactNode; delay?: number; className?: string; style?: React.CSSProperties
}) {
  const { ref, on } = useReveal()
  return (
    <div ref={ref} className={className} style={{
      ...style,
      opacity: on ? 1 : 0,
      transform: on ? 'translateY(0)' : 'translateY(28px)',
      transition: `opacity 0.7s ease ${delay}ms, transform 0.7s ease ${delay}ms`,
    }}>
      {children}
    </div>
  )
}

// ── Marquee ticker ────────────────────────────────────────
const TICKER_ITEMS = [
  'Salones de eventos', 'Rooftops exclusivos', 'Restaurantes privados',
  'Villas de lujo', 'Terrazas con vista', 'Bares privados',
  'Estudios creativos', 'Espacios Coworking', 'Punta Cana',
  'Santo Domingo', 'Santiago', 'Cap Cana',
]

function Ticker() {
  const items = [...TICKER_ITEMS, ...TICKER_ITEMS]
  return (
    <div className="overflow-hidden py-3.5" style={{ background: '#060D09', borderTop: '1px solid rgba(53,196,147,0.08)', borderBottom: '1px solid rgba(53,196,147,0.08)' }}>
      <div style={{ display: 'flex', animation: 'ticker 28s linear infinite', whiteSpace: 'nowrap', willChange: 'transform' }}>
        {items.map((item, i) => (
          <span key={i} className="inline-flex items-center gap-3 mx-4 text-xs font-semibold tracking-widest uppercase"
            style={{ color: 'rgba(255,255,255,0.25)' }}>
            <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#35C493', display: 'inline-block', flexShrink: 0 }} />
            {item}
          </span>
        ))}
      </div>
      <style>{`@keyframes ticker { from { transform: translateX(0) } to { transform: translateX(-50%) } }`}</style>
    </div>
  )
}

// ── SpaceCard con slider de fotos ─────────────────────────
function SpaceCard({ space }: { space: any }) {
  const images     = getImages(space)
  const priceInfo  = getPriceLabel(space)
  const rating     = getSpaceRating(space)
  const catDef     = categories.find(c => c.value === space.category)
  const CatIcon    = catDef?.icon ?? Building2

  const [photoIdx, setPhotoIdx]   = useState(0)
  const [showNav,  setShowNav]    = useState(false)
  const touchX = useRef<number | null>(null)

  function prevPhoto(e: React.MouseEvent | React.TouchEvent) {
    e.preventDefault(); e.stopPropagation()
    setPhotoIdx(i => (i - 1 + images.length) % images.length)
  }
  function nextPhoto(e: React.MouseEvent | React.TouchEvent) {
    e.preventDefault(); e.stopPropagation()
    setPhotoIdx(i => (i + 1) % images.length)
  }
  function dotClick(e: React.MouseEvent, idx: number) {
    e.preventDefault(); e.stopPropagation()
    setPhotoIdx(idx)
  }
  function onTouchStart(e: React.TouchEvent) {
    touchX.current = e.touches[0].clientX
  }
  function onTouchEnd(e: React.TouchEvent) {
    if (touchX.current === null) return
    const dx = e.changedTouches[0].clientX - touchX.current
    if (Math.abs(dx) > 40) dx < 0 ? nextPhoto(e) : prevPhoto(e)
    touchX.current = null
  }

  return (
    <Link href={`/espacios/${space.slug}`} className="group block h-full">
      <div className="rounded-2xl overflow-hidden h-full flex flex-col"
        style={{
          background: '#fff',
          border: '1px solid #E8ECF0',
          boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
          transition: 'box-shadow 0.3s ease, transform 0.3s ease, border-color 0.3s ease',
        }}
        onMouseEnter={e => {
          setShowNav(true)
          const el = e.currentTarget as HTMLDivElement
          el.style.boxShadow = '0 12px 40px rgba(0,0,0,0.12)'
          el.style.transform  = 'translateY(-2px)'
          el.style.borderColor = 'rgba(53,196,147,0.4)'
        }}
        onMouseLeave={e => {
          setShowNav(false)
          const el = e.currentTarget as HTMLDivElement
          el.style.boxShadow = '0 2px 12px rgba(0,0,0,0.05)'
          el.style.transform  = 'translateY(0)'
          el.style.borderColor = '#E8ECF0'
        }}>

        {/* ── Foto con slider ── */}
        <div className="relative overflow-hidden"
          style={{ aspectRatio: '16/10', flexShrink: 0 }}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}>

          {images.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg,#667eea,#764ba2)' }}>
              <CatIcon size={40} className="text-white opacity-70" />
            </div>
          ) : (
            images.map((url, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={i} src={url} alt={space.name} loading="lazy"
                className="absolute inset-0 w-full h-full object-cover"
                style={{
                  opacity: i === photoIdx ? 1 : 0,
                  zIndex:  i === photoIdx ? 1 : 0,
                  transition: 'opacity 0.4s ease',
                  transform: i === photoIdx && showNav ? 'scale(1.04)' : 'scale(1)',
                  transitionProperty: 'opacity, transform',
                  transitionDuration: '0.4s, 0.7s',
                }} />
            ))
          )}

          {/* Flechas — visibles en hover si hay >1 foto */}
          {images.length > 1 && showNav && (
            <>
              <button type="button" onClick={prevPhoto}
                className="absolute left-2 z-20 flex items-center justify-center rounded-full transition-all"
                style={{
                  top: '50%', transform: 'translateY(-50%)',
                  width: 28, height: 28,
                  background: 'rgba(255,255,255,0.9)',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                }}>
                <ChevronLeft size={15} style={{ color: '#0F1623' }} />
              </button>
              <button type="button" onClick={nextPhoto}
                className="absolute right-2 z-20 flex items-center justify-center rounded-full transition-all"
                style={{
                  top: '50%', transform: 'translateY(-50%)',
                  width: 28, height: 28,
                  background: 'rgba(255,255,255,0.9)',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                }}>
                <ChevronRight size={15} style={{ color: '#0F1623' }} />
              </button>
            </>
          )}

          {/* Dots — siempre visibles si >1 foto */}
          {images.length > 1 && (
            <div className="absolute bottom-2.5 left-0 right-0 flex justify-center gap-1 z-20">
              {images.slice(0, 8).map((_, i) => (
                <button type="button" key={i} onClick={e => dotClick(e, i)}
                  style={{
                    width: i === photoIdx ? 16 : 5, height: 5, borderRadius: 3,
                    background: i === photoIdx ? '#fff' : 'rgba(255,255,255,0.55)',
                    transition: 'all 0.3s ease',
                    padding: 0, border: 'none', cursor: 'pointer',
                  }} />
              ))}
            </div>
          )}

          {/* Precio — bottom left */}
          {priceInfo && (
            <div className="absolute bottom-3 left-3 z-10 text-xs font-bold px-3 py-1.5 rounded-full"
              style={{ background: 'rgba(0,0,0,0.72)', color: '#fff', backdropFilter: 'blur(8px)' }}>
              {priceInfo.price}
              {priceInfo.unit && <span className="opacity-70 font-normal ml-1">· {priceInfo.unit}</span>}
            </div>
          )}

          {/* Capacidad — bottom right (desplazado si hay dots) */}
          <div className="absolute z-10 flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-full"
            style={{
              bottom: images.length > 1 ? 28 : 12,
              right: 12,
              background: 'rgba(0,0,0,0.6)', color: '#fff', backdropFilter: 'blur(8px)',
              transition: 'bottom 0.2s',
            }}>
            <Users size={10} /> {space.capacity_max}
          </div>

          {/* Favorito — top right */}
          <div className="absolute top-3 right-3 z-20">
            <FavoriteButton spaceId={space.id} size="sm" />
          </div>

          {/* Badge top-left */}
          {space.instant_booking ? (
            <span className="absolute top-3 left-3 z-10 flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full"
              style={{ background: 'rgba(37,99,235,0.88)', color: '#fff' }}>
              ⚡ Instantánea
            </span>
          ) : space.is_verified ? (
            <span className="absolute top-3 left-3 z-10 flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full"
              style={{ background: 'rgba(53,196,147,0.9)', color: '#fff' }}>
              <Shield size={9} /> Verificado
            </span>
          ) : null}

          {/* Contador de fotos — top center, solo si >1 */}
          {images.length > 1 && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 text-xs font-semibold px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(0,0,0,0.5)', color: '#fff', backdropFilter: 'blur(4px)' }}>
              {photoIdx + 1} / {images.length}
            </div>
          )}
        </div>

        {/* ── Info ── */}
        <div className="p-4 flex flex-col flex-1">
          <h3 className="font-semibold text-sm leading-snug mb-1.5"
            style={{ color: '#0F1623', letterSpacing: '-0.01em' }}>
            {space.name}
          </h3>

          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-xs min-w-0" style={{ color: '#94A3B8' }}>
              <MapPin size={10} className="shrink-0" />
              <span className="truncate">{space.sector ? `${space.sector}, ` : ''}{space.city}</span>
            </div>
            {rating && (
              <div className="flex items-center gap-1 shrink-0 text-xs">
                <span style={{ color: '#F59E0B' }}>★</span>
                <span className="font-semibold" style={{ color: '#0F1623' }}>{rating.avg}</span>
                <span style={{ color: '#94A3B8' }}>({rating.count})</span>
              </div>
            )}
          </div>

          <div className="mt-auto pt-3 flex items-center justify-between"
            style={{ borderTop: '1px solid #F0F2F5', marginTop: 12 }}>
            <span className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-lg"
              style={{ background: '#F4F6F8', color: '#6B7280' }}>
              <CatIcon size={10} /> {catDef?.label ?? space.category}
            </span>
            <ArrowRight size={14} style={{ color: '#35C493', transition: 'transform 0.2s' }}
              className="group-hover:translate-x-1" />
          </div>
        </div>
      </div>
    </Link>
  )
}

// ── Carrusel de espacios ──────────────────────────────────
function SpacesCarousel({ spaces }: { spaces: any[] }) {
  const trackRef   = useRef<HTMLDivElement>(null)
  const pausedRef  = useRef(false)
  const [canPrev, setCanPrev] = useState(false)
  const [canNext, setCanNext] = useState(true)

  function updateArrows() {
    const el = trackRef.current
    if (!el) return
    setCanPrev(el.scrollLeft > 10)
    setCanNext(el.scrollLeft < el.scrollWidth - el.clientWidth - 10)
  }

  function scrollDir(dir: 1 | -1) {
    const el = trackRef.current
    if (!el) return
    const firstCard = el.firstElementChild as HTMLElement
    const step = (firstCard?.offsetWidth ?? 320) + 20
    const maxScroll = el.scrollWidth - el.clientWidth

    if (dir === 1 && el.scrollLeft >= maxScroll - 10) {
      el.scrollTo({ left: 0, behavior: 'smooth' })
    } else {
      el.scrollBy({ left: dir * step, behavior: 'smooth' })
    }
    setTimeout(updateArrows, 400)
  }

  // Auto-avance cada 4.5 s
  useEffect(() => {
    if (spaces.length <= 3) return
    const interval = setInterval(() => {
      if (!pausedRef.current) scrollDir(1)
    }, 4500)
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spaces.length])

  return (
    <div className="relative"
      onMouseEnter={() => { pausedRef.current = true }}
      onMouseLeave={() => { pausedRef.current = false }}>

      {/* Track scrollable */}
      <div ref={trackRef}
        className="flex gap-5 overflow-x-auto pb-2"
        style={{ scrollSnapType: 'x mandatory', scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        onScroll={updateArrows}>
        <style>{`.spaces-track::-webkit-scrollbar{display:none}`}</style>
        {spaces.map(space => (
          <div key={space.id}
            className="shrink-0"
            style={{
              width: 'clamp(260px, calc(33.333% - 14px), 380px)',
              scrollSnapAlign: 'start',
            }}>
            <SpaceCard space={space} />
          </div>
        ))}
      </div>

      {/* Botón Prev */}
      {canPrev && (
        <button type="button" onClick={() => scrollDir(-1)}
          className="absolute left-0 top-1/2 z-10 flex items-center justify-center rounded-full transition-all"
          style={{
            transform: 'translate(-50%, -50%)',
            width: 40, height: 40,
            background: '#fff',
            boxShadow: '0 4px 16px rgba(0,0,0,0.14)',
            border: '1px solid #E8ECF0',
          }}>
          <ChevronLeft size={18} style={{ color: '#0F1623' }} />
        </button>
      )}

      {/* Botón Next */}
      {canNext && (
        <button type="button" onClick={() => scrollDir(1)}
          className="absolute right-0 top-1/2 z-10 flex items-center justify-center rounded-full transition-all"
          style={{
            transform: 'translate(50%, -50%)',
            width: 40, height: 40,
            background: '#fff',
            boxShadow: '0 4px 16px rgba(0,0,0,0.14)',
            border: '1px solid #E8ECF0',
          }}>
          <ChevronRight size={18} style={{ color: '#0F1623' }} />
        </button>
      )}
    </div>
  )
}

// ── Componente principal ──────────────────────────────────
export default function HomepageSections({ spaces }: { spaces: any[] }) {

  const evSection  = useReveal()
  const catSection = useReveal()
  const howSection = useReveal()

  return (
    <div style={{ background: '#fff' }}>

      {/* ── TICKER ── */}
      <Ticker />

      {/* ── TIPOS DE EVENTO ── */}
      <section className="py-14 md:py-20" style={{ background: '#fff' }}>
        <div className="max-w-7xl mx-auto px-4 md:px-6">

          <Reveal className="flex items-end justify-between mb-10 md:mb-12">
            <div>
              <p className="text-xs font-bold tracking-widest uppercase mb-2" style={{ color: '#35C493' }}>
                Por tipo de evento
              </p>
              <h2 className="font-bold" style={{ color: '#0F1623', fontSize: 'clamp(1.6rem, 4vw, 2.25rem)', letterSpacing: '-0.04em' }}>
                ¿Qué estás{' '}
                <span style={{ background: 'linear-gradient(95deg, #35C493, #5CE8BC)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  celebrando?
                </span>
              </h2>
            </div>
            <Link href="/buscar" className="hidden md:flex items-center gap-1.5 text-sm font-semibold"
              style={{ color: '#6B7280' }}>
              Ver todos <ArrowRight size={14} />
            </Link>
          </Reveal>

          <div ref={evSection.ref} className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
            {eventTypes.map((et, i) => (
              <Link key={et.slug} href={`/buscar?activity=${et.slug}`}
                className="group relative block overflow-hidden"
                style={{
                  borderRadius: 20,
                  aspectRatio: '4/3',
                  boxShadow: '0 4px 24px rgba(0,0,0,0.10)',
                  opacity: evSection.on ? 1 : 0,
                  transform: evSection.on ? 'translateY(0) scale(1)' : 'translateY(24px) scale(0.97)',
                  transition: `opacity 0.6s ease ${i * 80}ms, transform 0.6s ease ${i * 80}ms`,
                }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={et.img} alt={et.label}
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.06]" />
                <div className="absolute inset-0"
                  style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.05) 60%, transparent 100%)' }} />
                <div className="absolute bottom-0 left-0 right-0 p-4 md:p-5 flex items-end justify-between">
                  <span className="text-white font-bold text-base md:text-lg" style={{ letterSpacing: '-0.02em' }}>
                    {et.label}
                  </span>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-2 group-hover:translate-x-0"
                    style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)' }}>
                    <ArrowRight size={13} className="text-white" />
                  </div>
                </div>
              </Link>
            ))}
          </div>

          <div className="md:hidden mt-5 text-center">
            <Link href="/buscar" className="inline-flex items-center gap-2 text-sm font-semibold px-5 py-3 rounded-xl"
              style={{ border: '1.5px solid #E2E8F0', color: '#0F1623' }}>
              Ver todos los eventos <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </section>

      {/* ── ESPACIOS DESTACADOS (carrusel) ── */}
      <section className="py-14 md:py-20" style={{ background: '#F8FAFC' }}>
        <div className="max-w-7xl mx-auto px-4 md:px-6">

          <Reveal className="flex items-end justify-between mb-10 md:mb-12">
            <div>
              <p className="text-xs font-bold tracking-widest uppercase mb-2" style={{ color: '#35C493' }}>
                Espacios disponibles
              </p>
              <h2 className="font-bold" style={{ color: '#0F1623', fontSize: 'clamp(1.6rem, 4vw, 2.25rem)', letterSpacing: '-0.04em' }}>
                {spaces.length > 0 ? (
                  <>{spaces.length}{' '}
                    <span style={{ background: 'linear-gradient(95deg, #35C493, #5CE8BC)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                      espacio{spaces.length !== 1 ? 's' : ''}
                    </span>
                    {' '}en República Dominicana</>
                ) : 'Próximamente más espacios'}
              </h2>
            </div>
            <Link href="/buscar" className="hidden md:flex items-center gap-1.5 text-sm font-semibold"
              style={{ color: '#6B7280' }}>
              Ver todos <ArrowRight size={14} />
            </Link>
          </Reveal>

          {spaces.length === 0 ? (
            <Reveal className="py-20 text-center rounded-2xl" style={{ background: '#fff', border: '1px solid #E2E8F0' }}>
              <Building2 size={32} style={{ color: '#35C493', margin: '0 auto 12px' }} />
              <h3 className="font-bold text-lg mb-2" style={{ color: '#0F1623' }}>Próximamente más espacios</h3>
              <p className="text-sm mb-6" style={{ color: '#6B7280' }}>Sé el primero en publicar tu espacio</p>
              <Link href="/auth?mode=register&redirect=/dashboard/host/espacio"
                className="inline-flex items-center gap-2 text-sm font-bold px-6 py-3 rounded-xl"
                style={{ background: '#35C493', color: '#fff' }}>
                Publicar espacio gratis
              </Link>
            </Reveal>
          ) : (
            <SpacesCarousel spaces={spaces} />
          )}

          <div className="text-center mt-8 md:hidden">
            <Link href="/buscar" className="inline-flex items-center gap-2 text-sm font-semibold px-6 py-3 rounded-xl"
              style={{ border: '1.5px solid #E2E8F0', color: '#0F1623' }}>
              Ver todos <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </section>

      {/* ── CATEGORÍAS ── */}
      <section className="py-14 md:py-20" style={{ background: '#fff' }}>
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <Reveal className="mb-10 md:mb-12">
            <p className="text-xs font-bold tracking-widest uppercase mb-2" style={{ color: '#35C493' }}>
              Por tipo de espacio
            </p>
            <h2 className="font-bold" style={{ color: '#0F1623', fontSize: 'clamp(1.6rem, 4vw, 2.25rem)', letterSpacing: '-0.04em' }}>
              Explora{' '}
              <span style={{ background: 'linear-gradient(95deg, #35C493, #5CE8BC)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                tu opción
              </span>
            </h2>
          </Reveal>

          <div ref={catSection.ref} className="grid grid-cols-4 lg:grid-cols-8 gap-3">
            {categories.map((cat, i) => {
              const Icon = cat.icon
              return (
                <Link key={cat.value} href={`/buscar?categoria=${cat.value}`}
                  className="group flex flex-col items-center gap-2.5 p-3 md:p-4 rounded-2xl text-center"
                  style={{
                    border: '1px solid #E8ECF0',
                    background: '#fff',
                    opacity: catSection.on ? 1 : 0,
                    transform: catSection.on ? 'translateY(0) scale(1)' : 'translateY(16px) scale(0.95)',
                    transition: `opacity 0.5s ease ${i * 60}ms, transform 0.5s ease ${i * 60}ms`,
                    boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                  }}>
                  <div className="w-10 h-10 md:w-11 md:h-11 rounded-xl flex items-center justify-center transition-all duration-200 group-hover:bg-green-50"
                    style={{ background: '#F4F6F8' }}>
                    <Icon size={16} style={{ color: '#6B7280', transition: 'color 0.2s' }}
                      className="group-hover:text-green-600" />
                  </div>
                  <span className="text-[10px] md:text-xs font-semibold leading-tight" style={{ color: '#6B7280' }}>
                    {cat.label}
                  </span>
                </Link>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── CÓMO FUNCIONA — sección oscura ── */}
      <section className="py-20 md:py-28 relative overflow-hidden"
        style={{ background: '#060D09' }}>

        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
          backgroundImage: 'radial-gradient(circle, rgba(53,196,147,0.12) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
          maskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%, black 20%, transparent 100%)',
          WebkitMaskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%, black 20%, transparent 100%)',
        }} />
        <div style={{ position: 'absolute', top: -100, right: -100, width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(53,196,147,0.07) 0%, transparent 65%)', pointerEvents: 'none', zIndex: 0 }} />
        <div style={{ position: 'absolute', bottom: -80, left: '20%', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(53,196,147,0.05) 0%, transparent 65%)', pointerEvents: 'none', zIndex: 0 }} />

        <div className="max-w-5xl mx-auto px-4 md:px-6">

          <Reveal className="text-center mb-16 md:mb-20">
            <p className="text-xs font-bold tracking-widest uppercase mb-3" style={{ color: '#35C493' }}>
              Proceso simple
            </p>
            <h2 className="font-bold text-white" style={{ fontSize: 'clamp(1.8rem, 5vw, 3rem)', letterSpacing: '-0.04em', lineHeight: 1.1 }}>
              Reserva en tres pasos
            </h2>
            <p className="mt-3 text-sm" style={{ color: 'rgba(255,255,255,0.35)' }}>
              Sin llamadas, sin complicaciones, sin sorpresas
            </p>
          </Reveal>

          <div ref={howSection.ref} className="grid md:grid-cols-3 gap-6 md:gap-8">
            {[
              { num: '01', icon: Search,     title: 'Busca tu espacio',      desc: 'Filtra por sector, tipo y capacidad. Todos los espacios son verificados por nuestro equipo antes de publicarse.' },
              { num: '02', icon: Clock,      title: 'Elige fecha y horario',  desc: 'Selecciona el día, horario y adicionales. El propietario confirma en menos de 24 horas.' },
              { num: '03', icon: CreditCard, title: 'Paga y asegura tu fecha', desc: 'Una vez aceptada, paga el depósito de forma segura con Azul Payments. El precio que ves es el que pagas.' },
            ].map((step, i) => {
              const Icon = step.icon
              return (
                <div key={step.num} className="relative"
                  style={{
                    opacity: howSection.on ? 1 : 0,
                    transform: howSection.on ? 'translateY(0)' : 'translateY(36px)',
                    transition: `opacity 0.7s ease ${i * 150}ms, transform 0.7s ease ${i * 150}ms`,
                  }}>
                  <div className="absolute -top-4 -left-2 font-bold select-none pointer-events-none"
                    style={{ fontSize: 96, color: 'rgba(255,255,255,0.03)', lineHeight: 1, letterSpacing: '-0.05em' }}>
                    {step.num}
                  </div>
                  {i < 2 && (
                    <div className="hidden md:block absolute top-6 left-full w-8 h-px"
                      style={{ background: 'rgba(53,196,147,0.2)', zIndex: 1 }} />
                  )}
                  <div className="relative p-6 md:p-8 rounded-2xl"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-5"
                      style={{ background: 'rgba(53,196,147,0.12)', border: '1px solid rgba(53,196,147,0.2)' }}>
                      <Icon size={18} style={{ color: '#35C493' }} />
                    </div>
                    <div className="text-xs font-bold tracking-widest mb-2" style={{ color: 'rgba(53,196,147,0.6)' }}>
                      PASO {step.num}
                    </div>
                    <h3 className="font-bold text-white mb-2" style={{ letterSpacing: '-0.02em' }}>
                      {step.title}
                    </h3>
                    <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.4)' }}>
                      {step.desc}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── CTA PROPIETARIOS ── */}
      <section className="py-10 md:py-14" style={{ background: '#F8FAFC' }}>
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <Reveal>
            <div className="relative overflow-hidden rounded-3xl"
              style={{ background: 'linear-gradient(140deg, #060D09 0%, #0D2318 50%, #1A4D38 100%)' }}>

              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-0 right-0 w-96 h-96 rounded-full blur-3xl"
                  style={{ background: 'rgba(53,196,147,0.08)', transform: 'translate(30%,-30%)' }} />
                <div className="absolute bottom-0 left-1/3 w-72 h-72 rounded-full blur-3xl"
                  style={{ background: 'rgba(53,196,147,0.06)', transform: 'translateY(35%)' }} />
              </div>

              <div className="relative grid md:grid-cols-[1fr_auto] items-center gap-6 md:gap-10 px-8 py-10 md:px-14 md:py-14">
                <div>
                  <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full mb-5 text-xs font-semibold"
                    style={{ background: 'rgba(53,196,147,0.12)', color: '#6EE7C7', border: '1px solid rgba(53,196,147,0.18)' }}>
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#35C493' }} />
                    Para propietarios
                  </div>
                  <h2 className="font-bold text-white mb-3"
                    style={{ fontSize: 'clamp(1.5rem, 4vw, 2.5rem)', letterSpacing: '-0.04em', lineHeight: 1.12 }}>
                    ¿Tienes un espacio<br className="hidden md:block" /> para eventos?
                  </h2>
                  <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.95rem', lineHeight: 1.75, maxWidth: 460 }}>
                    Publica tu salón, restaurante, rooftop o villa. Recibe reservas online y gestiona todo desde tu panel.
                  </p>
                </div>
                <div className="flex flex-col gap-3 shrink-0">
                  <Link href="/auth?mode=register&redirect=/dashboard/host/espacio"
                    className="inline-flex items-center justify-center gap-2 font-bold px-8 py-4 rounded-2xl text-sm whitespace-nowrap"
                    style={{ background: '#35C493', color: '#060D09', boxShadow: '0 4px 24px rgba(53,196,147,0.3)' }}>
                    Publicar espacio gratis <ArrowRight size={15} />
                  </Link>
                  <Link href="/auth?mode=login"
                    className="inline-flex items-center justify-center gap-2 font-medium px-8 py-4 rounded-2xl text-sm whitespace-nowrap"
                    style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.1)' }}>
                    Ya tengo cuenta
                  </Link>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

    </div>
  )
}
