// Mock reutilizable del cliente de Supabase para tests de integración de server actions.
//
// El query builder de Supabase es una cadena fluida y "thenable":
//   db.from('t').select('*').eq('a', 1).order('x')  →  await → { data, error }
// Este mock graba las llamadas y resuelve cada `from(tabla)` con la respuesta que
// configures por tabla. Las llamadas de filtro/orden son no-ops encadenables.
//
// Uso:
//   const { client, calls } = makeSupabaseMock({
//     user: { id: 'u1' },
//     tables: {
//       host_clients: { data: [...] },
//       spaces:       { data: [{ id: 's1' }] },
//       bookings:     { data: [...] },
//     },
//   })
// Si una tabla se consulta varias veces con respuestas distintas, pasa un array:
//   tables: { spaces: [{ data: [] }, { data: [{ id: 's1' }] }] }

export interface TableResponse {
  data?: unknown
  error?: unknown
}

type TableConfig = TableResponse | TableResponse[]

export interface SupabaseMockOptions {
  user?: { id: string } | null
  tables?: Record<string, TableConfig>
}

const CHAIN_METHODS = [
  'select', 'eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'in', 'not', 'is',
  'ilike', 'like', 'or', 'filter', 'contains', 'order', 'limit', 'range',
  'insert', 'update', 'delete', 'upsert', 'match', 'overlaps',
] as const

class QueryBuilder {
  private readonly resp: TableResponse
  constructor(resp: TableResponse) {
    this.resp = resp
    for (const m of CHAIN_METHODS) {
      // cada método de filtro/escritura es encadenable y devuelve el mismo builder
      ;(this as Record<string, unknown>)[m] = () => this
    }
  }
  single() {
    return Promise.resolve(this.resp)
  }
  maybeSingle() {
    return Promise.resolve(this.resp)
  }
  // hace al builder "thenable": `await db.from(t).select()` resuelve aquí
  then<T>(onFulfilled?: (v: TableResponse) => T, onRejected?: (e: unknown) => T) {
    return Promise.resolve(this.resp).then(onFulfilled, onRejected)
  }
}

export interface SupabaseMock {
  client: {
    auth: { getUser: () => Promise<{ data: { user: { id: string } | null }; error: null }> }
    from: (table: string) => QueryBuilder
  }
  /** Tablas consultadas, en orden. */
  calls: string[]
}

export function makeSupabaseMock(opts: SupabaseMockOptions = {}): SupabaseMock {
  const calls: string[] = []
  const counters: Record<string, number> = {}

  const resolveFor = (table: string): TableResponse => {
    const cfg = opts.tables?.[table]
    if (!cfg) return { data: [], error: null }
    if (Array.isArray(cfg)) {
      const i = counters[table] ?? 0
      counters[table] = i + 1
      return cfg[Math.min(i, cfg.length - 1)] ?? { data: [], error: null }
    }
    return cfg
  }

  const client = {
    auth: {
      getUser: async () => ({ data: { user: opts.user ?? null }, error: null as null }),
    },
    from(table: string) {
      calls.push(table)
      return new QueryBuilder(resolveFor(table))
    },
  }

  return { client, calls }
}
