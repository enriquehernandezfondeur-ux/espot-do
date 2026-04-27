// Configuración de estados — sin 'use server' para poder exportar objetos

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
  pending:          'Pendiente de aceptación',
  accepted:         'Aceptada · Pago pendiente',
  confirmed:        'Confirmada',
  rejected:         'Rechazada',
  cancelled_guest:  'Cancelada por cliente',
  cancelled_host:   'Cancelada por propietario',
  completed:        'Completada',
  quote_requested:  'Cotización solicitada',
}

export const STATUS_COLORS: Record<BookingStatus, { color: string; bg: string }> = {
  pending:          { color: '#D97706', bg: 'rgba(217,119,6,0.08)' },
  accepted:         { color: '#2563EB', bg: 'rgba(37,99,235,0.08)' },
  confirmed:        { color: '#16A34A', bg: 'rgba(22,163,74,0.08)' },
  rejected:         { color: '#DC2626', bg: 'rgba(220,38,38,0.08)' },
  cancelled_guest:  { color: '#DC2626', bg: 'rgba(220,38,38,0.08)' },
  cancelled_host:   { color: '#DC2626', bg: 'rgba(220,38,38,0.08)' },
  completed:        { color: '#7C3AED', bg: 'rgba(124,58,237,0.08)' },
  quote_requested:  { color: '#0891B2', bg: 'rgba(8,145,178,0.08)' },
}
