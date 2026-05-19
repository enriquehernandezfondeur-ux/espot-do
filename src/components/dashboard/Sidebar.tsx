'use client'

import {
  LayoutDashboard, Building2, CalendarDays, ClipboardList,
  MessageSquareQuote, MessageCircle, BarChart3, Settings,
  LogOut, User, Banknote, Shield, Star, Search, TrendingUp,
} from 'lucide-react'
import AppSidebar from '@/components/shared/AppSidebar'

const navItems = [
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

const mobileBottomNav = [
  { href: '/dashboard/host',            label: 'Overview',   icon: LayoutDashboard },
  { href: '/dashboard/host/calendario', label: 'Calendario', icon: CalendarDays },
  { href: '/dashboard/host/reservas',   label: 'Reservas',   icon: ClipboardList },
  { href: '/dashboard/host/mensajes',   label: 'Mensajes',   icon: MessageCircle },
]

export default function Sidebar({ userName, avatarUrl, isAdmin }: { userName?: string; avatarUrl?: string; isAdmin?: boolean }) {
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
