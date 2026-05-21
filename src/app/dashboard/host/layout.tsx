import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/dashboard/Sidebar'
import MessageNotificationProvider from '@/components/providers/MessageNotificationProvider'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth')

  const { data: profile } = await supabase
    .from('profiles').select('full_name, avatar_url, role').eq('id', user.id).single()

  const isAdmin = user.email === (process.env.SUPERADMIN_EMAIL ?? 'enriquehernandezfondeur@gmail.com')

  const userName  = profile?.full_name ?? user.email?.split('@')[0]
  const avatarUrl = profile?.avatar_url ?? undefined

  return (
    <div className="host-theme flex min-h-dvh" style={{ background: 'var(--bg-base)', color: 'var(--text-primary)' }}>
      <MessageNotificationProvider />
      <Sidebar userName={userName} avatarUrl={avatarUrl} isAdmin={isAdmin} />
      {/* pt-14 compensa el top bar fijo en móvil; pb-nav-safe cubre la bottom nav + safe area de iOS */}
      <main className="flex-1 min-h-0 overflow-auto pt-14 pb-nav-safe md:pt-0 md:pb-0" style={{ background: 'var(--bg-base)' }}>
        {children}
      </main>
    </div>
  )
}
