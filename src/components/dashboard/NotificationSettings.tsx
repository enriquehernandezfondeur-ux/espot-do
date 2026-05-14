'use client'

import { useState, useEffect, useRef } from 'react'
import { Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export interface NotificationSettings {
  reserva_enviada:     boolean
  reserva_aceptada:    boolean
  reserva_rechazada:   boolean
  reserva_confirmada:  boolean
  reserva_cancelada:   boolean
  recordatorio_pago:   boolean
  recordatorio_evento: boolean
  solicitud_resena:    boolean
  nueva_solicitud:     boolean
  pago_recibido:       boolean
  cancelacion_host:    boolean
  liquidacion:         boolean
}

const DEFAULTS: NotificationSettings = {
  reserva_enviada:     true,
  reserva_aceptada:    true,
  reserva_rechazada:   true,
  reserva_confirmada:  true,
  reserva_cancelada:   true,
  recordatorio_pago:   true,
  recordatorio_evento: true,
  solicitud_resena:    true,
  nueva_solicitud:     true,
  pago_recibido:       true,
  cancelacion_host:    true,
  liquidacion:         true,
}

interface NotifItem { key: keyof NotificationSettings; label: string }
interface NotifGroup { title: string; items: NotifItem[] }

const CLIENT_GROUPS: NotifGroup[] = [
  {
    title: 'Reservas',
    items: [
      { key: 'reserva_enviada',    label: 'Solicitud enviada al propietario' },
      { key: 'reserva_aceptada',   label: 'Propietario aceptó tu solicitud' },
      { key: 'reserva_rechazada',  label: 'Propietario no pudo confirmar' },
      { key: 'reserva_confirmada', label: 'Reserva confirmada y pagada' },
      { key: 'reserva_cancelada',  label: 'Cancelación de reserva' },
    ],
  },
  {
    title: 'Pagos y evento',
    items: [
      { key: 'recordatorio_pago',   label: 'Recordatorio de cuota próxima' },
      { key: 'recordatorio_evento', label: 'Recordatorio 48h antes del evento' },
      { key: 'solicitud_resena',    label: 'Invitación a dejar reseña' },
    ],
  },
]

const HOST_GROUPS: NotifGroup[] = [
  {
    title: 'Solicitudes y pagos',
    items: [
      { key: 'nueva_solicitud', label: 'Nueva solicitud de reserva' },
      { key: 'pago_recibido',   label: 'Pago confirmado del cliente' },
      { key: 'liquidacion',     label: 'Liquidación transferida por Espot' },
    ],
  },
  {
    title: 'Reservas',
    items: [
      { key: 'cancelacion_host', label: 'Cliente canceló una reserva' },
    ],
  },
]

export default function NotificationSettings({ role }: { role: 'client' | 'host' }) {
  const [settings, setSettings] = useState<NotificationSettings>(DEFAULTS)
  const [pending,  setPending]  = useState<Set<string>>(new Set())
  const [loading,  setLoading]  = useState(true)
  const supabaseRef = useRef(createClient())

  // Carga directa desde el cliente — más rápido y sin roundtrip al servidor
  useEffect(() => {
    supabaseRef.current.auth.getUser()
      .then(({ data: { user } }) => {
        if (user?.user_metadata?.notification_settings) {
          setSettings({ ...DEFAULTS, ...user.user_metadata.notification_settings })
        }
      })
      .catch(() => {}) // si falla, muestra los defaults
      .finally(() => setLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function toggle(key: keyof NotificationSettings) {
    if (pending.has(key)) return
    const newVal = !settings[key]
    setSettings(prev => ({ ...prev, [key]: newVal }))
    setPending(p => new Set([...p, key]))

    try {
      const current = settings
      const updated = { ...current, [key]: newVal }
      await supabaseRef.current.auth.updateUser({ data: { notification_settings: updated } })
    } catch {
      // revertir si falla
      setSettings(prev => ({ ...prev, [key]: !newVal }))
    } finally {
      setPending(p => { const s = new Set(p); s.delete(key); return s })
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center py-6">
      <Loader2 size={20} className="animate-spin" style={{ color: 'var(--brand)' }} />
    </div>
  )

  const groups = role === 'host' ? HOST_GROUPS : CLIENT_GROUPS

  return (
    <div className="space-y-5">
      {groups.map(group => (
        <div key={group.title}>
          <p className="text-xs font-bold uppercase tracking-widest mb-2.5" style={{ color: 'var(--text-muted)' }}>
            {group.title}
          </p>
          <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border-subtle)' }}>
            {group.items.map((item, i) => {
              const enabled = settings[item.key]
              const saving  = pending.has(item.key)

              return (
                <div key={item.key}
                  className="flex items-center justify-between gap-3 px-4 py-3.5"
                  style={{
                    borderBottom: i < group.items.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                    background: 'var(--bg-surface)',
                  }}>
                  <span className="text-sm font-medium leading-snug"
                    style={{ color: enabled ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                    {item.label}
                  </span>
                  <button
                    type="button"
                    onClick={() => toggle(item.key)}
                    disabled={saving}
                    aria-label={enabled ? 'Desactivar' : 'Activar'}
                    style={{ minWidth: 44, minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', flexShrink: 0 }}>
                    {saving ? (
                      <Loader2 size={18} className="animate-spin" style={{ color: 'var(--brand)' }} />
                    ) : (
                      <div style={{
                        width: 44, height: 24, borderRadius: 12, padding: 2,
                        background: enabled ? 'var(--brand)' : 'var(--border-medium)',
                        position: 'relative', transition: 'background 0.2s',
                      }}>
                        <div style={{
                          width: 20, height: 20, borderRadius: '50%', background: '#fff',
                          boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
                          transform: enabled ? 'translateX(20px)' : 'translateX(0)',
                          transition: 'transform 0.2s ease',
                        }} />
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
        Los emails de pagos y seguridad siempre se envían.
      </p>
    </div>
  )
}
