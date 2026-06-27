import { normPhone, dedupeEspotGuests } from '@/lib/clients-dedup'

describe('normPhone', () => {
  it('se queda con los últimos 10 dígitos', () => {
    expect(normPhone('+1 809 555 1234')).toBe('8095551234')
    expect(normPhone('1-809-555-1234')).toBe('8095551234')
    expect(normPhone('(809) 555-1234')).toBe('8095551234')
  })

  it('maneja null/undefined/vacío', () => {
    expect(normPhone(null)).toBe('')
    expect(normPhone(undefined)).toBe('')
    expect(normPhone('')).toBe('')
  })

  it('quita prefijo país pero conserva el número local de 10 dígitos', () => {
    // 1 (país) + 8095551234 → últimos 10 = el número local
    expect(normPhone('18095551234')).toBe('8095551234')
  })
})

describe('dedupeEspotGuests', () => {
  const guest = (id: string, over: Partial<{ full_name: string; email: string | null; phone: string | null }> = {}) => ({
    guest: { id, full_name: 'Guest ' + id, email: null, phone: null, ...over },
  })

  it('sin clientes directos devuelve todos los huéspedes únicos', () => {
    const out = dedupeEspotGuests([], [guest('a'), guest('b')])
    expect(out.map((g) => g.id)).toEqual(['a', 'b'])
  })

  it('omite el huésped cuyo email coincide con un cliente directo (case-insensitive)', () => {
    const direct = [{ email: 'Ana@MAIL.com', phone: null }]
    const out = dedupeEspotGuests(direct, [guest('a', { email: 'ana@mail.com' }), guest('b', { email: 'otro@mail.com' })])
    expect(out.map((g) => g.id)).toEqual(['b'])
  })

  it('omite el huésped cuyo teléfono normalizado coincide con un cliente directo', () => {
    const direct = [{ email: null, phone: '809-555-1234' }]
    const out = dedupeEspotGuests(direct, [guest('a', { phone: '+1 (809) 555 1234' }), guest('b', { phone: '809-000-0000' })])
    expect(out.map((g) => g.id)).toEqual(['b'])
  })

  it('NO de-duplica por teléfonos demasiado cortos (<7 dígitos)', () => {
    const direct = [{ email: null, phone: '12345' }]
    const out = dedupeEspotGuests(direct, [guest('a', { phone: '12345' })])
    expect(out.map((g) => g.id)).toEqual(['a'])
  })

  it('colapsa múltiples bookings del mismo guest a una sola entrada (gana el primero)', () => {
    const out = dedupeEspotGuests([], [
      guest('a', { full_name: 'Primero' }),
      guest('a', { full_name: 'Segundo' }),
    ])
    expect(out).toHaveLength(1)
    expect(out[0].full_name).toBe('Primero')
  })

  it('ignora bookings sin guest', () => {
    const out = dedupeEspotGuests([], [{ guest: null }, { guest: undefined }, guest('a')])
    expect(out.map((g) => g.id)).toEqual(['a'])
  })

  it('rellena full_name por defecto cuando falta', () => {
    const out = dedupeEspotGuests([], [{ guest: { id: 'a', email: null, phone: null } }])
    expect(out[0].full_name).toBe('Cliente Espot')
  })

  it('un guest matchea por email aunque el teléfono difiera', () => {
    const direct = [{ email: 'x@y.com', phone: '809-111-1111' }]
    const out = dedupeEspotGuests(direct, [guest('a', { email: 'x@y.com', phone: '809-999-9999' })])
    expect(out).toHaveLength(0)
  })

  it('preserva email/phone originales (no normaliza el output)', () => {
    const out = dedupeEspotGuests([], [guest('a', { email: 'A@B.com', phone: '+1 809 555 1234' })])
    expect(out[0].email).toBe('A@B.com')
    expect(out[0].phone).toBe('+1 809 555 1234')
  })
})
