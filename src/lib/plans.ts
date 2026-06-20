export type PlanType = 'free' | 'pro'
export type SubscriptionStatus =
  | 'trialing' | 'active' | 'pending_payment' | 'past_due'
  | 'cancelled' | 'expired' | 'suspended'

export interface SubscriptionLike {
  status: SubscriptionStatus | string
  current_period_end: string | null
}

export const PRO_PRICE_DOP = 499

/**
 * Estados que desbloquean funciones Pro: 'active' (pagado/manual) y 'trialing'
 * (prueba gratuita). Ambos respetan la expiración por current_period_end.
 * Fuente única (debe coincidir con is_pro_host en SQL).
 */
const PRO_STATUSES = new Set(['active', 'trialing'])

/**
 * Plan efectivo a partir de la suscripción. Pro si está 'active' o 'trialing' y
 * el periodo no venció. Cualquier otro estado (o sin suscripción) => 'free'.
 */
export function resolvePlan(sub: SubscriptionLike | null | undefined, nowISO: string): PlanType {
  if (!sub) return 'free'
  if (!PRO_STATUSES.has(sub.status)) return 'free'
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
  isTrial: boolean
  statusLabel: string
  nextChargeISO: string | null
  daysLeft: number | null
}

const STATUS_LABELS: Record<string, string> = {
  trialing:        'Prueba gratuita',
  active:          'Espot Pro activo',
  pending_payment: 'Pago pendiente',
  past_due:        'Pago vencido',
  cancelled:       'Cancelado',
  expired:         'Expirado',
  suspended:       'Suspendido',
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
    isTrial: isPro && sub?.status === 'trialing',
    statusLabel: sub ? (STATUS_LABELS[sub.status] ?? 'Plan Normal (gratis)') : 'Plan Normal (gratis)',
    nextChargeISO: isPro ? (sub?.current_period_end ?? null) : null,
    daysLeft,
  }
}
