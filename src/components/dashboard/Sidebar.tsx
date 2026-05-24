'use client'

import { useState, useEffect } from 'react'
import {
  LayoutDashboard, Building2, CalendarDays, ClipboardList,
  MessageSquareQuote, MessageCircle, BarChart3, Settings,
  LogOut, User, Banknote, Shield, Star, Search, TrendingUp,
  CalendarCheck, Users, CalendarRange,
} from 'lucide-react'
import AppSidebar from '@/components/shared/AppSidebar'
import { createClient } from '@/lib/supabase/client'
import { usePathname } from 'next/navigation'

const BASE_NAV = [
  { href: '/dashboard/host',              label: 'Overview',     icon: LayoutDashboard },
  { href: '/dashboard/host/espacio',      label: 'Mi espacio',   icon: Building2 },
  // Operaciones
  { href: '/dashboard/host/agenda',       label: 'Agenda',       icon: CalendarRange },
  { href: '/dashboard/host/calendario',   label: 'Calendario',   icon: CalendarDays },
  { href: '/dashboard/host/clientes',     label: 'Clientes',     icon: Users },
  // Ventas
  { href: '/dashboard/host/cotizaciones', label: 'Cotizaciones', icon: MessageSquareQuote },
  { href: '/dashboard/host/mensajes',     label: 'Mensajes',     icon: MessageCircle },
  { href: '/dashboard/host/resenas',      label: 'Reseñas',      icon: Star },
  // Dinero
  { href: '/dashboard/host/pagos',        label: 'Pagos',        icon: Banknote },
  { href: '/dashboard/host/finanzas',     label: 'Finanzas',     icon: BarChart3 },
  { href: '/dashboard/host/analytics',   label: 'Analytics',    icon: TrendingUp },
  // Config
  { href: '/dashboard/host/ajustes',      label: 'Ajustes',      icon: Settings },
]

const MOBILE_NAV = [
  { href: '/dashboard/host',          label: 'Overview', icon: LayoutDashboard },
  { href: '/dashboard/host/agenda',   label: 'Agenda',   icon: CalendarRange },
  { href: '/dashboard/host/clientes', label: 'Clientes', icon: Users },
  { href: '/dashboard/host/mensajes', label: 'Mensajes', icon: MessageCircle },
]

