import Link from 'next/link'
import { Plus, CalendarCheck } from 'lucide-react'
import { getMyActivities, getConfirmedCounts } from '@/lib/actions/activities'
import { todayInRD } from '@/lib/utils'
import { EmptyState } from '@/components/ui/EmptyState'
import { ActivityCard } from '@/components/activities/ActivityCard'
import { ActivitiesTabs } from './ActivitiesTabs'

export const dynamic = 'force-dynamic'

export default async function ActividadesPage() {
  const activities = await getMyActivities()
  const counts = await getConfirmedCounts(activities.map(a => a.id))
  const today = todayInRD()

  // Próximas: sin fecha o fecha >= hoy. Pasadas: fecha < hoy.
  const upcoming = activities.filter(a => !a.event_date || a.event_date >= today)
  const past     = activities.filter(a => a.event_date && a.event_date < today)

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-5 md:mb-8">
        <div>
          <h1 className="text-xl md:text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Actividades</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            Organiza eventos y recibe confirmaciones sin que tus invitados creen cuenta.
          </p>
        </div>
        <Link href="/dashboard/actividades/nueva"
          className="flex items-center gap-1.5 text-sm font-bold px-4 py-2.5 rounded-xl shrink-0"
          style={{ background: 'var(--brand)', color: '#fff', whiteSpace: 'nowrap' }}>
          <Plus size={16} /> Crear
        </Link>
      </div>

      {activities.length === 0 ? (
        <div className="rounded-3xl" style={{ background: 'var(--bg-card)', border: '2px dashed var(--border-medium)' }}>
          <EmptyState
            icon={CalendarCheck}
            title="Aún no tienes actividades"
            subtitle="Crea tu primera actividad para compartir un enlace y recibir confirmaciones."
            action={
              <Link href="/dashboard/actividades/nueva"
                className="text-sm font-semibold px-5 py-2.5 rounded-xl"
                style={{ background: 'var(--brand)', color: '#fff' }}>
                Crear actividad
              </Link>
            }
          />
        </div>
      ) : (
        <ActivitiesTabs
          upcomingCount={upcoming.length}
          pastCount={past.length}
          upcoming={
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {upcoming.map(a => <ActivityCard key={a.id} activity={a} confirmedCount={counts[a.id] ?? 0} />)}
            </div>
          }
          past={
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {past.map(a => <ActivityCard key={a.id} activity={a} confirmedCount={counts[a.id] ?? 0} />)}
            </div>
          }
        />
      )}
    </div>
  )
}
