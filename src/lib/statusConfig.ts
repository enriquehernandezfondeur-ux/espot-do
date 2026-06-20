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
