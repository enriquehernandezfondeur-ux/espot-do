'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  LayoutDashboard, CalendarDays, Heart,
  CreditCard, User, MessageCircle, LogOut, Building2, ArrowRight,
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

export default function ClientSidebar({ userName }: { userName?: string }) {
  const pathname = usePathname()
  const router   = useRouter()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/')
  }

  return (
    <aside className="w-60 min-h-screen flex flex-col shrink-0"
      style={{ background: '#fff', borderRight: '1px solid var(--border-subtle)' }}>

      {/* Logo */}
      <div className="px-5 pt-5 pb-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        <Link href="/">
          <img src="/logo-dark.svg" alt="espot.do" style={{ height: 26, width: 'auto' }} />
        </Link>
      </div>

      {/* ── Indicador de modo actual ── */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-center gap-3 px-3 py-3 rounded-2xl"
          style={{ background: 'var(--brand-dim)', border: '1px solid var(--brand-border)' }}>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-white text-sm font-bold"
            style={{ background: 'var(--brand)' }}>
            {userName?.charAt(0)?.toUpperCase() ?? 'U'}
          </div>
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
          const isActive = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
          return (
            <Link key={href} href={href}
              className={cn('flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all')}
              style={isActive ? {
                background: 'var(--brand-dim)',
                color: 'var(--brand)',
                border: '1px solid var(--brand-border)',
              } : {
                color: 'var(--text-secondary)',
              }}>
              <Icon size={15} className="shrink-0" />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* ── Cambiar a modo Negocio ── */}
      <div className="px-4 pb-3" style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 16 }}>
        <Link href="/dashboard/host"
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
