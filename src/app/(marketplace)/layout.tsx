'use client'

import Link from 'next/link'
import { Search, Menu, X, User } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function MarketplaceLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter()
  const pathname = usePathname()
  const [menuOpen,  setMenuOpen]  = useState(false)
  const [searchQ,   setSearchQ]   = useState('')
  const [user,      setUser]      = useState<{ email: string; role?: string; avatarUrl?: string } | null>(null)
  const [authReady, setAuthReady] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)

  // Cerrar menú móvil al cambiar de ruta
  useEffect(() => { setMenuOpen(false) }, [pathname])

  // Verificar sesión del usuario
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user: u } }) => {
      if (u) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role, avatar_url')
          .eq('id', u.id)
          .single()
        setUser({ email: u.email ?? '', role: profile?.role, avatarUrl: profile?.avatar_url ?? undefined })
      }
      setAuthReady(true)
    })
  }, [])

  function handleSearch(q: string) {
    if (!q.trim()) return
    router.push(`/buscar?q=${encodeURIComponent(q.trim())}`)
    setSearchQ('')
  }

  const dashboardHref = user?.role === 'host'  ? '/dashboard/host'
                      : user?.role === 'admin' ? '/admin'
                      : '/dashboard'

  return (
    <div className="light-theme min-h-screen" style={{ background: 'var(--bg-base)', color: 'var(--text-primary)' }}>

      {/* ── NAVBAR ── */}
      <nav className="sticky top-0 z-50" style={{
        background:    'rgba(255,255,255,0.92)',
        backdropFilter:'blur(16px)',
        borderBottom:  '1px solid var(--border-subtle)',
        boxShadow:     '0 1px 0 var(--border-subtle)',
      }}>
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-6">

          {/* Logo */}
          <Link href="/" className="shrink-0">
            <img src="/logo-dark.svg" alt="espot.do" style={{ height: 30, width: "auto" }} />
          </Link>

          {/* Search */}
          <div className="hidden md:flex items-center gap-2 flex-1 max-w-sm rounded-full px-4 py-2.5"
            style={{ background: 'var(--bg-elevated)', border: '1.5px solid var(--border-medium)' }}>
            <Search size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
            <input
              ref={searchRef}
              value={searchQ}
              onChange={e => setSearchQ(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSearch(searchQ) }}
              placeholder="Buscar espacios..."
              className="flex-1 bg-transparent text-sm focus:outline-none"
              style={{ color: 'var(--text-primary)' }}
            />
          </div>

          {/* Actions */}
          <div className="hidden md:flex items-center gap-3 shrink-0">
            <Link href="/buscar" className="link-muted text-sm font-medium px-3 py-2 rounded-lg">
              Explorar
            </Link>

            {!authReady ? (
              // Placeholder mientras carga auth (evita layout shift)
              <div className="w-24 h-8 rounded-lg animate-pulse" style={{ background: 'var(--bg-elevated)' }} />
            ) : user ? (
              <Link href={dashboardHref}
                className="flex items-center gap-2 text-sm font-medium px-3 py-2 rounded-lg transition-colors"
                style={{ color: 'var(--text-secondary)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-elevated)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                {user.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={user.avatarUrl} alt=""
                    className="w-7 h-7 rounded-full object-cover shrink-0"
                    style={{ border: '2px solid var(--brand)' }} />
                ) : (
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                    style={{ background: 'var(--brand)' }}>
                    {user.email.charAt(0).toUpperCase()}
                  </div>
                )}
                Mi panel
              </Link>
            ) : (
              <Link href="/auth" className="link-muted text-sm font-medium px-3 py-2 rounded-lg">
                Iniciar sesión
              </Link>
            )}

            <Link href="/auth?mode=register&redirect=/dashboard/host" className="btn-brand text-sm font-semibold px-5 py-2.5 rounded-full">
              Publicar espacio
            </Link>
          </div>

          {/* Mobile toggle */}
          <button
            className="md:hidden p-2 rounded-lg"
            style={{ color: 'var(--text-secondary)' }}
            onClick={() => setMenuOpen(o => !o)}
            aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden px-6 pb-4 space-y-1"
            style={{ borderTop: '1px solid var(--border-subtle)', background: '#fff' }}>

            {/* Mobile search */}
            <div className="flex items-center gap-2 my-3 rounded-xl px-4 py-2.5"
              style={{ background: 'var(--bg-elevated)', border: '1.5px solid var(--border-medium)' }}>
              <Search size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
              <input
                value={searchQ}
                onChange={e => setSearchQ(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { handleSearch(searchQ); setMenuOpen(false) } }}
                placeholder="Buscar espacios..."
                className="flex-1 bg-transparent text-sm focus:outline-none"
                style={{ color: 'var(--text-primary)' }}
              />
            </div>

            <Link href="/buscar" className="flex items-center py-2.5 text-sm font-medium"
              style={{ color: 'var(--text-secondary)' }}>
              Explorar espacios
            </Link>

            {user ? (
              <Link href={dashboardHref} className="flex items-center gap-2 py-2.5 text-sm font-medium"
                style={{ color: 'var(--text-secondary)' }}>
                <User size={14} /> Mi panel
              </Link>
            ) : (
              <Link href="/auth" className="flex items-center py-2.5 text-sm font-medium"
                style={{ color: 'var(--text-secondary)' }}>
                Iniciar sesión
              </Link>
            )}

            <div className="pt-2">
              <Link href="/auth?mode=register&redirect=/dashboard/host"
                className="btn-brand block text-center text-sm font-semibold px-5 py-2.5 rounded-full">
                Publicar espacio
              </Link>
            </div>
          </div>
        )}
      </nav>

      {children}

      {/* ── FOOTER ── */}
      <footer style={{ borderTop: '1px solid var(--border-subtle)', background: '#fff' }} className="py-10 px-6 mt-16">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <Link href="/">
              <img src="/logo-dark.svg" alt="espot.do" style={{ height: 22, width: 'auto' }} />
            </Link>
            <div className="flex items-center gap-5 text-sm flex-wrap justify-center" style={{ color: 'var(--text-muted)' }}>
              <Link href="/buscar"    className="link-muted">Explorar</Link>
              <Link href="/auth?mode=register&redirect=/dashboard/host" className="link-muted">Para propietarios</Link>
              <Link href="/terminos"  className="link-muted">Términos</Link>
              <Link href="/reembolso" className="link-muted">Reembolso</Link>
              <Link href="/cookies"   className="link-muted">Cookies</Link>
              <a href="mailto:contacto@espot.do" className="link-muted">contacto@espot.do</a>
            </div>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>© 2026 ESPOT, S.R.L. · República Dominicana</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
