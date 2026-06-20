import { computePaymentState, bookingBalance } from '@/lib/booking-balance'

describe('computePaymentState', () => {
  it('ninguna cuota pagada → unpaid, 0', () => {
    expect(computePaymentState([{ status: 'pending', amount: 1000 }, { status: 'pending', amount: 2000 }]))
      .toEqual({ paidAmount: 0, paymentStatus: 'unpaid' })
  })
  it('una cuota pagada → advance', () => {
    expect(computePaymentState([{ status: 'paid', amount: 1000 }, { status: 'pending', amount: 2000 }]))
      .toEqual({ paidAmount: 1000, paymentStatus: 'advance' })
  })
  it('más de una pero no todas → partial', () => {
    expect(computePaymentState([{ status: 'paid', amount: 1000 }, { status: 'paid', amount: 2000 }, { status: 'pending', amount: 3000 }]))
      .toEqual({ paidAmount: 3000, paymentStatus: 'partial' })
  })
  it('todas pagadas → paid', () => {
    expect(computePaymentState([{ status: 'paid', amount: 1000 }, { status: 'paid', amount: 2000 }]))
      .toEqual({ paidAmount: 3000, paymentStatus: 'paid' })
  })
  it('sin cuotas → unpaid', () => {
    expect(computePaymentState([])).toEqual({ paidAmount: 0, paymentStatus: 'unpaid' })
    expect(computePaymentState(null)).toEqual({ paidAmount: 0, paymentStatus: 'unpaid' })
  })
})

describe('bookingBalance', () => {
  it('calcula total/pagado/pendiente', () => {
    expect(bookingBalance({ totalAmount: 10000, paidAmount: 3000 })).toEqual({ total: 10000, paid: 3000, pending: 7000 })
  })
  it('pendiente nunca negativo (sobrepago)', () => {
    expect(bookingBalance({ totalAmount: 10000, paidAmount: 12000 })).toEqual({ total: 10000, paid: 12000, pending: 0 })
  })
  it('valores faltantes → 0', () => {
    expect(bookingBalance({})).toEqual({ total: 0, paid: 0, pending: 0 })
  })
})
