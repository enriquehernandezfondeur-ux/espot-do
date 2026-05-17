'use client'

import { useMessageNotifications } from '@/hooks/useMessageNotifications'

/**
 * Proveedor de notificaciones de mensajes — client component sin UI propia.
 * Se coloca en cualquier layout (incluyendo Server Components) para activar
 * el Realtime de mensajes globalmente aunque el ChatDrawer esté cerrado.
 *
 * Uso en un layout Server Component:
 *   import MessageNotificationProvider from '@/components/providers/MessageNotificationProvider'
 *   ...
 *   <MessageNotificationProvider />
 *   {children}
 */
export default function MessageNotificationProvider() {
  useMessageNotifications()
  return null
}
