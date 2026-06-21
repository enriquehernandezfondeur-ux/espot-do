'use client'

import { useEffect, useState } from 'react'
import { CalendarCheck, CalendarDays, Clock, Users } from 'lucide-react'
import { getBookingActivityPrep, type ActivityPrep } from '@/lib/actions/activities'
import { getTemplate } from '@/lib/activities/templates'
import { formatDate, formatTime } from '@/lib/utils'
import type { ActivityType } from '@/lib/activities/types'

/** Panel solo-lectura para el host: lo necesario para preparar el espacio. Sin PII. */
export function ActivityPrepPanel({ bookingId }: { bookingId: string }) {
  const [list, setList] = useState<ActivityPrep[] | null>(null)

  useEffect(() => {
    let cancel = false
    getBookingActivityPrep(bookingId)
      .then(r => { if (!cancel) setList(r) })
      .catch(() => { if (!cancel) setList([]) })
    return () => { cancel = true }
  }, [bookingId])

  if (!list || list.length === 0) return null

  return (
    <div className="rounded-2xl p-5 mb-6" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
      <div className="flex items-center gap-2 mb-1">
        <CalendarCheck size={16} style={{ color: 'var(--brand)' }} />
        <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
          {list.length === 1 ? 'Actividad del cliente' : 'Actividades del cliente'}
        </span>
      </div>
      <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
        Lo que necesitas para preparar el espacio. No incluye datos de los invitados.
      </p>
      <div className="space-y-2">
        {list.map(a => (
          <div key={a.id} className="rounded-xl p-3.5" style={{ background: 'var(--bg-elevated)' }}>
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{a.title}</span>
              <span className="text-xs px-2 py-0.5 rounded-full"
                style={{ background: 'var(--bg-card)', color: 'var(--text-secondary)' }}>
                {getTemplate(a.type as ActivityType).label}
              </span>
            </div>
            <div className="flex items-center gap-3 mt-2 flex-wrap text-xs" style={{ color: 'var(--text-secondary)' }}>
              {a.event_date && (
                <span className="flex items-center gap-1"><CalendarDays size={12} /> {formatDate(new Date(a.event_date + 'T12:00'))}</span>
              )}
              {a.start_time && a.end_time && (
                <span className="flex items-center gap-1"><Clock size={12} /> {formatTime(a.start_time)} – {formatTime(a.end_time)}</span>
              )}
              <span className="flex items-center gap-1">
                <Users size={12} /> {a.confirmedPeople} confirmados{a.expected_people ? ` / ${a.expected_people} esperados` : ''}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
