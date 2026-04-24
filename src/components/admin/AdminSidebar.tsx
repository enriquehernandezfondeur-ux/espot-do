'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  LayoutDashboard, Building2, CalendarDays, Users,
  CreditCard, Settings, BarChart3, LogOut,
  ChevronRight, Shield,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const sections = [
  {
    label: 'General',
    items: [
      { href: '/admin',                label: 'Dashboard',   icon: LayoutDashboard },
    ],
  },
  {
    label: 'Gestión',
    items: [
      { href: '/admin/espacios',       label: 'Espacios',    icon: Building2 },
      { href: '/admin/reservas',       label: 'Reservas',    icon: CalendarDays },
      { href: '/admin/usuarios',       label: 'Usuarios',    icon: Users },
      { href: '/admin/pagos',          label: 'Pagos',       icon: CreditCard },
    ],
  },
  {
    label: 'Plataforma',
    items: [
      { href: '/admin/reportes',       label: 'Reportes',    icon: BarChart3 },
      { href: '/admin/configuracion',  label: 'Configuración',icon: Settings },
    ],
  },
]

export default function AdminSidebar() {
  const pathname = usePathname()
  const router   = useRouter()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/')
  }

  return (
    <aside className="w-56 min-h-screen flex flex-col shrink-0" style={{ background: '#0F1623' }}>

      {/* Logo */}
      <div className="px-5 pt-6 pb-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <Link href="/admin" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-sm"
            style={{ background: 'var(--brand)', color: '#0B0F0E', boxShadow: '0 2px 8px rgba(53,196,147,0.3)' }}>
            E
          </div>
          <div>
            <div className="flex items-baseline gap-0.5">
              <span className="font-bold text-base leading-none text-white">espot</span>
              <span className="font-light text-base leading-none" style={{ color: 'var(--brand)' }}>.do</span>
            </div>
            <div className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>Admin</div>
          </div>
        </Link>
      </div>

      {/* Badge admin */}
      <div className="px-4 py-3">
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl"
          style={{ background: 'rgba(53,196,147,0.08)', border: '1px solid rgba(53,196,147,0.15)' }}>
          <Shield size={13} style={{ color: 'var(--brand)' }} />
          <span className="text-xs font-semibold" style={{ color: 'var(--brand)' }}>Super Admin</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-2 space-y-5 overflow-y-auto">
        {sections.map(section => (
          <div key={section.label}>
            <div className="text-xs font-semibold uppercase tracking-widest px-3 mb-2"
              style={{ color: 'rgba(255,255,255,0.25)' }}>
              {section.label}
            </div>
            <div className="space-y-0.5">
              {section.items.map(({ href, label, icon: Icon }) => {
                const isActive = pathname === href || (href !== '/admin' && pathname.startsWith(href))
                return (
                  <Link key={href} href={href}
                    className={cn('flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all')}
                    style={isActive ? {
                      background: 'rgba(53,196,147,0.12)',
                      color: 'var(--brand)',
                    } : {
                      color: 'rgba(255,255,255,0.55)',
                    }}>
                    <Icon size={15} className="shrink-0" />
                    {label}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom */}
      <div className="px-3 pb-5 space-y-1" style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 16 }}>
        <Link href="/dashboard/host"
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all"
          style={{ color: 'rgba(255,255,255,0.4)' }}>
          <Building2 size={15} />
          Panel propietario
          <ChevronRight size={12} className="ml-auto" />
        </Link>
        <button onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm w-full text-left transition-all"
          style={{ color: 'rgba(255,255,255,0.3)' }}>
          <LogOut size={15} />
          Cerrar sesión
        </button>
      </div>
    </aside>
  )
}
