import { getPublishedSpaces } from '@/lib/actions/marketplace'
import BuscarClient from './BuscarClient'

export default async function BuscarPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const params = await searchParams

  const spaces = await getPublishedSpaces({
    category: params.categoria || undefined,
    capacity: params.capacidad ? parseInt(params.capacidad) : undefined,
    sector: params.sector || undefined,
    search: params.q || undefined,
  })

  return <BuscarClient spaces={spaces} initialParams={params} />
}
