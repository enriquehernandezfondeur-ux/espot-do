'use client'

import { useState, useEffect, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff, CheckCircle2 } from 'lucide-react'

function ResetContent() {
  const [password,  setPassword]  = useState('')
  const [confirm,   setConfirm]   = useState('')
  const [showPwd,   setShowPwd]   = useState(false)
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState('')
  const [success,   setSuccess]   = useState(false)
  const [ready,     setReady]     = useState(false)
  const router  = useRouter()
  const supabase = createClient()

  // Supabase envía el token en el hash — detectar sesión activa
  useEffect(() => {
    supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setReady(true)
    })
  }, [])

  async function handleReset(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) { setError('Las contraseñas no coinciden.'); return }
    setLoading(true); setError('')
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      setError(error.message)
    } else {
      setSuccess(true)
      setTimeout(() => router.push('/dashboard'), 2500)
    }
    setLoading(false)
  }

  const inputStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.12)',
    color: '#fff',
    borderRadius: 12,
    width: '100%',
    padding: '12px 44px 12px 16px',
    fontSize: 14,
    outline: 'none',
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'linear-gradient(145deg, #071410 0%, #0B0F0E 60%, #0a0d12 100%)' }}>

      <div className="w-full max-w-[400px]">
        <div className="flex flex-col items-center gap-3 mb-8">
          <Link href="/">
            <img src="/logo-green.svg" alt="espot.do" style={{ height: 32, width: 'auto' }} />
          </Link>
        </div>

        <div className="rounded-2xl p-7"
          style={{ background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(24px)', boxShadow: '0 24px 64px rgba(0,0,0,0.4)' }}>

          {success ? (
            <div className="text-center py-4">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
                style={{ background: 'rgba(53,196,147,0.12)', border: '1px solid rgba(53,196,147,0.2)' }}>
                <CheckCircle2 size={32} style={{ color: '#35C493' }} />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">¡Contraseña actualizada!</h2>
              <p className="text-sm" style={{ color: 'rgba(255,255,255,0.45)' }}>
                Redirigiendo a tu panel...
              </p>
            </div>
          ) : !ready ? (
            <div className="text-center py-6">
              <div className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin mx-auto mb-4"
                style={{ borderColor: 'rgba(53,196,147,0.4)', borderTopColor: 'transparent' }} />
              <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>Verificando enlace...</p>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-bold text-white mb-1">Nueva contraseña</h2>
              <p className="text-sm mb-6" style={{ color: 'rgba(255,255,255,0.4)' }}>
                Elige una contraseña segura de al menos 8 caracteres.
              </p>

              {error && (
                <div className="text-sm px-4 py-3 rounded-xl mb-4"
                  style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}>
                  {error}
                </div>
              )}

              <form onSubmit={handleReset} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>
                    Nueva contraseña
                  </label>
                  <div className="relative">
                    <input type={showPwd ? 'text' : 'password'} value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="Mínimo 8 caracteres" required minLength={8}
                      style={inputStyle} />
                    <button type="button" onClick={() => setShowPwd(v => !v)}
                      className="absolute right-4 top-1/2 -translate-y-1/2"
                      style={{ color: 'rgba(255,255,255,0.3)' }}>
                      {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>
                    Confirmar contraseña
                  </label>
                  <div className="relative">
                    <input type={showPwd ? 'text' : 'password'} value={confirm}
                      onChange={e => setConfirm(e.target.value)}
                      placeholder="Repite la contraseña" required minLength={8}
                      style={inputStyle} />
                  </div>
                </div>
                <button type="submit" disabled={loading}
                  className="w-full font-bold py-3.5 rounded-xl text-sm transition-all disabled:opacity-50"
                  style={{ background: '#35C493', color: '#0B0F0E', boxShadow: '0 4px 20px rgba(53,196,147,0.25)' }}>
                  {loading ? 'Actualizando...' : 'Actualizar contraseña'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default function ResetPage() {
  return <Suspense fallback={null}><ResetContent /></Suspense>
}
