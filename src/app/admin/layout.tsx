import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AdminSidebar from '@/components/admin/AdminSidebar'
import { isSuperadmin } from '@/lib/superadmin'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth')

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()

  const isSuperAdmin = isSuperadmin(user.email)
  if (!isSuperAdmin && profile?.role !== 'admin') redirect('/')

  return (
    <div className="admin-theme flex min-h-dvh" style={{ background: 'var(--bg-base)' }}>
      <AdminSidebar />
      {/* pt-14 compensa la top bar fija en móvil */}
      <main className="flex-1 min-h-0 overflow-auto pt-14 md:pt-0">
        {children}
      </main>
    </div>
  )
}
