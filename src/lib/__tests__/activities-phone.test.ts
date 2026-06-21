import { toWhatsappNumber } from '@/lib/activities/phone'

describe('toWhatsappNumber', () => {
  it('adds DR country code to a 10-digit local number', () => {
    expect(toWhatsappNumber('809-555-1234')).toBe('18095551234')
    expect(toWhatsappNumber('(829) 555 0000')).toBe('18295550000')
  })
  it('keeps numbers that already include the country code', () => {
    expect(toWhatsappNumber('+1 849 555 7777')).toBe('18495557777')
  })
  it('returns null for emails or too-short input', () => {
    expect(toWhatsappNumber('ana@correo.com')).toBeNull()
    expect(toWhatsappNumber('5551234')).toBeNull()
    expect(toWhatsappNumber('')).toBeNull()
    expect(toWhatsappNumber(null)).toBeNull()
  })
})
