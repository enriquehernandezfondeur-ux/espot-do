'use client'

import {
  LayoutDashboard, CalendarDays, Heart,
  CreditCard, User, MessageCircle, Building2,
} from 'lucide-react'
import AppSidebar from '@/components/shared/AppSidebar'

const navItems = [
  { href: '/dashboard/overview',   label: 'Inicio',       icon: LayoutDashboard },
  { href: '/dashboard/reservas',   label: 'Mis reservas', icon: CalendarDays },
  { href: '/dashboard/favoritos',  label: 'Favoritos',    icon: Heart },
  { href: '/dashboard/pagos',      label: 'Pagos',        icon: CreditCard },
  { href: '/dashboard/mensajes',   label: 'Mensajes',     icon: MessageCircle },
  { href: '/dashboard/perfil',     label: 'Mi perfil',    icon: User },
]

const mobileBottomNav = [
  { href: '/dashboard/overview',   label: 'Inicio',    icon: LayoutDashboard },
  { href: '/dashboard/reservas',   label: 'Reservas',  icon: CalendarDays },
  { href: '/dashboard/mensajes',   label: 'Mensajes',  icon: MessageCircle },
  { href: '/dashboard/perfil',     label: 'Perfil',    icon: User },
]

export default function ClientSidebar({ userName, avatarUrl }: { userName?: string; avatarUrl?: string }) {
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
    />
  )
}
