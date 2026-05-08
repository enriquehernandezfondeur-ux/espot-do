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
        <div style={{
          width: 64, height: 64, borderRadius: 20, margin: '0 auto 20px',
          background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28,
        }}>
          ⚠️
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
              fontSize: 14, background: '#35C493', color: '#060D09',
              border: 'none', cursor: 'pointer',
              boxShadow: '0 4px 20px rgba(53,196,147,0.3)',
            }}>
            🔄 Intentar de nuevo
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
