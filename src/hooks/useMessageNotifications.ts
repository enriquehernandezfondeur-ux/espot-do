'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { notifications } from '@/lib/notifications'

/**
 * Hook que se suscribe a mensajes nuevos en Supabase Realtime donde el usuario
 * es el receptor (receiver_id = userId). Muestra un toast con botón "Ver mensaje"
 * aunque el chat esté cerrado.
 *
 * Se debe usar en un client component. Para layouts Server Component,
 * usar <MessageNotificationProvider /> en su lugar.
 */
export function useMessageNotifications() {
  useEffect(() => {
    const supabase = createClient()
    let userId: string | null = null
    let channel: ReturnType<typeof supabase.channel> | null = null

    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      userId = user.id

      channel = supabase
        .channel(`msg-notifications:${userId}`)
        .on(
          'postgres_changes',
          {
            event:  'INSERT',
            schema: 'public',
            table:  'messages',
            filter: `receiver_id=eq.${userId}`,
          },
          async (payload) => {
            const msg = payload.new as {
              id:          string
              sender_id:   string
              receiver_id: string
              body:        string | null
              space_id:    string
            }

            // Doble guarda: nunca notificarse a sí mismo
            if (msg.sender_id === userId) return

            // Obtener nombre del sender y nombre del espacio
            const [{ data: senderProfile }, { data: space }] = await Promise.all([
              supabase
                .from('profiles')
                .select('full_name, avatar_url')
                .eq('id', msg.sender_id)
                .single(),
              supabase
                .from('spaces')
                .select('name, slug')
                .eq('id', msg.space_id)
                .single(),
            ])

            const senderName = senderProfile?.full_name ?? 'Alguien'
            const preview    = msg.body
              ? msg.body.length > 60
                ? msg.body.slice(0, 60) + '…'
                : msg.body
              : 'Adjunto recibido'

            // Determinar ruta del chat según el rol del usuario actual
            // Los hosts van a /dashboard/host/mensajes, clientes a /dashboard/mensajes
            const { data: myProfile } = await supabase
              .from('profiles')
              .select('role')
              .eq('id', userId!)
              .single()

            const isHost   = myProfile?.role === 'host' || myProfile?.role === 'admin'
            const chatHref = isHost
              ? '/dashboard/host/mensajes'
              : '/dashboard/mensajes'

            notifications.info(`Mensaje de ${senderName}`, {
              description: preview,
              duration: 7000,
              action: {
                label: 'Ver mensaje',
                onClick: () => {
                  window.location.href = chatHref
                },
              },
            })
          }
        )
        .subscribe()
    }

    init()

    return () => {
      if (channel) supabase.removeChannel(channel)
    }
  }, [])
}
