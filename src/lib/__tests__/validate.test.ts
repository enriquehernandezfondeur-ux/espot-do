import { isUuid, isTime } from '@/lib/validate'

describe('isUuid', () => {
  it('acepta UUIDs canónicos', () => {
    expect(isUuid('123e4567-e89b-12d3-a456-426614174000')).toBe(true)
    expect(isUuid('00000000-0000-0000-0000-000000000000')).toBe(true)
  })
  it('rechaza no-UUIDs y payloads de inyección PostgREST', () => {
    expect(isUuid('')).toBe(false)
    expect(isUuid('abc')).toBe(false)
    expect(isUuid('123e4567-e89b-12d3-a456-426614174000,id.gt.0')).toBe(false)
    expect(isUuid('and(sender_id.eq.x)')).toBe(false)
    expect(isUuid(null)).toBe(false)
    expect(isUuid(undefined)).toBe(false)
    expect(isUuid(123 as unknown)).toBe(false)
  })
})

describe('isTime', () => {
  it('acepta HH:MM válidas', () => {
    expect(isTime('00:00')).toBe(true)
    expect(isTime('23:59')).toBe(true)
    expect(isTime('09:30')).toBe(true)
  })
  it('rechaza formatos inválidos e inyección', () => {
    expect(isTime('24:00')).toBe(false)
    expect(isTime('9:30')).toBe(false)
    expect(isTime('12:60')).toBe(false)
    expect(isTime('00:00,id.gt.0')).toBe(false)
    expect(isTime('')).toBe(false)
    expect(isTime(null)).toBe(false)
  })
})
