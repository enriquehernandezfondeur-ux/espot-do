import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AdminSidebar from '@/components/admin/AdminSidebar'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth')

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()

  const isSuperAdmin = user.email === (process.env.SUPERADMIN_EMAIL ?? 'enriquehernandezfondeur@gmail.com')
  if (!isSuperAdmin && profile?.role !== 'admin') redirect('/')

  return (
    <div className="host-theme flex min-h-dvh" style={{ background: 'var(--bg-base)' }}>
      <AdminSidebar />
      <main className="flex-1 min-h-0 overflow-auto pt-14 md:pt-0">
        {children}
      </main>
    </div>
  )
}
