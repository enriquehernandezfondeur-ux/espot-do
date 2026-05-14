'use server'

import { createClient } from '@/lib/supabase/server'

export interface NotificationSettings {
  // Cliente
  reserva_enviada:     boolean  // Solicitud enviada al propietario
  reserva_aceptada:    boolean  // Propietario aceptó
  reserva_rechazada:   boolean  // Propietario rechazó
  reserva_confirmada:  boolean  // Pago confirmado
  reserva_cancelada:   boolean  // Cancelación
  recordatorio_pago:   boolean  // Recordatorio de cuota próxima
  recordatorio_evento: boolean  // 48h antes del evento
  solicitud_resena:    boolean  // Pedido de reseña post-evento
  // Propietario
  nueva_solicitud:     boolean  // Nueva solicitud de reserva
  pago_recibido:       boolean  // Pago confirmado
  cancelacion_host:    boolean  // Cliente canceló
  liquidacion:         boolean  // Espot te transfirió el neto
}

export const DEFAULT_NOTIFICATIONS: NotificationSettings = {
  reserva_enviada:     true,
  reserva_aceptada:    true,
  reserva_rechazada:   true,
  reserva_confirmada:  true,
  reserva_cancelada:   true,
  recordatorio_pago:   true,
  recordatorio_evento: true,
  solicitud_resena:    true,
  nueva_solicitud:     true,
  pago_recibido:       true,
  cancelacion_host:    true,
  liquidacion:         true,
}

export async function getNotificationSettings(): Promise<NotificationSettings> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ...DEFAULT_NOTIFICATIONS }

  const saved = user.user_metadata?.notification_settings ?? {}
  return { ...DEFAULT_NOTIFICATIONS, ...saved }
}

export async function updateNotificationSettings(
  settings: Partial<NotificationSettings>
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const current = user.user_metadata?.notification_settings ?? {}
  const updated = { ...DEFAULT_NOTIFICATIONS, ...current, ...settings }

  const { error } = await supabase.auth.updateUser({
    data: { notification_settings: updated }
  })

  return error ? { error: error.message } : {}
}

/** Verificar si un tipo de notificación está habilitado para un usuario */
export async function isNotificationEnabled(
  userId: string,
  type: keyof NotificationSettings
): Promise<boolean> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.admin?.getUserById
    ? await (supabase.auth as any).admin.getUserById(userId).catch(() => ({ data: { user: null } }))
    : { data: { user: null } }

  if (!user) return true // Por defecto habilitado si no se puede verificar
  const saved = user.user_metadata?.notification_settings ?? {}
  return saved[type] !== false // Habilitado a menos que explícitamente false
}
