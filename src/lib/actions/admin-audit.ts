'use server'

import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

/**
 * Registra una acción sensible del admin en admin_audit_log.
 *
 * Re-deriva el admin de la sesión (no confía en el cliente) y escribe con
 * service-role. Es fail-safe a propósito: si el log falla, NUNCA rompe la acción
 * de negocio que lo invocó (un fallo de auditoría no debe bloquear al admin).
 *
 * Llamar DESPUÉS de que la operación de negocio tuvo éxito.
 */
export async function logAdminAction(
  action: string,
  targetType: 'user' | 'space' | 'application' | 'dispute' | string,
  targetId: string | null,
  detail: string,
): Promise<void> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const svc = createServiceClient()
    await svc.from('admin_audit_log').insert({
      admin_id:    user?.id ?? null,
      action,
      target_type: targetType,
      target_id:   targetId,
      detail,
    })
  } catch {
    // El fallo de auditoría no debe propagarse a la acción de negocio.
  }
}
