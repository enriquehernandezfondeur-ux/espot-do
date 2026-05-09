'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

function AccessForm() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const next         = searchParams.get('next') ?? '/'

  const [password, setPassword] = useState('')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await fetch('/api/acceso', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })

    if (res.ok) {
      router.push(next)
      router.refresh()
    } else {
      setError('Contraseña incorrecta')
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#060D09', padding: 24,
    }}>
      <div style={{
        width: '100%', maxWidth: 380,
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 24, padding: '40px 32px',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 14, marginBottom: 16,
            background: 'rgba(53,196,147,0.12)', border: '1px solid rgba(53,196,147,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px',
          }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#35C493" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <h1 style={{ color: '#fff', fontSize: 22, fontWeight: 700, margin: '0 0 6px', letterSpacing: '-0.03em' }}>
            espot.do
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13, margin: 0 }}>
            Vista previa privada
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Contraseña de acceso"
              autoFocus
              required
              style={{
                width: '100%', padding: '14px 16px', borderRadius: 14,
                background: 'rgba(255,255,255,0.06)', border: `1.5px solid ${error ? 'rgba(220,38,38,0.5)' : 'rgba(255,255,255,0.1)'}`,
                color: '#fff', fontSize: 16, outline: 'none', boxSizing: 'border-box',
                fontFamily: 'inherit',
              }}
            />
            {error && (
              <p style={{ color: '#F87171', fontSize: 12, margin: '8px 0 0', textAlign: 'center' }}>
                {error}
              </p>
            )}
          </div>
          <button
            type="submit"
            disabled={loading || !password}
            style={{
              width: '100%', padding: '14px 24px', borderRadius: 14,
              background: loading || !password ? 'rgba(53,196,147,0.4)' : '#35C493',
              color: '#060D09', fontWeight: 700, fontSize: 15,
              border: 'none', cursor: loading || !password ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit', transition: 'background 0.2s',
            }}>
            {loading ? 'Verificando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default function AccesoPage() {
  return (
    <Suspense>
      <AccessForm />
    </Suspense>
  )
}
