import { ImageResponse } from 'next/og'
import { readFileSync } from 'fs'
import { join } from 'path'

export const runtime     = 'nodejs'
export const alt         = 'espot.do — Espacios para eventos en República Dominicana'
export const size        = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OgImage() {
  const logoSvg    = readFileSync(join(process.cwd(), 'public/logo-green.svg'), 'utf-8')
  const logoSrc    = `data:image/svg+xml;base64,${Buffer.from(logoSvg).toString('base64')}`

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#03313C',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Textura diagonal sutil */}
        <div style={{
          position: 'absolute', inset: 0, display: 'flex',
          backgroundImage: 'repeating-linear-gradient(135deg, rgba(255,255,255,0.018) 0px, rgba(255,255,255,0.018) 1px, transparent 1px, transparent 60px)',
        }} />

        {/* Glow verde esquina superior derecha */}
        <div style={{
          position: 'absolute', top: -150, right: -150,
          width: 550, height: 550, borderRadius: '50%', display: 'flex',
          background: 'radial-gradient(circle, rgba(53,196,147,0.15) 0%, transparent 70%)',
        }} />

        {/* Glow verde esquina inferior izquierda */}
        <div style={{
          position: 'absolute', bottom: -100, left: -100,
          width: 400, height: 400, borderRadius: '50%', display: 'flex',
          background: 'radial-gradient(circle, rgba(53,196,147,0.10) 0%, transparent 70%)',
        }} />

        {/* Línea accent superior */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0,
          height: 4, display: 'flex',
          background: 'linear-gradient(90deg, transparent, #35C493, transparent)',
        }} />

        {/* Contenido central */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 0,
          position: 'relative',
          zIndex: 1,
        }}>
          {/* Logo */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={logoSrc}
            width={500}
            height={174}
            style={{ objectFit: 'contain' }}
            alt="espot"
          />

          {/* Separador */}
          <div style={{
            width: 48, height: 2, borderRadius: 2,
            background: 'rgba(53,196,147,0.45)',
            margin: '24px 0',
            display: 'flex',
          }} />

          {/* Tagline */}
          <div style={{
            fontSize: 28,
            color: 'rgba(255,255,255,0.55)',
            letterSpacing: '0.01em',
            fontFamily: 'sans-serif',
            fontWeight: 400,
            textAlign: 'center',
            display: 'flex',
          }}>
            Espacios para eventos en República Dominicana
          </div>

          {/* Chips */}
          <div style={{
            display: 'flex',
            gap: 10,
            marginTop: 32,
            flexWrap: 'nowrap',
          }}>
            {['Salones', 'Rooftops', 'Restaurantes', 'Villas', 'Jardines'].map(cat => (
              <div key={cat} style={{
                padding: '8px 20px',
                borderRadius: 100,
                border: '1px solid rgba(53,196,147,0.30)',
                background: 'rgba(53,196,147,0.07)',
                color: '#35C493',
                fontSize: 16,
                fontFamily: 'sans-serif',
                fontWeight: 500,
                display: 'flex',
              }}>
                {cat}
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    { ...size }
  )
}
