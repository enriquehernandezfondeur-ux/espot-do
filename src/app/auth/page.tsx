'use client'

import { useState, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Building2, Eye, EyeOff, ArrowLeft, Mail, CheckCircle2 } from 'lucide-react'

// ── Íconos SVG de proveedores ─────────────────────────────
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
      <path d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.96L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  )
}

function AppleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor">
      <path d="M14.05 9.558c-.016-1.91 1.561-2.833 1.632-2.878-1.082-1.362-2.616-1.408-2.94-1.43C11.547 5.1 10.4 5.98 9.8 5.98c-.613 0-1.574-.952-2.584-.927-1.312.02-2.54.779-3.216 1.97-1.38 2.387-.353 5.908.977 7.843.659.948 1.442 2.009 2.468 1.97 1.008-.04 1.38-.633 2.59-.633 1.21 0 1.554.633 2.602.612 1.07-.02 1.744-.958 2.394-1.91.761-1.092 1.073-2.158 1.087-2.212-.024-.01-2.072-.793-2.092-3.135zM11.94 3.527C12.474 2.882 12.83 2 12.602 1.1c-.773.032-1.71.517-2.265 1.15-.497.561-.93 1.46-.769 2.32.844.065 1.706-.427 2.371-1.043z"/>
    </svg>
  )
}

// ── View types ────────────────────────────────────────────
type Screen = 'login' | 'register' | 'forgot' | 'forgot_sent'

