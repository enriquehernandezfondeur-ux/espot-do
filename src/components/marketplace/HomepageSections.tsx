'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import {
  ArrowRight, Shield, Users, Search, Clock, CreditCard,
  CheckCircle, MapPin, Building2, UtensilsCrossed, Sunset,
  Wine, Trees, Camera, Briefcase, Home,
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

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

function getCover(space: any) {
  return space.space_images?.find((i: any) => i.is_cover)?.url ?? space.space_images?.[0]?.url ?? null
}
function getPriceLabel(space: any) {
  const p = space.space_pricing?.find((x: any) => x.is_active) ?? space.space_pricing?.[0]
  if (!p) return null
  if (p.pricing_type === 'hourly')              return { price: formatCurrency(p.hourly_price), unit: '/ hora' }
  if (p.pricing_type === 'minimum_consumption') return { price: formatCurrency(p.minimum_consumption), unit: 'consumo mín.' }
  if (p.pricing_type === 'fixed_package')       return { price: formatCurrency(p.fixed_price), unit: 'paquete' }
  return { price: 'Cotizar', unit: '' }
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

// ── Componente principal ──────────────────────────────────
export default function HomepageSections({ spaces }: { spaces: any[] }) {

  // ── TIPOS DE EVENTO ─────────────────────────────────────
  const evSection = useReveal()
  const spSection = useReveal()
  const catSection = useReveal()
  const howSection = useReveal()
  const trustSection = useReveal()
  const ctaSection = useReveal()

  return (
    <div style={{ background: '#fff' }}>

      {/* ── TIPOS DE EVENTO ── */}
      <section className="py-14 md:py-20" style={{ background: '#fff' }}>
        <div className="max-w-7xl mx-auto px-4 md:px-6">

          <Reveal className="flex items-end justify-between mb-10 md:mb-12">
            <div>
              <p className="text-xs font-bold tracking-widest uppercase mb-2" style={{ color: '#35C493' }}>
                Por tipo de evento
              </p>
              <h2 className="font-bold" style={{ color: '#0F1623', fontSize: 'clamp(1.6rem, 4vw, 2.25rem)', letterSpacing: '-0.04em' }}>
                ¿Qué estás celebrando?
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

      {/* ── ESPACIOS DESTACADOS ── */}
      <section className="py-14 md:py-20" style={{ background: '#F8FAFC' }}>
        <div className="max-w-7xl mx-auto px-4 md:px-6">

          <Reveal className="flex items-end justify-between mb-10 md:mb-12">
            <div>
              <p className="text-xs font-bold tracking-widest uppercase mb-2" style={{ color: '#35C493' }}>
                Espacios disponibles
              </p>
              <h2 className="font-bold" style={{ color: '#0F1623', fontSize: 'clamp(1.6rem, 4vw, 2.25rem)', letterSpacing: '-0.04em' }}>
                {spaces.length > 0
                  ? `${spaces.length} espacio${spaces.length !== 1 ? 's' : ''} en República Dominicana`
                  : 'Próximamente más espacios'}
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
              {spaces.slice(0, 6).map((space: any, i: number) => {
                const priceInfo = getPriceLabel(space)
                const cover     = getCover(space)
                const catDef    = categories.find(c => c.value === space.category)
                const Icon      = catDef?.icon ?? Building2
                return (
                  <Link key={space.id} href={`/espacios/${space.slug}`}
                    className="group block"
                    style={{
                      opacity: spSection.on ? 1 : 0,
                      transform: spSection.on ? 'translateY(0)' : 'translateY(32px)',
                      transition: `opacity 0.65s ease ${i * 90}ms, transform 0.65s ease ${i * 90}ms`,
                    }}>
                    <div className="rounded-2xl overflow-hidden h-full flex flex-col"
                      style={{ background: '#fff', border: '1px solid #E8ECF0', boxShadow: '0 2px 12px rgba(0,0,0,0.05)', transition: 'box-shadow 0.3s ease, transform 0.3s ease' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = '0 12px 40px rgba(0,0,0,0.12)'; (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = '0 2px 12px rgba(0,0,0,0.05)'; (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)' }}>

                      <div className="relative overflow-hidden" style={{ aspectRatio: '16/10', flexShrink: 0 }}>
                        {cover ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={cover} alt={space.name}
                            className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.06]" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center"
                            style={{ background: 'linear-gradient(135deg,#667eea,#764ba2)' }}>
                            <Icon size={40} className="text-white opacity-70" />
                          </div>
                        )}
                        {priceInfo && (
                          <div className="absolute bottom-3 left-3 text-xs font-bold px-3 py-1.5 rounded-full"
                            style={{ background: 'rgba(0,0,0,0.72)', color: '#fff', backdropFilter: 'blur(8px)' }}>
                            {priceInfo.price}
                            {priceInfo.unit && <span className="opacity-70 ml-1">{priceInfo.unit}</span>}
                          </div>
                        )}
                        <div className="absolute bottom-3 right-3 flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-full"
                          style={{ background: 'rgba(0,0,0,0.6)', color: '#fff', backdropFilter: 'blur(8px)' }}>
                          <Users size={10} /> {space.capacity_max}
                        </div>
                        {space.is_verified && (
                          <div className="absolute top-3 left-3 flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full"
                            style={{ background: 'rgba(53,196,147,0.9)', color: '#fff' }}>
                            <Shield size={9} /> Verificado
                          </div>
                        )}
                      </div>

                      <div className="p-4 flex flex-col flex-1">
                        <h3 className="font-semibold text-sm leading-snug mb-1.5"
                          style={{ color: '#0F1623', letterSpacing: '-0.01em' }}>
                          {space.name}
                        </h3>
                        <div className="flex items-center gap-1.5 text-xs" style={{ color: '#94A3B8' }}>
                          <MapPin size={10} />
                          {space.sector ? `${space.sector}, ` : ''}{space.city}
                        </div>
                        <div className="mt-auto pt-3 flex items-center justify-between"
                          style={{ borderTop: '1px solid #F0F2F5', marginTop: 12 }}>
                          <span className="text-xs font-medium capitalize px-2.5 py-1 rounded-lg"
                            style={{ background: '#F4F6F8', color: '#6B7280' }}>
                            {catDef?.label ?? space.category}
                          </span>
                          <ArrowRight size={14} style={{ color: '#35C493', transition: 'transform 0.2s' }}
                            className="group-hover:translate-x-1" />
                        </div>
                      </div>
                    </div>
                  </Link>
                )
              })}
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
              Explora tu opción
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

        {/* Orbes */}
        <div style={{ position: 'absolute', top: -100, right: -100, width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(53,196,147,0.06) 0%, transparent 65%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -80, left: '20%', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(53,196,147,0.04) 0%, transparent 65%)', pointerEvents: 'none' }} />

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
              { num: '01', icon: Search,     title: 'Busca tu espacio',     desc: 'Filtra por tipo de evento, sector, capacidad y disponibilidad.' },
              { num: '02', icon: Clock,      title: 'Elige fecha y horario', desc: 'Selecciona el día, el horario y los servicios adicionales que necesitas.' },
              { num: '03', icon: CreditCard, title: 'Confirma y paga',       desc: 'Garantiza tu fecha con el pago. Sin sorpresas, todo transparente.' },
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

      {/* ── TRUST ── */}
      <section className="py-14 md:py-20" style={{ background: '#fff' }}>
        <div ref={trustSection.ref} className="max-w-4xl mx-auto px-4 md:px-6 grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-10">
          {[
            { icon: Shield,      color: '#35C493', title: 'Espacios verificados',       desc: 'Revisamos cada espacio antes de publicarlo en la plataforma.' },
            { icon: CheckCircle, color: '#3B82F6', title: 'Confirmación en 24 horas',   desc: 'Los propietarios responden rápido. Máximo 24 horas.' },
            { icon: CreditCard,  color: '#8B5CF6', title: 'Pago directo y seguro',      desc: 'Tu pago está protegido hasta confirmar tu reserva.' },
          ].map(({ icon: Icon, color, title, desc }, i) => (
            <div key={title}
              className="flex items-start gap-4"
              style={{
                opacity: trustSection.on ? 1 : 0,
                transform: trustSection.on ? 'translateY(0)' : 'translateY(20px)',
                transition: `opacity 0.6s ease ${i * 120}ms, transform 0.6s ease ${i * 120}ms`,
              }}>
              <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
                style={{ background: `${color}12` }}>
                <Icon size={20} style={{ color }} />
              </div>
              <div>
                <h4 className="font-bold text-sm mb-1.5" style={{ color: '#0F1623', letterSpacing: '-0.01em' }}>
                  {title}
                </h4>
                <p className="text-xs leading-relaxed" style={{ color: '#94A3B8' }}>{desc}</p>
              </div>
            </div>
          ))}
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
                  <Link href="/buscar"
                    className="inline-flex items-center justify-center gap-2 font-medium px-8 py-4 rounded-2xl text-sm whitespace-nowrap"
                    style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.1)' }}>
                    Explorar espacios
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
