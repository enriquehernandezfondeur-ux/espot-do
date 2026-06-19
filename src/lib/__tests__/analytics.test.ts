import { clickThroughRate } from '@/lib/analytics'

describe('clickThroughRate', () => {
  it('clics ÷ vistas en %', () => {
    expect(clickThroughRate(100, 25)).toBe(25)
    expect(clickThroughRate(200, 25)).toBe(12.5)
  })
  it('null si no hay vistas', () => {
    expect(clickThroughRate(0, 10)).toBeNull()
  })
  it('redondea a un decimal', () => {
    expect(clickThroughRate(3, 1)).toBe(33.3)
  })
})
