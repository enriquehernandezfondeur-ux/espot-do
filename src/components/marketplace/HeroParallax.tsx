'use client'

import { useEffect, useRef } from 'react'
import HomepageSearch from './HomepageSearch'

interface Props {
  spaceCount: number
}

export default function HeroParallax({ spaceCount }: Props) {
  const videoRef   = useRef<HTMLVideoElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Parallax solo en desktop — en móvil causa jank en Safari iOS
    if (window.innerWidth < 768) return

    let ticking = false

    function onScroll() {
      if (ticking) return
      ticking = true
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.style.transform = `translateY(${window.scrollY * 0.45}px)`
        }
        ticking = false
      })
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <section
      className="relative overflow-hidden"
      style={{ height: '100dvh', minHeight: 560, maxHeight: 900 }}>

      {/* Video — se mueve más lento que el scroll */}
      <video
        ref={videoRef}
        autoPlay muted loop playsInline
        style={{
          position: 'absolute', inset: 0,
          width: '100%', height: '115%', // más alto para el parallax
          objectFit: 'cover', zIndex: 0,
          willChange: 'transform',
        }}>
        <source src="/dia.mp4" type="video/mp4" />
      </video>

      {/* Overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'linear-gradient(160deg, rgba(3,10,7,0.85) 0%, rgba(6,18,12,0.78) 50%, rgba(3,8,6,0.88) 100%)',
          zIndex: 1,
        }}
      />

      {/* Orbes de profundidad */}
      <div style={{
        position: 'absolute', top: '10%', right: '8%',
        width: 520, height: 520, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(53,196,147,0.06) 0%, transparent 65%)',
        zIndex: 1, pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', bottom: '5%', left: '5%',
        width: 360, height: 360, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(53,196,147,0.04) 0%, transparent 70%)',
        zIndex: 1, pointerEvents: 'none',
      }} />

      {/* Contenido — se mueve y desvanece al scrollear */}
      <div
        ref={contentRef}
        className="relative flex flex-col items-center justify-center text-center px-4 md:px-6"
        style={{ height: '100%', zIndex: 2 }}>

        {/* Badge */}
        <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-7 text-xs font-semibold tracking-wide"
          style={{ background: 'rgba(53,196,147,0.08)', border: '1px solid rgba(53,196,147,0.18)', color: '#6EE7C7' }}>
          <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#35C493' }} />
          Espacios para eventos · República Dominicana
        </div>

        {/* Headline */}
        <h1
          className="font-bold text-white mb-5"
          style={{
            fontSize: 'clamp(1.8rem, 8vw, 5.5rem)',
            lineHeight: 1.04,
            letterSpacing: '-0.045em',
            maxWidth: 900,
          }}>
          El espacio perfecto
          <br />
          <span style={{
            background: 'linear-gradient(95deg, #35C493 0%, #6EE7C7 50%, #35C493 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundSize: '200% auto',
          }}>
            para tu evento
          </span>
        </h1>

        {/* Subtítulo */}
        <p
          className="mb-10"
          style={{
            color: 'rgba(255,255,255,0.45)',
            fontSize: 'clamp(0.9rem, 2vw, 1.1rem)',
            lineHeight: 1.8,
            maxWidth: 500,
          }}>
          Reserva salones, rooftops, restaurantes y más.
          <br className="hidden md:block" />
          Confirmación en 24 horas. Paga el depósito para asegurar tu fecha.
        </p>

        {/* Search */}
        <HomepageSearch />

        {/* Métricas */}
        <div className="flex items-center justify-center gap-5 md:gap-14 mt-10">
          {[
            { value: `${spaceCount}+`, label: 'espacios' },
            { value: '24h',            label: 'respuesta' },
            { value: 'RD$0',           label: 'registro' },
          ].map((s, i) => (
            <div key={s.label} className="flex items-center">
              {i > 0 && (
                <div className="hidden md:block w-px h-8 mr-14"
                  style={{ background: 'rgba(255,255,255,0.07)' }} />
              )}
              <div className="text-center">
                <div className="font-bold text-white"
                  style={{ fontSize: 'clamp(1.2rem, 4vw, 2rem)', letterSpacing: '-0.04em' }}>
                  {s.value}
                </div>
                <div className="text-[10px] md:text-xs tracking-wider"
                  style={{ color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>
                  {s.label.toUpperCase()}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Indicador de scroll */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5"
          style={{ opacity: 0.35 }}>
          <div className="w-px h-10" style={{
            background: 'linear-gradient(to bottom, transparent, #35C493)',
          }} />
          <span className="text-xs tracking-widest" style={{ color: '#35C493', fontSize: 9 }}>
            SCROLL
          </span>
        </div>

      </div>
    </section>
  )
}
