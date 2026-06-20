// Texto único de política de cancelación para mostrar al cliente. Fuente única:
// se usa en el detalle público del espacio y en el detalle de reserva del cliente,
// para que el cliente vea siempre la misma política con el mismo texto.

const LABEL: Record<string, string> = {
  flexible: 'Cancelación flexible',
  moderate: 'Cancelación moderada',
  moderada: 'Cancelación moderada',
  strict:   'Cancelación estricta',
  estricta: 'Cancelación estricta',
}

export function cancellationPolicyText(
  policy?: string | null,
  refundPct?: number | null,
  hoursBefore?: number | null,
): string {
  if (policy == null && refundPct == null && hoursBefore == null) {
    return 'Consulta la política de cancelación con el propietario.'
  }
  const label = LABEL[String(policy ?? '').toLowerCase()] ?? 'Política de cancelación'
  const pct = Number(refundPct ?? 0)
  if (pct <= 0) return `${label} · Sin reembolso una vez confirmada la reserva.`
  const h = Number(hoursBefore ?? 0)
  const cond = h > 0 ? ` si cancelas con al menos ${h} h de antelación` : ''
  return `${label} · Reembolso del ${pct}%${cond}.`
}
