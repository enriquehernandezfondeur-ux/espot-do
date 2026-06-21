'use client'

import { useState, type ReactNode } from 'react'
import { CalendarCheck } from 'lucide-react'
import { EmptyState } from '@/components/ui/EmptyState'

type Tab = 'upcoming' | 'past'

export function ActivitiesTabs({
  upcoming, past, upcomingCount, pastCount,
}: {
  upcoming: ReactNode
  past: ReactNode
  upcomingCount: number
  pastCount: number
}) {
  const [tab, setTab] = useState<Tab>('upcoming')

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: 'upcoming', label: 'Próximas', count: upcomingCount },
    { key: 'past',     label: 'Pasadas',  count: pastCount },
  ]

  const currentEmpty = tab === 'upcoming' ? upcomingCount === 0 : pastCount === 0

  return (
    <div>
      {/* Control segmentado */}
      <div className="inline-flex gap-1 p-1 rounded-xl mb-5" style={{ background: 'var(--bg-elevated)' }}>
        {tabs.map(t => {
          const active = tab === t.key
          return (
            <button key={t.key} type="button" onClick={() => setTab(t.key)}
              className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
              style={active
                ? { background: 'var(--brand)', color: '#fff' }
                : { background: 'transparent', color: '#6B7280' }}>
              {t.label}
              {t.count > 0 && <span className="ml-1.5 opacity-80">{t.count}</span>}
            </button>
          )
        })}
      </div>

      {currentEmpty ? (
        <div className="rounded-3xl" style={{ background: 'var(--bg-card)', border: '2px dashed var(--border-medium)' }}>
          <EmptyState
            icon={CalendarCheck}
            title={tab === 'upcoming' ? 'No tienes actividades próximas' : 'No tienes actividades pasadas'}
            subtitle={tab === 'upcoming' ? 'Crea una actividad para empezar a recibir confirmaciones.' : undefined}
          />
        </div>
      ) : (
        tab === 'upcoming' ? upcoming : past
      )}
    </div>
  )
}
