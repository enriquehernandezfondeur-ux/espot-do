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
          filter: 'brightness(1.18) saturate(1.05)',
        }}>
        <source src="/dia.mp4" type="video/mp4" />
      </video>

      {/* Overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'linear-gradient(160deg, rgba(3,10,7,0.55) 0%, rgba(6,18,12,0.42) 50%, rgba(3,8,6,0.60) 100%)',
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

        {/* Headline */}
        <h1
          className="font-bold text-white mb-5"
          style={{
            fontSize: 'clamp(1.8rem, 5vw, 3.5rem)',
            lineHeight: 1.04,
            letterSpacing: '-0.045em',
            maxWidth: 900,
          }}>
          El espacio perfecto
          <br />
          <span style={{
            background: 'linear-gradient(95deg, var(--brand) 0%, #6EE7C7 50%, var(--brand) 100%)',
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
            color: 'rgba(255,255,255,0.78)',
            fontSize: 'clamp(0.9rem, 2vw, 1.1rem)',
            lineHeight: 1.8,
            maxWidth: 500,
          }}>
          Salones, rooftops, restaurantes y más.
          <br className="hidden md:block" />
          Encuentra el espacio ideal y resérvalo en minutos.
        </p>

        {/* Search */}
        <HomepageSearch />

      </div>
    </section>
  )
}
