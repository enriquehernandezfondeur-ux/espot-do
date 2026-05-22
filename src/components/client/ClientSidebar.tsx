'use client'

import { useState, useEffect } from 'react'
import {
  LayoutDashboard, CalendarDays, Heart,
  CreditCard, User, MessageCircle, Building2,
} from 'lucide-react'
import AppSidebar from '@/components/shared/AppSidebar'
import { createClient } from '@/lib/supabase/client'
import { usePathname } from 'next/navigation'

const BASE_NAV = [
  { href: '/dashboard/overview',   label: 'Inicio',       icon: LayoutDashboard },
  { href: '/dashboard/reservas',   label: 'Mis reservas', icon: CalendarDays },
  { href: '/dashboard/favoritos',  label: 'Favoritos',    icon: Heart },
  { href: '/dashboard/pagos',      label: 'Pagos',        icon: CreditCard },
  { href: '/dashboard/mensajes',   label: 'Mensajes',     icon: MessageCircle },
  { href: '/dashboard/perfil',     label: 'Mi perfil',    icon: User },
]

const MOBILE_NAV = [
  { href: '/dashboard/overview',   label: 'Inicio',    icon: LayoutDashboard },
  { href: '/dashboard/reservas',   label: 'Reservas',  icon: CalendarDays },
  { href: '/dashboard/mensajes',   label: 'Mensajes',  icon: MessageCircle },
  { href: '/dashboard/perfil',     label: 'Perfil',    icon: User },
]

export default function ClientSidebar({ userName, avatarUrl }: { userName?: string; avatarUrl?: string }) {
  const [unread,        setUnread]        = useState(0)
  const [pendingPay,    setPendingPay]    = useState(0)
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
      return
    }

    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      setUnread(await fetchUnread(supabase, user.id))
      if (pathname?.includes('/reservas')) setPendingPay(0)
    })
  }, [pathname])

  useEffect(() => {
    const supabase = createClient()
    let cleanup: (() => void) | undefined

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return

      // Reservas aceptadas pendientes de pago
      supabase.from('bookings').select('id', { count: 'exact', head: true })
        .eq('guest_id', user.id).eq('status', 'accepted').eq('payment_status', 'unpaid')
        .then(({ count }) => setPendingPay(count ?? 0))

      // Realtime mensajes
      const ch1 = supabase.channel(`client-msg:${user.id}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `receiver_id=eq.${user.id}` },
          () => setUnread(prev => prev + 1))
        .subscribe()

      // Realtime bookings (pagos)
      const ch2 = supabase.channel(`client-bk:${user.id}`)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'bookings', filter: `guest_id=eq.${user.id}` },
          () => supabase.from('bookings').select('id', { count: 'exact', head: true })
            .eq('guest_id', user.id).eq('status', 'accepted').eq('payment_status', 'unpaid')
            .then(({ count }) => setPendingPay(count ?? 0)))
        .subscribe()

      cleanup = () => { supabase.removeChannel(ch1); supabase.removeChannel(ch2) }
    })
    return () => cleanup?.()
  }, [])

  const navItems = BASE_NAV.map(item => {
    if (item.href === '/dashboard/mensajes') return { ...item, badge: unread }
    if (item.href === '/dashboard/reservas') return { ...item, badge: pendingPay }
    return item
  })
  const mobileBottomNav = MOBILE_NAV.map(item => {
    if (item.href === '/dashboard/mensajes') return { ...item, badge: unread }
    if (item.href === '/dashboard/reservas') return { ...item, badge: pendingPay }
    return item
  })

  return (
    <AppSidebar
      userName={userName}
      avatarUrl={avatarUrl}
      navItems={navItems}
      mobileBottomNav={mobileBottomNav}
      roleLabel="Cliente"
      userNameFallback="Mi cuenta"
      avatarFallback="U"
      mobileAvatarBg="var(--brand)"
      mobileAvatarChar="U"
      mobileLogoHref="/dashboard/overview"
      crossPanelHref="/dashboard/host"
      crossPanelLabel="Panel de Negocio"
      crossPanelIcon={Building2}
      logoutRedirect="/"
      logoutRoundedClass="rounded-xl"
      drawerShadow="4px 0 32px rgba(0,0,0,0.15)"
      isActiveVariant="client"
      navHoverHandlers={false}
      totalBadge={unread + pendingPay}
      notifications={[
        { label: 'Mensajes sin leer',    count: unread,      href: '/dashboard/mensajes' },
        { label: 'Pagos pendientes',     count: pendingPay,  href: '/dashboard/reservas' },
      ]}
    />
  )
}
