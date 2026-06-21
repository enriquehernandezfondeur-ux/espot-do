'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getAdminNavCounts } from '@/lib/actions/admin'
import {
  LayoutDashboard, Building2, CalendarDays, Users,
  CreditCard, Settings, BarChart3, LogOut,
  ChevronRight, Shield, Banknote, Globe, Upload, Menu, X, MessageCircle, ShieldAlert, ClipboardList,
  Trash2, Wrench, Loader2, Crown,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type CountKey = 'espacios' | 'aplicaciones' | 'reservas' | 'disputas' | 'payouts'

interface NavItem {
  href:      string
  label:     string
  icon:      React.ElementType
  badgeKey?: CountKey
}

const sections: { label: string; items: NavItem[]; danger?: boolean }[] = [
  {
    label: 'Inicio',
    items: [
      { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
    ],
  },
  {
    label: 'Operación',
    items: [
      { href: '/admin/reservas',      label: 'Reservas',      icon: CalendarDays,   badgeKey: 'reservas' },
      { href: '/admin/aplicaciones',  label: 'Aplicaciones',  icon: ClipboardList,  badgeKey: 'aplicaciones' },
      { href: '/admin/espacios',      label: 'Espacios',      icon: Building2,       badgeKey: 'espacios' },
      { href: '/admin/usuarios',      label: 'Usuarios',      icon: Users },
      { href: '/admin/disputas',      label: 'Disputas',      icon: ShieldAlert,    badgeKey: 'disputas' },
      { href: '/admin/mensajes',      label: 'Mensajes',      icon: MessageCircle },
    ],
  },
  {
    label: 'Finanzas',
    items: [
      { href: '/admin/pagos',         label: 'Comisiones Espot',     icon: CreditCard },
      { href: '/admin/liquidaciones', label: 'Pagos a propietarios', icon: Banknote, badgeKey: 'payouts' },
    ],
  },
  {
    label: 'Suscripciones',
    items: [
      { href: '/admin/pro', label: 'Espot Pro', icon: Crown },
    ],
  },
  {
    label: 'Plataforma',
    items: [
      { href: '/admin/reportes',         label: 'Reportes',            icon: BarChart3 },
      { href: '/admin/configuracion',    label: 'Configuración',       icon: Settings },
    ],
  },
  {
    label: 'Avanzado',
    danger: true,
    items: [
      { href: '/admin/migracion',   label: 'Migración',        icon: Upload },
      { href: '/admin/cleanup',     label: 'Limpieza',         icon: Trash2 },
      { href: '/admin/fix-pricing', label: 'Corregir precios', icon: Wrench },
    ],
  },
]

function SidebarContent({ onClose }: { onClose?: () => void }) {
  const pathname    = usePathname()
  const router      = useRouter()
  const supabaseRef = useRef(createClient())
  const [adminName, setAdminName] = useState<string>('Admin')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [loggingOut, setLoggingOut] = useState(false)
  const [counts, setCounts] = useState<Record<CountKey, number> | null>(null)

  useEffect(() => {
    supabaseRef.current.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabaseRef.current.from('profiles').select('full_name, avatar_url').eq('id', user.id).single()
        .then(({ data }) => {
          if (data?.full_name) setAdminName(data.full_name.split(' ')[0])
          if (data?.avatar_url) setAvatarUrl(data.avatar_url)
        })
    })
    // Conteos para los badges del menú (lo pendiente de un vistazo)
    getAdminNavCounts().then(c => { if (c) setCounts(c) }).catch(() => {})
  }, [])

  async function handleLogout() {
    if (loggingOut) return
    setLoggingOut(true)
    await supabaseRef.current.auth.signOut()
    router.push('/')
  }

  return (
    <aside className="w-64 md:w-56 min-h-dvh flex flex-col" style={{ background: '#1E293B' }}>
      {/* Logo + close (mobile only) */}
      <div className="px-5 pt-6 pb-5 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <Link href="/admin" className="flex flex-col gap-1" onClick={onClose}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-green.svg" alt="Espot" style={{ height: 26, width: 'auto', display: 'block' }} />
          <div className="text-[10px] font-semibold uppercase tracking-widest"
            style={{ color: 'rgba(255,255,255,0.25)' }}>
            Admin Console
          </div>
        </Link>
        {onClose && (
          <button onClick={onClose} aria-label="Cerrar menú" className="md:hidden w-8 h-8 flex items-center justify-center rounded-lg"
            style={{ color: 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.06)' }}>
            <X size={16} />
          </button>
        )}
      </div>

      {/* Admin badge */}
      <div className="px-4 py-3">
        <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl"
          style={{ background: 'rgba(53,196,147,0.07)', border: '1px solid rgba(53,196,147,0.12)' }}>
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt={adminName}
              className="w-7 h-7 rounded-lg object-cover shrink-0"
              style={{ border: '1px solid rgba(53,196,147,0.3)' }} />
          ) : (
            <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: 'rgba(53,196,147,0.15)' }}>
              <Shield size={13} style={{ color: 'var(--brand)' }} />
            </div>
          )}
          <div className="min-w-0">
            <div className="text-xs font-bold text-white truncate">{adminName}</div>
            <div className="text-[10px]" style={{ color: 'rgba(255,255,255,0.35)' }}>Super Admin</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-2 space-y-5 overflow-y-auto">
        {sections.map(section => (
          <div key={section.label}>
            <div className="text-[10px] font-bold uppercase tracking-widest px-3 mb-1.5"
              style={{ color: section.danger ? 'rgba(248,113,113,0.5)' : 'rgba(255,255,255,0.2)' }}>
              {section.label}
            </div>
            <div className="space-y-0.5">
              {section.items.map(({ href, label, icon: Icon, badgeKey }) => {
                const isActive = pathname === href || (href !== '/admin' && pathname.startsWith(href))
                const badge = badgeKey && counts ? counts[badgeKey] : 0
                return (
                  <Link key={href} href={href} onClick={onClose}
                    aria-current={isActive ? 'page' : undefined}
                    className={cn('flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all hover:bg-white/5')}
                    style={isActive ? {
                      background: 'rgba(53,196,147,0.12)',
                      color: 'var(--brand)',
                      borderLeft: '2px solid var(--brand)',
                    } : { color: section.danger ? 'rgba(248,113,113,0.7)' : 'rgba(255,255,255,0.5)' }}>
                    <Icon size={14} className="shrink-0" />
                    <span className="flex-1">{label}</span>
                    {badge > 0 && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center"
                        style={{ background: 'var(--danger)', color: '#fff' }}>
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
        <Link href="/dashboard/overview" onClick={onClose}
          className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm transition-all"
          style={{ color: 'rgba(255,255,255,0.35)' }}>
          <Users size={14} />
          <span className="flex-1">Panel cliente</span>
          <ChevronRight size={11} />
        </Link>
        <button onClick={handleLogout} disabled={loggingOut}
          className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm w-full text-left transition-all disabled:opacity-60"
          style={{ color: 'rgba(255,255,255,0.25)' }}>
          {loggingOut ? <Loader2 size={14} className="animate-spin" /> : <LogOut size={14} />}
          {loggingOut ? 'Cerrando...' : 'Cerrar sesión'}
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
        style={{ background: '#1E293B', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <Link href="/admin" className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-green.svg" alt="Espot" style={{ height: 20, width: 'auto', display: 'block' }} />
          <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.4)' }}>Admin</span>
        </Link>
        <button onClick={() => setOpen(true)} aria-label="Abrir menú"
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
