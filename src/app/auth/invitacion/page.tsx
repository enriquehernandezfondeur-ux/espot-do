'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { acceptTeamInvite } from '@/lib/actions/host'
import { Users, Loader2, Check, AlertTriangle, ArrowRight } from 'lucide-react'
import Image from 'next/image'

const ROLE_LABELS: Record<string, string> = {
  admin:       'Administrador',
  coordinador: 'Coordinador',
  viewer:      'Visualizador',
}

function InviteContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get('token') ?? ''

  const supabase = createClient()

  const [step,      setStep]      = useState<'loading' | 'login' | 'accept' | 'done' | 'error'>('loading')
  const [hostName,  setHostName]  = useState('')
  const [role,      setRole]      = useState('')
  const [email,     setEmail]     = useState('')
  const [password,  setPassword]  = useState('')
  const [authError, setAuthError] = useState('')
  const [saving,    setSaving]    = useState(false)
  const [isSignup,  setIsSignup]  = useState(false)

  useEffect(() => {
    if (!token) { setStep('error'); return }

    // Check if invite exists
    supabase.from('host_team_members')
      .select('host_id, role, invite_email, status, host:profiles!host_id(full_name)')
      .eq('invite_token', token)
      .eq('status', 'pending')
      .maybeSingle()
      .then(({ data }) => {
        if (!data) { setStep('error'); return }
        setRole(data.role ?? '')
        setEmail(data.invite_email ?? '')
        setHostName((data.host as any)?.full_name ?? 'El propietario')

        // Check if user is already logged in
        supabase.auth.getUser().then(({ data: { user } }) => {
          if (user) {
            setStep('accept')
          } else {
            setStep('login')
          }
        })
      })
  }, [token])

  async function handleAuth(e: React.FormEvent) {
    e.preventDefault()
    setAuthError('')
    setSaving(true)

    let authResult
    if (isSignup) {
      authResult = await supabase.auth.signUp({ email, password })
    } else {
      authResult = await supabase.auth.signInWithPassword({ email, password })
    }

    if (authResult.error) {
      setAuthError(authResult.error.message)
      setSaving(false)
      return
    }

    setStep('accept')
    setSaving(false)
  }

  async function handleAccept() {
    setSaving(true)
    const r = await acceptTeamInvite(token)
    if ('error' in r) {
      setAuthError(r.error ?? 'Error al aceptar la invitación')
      setSaving(false)
      return
    }
    setStep('done')
    setTimeout(() => router.push('/dashboard/host'), 2000)
    setSaving(false)
  }

  if (step === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-dvh">
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--brand)' }} />
      </div>
    )
  }

  if (step === 'error') {
    return (
      <div className="flex items-center justify-center min-h-dvh p-6">
        <div className="max-w-sm w-full text-center">
          <AlertTriangle size={32} className="mx-auto mb-4 text-red-400" />
          <h1 className="text-xl font-bold mb-2">Invitación no válida</h1>
          <p className="text-sm text-gray-500 mb-6">Este link de invitación ya fue usado, expiró, o no existe.</p>
          <a href="/dashboard/host" className="text-sm font-semibold" style={{ color: 'var(--brand)' }}>
            Ir al panel →
          </a>
        </div>
      </div>
    )
  }

  if (step === 'done') {
    return (
      <div className="flex items-center justify-center min-h-dvh p-6">
        <div className="max-w-sm w-full text-center">
          <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ background: 'rgba(53,196,147,0.1)' }}>
            <Check size={24} style={{ color: 'var(--brand)' }} />
          </div>
          <h1 className="text-xl font-bold mb-2">¡Bienvenido al equipo!</h1>
          <p className="text-sm text-gray-500">Te estamos redirigiendo al panel...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-dvh flex items-center justify-center p-6" style={{ background: '#F7F8FA' }}>
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <img src="/logo-dark.svg" alt="Espot" className="h-7 mx-auto mb-6" />
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3"
            style={{ background: 'rgba(53,196,147,0.1)' }}>
            <Users size={20} style={{ color: 'var(--brand)' }} />
          </div>
          <h1 className="text-xl font-bold" style={{ color: '#0F1623' }}>
            {step === 'accept' ? '¡Te invitaron al equipo!' : 'Inicia sesión para continuar'}
          </h1>
          <p className="text-sm mt-2" style={{ color: '#6B7280' }}>
            <strong>{hostName}</strong> te invitó como <strong>{ROLE_LABELS[role] ?? role}</strong>
          </p>
        </div>

        <div className="rounded-2xl overflow-hidden"
          style={{ background: '#fff', border: '1px solid #E8ECF0', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>

          {step === 'login' && (
            <div className="p-6">
              <div className="flex gap-3 mb-5 p-1 rounded-xl" style={{ background: '#F4F6F8' }}>
                <button onClick={() => setIsSignup(false)}
                  className="flex-1 py-2 rounded-lg text-sm font-semibold transition-all"
                  style={!isSignup ? { background: '#fff', color: '#0F1623', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' } : { color: '#9CA3AF' }}>
                  Tengo cuenta
                </button>
                <button onClick={() => setIsSignup(true)}
                  className="flex-1 py-2 rounded-lg text-sm font-semibold transition-all"
                  style={isSignup ? { background: '#fff', color: '#0F1623', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' } : { color: '#9CA3AF' }}>
                  Registrarme
                </button>
              </div>

              <form onSubmit={handleAuth} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Email</label>
                  <input type="email" required value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border text-sm focus:outline-none"
                    style={{ border: '1.5px solid #E8ECF0', fontSize: 16 }} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Contraseña</label>
                  <input type="password" required value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full px-4 py-2.5 rounded-xl border text-sm focus:outline-none"
                    style={{ border: '1.5px solid #E8ECF0', fontSize: 16 }} />
                </div>
                {authError && (
                  <p className="text-xs text-red-500 text-center">{authError}</p>
                )}
                <button type="submit" disabled={saving}
                  className="w-full py-3 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50"
                  style={{ background: 'var(--brand)' }}>
                  {saving ? <Loader2 size={14} className="animate-spin mx-auto" /> : isSignup ? 'Crear cuenta y continuar' : 'Continuar →'}
                </button>
              </form>
            </div>
          )}

          {step === 'accept' && (
            <div className="p-6 space-y-4">
              <div className="rounded-xl p-4 space-y-2" style={{ background: '#F8FAFB', border: '1px solid #E8ECF0' }}>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Propietario</span>
                  <span className="font-semibold" style={{ color: '#0F1623' }}>{hostName}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Tu rol</span>
                  <span className="font-semibold" style={{ color: 'var(--brand)' }}>{ROLE_LABELS[role] ?? role}</span>
                </div>
              </div>

              {authError && <p className="text-xs text-red-500 text-center">{authError}</p>}

              <button onClick={handleAccept} disabled={saving}
                className="w-full py-3 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                style={{ background: 'var(--brand)' }}>
                {saving
                  ? <Loader2 size={14} className="animate-spin" />
                  : <><Check size={14} /> Aceptar invitación</>}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function InvitacionPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-dvh">
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--brand)' }} />
      </div>
    }>
      <InviteContent />
    </Suspense>
  )
}
