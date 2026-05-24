import { formatCurrency } from '@/lib/utils'

export interface Installment {
  number:     number        // 1, 2, 3
  percentage: number        // 25, 50, 25
  amount:     number        // RD$ calculado
  due_date:   string        // YYYY-MM-DD
  label:      string        // "Para confirmar", "7 semanas antes", etc.
  status:     'pending' | 'paid' | 'overdue'
}

export interface PaymentSchedule {
  model:          '100' | '50_50' | '30_70' | '25_50_25'
  installments:   Installment[]
  daysUntilEvent: number
  totalAmount:    number
  paidAmount:     number
  nextDue:        Installment | null
}

/** Calcula la fecha limite de cada cuota */
function addDays(date: string, days: number): string {
  if (!days || isNaN(days)) return date
  const d = new Date(date + 'T12:00:00')
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

/** Días entre hoy y la fecha del evento (positivo = futuro, negativo = pasado) */
export function daysUntilEvent(eventDate: string | null | undefined): number {
  if (!eventDate) return 0
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const event = new Date(eventDate + 'T12:00:00')
  if (isNaN(event.getTime())) return 0
  return Math.floor((event.getTime() - today.getTime()) / 86400000)
}

/** Días hasta una fecha de vencimiento (puede ser negativo si ya venció) */
export function daysUntilDate(dateStr: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(dateStr + 'T12:00:00')
  return Math.floor((due.getTime() - today.getTime()) / 86400000)
}

/** Genera el schedule de cuotas según los días al evento (último pago 48h antes) */
export function buildSchedule(
  eventDate: string,
  totalAmount: number,
  existingInstallments?: { number: number; status: string; paid_at?: string | null; amount: number }[]
): PaymentSchedule {
  const rawDays = daysUntilEvent(eventDate)
  const days    = isNaN(rawDays) ? 0 : Math.max(0, rawDays)
  const today = new Date().toISOString().split('T')[0]

  type ScheduleDef = { pct: number; daysOffset: number; label: string }[]

  let model: PaymentSchedule['model']
  let defs: ScheduleDef

  if (days < 7) {
    model = '100'
    defs  = [{ pct: 100, daysOffset: 0, label: 'Pago completo al confirmar' }]
  } else if (days <= 30) {
    model = '50_50'
    defs  = [
      { pct: 50, daysOffset: 0,                   label: 'Al confirmar la reserva' },
      { pct: 50, daysOffset: Math.max(1, days - 2), label: '48h antes del evento' },
    ]
  } else if (days <= 60) {
    model = '30_70'
    defs  = [
      { pct: 30, daysOffset: 0,                   label: 'Al confirmar la reserva' },
      { pct: 70, daysOffset: Math.max(1, days - 2), label: '48h antes del evento' },
    ]
  } else {
    model = '25_50_25'
    defs  = [
      { pct: 25, daysOffset: 0,                          label: 'Al confirmar la reserva' },
      { pct: 50, daysOffset: Math.max(1, Math.floor(days / 2)), label: 'A mitad del camino' },
      { pct: 25, daysOffset: Math.max(2, days - 2),      label: '48h antes del evento' },
    ]
  }

  // Redondear al peso; el último absorbe el residuo
  const amounts = defs.map((d, i) => {
    if (i === defs.length - 1) {
      const prev = defs.slice(0, i).reduce((s, x) => s + Math.round(totalAmount * x.pct / 100), 0)
      return totalAmount - prev
    }
    return Math.round(totalAmount * d.pct / 100)
  })

  const installments: Installment[] = defs.map((d, i) => {
    const existing  = existingInstallments?.find(e => e.number === i + 1)
    const dueDate   = addDays(today, d.daysOffset)
    const isPaid    = existing?.status === 'paid'
    const isOverdue = !isPaid && dueDate < today

    return {
      number:     i + 1,
      percentage: d.pct,
      amount:     amounts[i],
      due_date:   dueDate,
      label:      d.label,
      status:     isPaid ? 'paid' : isOverdue ? 'overdue' : 'pending',
    }
  })

  const paidAmount = installments
    .filter(i => i.status === 'paid')
    .reduce((s, i) => s + i.amount, 0)

  const nextDue = installments.find(i => i.status !== 'paid') ?? null

  return { model, installments, daysUntilEvent: days, totalAmount, paidAmount, nextDue }
}

/** Descripción del modelo para mostrar al usuario */
export function scheduleModelLabel(model: PaymentSchedule['model']): string {
  return {
    '100':      'Pago único',
    '50_50':    'Pago en 2 cuotas (50/50)',
    '30_70':    'Pago en 2 cuotas (30/70)',
    '25_50_25': 'Pago en 3 cuotas (25/50/25)',
  }[model] ?? 'Plan de pagos'
}

/** Formato de countdown tipo "faltan X días" */
export function countdownLabel(dateStr: string): string {
  const days = daysUntilDate(dateStr)
  if (days < 0)  return `Venció hace ${Math.abs(days)} día${Math.abs(days) !== 1 ? 's' : ''}`
  if (days === 0) return 'Vence hoy'
  if (days === 1) return 'Vence mañana'
  return `Faltan ${days} día${days !== 1 ? 's' : ''}`
}
