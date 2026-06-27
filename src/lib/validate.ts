// Validadores de entrada compartidos. Úsalos al inicio de cualquier Server Action
// que reciba IDs del cliente e interpole en filtros PostgREST (`.or()`, `.filter()`),
// para evitar inyección de filtros y datos malformados.

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** ¿Es un UUID canónico (v1–v5)? */
export function isUuid(v: unknown): v is string {
  return typeof v === 'string' && UUID_RE.test(v)
}

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/

/** ¿Es una hora válida en formato HH:MM (24h)? */
export function isTime(v: unknown): v is string {
  return typeof v === 'string' && TIME_RE.test(v)
}
