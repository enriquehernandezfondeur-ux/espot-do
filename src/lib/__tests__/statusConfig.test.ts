import {
  PAYMENT_STATUS, INSTALLMENT_STATUS, PAYOUT_STATUS, EXTERNAL_EVENT_STATUS,
  paymentStyle, payoutStyle, externalEventStyle, normalizePayoutStatus,
  type PaymentStatus, type PayoutStatus, type ExternalEventStatus, type InstallmentStatus,
} from '@/lib/statusConfig'

// Cada union debe estar cubierto por su mapa (un estado nuevo en DB no puede
// quedar sin etiqueta/color).
describe('cobertura exhaustiva de los mappers', () => {
  const PAYMENT: PaymentStatus[] = ['unpaid', 'advance', 'partial', 'paid']
  const INSTALLMENT: InstallmentStatus[] = ['pending', 'paid', 'overdue']
  const PAYOUT: PayoutStatus[] = ['pending', 'in_review', 'paid', 'retained', 'refunded']
  const EXTERNAL: ExternalEventStatus[] = ['pendiente', 'confirmado', 'en_curso', 'completado', 'cancelado']

  it('payment cubre su union', () => PAYMENT.forEach(s => expect(PAYMENT_STATUS[s]?.label).toBeTruthy()))
  it('installment cubre su union', () => INSTALLMENT.forEach(s => expect(INSTALLMENT_STATUS[s]?.label).toBeTruthy()))
  it('payout cubre su union', () => PAYOUT.forEach(s => expect(PAYOUT_STATUS[s]?.label).toBeTruthy()))
  it('external cubre su union', () => EXTERNAL.forEach(s => expect(EXTERNAL_EVENT_STATUS[s]?.label).toBeTruthy()))
})

describe('helpers con fallback seguro', () => {
  it('paymentStyle nunca devuelve undefined', () => {
    expect(paymentStyle('paid').label).toBe('Pagado')
    expect(paymentStyle(null).label).toBe('Sin pago')
    expect(paymentStyle('zzz').label).toBe('Sin pago')
  })
  it('externalEventStyle nunca devuelve undefined', () => {
    expect(externalEventStyle('confirmado').label).toBe('Confirmado')
    expect(externalEventStyle(undefined).label).toBe('Pendiente')
  })
  it('payoutStyle normaliza en_curso → in_review', () => {
    expect(normalizePayoutStatus('en_curso')).toBe('in_review')
    expect(payoutStyle('en_curso').label).toBe('En revisión')
    expect(payoutStyle('paid').label).toBe('Liquidado')
    expect(payoutStyle(null).label).toBe('Pendiente de pago')
  })
})
