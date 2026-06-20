import { resolvePlan, subscriptionSummary } from '@/lib/plans'

const NOW = '2026-06-19T12:00:00.000Z'

describe('resolvePlan', () => {
  it('sin suscripción => free', () => {
    expect(resolvePlan(null, NOW)).toBe('free')
    expect(resolvePlan(undefined, NOW)).toBe('free')
  })
  it('active sin fecha de fin => pro', () => {
    expect(resolvePlan({ status: 'active', current_period_end: null }, NOW)).toBe('pro')
  })
  it('active con periodo vigente => pro', () => {
    expect(resolvePlan({ status: 'active', current_period_end: '2026-07-19T12:00:00.000Z' }, NOW)).toBe('pro')
  })
  it('active pero vencido => free', () => {
    expect(resolvePlan({ status: 'active', current_period_end: '2026-06-01T12:00:00.000Z' }, NOW)).toBe('free')
  })
  it('pending_payment => free', () => {
    expect(resolvePlan({ status: 'pending_payment', current_period_end: '2026-07-19T12:00:00.000Z' }, NOW)).toBe('free')
  })
  it('cancelled/expired/past_due/suspended => free', () => {
    expect(resolvePlan({ status: 'cancelled', current_period_end: null }, NOW)).toBe('free')
    expect(resolvePlan({ status: 'expired', current_period_end: null }, NOW)).toBe('free')
    expect(resolvePlan({ status: 'past_due', current_period_end: '2026-07-19T12:00:00.000Z' }, NOW)).toBe('free')
    expect(resolvePlan({ status: 'suspended', current_period_end: '2026-07-19T12:00:00.000Z' }, NOW)).toBe('free')
  })
  it('trialing vigente => pro (la prueba desbloquea)', () => {
    expect(resolvePlan({ status: 'trialing', current_period_end: '2026-07-19T12:00:00.000Z' }, NOW)).toBe('pro')
  })
  it('trialing vencido => free', () => {
    expect(resolvePlan({ status: 'trialing', current_period_end: '2026-06-01T12:00:00.000Z' }, NOW)).toBe('free')
  })
})

describe('subscriptionSummary', () => {
  it('sin suscripción => plan normal', () => {
    const s = subscriptionSummary(null, NOW)
    expect(s.plan).toBe('free')
    expect(s.isPro).toBe(false)
    expect(s.statusLabel).toBe('Plan Normal (gratis)')
    expect(s.nextChargeISO).toBeNull()
    expect(s.daysLeft).toBeNull()
  })
  it('active con 30 días => pro, días restantes', () => {
    const s = subscriptionSummary({ status: 'active', current_period_end: '2026-07-19T12:00:00.000Z' }, NOW)
    expect(s.isPro).toBe(true)
    expect(s.statusLabel).toBe('Espot Pro activo')
    expect(s.daysLeft).toBe(30)
    expect(s.nextChargeISO).toBe('2026-07-19T12:00:00.000Z')
  })
  it('pending_payment => no pro pero etiqueta de pendiente', () => {
    const s = subscriptionSummary({ status: 'pending_payment', current_period_end: null }, NOW)
    expect(s.isPro).toBe(false)
    expect(s.statusLabel).toBe('Pago pendiente')
  })
  it('vencido => días en null (no es activo)', () => {
    const s = subscriptionSummary({ status: 'active', current_period_end: '2026-06-01T12:00:00.000Z' }, NOW)
    expect(s.isPro).toBe(false)
    expect(s.daysLeft).toBeNull()
  })
  it('cancelado con fecha futura => no insinúa cobro ni días', () => {
    const s = subscriptionSummary({ status: 'cancelled', current_period_end: '2026-07-19T12:00:00.000Z' }, NOW)
    expect(s.isPro).toBe(false)
    expect(s.nextChargeISO).toBeNull()
    expect(s.daysLeft).toBeNull()
    expect(s.statusLabel).toBe('Cancelado')
  })
  it('prueba (trialing) vigente => pro, isTrial true, días restantes', () => {
    const s = subscriptionSummary({ status: 'trialing', current_period_end: '2026-07-19T12:00:00.000Z' }, NOW)
    expect(s.isPro).toBe(true)
    expect(s.isTrial).toBe(true)
    expect(s.statusLabel).toBe('Prueba gratuita')
    expect(s.daysLeft).toBe(30)
  })
})
