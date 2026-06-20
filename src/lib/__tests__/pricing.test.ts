import { computeBasePrice, computePlatformFee, computeHostNet, platformFeeOf, hostNetOf, isWeekendDate, consumptionLabel, summarizePricing, getMinimumPrice, getActivePricing } from '@/lib/pricing'

describe('isWeekendDate', () => {
  it('trata viernes, sábado y domingo como fin de semana', () => {
    expect(isWeekendDate('2026-05-29')).toBe(true)  // viernes
    expect(isWeekendDate('2026-05-30')).toBe(true)  // sábado
    expect(isWeekendDate('2026-05-31')).toBe(true)  // domingo
  })
  it('trata lunes a jueves como día de semana', () => {
    expect(isWeekendDate('2026-05-25')).toBe(false) // lunes
    expect(isWeekendDate('2026-05-28')).toBe(false) // jueves
  })
  it('devuelve false sin fecha', () => {
    expect(isWeekendDate('')).toBe(false)
    expect(isWeekendDate(null)).toBe(false)
  })
})

describe('computeBasePrice', () => {
  it('hourly: precio por hora × horas', () => {
    const p = { pricing_type: 'hourly', hourly_price: 1000 }
    expect(computeBasePrice(p, 3, '2026-05-25')).toBe(3000)
  })

  it('minimum_consumption: monto fijo independiente de las horas', () => {
    const p = { pricing_type: 'minimum_consumption', minimum_consumption: 5000 }
    expect(computeBasePrice(p, 4, '2026-05-25')).toBe(5000)
  })

  it('fixed_package: base + horas extra sobre las incluidas', () => {
    const p = { pricing_type: 'fixed_package', fixed_price: 10000, package_hours: 4, extra_hour_price: 1500 }
    expect(computeBasePrice(p, 6, '2026-05-25')).toBe(13000) // 10000 + 2*1500
  })

  it('fixed_package: sin horas extra si está dentro del paquete', () => {
    const p = { pricing_type: 'fixed_package', fixed_price: 10000, package_hours: 4, extra_hour_price: 1500 }
    expect(computeBasePrice(p, 3, '2026-05-25')).toBe(10000)
  })

  it('aplica el multiplicador de fin de semana', () => {
    const p = { pricing_type: 'hourly', hourly_price: 1000, weekend_multiplier: 1.5 }
    expect(computeBasePrice(p, 2, '2026-05-30')).toBe(3000) // 2000 * 1.5, sábado
    expect(computeBasePrice(p, 2, '2026-05-25')).toBe(2000) // lunes, sin multiplicador
  })

  it('no aplica multiplicador <= 0 o == 1', () => {
    const p1 = { pricing_type: 'hourly', hourly_price: 1000, weekend_multiplier: 1 }
    expect(computeBasePrice(p1, 2, '2026-05-30')).toBe(2000)
    const p0 = { pricing_type: 'hourly', hourly_price: 1000, weekend_multiplier: 0 }
    expect(computeBasePrice(p0, 2, '2026-05-30')).toBe(2000)
  })

  it('redondea a entero (paridad cliente↔servidor)', () => {
    const p = { pricing_type: 'hourly', hourly_price: 333.33, weekend_multiplier: 1.5 }
    // 333.33*2 = 666.66, *1.5 = 999.99 -> 1000
    expect(computeBasePrice(p, 2, '2026-05-30')).toBe(1000)
  })

  it('devuelve 0 para custom_quote o pricing nulo', () => {
    expect(computeBasePrice({ pricing_type: 'custom_quote' }, 3, '2026-05-25')).toBe(0)
    expect(computeBasePrice(null, 3, '2026-05-25')).toBe(0)
    expect(computeBasePrice(undefined, 3, '2026-05-25')).toBe(0)
  })
})

describe('computePlatformFee', () => {
  it('calcula el 10% redondeado', () => {
    expect(computePlatformFee(10000)).toBe(1000)
    expect(computePlatformFee(9995)).toBe(1000) // 999.5 -> 1000
    expect(computePlatformFee(0)).toBe(0)
  })
})

describe('computeHostNet', () => {
  it('neto = total − comisión 10% (consistente con la liquidación)', () => {
    expect(computeHostNet(10000)).toBe(9000)
    expect(computeHostNet(1505)).toBe(1505 - 151) // 1354, no 1355 (round(total*0.90))
  })
})

describe('platformFeeOf / hostNetOf (fuente única de pantallas)', () => {
  it('usa la comisión guardada cuando existe', () => {
    expect(platformFeeOf({ total_amount: 10000, platform_fee: 1234 })).toBe(1234)
    expect(hostNetOf({ total_amount: 10000, platform_fee: 1234 })).toBe(8766)
  })
  it('cae a computePlatformFee cuando platform_fee es null/undefined', () => {
    expect(platformFeeOf({ total_amount: 10000, platform_fee: null })).toBe(1000)
    expect(platformFeeOf({ total_amount: 10000 })).toBe(1000)
    expect(hostNetOf({ total_amount: 10000 })).toBe(9000)
  })
  it('platform_fee = 0 se respeta (no se trata como ausente)', () => {
    expect(platformFeeOf({ total_amount: 10000, platform_fee: 0 })).toBe(0)
    expect(hostNetOf({ total_amount: 10000, platform_fee: 0 })).toBe(10000)
  })
  it('IDENTIDAD: comisión + neto = total en montos no múltiplos de 10', () => {
    for (const total of [1005, 1505, 999, 12345, 7, 333]) {
      expect(platformFeeOf({ total_amount: total }) + hostNetOf({ total_amount: total })).toBe(total)
    }
  })
  it('maneja fila vacía/nula sin romper', () => {
    expect(platformFeeOf({})).toBe(0)
    expect(hostNetOf({})).toBe(0)
  })
})

