'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  LayoutDashboard, CalendarDays, Heart,
  CreditCard, User, MessageCircle, LogOut, Building2, ArrowRight, Menu, X, Search,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/dashboard/overview',   label: 'Inicio',      icon: LayoutDashboard },
  { href: '/dashboard/reservas',  label: 'Mis reservas', icon: CalendarDays },
  { href: '/dashboard/favoritos', label: 'Favoritos',    icon: Heart },
  { href: '/dashboard/pagos',     label: 'Pagos',        icon: CreditCard },
  { href: '/dashboard/mensajes',  label: 'Mensajes',     icon: MessageCircle },
  { href: '/dashboard/perfil',    label: 'Mi perfil',    icon: User },
]

// Ítems para la barra inferior móvil
const mobileBottomNav = [
  { href: '/dashboard/overview',   label: 'Inicio',    icon: LayoutDashboard },
  { href: '/dashboard/reservas',  label: 'Reservas',  icon: CalendarDays },
  { href: '/dashboard/mensajes',  label: 'Mensajes',  icon: MessageCircle },
  { href: '/dashboard/perfil',    label: 'Perfil',    icon: User },
]

export default function ClientSidebar({ userName, avatarUrl }: { userName?: string; avatarUrl?: string }) {
  const pathname = usePathname()
  const router   = useRouter()
  const supabaseRef = useRef(createClient())
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [mobileOpen])

  async function handleLogout() {
    await supabaseRef.current.auth.signOut()
    router.push('/')
  }

  function isActive(href: string) {
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
              {userName?.charAt(0)?.toUpperCase() ?? 'U'}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
              {userName ?? 'Mi cuenta'}
            </div>
            <div className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
              Cliente
            </div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-2 space-y-0.5">
        {navItems.map(({ href, label, icon: Icon }) => {
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
              }}>
              <Icon size={15} className="shrink-0" style={active ? { color: 'var(--brand)' } : undefined} />
              {label}
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

      {/* Panel de Negocio */}
      <div className="px-3 pb-1">
        <Link href="/dashboard/host"
          onClick={() => setMobileOpen(false)}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all w-full"
          style={{ color: 'var(--text-secondary)' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-elevated)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)' }}>
          <Building2 size={15} className="shrink-0" />
          Panel de Negocio
        </Link>
      </div>

      {/* Logout */}
      <div className="px-3 pb-5">
        <button onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm w-full text-left transition-all"
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
      {/* ── DESKTOP: Sidebar fijo ── */}
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
        <Link href="/dashboard/overview" className="flex-1 flex items-center">
          <img src="/logo-dark.svg" alt="espot.do" style={{ height: 22, width: 'auto' }} />
        </Link>
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl} alt={userName ?? 'Avatar'}
            className="w-8 h-8 rounded-xl object-cover shrink-0"
            style={{ border: '2px solid var(--brand)' }} />
        ) : (
          <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-bold shrink-0"
            style={{ background: 'var(--brand)' }}>
            {userName?.charAt(0)?.toUpperCase() ?? 'U'}
          </div>
        )}
      </div>

      {/* ── MÓVIL: Overlay + Drawer ── */}
      {mobileOpen && (
        <>
          <div
            className="md:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
            style={{ animation: 'fadeIn 0.2s ease' }}
          />
          <aside
            className="md:hidden fixed inset-y-0 left-0 z-50 w-72 flex flex-col slide-in-left"
            style={{
              background: 'var(--bg-surface)',
              boxShadow: '4px 0 32px rgba(0,0,0,0.15)',
            }}
          >
            <SidebarInner />
          </aside>
        </>
      )}

      {/* ── MÓVIL: Barra inferior ── */}
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
          {/* Botón "Más" para acceder a Favoritos, Pagos y más */}
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
