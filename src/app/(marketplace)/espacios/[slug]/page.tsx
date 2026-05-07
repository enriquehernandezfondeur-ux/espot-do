import { notFound } from 'next/navigation'
import { type Metadata } from 'next'
import { getSpaceBySlug, getSimilarSpaces } from '@/lib/actions/marketplace'
import SpaceDetailClient from './SpaceDetailClient'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | undefined>> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const space = await getSpaceBySlug(slug)
  if (!space) return { title: 'Espacio no encontrado' }

  const cover   = space.space_images?.find((i: any) => i.is_cover)?.url
                ?? space.space_images?.[0]?.url
  const pricing = space.space_pricing?.find((p: any) => p.is_active)
                ?? space.space_pricing?.[0]

  const priceText =
    pricing?.pricing_type === 'hourly'
      ? `Desde RD$${Number(pricing.hourly_price).toLocaleString('es-DO')}/hora`
    : pricing?.pricing_type === 'minimum_consumption'
      ? `Consumo mínimo RD$${Number(pricing.minimum_consumption).toLocaleString('es-DO')}`
    : pricing?.pricing_type === 'fixed_package'
      ? `Paquete desde RD$${Number(pricing.fixed_price).toLocaleString('es-DO')}`
    : ''

  const location = [space.sector, space.city].filter(Boolean).join(', ')
  const capacity = `Hasta ${space.capacity_max} personas`

  const description = [
    space.description?.slice(0, 100),
    location,
    capacity,
    priceText,
  ].filter(Boolean).join(' · ')

  const title = `${space.name} — ${location}`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type:   'website',
      locale: 'es_DO',
      images: cover
        ? [{ url: cover, width: 1200, height: 630, alt: space.name }]
        : [],
    },
    twitter: {
      card:        'summary_large_image',
      title,
      description,
      images:      cover ? [cover] : [],
    },
  }
}

export default async function SpacePage({ params, searchParams }: Props) {
  const { slug }   = await params
  const sp         = await searchParams
  const space = await getSpaceBySlug(slug)
  if (!space) notFound()

  const similar = await getSimilarSpaces(space)

  // Only pass initialDate if it's a valid future/today date from URL
  const today = new Date().toISOString().split('T')[0]
  const rawDate = sp.fecha
  const initialDate =
    rawDate && /^\d{4}-\d{2}-\d{2}$/.test(rawDate) && rawDate >= today
      ? rawDate
      : undefined

  return <SpaceDetailClient space={space} similarSpaces={similar} initialDate={initialDate} />
}
