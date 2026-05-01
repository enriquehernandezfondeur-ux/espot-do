'use server'

import { createClient } from '@/lib/supabase/server'

export async function getSiteContent(): Promise<Record<string, string>> {
  const supabase = await createClient()
  const { data } = await supabase.from('site_content').select('key, value')
  if (!data) return {}
  return Object.fromEntries(data.map(r => [r.key, r.value ?? '']))
}

export async function getSiteContentFull() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('site_content')
    .select('*')
    .order('section')
  return data ?? []
}

export async function updateContent(key: string, value: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { error } = await supabase
    .from('site_content')
    .update({ value, updated_at: new Date().toISOString() })
    .eq('key', key)

  return error ? { error: error.message } : { success: true }
}

export async function updateManyContent(updates: Record<string, string>) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const promises = Object.entries(updates).map(([key, value]) =>
    supabase.from('site_content').update({ value, updated_at: new Date().toISOString() }).eq('key', key)
  )
  await Promise.all(promises)
  return { success: true }
}
