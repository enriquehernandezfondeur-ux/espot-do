'use client'

import { useEffect, useRef, useState, useMemo } from 'react'
import HomepageSearch from './HomepageSearch'

// ── Partículas flotantes (tech feel) ─────────────────────
function Particles({ count = 32 }: { count?: number }) {
  const pts = useMemo(() =>
    Array.from({ length: count }, (_, i) => ({
      x:     ((i * 37 + 11) % 95) + 2,
      y:     ((i * 53 + 7)  % 90) + 5,
      size:  1 + (i % 3) * 0.5,
      dur:   14 + (i % 9) * 2.4,
      delay: -((i * 1.9) % 22),
      drift: ((i % 5) - 2) * 9,
    })),
  [count])

  return (
    <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 1 }}>
      {pts.map((p, i) => (
        <div key={i} style={{
          position: 'absolute',
          left: `${p.x}%`, top: `${p.y}%`,
          width: p.size, height: p.size,
          borderRadius: '50%',
          background: '#35C493',
          boxShadow: `0 0 ${p.size * 3}px rgba(53,196,147,0.9)`,
          animation: `ptRise ${p.dur}s ease-in ${p.delay}s infinite`,
          ['--drift' as any]: `${p.drift}px`,
        }} />
      ))}
    </div>
  )
}

// ── Counter animado ───────────────────────────────────────
function useCountUp(target: number, duration = 1800) {
  const [val, setVal]     = useState(0)
  const [active, setActive] = useState(false)

  useEffect(() => {
    if (!active || target === 0) return
    let start: number | null = null
    const tick = (ts: number) => {
      if (!start) start = ts
      const p = Math.min((ts - start) / duration, 1)
      setVal(Math.floor((1 - Math.pow(1 - p, 3)) * target))
      if (p < 1) requestAnimationFrame(tick)
      else setVal(target)
    }
    requestAnimationFrame(tick)
  }, [active, target, duration])

  return { val, trigger: () => setActive(true) }
}

