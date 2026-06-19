// ============================================================
// Cálculo de precio compartido cliente ↔ servidor.
//
// FUENTE ÚNICA DE VERDAD del precio base de una reserva. El widget
// (BookingWidget) y la server action (createBooking) DEBEN usar esta
// misma función para evitar divergencias de redondeo que provoquen
// rechazos del tipo "el precio no coincide, recarga la página".
//
// Módulo puro (sin I/O ni 'use server') para poder importarlo desde el
// cliente y desde el servidor.
// ============================================================

export interface PricingInput {
  pricing_type?: string | null
  hourly_price?: number | null
  minimum_consumption?: number | null
  fixed_price?: number | null
  package_hours?: number | null
  extra_hour_price?: number | null
  weekend_multiplier?: number | null
  is_consumable?: boolean | null
}

/** Fin de semana en RD a efectos de tarifa: viernes(5), sábado(6), domingo(0). */
export function isWeekendDate(eventDate?: string | null): boolean {
  if (!eventDate) return false
  // T12:00 evita el bug de timezone UTC-4 (ver CLAUDE.md)
  const dow = new Date(eventDate + 'T12:00').getDay()
  return dow === 0 || dow === 5 || dow === 6
}

/**
 * Precio base de la reserva (sin adicionales), ya redondeado a entero.
 * Devuelve 0 para custom_quote o configuraciones sin precio.
 */
export function computeBasePrice(
  pricing: PricingInput | null | undefined,
  hours: number,
  eventDate?: string | null
): number {
  if (!pricing) return 0
  let price = 0

  switch (pricing.pricing_type) {
    case 'hourly':
      price = (Number(pricing.hourly_price) || 0) * (hours || 0)
      break
    case 'minimum_consumption':
      price = Number(pricing.minimum_consumption) || 0
      break
    case 'fixed_package': {
      const extra = Math.max(0, (hours || 0) - (Number(pricing.package_hours) || 0))
      price = (Number(pricing.fixed_price) || 0) + extra * (Number(pricing.extra_hour_price) || 0)
      break
    }
    default:
      return 0 // custom_quote u otros: el precio se cotiza aparte
  }

  if (price <= 0) return price

  const wm = Number(pricing.weekend_multiplier ?? 1)
  if (wm > 0 && wm !== 1 && isWeekendDate(eventDate)) {
    price = price * wm
  }
  return Math.round(price)
}

/** Comisión de la plataforma: 10% del subtotal (base + adicionales), redondeada. */
export function computePlatformFee(subtotal: number): number {
  return Math.round(subtotal * 0.10)
}

/**
 * Neto del propietario: total − comisión 10%. Fuente única para que el monto
 * mostrado y el de la liquidación coincidan (evita el descuadre de ±RD$1 que
 * producía `Math.round(total * 0.90)`).
 */
export function computeHostNet(total: number): number {
  return total - computePlatformFee(total)
}

/**
 * Texto de la condición de consumo para mostrar al cliente.
 * NO afecta el cálculo — el precio es el mismo, sólo cambia la explicación.
 */
export function consumptionLabel(isConsumable?: boolean | null): string {
  return isConsumable
    ? 'Todo el monto se aplica en alimentos y bebidas'
    : 'Cubre el uso del espacio'
}

// ── Migración de precios legacy → por hora (F8) ──────────────
// Genera una SUGERENCIA de conversión a "por hora". Nunca convierte sola:
// `confident` es siempre false porque el cambio altera cómo se cobra (un humano
// debe confirmar mínimos/máximos). El módulo es puro para poder testearlo.

export interface LegacyPricingRow {
  pricing_type?: string | null
  minimum_consumption?: number | null
  session_hours?: number | null
  min_hours?: number | null
  fixed_price?: number | null
  package_hours?: number | null
}

export interface HourlySuggestion {
  hourlyPrice: number | null
  minHours: number | null
  isConsumable: boolean
  confident: boolean
  reason: string
}

export function suggestHourlyFromLegacy(p: LegacyPricingRow): HourlySuggestion {
  switch (p.pricing_type) {
    case 'minimum_consumption': {
      const hrs = Number(p.session_hours) || Number(p.min_hours) || 0
      if (hrs > 0) {
        return {
          hourlyPrice: Math.round((Number(p.minimum_consumption) || 0) / hrs),
          minHours: hrs,
          isConsumable: true,
          confident: false,
          reason: 'Consumo mínimo ÷ horas de sesión. Por hora escala con las horas; verifica mínimo y máximo.',
        }
      }
      return { hourlyPrice: null, minHours: null, isConsumable: true, confident: false, reason: 'Sin horas de sesión: no se puede derivar el precio por hora.' }
    }
    case 'fixed_package': {
      const hrs = Number(p.package_hours) || 0
      if (hrs > 0) {
        return {
          hourlyPrice: Math.round((Number(p.fixed_price) || 0) / hrs),
          minHours: hrs,
          isConsumable: false,
          confident: false,
          reason: 'Precio del paquete ÷ horas incluidas. Verifica el cargo por horas extra.',
        }
      }
      return { hourlyPrice: null, minHours: null, isConsumable: false, confident: false, reason: 'Sin horas de paquete: no se puede derivar.' }
    }
    case 'custom_quote':
      return { hourlyPrice: null, minHours: null, isConsumable: false, confident: false, reason: 'Cotización: define el precio por hora manualmente.' }
    default:
      return { hourlyPrice: null, minHours: null, isConsumable: false, confident: false, reason: 'Ya es por hora o tipo desconocido.' }
  }
}
