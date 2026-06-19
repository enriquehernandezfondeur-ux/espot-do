'use client'

import { useState, useEffect } from 'react'
import {
  LayoutDashboard, Building2, CalendarDays, ClipboardList,
  MessageSquareQuote, MessageCircle, BarChart3, Settings,
  LogOut, User, Shield, Star, Search, TrendingUp,
  CalendarCheck, Users, CalendarRange, UserPlus,
} from 'lucide-react'
import AppSidebar from '@/components/shared/AppSidebar'
import { createClient } from '@/lib/supabase/client'
import { todayInRD } from '@/lib/utils'
import { usePathname } from 'next/navigation'

const BASE_NAV = [
  { href: '/dashboard/host',              label: 'Inicio',       icon: LayoutDashboard },
  { href: '/dashboard/host/espacio',      label: 'Mi espacio',   icon: Building2 },
  // Operaciones
  { href: '/dashboard/host/agenda',       label: 'Reservas',     icon: CalendarRange },
  { href: '/dashboard/host/calendario',   label: 'Calendario',   icon: CalendarDays },
  { href: '/dashboard/host/clientes',     label: 'Clientes',     icon: Users },
  // Ventas
  { href: '/dashboard/host/cotizaciones', label: 'Cotizaciones', icon: MessageSquareQuote },
  { href: '/dashboard/host/mensajes',     label: 'Mensajes',     icon: MessageCircle },
  { href: '/dashboard/host/resenas',      label: 'Reseñas',      icon: Star },
  // Dinero
  { href: '/dashboard/host/finanzas',     label: 'Finanzas',     icon: BarChart3 },
  { href: '/dashboard/host/analytics',   label: 'Analytics',    icon: TrendingUp },
  // Config
  { href: '/dashboard/host/equipo',       label: 'Equipo',       icon: UserPlus },
  { href: '/dashboard/host/ajustes',      label: 'Ajustes',      icon: Settings },
]

const MOBILE_NAV = [
  { href: '/dashboard/host',          label: 'Inicio',   icon: LayoutDashboard },
  { href: '/dashboard/host/agenda',   label: 'Reservas', icon: CalendarRange },
  { href: '/dashboard/host/clientes', label: 'Clientes', icon: Users },
  { href: '/dashboard/host/mensajes', label: 'Mensajes', icon: MessageCircle },
]

export default function Sidebar({ userName, avatarUrl, isAdmin, isOwner = true, teamRole }: {
  userName?: string
  avatarUrl?: string
  isAdmin?: boolean
  isOwner?: boolean
  teamRole?: string
}) {
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
            .in('space_id', spaceIds).eq('status', 'pending').gte('event_date', todayInRD())
            .then(({ count }) => setReservasCount(count ?? 0))
          supabase.from('bookings').select('id', { count: 'exact', head: true })
            .in('space_id', spaceIds).eq('status', 'quote_requested').gte('event_date', todayInRD())
            .then(({ count }) => setCotizCount(count ?? 0))
        }
      })
      return
    }

    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      setUnread(await fetchUnread(supabase, user.id))
      if (pathname?.includes('/agenda'))       setReservasCount(0)
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
          .in('space_id', spaceIds).eq('status', 'pending').gte('event_date', todayInRD())
          .then(({ count }) => setReservasCount(count ?? 0))

        // Cotizaciones pendientes
        supabase.from('bookings').select('id', { count: 'exact', head: true })
          .in('space_id', spaceIds).eq('status', 'quote_requested').gte('event_date', todayInRD())
          .then(({ count }) => setCotizCount(count ?? 0))
      }

      // ── Realtime: mensajes + bookings ────────────────────
      const ch1 = supabase.channel(`sidebar-msg:${user.id}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `receiver_id=eq.${user.id}` },
          async () => setUnread(await fetchUnread(supabase, user.id)))
        .subscribe()

      const ch2 = supabase.channel(`sidebar-bk:${user.id}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'bookings' },
          async () => {
            if (spaceIds.length === 0) return
            const [{ count: r }, { count: q }] = await Promise.all([
              supabase.from('bookings').select('id', { count: 'exact', head: true }).in('space_id', spaceIds).eq('status', 'pending').gte('event_date', todayInRD()),
              supabase.from('bookings').select('id', { count: 'exact', head: true }).in('space_id', spaceIds).eq('status', 'quote_requested').gte('event_date', todayInRD()),
            ])
            setReservasCount(r ?? 0)
            setCotizCount(q ?? 0)
          })
        .subscribe()

      cleanup = () => { supabase.removeChannel(ch1); supabase.removeChannel(ch2) }
    })

    return () => cleanup?.()
  }, [])

  // Filtrar Equipo solo para owners (no para team members)
  const filteredNav = isOwner ? BASE_NAV : BASE_NAV.filter(i => i.href !== '/dashboard/host/equipo')

  const navItems = filteredNav.map(item => {
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
      roleLabel={isOwner ? 'Negocio' : teamRole === 'admin' ? 'Admin' : teamRole === 'coordinador' ? 'Coordinador' : 'Equipo'}
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
        { label: 'Reservas por aceptar',  count: reservasCount, href: '/dashboard/host/agenda' },
        { label: 'Cotizaciones nuevas',   count: cotizCount,    href: '/dashboard/host/cotizaciones' },
      ]}
    />
  )
}
