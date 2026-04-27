// ── Motor de pagos de Espot ───────────────────────────────
// Calcula calendarios de pago sin necesitar la DB (para preview en UI)

export type PlanType =
  | 'pago_completo'
  | 'pago_2_partes'
  | 'pago_3_partes'
  | 'cotizacion_personalizada'

export interface PaymentPlanConfig {
  plan_type:               PlanType
  // Para pago_2_partes
  porcentaje_inicial?:     number  // mínimo 10
  porcentaje_restante?:    number
  dias_antes_segundo_pago?: number
  // Para pago_3_partes
  porcentaje_segundo_pago?: number
  porcentaje_final?:        number
  momento_pago_final?:      'dia_antes' | 'mismo_dia' | 'en_el_espacio'
  permitir_pago_final_fuera?: boolean
}

export interface ScheduledPayment {
  payment_number:  number
  description:     string
  label:           string           // corto para la UI
  percentage:      number
  subtotal:        number           // monto del evento (sin comisión)
  platform_fee:    number           // 10% de Espot
  total:           number           // lo que paga el cliente online
  due_date:        Date
  due_label:       string           // "Hoy", "7 días antes", "Día del evento"
  is_first:        boolean          // bloquea la fecha
  is_final_onsite: boolean          // se paga en el espacio
  badges:          string[]         // ["Bloquea tu fecha", "Sin cargo extra"]
}

export interface PaymentSchedule {
  plan_type:        PlanType
  plan_label:       string
  plan_description: string
  payments:         ScheduledPayment[]
  total_event:      number
  total_online:     number          // suma de lo que se paga online
  total_onsite:     number          // lo que se paga en el espacio
  platform_fees:    number          // total de comisiones de Espot
}

const PLATFORM_PCT = 10 // %

