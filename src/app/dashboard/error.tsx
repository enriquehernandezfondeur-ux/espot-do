'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('[Dashboard Error]', error)
  }, [error])

  return (
    <div style={{
      minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#0B0F0E', padding: 24,
    }}>
      <div style={{ textAlign: 'center', maxWidth: 420 }}>
        <div style={{
          width: 64, height: 64, borderRadius: 20, margin: '0 auto 20px',
          background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.25)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
            stroke="var(--danger)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#F1F5F9', marginBottom: 8, letterSpacing: '-0.02em' }}>
          Algo salió mal
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, lineHeight: 1.6, marginBottom: 32 }}>
          Ocurrió un error inesperado. Intenta de nuevo o vuelve al inicio.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={reset}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '12px 24px', borderRadius: 14, fontWeight: 700,
              fontSize: 14, background: 'var(--brand)', color: '#060D09',
              border: 'none', cursor: 'pointer',
            }}>
            Intentar de nuevo
          </button>
          <Link href="/dashboard/overview"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '12px 24px', borderRadius: 14, fontWeight: 600,
              fontSize: 14, background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.7)',
              border: '1px solid rgba(255,255,255,0.1)', textDecoration: 'none',
            }}>
            Ir al inicio
          </Link>
        </div>
        {error.digest && (
          <p style={{ marginTop: 20, fontSize: 11, color: 'rgba(255,255,255,0.2)' }}>
            Código: {error.digest}
          </p>
        )}
      </div>
    </div>
  )
}
