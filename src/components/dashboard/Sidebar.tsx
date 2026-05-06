'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  LayoutDashboard, Building2, CalendarDays, ClipboardList,
  MessageSquareQuote, MessageCircle, BarChart3, Settings,
  LogOut, User, ArrowRight, Banknote, Shield, Menu, X,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/dashboard/host',              label: 'Overview',     icon: LayoutDashboard },
  { href: '/dashboard/host/espacio',      label: 'Mi espacio',   icon: Building2 },
  { href: '/dashboard/host/calendario',   label: 'Calendario',   icon: CalendarDays },
  { href: '/dashboard/host/reservas',     label: 'Reservas',     icon: ClipboardList },
  { href: '/dashboard/host/cotizaciones', label: 'Cotizaciones', icon: MessageSquareQuote },
  { href: '/dashboard/host/mensajes',     label: 'Mensajes',     icon: MessageCircle },
  { href: '/dashboard/host/pagos',        label: 'Pagos',        icon: Banknote },
  { href: '/dashboard/host/finanzas',     label: 'Finanzas',     icon: BarChart3 },
  { href: '/dashboard/host/ajustes',      label: 'Ajustes',      icon: Settings },
]

// Ítems para la barra inferior móvil (los más usados)
const mobileBottomNav = [
  { href: '/dashboard/host',            label: 'Overview',   icon: LayoutDashboard },
  { href: '/dashboard/host/calendario', label: 'Calendario', icon: CalendarDays },
  { href: '/dashboard/host/reservas',   label: 'Reservas',   icon: ClipboardList },
  { href: '/dashboard/host/mensajes',   label: 'Mensajes',   icon: MessageCircle },
]

export default function Sidebar({ userName, avatarUrl, isAdmin }: { userName?: string; avatarUrl?: string; isAdmin?: boolean }) {
  const pathname  = usePathname()
  const router    = useRouter()
  const supabase  = createClient()
  const [mobileOpen, setMobileOpen] = useState(false)

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/auth')
  }

  function isActive(href: string) {
    return pathname === href || (href !== '/dashboard/host' && pathname.startsWith(href))
  }

  const SidebarInner = () => (
    <>
      {/* Logo */}
      <div className="px-5 pt-5 pb-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        <div className="flex items-center justify-between">
          <Link href="/" onClick={() => setMobileOpen(false)}>
            <img src="/logo-dark.svg" alt="espot.do" style={{ height: 26, width: 'auto' }} />
          </Link>
          {/* Cerrar drawer en móvil */}
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
          style={{ background: 'var(--brand-navy)', color: '#fff' }}>
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt={userName ?? 'Avatar'}
              className="w-9 h-9 rounded-xl object-cover shrink-0"
              style={{ border: '1.5px solid rgba(53,196,147,0.4)' }} />
          ) : (
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-white text-sm font-bold"
              style={{ background: 'rgba(255,255,255,0.12)' }}>
              {userName?.charAt(0)?.toUpperCase() ?? <Building2 size={16} color="#fff" />}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="text-xs font-bold text-white truncate">{userName ?? 'Propietario'}</div>
            <div className="text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>Panel de Negocio</div>
          </div>
          <div className="px-2 py-0.5 rounded-full text-xs font-bold shrink-0"
            style={{ background: 'var(--brand)', color: '#fff' }}>
            Negocio
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
              }}
              onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)' }}
              onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)' }}>
              <Icon size={16} className="shrink-0" />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Cambiar a modo Cliente */}
      <div className="px-4 pb-3" style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 16 }}>
        <Link href="/dashboard"
          onClick={() => setMobileOpen(false)}
          className="flex items-center gap-3 w-full px-4 py-3.5 rounded-2xl transition-all"
          style={{
            background: 'var(--bg-elevated)',
            border: '1.5px solid var(--border-medium)',
            color: 'var(--text-secondary)',
          }}>
          <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'var(--bg-hover)' }}>
            <User size={15} style={{ color: 'var(--text-secondary)' }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>Panel de Cliente</div>
            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Ver mis reservas</div>
          </div>
          <ArrowRight size={14} style={{ color: 'var(--text-muted)' }} />
        </Link>
      </div>

      {/* Admin Console */}
      {isAdmin && (
        <div className="px-4 pb-3">
          <Link href="/admin"
            onClick={() => setMobileOpen(false)}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-2xl transition-all"
            style={{
              background: 'rgba(3,49,60,0.06)',
              border: '1.5px solid rgba(3,49,60,0.12)',
              color: 'var(--brand-navy)',
            }}>
            <div className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'var(--brand-navy)' }}>
              <Shield size={13} color="#fff" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold" style={{ color: 'var(--brand-navy)' }}>Admin Console</div>
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Panel de administrador</div>
            </div>
            <ArrowRight size={13} style={{ color: 'var(--text-muted)' }} />
          </Link>
        </div>
      )}

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
      {/* ── DESKTOP: Sidebar fijo a la izquierda ── */}
      <aside className="hidden md:flex w-60 min-h-screen flex-col shrink-0"
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
        <Link href="/dashboard/host" className="flex-1 flex items-center">
          <img src="/logo-dark.svg" alt="espot.do" style={{ height: 22, width: 'auto' }} />
        </Link>
        {/* Avatar */}
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl} alt={userName ?? 'Avatar'}
            className="w-8 h-8 rounded-xl object-cover shrink-0"
            style={{ border: '2px solid var(--brand)' }} />
        ) : (
          <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-bold shrink-0"
            style={{ background: 'var(--brand-navy)' }}>
            {userName?.charAt(0)?.toUpperCase() ?? 'N'}
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
              boxShadow: '4px 0 32px rgba(0,0,0,0.15)',
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
                <span className="text-[10px] font-semibold leading-none">{label}</span>
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
            <span className="text-[10px] font-semibold leading-none">Más</span>
          </button>
        </div>
      </div>
    </>
  )
}
