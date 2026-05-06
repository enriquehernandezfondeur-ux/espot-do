// ── Sistema de estados de reserva ────────────────────────
// Paleta unificada para todo el dashboard:
//   Verde   → confirmado / completado
//   Naranja → pendiente / pago pendiente
//   Azul    → aceptado / cotización
//   Rojo    → cancelado / rechazado
//   Gris    → neutro

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
  pending:          'Pendiente',
  accepted:         'Pendiente de pago',
  confirmed:        'Confirmada',
  rejected:         'Rechazada',
  cancelled_guest:  'Cancelada',
  cancelled_host:   'Cancelada',
  completed:        'Completada',
  quote_requested:  'Cotización',
}

export const STATUS_COLORS: Record<BookingStatus, { color: string; bg: string }> = {
  pending:          { color: '#D97706', bg: 'rgba(217,119,6,0.08)'   },  // Naranja
  accepted:         { color: '#2563EB', bg: 'rgba(37,99,235,0.08)'   },  // Azul
  confirmed:        { color: '#16A34A', bg: 'rgba(22,163,74,0.08)'   },  // Verde
  rejected:         { color: '#DC2626', bg: 'rgba(220,38,38,0.08)'   },  // Rojo
  cancelled_guest:  { color: '#DC2626', bg: 'rgba(220,38,38,0.08)'   },  // Rojo
  cancelled_host:   { color: '#DC2626', bg: 'rgba(220,38,38,0.08)'   },  // Rojo
  completed:        { color: '#6B7280', bg: 'rgba(107,114,128,0.08)' },  // Gris (completado = neutral)
  quote_requested:  { color: '#0891B2', bg: 'rgba(8,145,178,0.08)'   },  // Cyan
}
