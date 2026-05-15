import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/dashboard/Sidebar'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth')

  const { data: profile } = await supabase
    .from('profiles').select('full_name, avatar_url, role').eq('id', user.id).single()

  const isAdmin = user.email === (process.env.SUPERADMIN_EMAIL ?? 'enriquehernandezfondeur@gmail.com')
  if (profile?.role !== 'host' && !isAdmin) redirect('/dashboard')

  const userName  = profile?.full_name ?? user.email?.split('@')[0]
  const avatarUrl = profile?.avatar_url ?? undefined

  return (
    <div className="host-theme flex min-h-dvh" style={{ background: 'var(--bg-base)', color: 'var(--text-primary)' }}>
      <Sidebar userName={userName} avatarUrl={avatarUrl} isAdmin={isAdmin} />
      {/* pt-14 compensa el top bar fijo en móvil; pb-20 para la barra inferior */}
      <main className="flex-1 overflow-auto pt-14 pb-20 md:pt-0 md:pb-0" style={{ background: 'var(--bg-base)' }}>
        {children}
      </main>
    </div>
  )
}
