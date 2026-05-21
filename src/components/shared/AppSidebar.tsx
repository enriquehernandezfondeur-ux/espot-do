'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  LogOut, Building2, Menu, X, Search, Shield, User,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

export interface NavItem {
  href: string
  label: string
  icon: LucideIcon
  badge?: number
}

export interface AppSidebarProps {
  userName?: string
  avatarUrl?: string
  /** Nav links shown in the sidebar body */
  navItems: NavItem[]
  /** Nav links shown in the mobile bottom bar */
  mobileBottomNav: NavItem[]
  /** Role label shown under the user name (e.g. 'Propietario' | 'Cliente') */
  roleLabel: string
  /** Fallback display name when userName is undefined */
  userNameFallback: string
  /** Fallback avatar content when avatarUrl is undefined */
  avatarFallback: React.ReactNode
  /** bg color for the mobile top-bar avatar placeholder */
  mobileAvatarBg: string
  /** Fallback char for the mobile top-bar avatar placeholder */
  mobileAvatarChar: string
  /** href for the mobile top-bar logo link */
  mobileLogoHref: string
  /** The cross-panel switch link rendered below "Explorar" */
  crossPanelHref: string
  crossPanelLabel: string
  crossPanelIcon: LucideIcon
  /** Where to redirect after logout */
  logoutRedirect: string
  /** Logout button border-radius class */
  logoutRoundedClass: string
  /** Drawer box-shadow value */
  drawerShadow: string
  /** isActive logic variant: 'host' handles the root special-case; 'client' uses simple startsWith */
  isActiveVariant: 'host' | 'client'
  /** Optional Admin Console link — only rendered when true */
  isAdmin?: boolean
  /** Whether nav items have onMouseEnter/Leave hover handlers */
  navHoverHandlers?: boolean
}

