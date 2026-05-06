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
    <div className="flex min-h-screen" style={{ background: '#F4F6F8' }}>
      <AdminSidebar />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