describe('consumptionLabel', () => {
  it('consumible', () => {
    expect(consumptionLabel(true)).toBe('Todo el monto se aplica en alimentos y bebidas')
  })
  it('no consumible', () => {
    expect(consumptionLabel(false)).toBe('Cubre el uso del espacio')
    expect(consumptionLabel(null)).toBe('Cubre el uso del espacio')
    expect(consumptionLabel(undefined)).toBe('Cubre el uso del espacio')
  })
})

describe('is_consumable no cambia el cálculo', () => {
  it('mismo precio con o sin consumible', () => {
    const a = computeBasePrice({ pricing_type: 'hourly', hourly_price: 1000, is_consumable: true }, 3, '2026-05-25')
    const b = computeBasePrice({ pricing_type: 'hourly', hourly_price: 1000, is_consumable: false }, 3, '2026-05-25')
    expect(a).toBe(b)
    expect(a).toBe(3000)
  })
})

describe('getActivePricing', () => {
  it('elige la fila activa', () => {
    const rows = [{ id: 'a', is_active: false }, { id: 'b', is_active: true }]
    expect(getActivePricing(rows)?.id).toBe('b')
  })
  it('cae a la primera si ninguna está activa', () => {
    expect(getActivePricing([{ id: 'a' }, { id: 'b' }])?.id).toBe('a')
  })
  it('null si no hay filas', () => {
    expect(getActivePricing([])).toBeNull()
    expect(getActivePricing(undefined)).toBeNull()
  })
})

describe('summarizePricing', () => {
  it('hourly: mínimo real = tarifa × min_hours (sin recargo de finde)', () => {
    const s = summarizePricing({ pricing_type: 'hourly', hourly_price: 2000, min_hours: 2, max_hours: 6, is_consumable: false, weekend_multiplier: 1.2 })!
    expect(s.minTotal).toBe(4000)          // 2000 × 2, sin aplicar +20%
    expect(s.rate).toBe(2000)
    expect(s.hoursLabel).toBe('2–6 h')
    expect(s.consumption).toBe('space')
    expect(s.weekend).toEqual({ pct: 20, isDiscount: false })
  })
  it('hourly sin máximo y consumible', () => {
    const s = summarizePricing({ pricing_type: 'hourly', hourly_price: 3500, min_hours: 3, is_consumable: true })!
    expect(s.minTotal).toBe(10500)
    expect(s.hoursLabel).toBe('Mín. 3 h')
    expect(s.consumption).toBe('consumable')
  })
  it('hourly con consumable_optional → consumption "optional", precio igual', () => {
    const s = summarizePricing({ pricing_type: 'hourly', hourly_price: 2000, min_hours: 2, max_hours: 6, is_consumable: false, consumable_optional: true })!
    expect(s.consumption).toBe('optional')   // gana sobre is_consumable
    expect(s.minTotal).toBe(4000)            // el precio no cambia
  })
  it('hourly sin min_hours → asume 1h', () => {
    const s = summarizePricing({ pricing_type: 'hourly', hourly_price: 5000 })!
    expect(s.minTotal).toBe(5000)
    expect(s.hoursLabel).toBeNull()
    expect(s.consumption).toBeNull()       // is_consumable ausente → no se afirma
  })
  it('minimum_consumption: mínimo = consumo y siempre consumible', () => {
    const s = summarizePricing({ pricing_type: 'minimum_consumption', minimum_consumption: 60000, min_hours: 4, max_hours: 4 })!
    expect(s.minTotal).toBe(60000)
    expect(s.rate).toBeNull()
    expect(s.hoursLabel).toBe('4 h')
    expect(s.consumption).toBe('consumable')
  })
  it('fixed_package: mínimo = precio fijo, sin "Desde"', () => {
    const s = summarizePricing({ pricing_type: 'fixed_package', fixed_price: 185000, package_hours: 8 })!
    expect(s.minTotal).toBe(185000)
    expect(s.typeKey).toBe('fixed_package')
    expect(s.hoursLabel).toBe('8 h incluidas')
  })
  it('custom_quote: sin precio', () => {
    const s = summarizePricing({ pricing_type: 'custom_quote' })!
    expect(s.minTotal).toBeNull()
    expect(s.typeKey).toBe('custom_quote')
  })
  it('null si no hay pricing', () => {
    expect(summarizePricing(null)).toBeNull()
  })
})

describe('getMinimumPrice (filtros/orden)', () => {
  it('coincide con summarizePricing.minTotal', () => {
    const p = { pricing_type: 'hourly', hourly_price: 2000, min_hours: 2 }
    expect(getMinimumPrice(p)).toBe(summarizePricing(p)!.minTotal)
  })
  it('0 para cotización (no rompe el orden)', () => {
    expect(getMinimumPrice({ pricing_type: 'custom_quote' })).toBe(0)
  })
})
