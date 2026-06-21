'use client'

import { useState, useEffect, useRef } from 'react'
import { Loader2, Bell, CalendarCheck, CreditCard, MessageCircle, Star, ShieldCheck, Banknote, XCircle, Send, CheckCircle, AlertCircle, Clock } from 'lucide-react'
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
  mensaje_nuevo:       boolean
  nueva_resena:        boolean
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
  mensaje_nuevo:       true,
  nueva_resena:        true,
}

interface NotifItem {
  key:   keyof NotificationSettings
  label: string
  desc:  string
  icon:  React.ElementType
}

interface NotifGroup {
  title: string
  items: NotifItem[]
}

const CLIENT_GROUPS: NotifGroup[] = [
  {
    title: 'Reservas',
    items: [
      { key: 'reserva_enviada',    icon: Send,         label: 'Solicitud enviada',           desc: 'Confirmación de que tu solicitud fue enviada al propietario' },
      { key: 'reserva_aceptada',   icon: CheckCircle,  label: 'Solicitud aceptada',          desc: 'El propietario aprobó tu reserva, pendiente de pago' },
      { key: 'reserva_rechazada',  icon: XCircle,      label: 'Solicitud no confirmada',     desc: 'El propietario no pudo aceptar tu solicitud' },
      { key: 'reserva_confirmada', icon: CalendarCheck,label: 'Reserva confirmada',          desc: 'Pago procesado y reserva confirmada con éxito' },
      { key: 'reserva_cancelada',  icon: AlertCircle,  label: 'Cancelación de reserva',      desc: 'Aviso cuando una reserva tuya es cancelada' },
    ],
  },
  {
    title: 'Pagos',
    items: [
      { key: 'recordatorio_pago',   icon: CreditCard,  label: 'Recordatorio de cuota',      desc: 'Te avisamos antes de cada vencimiento de cuota' },
      { key: 'recordatorio_evento', icon: Clock,       label: 'Recordatorio de evento',     desc: '48 horas antes de tu evento' },
    ],
  },
  {
    title: 'Mensajes y reseñas',
    items: [
      { key: 'mensaje_nuevo',    icon: MessageCircle, label: 'Nuevo mensaje del propietario', desc: 'Cuando un propietario te escribe en el chat' },
      { key: 'solicitud_resena', icon: Star,          label: 'Invitación a dejar reseña',     desc: 'Después de tu evento, te pediremos tu opinión' },
    ],
  },
]

const HOST_GROUPS: NotifGroup[] = [
  {
    title: 'Solicitudes y reservas',
    items: [
      { key: 'nueva_solicitud',  icon: Bell,          label: 'Nueva solicitud de reserva',  desc: 'Un cliente quiere reservar tu espacio' },
      { key: 'cancelacion_host', icon: XCircle,       label: 'Cliente canceló reserva',     desc: 'Un cliente canceló una reserva confirmada' },
    ],
  },
  {
    title: 'Pagos e ingresos',
    items: [
      { key: 'pago_recibido',   icon: CreditCard,  label: 'Pago recibido del cliente',     desc: 'Confirmación de cada pago procesado por Espot' },
      { key: 'liquidacion',     icon: Banknote,    label: 'Liquidación transferida',       desc: 'Cuando Espot transfiere tu neto a tu cuenta' },
    ],
  },
  {
    title: 'Mensajes y reseñas',
    items: [
      { key: 'mensaje_nuevo', icon: MessageCircle, label: 'Nuevo mensaje de cliente',      desc: 'Cuando un cliente te escribe en el chat' },
      { key: 'nueva_resena',  icon: Star,          label: 'Nueva reseña recibida',         desc: 'Un cliente dejó una reseña en tu espacio' },
    ],
  },
]

