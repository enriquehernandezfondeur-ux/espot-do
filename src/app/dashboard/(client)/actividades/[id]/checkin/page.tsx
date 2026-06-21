import { notFound } from 'next/navigation'
import { getActivityDetail } from '@/lib/actions/activities'
import { CheckinClient } from './CheckinClient'

export const dynamic = 'force-dynamic'

export default async function CheckinPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const detail = await getActivityDetail(id)
  if (!detail) notFound()
  return <CheckinClient detail={detail} />
}
