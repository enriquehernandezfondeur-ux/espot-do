'use client'

import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'

// ─────────────────────────────────────────────────────────────
// CSS — liquid glass + fuentes + fondos animados
// ─────────────────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Barlow:wght@300;400;500;600&display=swap');

/* Headline del hero */
.hero-headline { max-width:780px; margin:0 auto; }
.hero-headline span {
  font-family:'Instrument Serif',serif !important;
  font-style:italic !important;
  font-size:clamp(2.8rem,7.5vw,5.5rem) !important;
  line-height:0.88 !important;
  letter-spacing:-3px !important;
  color:#fff !important;
}

/* Nav center — hidden mobile, flex desktop */
.nav-center { display:none !important; }
@media(min-width:768px){ .nav-center { display:flex !important; } }


.exp { background:#000; min-height:100vh; overflow-x:hidden; font-family:'Barlow',sans-serif; color:#fff; }
.exp *, .exp *::before, .exp *::after { box-sizing:border-box; }

/* Liquid glass */
.lg {
  background:rgba(255,255,255,0.01);
  backdrop-filter:blur(4px);
  -webkit-backdrop-filter:blur(4px);
  box-shadow:inset 0 1px 1px rgba(255,255,255,0.1);
  position:relative; overflow:hidden;
}
.lg::before {
  content:""; position:absolute; inset:0; border-radius:inherit; padding:1.4px;
  background:linear-gradient(180deg,
    rgba(255,255,255,0.45) 0%, rgba(255,255,255,0.15) 20%,
    rgba(255,255,255,0) 40%,  rgba(255,255,255,0) 60%,
    rgba(255,255,255,0.15) 80%, rgba(255,255,255,0.45) 100%);
  -webkit-mask:linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite:xor; mask-composite:exclude; pointer-events:none;
}
.lg-strong {
  background:rgba(255,255,255,0.01);
  backdrop-filter:blur(50px); -webkit-backdrop-filter:blur(50px);
  box-shadow:4px 4px 4px rgba(0,0,0,0.05), inset 0 1px 1px rgba(255,255,255,0.15);
  position:relative; overflow:hidden;
}
.lg-strong::before {
  content:""; position:absolute; inset:0; border-radius:inherit; padding:1.4px;
  background:linear-gradient(180deg,
    rgba(255,255,255,0.5) 0%,  rgba(255,255,255,0.2) 20%,
    rgba(255,255,255,0) 40%,   rgba(255,255,255,0) 60%,
    rgba(255,255,255,0.2) 80%, rgba(255,255,255,0.5) 100%);
  -webkit-mask:linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite:xor; mask-composite:exclude; pointer-events:none;
}

/* Fondos animados */
@keyframes heroDrift {
  0%   { background-position: 0% 50%; }
  33%  { background-position: 100% 30%; }
  66%  { background-position: 50% 100%; }
  100% { background-position: 0% 50%; }
}
.hero-bg {
  background:
    radial-gradient(ellipse 90% 70% at 15% 35%, rgba(8,35,20,0.95) 0%, transparent 55%),
    radial-gradient(ellipse 70% 90% at 85% 65%, rgba(4,18,36,0.9) 0%, transparent 55%),
    radial-gradient(ellipse 50% 50% at 50% 110%, rgba(12,28,18,0.6) 0%, transparent 50%),
    #000;
  background-size:200% 200%;
  animation:heroDrift 28s ease infinite;
}

@keyframes capsDrift {
  0%   { background-position:100% 0%; }
  50%  { background-position:0% 100%; }
  100% { background-position:100% 0%; }
}
.caps-bg {
  background:
    radial-gradient(ellipse 75% 55% at 75% 25%, rgba(4,18,34,0.95) 0%, transparent 60%),
    radial-gradient(ellipse 85% 65% at 15% 80%, rgba(6,22,14,0.85) 0%, transparent 55%),
    #000;
  background-size:200% 200%;
  animation:capsDrift 32s ease infinite;
}

/* Grano de película */
.grain::after {
  content:''; position:absolute; inset:0; pointer-events:none; z-index:1;
  background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  opacity:0.045;
}

/* Tipografía */
.serif { font-family:'Instrument Serif',serif; font-style:italic; }
`

// ─────────────────────────────────────────────────────────────
// Iconos SVG inline
// ─────────────────────────────────────────────────────────────
function ArrowUpRight({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <line x1="7" y1="17" x2="17" y2="7" />
      <polyline points="7 7 17 7 17 17" />
    </svg>
  )
}

function Play({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  )
}

// ─────────────────────────────────────────────────────────────
// BlurText — animación palabra por palabra
// ─────────────────────────────────────────────────────────────
function BlurText({ text, className = '' }: { text: string; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [on, setOn] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setOn(true); obs.disconnect() } }, { threshold: 0.1 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  return (
    <div ref={ref} style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', rowGap: '0.1em' }}>
      {text.split(' ').map((word, i) => (
        <motion.span
          key={i}
          initial={{ filter: 'blur(10px)', opacity: 0, y: 50 }}
          animate={on ? {
            filter: ['blur(10px)', 'blur(4px)', 'blur(0px)'],
            opacity: [0, 0.5, 1],
            y: [50, -4, 0],
          } : {}}
          transition={{ duration: 0.75, delay: i * 0.1, ease: EASE_OUT, times: [0, 0.5, 1] as [number, number, number] }}
          style={{ display: 'inline-block', marginRight: '0.28em' }}
          className={className}
        >
          {word}
        </motion.span>
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// FadingVideo — crossfade por rAF (sin CSS transitions)
// Listo para usar — solo pasa src con un video MP4 propio
// ─────────────────────────────────────────────────────────────
function FadingVideo({ src, className, style }: { src: string; className?: string; style?: React.CSSProperties }) {
  const vRef    = useRef<HTMLVideoElement>(null)
  const rafRef  = useRef(0)
  const fadingRef = useRef(false)
  const FADE_MS = 500
  const LEAD    = 0.6

  const fadeTo = (v: HTMLVideoElement, target: number) => {
    cancelAnimationFrame(rafRef.current)
    const t0   = performance.now()
    const from = parseFloat(v.style.opacity || '0')
    const tick = (now: number) => {
      const p = Math.min((now - t0) / FADE_MS, 1)
      v.style.opacity = String(from + (target - from) * p)
      if (p < 1) rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
  }

  useEffect(() => {
    const v = vRef.current
    if (!v || !src) return
    v.style.opacity = '0'

    const onLoad  = () => { v.style.opacity = '0'; v.play().catch(() => {}); fadeTo(v, 1) }
    const onTime  = () => {
      if (!fadingRef.current && v.duration > 0 && v.duration - v.currentTime <= LEAD) {
        fadingRef.current = true; fadeTo(v, 0)
      }
    }
    const onEnded = () => {
      v.style.opacity = '0'
      setTimeout(() => { v.currentTime = 0; v.play().catch(() => {}); fadingRef.current = false; fadeTo(v, 1) }, 100)
    }

    v.addEventListener('loadeddata', onLoad)
    v.addEventListener('timeupdate', onTime)
    v.addEventListener('ended', onEnded)
    return () => {
      cancelAnimationFrame(rafRef.current)
      v.removeEventListener('loadeddata', onLoad)
      v.removeEventListener('timeupdate', onTime)
      v.removeEventListener('ended', onEnded)
    }
  }, [src])

  if (!src) return null
  return <video ref={vRef} src={src} autoPlay muted playsInline preload="auto" className={className} style={{ ...style, opacity: 0 }} />
}

// ─────────────────────────────────────────────────────────────
// Navbar
// ─────────────────────────────────────────────────────────────
const NAV_LINKS = [
  { label: 'Inicio',           href: '/' },
  { label: 'Espacios',         href: '/buscar' },
  { label: 'Cómo funciona',    href: '/para-clientes' },
  { label: 'Para propietarios', href: '/para-propietarios' },
]

function Navbar() {
  return (
    <nav style={{ position: 'fixed', top: 16, left: 0, right: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 32px' }}>
      {/* Logo */}
      <div className="lg" style={{ width: 48, height: 48, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span className="serif" style={{ fontSize: 22, color: '#fff' }}>e</span>
      </div>

      {/* Links — solo desktop (nav-center se muestra vía CSS) */}
      <div className="lg nav-center"
        style={{ borderRadius: 9999, padding: '6px 6px', alignItems: 'center', gap: 4 }}>
        {NAV_LINKS.map(l => (
          <Link key={l.href} href={l.href}
            style={{ padding: '8px 14px', fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.9)', textDecoration: 'none', borderRadius: 9999, whiteSpace: 'nowrap' }}>
            {l.label}
          </Link>
        ))}
        <Link href="/buscar"
          style={{ background: '#fff', color: '#000', padding: '8px 16px', borderRadius: 9999, fontSize: 13, fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap', marginLeft: 4 }}>
          Reservar ahora <ArrowUpRight size={13} />
        </Link>
      </div>

      {/* Spacer derecho */}
      <div style={{ width: 48 }} />
    </nav>
  )
}

// ─────────────────────────────────────────────────────────────
// Hero content
// ─────────────────────────────────────────────────────────────
type EaseTuple = [number, number, number, number]
const EASE_OUT: EaseTuple = [0, 0, 0.2, 1]
const EASE_SPRING: EaseTuple = [0.16, 1, 0.3, 1]

const fadeUp = (delay = 0) => ({
  initial: { filter: 'blur(10px)', opacity: 0, y: 20 },
  animate: { filter: 'blur(0px)', opacity: 1, y: 0 },
  transition: { duration: 0.8, delay, ease: EASE_OUT },
})

function HeroContent() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 0 }}>

      {/* Badge */}
      <motion.div {...fadeUp(0.35)} className="lg"
        style={{ borderRadius: 9999, padding: '6px 6px 6px 8px', display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 28 }}>
        <span style={{ background: '#fff', color: '#000', borderRadius: 9999, padding: '2px 10px', fontSize: 11, fontWeight: 700, letterSpacing: '0.02em' }}>
          Nuevo
        </span>
        <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.88)', paddingRight: 10 }}>
          La plataforma de espacios para eventos en la RD
        </span>
      </motion.div>

      {/* Titular animado */}
      <div className="hero-headline">
        <BlurText
          text="El espacio perfecto para cada celebración"
          className="serif"
        />
      </div>

      {/* Subtítulo */}
      <motion.p {...fadeUp(0.8)} style={{
        marginTop: 18, fontSize: 'clamp(14px,1.8vw,17px)', color: 'rgba(255,255,255,0.82)',
        maxWidth: 560, lineHeight: 1.55, fontWeight: 300,
      }}>
        Descubre venues únicos para bodas, quinceañeras, cumpleaños y corporativos.
        Reserva en minutos. Pago 100% seguro a través de la plataforma.
      </motion.p>

      {/* CTAs */}
      <motion.div {...fadeUp(1.1)} style={{ display: 'flex', alignItems: 'center', gap: 24, marginTop: 28, flexWrap: 'wrap', justifyContent: 'center' }}>
        <Link href="/buscar" className="lg-strong"
          style={{ borderRadius: 9999, padding: '11px 22px', fontSize: 14, fontWeight: 500, color: '#fff', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          Explorar espacios <ArrowUpRight size={16} />
        </Link>
        <Link href="/para-clientes"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 14, fontWeight: 400, color: 'rgba(255,255,255,0.85)', textDecoration: 'none' }}>
          <Play size={15} /> Cómo funciona
        </Link>
      </motion.div>

      {/* Stats */}
      <motion.div {...fadeUp(1.3)} style={{ display: 'flex', gap: 16, marginTop: 36, flexWrap: 'wrap', justifyContent: 'center' }}>
        {[
          { icon: <ClockIcon />, number: '5 min', label: 'Tiempo promedio de reserva' },
          { icon: <LocationIcon />, number: '200+', label: 'Espacios en toda la RD' },
        ].map((s, i) => (
          <div key={i} className="lg"
            style={{ borderRadius: 20, padding: '20px 24px', width: 210, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ width: 28, height: 28, color: '#fff', opacity: 0.9 }}>{s.icon}</div>
            <div>
              <div className="serif" style={{ fontSize: 38, letterSpacing: '-1px', lineHeight: 1, color: '#fff' }}>{s.number}</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', marginTop: 5, fontWeight: 300, lineHeight: 1.4 }}>{s.label}</div>
            </div>
          </div>
        ))}
      </motion.div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Partners
// ─────────────────────────────────────────────────────────────
function Partners() {
  return (
    <motion.div {...fadeUp(1.5)}
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, paddingBottom: 36 }}>
      <div className="lg"
        style={{ borderRadius: 9999, padding: '5px 14px', fontSize: 11, fontWeight: 500, color: 'rgba(255,255,255,0.7)' }}>
        Categorías de espacios disponibles
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 40, flexWrap: 'wrap', justifyContent: 'center' }}>
        {['Terrazas', 'Jardines', 'Salones', 'Villas', 'Clubes'].map(name => (
          <span key={name} className="serif"
            style={{ fontSize: 'clamp(20px,3vw,28px)', color: '#fff', letterSpacing: '-0.5px', whiteSpace: 'nowrap' }}>
            {name}
          </span>
        ))}
      </div>
    </motion.div>
  )
}

// ─────────────────────────────────────────────────────────────
// Capabilities
// ─────────────────────────────────────────────────────────────
const CARDS = [
  {
    icon: <SearchIcon />,
    title: 'Búsqueda inteligente',
    body: 'Filtra por zona, capacidad, tipo de evento y precio. Encuentra el venue ideal en segundos, no en horas.',
    tags: ['Zona', 'Capacidad', 'Tipo evento', 'Precio'],
  },
  {
    icon: <ShieldIcon />,
    title: 'Pago 100% seguro',
    body: 'Todo pasa por espot.do vía Azul Payments. Sin transferencias directas al propietario. Sin riesgo.',
    tags: ['Azul Payments', 'Cuotas', 'Sin riesgo', 'Facturado'],
  },
  {
    icon: <LightningIcon />,
    title: 'Confirmación rápida',
    body: 'Espacios con confirmación instantánea o por solicitud. Algunos confirman en segundos, otros en horas.',
    tags: ['Instantáneo', 'Por solicitud', 'Cotización', 'Sin esperas'],
  },
]

function Capabilities() {
  const ref  = useRef<HTMLDivElement>(null)
  const [on, setOn] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setOn(true); obs.disconnect() } }, { threshold: 0.1 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  return (
    <div ref={ref} style={{ padding: 'clamp(64px,8vw,96px) clamp(24px,5vw,80px)', display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>

      {/* Header */}
      <div style={{ marginBottom: 'auto' }}>
        <motion.p
          initial={{ opacity: 0 }} animate={on ? { opacity: 1 } : {}}
          transition={{ duration: 0.6, delay: 0.1 }}
          style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: 20, letterSpacing: '0.02em' }}>
          // Cómo funciona
        </motion.p>

        <div style={{ overflow: 'hidden' }}>
          {['Reservas', 'redefinidas'].map((line, i) => (
            <motion.div key={line}
              initial={{ y: 80, opacity: 0 }}
              animate={on ? { y: 0, opacity: 1 } : {}}
              transition={{ duration: 0.75, delay: 0.2 + i * 0.12, ease: EASE_SPRING }}>
              <span className="serif" style={{ fontSize: 'clamp(3.5rem,9vw,6rem)', lineHeight: 0.9, letterSpacing: '-3px', color: '#fff', display: 'block' }}>
                {line}
              </span>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, marginTop: 64 }}>
        {CARDS.map((card, i) => (
          <motion.div key={i} className="lg"
            initial={{ opacity: 0, y: 40 }}
            animate={on ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.7, delay: 0.4 + i * 0.12, ease: EASE_OUT }}
            style={{ borderRadius: 20, padding: 24, minHeight: 360, display: 'flex', flexDirection: 'column' }}>

            {/* Top row */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
              {/* Icon */}
              <div className="lg"
                style={{ width: 44, height: 44, borderRadius: 12, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                <div style={{ width: 22, height: 22 }}>{card.icon}</div>
              </div>
              {/* Tags */}
              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 6, maxWidth: '65%' }}>
                {card.tags.map(tag => (
                  <span key={tag} className="lg"
                    style={{ borderRadius: 9999, padding: '4px 10px', fontSize: 10, color: 'rgba(255,255,255,0.88)', whiteSpace: 'nowrap' }}>
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Spacer */}
            <div style={{ flex: 1 }} />

            {/* Bottom */}
            <div style={{ marginTop: 24 }}>
              <h3 className="serif"
                style={{ fontSize: 'clamp(26px,3vw,34px)', color: '#fff', letterSpacing: '-1px', lineHeight: 1, marginBottom: 12 }}>
                {card.title}
              </h3>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.82)', lineHeight: 1.6, fontWeight: 300, maxWidth: '32ch' }}>
                {card.body}
              </p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* CTA final */}
      <motion.div
        initial={{ opacity: 0 }} animate={on ? { opacity: 1 } : {}}
        transition={{ duration: 0.6, delay: 0.9 }}
        style={{ marginTop: 48, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <Link href="/buscar" className="lg-strong"
          style={{ borderRadius: 9999, padding: '13px 28px', fontSize: 14, fontWeight: 500, color: '#fff', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          Ver todos los espacios <ArrowUpRight size={16} />
        </Link>
        <Link href="/para-propietarios"
          style={{ borderRadius: 9999, padding: '13px 28px', fontSize: 14, fontWeight: 400, color: 'rgba(255,255,255,0.7)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 8, border: '1px solid rgba(255,255,255,0.12)' }}>
          Publicar mi espacio
        </Link>
      </motion.div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Iconos para stats y cards
// ─────────────────────────────────────────────────────────────
function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" width="100%" height="100%">
      <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67V7z" />
    </svg>
  )
}

function LocationIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" width="100%" height="100%">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
    </svg>
  )
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" width="100%" height="100%">
      <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
    </svg>
  )
}

function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" width="100%" height="100%">
      <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 4l5 2.18V11c0 3.5-2.33 6.79-5 7.93-2.67-1.14-5-4.43-5-7.93V7.18L12 5z" />
    </svg>
  )
}

function LightningIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" width="100%" height="100%">
      <path d="M7 2v11h3v9l7-12h-4l4-8z" />
    </svg>
  )
}

// ─────────────────────────────────────────────────────────────
// Page principal
// ─────────────────────────────────────────────────────────────
export default function ExperimentalPage() {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="exp">

        {/* ── SECCIÓN 1: HERO ── */}
        <section style={{ position: 'relative', minHeight: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#000' }}>

          {/* Fondo animado + grano */}
          <div className="hero-bg grain" style={{ position: 'absolute', inset: 0, zIndex: 0 }} />

          {/*
            Para añadir video real:
            <FadingVideo
              src="/videos/hero-espot.mp4"
              className="absolute left-1/2 top-0 -translate-x-1/2 object-cover object-top"
              style={{ width: '120%', height: '120%', zIndex: 0 }}
            />
          */}

          {/* Capa de contenido */}
          <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
            <Navbar />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingTop: 96, paddingLeft: 20, paddingRight: 20 }}>
              <HeroContent />
            </div>
            <Partners />
          </div>
        </section>

        {/* ── SECCIÓN 2: CAPABILITIES ── */}
        <section style={{ position: 'relative', minHeight: '100vh', overflow: 'hidden', background: '#000' }}>

          <div className="caps-bg grain" style={{ position: 'absolute', inset: 0, zIndex: 0 }} />

          {/*
            Para añadir video real:
            <FadingVideo
              src="/videos/caps-espot.mp4"
              className="absolute inset-0 w-full h-full object-cover"
              style={{ zIndex: 0 }}
            />
          */}

          <div style={{ position: 'relative', zIndex: 10 }}>
            <Capabilities />
          </div>
        </section>

      </div>
    </>
  )
}
