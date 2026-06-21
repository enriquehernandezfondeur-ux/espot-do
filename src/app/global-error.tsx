'use client'

import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'

// Captura errores que ocurren en el root layout (que los error.tsx normales no cubren).
export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <html lang="es">
      <body style={{ fontFamily: 'system-ui, sans-serif', display: 'flex', minHeight: '100dvh', alignItems: 'center', justifyContent: 'center', margin: 0, background: '#F4F6F5' }}>
        <div style={{ textAlign: 'center', padding: 24 }}>
          <p style={{ fontSize: 18, fontWeight: 700, color: 'var(--brand-navy)', margin: '0 0 8px' }}>Algo salió mal</p>
          <p style={{ fontSize: 14, color: '#6B7280', margin: '0 0 20px' }}>Ocurrió un error inesperado.</p>
          <a href="/" style={{ display: 'inline-block', background: 'var(--brand)', color: '#fff', fontWeight: 600, fontSize: 14, padding: '10px 20px', borderRadius: 10, textDecoration: 'none' }}>
            Ir al inicio
          </a>
        </div>
      </body>
    </html>
  )
}