export default function AppSidebar({
  userName,
  avatarUrl,
  navItems,
  mobileBottomNav,
  roleLabel,
  userNameFallback,
  avatarFallback,
  mobileAvatarBg,
  mobileAvatarChar,
  mobileLogoHref,
  crossPanelHref,
  crossPanelLabel,
  crossPanelIcon: CrossPanelIcon,
  logoutRedirect,
  logoutRoundedClass,
  drawerShadow,
  isActiveVariant,
  isAdmin,
  navHoverHandlers = false,
}: AppSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabaseRef = useRef(createClient())
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [mobileOpen])

  async function handleLogout() {
    await supabaseRef.current.auth.signOut()
    router.push(logoutRedirect)
  }

  function isActive(href: string) {
    if (isActiveVariant === 'host') {
      return pathname === href || (href !== '/dashboard/host' && pathname.startsWith(href))
    }
    return pathname === href || pathname.startsWith(href + '/')
  }

  const SidebarInner = () => (
    <>
      {/* Logo */}
      <div className="px-5 pt-5 pb-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        <div className="flex items-center justify-between">
          <Link href="/" onClick={() => setMobileOpen(false)}>
            <img src="/logo-dark.svg" alt="espot.do" style={{ height: 26, width: 'auto' }} />
          </Link>
          <button
            className="md:hidden p-2 rounded-lg"
            style={{ color: 'var(--text-muted)' }}
            onClick={() => setMobileOpen(false)}
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Perfil */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-center gap-3 px-2 py-2">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt={userName ?? 'Avatar'}
              className="w-8 h-8 rounded-full object-cover shrink-0"
              style={{ border: '1.5px solid var(--border-medium)' }} />
          ) : (
            <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-semibold"
              style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>
              {userName?.charAt(0)?.toUpperCase() ?? avatarFallback}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{userName ?? userNameFallback}</div>
            <div className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{roleLabel}</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-2 space-y-0.5">
        {navItems.map(({ href, label, icon: Icon, badge }) => {
          const active = isActive(href)
          return (
            <Link key={href} href={href}
              onClick={() => setMobileOpen(false)}
              className={cn('flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all')}
              style={active ? {
                background: 'var(--bg-elevated)',
                color: 'var(--text-primary)',
              } : {
                color: 'var(--text-secondary)',
              }}
              {...(navHoverHandlers ? {
                onMouseEnter: (e: React.MouseEvent<HTMLAnchorElement>) => { if (!active) { (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)'; (e.currentTarget as HTMLElement).style.background = 'var(--bg-elevated)' } },
                onMouseLeave: (e: React.MouseEvent<HTMLAnchorElement>) => { if (!active) { (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)'; (e.currentTarget as HTMLElement).style.background = 'transparent' } },
              } : {})}>
              <Icon size={15} className="shrink-0" style={active ? { color: 'var(--brand)' } : undefined} />
              <span className="flex-1">{label}</span>
              {badge != null && badge > 0 && (
                <span className="flex items-center justify-center text-xs font-bold rounded-full shrink-0"
                  style={{ minWidth: 18, height: 18, padding: '0 4px', background: '#EF4444', color: '#fff', fontSize: 10 }}>
                  {badge > 99 ? '99+' : badge}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Explorar */}
      <div className="px-3 pb-1" style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 8 }}>
        <Link href="/buscar"
          onClick={() => setMobileOpen(false)}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all w-full"
          style={{ color: 'var(--text-secondary)' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-elevated)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)' }}>
          <Search size={15} className="shrink-0" />
          Explorar espacios
        </Link>
      </div>

      {/* Cross-panel link */}
      <div className="px-3 pb-1">
        <Link href={crossPanelHref}
          onClick={() => setMobileOpen(false)}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all w-full"
          style={{ color: 'var(--text-secondary)' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-elevated)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)' }}>
          <CrossPanelIcon size={15} className="shrink-0" />
          {crossPanelLabel}
        </Link>
      </div>

      {/* Admin Console */}
      {isAdmin && (
        <div className="px-3 pb-1">
          <Link href="/admin"
            onClick={() => setMobileOpen(false)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all w-full"
            style={{ color: 'var(--text-secondary)' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-elevated)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)' }}>
            <Shield size={15} className="shrink-0" />
            Admin Console
          </Link>
        </div>
      )}

      {/* Logout */}
      <div className="px-3 pb-5">
        <button onClick={handleLogout}
          className={`flex items-center gap-3 px-3 py-3 ${logoutRoundedClass} text-sm w-full text-left transition-all`}
          style={{ color: 'var(--text-muted)' }}
          onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = '#f87171')}
          onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = 'var(--text-muted)')}>
          <LogOut size={15} />
          Cerrar sesión
        </button>
      </div>
    </>
  )

  return (
    <>
      {/* ── DESKTOP: Sidebar fijo a la izquierda ── */}
      <aside className="hidden md:flex w-60 min-h-dvh flex-col shrink-0"
        style={{ background: 'var(--bg-surface)', borderRight: '1px solid var(--border-subtle)' }}>
        <SidebarInner />
      </aside>

      {/* ── MÓVIL: Top bar fija ── */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 h-14 flex items-center px-4 gap-3"
        style={{
          background: 'rgba(255,255,255,0.95)',
          backdropFilter: 'blur(16px)',
          borderBottom: '1px solid var(--border-subtle)',
          boxShadow: '0 1px 8px rgba(0,0,0,0.06)',
        }}>
        <button
          onClick={() => setMobileOpen(true)}
          className="w-10 h-10 flex items-center justify-center rounded-xl"
          style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)' }}
          aria-label="Abrir menú"
        >
          <Menu size={20} />
        </button>
        <Link href={mobileLogoHref} className="flex-1 flex items-center">
          <img src="/logo-dark.svg" alt="espot.do" style={{ height: 22, width: 'auto' }} />
        </Link>
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl} alt={userName ?? 'Avatar'}
            className="w-8 h-8 rounded-xl object-cover shrink-0"
            style={{ border: '2px solid var(--brand)' }} />
        ) : (
          <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-bold shrink-0"
            style={{ background: mobileAvatarBg }}>
            {userName?.charAt(0)?.toUpperCase() ?? mobileAvatarChar}
          </div>
        )}
      </div>

      {/* ── MÓVIL: Overlay + Drawer ── */}
      {mobileOpen && (
        <>
          {/* Backdrop */}
          <div
            className="md:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
            style={{ animation: 'fadeIn 0.2s ease' }}
          />
          {/* Drawer */}
          <aside
            className="md:hidden fixed inset-y-0 left-0 z-50 w-72 flex flex-col slide-in-left"
            style={{
              background: 'var(--bg-surface)',
              boxShadow: drawerShadow,
            }}
          >
            <SidebarInner />
          </aside>
        </>
      )}

      {/* ── MÓVIL: Barra de navegación inferior ── */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 pb-safe"
        style={{
          background: 'rgba(255,255,255,0.97)',
          backdropFilter: 'blur(20px)',
          borderTop: '1px solid var(--border-subtle)',
          boxShadow: '0 -4px 20px rgba(0,0,0,0.08)',
        }}>
        <div className="flex items-stretch">
          {mobileBottomNav.map(({ href, label, icon: Icon }) => {
            const active = isActive(href)
            return (
              <Link key={href} href={href}
                className="flex-1 flex flex-col items-center justify-center py-2.5 gap-1 transition-all"
                style={{ color: active ? 'var(--brand)' : 'var(--text-muted)' }}>
                <div className="w-8 h-8 flex items-center justify-center rounded-xl transition-all"
                  style={{ background: active ? 'var(--brand-dim)' : 'transparent' }}>
                  <Icon size={18} />
                </div>
                <span className="text-xs font-semibold leading-tight">{label}</span>
              </Link>
            )
          })}
          {/* Botón "Más" para abrir el drawer completo */}
          <button
            onClick={() => setMobileOpen(true)}
            className="flex-1 flex flex-col items-center justify-center py-2.5 gap-1"
            style={{ color: 'var(--text-muted)' }}>
            <div className="w-8 h-8 flex items-center justify-center rounded-xl">
              <Menu size={18} />
            </div>
            <span className="text-xs font-semibold leading-tight">Más</span>
          </button>
        </div>
      </div>
    </>
  )
}
