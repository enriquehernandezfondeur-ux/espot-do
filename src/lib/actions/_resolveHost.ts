import type { SupabaseClient } from '@supabase/supabase-js'
import type { TeamRole } from '@/types'

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
