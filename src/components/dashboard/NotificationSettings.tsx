'use client'

import { useState, useEffect } from 'react'
import { Bell, BellOff, CheckCircle, Loader2 } from 'lucide-react'
import { getNotificationSettings, updateNotificationSettings, type NotificationSettings } from '@/lib/actions/notifications'

interface NotifGroup {
  title: string
  items: { key: keyof NotificationSettings; label: string; desc: string }[]
}

const CLIENT_GROUPS: NotifGroup[] = [
  {
    title: 'Reservas',
    items: [
      { key: 'reserva_enviada',    label: 'Solicitud enviada',         desc: 'Confirmación de que tu solicitud llegó al propietario' },
      { key: 'reserva_aceptada',   label: 'Reserva aceptada',          desc: 'El propietario aceptó y puedes pagar' },
      { key: 'reserva_rechazada',  label: 'Reserva rechazada',         desc: 'El propietario no pudo confirmar tu fecha' },
      { key: 'reserva_confirmada', label: 'Reserva confirmada',        desc: 'Tu pago fue procesado y la fecha está asegurada' },
      { key: 'reserva_cancelada',  label: 'Cancelaciones',             desc: 'Cuando se cancela una reserva por cualquier motivo' },
    ],
  },
  {
    title: 'Pagos',
    items: [
      { key: 'recordatorio_pago',  label: 'Recordatorio de cuota',     desc: 'Aviso cuando una cuota está próxima a vencer' },
    ],
  },
  {
    title: 'Evento',
    items: [
      { key: 'recordatorio_evento', label: 'Recordatorio 48h antes',   desc: 'Información del espacio el día previo a tu evento' },
      { key: 'solicitud_resena',    label: 'Solicitud de reseña',       desc: 'Invitación a valorar tu experiencia post-evento' },
    ],
  },
]

const HOST_GROUPS: NotifGroup[] = [
  {
    title: 'Solicitudes',
    items: [
      { key: 'nueva_solicitud',   label: 'Nueva solicitud de reserva', desc: 'Un cliente quiere reservar tu espacio' },
    ],
  },
  {
    title: 'Pagos',
    items: [
      { key: 'pago_recibido',    label: 'Pago confirmado',             desc: 'Un cliente completó el pago de una cuota' },
      { key: 'liquidacion',      label: 'Liquidación recibida',        desc: 'Espot te transfirió el neto de una reserva' },
    ],
  },
  {
    title: 'Reservas',
    items: [
      { key: 'cancelacion_host', label: 'Cancelación de cliente',      desc: 'Un cliente canceló su reserva en tu espacio' },
    ],
  },
]

interface Props {
  role: 'client' | 'host'
}

export default function NotificationSettings({ role }: Props) {
  const [settings, setSettings]   = useState<NotificationSettings | null>(null)
  const [saving,   setSaving]     = useState<string | null>(null)
  const [saved,    setSaved]      = useState<string | null>(null)
  const [loading,  setLoading]    = useState(true)

  useEffect(() => {
    getNotificationSettings().then(s => { setSettings(s); setLoading(false) })
  }, [])

  async function toggle(key: keyof NotificationSettings) {
    if (!settings) return
    const next = { ...settings, [key]: !settings[key] }
    setSettings(next)
    setSaving(key)
    await updateNotificationSettings({ [key]: !settings[key] })
    setSaving(null)
    setSaved(key)
    setTimeout(() => setSaved(null), 1500)
  }

  const groups = role === 'host' ? HOST_GROUPS : CLIENT_GROUPS

  if (loading) return (
    <div className="flex items-center justify-center py-8">
      <Loader2 size={22} className="animate-spin" style={{ color: 'var(--brand)' }} />
    </div>
  )

  if (!settings) return null

  return (
    <div className="space-y-6">
      {groups.map(group => (
        <div key={group.title}>
          <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>
            {group.title}
          </p>
          <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border-subtle)' }}>
            {group.items.map((item, i) => {
              const enabled   = settings[item.key]
              const isSaving  = saving  === item.key
              const isSaved   = saved   === item.key

              return (
                <div key={item.key}
                  className="flex items-center gap-4 px-5 py-4"
                  style={{
                    borderBottom: i < group.items.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                    background: '#fff',
                  }}>
                  {/* Icono */}
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: enabled ? 'var(--brand-dim)' : 'var(--bg-elevated)' }}>
                    {enabled
                      ? <Bell size={15} style={{ color: 'var(--brand)' }} />
                      : <BellOff size={15} style={{ color: 'var(--text-muted)' }} />
                    }
                  </div>

                  {/* Texto */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold" style={{ color: enabled ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                      {item.label}
                    </p>
                    <p className="text-xs mt-0.5 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                      {item.desc}
                    </p>
                  </div>

                  {/* Toggle */}
                  <button
                    type="button"
                    onClick={() => toggle(item.key)}
                    disabled={isSaving}
                    className="shrink-0 transition-all"
                    aria-label={enabled ? 'Desactivar' : 'Activar'}>
                    {isSaved ? (
                      <CheckCircle size={20} style={{ color: 'var(--brand)' }} />
                    ) : isSaving ? (
                      <Loader2 size={20} className="animate-spin" style={{ color: 'var(--brand)' }} />
                    ) : (
                      <div className="w-12 h-6 rounded-full relative transition-all"
                        style={{ background: enabled ? 'var(--brand)' : 'var(--border-medium)', padding: '2px' }}>
                        <div className="w-5 h-5 rounded-full bg-white shadow-sm transition-transform"
                          style={{ transform: enabled ? 'translateX(24px)' : 'translateX(0)' }} />
                      </div>
                    )}
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      ))}

      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
        Los emails transaccionales importantes (pagos, seguridad) siempre se envían independientemente de estas preferencias.
      </p>
    </div>
  )
}