function AuthContent() {
  const searchParams = useSearchParams()
  const raw        = searchParams.get('redirect') ?? ''
  const redirectTo = raw.startsWith('/') && !raw.startsWith('//') ? raw : '/dashboard'
  const isHost     = redirectTo.includes('host') || searchParams.get('mode') === 'host'
  const defaultScreen: Screen = searchParams.get('mode') === 'register' ? 'register' : 'login'

  const [screen,   setScreen]   = useState<Screen>(defaultScreen)
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [phone,    setPhone]    = useState('')
  const [showPwd,  setShowPwd]  = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [oauthLoading, setOauthLoading] = useState<'google' | 'apple' | null>(null)
  const [error,    setError]    = useState('')
  const router   = useRouter()
  const supabase = createClient()

  function reset() { setError(''); setEmail(''); setPassword('') }

  // ── OAuth ───────────────────────────────────────────────
  async function handleOAuth(provider: 'google' | 'apple') {
    setOauthLoading(provider)
    setError('')
    const origin = window.location.origin
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(redirectTo)}`,
        queryParams: provider === 'google' ? { access_type: 'offline', prompt: 'consent' } : undefined,
      },
    })
    if (error) { setError(error.message); setOauthLoading(null) }
    // No clearLoading on success — browser navigates away
  }

  // ── Email / Password ────────────────────────────────────
  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('Email o contraseña incorrectos.')
    } else {
      router.push(redirectTo)
    }
    setLoading(false)
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { data: { full_name: fullName, phone, role: isHost ? 'host' : 'guest' } },
    })
    if (error) {
      setError(error.message)
    } else {
      setScreen('forgot_sent') // reuse "sent" state for register confirm
    }
    setLoading(false)
  }

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    const origin = window.location.origin
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/auth/reset`,
    })
    if (error) {
      setError(error.message)
    } else {
      setScreen('forgot_sent')
    }
    setLoading(false)
  }

  // ── Shared styles ────────────────────────────────────────
  const inputStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.12)',
    color: '#fff',
    borderRadius: 12,
    width: '100%',
    padding: '12px 16px',
    fontSize: 14,
    outline: 'none',
    transition: 'border-color 0.15s',
  }
  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 13,
    fontWeight: 500,
    marginBottom: 6,
    color: 'rgba(255,255,255,0.6)',
  }

  // ── "Email sent" / "Confirm your account" screen ────────
  if (screen === 'forgot_sent') {
    const isRegister = !email.includes('@') || password.length > 0
    return (
      <AuthShell isHost={isHost} redirectTo={redirectTo}>
        <div className="text-center py-4">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
            style={{ background: 'rgba(53,196,147,0.12)', border: '1px solid rgba(53,196,147,0.2)' }}>
            <CheckCircle2 size={32} style={{ color: '#35C493' }} />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">
            {password ? 'Revisa tu email' : 'Enlace enviado'}
          </h2>
          <p className="text-sm mb-6" style={{ color: 'rgba(255,255,255,0.5)', lineHeight: 1.6 }}>
            {password
              ? <>Te enviamos un email a <strong className="text-white">{email}</strong> para confirmar tu cuenta.</>
              : <>Te enviamos un enlace a <strong className="text-white">{email}</strong> para restablecer tu contraseña.</>
            }
          </p>
          <button onClick={() => { setScreen('login'); reset() }}
            className="w-full py-3 rounded-xl text-sm font-semibold"
            style={{ background: '#35C493', color: '#0B0F0E' }}>
            Volver al inicio de sesión
          </button>
        </div>
      </AuthShell>
    )
  }

  // ── Forgot password screen ───────────────────────────────
  if (screen === 'forgot') {
    return (
      <AuthShell isHost={isHost} redirectTo={redirectTo}>
        <button onClick={() => { setScreen('login'); reset() }}
          className="flex items-center gap-1.5 text-sm mb-5"
          style={{ color: 'rgba(255,255,255,0.4)' }}>
          <ArrowLeft size={14} /> Volver
        </button>

        <h2 className="text-xl font-bold text-white mb-1">Olvidé mi contraseña</h2>
        <p className="text-sm mb-6" style={{ color: 'rgba(255,255,255,0.45)', lineHeight: 1.6 }}>
          Escribe tu email y te enviaremos un enlace para restablecer tu contraseña.
        </p>

        {error && <ErrorBox msg={error} />}

        <form onSubmit={handleForgot} className="space-y-4">
          <div>
            <label style={labelStyle}>Correo electrónico</label>
            <div className="relative">
              <Mail size={15} className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
                style={{ color: 'rgba(255,255,255,0.3)' }} />
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="tu@email.com" required
                style={{ ...inputStyle, paddingLeft: 40 }} />
            </div>
          </div>
          <button type="submit" disabled={loading}
            className="w-full font-bold py-3.5 rounded-xl text-sm transition-all disabled:opacity-50"
            style={{ background: '#35C493', color: '#0B0F0E', boxShadow: '0 4px 20px rgba(53,196,147,0.25)' }}>
            {loading ? 'Enviando...' : 'Enviar enlace de recuperación'}
          </button>
        </form>
      </AuthShell>
    )
  }

  // ── Main login / register ────────────────────────────────
  return (
    <AuthShell isHost={isHost} redirectTo={redirectTo}>

      {/* Tabs */}
      <div className="flex p-1 rounded-xl mb-6"
        style={{ background: 'rgba(255,255,255,0.05)' }}>
        {(['login', 'register'] as const).map(s => (
          <button key={s}
            onClick={() => { setScreen(s); reset() }}
            className="flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all"
            style={screen === s
              ? { background: '#35C493', color: '#0B0F0E' }
              : { color: 'rgba(255,255,255,0.45)' }}>
            {s === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
          </button>
        ))}
      </div>

      {/* Social buttons */}
      <div className="space-y-3 mb-6">
        <SocialButton
          icon={<GoogleIcon />}
          label="Continuar con Google"
          loading={oauthLoading === 'google'}
          onClick={() => handleOAuth('google')}
        />
        <SocialButton
          icon={<AppleIcon />}
          label="Continuar con Apple"
          loading={oauthLoading === 'apple'}
          onClick={() => handleOAuth('apple')}
          dark
        />
      </div>

      {/* Divider */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
        <span className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.3)' }}>
          o continúa con tu email
        </span>
        <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
      </div>

      {error && <ErrorBox msg={error} />}

      {/* Form */}
      <form onSubmit={screen === 'login' ? handleLogin : handleRegister} className="space-y-4">
        {screen === 'register' && (
          <>
            <div>
              <label style={labelStyle}>Nombre completo</label>
              <input type="text" value={fullName} onChange={e => setFullName(e.target.value)}
                placeholder="María González" required style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Teléfono / WhatsApp</label>
              <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                placeholder="+1 (809) 000-0000" style={inputStyle} />
            </div>
          </>
        )}

        <div>
          <label style={labelStyle}>Correo electrónico</label>
          <div className="relative">
            <Mail size={15} className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
              style={{ color: 'rgba(255,255,255,0.3)' }} />
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="tu@email.com" required
              style={{ ...inputStyle, paddingLeft: 40 }} />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label style={labelStyle}>Contraseña</label>
            {screen === 'login' && (
              <button type="button" onClick={() => setScreen('forgot')}
                className="text-xs font-medium transition-colors"
                style={{ color: '#35C493' }}>
                ¿Olvidaste tu contraseña?
              </button>
            )}
          </div>
          <div className="relative">
            <input
              type={showPwd ? 'text' : 'password'}
              value={password} onChange={e => setPassword(e.target.value)}
              placeholder={screen === 'register' ? 'Mínimo 8 caracteres' : '········'}
              required minLength={8}
              style={{ ...inputStyle, paddingRight: 44 }} />
            <button type="button" onClick={() => setShowPwd(v => !v)}
              className="absolute right-4 top-1/2 -translate-y-1/2"
              style={{ color: 'rgba(255,255,255,0.3)' }}>
              {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <button type="submit" disabled={loading || !!oauthLoading}
          className="w-full font-bold py-3.5 rounded-xl text-sm transition-all mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ background: '#35C493', color: '#0B0F0E', boxShadow: '0 4px 20px rgba(53,196,147,0.25)' }}>
          {loading ? 'Cargando...' : screen === 'login'
            ? (isHost ? 'Entrar al panel de propietario' : 'Iniciar sesión')
            : (isHost ? 'Crear cuenta y publicar mi espacio' : 'Crear mi cuenta')}
        </button>
      </form>

      {screen === 'register' && (
        <p className="text-xs text-center mt-4" style={{ color: 'rgba(255,255,255,0.25)' }}>
          Al registrarte aceptas los{' '}
          <Link href="/terminos" style={{ color: 'rgba(255,255,255,0.45)', textDecoration: 'underline' }}>
            términos de uso
          </Link>{' '}de espot.do
        </p>
      )}
    </AuthShell>
  )
}

// ── Shared shell ───────────────────────────────────────────
function AuthShell({ children, isHost, redirectTo }: {
  children: React.ReactNode
  isHost: boolean
  redirectTo: string
}) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'linear-gradient(145deg, #071410 0%, #0B0F0E 60%, #0a0d12 100%)' }}>

      {/* Background glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div style={{
          position: 'absolute', top: '-20%', left: '50%', transform: 'translateX(-50%)',
          width: 600, height: 600, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(53,196,147,0.07) 0%, transparent 70%)',
        }} />
      </div>

      <div className="w-full max-w-[400px] relative">

        {/* Logo + badge */}
        <div className="flex flex-col items-center gap-3 mb-8">
          <Link href="/" className="inline-flex">
            <img src="/logo-green.svg" alt="espot.do" style={{ height: 32, width: 'auto' }} />
          </Link>
          {isHost ? (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
              style={{ background: 'rgba(53,196,147,0.1)', color: '#6EE7C7', border: '1px solid rgba(53,196,147,0.18)' }}>
              <Building2 size={11} /> Para propietarios de espacios
            </div>
          ) : (
            <p className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.35)' }}>
              Espacios a tu alcance
            </p>
          )}
        </div>

        {/* Card */}
        <div className="rounded-2xl p-7"
          style={{
            background: 'rgba(255,255,255,0.035)',
            border: '1px solid rgba(255,255,255,0.08)',
            backdropFilter: 'blur(24px)',
            boxShadow: '0 24px 64px rgba(0,0,0,0.4)',
          }}>
          {children}
        </div>

        {/* Footer links */}
        <p className="text-center text-xs mt-5" style={{ color: 'rgba(255,255,255,0.2)' }}>
          <Link href="/terminos" style={{ color: 'rgba(255,255,255,0.3)' }}>Términos</Link>
          {' · '}
          <Link href="/cookies" style={{ color: 'rgba(255,255,255,0.3)' }}>Privacidad</Link>
          {' · '}
          <a href="mailto:contacto@espot.do" style={{ color: 'rgba(255,255,255,0.3)' }}>Soporte</a>
        </p>
      </div>
    </div>
  )
}

