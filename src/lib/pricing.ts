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

/** Fila mínima de una reserva para calcular comisión/neto. */
export interface FeeRow {
  total_amount?: number | null
  platform_fee?: number | null
}

/**
 * Comisión EFECTIVA de una reserva: usa la `platform_fee` realmente guardada si
 * existe (la que se cobró), y sólo si es null la recalcula con `computePlatformFee`.
 * Toda pantalla de visualización/liquidación debe usar esto — nunca `total * 0.10`.
 */
export function platformFeeOf(row: FeeRow): number {
  const total = Number(row?.total_amount) || 0
  return row?.platform_fee != null ? Math.round(Number(row.platform_fee)) : computePlatformFee(total)
}

/**
 * Neto del propietario de una reserva: total − comisión efectiva. Garantiza que
 * `comisión + neto = total` en TODAS las pantallas (evita `Math.round(total*0.90)`).
 */
export function hostNetOf(row: FeeRow): number {
  return (Number(row?.total_amount) || 0) - platformFeeOf(row)
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
