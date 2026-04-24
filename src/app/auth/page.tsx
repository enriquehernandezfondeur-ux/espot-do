'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function AuthPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
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
      router.push('/dashboard')
    }
    setLoading(false)
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, phone, role: 'host' }
      }
    })

    if (error) {
      setError(error.message)
    } else {
      setSuccess('Revisa tu email para confirmar tu cuenta.')
    }
    setLoading(false)
  }

  return (
    <div className="dark-theme min-h-screen bg-gradient-to-br from-[#0B1A16] via-[#0B0F0E] to-[#0B0F0E] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-2">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#35C493', boxShadow: '0 0 16px rgba(53,196,147,0.3)' }}>
              <span className="font-bold text-lg" style={{ color: '#0B0F0E' }}>E</span>
            </div>
            <span className="text-white text-2xl font-bold tracking-tight">espot</span>
            <span className="text-[#35C493] text-2xl font-light">.do</span>
          </div>
          <p className="text-slate-400 text-sm">Panel de Propietarios</p>
        </div>

        {/* Card */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8">
          {/* Tabs */}
          <div className="flex bg-white/5 rounded-xl p-1 mb-6">
            <button
              onClick={() => { setMode('login'); setError(''); setSuccess('') }}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                mode === 'login'
                  ? 'bg-[#35C493] text-[#0B0F0E] shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Iniciar sesión
            </button>
            <button
              onClick={() => { setMode('register'); setError(''); setSuccess('') }}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                mode === 'register'
                  ? 'bg-[#35C493] text-[#0B0F0E] shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Registrarme
            </button>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg px-4 py-3 text-sm mb-4">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-500/10 border border-green-500/20 text-green-400 rounded-lg px-4 py-3 text-sm mb-4">
              {success}
            </div>
          )}

          <form onSubmit={mode === 'login' ? handleLogin : handleRegister} className="space-y-4">
            {mode === 'register' && (
              <>
                <div>
                  <label className="block text-slate-300 text-sm font-medium mb-1.5">
                    Nombre completo
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    placeholder="Ej: María González"
                    required
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-[#35C493] transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 text-sm font-medium mb-1.5">
                    Teléfono / WhatsApp
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="+1 (809) 000-0000"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-[#35C493] transition-colors"
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-slate-300 text-sm font-medium mb-1.5">
                Correo electrónico
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="tu@email.com"
                required
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-[#35C493] transition-colors"
              />
            </div>

            <div>
              <label className="block text-slate-300 text-sm font-medium mb-1.5">
                Contraseña
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Mínimo 8 caracteres"
                required
                minLength={8}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-[#35C493] transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r [#35C493] hover:bg-[#4DD9A7] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-xl transition-all shadow-lg shadow-[rgba(53,196,147,0.25)] mt-2"
            >
              {loading
                ? 'Cargando...'
                : mode === 'login'
                  ? 'Entrar al panel'
                  : 'Crear mi cuenta'
              }
            </button>
          </form>

          {mode === 'register' && (
            <p className="text-slate-500 text-xs text-center mt-4">
              Al registrarte aceptas los términos de uso de espot.do
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
