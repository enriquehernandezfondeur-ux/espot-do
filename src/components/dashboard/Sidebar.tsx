'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  LayoutDashboard, Building2, CalendarDays, ClipboardList,
  MessageSquareQuote, MessageCircle, BarChart3, Settings,
  LogOut, Sparkles,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/dashboard/host',               label: 'Overview',      icon: LayoutDashboard },
  { href: '/dashboard/host/espacio',       label: 'Mi Espacio',    icon: Building2 },
  { href: '/dashboard/host/calendario',    label: 'Calendario',    icon: CalendarDays },
  { href: '/dashboard/host/reservas',      label: 'Reservas',      icon: ClipboardList,        badge: 'pending' },
  { href: '/dashboard/host/cotizaciones',  label: 'Cotizaciones',  icon: MessageSquareQuote,   badge: 'quotes' },
  { href: '/dashboard/host/mensajes',      label: 'Mensajes',      icon: MessageCircle },
  { href: '/dashboard/host/analytics',     label: 'Analytics',     icon: BarChart3 },
  { href: '/dashboard/host/ajustes',       label: 'Ajustes',       icon: Settings },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/auth')
  }

  return (
    <aside className="w-60 min-h-screen flex flex-col" style={{ background: 'var(--bg-surface)', borderRight: '1px solid var(--border-subtle)' }}>

      {/* Logo */}
      <div className="px-5 py-5 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm shadow-lg"
            style={{ background: 'var(--brand)', color: '#0B0F0E', boxShadow: '0 0 16px rgba(53,196,147,0.3)' }}>
            E
          </div>
          <div className="flex items-baseline gap-0.5">
            <span className="font-bold text-lg leading-none" style={{ color: 'var(--text-primary)' }}>espot</span>
            <span className="font-light text-lg leading-none" style={{ color: 'var(--brand)' }}>.do</span>
          </div>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-0.5">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || (href !== '/dashboard/host' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group',
              )}
              style={isActive ? {
                background: 'var(--brand-dim)',
                color: 'var(--brand)',
                border: '1px solid var(--brand-border)',
              } : {
                color: 'var(--text-secondary)',
              }}
              onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)' }}
              onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)' }}
            >
              <Icon size={16} className="shrink-0" />
              <span className="flex-1">{label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Bottom */}
      <div className="p-3 space-y-2">
        {/* Upgrade */}
        <div className="rounded-xl p-4" style={{ background: 'var(--brand-dim)', border: '1px solid var(--brand-border)' }}>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles size={14} style={{ color: 'var(--brand)' }} />
            <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Plan Pro</span>
          </div>
          <p className="text-xs mb-3" style={{ color: 'var(--text-secondary)' }}>Fotos ilimitadas y analytics avanzados.</p>
          <button className="w-full text-xs font-semibold py-1.5 rounded-lg transition-colors"
            style={{ background: 'var(--brand)', color: '#0B0F0E' }}>
            Mejorar plan
          </button>
        </div>

        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm w-full transition-all"
          style={{ color: 'var(--text-muted)' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#f87171' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)' }}
        >
          <LogOut size={16} />
          Cerrar sesión
        </button>
      </div>
    </aside>
  )
}
