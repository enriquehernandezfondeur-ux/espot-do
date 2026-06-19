import { buildSchedule, scheduleModelLabel } from '@/lib/payments/schedule'

// Construye una fecha YYYY-MM-DD a N días desde hoy (para controlar el bucket del modelo)
function inDays(n: number): string {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + n)
  return d.toISOString().split('T')[0]
}

const sum = (xs: { amount: number }[]) => xs.reduce((s, x) => s + x.amount, 0)

describe('buildSchedule — selección de modelo por días al evento', () => {
  it('< 7 días → pago único 100%', () => {
    const s = buildSchedule(inDays(3), 10000)
    expect(s.model).toBe('100')
    expect(s.installments).toHaveLength(1)
    expect(s.installments[0].percentage).toBe(100)
  })

  it('7–30 días → 50/50', () => {
    const s = buildSchedule(inDays(20), 10000)
    expect(s.model).toBe('50_50')
    expect(s.installments.map(i => i.percentage)).toEqual([50, 50])
  })

  it('31–60 días → 30/70', () => {
    const s = buildSchedule(inDays(45), 10000)
    expect(s.model).toBe('30_70')
    expect(s.installments.map(i => i.percentage)).toEqual([30, 70])
  })

  it('> 60 días → 25/50/25', () => {
    const s = buildSchedule(inDays(90), 10000)
    expect(s.model).toBe('25_50_25')
    expect(s.installments.map(i => i.percentage)).toEqual([25, 50, 25])
  })
})

describe('buildSchedule — integridad de montos', () => {
  it('las cuotas SIEMPRE suman el total (la última absorbe el residuo)', () => {
    for (const days of [3, 20, 45, 90]) {
      for (const total of [10000, 9999, 10001, 33333, 7]) {
        const s = buildSchedule(inDays(days), total)
        expect(sum(s.installments)).toBe(total)
      }
    }
  })

  it('reparte el residuo de redondeo en la última cuota (25/50/25 de 10001)', () => {
    const s = buildSchedule(inDays(90), 10001)
    // 25% -> 2500, 50% -> 5001 (round), última = 10001 - 2500 - 5001 = 2500
    expect(s.installments[0].amount).toBe(2500)
    expect(s.installments[1].amount).toBe(5001)
    expect(s.installments[2].amount).toBe(2500)
    expect(sum(s.installments)).toBe(10001)
  })

  it('las fechas de vencimiento son monótonas no decrecientes', () => {
    const s = buildSchedule(inDays(90), 10000)
    for (let i = 1; i < s.installments.length; i++) {
      expect(s.installments[i].due_date >= s.installments[i - 1].due_date).toBe(true)
    }
  })
})

describe('buildSchedule — estado de cuotas existentes', () => {
  it('refleja cuotas ya pagadas y calcula paidAmount', () => {
    const s = buildSchedule(inDays(20), 10000, [
      { number: 1, status: 'paid', amount: 5000 },
    ])
    expect(s.installments[0].status).toBe('paid')
    expect(s.paidAmount).toBe(5000)
    expect(s.nextDue?.number).toBe(2)
  })
})

describe('scheduleModelLabel', () => {
  it('devuelve etiquetas legibles', () => {
    expect(scheduleModelLabel('100')).toMatch(/único/i)
    expect(scheduleModelLabel('25_50_25')).toMatch(/3 cuotas/i)
  })
})
