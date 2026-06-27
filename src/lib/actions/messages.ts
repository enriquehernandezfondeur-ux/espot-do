'use server'

import { createClient } from '@/lib/supabase/server'
import { sendEmailIfEnabled } from '@/lib/email/send'
import { isUuid } from '@/lib/validate'

// Obtener la conversación entre el usuario actual y OTRO participante sobre un
// espacio. `otherId` evita que se mezclen hilos de distintos clientes del mismo
// espacio (el host puede tener varias conversaciones por espacio). Si no se pasa
// (lado cliente, que solo habla con el host) se devuelven los mensajes del usuario.
export async function getConversation(spaceId: string, otherId?: string) {
  // Validar IDs: se interpolan en el filtro `.or()` de PostgREST (evita inyección de filtro).
  if (!isUuid(spaceId)) return null
  if (otherId !== undefined && !isUuid(otherId)) return null

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // Obtener mensajes de esta conversación
  let mq = supabase
    .from('messages')
    .select('*, profiles!sender_id(full_name, avatar_url)')
    .eq('space_id', spaceId)
  mq = otherId
    ? mq.or(`and(sender_id.eq.${user.id},receiver_id.eq.${otherId}),and(sender_id.eq.${otherId},receiver_id.eq.${user.id})`)
    : mq.or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
  const { data: messages } = await mq.order('created_at', { ascending: true })

  // Obtener info del espacio y propietario
  const { data: space, error: spaceErr } = await supabase
    .from('spaces')
    .select('id, name, host_id, profiles!host_id(id, full_name, avatar_url)')
    .eq('id', spaceId)
    .single()

  if (spaceErr && spaceErr.code !== 'PGRST116') return null

  return { messages: messages ?? [], space: space ?? null, userId: user.id }
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
  if (!isUuid(spaceId) || !isUuid(receiverId)) return { error: 'Destino inválido' }

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

  if (error) return { error: error.message }

  // Notificación por email al receptor (fire-and-forget, nunca bloquea)
  try {
    const [{ data: receiverProfile }, { data: senderProfile }, { data: space }] = await Promise.all([
      supabase.from('profiles').select('full_name, email').eq('id', receiverId).single(),
      supabase.from('profiles').select('full_name').eq('id', user.id).single(),
      supabase.from('spaces').select('name, host_id').eq('id', spaceId).single(),
    ])

    if (receiverProfile?.email) {
      const senderName  = senderProfile?.full_name ?? 'Alguien'
      const spaceName   = space?.name ?? 'un espacio'
      const preview     = body?.length ? (body.length > 200 ? body.slice(0, 200) + '…' : body) : 'Adjunto recibido'
      const SITE        = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://espot.do'
      // Si el receptor es el dueño del espacio, enlaza a su panel de host;
      // si es el cliente, al panel de cliente.
      const receiverIsHost = (space as any)?.host_id === receiverId
      const chatHref    = receiverIsHost ? `${SITE}/dashboard/host/mensajes` : `${SITE}/dashboard/mensajes`

      await sendEmailIfEnabled(
        receiverProfile.email,
        `Nuevo mensaje de ${senderName} — Espot`,
        `<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;background:#f4f6f5;padding:32px 0;">
          <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e4edea;">
            <div style="background:#03313C;padding:24px 28px;">
              <img src="${SITE}/logo-green.svg" alt="Espot" style="height:24px;width:auto;" />
            </div>
            <div style="padding:28px;">
              <p style="margin:0 0 8px;font-size:15px;color:#111827;font-weight:600;">Tienes un nuevo mensaje</p>
              <p style="margin:0 0 20px;font-size:14px;color:#374151;">
                <strong>${senderName}</strong> te escribió sobre <strong>${spaceName}</strong>:
              </p>
              <div style="background:#f4f6f5;border-radius:10px;padding:16px 20px;margin-bottom:24px;">
                <p style="margin:0;font-size:14px;color:#374151;font-style:italic;">"${preview}"</p>
              </div>
              <a href="${chatHref}" style="display:inline-block;background:#35C493;color:#03313C;font-weight:700;font-size:14px;padding:12px 24px;border-radius:10px;text-decoration:none;">
                Ver mensaje →
              </a>
            </div>
            <div style="padding:16px 28px;border-top:1px solid #e4edea;">
              <p style="margin:0;font-size:12px;color:#9ca3af;">Espot · República Dominicana · <a href="${SITE}" style="color:#35C493;">espot.do</a></p>
            </div>
          </div>
        </body></html>`,
        receiverId,
        'message_notifications',
      )
    }
  } catch {
    // El email nunca debe bloquear el mensaje
  }

  return { success: true, message: data }
}

