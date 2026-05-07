'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  LayoutDashboard, Building2, CalendarDays, Users,
  CreditCard, Settings, BarChart3, LogOut,
  ChevronRight, Shield, Banknote, Globe, Upload, Menu, X,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface NavItem {
  href:    string
  label:   string
  icon:    React.ElementType
  badge?:  number
}

const sections: { label: string; items: NavItem[] }[] = [
  {
    label: 'General',
    items: [
      { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
    ],
  },
  {
    label: 'Gestión',
    items: [
      { href: '/admin/espacios',      label: 'Espacios',      icon: Building2 },
      { href: '/admin/reservas',      label: 'Reservas',      icon: CalendarDays },
      { href: '/admin/usuarios',      label: 'Usuarios',      icon: Users },
      { href: '/admin/pagos',         label: 'Comisiones',    icon: CreditCard },
      { href: '/admin/payouts',       label: 'Payouts',       icon: Banknote },
      { href: '/admin/liquidaciones', label: 'Liquidaciones', icon: Banknote },
    ],
  },
  {
    label: 'Plataforma',
    items: [
      { href: '/admin/reportes',      label: 'Reportes',      icon: BarChart3 },
      { href: '/admin/migracion',     label: 'Migración',     icon: Upload },
      { href: '/admin/configuracion', label: 'Configuración', icon: Settings },
    ],
  },
]

function SidebarContent({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname()
  const router   = useRouter()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/')
  }

  return (
    <aside className="w-64 md:w-56 min-h-screen flex flex-col" style={{ background: '#0A1019' }}>
      {/* Logo + close (mobile only) */}
      <div className="px-5 pt-6 pb-5 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <Link href="/admin" className="flex items-center gap-2.5" onClick={onClose}>
          <div className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-sm"
            style={{ background: 'var(--brand)', color: '#0B0F0E' }}>
            E
          </div>
          <div>
            <div className="flex items-baseline gap-0.5">
              <span className="font-bold text-base leading-none text-white">espot</span>
              <span className="font-light text-base leading-none" style={{ color: 'var(--brand)' }}>.do</span>
            </div>
            <div className="text-[10px] mt-0.5 font-semibold uppercase tracking-widest"
              style={{ color: 'rgba(255,255,255,0.25)' }}>
              Admin Console
            </div>
          </div>
        </Link>
        {onClose && (
          <button onClick={onClose} className="md:hidden w-8 h-8 flex items-center justify-center rounded-lg"
            style={{ color: 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.06)' }}>
            <X size={16} />
          </button>
        )}
      </div>

      {/* Admin badge */}
      <div className="px-4 py-3">
        <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl"
          style={{ background: 'rgba(53,196,147,0.07)', border: '1px solid rgba(53,196,147,0.12)' }}>
          <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: 'rgba(53,196,147,0.15)' }}>
            <Shield size={13} style={{ color: 'var(--brand)' }} />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-bold text-white truncate">Enrique H.</div>
            <div className="text-[10px]" style={{ color: 'rgba(255,255,255,0.35)' }}>Super Admin</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-2 space-y-5 overflow-y-auto">
        {sections.map(section => (
          <div key={section.label}>
            <div className="text-[10px] font-bold uppercase tracking-widest px-3 mb-1.5"
              style={{ color: 'rgba(255,255,255,0.2)' }}>
              {section.label}
            </div>
            <div className="space-y-0.5">
              {section.items.map(({ href, label, icon: Icon, badge }) => {
                const isActive = pathname === href || (href !== '/admin' && pathname.startsWith(href))
                return (
                  <Link key={href} href={href} onClick={onClose}
                    className={cn('flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all')}
                    style={isActive ? {
                      background: 'rgba(53,196,147,0.12)',
                      color: '#35C493',
                      borderLeft: '2px solid #35C493',
                    } : { color: 'rgba(255,255,255,0.5)' }}>
                    <Icon size={14} className="shrink-0" />
                    <span className="flex-1">{label}</span>
                    {badge !== undefined && badge > 0 && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center"
                        style={{ background: '#EF4444', color: '#fff' }}>
                        {badge > 99 ? '99+' : badge}
                      </span>
                    )}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom */}
      <div className="px-3 pb-5 space-y-1" style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 14 }}>
        <Link href="/" target="_blank" onClick={onClose}
          className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm transition-all"
          style={{ color: 'rgba(255,255,255,0.35)' }}>
          <Globe size={14} />
          <span className="flex-1">Ver marketplace</span>
          <ChevronRight size={11} />
        </Link>
        <Link href="/dashboard/host" onClick={onClose}
          className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm transition-all"
          style={{ color: 'rgba(255,255,255,0.35)' }}>
          <Building2 size={14} />
          <span className="flex-1">Panel propietario</span>
          <ChevronRight size={11} />
        </Link>
        <button onClick={handleLogout}
          className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm w-full text-left transition-all"
          style={{ color: 'rgba(255,255,255,0.25)' }}>
          <LogOut size={14} />
          Cerrar sesión
        </button>
      </div>
    </aside>
  )
}

export default function AdminSidebar() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  // Cerrar al navegar
  useEffect(() => { setOpen(false) }, [pathname])

  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden md:flex">
        <SidebarContent />
      </div>

      {/* Mobile: top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 h-14"
        style={{ background: '#0A1019', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <Link href="/admin" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs"
            style={{ background: 'var(--brand)', color: '#0B0F0E' }}>E</div>
          <span className="font-bold text-sm text-white">Admin Console</span>
        </Link>
        <button onClick={() => setOpen(true)}
          className="w-9 h-9 flex items-center justify-center rounded-xl"
          style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.7)' }}>
          <Menu size={18} />
        </button>
      </div>

      {/* Mobile: drawer overlay */}
      {open && (
        <>
          <div className="md:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={() => setOpen(false)} />
          <div className="md:hidden fixed left-0 top-0 h-full z-50 slide-in-left overflow-hidden"
            style={{ boxShadow: '4px 0 24px rgba(0,0,0,0.4)' }}>
            <SidebarContent onClose={() => setOpen(false)} />
          </div>
        </>
      )}
    </>
  )
}