// ─────────────────────────────────────────────────────────
export default function HeroParallax({ spaceCount }: { spaceCount: number }) {
  const videoRef   = useRef<HTMLVideoElement>(null)
  const statsRef   = useRef<HTMLDivElement>(null)
  const counter    = useCountUp(spaceCount)

  /* Parallax solo desktop */
  useEffect(() => {
    if (window.innerWidth < 768) return
    let ticking = false
    function onScroll() {
      if (ticking) return
      ticking = true
      requestAnimationFrame(() => {
        if (videoRef.current)
          videoRef.current.style.transform = `translateY(${window.scrollY * 0.45}px)`
        ticking = false
      })
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  /* Trigger counter cuando el stat entra al viewport */
  useEffect(() => {
    const el = statsRef.current
    if (!el) return
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { counter.trigger(); obs.disconnect() }
    }, { threshold: 0.6 })
    obs.observe(el)
    return () => obs.disconnect()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <section className="relative overflow-hidden"
      style={{ height: '100dvh', minHeight: 560, maxHeight: 900 }}>

      {/* ── Keyframes globales ── */}
      <style>{`
        @keyframes ptRise {
          0%   { opacity:0; transform:translateY(0) translateX(0) scale(1) }
          12%  { opacity:0.7 }
          88%  { opacity:0.7 }
          100% { opacity:0; transform:translateY(-90px) translateX(var(--drift,0px)) scale(0.3) }
        }
        @keyframes gridPan {
          from { background-position: 0 0 }
          to   { background-position: 60px 60px }
        }
        @keyframes scanLine {
          0%   { top:-1%; opacity:0 }
          4%   { opacity:1 }
          96%  { opacity:1 }
          100% { top:101%; opacity:0 }
        }
        @keyframes gradShift {
          0%,100% { background-position: 0% 50% }
          50%     { background-position: 100% 50% }
        }
        @keyframes heroIn {
          from { opacity:0; transform:translateY(22px) }
          to   { opacity:1; transform:translateY(0) }
        }
        @keyframes pulseGlow {
          0%,100% { box-shadow: 0 0 0 0 rgba(53,196,147,0) }
          50%     { box-shadow: 0 0 20px 4px rgba(53,196,147,0.18) }
        }
        @media (prefers-reduced-motion: reduce) {
          [data-anim] { animation: none !important; opacity: 1 !important; transform: none !important; }
        }
      `}</style>

      {/* ── Video ── */}
      <video ref={videoRef} autoPlay muted loop playsInline
        style={{ position:'absolute', inset:0, width:'100%', height:'115%',
          objectFit:'cover', zIndex:0, willChange:'transform' }}>
        <source src="/dia.mp4" type="video/mp4" />
      </video>

      {/* ── Overlay oscuro ── */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background:'linear-gradient(160deg, rgba(3,10,7,0.85) 0%, rgba(6,18,12,0.78) 50%, rgba(3,8,6,0.88) 100%)', zIndex:1 }} />

      {/* ── Grid tech animado ── */}
      <div className="absolute inset-0 pointer-events-none" style={{
        zIndex: 1,
        backgroundImage:
          'linear-gradient(rgba(53,196,147,0.04) 1px, transparent 1px),' +
          'linear-gradient(90deg, rgba(53,196,147,0.04) 1px, transparent 1px)',
        backgroundSize: '60px 60px',
        animation: 'gridPan 28s linear infinite',
        maskImage: 'radial-gradient(ellipse 90% 90% at 50% 50%, black 20%, transparent 100%)',
        WebkitMaskImage: 'radial-gradient(ellipse 90% 90% at 50% 50%, black 20%, transparent 100%)',
      }} />

      {/* ── Línea de scan ── */}
      <div className="absolute pointer-events-none" style={{
        left: 0, right: 0, height: 1, zIndex: 2,
        background: 'linear-gradient(90deg, transparent 0%, rgba(53,196,147,0.3) 50%, transparent 100%)',
        animation: 'scanLine 12s linear 1.5s infinite',
      }} />

      {/* ── Partículas ── */}
      <Particles />

      {/* ── Orbes de profundidad ── */}
      <div style={{ position:'absolute', top:'10%', right:'8%', width:520, height:520,
        borderRadius:'50%', background:'radial-gradient(circle, rgba(53,196,147,0.06) 0%, transparent 65%)',
        zIndex:1, pointerEvents:'none', animation:'pulseGlow 6s ease-in-out infinite' }} />
      <div style={{ position:'absolute', bottom:'5%', left:'5%', width:360, height:360,
        borderRadius:'50%', background:'radial-gradient(circle, rgba(53,196,147,0.04) 0%, transparent 70%)',
        zIndex:1, pointerEvents:'none' }} />

      {/* ── Contenido ── */}
      <div className="relative flex flex-col items-center justify-center text-center px-4 md:px-6"
        style={{ height:'100%', zIndex:2 }}>

        {/* Badge */}
        <div data-anim
          className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-7 text-xs font-semibold tracking-wide"
          style={{
            background:'rgba(53,196,147,0.08)', border:'1px solid rgba(53,196,147,0.18)',
            color:'#6EE7C7', animation:'heroIn 0.7s ease 0.1s both',
          }}>
          <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background:'#35C493' }} />
          Espacios para eventos · República Dominicana
        </div>

        {/* Headline */}
        <h1 data-anim className="font-bold text-white mb-5"
          style={{
            fontSize:'clamp(1.8rem, 5vw, 3.5rem)',
            lineHeight:1.04, letterSpacing:'-0.045em', maxWidth:900,
            animation:'heroIn 0.8s ease 0.25s both',
          }}>
          El espacio perfecto
          <br />
          <span style={{
            background:'linear-gradient(95deg, #35C493 0%, #6EE7C7 30%, #35C493 60%, #6EE7C7 100%)',
            WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent',
            backgroundSize:'300% auto',
            animation:'gradShift 5s ease infinite',
          }}>
            para tu evento
          </span>
        </h1>

        {/* Subtítulo */}
        <p data-anim className="mb-10"
          style={{
            color:'rgba(255,255,255,0.45)',
            fontSize:'clamp(0.9rem, 2vw, 1.1rem)',
            lineHeight:1.8, maxWidth:500,
            animation:'heroIn 0.8s ease 0.42s both',
          }}>
          Reserva salones, rooftops, restaurantes y más.
          <br className="hidden md:block" />
          Confirmación en 24 horas. Paga el depósito para asegurar tu fecha.
        </p>

        {/* Search */}
        <div data-anim style={{ animation:'heroIn 0.8s ease 0.56s both', width:'100%', display:'flex', justifyContent:'center' }}>
          <HomepageSearch />
        </div>

        {/* Métricas con counter */}
        <div ref={statsRef} data-anim
          className="flex items-center justify-center gap-5 md:gap-14 mt-10"
          style={{ animation:'heroIn 0.8s ease 0.72s both' }}>
          {[
            { value: `${counter.val}+`, label: 'espacios' },
            { value: '24h',             label: 'respuesta' },
            { value: 'RD$0',            label: 'registro' },
          ].map((s, i) => (
            <div key={s.label} className="flex items-center">
              {i > 0 && (
                <div className="hidden md:block w-px h-8 mr-14"
                  style={{ background:'rgba(255,255,255,0.07)' }} />
              )}
              <div className="text-center">
                <div className="font-bold text-white tabular-nums"
                  style={{ fontSize:'clamp(1.2rem, 4vw, 2rem)', letterSpacing:'-0.04em' }}>
                  {s.value}
                </div>
                <div className="text-[10px] md:text-xs tracking-wider"
                  style={{ color:'rgba(255,255,255,0.3)', marginTop:2 }}>
                  {s.label.toUpperCase()}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5"
          style={{ opacity:0.35 }}>
          <div className="w-px h-10"
            style={{ background:'linear-gradient(to bottom, transparent, #35C493)' }} />
          <span className="text-xs tracking-widest" style={{ color:'#35C493', fontSize:9 }}>
            SCROLL
          </span>
        </div>
      </div>
    </section>
  )
}
