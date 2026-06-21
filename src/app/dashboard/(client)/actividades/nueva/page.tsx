import { getClientBookings } from '@/lib/actions/client'
import { todayInRD } from '@/lib/utils'
import { NuevaActividadClient, type BookingOption } from './NuevaActividadClient'

export const dynamic = 'force-dynamic'

export default async function NuevaActividadPage() {
  const bookings = await getClientBookings()
  const today = todayInRD()

  // Solo reservas activas/futuras sirven como ubicación de una nueva actividad.
  const ACTIVE = ['accepted', 'confirmed', 'completed']
  const options: BookingOption[] = (bookings as any[])
    .filter(b => ACTIVE.includes(b.status) && b.event_date >= today)
    .map(b => ({
      id: b.id,
      spaceName: b.spaces?.name ?? 'Espacio',
      spaceId: b.space_id ?? null,
      address: [b.spaces?.address, b.spaces?.sector, b.spaces?.city].filter(Boolean).join(', ') || null,
      cover: b.spaces?.space_images?.find((i: any) => i.is_cover)?.url ?? b.spaces?.space_images?.[0]?.url ?? null,
      eventDate: b.event_date ?? null,
      startTime: b.start_time ?? null,
      endTime: b.end_time ?? null,
    }))

  return <NuevaActividadClient bookings={options} />
}
