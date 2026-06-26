'use server'

import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { resolveHostId } from './_resolveHost'
import { resolvePlan, subscriptionSummary, type PlanType, type SubscriptionSummary } from '@/lib/plans'
import { sendEmail } from '@/lib/email/send'
import { emailBase, infoBox } from '@/lib/email/templates'
import { formatDate, escapeHtml } from '@/lib/utils'

// Estados "vivos": una sola suscripción por host puede estar en uno de estos
// (refleja el índice único parcial). Incluye prueba y suspensión.
const LIVE_STATUSES = ['trialing', 'active', 'pending_payment', 'past_due', 'suspended'] as const
const DAY_MS = 86_400_000
const SUPERADMIN_EMAIL = process.env.SUPERADMIN_EMAIL ?? 'enriquehernandezfondeur@gmail.com'
const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://espot.do'

/**
 * Avisa por email al host cuando su plan cambia por acción de admin. El cron solo
 * mandaba recordatorios de vencimiento; activación/renovación/cancelación quedaban
 * sin notificar. Best-effort: no bloquea la acción si el email falla.
 */
async function notifyHostPlanChange(
  svc: ReturnType<typeof createServiceClient>,
  hostId: string,
  kind: 'requested' | 'activated' | 'extended' | 'cancelled',
  periodEndISO?: string | null,
) {
  try {
    const { data: prof } = await svc
      .from('profiles')
      .select('email, full_name')
      .eq('id', hostId)
      .maybeSingle()
    const email = prof?.email as string | undefined
    if (!email) return
    const name = escapeHtml(prof?.full_name ?? '')
    const cta = { text: 'Ver mi plan', url: `${SITE}/dashboard/host/pro` }

    if (kind === 'requested') {
      await sendEmail({
        to: email,
        subject: 'Recibimos tu solicitud de Espot Pro',
        html: emailBase({
          title: 'Recibimos tu solicitud',
          accentColor: '#B8860B',
          body: `<p style="color:#374151;margin:0 0 16px;">Hola <strong>${name}</strong>, recibimos tu solicitud para pasar a <strong>Espot Pro</strong>. La estamos procesando y te avisaremos por este medio en cuanto quede activa. Si tienes dudas, respóndenos a este correo.</p>`,
          cta,
        }),
      })
      return
    }

    if (kind === 'cancelled') {
      await sendEmail({
        to: email,
        subject: 'Tu Espot Pro fue cancelado',
        html: emailBase({
          title: 'Tu Espot Pro fue cancelado',
          accentColor: '#6B7280',
          body: `<p style="color:#374151;margin:0 0 16px;">Hola <strong>${name}</strong>, tu plan Espot Pro fue cancelado. Tus datos (clientes, reservas externas, calendario) se conservan; las funciones Pro quedan en solo lectura. Puedes volver a Pro cuando quieras sin perder nada.</p>`,
          cta,
        }),
      })
      return
    }

    const isExt = kind === 'extended'
    await sendEmail({
      to: email,
      subject: isExt ? 'Tu Espot Pro fue renovado' : '¡Ya eres Espot Pro! 🎉',
      html: emailBase({
        title: isExt ? 'Tu Espot Pro fue renovado' : '¡Bienvenido a Espot Pro!',
        accentColor: '#B8860B',
        body:
          `<p style="color:#374151;margin:0 0 16px;">Hola <strong>${name}</strong>, ${isExt ? 'renovamos tu plan Espot Pro' : 'tu cuenta ya es Espot Pro'}. Tienes acceso al CRM de clientes, reservas externas (Espot Directo), calendario y más.</p>` +
          infoBox([
            { label: 'Plan', value: 'Espot Pro' },
            { label: 'Vigente hasta', value: periodEndISO ? formatDate(periodEndISO) : '—' },
          ]),
        cta,
      }),
    })
  } catch (e) {
    console.error('[notifyHostPlanChange] error:', e)
  }
}

/** Plan efectivo del host del usuario autenticado (resuelve equipo → dueño). */
export async function getMyPlan(): Promise<PlanType> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return 'free'

  const { hostId } = await resolveHostId(supabase, user.id)
  const svc = createServiceClient()
  const { data: sub } = await svc
    .from('host_subscriptions')
    .select('status, current_period_end')
    .eq('host_id', hostId)
    .in('status', LIVE_STATUSES as unknown as string[])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return resolvePlan(sub, new Date().toISOString())
}

/** ¿El host (por id) es Pro? Para páginas públicas sin sesión del host (tarjeta digital). */
export async function isHostProById(hostId: string): Promise<boolean> {
  const svc = createServiceClient()
  const { data: sub } = await svc
    .from('host_subscriptions')
    .select('status, current_period_end')
    .eq('host_id', hostId)
    .in('status', LIVE_STATUSES as unknown as string[])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  return resolvePlan(sub, new Date().toISOString()) === 'pro'
}

/**
 * Guard para server actions Pro. Devuelve un resultado discriminado para que
 * la action pueda cortar antes de escribir. NO confía en el frontend.
 */
export async function requirePro(): Promise<{ ok: true } | { ok: false; error: string }> {
  const plan = await getMyPlan()
  if (plan !== 'pro') {
    return { ok: false, error: 'Esta función es exclusiva de Espot Pro.' }
  }
  return { ok: true }
}

