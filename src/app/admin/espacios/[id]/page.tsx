import { notFound } from 'next/navigation'
import { getAdminSpaceById } from '@/lib/actions/admin'
import AdminEditSpaceClient from './AdminEditSpaceClient'

export default async function AdminEditSpacePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const space = await getAdminSpaceById(id)
  if (!space) notFound()
  return <AdminEditSpaceClient space={space} />
}
