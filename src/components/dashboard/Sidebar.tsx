'use client'

import { useState, useEffect } from 'react'
import {
  LayoutDashboard, Building2, CalendarDays, ClipboardList,
  MessageSquareQuote, MessageCircle, BarChart3, Settings,
  LogOut, User, Banknote, Shield, Star, Search, TrendingUp,
} from 'lucide-react'
import AppSidebar from '@/components/shared/AppSidebar'
import { createClient } from '@/lib/supabase/client'
import { usePathname } from 'next/navigation'

const BASE_NAV = [
  { href: '/dashboard/host',              label: 'Overview',     icon: LayoutDashboard },
  { href: '/dashboard/host/espacio',      label: 'Mi espacio',   icon: Building2 },
  { href: '/dashboard/host/calendario',   label: 'Calendario',   icon: CalendarDays },
  { href: '/dashboard/host/reservas',     label: 'Reservas',     icon: ClipboardList },
  { href: '/dashboard/host/cotizaciones', label: 'Cotizaciones', icon: MessageSquareQuote },
  { href: '/dashboard/host/mensajes',     label: 'Mensajes',     icon: MessageCircle },
  { href: '/dashboard/host/resenas',      label: 'Reseñas',      icon: Star },
  { href: '/dashboard/host/pagos',        label: 'Pagos',        icon: Banknote },
  { href: '/dashboard/host/finanzas',     label: 'Finanzas',     icon: BarChart3 },
  { href: '/dashboard/host/analytics',   label: 'Analytics',    icon: TrendingUp },
  { href: '/dashboard/host/ajustes',      label: 'Ajustes',      icon: Settings },
]

const MOBILE_NAV = [
  { href: '/dashboard/host',            label: 'Overview',   icon: LayoutDashboard },
  { href: '/dashboard/host/calendario', label: 'Calendario', icon: CalendarDays },
  { href: '/dashboard/host/reservas',   label: 'Reservas',   icon: ClipboardList },
  { href: '/dashboard/host/mensajes',   label: 'Mensajes',   icon: MessageCircle },
]

export default function Sidebar({ userName, avatarUrl, isAdmin }: { userName?: string; avatarUrl?: string; isAdmin?: boolean }) {
  const [unread, setUnread] = useState(0)
  const pathname = usePathname()

  // Resetear al entrar a mensajes
  useEffect(() => {
    if (pathname?.includes('/mensajes')) setUnread(0)
  }, [pathname])

  useEffect(() => {
    const supabase = createClient()
    let cleanup: (() => void) | undefined

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return

      // Conteo inicial
      supabase.from('messages').select('id', { count: 'exact', head: true })
        .eq('receiver_id', user.id).is('read_at', null)
        .then(({ count }) => setUnread(count ?? 0))

      // Realtime: nuevo mensaje
      const channel = supabase
        .channel(`sidebar-unread:${user.id}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `receiver_id=eq.${user.id}` },
          () => setUnread(prev => prev + 1))
        .subscribe()

      cleanup = () => supabase.removeChannel(channel)
    })

    return () => cleanup?.()
  }, [])

  const navItems = BASE_NAV.map(item =>
    item.href === '/dashboard/host/mensajes' ? { ...item, badge: unread } : item
  )
  const mobileBottomNav = MOBILE_NAV.map(item =>
    item.href === '/dashboard/host/mensajes' ? { ...item, badge: unread } : item
  )

  return (
    <AppSidebar
      userName={userName}
      avatarUrl={avatarUrl}
      isAdmin={isAdmin}
      navItems={navItems}
      mobileBottomNav={mobileBottomNav}
      roleLabel="Propietario"
      userNameFallback="Propietario"
      avatarFallback={<Building2 size={14} />}
      mobileAvatarBg="var(--brand-navy)"
      mobileAvatarChar="N"
      mobileLogoHref="/dashboard/host"
      crossPanelHref="/dashboard/overview"
      crossPanelLabel="Panel de Cliente"
      crossPanelIcon={User}
      logoutRedirect="/auth"
      logoutRoundedClass="rounded-lg"
      drawerShadow="4px 0 32px rgba(0,0,0,0.12)"
      isActiveVariant="host"
      navHoverHandlers={true}
    />
  )
}
