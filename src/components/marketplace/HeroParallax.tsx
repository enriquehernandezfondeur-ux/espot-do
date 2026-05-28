'use client'

import { useEffect, useRef } from 'react'
import HomepageSearch from './HomepageSearch'

export default function HeroParallax() {
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
        poster="/dia-poster.jpg"
        style={{
          position: 'absolute', inset: 0,
          width: '100%', height: '115%', // más alto para el parallax
          objectFit: 'cover', zIndex: 0,
          willChange: 'transform',
        }}>
        <source src="/dia.mp4" type="video/mp4" />
      </video>

      {/* Overlay — gradiente refinado */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'linear-gradient(160deg, rgba(3,10,7,0.86) 0%, rgba(6,18,12,0.80) 50%, rgba(3,8,6,0.89) 100%)',
          zIndex: 1,
        }}
      />

      {/* Orbes de profundidad — sutiles */}
      <div style={{
        position: 'absolute', top: '10%', right: '8%',
        width: 520, height: 520, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(53,196,147,0.07) 0%, transparent 65%)',
        zIndex: 1, pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', bottom: '5%', left: '5%',
        width: 360, height: 360, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(53,196,147,0.05) 0%, transparent 70%)',
        zIndex: 1, pointerEvents: 'none',
      }} />

      {/* Contenido */}
      <div
        ref={contentRef}
        className="relative flex flex-col items-center justify-center text-center px-4 md:px-6"
        style={{ height: '100%', zIndex: 2 }}>

        {/* Etiqueta pequeña (badge) */}
        <div className="mb-8 md:mb-10 flex items-center gap-2"
          style={{
            padding: '8px 14px',
            background: 'rgba(53,196,147,0.12)',
            border: '1px solid rgba(53,196,147,0.25)',
            borderRadius: '24px',
            animation: 'fadeInDown 0.8s ease-out 0.2s backwards'
          }}>
          <div style={{
            width: 6, height: 6, borderRadius: '50%',
            background: '#35C493'
          }} />
          <span className="text-xs font-semibold"
            style={{
              color: '#5CE8BC',
              letterSpacing: '0.02em',
              textTransform: 'uppercase'
            }}>
            +250 espacios verificados
          </span>
        </div>

        {/* Headline — tipografía refinada */}
        <h1
          className="font-bold text-white mb-6 md:mb-8"
          style={{
            fontSize: 'clamp(2.2rem, 6vw, 4rem)',
            lineHeight: 1.05,
            letterSpacing: '-0.035em',
            maxWidth: 950,
            fontFamily: "var(--font-display, 'TypoGraphica'), var(--font-poppins), sans-serif",
            fontWeight: 900,
            animation: 'fadeInDown 0.9s ease-out 0.3s backwards'
          }}>
          El espacio perfecto
          <br style={{ display: 'block' }} />
          <span style={{
            background: 'linear-gradient(95deg, #35C493 0%, #5CE8BC 50%, #35C493 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundSize: '200% auto',
            display: 'inline-block'
          }}>
            para tu evento
          </span>
        </h1>

        {/* Subtítulo — refinado */}
        <p
          className="mb-12 md:mb-14"
          style={{
            color: 'rgba(255,255,255,0.50)',
            fontSize: 'clamp(0.95rem, 2.2vw, 1.15rem)',
            lineHeight: 1.7,
            maxWidth: 520,
            fontWeight: 400,
            letterSpacing: '0.003em',
            animation: 'fadeInDown 1s ease-out 0.4s backwards'
          }}>
          Salones, rooftops, restaurantes, villas y más.
          <br className="hidden md:block" />
          Encuentra el espacio ideal y resérvalo en minutos.
        </p>

        {/* Search — con animación */}
        <div style={{ animation: 'fadeInUp 0.9s ease-out 0.5s backwards' }}>
          <HomepageSearch />
        </div>

      </div>

      {/* Keyframes para animaciones */}
      <style>{`
        @keyframes fadeInDown {
          from { opacity: 0; transform: translateY(-12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </section>
  )
}
