import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

// Página puente: redirige al dashboard correcto según el rol del usuario.
// Resuelve el error "This page couldn't load" al hacer login.
export default async function DashboardRootPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const role = profile?.role ?? 'guest'

  if (role === 'host')  redirect('/dashboard/host')
  if (role === 'admin') redirect('/admin')
  redirect('/dashboard/reservas')
}
