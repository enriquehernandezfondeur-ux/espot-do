'use client'

import React, { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  ArrowRight, Search, Clock, CreditCard,
  MapPin, Building2, UtensilsCrossed, Sunset,
  Wine, Trees, Camera, Briefcase, Home,
} from 'lucide-react'
import { SpaceCard } from '@/app/(marketplace)/buscar/SpaceCard'

// ── Sección de redes sociales ─────────────────────────────
function SocialSection() {
  const feedId = process.env.NEXT_PUBLIC_BEHOLD_FEED_ID

  useEffect(() => {
    if (!feedId) return
    if (document.querySelector('script[src*="behold.so"]')) return
    const s = document.createElement('script')
    s.src  = 'https://w.behold.so/widget.js'
    s.type = 'module'
    document.head.appendChild(s)
  }, [feedId])

  return (
    <section style={{ background: '#fff', borderTop: '1px solid #F0F2F5' }}>
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-14 md:py-20">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-10 md:mb-12">
          <div>
            {/* Badge con logo Instagram */}
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #f09433 0%,#e6683c 25%,#dc2743 50%,#cc2366 75%,#bc1888 100%)' }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="white">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
              </div>
              <span className="text-sm font-bold" style={{ color: '#6B7280' }}>@espot.do</span>
            </div>

            <p className="text-xs font-bold tracking-widest uppercase mb-2" style={{ color: '#35C493' }}>
              Comunidad
            </p>
            <h2 className="font-bold" style={{ color: '#0F1623', fontSize: 'clamp(1.6rem, 4vw, 2.25rem)', letterSpacing: '-0.04em' }}>
              Espacios reales,{' '}
              <span style={{ background: 'linear-gradient(95deg, #35C493, #5CE8BC)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                eventos reales
              </span>
            </h2>
            <p className="mt-2 text-sm" style={{ color: '#6B7280', maxWidth: 400 }}>
              Mira cómo nuestros clientes celebran en los mejores espacios de República Dominicana.
            </p>
          </div>

          {/* Botón seguir */}
          <a href="https://www.instagram.com/espot.do/" target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-2xl text-sm font-bold shrink-0 transition-all hover:opacity-85"
            style={{
              background: 'linear-gradient(135deg, #f09433 0%,#e6683c 25%,#dc2743 50%,#cc2366 75%,#bc1888 100%)',
              color: '#fff',
              boxShadow: '0 4px 20px rgba(220,39,67,0.25)',
            }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
            </svg>
            Seguir en Instagram
          </a>
        </div>

        {/* Feed — Behold.so widget o placeholder */}
        {feedId
          ? React.createElement('behold-widget', { 'feed-id': feedId, style: { width: '100%' } } as any)
          : (
            <div className="grid grid-cols-3 md:grid-cols-6 gap-2 md:gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <a key={i} href="https://www.instagram.com/espot.do/" target="_blank" rel="noopener noreferrer"
                  className="group relative overflow-hidden rounded-2xl"
                  style={{ aspectRatio: '1/1', background: '#F4F6F8', border: '1px solid #E8ECF0' }}>
                  <div className="absolute inset-0 flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ background: 'linear-gradient(135deg, #f09433,#dc2743,#bc1888)' }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                      </svg>
                    </div>
                  </div>
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ background: 'rgba(220,39,67,0.06)' }} />
                </a>
              ))}
            </div>
          )
        }

      </div>
    </section>
  )
}

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

          <div ref={howSection.ref} className="grid md:grid-cols-3 gap-6 md:gap-8">
            {[
              { num: '01', icon: Search,     title: 'Busca tu espacio',     desc: 'Filtra por sector, tipo y capacidad. Todos los espacios son verificados por nuestro equipo antes de publicarse.' },
              { num: '02', icon: Clock,      title: 'Elige fecha y horario', desc: 'Selecciona el día, horario y adicionales. El propietario confirma en menos de 24 horas.' },
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
                  {/* Número de fondo */}
                  <div className="absolute -top-4 -left-2 font-bold select-none pointer-events-none"
                    style={{ fontSize: 96, color: 'rgba(255,255,255,0.03)', lineHeight: 1, letterSpacing: '-0.05em' }}>
                    {step.num}
                  </div>

                  {/* Línea conectora */}
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

      {/* ── REDES SOCIALES ── */}
      <SocialSection />

    </div>
  )
}
