import { generatePublicCode, isValidPublicCode } from '@/lib/activities/public-code'

describe('public-code', () => {
  it('generates an 8-char base62 code', () => {
    const code = generatePublicCode()
    expect(code).toHaveLength(8)
    expect(/^[0-9A-Za-z]{8}$/.test(code)).toBe(true)
  })
  it('is statistically unique across 5000 generations', () => {
    const seen = new Set<string>()
    for (let i = 0; i < 5000; i++) seen.add(generatePublicCode())
    expect(seen.size).toBe(5000)
  })
  it('validates format', () => {
    expect(isValidPublicCode('aB3xZ9q1')).toBe(true)
    expect(isValidPublicCode('short')).toBe(false)
    expect(isValidPublicCode('has space')).toBe(false)
  })
})
