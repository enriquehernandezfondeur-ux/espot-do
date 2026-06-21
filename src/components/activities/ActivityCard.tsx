import Link from 'next/link'
import { CalendarDays, MapPin, Users, ChevronRight, Sparkles, Share2 } from 'lucide-react'
import { formatDate, todayInRD } from '@/lib/utils'
import type { Activity } from '@/lib/activities/types'
import { effectiveStatus } from '@/lib/activities/display'
import { ActivityStatusBadge } from './ActivityStatusBadge'

/** Texto corto de ubicación según el modo de la actividad. */
function locationLabel(a: Activity): string {
  if (a.location_mode === 'external') return a.external_location ?? 'Ubicación externa'
  if (a.location_mode === 'space')    return 'Espacio en Espot'
  if (a.location_mode === 'booking')  return 'Reserva vinculada'
  return 'Sin ubicación'
}

export function ActivityCard({ activity, confirmedCount }: { activity: Activity; confirmedCount: number }) {
  const status = effectiveStatus(activity, todayInRD())
  const shareUrl = `https://espot.do/a/${activity.public_code}`
  const waHref = `https://wa.me/?text=${encodeURIComponent(`Te invito: ${activity.title} ${shareUrl}`)}`
  return (
    <div className="rounded-2xl overflow-hidden flex flex-col h-full"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>

      {/* Portada o placeholder de marca */}
      <div className="relative" style={{ aspectRatio: '16/9', background: 'var(--bg-elevated)' }}>
        {activity.cover_image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={activity.cover_image} alt={activity.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg,#03313C,#0D4A3A)' }}>
            <Sparkles size={30} style={{ color: 'var(--brand)', opacity: 0.7 }} />
          </div>
        )}
        <div className="absolute top-3 left-3">
          <ActivityStatusBadge status={status} />
        </div>
        {status !== 'cancelada' && (
          <a href={waHref} target="_blank" rel="noopener noreferrer" title="Compartir por WhatsApp"
            className="absolute top-3 right-3 w-8 h-8 rounded-lg flex items-center justify-center backdrop-blur-sm"
            style={{ background: 'rgba(0,0,0,0.35)', color: '#fff' }}>
            <Share2 size={14} />
          </a>
        )}
      </div>

      {/* Info */}
      <div className="p-4 flex flex-col gap-2 flex-1">
        <h3 className="font-semibold text-sm leading-snug truncate" title={activity.title}
          style={{ color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
          {activity.title}
        </h3>

        <div className="flex flex-col gap-1.5">
          {activity.event_date && (
            <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
              <CalendarDays size={12} className="shrink-0" />
              <span>{formatDate(new Date(activity.event_date + 'T12:00'))}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5 text-xs min-w-0" style={{ color: 'var(--text-muted)' }}>
            <MapPin size={12} className="shrink-0" />
            <span className="truncate">{locationLabel(activity)}</span>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 mt-auto pt-2">
          <span className="flex items-center gap-1.5 text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
            <Users size={12} style={{ color: 'var(--brand)' }} />
            {confirmedCount} confirmado{confirmedCount !== 1 ? 's' : ''}
          </span>
          <Link href={`/dashboard/actividades/${activity.id}`}
            className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg"
            style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)' }}>
            Gestionar <ChevronRight size={13} />
          </Link>
        </div>
      </div>
    </div>
  )
}
