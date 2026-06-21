import { notFound } from 'next/navigation'
import { getPublicActivity } from '@/lib/actions/activity-public'
import { RsvpClient } from './RsvpClient'

export const dynamic = 'force-dynamic'

export default async function PublicActivityPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  const data = await getPublicActivity(code)
  if (!data) notFound()
  return <RsvpClient code={code} data={data} />
}
