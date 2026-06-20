// Fuente única del estado de pago y el balance de una reserva Espot.
// La verdad del pago son las cuotas (booking_installments). Este módulo es PURO
// (sin I/O) para poder testearlo y reutilizarlo en: el registro de pago manual,
// la tarjeta de balance del cliente y la definición única de "Por pagar".

export type PaymentStatus = 'unpaid' | 'advance' | 'partial' | 'paid'

export interface InstallmentLike {
  status?: string | null
  amount?: number | null
}

/**
 * Estado de pago derivado de las cuotas. Replica la lógica del confirm de Azul:
 * 'paid' si todas pagadas, 'partial' si >1 pagada, 'advance' si 1 pagada,
 * 'unpaid' si ninguna. paidAmount = suma redondeada de las cuotas pagadas.
 */
export function computePaymentState(installments: InstallmentLike[] | null | undefined): {
  paidAmount: number
  paymentStatus: PaymentStatus
} {
  const insts = installments ?? []
  const paid = insts.filter(i => i.status === 'paid')
  const paidAmount = Math.round(paid.reduce((s, i) => s + (Number(i.amount) || 0), 0))
  const paidCount = paid.length
  let paymentStatus: PaymentStatus = 'unpaid'
  if (insts.length > 0 && paidCount >= insts.length) paymentStatus = 'paid'
  else if (paidCount > 1) paymentStatus = 'partial'
  else if (paidCount === 1) paymentStatus = 'advance'
  return { paidAmount, paymentStatus }
}

/**
 * Balance de una reserva para mostrar al usuario: total, pagado y pendiente
 * (nunca negativo). Definición ÚNICA de "lo que falta por pagar" por reserva.
 */
export function bookingBalance(input: { totalAmount?: number | null; paidAmount?: number | null }): {
  total: number
  paid: number
  pending: number
} {
  const total = Math.round(Number(input.totalAmount) || 0)
  const paid = Math.round(Number(input.paidAmount) || 0)
  return { total, paid, pending: Math.max(0, total - paid) }
}
