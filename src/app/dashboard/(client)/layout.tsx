import { createClient } from '@/lib/supabase/server'
import ClientSidebar from '@/components/client/ClientSidebar'

export default async function ClientDashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let userName: string | undefined
  let avatarUrl: string | undefined
  if (user) {
    const { data } = await supabase.from('profiles').select('full_name, avatar_url').eq('id', user.id).single()
    userName  = data?.full_name ?? user.email?.split('@')[0]
    avatarUrl = data?.avatar_url ?? undefined
  }

  return (
    <div className="light-theme flex min-h-screen" style={{ background: 'var(--bg-base)', color: 'var(--text-primary)' }}>
      <ClientSidebar userName={userName} avatarUrl={avatarUrl} />
      <main className="flex-1 overflow-auto" style={{ background: 'var(--bg-base)' }}>
        {children}
      </main>
    </div>
  )
}
