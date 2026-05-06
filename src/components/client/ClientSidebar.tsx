'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  LayoutDashboard, CalendarDays, Heart,
  CreditCard, User, MessageCircle, LogOut, Building2, ArrowRight, Menu, X,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/dashboard',           label: 'Inicio',       icon: LayoutDashboard },
  { href: '/dashboard/reservas',  label: 'Mis reservas', icon: CalendarDays },
  { href: '/dashboard/favoritos', label: 'Favoritos',    icon: Heart },
  { href: '/dashboard/pagos',     label: 'Pagos',        icon: CreditCard },
  { href: '/dashboard/mensajes',  label: 'Mensajes',     icon: MessageCircle },
  { href: '/dashboard/perfil',    label: 'Mi perfil',    icon: User },
]

// Ítems para la barra inferior móvil
const mobileBottomNav = [
  { href: '/dashboard',           label: 'Inicio',    icon: LayoutDashboard },
  { href: '/dashboard/reservas',  label: 'Reservas',  icon: CalendarDays },
  { href: '/dashboard/favoritos', label: 'Favoritos', icon: Heart },
  { href: '/dashboard/mensajes',  label: 'Mensajes',  icon: MessageCircle },
  { href: '/dashboard/perfil',    label: 'Perfil',    icon: User },
]

export default function ClientSidebar({ userName, avatarUrl }: { userName?: string; avatarUrl?: string }) {
  const pathname = usePathname()
  const router   = useRouter()
  const supabase = createClient()
  const [mobileOpen, setMobileOpen] = useState(false)

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/')
  }

  function isActive(href: string) {
    return pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
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

      {/* Indicador de modo */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-center gap-3 px-3 py-3 rounded-2xl"
          style={{ background: 'var(--brand-dim)', border: '1px solid var(--brand-border)' }}>
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt={userName ?? 'Avatar'}
              className="w-9 h-9 rounded-xl object-cover shrink-0"
              style={{ border: '1.5px solid var(--brand-border)' }} />
          ) : (
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-white text-sm font-bold"
              style={{ background: 'var(--brand)' }}>
              {userName?.charAt(0)?.toUpperCase() ?? 'U'}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="text-xs font-bold truncate" style={{ color: 'var(--brand)' }}>
              Panel de Cliente
            </div>
            <div className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>
              {userName ?? 'Mi cuenta'}
            </div>
          </div>
          <div className="px-2 py-0.5 rounded-full text-xs font-bold shrink-0"
            style={{ background: 'var(--brand)', color: '#fff' }}>
            Cliente
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
              className={cn('flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all')}
              style={active ? {
                background: 'var(--brand-dim)',
                color: 'var(--brand)',
                border: '1px solid var(--brand-border)',
              } : {
                color: 'var(--text-secondary)',
              }}>
              <Icon size={16} className="shrink-0" />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Cambiar a modo Negocio */}
      <div className="px-4 pb-3" style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 16 }}>
        <Link href="/dashboard/host"
          onClick={() => setMobileOpen(false)}
          className="flex items-center gap-3 w-full px-4 py-3.5 rounded-2xl transition-all group"
          style={{
            background: 'var(--brand-navy)',
            color: '#fff',
            boxShadow: '0 2px 12px rgba(3,49,60,0.2)',
          }}>
          <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'rgba(255,255,255,0.12)' }}>
            <Building2 size={15} color="#fff" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-bold">Panel de Negocio</div>
            <div className="text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>Gestionar mis espacios</div>
          </div>
          <ArrowRight size={14} color="rgba(255,255,255,0.5)" />
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
      <aside className="hidden md:flex w-60 min-h-screen flex-col shrink-0"
        style={{ background: '#fff', borderRight: '1px solid var(--border-subtle)' }}>
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
        <Link href="/dashboard" className="flex-1 flex items-center">
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
              background: '#fff',
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
                <span className="text-[10px] font-semibold leading-none">{label}</span>
              </Link>
            )
          })}
        </div>
      </div>
    </>
  )
}
