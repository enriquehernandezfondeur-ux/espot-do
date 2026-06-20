import { computeBasePrice, computePlatformFee, computeHostNet, platformFeeOf, hostNetOf, isWeekendDate, consumptionLabel } from '@/lib/pricing'

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
