import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/dashboard/Sidebar'
import MessageNotificationProvider from '@/components/providers/MessageNotificationProvider'
import { resolveHostId } from '@/lib/actions/_resolveHost'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth')

  const { hostId, isOwner, role: teamRole } = await resolveHostId(supabase, user.id)

  // El perfil que se muestra en el sidebar es el del usuario actual
  const { data: profile } = await supabase
    .from('profiles').select('full_name, avatar_url, role, host_status').eq('id', user.id).single()

  // Si es team member, verificar que el host al que pertenece existe
  if (!isOwner) {
    const { data: hostProfile } = await supabase
      .from('profiles').select('id, role').eq('id', hostId).single()
    if (!hostProfile || hostProfile.role !== 'host') redirect('/auth')
  }

  // Si es propietario, verificar que está aprobado
  if (isOwner) {
    const hs = profile?.host_status
    if (!hs || hs === 'none') redirect('/aplicar')
    if (hs !== 'approved' && profile?.role !== 'host') redirect('/dashboard/host/solicitud')
  }

  const isAdmin = user.email === (process.env.SUPERADMIN_EMAIL ?? 'enriquehernandezfondeur@gmail.com')

  const userName  = profile?.full_name ?? user.email?.split('@')[0]
  const avatarUrl = profile?.avatar_url ?? undefined

  return (
    <div className="host-theme flex min-h-dvh" style={{ background: 'var(--bg-base)', color: 'var(--text-primary)' }}>
      <MessageNotificationProvider />
      <Sidebar
        userName={userName}
        avatarUrl={avatarUrl}
        isAdmin={isAdmin}
        isOwner={isOwner}
        teamRole={teamRole}
      />
      {/* pt-14 compensa el top bar fijo en móvil; pb-nav-safe cubre la bottom nav + safe area de iOS */}
      <main className="flex-1 min-h-0 overflow-auto pt-14 pb-nav-safe md:pt-0 md:pb-0" style={{ background: 'var(--bg-base)' }}>
        {children}
      </main>
    </div>
  )
}
