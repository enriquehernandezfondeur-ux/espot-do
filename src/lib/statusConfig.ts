// ── Mappers centralizados de estado (pago, liquidación, eventos externos) ──
// Complementa bookingConfig.ts (estados de reserva). MISMA paleta en todos los
// roles para que un estado se vea idéntico en marketplace, cliente, host y admin:
//   Verde → ok/cobrado/liquidado · Naranja → pendiente · Azul → en proceso ·
//   Rojo → cancelado/retenido · Gris → neutro/reembolsado.
//
// Regla: ninguna pantalla debe redefinir estos colores/labels inline.

export interface StatusStyle { label: string; color: string; bg: string }

const ORANGE = { color: '#D97706', bg: 'rgba(217,119,6,0.08)' }
const BLUE   = { color: '#2563EB', bg: 'rgba(37,99,235,0.08)' }
const GREEN  = { color: '#16A34A', bg: 'rgba(22,163,74,0.08)' }
const RED    = { color: '#DC2626', bg: 'rgba(220,38,38,0.08)' }
const GRAY   = { color: '#6B7280', bg: 'rgba(107,114,128,0.08)' }

// ── payment_status ───────────────────────────────────────────
export type PaymentStatus = 'unpaid' | 'advance' | 'partial' | 'paid'
export const PAYMENT_STATUS: Record<PaymentStatus, StatusStyle> = {
  unpaid:  { label: 'Sin pago',     ...ORANGE },
  advance: { label: 'Anticipo',     ...BLUE   },
  partial: { label: 'Pago parcial', ...BLUE   },
  paid:    { label: 'Pagado',       ...GREEN  },
}
export function paymentStyle(s: string | null | undefined): StatusStyle {
  return PAYMENT_STATUS[(s ?? 'unpaid') as PaymentStatus] ?? PAYMENT_STATUS.unpaid
}

// ── estado de cuota (installment) ────────────────────────────
export type InstallmentStatus = 'pending' | 'paid' | 'overdue'
export const INSTALLMENT_STATUS: Record<InstallmentStatus, StatusStyle> = {
  pending: { label: 'Pendiente', ...ORANGE },
  paid:    { label: 'Pagada',    ...GREEN  },
  overdue: { label: 'Vencida',   ...RED    },
}

// ── payout_status (liquidación) ──────────────────────────────
// Vocabulario raw unificado. 'en_curso' (legacy host) se normaliza a 'in_review'.
export type PayoutStatus = 'pending' | 'in_review' | 'paid' | 'retained' | 'refunded'
const PAYOUT_RAW: readonly string[] = ['pending', 'in_review', 'paid', 'retained', 'refunded']
export function normalizePayoutStatus(s: string | null | undefined): PayoutStatus {
  if (s === 'en_curso') return 'in_review'
  return (s && PAYOUT_RAW.includes(s)) ? (s as PayoutStatus) : 'pending'
}
export const PAYOUT_STATUS: Record<PayoutStatus, StatusStyle> = {
  pending:   { label: 'Pendiente de pago', ...ORANGE },
  in_review: { label: 'En revisión',       ...BLUE   },
  paid:      { label: 'Liquidado',         ...GREEN  },
  retained:  { label: 'Retenido',          ...RED    },
  refunded:  { label: 'Reembolsado',       ...GRAY   },
}
export function payoutStyle(s: string | null | undefined): StatusStyle {
  return PAYOUT_STATUS[normalizePayoutStatus(s)]
}

// ── host_subscriptions (Espot Pro) ──────────────────────────
// Estados internos de la suscripción → etiqueta humana (nunca mostrar el raw).
// 'Normal' (sin sub) y 'Próximo a vencer'/'Vencido por fecha' son DERIVADOS por
// la vista admin (no se almacenan); aquí van los estados base persistidos.
const AMBER = { color: '#F59E0B', bg: 'rgba(245,158,11,0.10)' }
export type SubscriptionStatus = 'trialing' | 'active' | 'pending_payment' | 'past_due' | 'cancelled' | 'expired' | 'suspended'
export const SUBSCRIPTION_STATUS: Record<SubscriptionStatus, StatusStyle> = {
  trialing:        { label: 'Prueba gratuita',  ...BLUE   },
  active:          { label: 'Pro activo',        ...GREEN  },
  pending_payment: { label: 'Pendiente de pago', ...ORANGE },
  past_due:        { label: 'Vencido',           ...RED    },
  expired:         { label: 'Vencido',           ...RED    },
  cancelled:       { label: 'Cancelado',         ...GRAY   },
  suspended:       { label: 'Suspendido',        ...RED    },
}
export function subscriptionStyle(s: string | null | undefined): StatusStyle {
  if (!s) return { label: 'Normal', ...GRAY }
  return SUBSCRIPTION_STATUS[s as SubscriptionStatus] ?? { label: 'Normal', ...GRAY }
}
/** Estilo "Próximo a vencer" (derivado por días restantes). */
export const SUBSCRIPTION_EXPIRING: StatusStyle = { label: 'Próximo a vencer', ...AMBER }

/**
 * Estado admin-facing DERIVADO de la fila del propietario (combina estado base
 * + plan efectivo + días restantes). Esto es lo que se pinta en el módulo Pro.
 */
export function proAdminStyle(row: {
  plan: 'free' | 'pro'
  sub: { status: string } | null
  daysLeft: number | null
}): StatusStyle {
  if (!row.sub) return { label: 'Normal', ...GRAY }
  if (row.plan === 'free') {
    // Sub existe pero no desbloquea: cancelada/suspendida/pendiente/vencida.
    if (row.sub.status === 'cancelled') return SUBSCRIPTION_STATUS.cancelled
    if (row.sub.status === 'suspended') return SUBSCRIPTION_STATUS.suspended
    if (row.sub.status === 'pending_payment') return SUBSCRIPTION_STATUS.pending_payment
    return SUBSCRIPTION_STATUS.expired // past_due / expired / prueba vencida
  }
  // plan === 'pro' (active o trialing, vigente)
  if (row.daysLeft != null && row.daysLeft <= 7) return SUBSCRIPTION_EXPIRING
  return subscriptionStyle(row.sub.status)
}

// ── external_events (Espot Directo / reservas externas) ──────
export type ExternalEventStatus = 'pendiente' | 'confirmado' | 'en_curso' | 'completado' | 'cancelado'
export const EXTERNAL_EVENT_STATUS: Record<ExternalEventStatus, StatusStyle> = {
  pendiente:  { label: 'Pendiente',  ...ORANGE },
  confirmado: { label: 'Confirmado', ...GREEN  },
  en_curso:   { label: 'En curso',   ...BLUE   },
  completado: { label: 'Completado', ...GREEN  },
  cancelado:  { label: 'Cancelado',  ...RED    },
}
export function externalEventStyle(s: string | null | undefined): StatusStyle {
  return EXTERNAL_EVENT_STATUS[(s ?? 'pendiente') as ExternalEventStatus] ?? EXTERNAL_EVENT_STATUS.pendiente
}
