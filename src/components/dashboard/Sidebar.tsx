'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  LayoutDashboard, Building2, CalendarDays, ClipboardList,
  MessageSquareQuote, MessageCircle, BarChart3, Settings,
  LogOut, User, ArrowRight, Banknote,
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

export default function Sidebar({ userName, avatarUrl }: { userName?: string; avatarUrl?: string }) {
  const pathname = usePathname()
  const router   = useRouter()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/auth')
  }

  return (
    <aside className="w-60 min-h-screen flex flex-col shrink-0"
      style={{ background: 'var(--bg-surface)', borderRight: '1px solid var(--border-subtle)' }}>

      {/* Logo */}
      <div className="px-5 pt-5 pb-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        <Link href="/">
          <img src="/logo-dark.svg" alt="espot.do" style={{ height: 26, width: 'auto' }} />
        </Link>
      </div>

      {/* ── Indicador de modo actual ── */}
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

      {/* ── Cambiar a modo Cliente ── */}
      <div className="px-4 pb-3" style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 16 }}>
        <Link href="/dashboard"
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

      {/* Logout */}
      <div className="px-3 pb-5">
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
