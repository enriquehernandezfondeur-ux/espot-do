'use client'

import { useState, useEffect, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Building2, User } from 'lucide-react'

function AuthContent() {
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirect') ?? '/dashboard'
  const defaultMode = searchParams.get('mode') === 'register' ? 'register' : 'login'
  const isHost = redirectTo.includes('host') || searchParams.get('mode') === 'host'

  const [mode, setMode] = useState<'login' | 'register'>(defaultMode)
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [phone,    setPhone]    = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')
  const [success,  setSuccess]  = useState('')
  const router = useRouter()
  const supabase = createClient()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('Credenciales incorrectas. Verifica tu email y contraseña.')
    } else {
      router.push(redirectTo)
    }
    setLoading(false)
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { data: { full_name: fullName, phone, role: isHost ? 'host' : 'guest' } }
    })
    if (error) {
      setError(error.message)
    } else {
      setSuccess(isHost
        ? 'Cuenta creada. Revisa tu email para confirmar y luego entra al panel de propietarios.'
        : 'Cuenta creada. Revisa tu email para confirmar tu cuenta.')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'linear-gradient(135deg, #0B1A16 0%, #0B0F0E 100%)' }}>
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-3">
            <img src="/logo-green.svg" alt="espot.do" style={{ height: 32, width: 'auto' }} />
          </Link>

          {/* Contexto: cliente vs propietario */}
          {isHost ? (
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mt-2 text-sm font-medium"
              style={{ background: 'rgba(53,196,147,0.12)', color: '#6EE7C7', border: '1px solid rgba(53,196,147,0.2)' }}>
              <Building2 size={14} /> Para propietarios de espacios
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mt-2 text-sm font-medium"
              style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <User size={14} /> Acceso a tu cuenta
            </div>
          )}
        </div>

        {/* Card */}
        <div className="rounded-2xl p-8"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(16px)' }}>

          {/* Tabs */}
          <div className="flex p-1 rounded-xl mb-6"
            style={{ background: 'rgba(255,255,255,0.05)' }}>
            {(['login', 'register'] as const).map(m => (
              <button key={m}
                onClick={() => { setMode(m); setError(''); setSuccess('') }}
                className="flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all"
                style={mode === m
                  ? { background: '#35C493', color: '#0B0F0E' }
                  : { color: 'rgba(255,255,255,0.5)' }}>
                {m === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
              </button>
            ))}
          </div>

          {error && (
            <div className="text-sm px-4 py-3 rounded-xl mb-4"
              style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}>
              {error}
            </div>
          )}
          {success && (
            <div className="text-sm px-4 py-3 rounded-xl mb-4"
              style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', color: '#4ade80' }}>
              {success}
              {isHost && (
                <div className="mt-2">
                  <Link href="/dashboard/host"
                    className="text-sm font-semibold underline"
                    style={{ color: '#35C493' }}>
                    Ir al panel de propietario →
                  </Link>
                </div>
              )}
            </div>
          )}

          <form onSubmit={mode === 'login' ? handleLogin : handleRegister} className="space-y-4">
            {mode === 'register' && (
              <>
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: 'rgba(255,255,255,0.7)' }}>
                    Nombre completo
                  </label>
                  <input type="text" value={fullName} onChange={e => setFullName(e.target.value)}
                    placeholder="Ej: María González" required
                    className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none transition-colors"
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff' }} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: 'rgba(255,255,255,0.7)' }}>
                    Teléfono / WhatsApp
                  </label>
                  <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                    placeholder="+1 (809) 000-0000"
                    className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none transition-colors"
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff' }} />
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'rgba(255,255,255,0.7)' }}>
                Correo electrónico
              </label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="tu@email.com" required
                className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none transition-colors"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff' }} />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'rgba(255,255,255,0.7)' }}>
                Contraseña
              </label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="Mínimo 8 caracteres" required minLength={8}
                className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none transition-colors"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff' }} />
            </div>

            <button type="submit" disabled={loading}
              className="w-full font-bold py-3.5 rounded-xl text-sm transition-all mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: '#35C493', color: '#0B0F0E', boxShadow: '0 4px 20px rgba(53,196,147,0.3)' }}>
              {loading ? 'Cargando...' : mode === 'login'
                ? (isHost ? 'Entrar al panel de propietario' : 'Iniciar sesión')
                : (isHost ? 'Crear cuenta y publicar mi espacio' : 'Crear mi cuenta')}
            </button>
          </form>

          {mode === 'register' && (
            <p className="text-xs text-center mt-4" style={{ color: 'rgba(255,255,255,0.3)' }}>
              Al registrarte aceptas los{' '}
              <Link href="/terminos" className="underline" style={{ color: 'rgba(255,255,255,0.5)' }}>términos de uso</Link>
              {' '}de espot.do
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

export default function AuthPage() {
  return <Suspense fallback={null}><AuthContent /></Suspense>
}
