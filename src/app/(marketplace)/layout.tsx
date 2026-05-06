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
        <div className="max-w-7xl mx-auto space-y-6">

          {/* Top row */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
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

            {/* Social icons */}
            <div className="flex items-center gap-3">
              <a href="https://www.instagram.com/espot.do/" target="_blank" rel="noopener noreferrer"
                aria-label="Instagram"
                className="w-8 h-8 rounded-full flex items-center justify-center transition-all hover:scale-110"
                style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#E1306C'; (e.currentTarget as HTMLElement).style.background = 'rgba(225,48,108,0.08)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'; (e.currentTarget as HTMLElement).style.background = 'var(--bg-elevated)' }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
              </a>
              <a href="https://www.facebook.com/espot.do/" target="_blank" rel="noopener noreferrer"
                aria-label="Facebook"
                className="w-8 h-8 rounded-full flex items-center justify-center transition-all hover:scale-110"
                style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#1877F2'; (e.currentTarget as HTMLElement).style.background = 'rgba(24,119,242,0.08)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'; (e.currentTarget as HTMLElement).style.background = 'var(--bg-elevated)' }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
              </a>
              <a href="https://www.linkedin.com/company/espotdo/" target="_blank" rel="noopener noreferrer"
                aria-label="LinkedIn"
                className="w-8 h-8 rounded-full flex items-center justify-center transition-all hover:scale-110"
                style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#0A66C2'; (e.currentTarget as HTMLElement).style.background = 'rgba(10,102,194,0.08)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'; (e.currentTarget as HTMLElement).style.background = 'var(--bg-elevated)' }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
              </a>
            </div>
          </div>

          {/* Bottom row */}
          <div className="flex items-center justify-center pt-4" style={{ borderTop: '1px solid var(--border-subtle)' }}>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>© 2026 ESPOT, S.R.L. · República Dominicana</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