export default function NotificationSettings({ role }: { role: 'client' | 'host' }) {
  const [settings, setSettings] = useState<NotificationSettings>(DEFAULTS)
  const [pending,  setPending]  = useState<Set<string>>(new Set())
  const [loading,  setLoading]  = useState(true)
  const [saved,    setSaved]    = useState(false)
  const supabaseRef = useRef(createClient())

  useEffect(() => {
    supabaseRef.current.auth.getUser()
      .then(({ data: { user } }) => {
        if (user?.user_metadata?.notification_settings) {
          setSettings({ ...DEFAULTS, ...user.user_metadata.notification_settings })
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function toggle(key: keyof NotificationSettings) {
    if (pending.has(key)) return
    const newVal = !settings[key]
    setSettings(prev => ({ ...prev, [key]: newVal }))
    setPending(p => new Set([...p, key]))
    setSaved(false)

    try {
      const updated = { ...settings, [key]: newVal }
      await supabaseRef.current.auth.updateUser({ data: { notification_settings: updated } })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch {
      setSettings(prev => ({ ...prev, [key]: !newVal }))
    } finally {
      setPending(p => { const s = new Set(p); s.delete(key); return s })
    }
  }

  const groups = role === 'host' ? HOST_GROUPS : CLIENT_GROUPS
  const allKeys = groups.flatMap(g => g.items.map(i => i.key))
  const allOn   = allKeys.every(k => settings[k])

  async function toggleAll() {
    const newVal = !allOn
    const patch  = Object.fromEntries(allKeys.map(k => [k, newVal])) as Partial<NotificationSettings>
    setSettings(prev => ({ ...prev, ...patch }))
    try {
      await supabaseRef.current.auth.updateUser({ data: { notification_settings: { ...settings, ...patch } } })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch {
      setSettings(prev => ({ ...prev, ...Object.fromEntries(allKeys.map(k => [k, !newVal])) }))
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center py-12">
      <Loader2 size={22} className="animate-spin" style={{ color: 'var(--brand)' }} />
    </div>
  )

  return (
    <div>

      {/* Header de sección */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest mb-0.5" style={{ color: 'var(--brand)' }}>
            Notificaciones por email
          </p>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Gestiona qué emails quieres recibir
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {saved && (
            <span className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full"
              style={{ background: 'var(--brand-dim)', color: 'var(--brand)' }}>
              <ShieldCheck size={11} /> Guardado
            </span>
          )}
          <button
            type="button"
            onClick={toggleAll}
            className="text-xs font-semibold px-3 py-1.5 rounded-xl transition-all"
            style={{
              background:  allOn ? 'rgba(220,38,38,0.07)' : 'var(--brand-dim)',
              color:       allOn ? 'var(--danger)' : 'var(--brand)',
              border:      `1px solid ${allOn ? 'rgba(220,38,38,0.18)' : 'var(--brand-border)'}`,
            }}>
            {allOn ? 'Desactivar todo' : 'Activar todo'}
          </button>
        </div>
      </div>

      {/* Grupos */}
      <div className="space-y-5">
        {groups.map(group => (
          <div key={group.title}>
            <p className="text-[11px] font-bold uppercase tracking-widest mb-2"
              style={{ color: 'var(--text-muted)' }}>
              {group.title}
            </p>
            <div className="rounded-2xl overflow-hidden"
              style={{ border: '1px solid var(--border-subtle)' }}>
              {group.items.map((item, i) => {
                const Icon    = item.icon
                const enabled = settings[item.key]
                const saving  = pending.has(item.key)

                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => toggle(item.key)}
                    disabled={saving}
                    className="w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors"
                    style={{
                      background:   'var(--bg-surface)',
                      borderBottom: i < group.items.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                      cursor:       saving ? 'wait' : 'pointer',
                    }}>

                    {/* Icono */}
                    <div className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all"
                      style={{
                        background: enabled ? 'var(--brand-dim)' : 'var(--bg-elevated)',
                      }}>
                      <Icon size={16} style={{ color: enabled ? 'var(--brand)' : 'var(--text-muted)' }} />
                    </div>

                    {/* Texto */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold leading-snug"
                        style={{ color: enabled ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                        {item.label}
                      </p>
                      <p className="text-xs leading-snug mt-0.5 hidden sm:block"
                        style={{ color: 'var(--text-muted)' }}>
                        {item.desc}
                      </p>
                    </div>

                    {/* Toggle */}
                    <div className="shrink-0 ml-2">
                      {saving ? (
                        <Loader2 size={18} className="animate-spin" style={{ color: 'var(--brand)' }} />
                      ) : (
                        <div style={{
                          width: 44, height: 24, borderRadius: 12, padding: 2,
                          background:  enabled ? 'var(--brand)' : 'var(--border-medium)',
                          transition:  'background 0.2s',
                          flexShrink:  0,
                        }}>
                          <div style={{
                            width: 20, height: 20, borderRadius: '50%', background: '#fff',
                            boxShadow:  '0 1px 4px rgba(0,0,0,0.2)',
                            transform:  enabled ? 'translateX(20px)' : 'translateX(0)',
                            transition: 'transform 0.2s ease',
                          }} />
                        </div>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Nota de seguridad */}
      <div className="flex items-start gap-2.5 mt-5 px-4 py-3 rounded-xl"
        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
        <ShieldCheck size={14} style={{ color: 'var(--brand)', flexShrink: 0, marginTop: 1 }} />
        <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
          Los emails de pagos procesados y seguridad de cuenta siempre se envían, independientemente de esta configuración.
        </p>
      </div>

    </div>
  )
}
