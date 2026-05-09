import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ClientDashboardHome from './ClientDashboardHome'

export default async function ClientDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const role = profile?.role ?? 'guest'

  if (role === 'host')  redirect('/dashboard/host')
  if (role === 'admin') redirect('/admin')

  return <ClientDashboardHome />
}
