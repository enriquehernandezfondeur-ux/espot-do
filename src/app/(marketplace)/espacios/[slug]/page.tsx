import { notFound } from 'next/navigation'
import { getSpaceBySlug, getPublishedSpaces } from '@/lib/actions/marketplace'
import SpaceDetailClient from './SpaceDetailClient'

export default async function SpacePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const [space, allSpaces] = await Promise.all([
    getSpaceBySlug(slug),
    getPublishedSpaces(),
  ])
  if (!space) notFound()

  // Espacios similares: misma categoría o capacidad cercana, excluir el actual
  const similar = allSpaces
    .filter((s: any) => s.id !== space.id && (
      s.category === space.category ||
      Math.abs(s.capacity_max - space.capacity_max) <= 80
    ))
    .slice(0, 4)

  return <SpaceDetailClient space={space} similarSpaces={similar} />
}
