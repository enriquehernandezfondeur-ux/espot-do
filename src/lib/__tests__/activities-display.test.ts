import { effectiveStatus, capacity } from '@/lib/activities/display'

describe('effectiveStatus', () => {
  const today = '2026-07-12'
  it('shows finalizada when a published activity is in the past', () => {
    expect(effectiveStatus({ status: 'publicada', event_date: '2026-07-01' }, today)).toBe('finalizada')
  })
  it('keeps publicada when upcoming or no date', () => {
    expect(effectiveStatus({ status: 'publicada', event_date: '2026-08-01' }, today)).toBe('publicada')
    expect(effectiveStatus({ status: 'publicada', event_date: null }, today)).toBe('publicada')
  })
  it('respects cancelada and borrador regardless of date', () => {
    expect(effectiveStatus({ status: 'cancelada', event_date: '2026-07-01' }, today)).toBe('cancelada')
    expect(effectiveStatus({ status: 'borrador', event_date: '2026-07-01' }, today)).toBe('borrador')
  })
})

describe('capacity', () => {
  it('returns no pct when expected is null/0', () => {
    expect(capacity(null, 3).pct).toBeNull()
    expect(capacity(0, 3).pct).toBeNull()
    expect(capacity(null, 1).label).toBe('1 confirmado')
  })
  it('computes percentage and reached', () => {
    expect(capacity(10, 5)).toEqual({ pct: 50, reached: false, label: '5 de 10' })
    expect(capacity(10, 10).reached).toBe(true)
    expect(capacity(10, 12).pct).toBe(100) // se topa en 100
  })
})
