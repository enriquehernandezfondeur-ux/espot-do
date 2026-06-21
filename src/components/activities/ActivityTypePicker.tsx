'use client'

import {
  Mic, Camera, GraduationCap, Briefcase, Clapperboard,
  UtensilsCrossed, Cake, Users, Sparkles, type LucideIcon,
} from 'lucide-react'
import { ACTIVITY_TYPE_ORDER, getTemplate } from '@/lib/activities/templates'
import type { ActivityType } from '@/lib/activities/types'

// Mapa explícito nombre-de-icono → componente (los templates guardan el nombre como string).
const ICONS: Record<string, LucideIcon> = {
  Mic, Camera, GraduationCap, Briefcase, Clapperboard,
  UtensilsCrossed, Cake, Users, Sparkles,
}

export function ActivityTypePicker({
  value, onChange,
}: {
  value: ActivityType | null
  onChange: (t: ActivityType) => void
}) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
      {ACTIVITY_TYPE_ORDER.map(type => {
        const tpl    = getTemplate(type)
        const Icon   = ICONS[tpl.icon] ?? Sparkles
        const active = value === type
        return (
          <button
            key={type}
            type="button"
            onClick={() => onChange(type)}
            className="flex flex-col items-start gap-2.5 p-3.5 rounded-2xl text-left transition-all"
            style={{
              background: active ? 'var(--brand-dim)' : 'var(--bg-card)',
              border: `1.5px solid ${active ? 'var(--brand)' : 'var(--border-subtle)'}`,
            }}>
            <span className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: active ? 'var(--brand)' : 'var(--bg-elevated)' }}>
              <Icon size={17} style={{ color: active ? '#fff' : 'var(--text-muted)' }} />
            </span>
            <span className="text-xs font-semibold leading-tight"
              style={{ color: active ? 'var(--brand)' : 'var(--text-primary)' }}>
              {tpl.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}
