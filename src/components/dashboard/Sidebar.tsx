'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  LayoutDashboard, Building2, CalendarDays, ClipboardList,
  MessageSquareQuote, MessageCircle, BarChart3, Settings,
  LogOut, User,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/dashboard/host',              label: 'Overview',     icon: LayoutDashboard },
  { href: '/dashboard/host/espacio',      label: 'Mi espacio',   icon: Building2 },
  { href: '/dashboard/host/calendario',   label: 'Calendario',   icon: CalendarDays },
  { href: '/dashboard/host/reservas',     label: 'Reservas',     icon: ClipboardList },
  { href: '/dashboard/host/cotizaciones', label: 'Cotizaciones', icon: MessageSquareQuote },
  { href: '/dashboard/host/mensajes',     label: 'Mensajes',     icon: MessageCircle },
  { href: '/dashboard/host/finanzas',     label: 'Finanzas',     icon: BarChart3 },
  { href: '/dashboard/host/ajustes',      label: 'Ajustes',      icon: Settings },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router   = useRouter()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/auth')
  }

  return (
    <aside className="w-56 min-h-screen flex flex-col shrink-0"
      style={{ background: 'var(--bg-surface)', borderRight: '1px solid var(--border-subtle)' }}>

      {/* Logo */}
      <div className="px-5 pt-5 pb-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        <Link href="/">
          <img src="/logo-dark.svg" alt="espot.do" style={{ height: 28, width: 'auto' }} />
        </Link>
      </div>

      {/* ── SWITCH DE MODO ── */}
      <div className="px-3 py-3" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'var(--bg-elevated)' }}>
          {/* Cambiar a Cliente */}
          <Link href="/dashboard"
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors"
            style={{ color: 'var(--text-muted)' }}>
            <User size={12} /> Cliente
          </Link>
          {/* Modo activo: Negocio */}
          <div className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold"
            style={{ background: 'var(--bg-surface)', color: 'var(--brand)', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <Building2 size={12} /> Negocio
          </div>
        </div>
      </div>

      {/* Indicador de modo */}
      <div className="px-3 py-3">
        <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl"
          style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: 'var(--brand-dim)' }}>
            <Building2 size={14} style={{ color: 'var(--brand)' }} />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>Panel de negocio</div>
            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Modo propietario</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 pb-4 space-y-0.5">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || (href !== '/dashboard/host' && pathname.startsWith(href))
          return (
            <Link key={href} href={href}
              className={cn('flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all')}
              style={isActive ? {
                background: 'var(--brand-dim)',
                color: 'var(--brand)',
                border: '1px solid var(--brand-border)',
              } : {
                color: 'var(--text-secondary)',
              }}
              onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)' }}
              onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)' }}>
              <Icon size={15} className="shrink-0" />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Logout */}
      <div className="px-3 pb-5 pt-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
        <button onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm w-full text-left transition-all"
          style={{ color: 'var(--text-muted)' }}
          onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = '#f87171')}
          onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = 'var(--text-muted)')}>
          <LogOut size={15} />
          Cerrar sesión
        </button>
      </div>
    </aside>
  )
}