// ── Social button ─────────────────────────────────────────
function SocialButton({ icon, label, loading, onClick, dark }: {
  icon: React.ReactNode
  label: string
  loading: boolean
  onClick: () => void
  dark?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="w-full flex items-center justify-center gap-3 py-3 rounded-xl text-sm font-semibold transition-all disabled:opacity-60 disabled:cursor-not-allowed"
      style={dark
        ? { background: '#fff', color: '#0B0F0E', border: '1px solid rgba(255,255,255,0.9)' }
        : { background: 'rgba(255,255,255,0.06)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }
      }
      onMouseEnter={e => {
        if (!loading) (e.currentTarget as HTMLElement).style.opacity = '0.85'
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.opacity = '1'
      }}>
      {loading
        ? <div className="w-[18px] h-[18px] rounded-full border-2 border-t-transparent animate-spin"
            style={{ borderColor: dark ? '#0B0F0E' : 'rgba(255,255,255,0.4)', borderTopColor: 'transparent' }} />
        : icon
      }
      {label}
    </button>
  )
}

// ── Error box ─────────────────────────────────────────────
function ErrorBox({ msg }: { msg: string }) {
  return (
    <div className="text-sm px-4 py-3 rounded-xl mb-4"
      style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}>
      {msg}
    </div>
  )
}

export default function AuthPage() {
  return <Suspense fallback={null}><AuthContent /></Suspense>
}
