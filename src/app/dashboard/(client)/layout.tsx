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
      {/* pt-14 compensa el top bar fijo en móvil; pb-20 para la barra inferior */}
      <main className="flex-1 overflow-auto pt-14 pb-20 md:pt-0 md:pb-0" style={{ background: 'var(--bg-base)' }}>
        {children}
      </main>
    </div>
  )
}
