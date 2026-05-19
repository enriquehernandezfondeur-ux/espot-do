// ── Sistema de estados de reserva ────────────────────────
// Paleta unificada para todo el dashboard:
//   Verde   → confirmado / completado
//   Naranja → pendiente / pago pendiente
//   Azul    → aceptado / cotización
//   Rojo    → cancelado / rechazado
//   Gris    → neutro

// Estados de payment_status que indican que el depósito fue cobrado.
// Azul pone 'advance'; legacy/manual pone 'partial' o 'paid'.
export const PAID_STATUSES = ['advance', 'partial', 'paid'] as const
export type PaymentPaidStatus = typeof PAID_STATUSES[number]
export function isPaid(ps: string | null | undefined): boolean {
  return PAID_STATUSES.includes(ps as PaymentPaidStatus)
}

export type BookingStatus =
  | 'pending'
  | 'accepted'
  | 'confirmed'
  | 'rejected'
  | 'cancelled_guest'
  | 'cancelled_host'
  | 'completed'
  | 'quote_requested'

export const STATUS_LABELS: Record<BookingStatus, string> = {
  pending:          'Pendiente de confirmación',
  accepted:         'Pendiente de pago',
  confirmed:        'Confirmada',
  rejected:         'Rechazada',
  cancelled_guest:  'Cancelada por cliente',
  cancelled_host:   'Cancelada por propietario',
  completed:        'Completada',
  quote_requested:  'Cotización',
}

export const STATUS_COLORS: Record<BookingStatus, { color: string; bg: string }> = {
  pending:          { color: '#D97706', bg: 'rgba(217,119,6,0.08)'   },
  accepted:         { color: '#03313C', bg: 'rgba(3,49,60,0.07)'     },
  confirmed:        { color: '#16A34A', bg: '#F7F7F7'                },
  rejected:         { color: '#DC2626', bg: 'rgba(220,38,38,0.08)'   },
  cancelled_guest:  { color: '#DC2626', bg: 'rgba(220,38,38,0.08)'   },
  cancelled_host:   { color: '#D97706', bg: 'rgba(217,119,6,0.08)'   },
  completed:        { color: '#16A34A', bg: '#F7F7F7'                },
  quote_requested:  { color: '#03313C', bg: 'rgba(3,49,60,0.07)'     },
}
