'use client'

import { CheckCircle, PartyPopper, Briefcase, Camera, Users } from 'lucide-react'
import { BASE_ACTIVITIES, type BaseActivity } from '@/lib/activities'

const ICONS: Record<string, any> = {
  party:    PartyPopper,
  briefcase: Briefcase,
  camera:   Camera,
  meeting:  Users,
}

interface Props {
  primary:    BaseActivity | ''
  secondary:  BaseActivity[]
  onChange:   (primary: BaseActivity | '', secondary: BaseActivity[]) => void
}

export default function ActivityPicker({ primary, secondary, onChange }: Props) {

  function toggleActivity(key: BaseActivity) {
    if (key === primary) {
      // Deseleccionar principal → promover el primero de secundarios
      const newPrimary = secondary[0] ?? ''
      const newSecondary = secondary.slice(1)
      onChange(newPrimary, newSecondary)
      return
    }

    if (secondary.includes(key)) {
      // Quitar de secundarios
      onChange(primary, secondary.filter(k => k !== key))
      return
    }

    if (!primary) {
      // No hay principal → este se vuelve principal
      onChange(key, secondary)
      return
    }

    // Agregar como secundario (máx 3 en total incluyendo principal = 4 total)
    const totalSelected = (primary ? 1 : 0) + secondary.length
    if (totalSelected >= 4) return  // límite alcanzado
    onChange(primary, [...secondary, key])
  }

  const totalSelected = (primary ? 1 : 0) + secondary.length

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        {BASE_ACTIVITIES.map(act => {
          const Icon       = ICONS[act.icon]
          const isPrimary  = primary === act.key
          const isSecondary = secondary.includes(act.key)
          const isSelected = isPrimary || isSecondary
          const isDisabled = !isSelected && totalSelected >= 4

          return (
            <button
              key={act.key}
              onClick={() => !isDisabled && toggleActivity(act.key)}
              disabled={isDisabled}
              className="relative text-left p-4 rounded-2xl border transition-all"
              style={isPrimary ? {
                background: `${act.color}15`,
                border:     `2px solid ${act.color}`,
              } : isSecondary ? {
                background: `${act.color}08`,
                border:     `1.5px solid ${act.color}50`,
              } : isDisabled ? {
                background: '#F3F4F6',
                border:     '1px solid #E5E7EB',
                opacity:    0.4,
                cursor:     'not-allowed',
              } : {
                background: '#F9FAFB',
                border:     '1px solid #D1D5DB',
              }}
            >
              {/* Icono */}
              <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                style={{ background: `${act.color}20` }}>
                {Icon && <Icon size={20} style={{ color: act.color }} />}
              </div>

              {/* Texto */}
              <div className="font-semibold text-sm mb-0.5" style={{ color: '#03313C' }}>{act.label}</div>
              <div className="text-xs leading-snug" style={{ color: '#64748B' }}>{act.description}</div>

              {/* Badge */}
              {isPrimary && (
                <div className="absolute top-3 right-3 text-xs font-bold px-2 py-0.5 rounded-full"
                  style={{ background: act.color, color: '#0B0F0E' }}>
                  Principal
                </div>
              )}
              {isSecondary && (
                <div className="absolute top-3 right-3">
                  <CheckCircle size={16} style={{ color: act.color }} />
                </div>
              )}
            </button>
          )
        })}
      </div>

      {/* Instrucciones */}
      <div className="text-xs px-1" style={{ color: '#64748b' }}>
        {totalSelected === 0 && 'Selecciona al menos una categoría principal para tu espacio.'}
        {totalSelected === 1 && primary && 'Puedes agregar hasta 3 categorías adicionales.'}
        {totalSelected > 1 && totalSelected < 4 && `${4 - totalSelected} categoría${4 - totalSelected > 1 ? 's' : ''} más disponible${4 - totalSelected > 1 ? 's' : ''}.`}
        {totalSelected === 4 && 'Límite alcanzado. Quita una para agregar otra.'}
      </div>
    </div>
  )
}
