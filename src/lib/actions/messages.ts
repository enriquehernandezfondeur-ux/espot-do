'use server'

import { createClient } from '@/lib/supabase/server'

// Obtener o crear conversación entre el usuario actual y el dueño de un espacio
export async function getConversation(spaceId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // Obtener mensajes de esta conversación
  const { data: messages } = await supabase
    .from('messages')
    .select('*, profiles!sender_id(full_name, avatar_url)')
    .eq('space_id', spaceId)
    .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
    .order('created_at', { ascending: true })

  // Obtener info del espacio y propietario
  const { data: space } = await supabase
    .from('spaces')
    .select('id, name, host_id, profiles!host_id(id, full_name, avatar_url)')
    .eq('id', spaceId)
    .single()

  return { messages: messages ?? [], space, userId: user.id }
}

export interface MessageAttachment {
  url:  string
  type: 'image' | 'file'
  name: string
}

// Enviar un mensaje (con o sin adjunto)
export async function sendMessage(
  spaceId: string,
  receiverId: string,
  body: string,
  attachment?: MessageAttachment,
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Debes iniciar sesión para enviar mensajes' }
  if (!body.trim() && !attachment) return { error: 'El mensaje no puede estar vacío' }

  const { data, error } = await supabase
    .from('messages')
    .insert({
      space_id:        spaceId,
      sender_id:       user.id,
      receiver_id:     receiverId,
      body:            body.trim() || null,
      attachment_url:  attachment?.url  ?? null,
      attachment_type: attachment?.type ?? null,
      attachment_name: attachment?.name ?? null,
    })
    .select()
    .single()

  return error ? { error: error.message } : { success: true, message: data }
}

// Todas las conversaciones del usuario (para /dashboard/mensajes)
export async function getMyConversations() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('messages')
    .select(`
      id, body, created_at, read_at,
      sender_id, receiver_id,
      space_id,
      spaces!space_id(id, name, slug, space_images(url, is_cover)),
      profiles!sender_id(full_name, avatar_url)
    `)
    .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
    .order('created_at', { ascending: false })

  // Agrupar por space_id y quedarse con el último mensaje de cada conversación
  const seen = new Set<string>()
  const conversations = (data ?? []).filter(m => {
    if (seen.has(m.space_id)) return false
    seen.add(m.space_id)
    return true
  })

  return conversations.map(m => ({
    spaceId:   m.space_id,
    spaceName: (m.spaces as any)?.name ?? 'Espacio',
    spaceSlug: (m.spaces as any)?.slug,
    cover:     (m.spaces as any)?.space_images?.find((i: any) => i.is_cover)?.url ?? (m.spaces as any)?.space_images?.[0]?.url,
    lastMessage: m.body,
    lastAt:    m.created_at,
    unread:    !m.read_at && m.receiver_id === user.id,
    userId:    user.id,
  }))
}

// Marcar mensajes como leídos
export async function markMessagesRead(spaceId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  await supabase
    .from('messages')
    .update({ read_at: new Date().toISOString() })
    .eq('space_id', spaceId)
    .eq('receiver_id', user.id)
    .is('read_at', null)
}
