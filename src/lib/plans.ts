export type PlanType = 'free' | 'pro'
export type SubscriptionStatus =
  | 'active' | 'pending_payment' | 'past_due' | 'cancelled' | 'expired'

export interface SubscriptionLike {
  status: SubscriptionStatus | string
  current_period_end: string | null
}

export const PRO_PRICE_DOP = 499

/**
 * Plan efectivo a partir de la suscripción. Pro sólo si está 'active' y el
 * periodo no venció. Cualquier otro estado (o sin suscripción) => 'free'.
 */
export function resolvePlan(sub: SubscriptionLike | null | undefined, nowISO: string): PlanType {
  if (!sub) return 'free'
  if (sub.status !== 'active') return 'free'
  if (sub.current_period_end) {
    const end = new Date(sub.current_period_end).getTime()
    const now = new Date(nowISO).getTime()
    if (end <= now) return 'free'
  }
  return 'pro'
}

export interface SubscriptionSummary {
  plan: PlanType
  isPro: boolean
  statusLabel: string
  nextChargeISO: string | null
  daysLeft: number | null
}

const STATUS_LABELS: Record<string, string> = {
  active:          'Espot Pro activo',
  pending_payment: 'Pago pendiente',
  past_due:        'Pago vencido',
  cancelled:       'Cancelado',
  expired:         'Expirado',
}

/** Resumen presentacional de la suscripción para el panel del host. */
export function subscriptionSummary(
  sub: SubscriptionLike | null | undefined,
  nowISO: string,
): SubscriptionSummary {
  const plan = resolvePlan(sub, nowISO)
  const isPro = plan === 'pro'
  // El próximo cobro y los días restantes solo aplican a un plan ACTIVO.
  // (Una sub cancelada/expirada puede tener current_period_end futuro y no
  //  debe insinuar un cobro vigente.)
  let daysLeft: number | null = null
  if (isPro && sub?.current_period_end) {
    const ms = new Date(sub.current_period_end).getTime() - new Date(nowISO).getTime()
    daysLeft = Math.max(0, Math.ceil(ms / 86_400_000))
  }
  return {
    plan,
    isPro,
    statusLabel: sub ? (STATUS_LABELS[sub.status] ?? 'Plan Normal (gratis)') : 'Plan Normal (gratis)',
    nextChargeISO: isPro ? (sub?.current_period_end ?? null) : null,
    daysLeft,
  }
}
