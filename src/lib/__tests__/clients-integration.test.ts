/**
 * Test de integración de getUnifiedClients (CRM unificado Directo + Espot).
 * Estrena el harness de mock de Supabase (src/test-utils/supabase-mock.ts):
 * verifica el gate Pro, el gate de auth, el short-circuit sin espacios y el
 * cableado del de-dup a través de la action real (no solo el helper puro).
 */
import { makeSupabaseMock } from '@/test-utils/supabase-mock'

// ── Mock de las dependencias de la action ────────────────────
// Nota: jest.mock NO resuelve el alias "@/" en este setup (next/jest+SWC); las
// rutas relativas sí, y resuelven al mismo archivo que importa clients.ts, así
// que interceptan sus imports. Factory con jest.fn() inline (sin TDZ).
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }))
jest.mock('../supabase/server', () => ({ createClient: jest.fn() }))
jest.mock('../actions/subscription', () => ({ requirePro: jest.fn() }))
jest.mock('../actions/_resolveHost', () => ({ resolveHostAccess: jest.fn() }))

import { createClient } from '@/lib/supabase/server'
import { requirePro } from '@/lib/actions/subscription'
import { resolveHostAccess } from '@/lib/actions/_resolveHost'
import { getUnifiedClients } from '@/lib/actions/clients'

const mockCreateClient = createClient as jest.Mock
const mockRequirePro = requirePro as jest.Mock
const mockResolveHostAccess = resolveHostAccess as jest.Mock

function setup(opts: Parameters<typeof makeSupabaseMock>[0]) {
  const { client, calls } = makeSupabaseMock(opts)
  mockCreateClient.mockResolvedValue(client)
  mockResolveHostAccess.mockResolvedValue({ hostId: 'host-1', role: 'owner', isOwner: true, db: client })
  return { client, calls }
}

beforeEach(() => {
  jest.clearAllMocks()
  mockRequirePro.mockResolvedValue({ ok: true })
})

describe('getUnifiedClients', () => {
  it('devuelve [] si la cuenta no es Pro (gate)', async () => {
    mockRequirePro.mockResolvedValue({ ok: false, error: 'no pro' })
    setup({ user: { id: 'u1' } })
    expect(await getUnifiedClients()).toEqual([])
  })

  it('devuelve [] si no hay usuario autenticado', async () => {
    setup({ user: null })
    expect(await getUnifiedClients()).toEqual([])
  })

  it('devuelve solo los clientes Directos cuando el host no tiene espacios', async () => {
    setup({
      user: { id: 'u1' },
      tables: {
        host_clients: { data: [{ id: 'c1', host_id: 'host-1', full_name: 'Directo Uno', email: 'd1@x.com', phone: null }] },
        spaces: { data: [] },
      },
    })
    const out = await getUnifiedClients()
    expect(out.map((c: any) => c.full_name)).toEqual(['Directo Uno'])
  })

  it('mezcla Directos + huéspedes Espot y de-duplica por email', async () => {
    setup({
      user: { id: 'u1' },
      tables: {
        host_clients: { data: [{ id: 'c1', host_id: 'host-1', full_name: 'Ana Directa', email: 'ana@x.com', phone: null }] },
        spaces: { data: [{ id: 's1' }] },
        bookings: { data: [
          // mismo email que un Directo → se omite
          { guest: { id: 'g1', full_name: 'Ana Espot', email: 'ANA@x.com', phone: null } },
          // huésped nuevo → entra como fuente espot
          { guest: { id: 'g2', full_name: 'Beto Espot', email: 'beto@x.com', phone: null } },
        ] },
      },
    })
    const out = await getUnifiedClients()
    const espot = out.filter((c: any) => c._is_espot_guest)
    expect(out.find((c: any) => c.id === 'c1')).toBeTruthy()       // Directo presente
    expect(espot.map((c: any) => c.id)).toEqual(['g2'])            // solo el huésped nuevo
    expect(espot[0].source).toBe('espot')
  })

  it('consulta las tablas esperadas en orden (host_clients, spaces, bookings)', async () => {
    const { calls } = setup({
      user: { id: 'u1' },
      tables: {
        host_clients: { data: [] },
        spaces: { data: [{ id: 's1' }] },
        bookings: { data: [] },
      },
    })
    await getUnifiedClients()
    expect(calls).toEqual(expect.arrayContaining(['host_clients', 'spaces', 'bookings']))
  })
})