/** Resumen de la suscripción del host para mostrar en el panel. */
export async function getMySubscription(): Promise<SubscriptionSummary> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return subscriptionSummary(null, new Date().toISOString())

  const { hostId } = await resolveHostId(supabase, user.id)
  const svc = createServiceClient()
  const { data: sub } = await svc
    .from('host_subscriptions')
    .select('status, current_period_end')
    .eq('host_id', hostId)
    .in('status', LIVE_STATUSES as unknown as string[])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return subscriptionSummary(sub, new Date().toISOString())
}

/**
 * El host inicia su intención de pasar a Pro. Crea una suscripción
 * 'pending_payment' (el cobro real por Azul llega en F7). Idempotente: si ya hay
 * una suscripción viva, no crea otra.
 */
export async function startProRequest(): Promise<{ ok: true; status: string } | { error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { hostId } = await resolveHostId(supabase, user.id)
  const svc = createServiceClient()
  const { data: existing } = await svc
    .from('host_subscriptions')
    .select('id, status')
    .eq('host_id', hostId)
    .in('status', LIVE_STATUSES as unknown as string[])
    .maybeSingle()

  if (existing) return { ok: true, status: existing.status }

  const { error } = await svc.from('host_subscriptions').insert({
    host_id: hostId,
    status: 'pending_payment',
    payment_provider: 'azul',
    price_amount: 499,
  })
  if (error) return { error: error.message }
  await notifyHostPlanChange(svc, hostId, 'requested')
  return { ok: true, status: 'pending_payment' }
}

/**
 * Activación/gestión manual por admin (puente mientras Azul se estabiliza).
 * - activate: pone la suscripción 'active' por 30 días (provider 'manual').
 * - extend:   suma 30 días al periodo vigente (o desde hoy si ya venció).
 * - cancel:   marca 'cancelled' y baja el caché de plan a 'free'.
 */
export async function adminSetHostPlan(
  hostId: string,
  action: 'activate' | 'extend' | 'cancel',
  days: number = 30,
): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }
  // Mismo criterio que requireAdmin() de admin.ts: admin por rol o por email superadmin.
  if (user.email !== SUPERADMIN_EMAIL) {
    const { data: me } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
    if (me?.role !== 'admin') return { error: 'No autorizado' }
  }

  const svc = createServiceClient()
  const nowISO = new Date().toISOString()
  const { data: existing } = await svc
    .from('host_subscriptions')
    .select('id, status, current_period_end')
    .eq('host_id', hostId)
    .in('status', LIVE_STATUSES as unknown as string[])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (action === 'cancel') {
    if (existing) {
      const { error: e1 } = await svc.from('host_subscriptions')
        .update({ status: 'cancelled', cancelled_at: nowISO, updated_at: nowISO })
        .eq('id', existing.id)
      if (e1) return { error: `No se pudo cancelar la suscripción: ${e1.message}` }
    }
    const { error: e2 } = await svc.from('profiles').update({ plan_type: 'free' }).eq('id', hostId)
    if (e2) return { error: `No se pudo actualizar el plan: ${e2.message}` }
    await svc.from('subscription_audit_log').insert({
      host_id: hostId, subscription_id: existing?.id ?? null, admin_id: user.id,
      action: 'cancelar_ahora', old_status: existing?.status ?? null, new_status: 'cancelled', note: null,
    })
    await notifyHostPlanChange(svc, hostId, 'cancelled')
    return { ok: true }
  }

  // activate / extend — duración configurable (días)
  const dur = Math.max(1, Math.round(days || 30))
  const vigenteFin = existing?.current_period_end ? new Date(existing.current_period_end).getTime() : 0
  const baseMs = action === 'extend' && vigenteFin > Date.now() ? vigenteFin : Date.now()
  const periodEndISO = new Date(baseMs + dur * DAY_MS).toISOString()

  let subId: string | null = existing?.id ?? null
  if (existing) {
    const { error } = await svc.from('host_subscriptions').update({
      status: 'active',
      payment_provider: 'manual',
      activated_by: user.id,
      current_period_start: nowISO,
      current_period_end: periodEndISO,
      updated_at: nowISO,
    }).eq('id', existing.id)
    if (error) return { error: `No se pudo actualizar la suscripción: ${error.message}` }
  } else {
    const { data: inserted, error } = await svc.from('host_subscriptions').insert({
      host_id: hostId,
      status: 'active',
      payment_provider: 'manual',
      activated_by: user.id,
      price_amount: 499,
      started_at: nowISO,
      current_period_start: nowISO,
      current_period_end: periodEndISO,
    }).select('id').single()
    if (error) return { error: `No se pudo crear la suscripción: ${error.message}` }
    subId = inserted?.id ?? null
  }
  // Caché de presentación; la fuente de verdad es host_subscriptions.
  const { error: ep } = await svc.from('profiles').update({ plan_type: 'pro' }).eq('id', hostId)
  if (ep) return { error: `Suscripción activada, pero no se pudo sincronizar el plan: ${ep.message}` }
  await svc.from('subscription_audit_log').insert({
    host_id: hostId, subscription_id: subId, admin_id: user.id,
    action: action === 'extend' ? 'extender' : 'activar_pro',
    old_status: existing?.status ?? null, new_status: 'active', note: null,
  })
  await notifyHostPlanChange(svc, hostId, action === 'extend' ? 'extended' : 'activated', periodEndISO)
  return { ok: true }
}
