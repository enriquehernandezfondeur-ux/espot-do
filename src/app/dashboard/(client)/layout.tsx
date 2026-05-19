import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ClientSidebar from '@/components/client/ClientSidebar'
import MessageNotificationProvider from '@/components/providers/MessageNotificationProvider'

export default async function ClientDashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth')

  let userName: string | undefined
  let avatarUrl: string | undefined
  if (user) {
    const { data } = await supabase.from('profiles').select('full_name, avatar_url').eq('id', user.id).single()
    userName  = data?.full_name ?? user.email?.split('@')[0]
    avatarUrl = data?.avatar_url ?? undefined
  }

  return (
    <div className="white-theme flex min-h-dvh" style={{ background: 'var(--bg-base)', color: 'var(--text-primary)' }}>
      <MessageNotificationProvider />
      <ClientSidebar userName={userName} avatarUrl={avatarUrl} />
      {/* pt-14 compensa el top bar fijo en móvil; pb-nav-safe cubre la bottom nav + safe area de iOS */}
      <main className="flex-1 min-h-0 overflow-auto pt-14 pb-nav-safe md:pt-0 md:pb-0" style={{ background: 'var(--bg-base)' }}>
        {children}
      </main>
    </div>
  )
}
