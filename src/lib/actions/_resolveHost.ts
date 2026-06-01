import type { SupabaseClient } from '@supabase/supabase-js'
import type { TeamRole } from '@/types'
import { createServiceClient } from '@/lib/supabase/service'

export interface ResolvedHost {
  hostId: string
  role: TeamRole | 'owner'
  isOwner: boolean
}

export async function resolveHostId(
  supabase: SupabaseClient,
  userId: string,
): Promise<ResolvedHost> {
  const { data: membership } = await supabase
    .from('host_team_members')
    .select('host_id, role')
    .eq('member_user_id', userId)
    .eq('status', 'active')
    .maybeSingle()

  if (membership) {
    return { hostId: membership.host_id, role: membership.role as TeamRole, isOwner: false }
  }
  return { hostId: userId, role: 'owner', isOwner: true }
}

export interface HostAccess extends ResolvedHost {
  /**
   * Cliente para operar sobre los datos del host. Para el dueño es el mismo
   * cliente de sesión (RLS aplica con normalidad). Para un miembro de equipo
   * (ya autorizado por membresía activa) es el service-client, porque RLS
   * filtra por host_id = auth.uid() y bloquearía el acceso del miembro a los
   * datos del dueño. Siempre se debe acotar por `hostId`.
   */
  db: SupabaseClient
  canManageSpaces: boolean   // dueño o admin
  canManageClients: boolean  // dueño, admin o coordinador
  canRespondReviews: boolean // dueño, admin o coordinador
}

export async function resolveHostAccess(
  supabase: SupabaseClient,
  userId: string,
): Promise<HostAccess> {
  const resolved = await resolveHostId(supabase, userId)
  const db = resolved.isOwner ? supabase : createServiceClient()
  const role = resolved.role
  return {
    ...resolved,
    db,
    canManageSpaces:   resolved.isOwner || role === 'admin',
    canManageClients:  resolved.isOwner || role === 'admin' || role === 'coordinador',
    canRespondReviews: resolved.isOwner || role === 'admin' || role === 'coordinador',
  }
}
