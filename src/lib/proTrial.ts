import type { SupabaseClient } from '@supabase/supabase-js'

// Helper INTERNO (no es 'use server' → no es invocable desde el cliente).
// Lo llaman acciones admin ya autenticadas (aprobar host / asignar rol host)
// pasando su cliente service-role. Inicia la prueba gratuita SOLO si:
//  - la config pro_auto_trial_enabled = 'true'
//  - el host no ha usado prueba antes (pro_trial_used = false)
//  - no tiene ya una suscripción viva
// Best-effort: nunca lanza (no debe romper la creación del host).

const DAY_MS = 86_400_000
const LIVE = ['trialing', 'active', 'pending_payment', 'past_due', 'suspended']

export async function startAutoTrialIfEnabled(
  svc: SupabaseClient,
  hostId: string,
  adminId?: string | null,
): Promise<void> {
  try {
    const { data: cfg } = await svc.from('marketplace_config')
      .select('key, value').in('key', ['pro_auto_trial_enabled', 'pro_trial_days'])
    const map = new Map((cfg ?? []).map((c: any) => [c.key, c.value]))
    if (map.get('pro_auto_trial_enabled') !== 'true') return

    const { data: prof } = await svc.from('profiles').select('pro_trial_used').eq('id', hostId).maybeSingle()
    if (prof?.pro_trial_used) return

    const { data: live } = await svc.from('host_subscriptions')
      .select('id').eq('host_id', hostId).in('status', LIVE).maybeSingle()
    if (live) return

    const days = Math.min(3650, Math.max(1, Number(map.get('pro_trial_days')) || 30))
    const now = Date.now()
    const nowISO = new Date(now).toISOString()
    const end = new Date(now + days * DAY_MS).toISOString()

    const { data: ins } = await svc.from('host_subscriptions').insert({
      host_id: hostId, status: 'trialing', activation_type: 'trial', payment_provider: 'manual',
      price_amount: 499, started_at: nowISO, current_period_start: nowISO, current_period_end: end,
      activated_by: adminId ?? null,
    }).select('id').maybeSingle()

    await svc.from('profiles').update({ plan_type: 'pro', pro_trial_used: true }).eq('id', hostId)
    await svc.from('subscription_audit_log').insert({
      host_id: hostId, subscription_id: ins?.id ?? null, admin_id: adminId ?? null,
      action: 'activar_prueba', old_status: null, new_status: 'trialing', note: 'Prueba automática al activarse como propietario',
    })
  } catch {
    // best-effort: la prueba no debe bloquear la creación del propietario
  }
}
