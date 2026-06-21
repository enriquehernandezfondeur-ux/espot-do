'use client'

import { useEffect, useRef, useState } from 'react'

// ── Sección Instagram (Behold.so) ─────────────────────────
function SocialSection() {
  const widgetRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = widgetRef.current
    if (!container) return

    const widget = document.createElement('behold-widget')
    widget.setAttribute('feed-id', 'djCYJQQhkC3IfDDkpR0B')
    container.appendChild(widget)

    if (!document.querySelector('script[src*="behold.so"]')) {
      const s = document.createElement('script')
      s.type = 'module'
      s.src  = 'https://w.behold.so/widget.js'
      document.head.append(s)
    }

    // Inyectar CSS en el shadow DOM cuando el custom element esté definido.
    // MutationObserver no puede cruzar el shadow boundary — hay que esperar
    // a que customElements registre el tag y luego acceder al shadowRoot.
    customElements.whenDefined('behold-widget').then(() => {
      requestAnimationFrame(() => {
        const shadow = (widget as any).shadowRoot
        if (!shadow || shadow.querySelector('#hide-behold-brand')) return
        const style = document.createElement('style')
        style.id = 'hide-behold-brand'
        style.textContent = '[class*="attribution"],[class*="branding"],[class*="powered"],[href*="behold"]{display:none!important}'
        shadow.appendChild(style)
      })
    })

    return () => { widget.remove() }
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
            <h2 className="font-bold" style={{ color: '#0F1623', fontSize: 'clamp(1.6rem, 4vw, 2.25rem)', letterSpacing: '-0.04em' }}>
              Espacios reales,{' '}
              <span style={{ background: 'linear-gradient(95deg, var(--brand), #5CE8BC)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
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
        <div ref={widgetRef} style={{ minHeight: 320 }} />

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
import { SPACE_CATEGORIES, getFeaturedCategories } from '@/lib/categories'

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
// Espot 2.0: las 4 categorías estrella encabezan la grilla (destacadas
// sutilmente), seguidas de 4 populares — se mantienen 8 slots para no
// alterar el diseño de la home.
const POPULAR_AFTER_FEATURED = ['salon', 'restaurante', 'rooftop', 'villa']
const categories = [
  ...getFeaturedCategories(),
  ...SPACE_CATEGORIES.filter(c => POPULAR_AFTER_FEATURED.includes(c.value)),
].map(c => ({ value: c.value, label: c.labelPlural, icon: c.icon }))

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

// ── Componente principal ──────────────────────────────────
export default function HomepageSections({ spaces }: { spaces: any[] }) {

  const evSection   = useReveal()
  const spSection   = useReveal()
  const catSection  = useReveal()

  const [hoveredId, setHoveredId] = useState<string | null>(null)

  return (
    <div style={{ background: '#fff' }}>

      {/* ── CATEGORÍAS ── */}
      <section className="py-14 md:py-20" style={{ background: '#fff' }}>
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <Reveal className="mb-10 md:mb-12">
            <h2 className="font-bold" style={{ color: '#0F1623', fontSize: 'clamp(1.6rem, 4vw, 2.25rem)', letterSpacing: '-0.04em' }}>
              Explora{' '}
              <span style={{ background: 'linear-gradient(95deg, var(--brand), #5CE8BC)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                tu espacio
              </span>
            </h2>
          </Reveal>

          <div ref={catSection.ref} className="grid grid-cols-4 md:grid-cols-8 gap-2 md:gap-3">
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
                    if (iconSvg) (iconSvg as any).style.color = 'var(--brand)'
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

      {/* ── TIPOS DE EVENTO ── */}
      <section className="py-14 md:py-20" style={{ background: '#F8FAFC' }}>
        <div className="max-w-7xl mx-auto px-4 md:px-6">

          <Reveal className="flex items-end justify-between mb-10 md:mb-12">
            <div>
              <h2 className="font-bold" style={{ color: '#0F1623', fontSize: 'clamp(1.6rem, 4vw, 2.25rem)', letterSpacing: '-0.04em' }}>
                ¿Qué tipo de actividad{' '}
                <span style={{ background: 'linear-gradient(95deg, var(--brand), #5CE8BC)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  deseas realizar?
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
      <section className="py-14 md:py-20" style={{ background: '#fff' }}>
        <div className="max-w-7xl mx-auto px-4 md:px-6">

          <Reveal className="flex items-end justify-between mb-10 md:mb-12">
            <div>
              <h2 className="font-bold" style={{ color: '#0F1623', fontSize: 'clamp(1.6rem, 4vw, 2.25rem)', letterSpacing: '-0.04em' }}>
                Espacios{' '}
                <span style={{ background: 'linear-gradient(95deg, var(--brand), #5CE8BC)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  en República Dominicana
                </span>
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
              <Building2 size={32} style={{ color: 'var(--brand)', margin: '0 auto 12px' }} />
              <h3 className="font-bold text-lg mb-2" style={{ color: '#0F1623' }}>Próximamente más espacios</h3>
              <p className="text-sm mb-6" style={{ color: '#6B7280' }}>Sé el primero en publicar tu espacio</p>
              <Link href="/auth?mode=register&redirect=/dashboard/host/espacio"
                className="inline-flex items-center gap-2 text-sm font-bold px-6 py-3 rounded-xl"
                style={{ background: 'var(--brand)', color: '#fff' }}>
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

      {/* ── CÓMO FUNCIONA ── */}
      <section className="py-14 md:py-20" style={{ background: '#F8FAFC' }}>
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <Reveal>
            <h2 className="font-bold mb-8 md:mb-10" style={{ color: '#0F1623', fontSize: 'clamp(1.6rem, 4vw, 2.25rem)', letterSpacing: '-0.04em' }}>
              Reserva en{' '}
              <span style={{ background: 'linear-gradient(95deg, var(--brand), #5CE8BC)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                tres pasos
              </span>
            </h2>
            <div className="grid md:grid-cols-3 gap-4">

              {/* Card 1 — Busca — light */}
              <div className="guide-card guide-card-light relative overflow-hidden rounded-3xl p-7 flex flex-col gap-4"
                style={{ background: '#F8FAFC', border: '1px solid #E5EAE8' }}>
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
                    style={{ background: 'rgba(53,196,147,0.1)', color: 'var(--brand)' }}>
                    <Search size={18} />
                  </div>
                  <ArrowRight size={16} className="guide-arrow" style={{ color: 'var(--brand)' }} />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest mb-1.5" style={{ color: 'var(--brand)' }}>Paso 01</p>
                  <h3 className="font-bold text-lg mb-2" style={{ color: 'var(--brand-navy)', letterSpacing: '-0.025em' }}>Busca tu espacio</h3>
                  <p className="text-sm leading-relaxed" style={{ color: '#527068' }}>
                    Filtra por sector, tipo y capacidad. Todos los espacios son verificados por nuestro equipo antes de publicarse.
                  </p>
                </div>
              </div>

              {/* Card 2 — Fecha — dark */}
              <div className="guide-card guide-card-dark relative overflow-hidden rounded-3xl p-7 flex flex-col gap-4"
                style={{ background: 'var(--brand-navy)', border: '1px solid rgba(53,196,147,0.15)' }}>
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
                    style={{ background: 'rgba(53,196,147,0.12)', color: 'var(--brand)' }}>
                    <Clock size={18} />
                  </div>
                  <ArrowRight size={16} className="guide-arrow" style={{ color: 'var(--brand)' }} />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest mb-1.5" style={{ color: 'var(--brand)' }}>Paso 02</p>
                  <h3 className="font-bold text-lg mb-2" style={{ color: '#fff', letterSpacing: '-0.025em' }}>Elige fecha y horario</h3>
                  <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.6)' }}>
                    Selecciona el día, horario y adicionales. El propietario revisará tu solicitud y confirmará disponibilidad.
                  </p>
                </div>
              </div>

              {/* Card 3 — Paga — light */}
              <div className="guide-card guide-card-light relative overflow-hidden rounded-3xl p-7 flex flex-col gap-4"
                style={{ background: '#F8FAFC', border: '1px solid #E5EAE8' }}>
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
                    style={{ background: 'rgba(53,196,147,0.1)', color: 'var(--brand)' }}>
                    <CreditCard size={18} />
                  </div>
                  <ArrowRight size={16} className="guide-arrow" style={{ color: 'var(--brand)' }} />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest mb-1.5" style={{ color: 'var(--brand)' }}>Paso 03</p>
                  <h3 className="font-bold text-lg mb-2" style={{ color: 'var(--brand-navy)', letterSpacing: '-0.025em' }}>Paga y asegura tu fecha</h3>
                  <p className="text-sm leading-relaxed" style={{ color: '#527068' }}>
                    Una vez confirmada tu reserva, paga de forma segura con Azul Payments. El precio que ves es el que pagas.
                  </p>
                </div>
              </div>

            </div>
          </Reveal>
        </div>
      </section>

      {/* ── CTA PROPIETARIOS ── */}
      <section className="py-10 md:py-14" style={{ background: '#F8FAFC' }}>
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <Reveal>
            <div className="relative overflow-hidden rounded-3xl"
              style={{ background: 'linear-gradient(140deg, var(--brand-navy) 0%, #0A3530 50%, #1A4D38 100%)' }}>

              {/* Keyframe del patrón animado */}
              <style>{`@keyframes patternDrift { from { background-position: 0 0; } to { background-position: 620px 310px; } }`}</style>

              {/* Patrón de marca animado — inset negativo evita íconos cortados en los bordes */}
              <div style={{
                position: 'absolute', inset: '-100px', pointerEvents: 'none', zIndex: 0,
                backgroundImage: 'url(/patron-contorno.png)',
                backgroundSize: '520px',
                backgroundRepeat: 'repeat',
                animation: 'patternDrift 70s linear infinite',
                opacity: 0.22,
              }} />

              {/* Overlay oscuro sobre el patrón — garantiza legibilidad del texto blanco */}
              <div style={{
                position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 1,
                background: 'rgba(3, 49, 60, 0.55)',
              }} />

              {/* Orbes decorativos */}
              <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 2 }}>
                <div className="absolute top-0 right-0 w-96 h-96 rounded-full blur-3xl"
                  style={{ background: 'rgba(53,196,147,0.1)', transform: 'translate(30%,-30%)' }} />
                <div className="absolute bottom-0 left-1/3 w-72 h-72 rounded-full blur-3xl"
                  style={{ background: 'rgba(53,196,147,0.07)', transform: 'translateY(35%)' }} />
              </div>

              <div className="relative grid md:grid-cols-[1fr_auto] items-center gap-6 md:gap-10 px-8 py-10 md:px-14 md:py-14" style={{ zIndex: 3 }}>
                <div>
                  <h2 className="font-bold text-white mb-3"
                    style={{ fontSize: 'clamp(1.5rem, 4vw, 2.5rem)', letterSpacing: '-0.04em', lineHeight: 1.12 }}>
                    ¿Tienes un espacio<br className="hidden md:block" /> para eventos?
                  </h2>
                  <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: '1rem', lineHeight: 1.75, maxWidth: 460 }}>
                    Publica tu salón, restaurante, rooftop o villa. Recibe reservas online y gestiona todo desde tu panel.
                  </p>
                </div>
                <div className="flex flex-col gap-3 shrink-0">
                  <Link href="/auth?mode=register&redirect=/dashboard/host/espacio"
                    className="inline-flex items-center justify-center gap-2 font-bold px-8 py-4 rounded-2xl text-sm whitespace-nowrap"
                    style={{ background: 'var(--brand)', color: 'var(--brand-navy)', boxShadow: '0 4px 24px rgba(53,196,147,0.3)' }}>
                    Publicar espacio gratis <ArrowRight size={15} />
                  </Link>
                  <Link href="/auth?mode=login"
                    className="inline-flex items-center justify-center gap-2 font-medium px-8 py-4 rounded-2xl text-sm whitespace-nowrap"
                    style={{ background: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.9)', border: '1px solid rgba(255,255,255,0.25)' }}>
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
            background: linear-gradient(90deg, var(--brand) 0%, #4DD9A7 35%, #D4FF58 50%, #4DD9A7 65%, var(--brand) 100%);
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
            <h2 className="font-bold mb-8 md:mb-10" style={{ color: '#0F1623', fontSize: 'clamp(1.6rem, 4vw, 2.25rem)', letterSpacing: '-0.04em' }}>
              Todo sobre{' '}
              <span style={{ background: 'linear-gradient(95deg, var(--brand), #5CE8BC)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                Espot
              </span>
            </h2>
            <div className="grid md:grid-cols-2 gap-4">

              {/* Card clientes */}
              <Link href="/para-clientes"
                className="guide-card guide-card-light relative overflow-hidden rounded-3xl p-7 flex flex-col gap-4"
                style={{ background: '#F8FAFC', border: '1px solid #E5EAE8' }}>
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
                    style={{ background: 'rgba(53,196,147,0.1)', color: 'var(--brand)' }}>
                    <Search size={18} />
                  </div>
                  <ArrowRight size={16} className="guide-arrow" style={{ color: 'var(--brand)' }} />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest mb-1.5" style={{ color: 'var(--brand)' }}>Para clientes</p>
                  <h3 className="font-bold text-lg mb-2" style={{ color: 'var(--brand-navy)', letterSpacing: '-0.025em' }}>
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
                style={{ background: 'var(--brand-navy)', border: '1px solid rgba(53,196,147,0.15)' }}>
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
                    style={{ background: 'rgba(53,196,147,0.12)', color: 'var(--brand)' }}>
                    <Building2 size={18} />
                  </div>
                  <ArrowRight size={16} className="guide-arrow" style={{ color: 'var(--brand)' }} />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest mb-1.5" style={{ color: 'var(--brand)' }}>Para propietarios</p>
                  <h3 className="font-bold text-lg mb-2" style={{ color: '#fff', letterSpacing: '-0.025em' }}>
                    ¿Cómo publicar mi espacio?
                  </h3>
                  <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.72)' }}>
                    Publica tu salón, rooftop o villa, configura precios y disponibilidad, y empieza a recibir reservas sin costo fijo.
                  </p>
                </div>
              </Link>

            </div>
          </Reveal>
        </div>
      </section>

      {/* ── REDES SOCIALES ── */}
      <SocialSection />

    </div>
  )
}
