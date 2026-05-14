'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('[App Error]', error)
  }, [error])

  return (
    <div style={{
      minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg-base, #F4F6F5)', padding: 24,
    }}>
      <div style={{ textAlign: 'center', maxWidth: 420 }}>
        {/* Icono SVG inline — compatible con todos los entornos sin imports */}
        <div style={{
          width: 64, height: 64, borderRadius: 20, margin: '0 auto 20px',
          background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
            stroke="#DC2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0F1623', marginBottom: 8, letterSpacing: '-0.02em' }}>
          Algo salió mal
        </h1>
        <p style={{ color: '#6B7280', fontSize: 14, lineHeight: 1.6, marginBottom: 32 }}>
          Ocurrió un error inesperado. Puedes intentarlo de nuevo o volver al inicio.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={reset}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '12px 24px', borderRadius: 14, fontWeight: 700,
              fontSize: 14, background: '#D4FF58', color: '#03313C',
              border: 'none', cursor: 'pointer',
              boxShadow: '0 4px 20px rgba(212,255,88,0.35)',
            }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 4v6h-6"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
            </svg>
            Intentar de nuevo
          </button>
          <Link href="/"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '12px 24px', borderRadius: 14, fontWeight: 600,
              fontSize: 14, background: '#fff', color: '#374151',
              border: '1.5px solid #E2E8F0', textDecoration: 'none',
            }}>
            Ir al inicio
          </Link>
        </div>
        {error.digest && (
          <p style={{ marginTop: 20, fontSize: 11, color: '#CBD5E1' }}>
            Código: {error.digest}
          </p>
        )}
      </div>
    </div>
  )
}
