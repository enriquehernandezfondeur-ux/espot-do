import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt     = 'espot.do — Espacios para eventos en República Dominicana'
export const size    = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%', height: '100%',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          background: 'var(--brand-navy)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Glow verde */}
        <div style={{
          position: 'absolute', bottom: -100, left: '50%',
          transform: 'translateX(-50%)',
          width: 800, height: 400,
          background: 'radial-gradient(ellipse, rgba(53,196,147,0.18) 0%, transparent 70%)',
        }} />

        {/* Logo wordmark */}
        <div style={{
          display: 'flex', alignItems: 'baseline', gap: 0,
          fontSize: 96, fontWeight: 900, letterSpacing: '-0.05em',
          lineHeight: 1,
        }}>
          <span style={{ color: 'var(--brand)' }}>espot</span>
          <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 72 }}>.do</span>
        </div>

        {/* Tagline */}
        <p style={{
          color: 'rgba(255,255,255,0.45)',
          fontSize: 28, marginTop: 20,
          letterSpacing: '-0.02em',
          fontWeight: 400,
        }}>
          Espacios para eventos en República Dominicana
        </p>

        {/* Chips */}
        <div style={{ display: 'flex', gap: 12, marginTop: 36 }}>
          {['Salones', 'Rooftops', 'Villas', 'Restaurantes', 'Jardines'].map(label => (
            <div key={label} style={{
              background: 'rgba(53,196,147,0.1)',
              border: '1px solid rgba(53,196,147,0.25)',
              borderRadius: 100, paddingLeft: 18, paddingRight: 18,
              paddingTop: 8, paddingBottom: 8,
              color: 'var(--brand)', fontSize: 18, fontWeight: 600,
            }}>
              {label}
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size }
  )
}
