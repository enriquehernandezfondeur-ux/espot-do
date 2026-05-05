import { type Metadata } from 'next'
import { getPublishedSpaces } from '@/lib/actions/marketplace'
import BuscarClient from './BuscarClient'

export const metadata: Metadata = {
  title: 'Explorar espacios para eventos en República Dominicana',
  description: 'Encuentra salones, rooftops, restaurantes, villas y más para tu próximo evento en Santo Domingo y toda la RD. Filtra por sector, capacidad, fecha y tipo de evento.',
  openGraph: {
    title: 'Explorar espacios — espot.do',
    description: 'Salones, rooftops, villas y más para eventos en RD. Confirma en 24 horas.',
  },
}

export default async function BuscarPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const params = await searchParams

  const spaces = await getPublishedSpaces({
    category:    params.categoria || undefined,
    capacity:    params.capacidad ? parseInt(params.capacidad) : undefined,
    sector:      params.sector || undefined,
    search:      params.q || undefined,
    activity:    params.activity || undefined,
    baseActivity: params.baseActivity || undefined,
    dateFrom:    params.dateFrom || undefined,
    dateTo:      params.dateTo || params.dateFrom || undefined,
  })

  return <BuscarClient spaces={spaces} initialParams={params} />
}
