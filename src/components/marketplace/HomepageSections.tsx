'use client'

import { useEffect, useRef, useState } from 'react'

// ── Sección Instagram (Behold.so) ─────────────────────────
function SocialSection() {
  const widgetRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = widgetRef.current
    if (!container) return

    // Crear el web component via DOM (evita problemas de SSR/hidratación)
    const widget = document.createElement('behold-widget')
    widget.setAttribute('feed-id', 'djCYJQQhkC3IfDDkpR0B')
    container.appendChild(widget)

    // Cargar script exactamente como indica Behold.so
    if (!document.querySelector('script[src*="behold.so"]')) {
      const s = document.createElement('script')
      s.type = 'module'
      s.src  = 'https://w.behold.so/widget.js'
      document.head.append(s)
    }

    // Ocultar branding "Made with Behold" cuando el shadow DOM esté listo
    const observer = new MutationObserver(() => {
      const shadow = (widget as any).shadowRoot
      if (!shadow) return
      const existing = shadow.querySelector('#hide-behold-brand')
      if (existing) return
      const style = document.createElement('style')
      style.id = 'hide-behold-brand'
      style.textContent = '[class*="attribution"],[class*="branding"],[class*="powered"],[href*="behold"]{display:none!important}'
      shadow.appendChild(style)
    })
    observer.observe(widget, { childList: true, subtree: true })
    return () => observer.disconnect()
  }, [])

  return (
    <section style={{ background: '#F8FAFC' }}>
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-14 md:py-20">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-5 mb-10 md:mb-12">
          <div>
            {/* Icono + handle */}
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg,#f09433 0%,#e6683c 25%,#dc2743 50%,#cc2366 75%,#bc1888 100%)' }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="white">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
              </div>
              <span className="text-sm font-semibold" style={{ color: '#6B7280' }}>@espot.do</span>
            </div>
            <p className="text-xs font-bold tracking-widest uppercase mb-2" style={{ color: '#35C493' }}>Comunidad</p>
            <h2 className="font-bold" style={{ color: '#0F1623', fontSize: 'clamp(1.6rem, 4vw, 2.25rem)', letterSpacing: '-0.04em' }}>
              Espacios reales,{' '}
              <span style={{ background: 'linear-gradient(95deg, #35C493, #5CE8BC)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                eventos reales
              </span>
            </h2>
            <p className="mt-2 text-sm" style={{ color: '#6B7280', maxWidth: 420 }}>
              Mira cómo nuestros clientes celebran en los mejores espacios de la RD.
            </p>
          </div>

          <a href="https://www.instagram.com/espot.do/" target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-2xl text-sm font-bold shrink-0 transition-opacity hover:opacity-85"
            style={{
              background: 'linear-gradient(135deg,#f09433 0%,#e6683c 25%,#dc2743 50%,#cc2366 75%,#bc1888 100%)',
              color: '#fff',
              boxShadow: '0 4px 20px rgba(220,39,67,0.25)',
            }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
            </svg>
            Seguir en Instagram
          </a>
        </div>

        {/* Widget — creado via DOM en useEffect para evitar errores SSR */}
        <div ref={widgetRef} />

      </div>
    </section>
  )
}
import Image from 'next/image'
import Link from 'next/link'
import {
  ArrowRight, Search, Clock, CreditCard,
  MapPin, Building2, UtensilsCrossed, Sunset,
  Wine, Trees, Camera, Briefcase, Home, Leaf,
} from 'lucide-react'
import { SpaceCard } from '@/app/(marketplace)/buscar/SpaceCard'

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
  { value: 'terraza',    label: 'Terrazas',     icon: Trees },
  { value: 'jardin',     label: 'Jardines',     icon: Leaf },
  { value: 'bar',        label: 'Bares',        icon: Wine },
  { value: 'estudio',    label: 'Estudios',     icon: Camera },
  { value: 'hotel',      label: 'Hotel / Villa', icon: Building2 },
]

const eventTypes = [
  { label: 'Cumpleaños',   slug: 'cumpleanos',    img: 'https://images.unsplash.com/photo-1464349095431-e9a21285b5f3?w=700&q=85&fit=crop' },
  { label: 'Bodas',        slug: 'boda',          img: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=700&q=85&fit=crop' },
  { label: 'Corporativo',  slug: 'corporativo',   img: 'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=700&q=85&fit=crop' },
  { label: 'Graduación',   slug: 'graduacion',    img: 'https://images.unsplash.com/photo-1627556704302-624286467c65?w=700&q=85&fit=crop' },
  { label: 'Quinceañera',  slug: 'quinceanera',   img: 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=700&q=85&fit=crop' },
  { label: 'Baby Shower',  slug: 'baby-shower',   img: 'https://images.unsplash.com/photo-1529634806980-85c3dd6d34ac?w=700&q=85&fit=crop' },
]

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

// ── Componente principal ──────────────────────────────────
export default function HomepageSections({ spaces }: { spaces: any[] }) {

  const evSection   = useReveal()
  const spSection   = useReveal()
  const catSection  = useReveal()
  const howSection  = useReveal()
  const [hoveredId, setHoveredId] = useState<string | null>(null)

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
                <Image src={et.img} alt={et.label} fill
                  className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.06]"
                  sizes="(max-width: 768px) 50vw, 33vw" />
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

      {/* ── ESPACIOS DESTACADOS ── */}
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
                ) : 'Espacios en República Dominicana'}
              </h2>
            </div>
            <Link href="/buscar" className="hidden md:flex items-center gap-1.5 text-sm font-semibold"
              style={{ color: '#6B7280' }}>
              Ver todos <ArrowRight size={14} />
            </Link>
          </Reveal>

          {spaces.length > 0 ? (
            <div ref={spSection.ref} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
              {spaces.slice(0, 6).map((space: any, i: number) => (
                <div key={space.id} style={{
                  opacity: spSection.on ? 1 : 0,
                  transform: spSection.on ? 'translateY(0)' : 'translateY(32px)',
                  transition: `opacity 0.65s ease ${i * 90}ms, transform 0.65s ease ${i * 90}ms`,
                }}>
                  <SpaceCard
                    space={space}
                    isHovered={hoveredId === space.id}
                    onHover={setHoveredId}
                  />
                </div>
              ))}
            </div>
          ) : (
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

          <div ref={catSection.ref} className="grid grid-cols-4 md:grid-cols-8 gap-3">
            {categories.map((cat, i) => {
              const Icon = cat.icon
              return (
                <Link key={cat.value} href={`/buscar?categoria=${cat.value}`}
                  className="flex flex-col items-center gap-2.5 p-3 md:p-4 rounded-2xl text-center"
                  style={{
                    border: '1px solid #E8ECF0',
                    background: '#fff',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                    opacity: catSection.on ? 1 : 0,
                    transform: catSection.on ? 'translateY(0) scale(1)' : 'translateY(16px) scale(0.95)',
                    // Después del entrance, transición rápida para hover (sin delay)
                    transition: catSection.on
                      ? 'transform 0.22s ease, box-shadow 0.22s ease, border-color 0.22s ease, background 0.22s ease'
                      : `opacity 0.5s ease ${i * 60}ms, transform 0.5s ease ${i * 60}ms`,
                  }}
                  onMouseEnter={e => {
                    const el = e.currentTarget as HTMLElement
                    el.style.transform = 'translateY(-4px) scale(1)'
                    el.style.boxShadow = '0 10px 28px rgba(53,196,147,0.13), 0 0 0 1.5px rgba(53,196,147,0.28)'
                    el.style.borderColor = 'rgba(53,196,147,0.3)'
                    el.style.background = '#FAFFFE'
                    const iconBox = el.querySelector('[data-icon-box]') as HTMLElement | null
                    if (iconBox) iconBox.style.background = 'rgba(53,196,147,0.1)'
                    const iconSvg = el.querySelector('svg') as SVGElement | null
                    if (iconSvg) (iconSvg as any).style.color = '#35C493'
                    const label = el.querySelector('[data-label]') as HTMLElement | null
                    if (label) label.style.color = '#0F1623'
                  }}
                  onMouseLeave={e => {
                    const el = e.currentTarget as HTMLElement
                    el.style.transform = 'translateY(0) scale(1)'
                    el.style.boxShadow = '0 1px 4px rgba(0,0,0,0.04)'
                    el.style.borderColor = '#E8ECF0'
                    el.style.background = '#fff'
                    const iconBox = el.querySelector('[data-icon-box]') as HTMLElement | null
                    if (iconBox) iconBox.style.background = '#F4F6F8'
                    const iconSvg = el.querySelector('svg') as SVGElement | null
                    if (iconSvg) (iconSvg as any).style.color = '#6B7280'
                    const label = el.querySelector('[data-label]') as HTMLElement | null
                    if (label) label.style.color = '#6B7280'
                  }}>
                  <div data-icon-box
                    className="w-10 h-10 md:w-11 md:h-11 rounded-xl flex items-center justify-center"
                    style={{ background: '#F4F6F8', transition: 'background 0.22s ease' }}>
                    <Icon size={16} style={{ color: '#6B7280', transition: 'color 0.22s ease' }} />
                  </div>
                  <span data-label
                    className="text-[10px] md:text-xs font-semibold leading-tight"
                    style={{ color: '#6B7280', transition: 'color 0.22s ease' }}>
                    {cat.label}
                  </span>
                </Link>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── REDES SOCIALES ── */}
      <SocialSection />

      {/* ── CÓMO FUNCIONA — sección oscura ── */}
      <section className="py-20 md:py-28 relative overflow-hidden"
        style={{ background: '#060D09' }}>

        {/* Patrón de puntos */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
          backgroundImage: 'radial-gradient(circle, rgba(53,196,147,0.12) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
          maskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%, black 20%, transparent 100%)',
          WebkitMaskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%, black 20%, transparent 100%)',
        }} />

        {/* Orbes */}
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

          <div ref={howSection.ref} className="grid md:grid-cols-3 gap-6 md:gap-8" style={{ perspective: 1000 }}>
            {[
              { num: '01', icon: Search,     title: 'Busca tu espacio',     desc: 'Filtra por sector, tipo y capacidad. Todos los espacios son verificados por nuestro equipo antes de publicarse.' },
              { num: '02', icon: Clock,      title: 'Elige fecha y horario', desc: 'Selecciona el día, horario y adicionales. El propietario revisará tu solicitud y confirmará disponibilidad.' },
              { num: '03', icon: CreditCard, title: 'Paga y asegura tu fecha', desc: 'Una vez confirmada tu reserva, paga de forma segura con Azul Payments. El precio que ves es el que pagas.' },
            ].map((step, i) => {
              const Icon = step.icon
              const delay = i * 180
              return (
                <div key={step.num} className="relative"
                  style={{
                    opacity:    howSection.on ? 1 : 0,
                    transform:  howSection.on ? 'translateY(0) rotateX(0deg)' : 'translateY(28px) rotateX(14deg)',
                    transition: `opacity 0.65s cubic-bezier(0.22,1,0.36,1) ${delay}ms, transform 0.65s cubic-bezier(0.22,1,0.36,1) ${delay}ms`,
                    transformOrigin: 'bottom center',
                  }}>
                  {/* Número de fondo */}
                  <div className="absolute -top-4 -left-2 font-bold select-none pointer-events-none"
                    style={{ fontSize: 96, color: 'rgba(255,255,255,0.03)', lineHeight: 1, letterSpacing: '-0.05em' }}>
                    {step.num}
                  </div>

                  {/* Línea conectora — se dibuja después que la card aparece */}
                  {i < 2 && (
                    <div className="hidden md:block absolute top-6 left-full h-px overflow-hidden" style={{ width: 32, zIndex: 1 }}>
                      <div style={{
                        height: '100%',
                        background: 'rgba(53,196,147,0.25)',
                        transform: howSection.on ? 'scaleX(1)' : 'scaleX(0)',
                        transformOrigin: 'left center',
                        transition: `transform 0.35s ease ${delay + 500}ms`,
                      }} />
                    </div>
                  )}

                  <div className="relative p-6 md:p-8 rounded-2xl"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    {/* Icono con micro-bounce */}
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-5"
                      style={{
                        background: 'rgba(53,196,147,0.12)',
                        border: '1px solid rgba(53,196,147,0.2)',
                        transform:  howSection.on ? 'scale(1)' : 'scale(0.6)',
                        opacity:    howSection.on ? 1 : 0,
                        transition: `transform 0.5s cubic-bezier(0.34,1.56,0.64,1) ${delay + 280}ms, opacity 0.4s ease ${delay + 280}ms`,
                      }}>
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

      {/* ── GUÍAS ── */}
      <section className="py-10 md:py-14" style={{ background: '#fff', position: 'relative', overflow: 'hidden' }}>
        {/* Dot grid decorativo */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          backgroundImage: 'radial-gradient(circle, rgba(53,196,147,0.08) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
          maskImage: 'radial-gradient(ellipse 80% 60% at 50% 50%, black 30%, transparent 100%)',
          WebkitMaskImage: 'radial-gradient(ellipse 80% 60% at 50% 50%, black 30%, transparent 100%)',
        }} />

        <style>{`
          @keyframes guide-shimmer {
            0%   { background-position: -200% center; }
            100% { background-position:  200% center; }
          }
          @keyframes guide-ping {
            0%        { transform: scale(1);   opacity: 0.5; }
            70%, 100% { transform: scale(2.4); opacity: 0;   }
          }
          .guide-card {
            transition: transform 0.22s ease, box-shadow 0.22s ease, border-color 0.22s ease;
          }
          .guide-card-light:hover {
            transform: translateY(-5px);
            box-shadow: 0 24px 56px rgba(53,196,147,0.18), 0 4px 16px rgba(0,0,0,0.07);
            border-color: rgba(53,196,147,0.45) !important;
          }
          .guide-card-dark:hover {
            transform: translateY(-5px);
            box-shadow: 0 24px 56px rgba(53,196,147,0.3);
            border-color: rgba(53,196,147,0.5) !important;
          }
          .guide-arrow { transition: transform 0.18s ease; }
          .guide-card-light:hover .guide-arrow,
          .guide-card-dark:hover .guide-arrow  { transform: translateX(6px); }
          .guide-shimmer {
            background: linear-gradient(90deg, #35C493 0%, #4DD9A7 35%, #D4FF58 50%, #4DD9A7 65%, #35C493 100%);
            background-size: 200% 100%;
            animation: guide-shimmer 2.6s ease-in-out infinite;
          }
          .guide-icon-wrap { position: relative; }
          .guide-icon-wrap::after {
            content: '';
            position: absolute;
            inset: -3px;
            border-radius: 14px;
            border: 1.5px solid rgba(53,196,147,0.45);
            animation: guide-ping 2.2s ease-out infinite;
          }
        `}</style>

        <div className="relative max-w-7xl mx-auto px-4 md:px-6">
          <Reveal>
            <p className="text-xs font-bold tracking-widest uppercase mb-6 text-center" style={{ color: '#35C493' }}>
              Conoce la plataforma
            </p>
            <div className="grid md:grid-cols-2 gap-4">

              {/* Card clientes */}
              <Link href="/para-clientes"
                className="guide-card guide-card-light relative overflow-hidden rounded-3xl p-7 flex flex-col gap-4"
                style={{ background: '#F8FAFC', border: '1px solid #E5EAE8' }}>
                {/* Borde superior animado */}
                <div className="guide-shimmer" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, borderRadius: '12px 12px 0 0' }} />
                <div className="flex items-center justify-between">
                  <div className="guide-icon-wrap w-10 h-10 rounded-2xl flex items-center justify-center"
                    style={{ background: 'rgba(53,196,147,0.1)', color: '#35C493' }}>
                    <Search size={18} />
                  </div>
                  <ArrowRight size={16} className="guide-arrow" style={{ color: '#35C493' }} />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest mb-1.5" style={{ color: '#35C493' }}>Para clientes</p>
                  <h3 className="font-bold text-lg mb-2" style={{ color: '#03313C', letterSpacing: '-0.025em' }}>
                    ¿Cómo reservar un espacio?
                  </h3>
                  <p className="text-sm leading-relaxed" style={{ color: '#527068' }}>
                    Aprende a buscar, filtrar, reservar y pagar. Conoce cómo funciona el plan de cuotas según la fecha de tu evento.
                  </p>
                </div>
              </Link>

              {/* Card propietarios */}
              <Link href="/para-propietarios"
                className="guide-card guide-card-dark relative overflow-hidden rounded-3xl p-7 flex flex-col gap-4"
                style={{ background: '#060D09', border: '1px solid rgba(53,196,147,0.15)' }}>
                {/* Borde superior animado */}
                <div className="guide-shimmer" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, borderRadius: '12px 12px 0 0' }} />
                <div className="flex items-center justify-between">
                  <div className="guide-icon-wrap w-10 h-10 rounded-2xl flex items-center justify-center"
                    style={{ background: 'rgba(53,196,147,0.12)', color: '#35C493' }}>
                    <Building2 size={18} />
                  </div>
                  <ArrowRight size={16} className="guide-arrow" style={{ color: '#35C493' }} />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest mb-1.5" style={{ color: '#35C493' }}>Para propietarios</p>
                  <h3 className="font-bold text-lg mb-2" style={{ color: '#fff', letterSpacing: '-0.025em' }}>
                    ¿Cómo publicar mi espacio?
                  </h3>
                  <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.45)' }}>
                    Publica tu salón, rooftop o villa, configura precios y disponibilidad, y empieza a recibir reservas sin costo fijo.
                  </p>
                </div>
              </Link>

            </div>
          </Reveal>
        </div>
      </section>

    </div>
  )
}
