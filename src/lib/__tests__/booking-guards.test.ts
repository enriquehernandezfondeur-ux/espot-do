/**
 * Tests de las cláusulas de guarda de createBooking (validación de entrada antes
 * de tocar pagos/emails). Usa el harness de mock de Supabase.
 *
 * Nota: jest.mock NO resuelve el alias "@/" con next/jest+SWC → rutas relativas.
 */
import { makeSupabaseMock } from '@/test-utils/supabase-mock'

jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }))
jest.mock('../supabase/server', () => ({ createClient: jest.fn() }))
jest.mock('../supabase/service', () => ({ createServiceClient: jest.fn(() => ({})) }))
jest.mock('../email/send', () => ({ sendEmail: jest.fn() }))
jest.mock('../google-calendar', () => ({ createBookingEvent: jest.fn(), deleteBookingEvent: jest.fn() }))
jest.mock('../actions/installments', () => ({ createInstallments: jest.fn() }))
jest.mock('../whatsapp/send', () => ({ sendWhatsAppToUser: jest.fn(), wa: {} }))
jest.mock('../actions/_resolveHost', () => ({ resolveHostId: jest.fn() }))

import { createBooking, type CreateBookingPayload } from '@/lib/actions/booking'
import { createClient } from '@/lib/supabase/server'

const mockCreateClient = createClient as jest.Mock

// Fecha futura para superar la validación de fecha pasada sin gatillar el chequeo
// de "hora ya pasó" (que solo aplica cuando eventDate === hoy).
const FUTURE = '2099-12-31'

function payload(over: Partial<CreateBookingPayload> = {}): CreateBookingPayload {
  return {
    spaceId: 's1', eventDate: FUTURE, startTime: '', endTime: '',
    guestCount: 50, eventType: 'fiesta', selectedAddonIds: [],
    basePrice: 1000, addonsTotal: 0, platformFee: 100, totalAmount: 1100,
    ...over,
  }
}

const space = (over: Record<string, unknown> = {}) => ({
  data: {
    id: 's1', name: 'Salón X', address: 'Calle 1', city: 'Santo Domingo', sector: 'Piantini',
    host_id: 'host-1', capacity_min: null, capacity_max: null,
    profiles: { id: 'host-1', full_name: 'Host', email: 'h@x.com', phone: null, whatsapp: null },
    ...over,
  },
})

function setup(opts: Parameters<typeof makeSupabaseMock>[0]) {
  const mock = makeSupabaseMock(opts)
  mockCreateClient.mockResolvedValue(mock.client)
  return mock
}

beforeEach(() => jest.clearAllMocks())

describe('createBooking — cláusulas de guarda', () => {
  it('rechaza si no hay sesión', async () => {
    setup({ user: null })
    const res = await createBooking(payload())
    expect(res).toEqual({ error: expect.stringContaining('iniciar sesión') })
  })

  it('rechaza si el espacio no existe', async () => {
    setup({ user: { id: 'u1' }, tables: { spaces: { data: null } } })
    const res = await createBooking(payload())
    expect(res).toEqual({ error: 'Espacio no encontrado' })
  })

  it('rechaza fechas pasadas', async () => {
    setup({ user: { id: 'u1' }, tables: { spaces: space() } })
    const res = await createBooking(payload({ eventDate: '2020-01-01' }))
    expect(res).toEqual({ error: expect.stringContaining('fecha pasada') })
  })

  it('rechaza si no llega al mínimo de capacidad', async () => {
    setup({ user: { id: 'u1' }, tables: { spaces: space({ capacity_min: 100 }) } })
    const res = await createBooking(payload({ guestCount: 50 }))
    expect(res).toEqual({ error: expect.stringContaining('mínimo de 100') })
  })

  it('rechaza si supera la capacidad máxima', async () => {
    setup({ user: { id: 'u1' }, tables: { spaces: space({ capacity_max: 10 }) } })
    const res = await createBooking(payload({ guestCount: 50 }))
    expect(res).toEqual({ error: expect.stringContaining('capacidad máxima de 10') })
  })

  it('acepta el conteo dentro del rango de capacidad (no rechaza por capacidad)', async () => {
    // El espacio es exclusivo por día y ya tiene una reserva ese día → cae en el
    // guard de anti-overbooking, lo que prueba que pasó la validación de capacidad.
    setup({
      user: { id: 'u1' },
      tables: {
        spaces: [
          space({ capacity_min: 10, capacity_max: 100, single_booking_per_day: true }),
          { data: { single_booking_per_day: true } },
        ],
        profiles: { data: { full_name: 'Guest', email: 'g@x.com', phone: null } },
        bookings: { data: [{ id: 'b-existente' }] },
      },
    })
    const res = await createBooking(payload({ guestCount: 50 }))
    expect(res).toEqual({ error: expect.stringContaining('ya tiene una reserva') })
  })
})