// Todas las conversaciones del usuario (para /dashboard/mensajes)
export async function getMyConversations() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('messages')
    .select(`
      id, body, attachment_url, created_at, read_at,
      sender_id, receiver_id,
      space_id,
      spaces!space_id(id, name, slug, space_images(url, is_cover)),
      sender:profiles!sender_id(full_name, avatar_url),
      receiver:profiles!receiver_id(full_name, avatar_url)
    `)
    .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
    .order('created_at', { ascending: false })

  // Obtener conversaciones ocultas por este usuario.
  // Filas con other_id NULL = legacy (ocultan todo el espacio); con other_id =
  // ocultan solo esa conversación (space_id + otro participante).
  const { data: hidden } = await supabase
    .from('conversation_hides')
    .select('space_id, other_id')
    .eq('user_id', user.id)
  const hiddenWholeSpace = new Set<string>()
  const hiddenConvs      = new Set<string>()
  for (const h of (hidden ?? []) as any[]) {
    if (h.other_id == null) hiddenWholeSpace.add(h.space_id)
    else hiddenConvs.add(`${h.space_id}:${h.other_id}`)
  }

  // Agrupar por (space_id + otro participante): así el host ve una conversación
  // separada por cada cliente, no un hilo mezclado por espacio.
  const seen = new Set<string>()
  const conversations = (data ?? []).filter(m => {
    const otherId = m.sender_id === user.id ? m.receiver_id : m.sender_id
    if (hiddenWholeSpace.has(m.space_id)) return false
    if (hiddenConvs.has(`${m.space_id}:${otherId}`)) return false
    const key = `${m.space_id}:${otherId}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  return conversations.map(m => {
    const otherId   = m.sender_id === user.id ? m.receiver_id : m.sender_id
    const otherProf = (m.sender_id === user.id ? (m as any).receiver : (m as any).sender) as any
    return {
      spaceId:   m.space_id,
      otherId,
      otherName: otherProf?.full_name ?? null,
      otherAvatar: otherProf?.avatar_url ?? null,
      spaceName: (m.spaces as any)?.name ?? 'Espacio',
      spaceSlug: (m.spaces as any)?.slug,
      cover:     (m.spaces as any)?.space_images?.find((i: any) => i.is_cover)?.url ?? (m.spaces as any)?.space_images?.[0]?.url,
      lastMessage:   m.body,
      hasAttachment: !!m.attachment_url,
      lastAt:    m.created_at,
      unread:    !m.read_at && m.receiver_id === user.id,
      userId:    user.id,
    }
  })
}

// Ocultar conversación para el usuario (soft delete — mensajes siguen en el sistema).
// otherId identifica la conversación concreta (el otro participante) para no ocultar
// todas las conversaciones del mismo espacio.
export async function hideConversation(spaceId: string, otherId?: string) {
  if (!isUuid(spaceId)) return { error: 'Conversación inválida' }
  if (otherId !== undefined && !isUuid(otherId)) return { error: 'Conversación inválida' }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }
  const { error } = await supabase
    .from('conversation_hides')
    .upsert(
      { user_id: user.id, space_id: spaceId, other_id: otherId ?? null },
      { onConflict: 'user_id,space_id,other_id' },
    )
  return error ? { error: error.message } : { success: true }
}

// Marcar mensajes como leídos. Si se pasa `otherId`, solo los recibidos de ese
// participante (evita marcar leídos los de otro cliente del mismo espacio).
export async function markMessagesRead(spaceId: string, otherId?: string) {
  if (!isUuid(spaceId)) return
  if (otherId !== undefined && !isUuid(otherId)) return
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  let q = supabase
    .from('messages')
    .update({ read_at: new Date().toISOString() })
    .eq('space_id', spaceId)
    .eq('receiver_id', user.id)
    .is('read_at', null)
  if (otherId) q = q.eq('sender_id', otherId)
  await q
}

/** Marca TODOS los mensajes recibidos sin leer como leídos (al abrir la bandeja). */
export async function markAllMessagesRead() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  await supabase
    .from('messages')
    .update({ read_at: new Date().toISOString() })
    .eq('receiver_id', user.id)
    .is('read_at', null)
}
