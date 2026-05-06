'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  LayoutDashboard, CalendarDays, Heart,
  CreditCard, User, MessageCircle, LogOut, Building2,
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
    <aside className="w-56 min-h-screen flex flex-col shrink-0"
      style={{ background: '#fff', borderRight: '1px solid var(--border-subtle)' }}>

      {/* Logo */}
      <div className="px-5 pt-5 pb-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        <Link href="/">
          <img src="/logo-dark.svg" alt="espot.do" style={{ height: 28, width: 'auto' }} />
        </Link>
      </div>

      {/* ── SWITCH DE MODO ── */}
      <div className="px-3 py-3" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'var(--bg-base)' }}>
          {/* Modo activo: Cliente */}
          <div className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold"
            style={{ background: '#fff', color: 'var(--brand)', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
            <User size={12} /> Cliente
          </div>
          {/* Cambiar a Propietario */}
          <Link href="/dashboard/host"
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors"
            style={{ color: 'var(--text-muted)' }}>
            <Building2 size={12} /> Negocio
          </Link>
        </div>
      </div>

      {/* Usuario */}
      <div className="px-3 py-3">
        <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl"
          style={{ background: 'var(--bg-base)', border: '1px solid var(--border-subtle)' }}>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0"
            style={{ background: 'var(--brand)' }}>
            {userName?.charAt(0)?.toUpperCase() ?? 'U'}
          </div>
          <div className="min-w-0">
            <div className="text-xs font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
              {userName ?? 'Mi cuenta'}
            </div>
            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Modo cliente</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 pb-4 space-y-0.5">
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

      {/* Logout */}
      <div className="px-3 pb-5 pt-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
        <button onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm w-full text-left transition-all"
          style={{ color: 'var(--text-muted)' }}>
          <LogOut size={15} />
          Cerrar sesión
        </button>
      </div>
    </aside>
  )
}