export function buildPaymentSchedule(
  config:     PaymentPlanConfig,
  totalEvent: number,
  eventDate:  Date,
): PaymentSchedule {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  eventDate   = new Date(eventDate)
  eventDate.setHours(0, 0, 0, 0)

  const fee = PLATFORM_PCT / 100

  function addDays(date: Date, days: number): Date {
    const d = new Date(date)
    d.setDate(d.getDate() + days)
    return d
  }

  function laterOf(a: Date, b: Date): Date { return a > b ? a : b }

  function dueLabel(date: Date): string {
    const diff = Math.round((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    if (diff <= 0) return 'Hoy'
    if (diff === 1) return 'Mañana'
    const diffFromEvent = Math.round((eventDate.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
    if (diffFromEvent === 0) return 'Día del evento'
    if (diffFromEvent === 1) return '1 día antes del evento'
    if (diffFromEvent > 0) return `${diffFromEvent} días antes del evento`
    return date.toLocaleDateString('es-DO', { day: 'numeric', month: 'short' })
  }

  function calcPayment(pct: number, onsite = false): { subtotal: number; fee: number; total: number } {
    const subtotal    = Math.round(totalEvent * (pct / 100) * 100) / 100
    const platformFee = onsite ? 0 : Math.round(subtotal * fee * 100) / 100
    return { subtotal, fee: platformFee, total: subtotal + platformFee }
  }

  let payments: ScheduledPayment[] = []
  let plan_label = ''
  let plan_description = ''

  switch (config.plan_type) {

    // ── PAGO COMPLETO ───────────────────────────────────
    case 'pago_completo': {
      plan_label = 'Pago completo'
      plan_description = 'Paga el total hoy y tu fecha queda confirmada.'
      const p = calcPayment(100)
      payments = [{
        payment_number: 1, percentage: 100,
        description: 'Pago completo',
        label: 'Total hoy',
        subtotal: p.subtotal, platform_fee: p.fee, total: p.total,
        due_date: today, due_label: 'Hoy',
        is_first: true, is_final_onsite: false,
        badges: ['Bloquea tu fecha', 'Reserva confirmada inmediatamente'],
      }]
      break
    }

    // ── PAGO EN 2 PARTES ────────────────────────────────
    case 'pago_2_partes': {
      const pctI = config.porcentaje_inicial ?? 10
      const pctR = 100 - pctI
      const dias = config.dias_antes_segundo_pago ?? 7
      plan_label = `Pago en 2 partes`
      plan_description = `${pctI}% hoy para bloquear la fecha, ${pctR}% ${dias} días antes del evento.`
      const p1 = calcPayment(pctI)
      const p2 = calcPayment(pctR)
      const due2 = laterOf(addDays(today, 1), addDays(eventDate, -dias))
      payments = [
        {
          payment_number: 1, percentage: pctI,
          description: `${pctI}% ahora · Bloquea tu fecha`,
          label: 'Primer pago',
          subtotal: p1.subtotal, platform_fee: p1.fee, total: p1.total,
          due_date: today, due_label: 'Hoy',
          is_first: true, is_final_onsite: false,
          badges: ['Bloquea tu fecha'],
        },
        {
          payment_number: 2, percentage: pctR,
          description: `${pctR}% restante`,
          label: 'Segundo pago',
          subtotal: p2.subtotal, platform_fee: p2.fee, total: p2.total,
          due_date: due2, due_label: dueLabel(due2),
          is_first: false, is_final_onsite: false,
          badges: [],
        },
      ]
      break
    }

    // ── PAGO EN 3 PARTES (DEFAULT) ──────────────────────
    case 'pago_3_partes': {
      const pctI  = config.porcentaje_inicial ?? 10
      const pct2  = config.porcentaje_segundo_pago ?? 40
      const pct3  = config.porcentaje_final ?? 50
      const dias2 = config.dias_antes_segundo_pago ?? 7
      const final = config.momento_pago_final ?? 'en_el_espacio'
      const fuera = config.permitir_pago_final_fuera ?? true
      plan_label = 'Pago en 3 partes'
      plan_description = `${pctI}% hoy, ${pct2}% antes del evento, ${pct3}% ${fuera ? 'en el espacio' : final === 'dia_antes' ? '1 día antes' : 'el día del evento'}.`
      const p1 = calcPayment(pctI)
      const p2 = calcPayment(pct2)
      const p3 = calcPayment(pct3, fuera)
      const due2 = laterOf(addDays(today, 1), addDays(eventDate, -dias2))
      const due3 = final === 'dia_antes' ? addDays(eventDate, -1) : eventDate
      payments = [
        {
          payment_number: 1, percentage: pctI,
          description: 'Primer pago · Bloquea tu fecha',
          label: 'Primer pago',
          subtotal: p1.subtotal, platform_fee: p1.fee, total: p1.total,
          due_date: today, due_label: 'Hoy',
          is_first: true, is_final_onsite: false,
          badges: ['Bloquea tu fecha'],
        },
        {
          payment_number: 2, percentage: pct2,
          description: `${pct2}% · ${dias2} días antes del evento`,
          label: 'Segundo pago',
          subtotal: p2.subtotal, platform_fee: p2.fee, total: p2.total,
          due_date: due2, due_label: dueLabel(due2),
          is_first: false, is_final_onsite: false,
          badges: [],
        },
        {
          payment_number: 3, percentage: pct3,
          description: fuera
            ? `${pct3}% · En el espacio el día del evento`
            : `${pct3}% · ${final === 'dia_antes' ? '1 día antes del evento' : 'Día del evento'}`,
          label: fuera ? 'Pago en el espacio' : 'Pago final',
          subtotal: p3.subtotal, platform_fee: p3.fee, total: p3.total,
          due_date: due3, due_label: fuera ? 'Día del evento (en sitio)' : dueLabel(due3),
          is_first: false, is_final_onsite: fuera,
          badges: fuera ? ['Sin cargo de plataforma', 'Directo al espacio'] : [],
        },
      ]
      break
    }

    // ── COTIZACIÓN ──────────────────────────────────────
    case 'cotizacion_personalizada': {
      plan_label = 'Cotización personalizada'
      plan_description = 'El propietario te enviará un plan de pago personalizado.'
      payments = []
      break
    }
  }

  const total_online   = payments.filter(p => !p.is_final_onsite).reduce((s, p) => s + p.total, 0)
  const total_onsite   = payments.filter(p => p.is_final_onsite).reduce((s, p) => s + p.subtotal, 0)
  const platform_fees  = payments.reduce((s, p) => s + p.platform_fee, 0)

  return {
    plan_type: config.plan_type,
    plan_label,
    plan_description,
    payments,
    total_event:   totalEvent,
    total_online:  Math.round(total_online * 100) / 100,
    total_onsite:  Math.round(total_onsite * 100) / 100,
    platform_fees: Math.round(platform_fees * 100) / 100,
  }
}

// Planes predeterminados que ofrecemos
export const DEFAULT_PLANS: PaymentPlanConfig[] = [
  {
    plan_type: 'pago_completo',
  },
  {
    plan_type: 'pago_2_partes',
    porcentaje_inicial: 30,
    porcentaje_restante: 70,
    dias_antes_segundo_pago: 7,
  },
  {
    plan_type: 'pago_3_partes',
    porcentaje_inicial: 10,
    porcentaje_segundo_pago: 40,
    dias_antes_segundo_pago: 7,
    porcentaje_final: 50,
    momento_pago_final: 'en_el_espacio',
    permitir_pago_final_fuera: true,
  },
]