export default function Sidebar({ userName, avatarUrl, isAdmin }: { userName?: string; avatarUrl?: string; isAdmin?: boolean }) {
  const [unread,           setUnread]           = useState(0)
  const [reservasCount,    setReservasCount]    = useState(0)
  const [cotizCount,       setCotizCount]       = useState(0)
  const pathname = usePathname()

  // Helper: cuenta mensajes no leídos excluyendo conversaciones ocultas
  async function fetchUnread(supabase: ReturnType<typeof createClient>, userId: string) {
    const { data: hidden } = await supabase
      .from('conversation_hides').select('space_id').eq('user_id', userId)
    const hiddenIds = (hidden ?? []).map((h: any) => h.space_id as string)
    let q = supabase.from('messages').select('id', { count: 'exact', head: true })
      .eq('receiver_id', userId).is('read_at', null)
    if (hiddenIds.length > 0) q = q.not('space_id', 'in', `(${hiddenIds.join(',')})`)
    const { count } = await q
    return count ?? 0
  }

  // Limpiar badge cuando se leen mensajes (evento custom)
  useEffect(() => {
    function requery() {
      const supabase = createClient()
      supabase.auth.getUser().then(async ({ data: { user } }) => {
        if (!user) return
        setUnread(await fetchUnread(supabase, user.id))
      })
    }
    window.addEventListener('espot:messages-read', requery)
    return () => window.removeEventListener('espot:messages-read', requery)
  }, [])

  // Re-consultar conteos en cada navegación
  useEffect(() => {
    // En mensajes: poner a 0 inmediatamente, sin re-consultar
    if (pathname?.includes('/mensajes')) {
      setUnread(0)
      const supabase = createClient()
      supabase.auth.getUser().then(async ({ data: { user } }) => {
        if (!user) return
        const { data: spaces } = await supabase.from('spaces').select('id').eq('host_id', user.id)
        const spaceIds = spaces?.map((s: any) => s.id) ?? []
        if (spaceIds.length > 0) {
          supabase.from('bookings').select('id', { count: 'exact', head: true })
            .in('space_id', spaceIds).eq('status', 'pending')
            .then(({ count }) => setReservasCount(count ?? 0))
          supabase.from('bookings').select('id', { count: 'exact', head: true })
            .in('space_id', spaceIds).eq('status', 'quote_requested')
            .then(({ count }) => setCotizCount(count ?? 0))
        }
      })
      return
    }

    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      setUnread(await fetchUnread(supabase, user.id))
      if (pathname?.includes('/reservas'))     setReservasCount(0)
      if (pathname?.includes('/cotizaciones')) setCotizCount(0)
    })
  }, [pathname])

  useEffect(() => {
    const supabase = createClient()
    let cleanup: (() => void) | undefined

    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return

      // ── Espacios del host ────────────────────────────────
      const { data: spaces } = await supabase.from('spaces').select('id').eq('host_id', user.id)
      const spaceIds = spaces?.map(s => s.id) ?? []

      if (spaceIds.length > 0) {
        // Reservas pendientes de respuesta
        supabase.from('bookings').select('id', { count: 'exact', head: true })
          .in('space_id', spaceIds).eq('status', 'pending')
          .then(({ count }) => setReservasCount(count ?? 0))

        // Cotizaciones pendientes
        supabase.from('bookings').select('id', { count: 'exact', head: true })
          .in('space_id', spaceIds).eq('status', 'quote_requested')
          .then(({ count }) => setCotizCount(count ?? 0))
      }

      // ── Realtime: mensajes + bookings ────────────────────
      const ch1 = supabase.channel(`sidebar-msg:${user.id}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `receiver_id=eq.${user.id}` },
          () => setUnread(prev => prev + 1))
        .subscribe()

      const ch2 = supabase.channel(`sidebar-bk:${user.id}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'bookings' },
          async () => {
            if (spaceIds.length === 0) return
            const [{ count: r }, { count: q }] = await Promise.all([
              supabase.from('bookings').select('id', { count: 'exact', head: true }).in('space_id', spaceIds).eq('status', 'pending'),
              supabase.from('bookings').select('id', { count: 'exact', head: true }).in('space_id', spaceIds).eq('status', 'quote_requested'),
            ])
            setReservasCount(r ?? 0)
            setCotizCount(q ?? 0)
          })
        .subscribe()

      cleanup = () => { supabase.removeChannel(ch1); supabase.removeChannel(ch2) }
    })

    return () => cleanup?.()
  }, [])

  const navItems = BASE_NAV.map(item => {
    if (item.href === '/dashboard/host/mensajes')     return { ...item, badge: unread }
    if (item.href === '/dashboard/host/agenda')       return { ...item, badge: reservasCount }
    if (item.href === '/dashboard/host/cotizaciones') return { ...item, badge: cotizCount }
    return item
  })
  const mobileBottomNav = MOBILE_NAV.map(item => {
    if (item.href === '/dashboard/host/mensajes') return { ...item, badge: unread }
    if (item.href === '/dashboard/host/agenda')   return { ...item, badge: reservasCount }
    return item
  })

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
      mobileAvatarBg="#03313C"
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
      totalBadge={unread + reservasCount + cotizCount}
      notifications={[
        { label: 'Mensajes sin leer',     count: unread,        href: '/dashboard/host/mensajes' },
        { label: 'Reservas por aceptar',  count: reservasCount, href: '/dashboard/host/reservas' },
        { label: 'Cotizaciones nuevas',   count: cotizCount,    href: '/dashboard/host/cotizaciones' },
      ]}
    />
  )
}
