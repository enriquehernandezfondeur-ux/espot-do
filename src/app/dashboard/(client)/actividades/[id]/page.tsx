import { notFound } from 'next/navigation'
import { getActivityDetail } from '@/lib/actions/activities'
import { ActivityDetailClient } from './ActivityDetailClient'

export const dynamic = 'force-dynamic'

export default async function ActivityDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const detail = await getActivityDetail(id)
  if (!detail) notFound()
  return <ActivityDetailClient detail={detail} />
}
