'use client'

import { useEffect, useState } from 'react'
import { CalendarDays, Clock, Users } from 'lucide-react'
import { getBookingActivityPrep, type ActivityPrep } from '@/lib/actions/activities'
import { getTemplate } from '@/lib/activities/templates'
import { formatDate, formatTime } from '@/lib/utils'
import type { ActivityType } from '@/lib/activities/types'

/**
 * Panel solo-lectura para el host con el patrón de secciones del detalle de
 * reserva (barra de título + filas etiquetadas debajo). Sin datos de invitados.
 */
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
    <div className="rounded-2xl overflow-hidden mb-4"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
      {/* Barra de título (igual que las secciones del detalle) */}
      <div className="px-5 py-3.5" style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-elevated)' }}>
        <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
          {list.length === 1 ? 'Actividad del cliente' : 'Actividades del cliente'}
        </p>
        <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
          Para preparar el espacio · sin datos de invitados
        </p>
      </div>

      <div>
        {list.map((a, i) => {
          const rows = [
            a.event_date ? { icon: <CalendarDays size={13} />, label: 'Fecha', value: formatDate(new Date(a.event_date + 'T12:00')) } : null,
            a.start_time && a.end_time ? { icon: <Clock size={13} />, label: 'Horario', value: `${formatTime(a.start_time)} – ${formatTime(a.end_time)}` } : null,
            { icon: <Users size={13} />, label: 'Personas', value: `${a.confirmedPeople} confirmados${a.expected_people ? ` · ${a.expected_people} esperados` : ''}` },
          ].filter(Boolean) as { icon: React.ReactNode; label: string; value: string }[]

          return (
            <div key={a.id} style={{ borderTop: i > 0 ? '1px solid var(--border-subtle)' : undefined }}>
              {/* Sub-encabezado: nombre + tipo */}
              <div className="flex items-center justify-between gap-2 px-5 pt-4 pb-1">
                <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{a.title}</span>
                <span className="text-xs px-2 py-0.5 rounded-full shrink-0"
                  style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>
                  {getTemplate(a.type as ActivityType).label}
                </span>
              </div>
              {/* Filas etiquetadas */}
              {rows.map(row => (
                <div key={row.label} className="flex items-center gap-4 px-5 py-2.5" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                  <div className="flex items-center gap-1.5 shrink-0 w-24">
                    <span style={{ color: 'var(--text-muted)' }}>{row.icon}</span>
                    <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>{row.label}</span>
                  </div>
                  <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{row.value}</span>
                </div>
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}
