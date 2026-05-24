'use client'

import Link from 'next/link'
import { Search, Menu, X, User, ChevronDown, LogOut, Settings, LayoutDashboard, MapPin, Building2, CalendarDays, Heart, ChevronRight, CreditCard, MessageCircle, Home, Compass } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useMessageNotifications } from '@/hooks/useMessageNotifications'

export default function MarketplaceLayout({ children }: { children: React.ReactNode }) {
  useMessageNotifications()
  const router   = useRouter()
  const pathname = usePathname()
  const [menuOpen,      setMenuOpen]      = useState(false)
  const [searchQ,       setSearchQ]       = useState('')
  const [user,          setUser]          = useState<{ email: string; role?: string; avatarUrl?: string; fullName?: string } | null>(null)
  const [authReady,     setAuthReady]     = useState(false)
  const [dropdownOpen,   setDropdownOpen]   = useState(false)
  const [dropdownPos,    setDropdownPos]    = useState({ top: 0, right: 0 })
  const [imgError,       setImgError]       = useState(false)
  const [accountSheet,   setAccountSheet]   = useState(false)
  const [notifCount,     setNotifCount]     = useState(0)
  const searchRef    = useRef<HTMLInputElement>(null)
  const dropdownRef  = useRef<HTMLDivElement>(null)

  useEffect(() => { setMenuOpen(false); setDropdownOpen(false); setAccountSheet(false) }, [pathname])

  function openDropdown() {
    if (!dropdownOpen && dropdownRef.current) {
      const rect = dropdownRef.current.getBoundingClientRect()
      setDropdownPos({ top: rect.bottom + 8, right: window.innerWidth - rect.right })
    }
    setDropdownOpen(o => !o)
  }

  // Bloquear scroll del body cuando el menú móvil está abierto
  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [menuOpen])

  useEffect(() => {
    const supabase = createClient()
    let isMounted  = true

    async function loadProfile(uid: string, email: string) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, avatar_url, full_name')
        .eq('id', uid)
        .single()
      if (!isMounted) return
      setImgError(false)
      setUser({
        email,
        role:      profile?.role      ?? undefined,
        avatarUrl: profile?.avatar_url ?? undefined,
        fullName:  profile?.full_name  ?? undefined,
      })
      setAuthReady(true)
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // TOKEN_REFRESHED no cambia el perfil — ignorar para evitar flash
      if (event === 'TOKEN_REFRESHED') return
      if (session?.user) {
        loadProfile(session.user.id, session.user.email ?? '')
        fetchNotifCount(session.user.id)
      } else {
        if (isMounted) { setUser(null); setAuthReady(true); setNotifCount(0) }
      }
    })

    return () => { isMounted = false; subscription.unsubscribe() }
  }, [])

  async function fetchNotifCount(uid: string) {
    const supabase = createClient()
    const { count } = await supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('receiver_id', uid)
      .is('read_at', null)
    setNotifCount(count ?? 0)
  }

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    setUser(null)
    setDropdownOpen(false)
    setMenuOpen(false)
    router.push('/')
    router.refresh()
  }

  function handleSearch(q: string) {
    if (!q.trim()) return
    router.push(`/buscar?q=${encodeURIComponent(q.trim())}`)
    setSearchQ('')
    setMenuOpen(false)
  }

  const ROLE_ROUTES: Record<string, string> = { host: '/dashboard/host', admin: '/admin' }
  const dashboardHref = ROLE_ROUTES[user?.role ?? ''] ?? '/dashboard'

  const settingsHref  = user?.role === 'host'  ? '/dashboard/host/ajustes'
                      : user?.role === 'admin' ? '/admin/configuracion'
                      : '/dashboard/perfil'

  const displayName = user?.fullName?.split(' ')[0] ?? user?.email?.split('@')[0] ?? ''
  const avatarLetter = (user?.fullName ?? user?.email ?? 'U').charAt(0).toUpperCase()
  const showAvatar   = !!user?.avatarUrl && !imgError

  return (
    <div className="light-theme min-h-dvh w-full" style={{ background: 'var(--bg-base)', color: 'var(--text-primary)' }}>

      {/* ── NAVBAR ── */}
      <nav className="sticky top-0 z-50" style={{
        background:    'rgba(255,255,255,0.94)',
        backdropFilter:'blur(20px)',
        borderBottom:  '1px solid var(--border-subtle)',
        boxShadow:     '0 1px 0 var(--border-subtle)',
      }}>
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 flex items-center gap-3 md:gap-5">

          {/* Logo */}
          <Link href="/" className="shrink-0">
            <img src="/logo-dark.svg" alt="espot.do" style={{ height: 28, width: "auto" }} />
          </Link>

          {/* Search — desktop */}
          <div className="hidden md:flex items-center gap-2 w-64 rounded-full px-4 py-2.5"
            style={{ background: 'var(--bg-elevated)', border: '1.5px solid var(--border-medium)' }}>
            <Search size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
            <input
              ref={searchRef}
              value={searchQ}
              onChange={e => {
                setSearchQ(e.target.value)
                if (pathname === '/buscar') {
                  window.dispatchEvent(new CustomEvent('espot:search', { detail: { q: e.target.value } }))
                }
              }}
              onKeyDown={e => { if (e.key === 'Enter') handleSearch(searchQ) }}
              placeholder="Buscar espacios..."
              className="flex-1 bg-transparent text-sm focus:outline-none"
              style={{ color: 'var(--text-primary)' }}
            />
          </div>

          {/* Desktop actions */}
          <div className="hidden md:flex items-center gap-3 shrink-0 ml-auto">
            <Link href="/buscar" className="link-muted text-sm font-medium px-3 py-2 rounded-lg">
              Explorar
            </Link>

            {!authReady ? (
              <>
                <div className="w-28 h-9 rounded-xl animate-pulse" style={{ background: 'var(--bg-elevated)' }} />
                <div className="w-36 h-9 rounded-full animate-pulse" style={{ background: 'var(--bg-elevated)' }} />
              </>
            ) : user ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={openDropdown}
                  className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl transition-colors"
                  style={{
                    background: dropdownOpen ? 'var(--bg-elevated)' : 'transparent',
                    color: 'var(--text-secondary)',
                  }}>
                  <div className="relative shrink-0">
                    {showAvatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={user.avatarUrl}
                        alt={displayName}
                        className="w-8 h-8 rounded-full object-cover"
                        style={{ border: '2px solid var(--brand)' }}
                        onError={() => setImgError(true)}
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white"
                        style={{ background: 'var(--brand)' }}>
                        {avatarLetter}
                      </div>
                    )}
                    {notifCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white"
                        style={{ background: '#EF4444' }} />
                    )}
                  </div>
                  <span className="hidden lg:block text-sm font-medium">{displayName}</span>
                  <ChevronDown size={14} className="hidden lg:block" style={{ opacity: 0.6 }} />
                </button>

                {dropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-[9998]" onClick={() => setDropdownOpen(false)} />
                    <div style={{
                      position: 'fixed',
                      top: dropdownPos.top,
                      right: dropdownPos.right,
                      width: 224,
                      background: '#fff',
                      borderRadius: 16,
                      border: '1px solid var(--border-subtle)',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.10)',
                      zIndex: 9999,
                      overflow: 'hidden',
                    }}>
                      <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                          {user.fullName ?? displayName}
                        </p>
                        <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>{user.email}</p>
                      </div>
                      <div className="py-1">
                        <Link href={dashboardHref} onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-[var(--bg-elevated)]"
                          style={{ color: 'var(--text-secondary)' }}>
                          <LayoutDashboard size={15} /> Mi panel
                        </Link>
                        <Link href={settingsHref} onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-[var(--bg-elevated)]"
                          style={{ color: 'var(--text-secondary)' }}>
                          <Settings size={15} /> {user.role === 'host' ? 'Ajustes' : 'Mi perfil'}
                        </Link>
                      </div>
                      <div style={{ borderTop: '1px solid var(--border-subtle)' }} className="py-1">
                        <button onClick={handleSignOut}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-red-50"
                          style={{ color: '#ef4444' }}>
                          <LogOut size={15} /> Cerrar sesión
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <>
                <Link href="/auth" className="link-muted text-sm font-medium px-3 py-2 rounded-lg">
                  Iniciar sesión
                </Link>
                <Link href="/para-propietarios" className="btn-brand text-sm font-semibold px-5 py-2.5 rounded-full">
                  Publicar espacio
                </Link>
              </>
            )}
          </div>

          {/* Mobile: acciones rápidas */}
          <div className="md:hidden flex items-center gap-2 ml-auto">
            {/* Explorar rápido móvil — ícono de brújula */}
            <Link href="/buscar"
              className="w-10 h-10 flex items-center justify-center rounded-xl"
              style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}
              aria-label="Explorar espacios">
              <Compass size={18} />
            </Link>
            {/* Hamburger — solo cuando NO está logueado (el bottom nav reemplaza la nav para logueados) */}
            {authReady && !user && (
              <button
                className="w-10 h-10 flex items-center justify-center rounded-xl"
                style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}
                onClick={() => setMenuOpen(o => !o)}
                aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}>
                {menuOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            )}
            {/* Iniciar sesión rápido — solo no logueados */}
            {authReady && !user && !menuOpen && (
              <Link href="/auth"
                className="text-xs font-bold px-3 py-2 rounded-xl"
                style={{ background: 'var(--brand)', color: '#fff' }}>
                Entrar
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* ── MOBILE MENU OVERLAY ── */}
      {menuOpen && (
        <>
          {/* Backdrop */}
          <div
            className="md:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
            style={{ top: 64 }}
            onClick={() => setMenuOpen(false)}
          />
          {/* Panel */}
          <div className="md:hidden fixed left-0 right-0 z-40 flex flex-col"
            style={{
              top: 64,
              background: '#fff',
              boxShadow: '0 8px 40px rgba(0,0,0,0.14)',
              borderBottom: '1px solid var(--border-subtle)',
              maxHeight: 'calc(100dvh - 64px)',
              overflowY: 'auto',
            }}>

            {/* Búsqueda */}
            <div className="px-4 pt-4 pb-3" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              <div className="flex items-center gap-2.5 rounded-2xl px-4 py-3"
                style={{ background: 'var(--bg-elevated)', border: '1.5px solid var(--border-medium)' }}>
                <Search size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                <input
                  value={searchQ}
                  onChange={e => setSearchQ(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleSearch(searchQ) }}
                  placeholder="Buscar espacios o eventos..."
                  className="flex-1 bg-transparent text-sm focus:outline-none"
                  style={{ color: 'var(--text-primary)', fontSize: 16 }}
                  autoFocus
                />
                {searchQ && (
                  <button onClick={() => setSearchQ('')} style={{ color: 'var(--text-muted)' }}>
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>

            {/* Links de navegación */}
            <div className="px-4 py-3 space-y-1" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              <Link href="/buscar" onClick={() => setMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-3.5 rounded-xl text-sm font-medium transition-colors"
                style={{ color: 'var(--text-primary)' }}>
                <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                  style={{ background: 'var(--bg-elevated)' }}>
                  <MapPin size={16} style={{ color: 'var(--text-secondary)' }} />
                </div>
                Explorar espacios
              </Link>
              <Link href="/para-clientes" onClick={() => setMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-3.5 rounded-xl text-sm font-medium transition-colors"
                style={{ color: 'var(--text-primary)' }}>
                <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                  style={{ background: 'var(--bg-elevated)' }}>
                  <Search size={16} style={{ color: 'var(--text-secondary)' }} />
                </div>
                Cómo reservar
              </Link>
              <Link href="/para-propietarios" onClick={() => setMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-3.5 rounded-xl text-sm font-medium transition-colors"
                style={{ color: 'var(--text-primary)' }}>
                <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                  style={{ background: 'var(--bg-elevated)' }}>
                  <Building2 size={16} style={{ color: 'var(--text-secondary)' }} />
                </div>
                Publicar mi espacio
              </Link>
            </div>

            {/* Usuario */}
            <div className="px-4 py-3 space-y-1">
              {!authReady ? (
                <div className="h-12 rounded-xl animate-pulse" style={{ background: 'var(--bg-elevated)' }} />
              ) : user ? (
                <>
                  {/* Info usuario */}
                  <div className="flex items-center gap-3 px-3 py-3 rounded-2xl mb-2"
                    style={{ background: 'var(--bg-elevated)' }}>
                    <div className="relative shrink-0">
                      {showAvatar ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={user.avatarUrl} alt={displayName}
                          className="w-10 h-10 rounded-xl object-cover"
                          style={{ border: '2px solid var(--brand)' }}
                          onError={() => setImgError(true)} />
                      ) : (
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold text-white"
                          style={{ background: 'var(--brand)' }}>
                          {avatarLetter}
                        </div>
                      )}
                      {notifCount > 0 && (
                        <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-white"
                          style={{ background: '#EF4444' }} />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                        {user.fullName ?? displayName}
                      </p>
                      <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{user.email}</p>
                    </div>
                  </div>

                  <Link href={dashboardHref} onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-3 px-3 py-3.5 rounded-xl text-sm font-medium"
                    style={{ color: 'var(--text-primary)' }}>
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                      style={{ background: 'var(--bg-elevated)' }}>
                      <LayoutDashboard size={16} style={{ color: 'var(--text-secondary)' }} />
                    </div>
                    Mi panel
                  </Link>
                  <Link href={settingsHref} onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-3 px-3 py-3.5 rounded-xl text-sm font-medium"
                    style={{ color: 'var(--text-primary)' }}>
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                      style={{ background: 'var(--bg-elevated)' }}>
                      <Settings size={16} style={{ color: 'var(--text-secondary)' }} />
                    </div>
                    {user.role === 'host' ? 'Ajustes' : 'Mi perfil'}
                  </Link>
                  <button onClick={handleSignOut}
                    className="w-full flex items-center gap-3 px-3 py-3.5 rounded-xl text-sm font-medium"
                    style={{ color: '#ef4444' }}>
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                      style={{ background: 'rgba(239,68,68,0.08)' }}>
                      <LogOut size={16} style={{ color: '#ef4444' }} />
                    </div>
                    Cerrar sesión
                  </button>
                </>
              ) : (
                <Link href="/auth" onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-3.5 rounded-xl text-sm font-medium"
                  style={{ color: 'var(--text-primary)' }}>
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                    style={{ background: 'var(--bg-elevated)' }}>
                    <User size={16} style={{ color: 'var(--text-secondary)' }} />
                  </div>
                  Iniciar sesión
                </Link>
              )}
            </div>

            {/* CTA — solo para usuarios no logueados */}
            {authReady && !user && (
              <div className="px-4 py-4" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                <Link href="/para-propietarios"
                  onClick={() => setMenuOpen(false)}
                  className="btn-brand block text-center text-sm font-bold px-5 py-4 rounded-2xl"
                  style={{ boxShadow: '0 4px 16px rgba(53,196,147,0.3)' }}>
                  Publicar espacio gratis
                </Link>
              </div>
            )}
          </div>
        </>
      )}

      {/* Espacio inferior: pb-20 + safe-area para la barra de navegación y el home indicator */}
      <div className="pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-0">
        {children}
      </div>

      {/* ── BARRA INFERIOR MÓVIL — inteligente según el rol ── */}
      {authReady && user && (() => {
        const isHost  = user?.role === 'host' || user?.role === 'admin'
        // Tabs dinámicas según rol
        const tab3 = isHost
          ? { href: '/dashboard/host',          label: 'Mi panel',  icon: LayoutDashboard }
          : { href: '/dashboard/reservas',       label: 'Reservas',  icon: CalendarDays }
        const tab4 = isHost
          ? { href: '/dashboard/host/mensajes',  label: 'Mensajes',  icon: MessageCircle }
          : { href: '/dashboard/mensajes',       label: 'Mensajes',  icon: MessageCircle }

        const navTabs = [
          { href: '/',        label: 'Inicio',  icon: Home,          active: pathname === '/' },
          { href: '/buscar',  label: 'Buscar',  icon: Search,        active: pathname === '/buscar' || pathname.startsWith('/espacios') },
          { ...tab3,                                                   active: false },
          { ...tab4,                                                   active: false },
        ]

        return (
          <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 pb-safe"
            style={{
              background: 'rgba(255,255,255,0.97)',
              backdropFilter: 'blur(20px)',
              borderTop: '1px solid var(--border-subtle)',
              boxShadow: '0 -4px 20px rgba(0,0,0,0.08)',
            }}>
            <div className="flex items-stretch">

              {navTabs.map(({ href, label, icon: Icon, active }) => (
                <Link key={href} href={href}
                  className="flex-1 flex flex-col items-center justify-center py-2.5 gap-1 transition-all"
                  style={{ color: active ? 'var(--brand)' : 'var(--text-muted)' }}>
                  <div className="w-8 h-8 flex items-center justify-center rounded-xl transition-all"
                    style={{ background: active ? 'var(--brand-dim)' : 'transparent' }}>
                    <Icon size={18} />
                  </div>
                  <span className="text-xs font-semibold leading-tight">{label}</span>
                </Link>
              ))}

              {/* Cuenta */}
              <button
                onClick={() => setAccountSheet(true)}
                className="flex-1 flex flex-col items-center justify-center py-2.5 gap-1 transition-all"
                style={{ color: accountSheet ? 'var(--brand)' : 'var(--text-muted)', background: 'transparent', border: 'none' }}>
                <div className="w-8 h-8 flex items-center justify-center rounded-xl transition-all"
                  style={{ background: accountSheet ? 'var(--brand-dim)' : 'transparent' }}>
                  {showAvatar
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={user.avatarUrl} alt={displayName}
                        className="w-7 h-7 rounded-lg object-cover"
                        onError={() => setImgError(true)} />
                    : <User size={18} />
                  }
                </div>
                <span className="text-xs font-semibold leading-tight">Cuenta</span>
              </button>

            </div>
          </div>
        )
      })()}

      {/* ── HOJA DE CUENTA (bottom sheet) ── */}
      {accountSheet && (
        <>
          <div className="md:hidden fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm"
            onClick={() => setAccountSheet(false)} />
          <div className="md:hidden fixed bottom-0 left-0 right-0 z-[61] rounded-t-3xl overflow-hidden slide-in-bottom"
            style={{ background: '#fff', boxShadow: '0 -12px 48px rgba(0,0,0,0.18)', maxHeight: '85dvh', overflowY: 'auto' }}>

            {/* Tirador */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-9 h-1 rounded-full" style={{ background: '#D1D5DB' }} />
            </div>

            {/* Perfil con gradiente */}
            <div className="mx-4 mb-3 rounded-2xl px-4 py-4 flex items-center gap-3"
              style={{ background: 'linear-gradient(135deg, var(--brand-dim), rgba(53,196,147,0.03))', border: '1px solid var(--brand-border)' }}>
              {showAvatar
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={user.avatarUrl} alt={displayName}
                    className="w-14 h-14 rounded-2xl object-cover shrink-0"
                    style={{ border: '2px solid var(--brand)', boxShadow: '0 2px 8px rgba(53,196,147,0.2)' }}
                    onError={() => setImgError(true)} />
                : <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-lg font-bold text-white shrink-0"
                    style={{ background: 'var(--brand)', boxShadow: '0 2px 8px rgba(53,196,147,0.3)' }}>
                    {avatarLetter}
                  </div>
              }
              <div className="min-w-0 flex-1">
                <div className="font-bold text-base truncate" style={{ color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>{user?.fullName ?? displayName}</div>
                <div className="text-xs truncate mt-0.5" style={{ color: 'var(--text-muted)' }}>{user?.email}</div>
                <Link href="/dashboard/perfil" onClick={() => setAccountSheet(false)}
                  className="inline-flex items-center gap-1 text-xs font-semibold mt-1.5"
                  style={{ color: 'var(--brand)' }}>
                  Editar perfil <ChevronRight size={11} />
                </Link>
              </div>
            </div>

            {/* Accesos rápidos */}
            <div className="px-4 space-y-0.5">
              {(user?.role === 'host' || user?.role === 'admin' ? [
                // Propietario: su panel + acceso al panel cliente
                { href: '/dashboard/host',          label: 'Mi panel propietario', icon: LayoutDashboard, desc: 'Reservas, ingresos, espacios' },
                { href: '/dashboard/host/mensajes', label: 'Mensajes',             icon: MessageCircle,   desc: 'Chats con clientes' },
                { href: '/dashboard/host/agenda', label: 'Reservas recibidas',   icon: CalendarDays,    desc: 'Solicitudes de mis espacios' },
                { href: '/dashboard/overview',      label: 'Panel de cliente',     icon: Home,            desc: 'Mis reservas y pagos' },
              ] : [
                // Cliente: panel cliente + acceso al panel propietario
                { href: '/dashboard/overview',  label: 'Inicio',             icon: LayoutDashboard, desc: 'Ver resumen y alertas' },
                { href: '/dashboard/reservas',  label: 'Mis reservas',       icon: CalendarDays,    desc: 'Ver y gestionar reservas' },
                { href: '/dashboard/favoritos', label: 'Espacios guardados', icon: Heart,           desc: 'Mis espacios favoritos' },
                { href: '/dashboard/pagos',     label: 'Mis pagos',          icon: CreditCard,      desc: 'Historial de pagos y cuotas' },
                { href: '/dashboard/host',      label: 'Panel de propietario', icon: Building2,     desc: 'Publicar y gestionar tu espacio' },
              ]).map(({ href, label, icon: Icon, desc }) => (
                <Link key={href} href={href} onClick={() => setAccountSheet(false)}
                  className="flex items-center gap-3 px-3 py-3 rounded-2xl transition-colors active:bg-[var(--bg-elevated)]"
                  style={{ WebkitTapHighlightColor: 'transparent' }}>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: 'var(--bg-elevated)' }}>
                    <Icon size={17} style={{ color: 'var(--brand)' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{label}</div>
                    <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{desc}</div>
                  </div>
                  <ChevronRight size={14} style={{ color: '#D1D5DB', flexShrink: 0 }} />
                </Link>
              ))}
            </div>

            {/* Cerrar sesión */}
            <div className="px-4 pt-3 pb-safe" style={{ paddingBottom: 'max(20px, env(safe-area-inset-bottom))' }}>
              <button
                onClick={async () => { setAccountSheet(false); await handleSignOut() }}
                className="w-full flex items-center justify-center gap-2.5 py-4 rounded-2xl font-bold text-sm transition-all active:scale-[0.98]"
                style={{ background: 'rgba(239,68,68,0.07)', color: '#DC2626', border: '1.5px solid rgba(239,68,68,0.18)' }}>
                <LogOut size={17} />
                Cerrar sesión
              </button>
            </div>

          </div>
        </>
      )}

      {/* ── FOOTER ── */}
      <footer style={{ background: '#F4F6F5', borderTop: '1px solid #E0E7E3' }}>
        <style>{`
          .ft-link { transition: color .18s ease, transform .18s ease; }
          .ft-link:hover { color: #35C493 !important; transform: translateX(4px); }
          .ft-soc { transition: background .18s ease, transform .18s ease; }
          .ft-soc:hover { background: #35C493 !important; color: #fff !important; transform: translateY(-2px); }
        `}</style>
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">

            {/* Plataforma */}
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest mb-3" style={{color:'#35C493'}}>Plataforma</p>
              {[{href:'/buscar',label:'Explorar espacios'},{href:'/para-clientes',label:'Para clientes'},{href:'/para-propietarios',label:'Para propietarios'}].map(({href,label})=>(
                <Link key={href} href={href} className="ft-link block text-sm py-1" style={{color:'#6B7280'}}>{label}</Link>
              ))}
            </div>

            {/* Anfitriones */}
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest mb-3" style={{color:'#35C493'}}>Anfitriones</p>
              {[{href:'/para-propietarios',label:'Publicar espacio'},{href:'/dashboard/host',label:'Panel de control'},{href:'/contacto',label:'Contacto'}].map(({href,label})=>(
                <Link key={href} href={href} className="ft-link block text-sm py-1" style={{color:'#6B7280'}}>{label}</Link>
              ))}
            </div>

            {/* Legal */}
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest mb-3" style={{color:'#35C493'}}>Legal</p>
              {[{href:'/terminos',label:'Términos'},{href:'/privacidad',label:'Privacidad'},{href:'/reembolso',label:'Reembolsos'},{href:'/seguridad',label:'Seguridad'},{href:'/cookies',label:'Cookies'}].map(({href,label})=>(
                <Link key={href} href={href} className="ft-link block text-sm py-1" style={{color:'#6B7280'}}>{label}</Link>
              ))}
            </div>

            {/* Logo + redes + app */}
            <div className="flex flex-col items-start gap-3">
              <Link href="/"><img src="/logo-dark.svg" alt="Espot" style={{height:22,width:'auto'}}/></Link>
              <p className="text-sm" style={{color:'#9CA3AF',lineHeight:1.6}}>Espacios a tu alcance.</p>
              <div className="flex gap-1.5">
                {[
                  {href:'https://www.instagram.com/espot.do/',path:'M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z',label:'IG'},
                  {href:'https://www.facebook.com/espot.do/',path:'M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z',label:'FB'},
                  {href:'https://www.linkedin.com/company/espotdo/',path:'M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 23.2 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z',label:'LI'},
                ].map(s=>(
                  <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" aria-label={s.label}
                    className="ft-soc w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{background:'#E8EEE9',color:'#9CA3AF'}}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d={s.path}/></svg>
                  </a>
                ))}
              </div>

              {/* Apple App Store badge — próximamente */}
              <div role="button" aria-disabled="true" aria-label="Próximamente en App Store"
                className="inline-flex items-center gap-3 transition-opacity hover:opacity-75"
                style={{
                  background:'#000',
                  border:'1.5px solid #333',
                  borderRadius:10,
                  padding:'7px 14px',
                  cursor:'default',
                  minWidth:130,
                }}>
                {/* Apple logo SVG */}
                <svg width="20" height="24" viewBox="0 0 814 1000" fill="white" style={{flexShrink:0}}>
                  <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-57.8-155.5-127.4C46 790.7 0 663 0 541.8c0-207.4 135.4-317 268.1-317 63.6 0 116.6 42 156.4 42 37.8 0 97.9-44.6 168.8-44.6 28.4 0 130.9 2.6 198.3 99.2zm-234-181.5c31.1-36.9 53.1-88.1 53.1-139.3 0-7.1-.6-14.3-1.9-20.1-50.6 1.9-110.8 33.7-147.1 75.8-28.5 32.4-55.1 83.6-55.1 135.5 0 7.8 1.3 15.6 1.9 18.1 3.2.6 8.4 1.3 13.6 1.3 45.4 0 102.5-30.4 135.5-71.3z"/>
                </svg>
                <div style={{lineHeight:1}}>
                  <div style={{color:'#aaa',fontSize:9,letterSpacing:'0.04em',marginBottom:2}}>Download on the</div>
                  <div style={{color:'#fff',fontSize:17,fontWeight:600,letterSpacing:'-0.02em',lineHeight:1}}>App Store</div>
                </div>
              </div>
            </div>

          </div>

          {/* Barra inferior */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-5 pb-2"
            style={{borderTop:'1px solid #E0E7E3'}}>

            {/* Logos de pago */}
            <div className="flex items-center gap-2.5 flex-wrap justify-center">
              <span className="text-[10px] font-bold uppercase tracking-widest mr-1" style={{color:'#9CA3AF'}}>Pago seguro</span>

              {/* 1. VISA */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/visa-logo.jpg" alt="Visa" style={{height:32,width:'auto',borderRadius:6,display:'block',objectFit:'contain'}} />

              {/* 2. AZUL */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/azul-logo.jpg" alt="Azul Payments" style={{height:32,width:'auto',borderRadius:6,display:'block',objectFit:'contain'}} />

              {/* 3. Mastercard */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/mastercard-logo.svg" alt="Mastercard" style={{height:40,width:'auto',display:'block',objectFit:'contain'}} />

              {/* 4. Mastercard ID Check */}
              <div style={{background:'#fff',border:'1px solid #E2E8F0',borderRadius:6,padding:'4px 8px',display:'flex',alignItems:'center',gap:5,height:32}}>
                <svg viewBox="0 0 28 18" width="28" height="18" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="10" cy="9" r="7.5" fill="#EB001B"/>
                  <circle cx="18" cy="9" r="7.5" fill="#F79E1B"/>
                  <path d="M14 3a7.5 7.5 0 0 1 0 12A7.5 7.5 0 0 1 14 3z" fill="#FF5F00"/>
                </svg>
                <div style={{display:'flex',flexDirection:'column',lineHeight:1.2}}>
                  <span style={{fontSize:8,fontWeight:600,color:'#1A1A1A',fontFamily:'Arial,Helvetica,sans-serif'}}>mastercard</span>
                  <span style={{fontSize:9,fontWeight:800,color:'#1A1A1A',fontFamily:'Arial,Helvetica,sans-serif'}}>ID Check</span>
                </div>
              </div>
            </div>

            <p className="text-xs" style={{color:'#9CA3AF'}}>© 2026 ESPOT, S.R.L. · República Dominicana</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
