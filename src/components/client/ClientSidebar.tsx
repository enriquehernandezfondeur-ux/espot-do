'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  LayoutDashboard, CalendarDays, Heart,
  CreditCard, User, MessageCircle, LogOut,
  Building2, ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/dashboard',          label: 'Inicio',        icon: LayoutDashboard },
  { href: '/dashboard/reservas', label: 'Mis reservas',  icon: CalendarDays },
  { href: '/dashboard/favoritos',label: 'Favoritos',     icon: Heart },
  { href: '/dashboard/pagos',    label: 'Pagos',         icon: CreditCard },
  { href: '/dashboard/mensajes', label: 'Mensajes',      icon: MessageCircle },
  { href: '/dashboard/perfil',   label: 'Mi perfil',     icon: User },
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
      <div className="px-5 pt-6 pb-5" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-sm text-white"
            style={{ background: 'var(--brand)', boxShadow: '0 2px 8px rgba(53,196,147,0.3)' }}>
            E
          </div>
          <div className="flex items-baseline gap-0.5">
            <span className="font-bold text-lg leading-none" style={{ color: 'var(--text-primary)' }}>espot</span>
            <span className="font-light text-lg leading-none" style={{ color: 'var(--brand)' }}>.do</span>
          </div>
        </Link>
      </div>

      {/* User greeting */}
      <div className="px-4 py-4">
        <div className="flex items-center gap-3 px-3 py-3 rounded-2xl"
          style={{ background: 'var(--bg-base)', border: '1px solid var(--border-subtle)' }}>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0"
            style={{ background: 'linear-gradient(135deg, var(--brand), var(--brand-dark))' }}>
            {userName?.charAt(0)?.toUpperCase() ?? 'U'}
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
              {userName ?? 'Mi cuenta'}
            </div>
            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Cliente</div>
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
              <Icon size={16} className="shrink-0" />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Bottom actions */}
      <div className="px-3 pb-6 space-y-1" style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 16 }}>
        <Link href="/dashboard/host"
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
          style={{ color: 'var(--text-secondary)' }}>
          <Building2 size={16} />
          Panel propietario
          <ChevronRight size={13} className="ml-auto" />
        </Link>
        <button onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm w-full text-left transition-all"
          style={{ color: 'var(--text-muted)' }}>
          <LogOut size={16} />
          Cerrar sesión
        </button>
      </div>
    </aside>
  )
}
