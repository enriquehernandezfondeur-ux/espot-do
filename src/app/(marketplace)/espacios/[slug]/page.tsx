import { notFound } from 'next/navigation'
import { getSpaceBySlug, getSimilarSpaces } from '@/lib/actions/marketplace'
import SpaceDetailClient from './SpaceDetailClient'

export default async function SpacePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const space = await getSpaceBySlug(slug)
  if (!space) notFound()

  const similar = await getSimilarSpaces(space)

  return <SpaceDetailClient space={space} similarSpaces={similar} />
}
