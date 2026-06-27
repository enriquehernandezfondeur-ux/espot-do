// De-dup del CRM unificado (clientes Directos del host + huéspedes que reservaron
// por el marketplace). Lógica PURA y sin Supabase para poder testearla — antes vivía
// inline en `getUnifiedClients` (src/lib/actions/clients.ts).
//
// Criterio de match (un huésped de Espot se considera duplicado de un cliente Directo si):
//   • mismo email (case-insensitive), o
//   • mismo teléfono normalizado (últimos 10 dígitos, ≥7 dígitos para contar).
// El primer booking de cada guest gana; los siguientes del mismo guest se ignoran.

/** Normaliza un teléfono a sus últimos 10 dígitos (quita +, espacios, guiones, paréntesis). */
export function normPhone(p: string | null | undefined): string {
  return (p ?? '').replace(/\D/g, '').slice(-10)
}

export interface DirectClientLike {
  email?: string | null
  phone?: string | null
}

export interface GuestLike {
  id: string
  full_name?: string | null
  email?: string | null
  phone?: string | null
}

export interface BookingWithGuest {
  guest?: GuestLike | null
}

export interface DedupedGuest {
  id: string
  full_name: string
  email: string | null
  phone: string | null
}

/**
 * Devuelve los huéspedes de Espot que NO están ya representados como clientes Directos.
 * Mantiene el comportamiento exacto del de-dup original de `getUnifiedClients`.
 */
export function dedupeEspotGuests(
  direct: DirectClientLike[],
  bookings: BookingWithGuest[],
): DedupedGuest[] {
  const directEmails = new Set(
    direct.map((c) => c.email?.toLowerCase()).filter(Boolean) as string[],
  )
  const directPhones = new Set(
    direct.map((c) => normPhone(c.phone)).filter((p) => p.length >= 7),
  )

  const seenGuestIds = new Set<string>()
  const out: DedupedGuest[] = []

  for (const b of bookings) {
    const g = b.guest
    if (!g || seenGuestIds.has(g.id)) continue
    seenGuestIds.add(g.id)
    if (g.email && directEmails.has(g.email.toLowerCase())) continue
    const gp = normPhone(g.phone)
    if (gp.length >= 7 && directPhones.has(gp)) continue
    out.push({
      id:        g.id,
      full_name: g.full_name ?? 'Cliente Espot',
      email:     g.email ?? null,
      phone:     g.phone ?? null,
    })
  }

  return out
}
