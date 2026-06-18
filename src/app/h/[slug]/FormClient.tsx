'use client'

import { useState } from 'react'
import { createFromPublicForm } from '@/lib/actions/external-events'
import { todayInRD } from '@/lib/utils'
import { CalendarDays, Users, Phone, Mail, User, MessageSquare, CheckCircle2, Loader2, ChevronDown } from 'lucide-react'

const EVENT_TYPES = [
  'Cumpleaños', 'Boda', 'Quinceañera', 'Graduación', 'Aniversario',
  'Corporativo', 'Conferencia', 'Taller', 'Lanzamiento de producto',
  'Cena privada', 'Coctel', 'Baby shower', 'Despedida de soltera',
  'Reunión familiar', 'Otro',
]

interface Space { id: string; name: string; category: string; city: string; sector?: string }

interface Props {
  hostId:   string
  hostName: string
  spaces:   Space[]
}

export default function FormClient({ hostId, hostName, spaces }: Props) {
  const [form, setForm] = useState({
    clientName:  '',
    clientEmail: '',
    clientPhone: '',
    eventDate:   '',
    eventType:   '',
    guestCount:  '',
    message:     '',
    spaceId:     '',
  })
  const [loading,  setLoading]  = useState(false)
  const [success,  setSuccess]  = useState(false)
  const [error,    setError]    = useState('')

  const today = todayInRD()

  function set(k: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm(prev => ({ ...prev, [k]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.clientName.trim() || !form.clientEmail.trim() || !form.eventDate) {
      setError('Completa los campos obligatorios: nombre, email y fecha.')
      return
    }
    setError('')
    setLoading(true)
    const result = await createFromPublicForm({
      hostId,
      clientName:  form.clientName.trim(),
      clientEmail: form.clientEmail.trim(),
      clientPhone: form.clientPhone.trim() || undefined,
      eventDate:   form.eventDate,
      eventType:   form.eventType || undefined,
      guestCount:  form.guestCount ? parseInt(form.guestCount) : undefined,
      message:     form.message.trim() || undefined,
      spaceId:     form.spaceId || undefined,
    })
    setLoading(false)
    if ('error' in result) { setError(result.error ?? 'Error al enviar'); return }
    setSuccess(true)
  }

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center px-4">
        <div className="w-16 h-16 rounded-full flex items-center justify-center mb-5"
          style={{ background: 'rgba(53,196,147,0.1)', border: '2px solid rgba(53,196,147,0.3)' }}>
          <CheckCircle2 size={32} color="#35C493" />
        </div>
        <h2 className="text-xl font-bold mb-2" style={{ color: '#0F1623', letterSpacing: '-0.02em' }}>
          ¡Solicitud enviada!
        </h2>
        <p className="text-sm max-w-xs" style={{ color: '#6B7280', lineHeight: 1.6 }}>
          <strong>{hostName}</strong> recibió tu solicitud y se pondrá en contacto contigo pronto.
          También te enviamos una confirmación a tu email.
        </p>
      </div>
    )
  }

  const inputBase: React.CSSProperties = {
    width: '100%', background: '#fff', border: '1.5px solid #E8ECF0',
    borderRadius: 12, padding: '12px 14px 12px 42px', fontSize: 14,
    color: '#0F1623', outline: 'none', boxSizing: 'border-box',
    fontFamily: 'inherit',
  }
  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: 12, fontWeight: 600,
    color: '#374151', marginBottom: 6, letterSpacing: '0.01em',
  }
  const iconWrap: React.CSSProperties = {
    position: 'absolute', left: 14, top: '50%',
    transform: 'translateY(-50%)', pointerEvents: 'none',
    color: '#9CA3AF',
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

      {/* Nombre */}
      <div>
        <label style={labelStyle}>Nombre completo *</label>
        <div style={{ position: 'relative' }}>
          <span style={iconWrap}><User size={16} /></span>
          <input
            type="text" placeholder="Tu nombre" required
            value={form.clientName} onChange={set('clientName')}
            style={inputBase}
          />
        </div>
      </div>

      {/* Email + Teléfono */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div>
          <label style={labelStyle}>Email *</label>
          <div style={{ position: 'relative' }}>
            <span style={iconWrap}><Mail size={16} /></span>
            <input
              type="email" placeholder="tucorreo@email.com" required
              value={form.clientEmail} onChange={set('clientEmail')}
              style={inputBase}
            />
          </div>
        </div>
        <div>
          <label style={labelStyle}>Teléfono</label>
          <div style={{ position: 'relative' }}>
            <span style={iconWrap}><Phone size={16} /></span>
            <input
              type="tel" placeholder="809-000-0000"
              value={form.clientPhone} onChange={set('clientPhone')}
              style={inputBase}
            />
          </div>
        </div>
      </div>

      {/* Fecha */}
      <div>
        <label style={labelStyle}>Fecha del evento *</label>
        <div style={{ position: 'relative' }}>
          <span style={iconWrap}><CalendarDays size={16} /></span>
          <input
            type="date" required min={today}
            value={form.eventDate} onChange={set('eventDate')}
            style={inputBase}
          />
        </div>
      </div>

      {/* Tipo de evento + invitados */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div>
          <label style={labelStyle}>Tipo de evento</label>
          <div style={{ position: 'relative' }}>
            <select
              value={form.eventType} onChange={set('eventType')}
              style={{ ...inputBase, paddingLeft: 14, appearance: 'none', cursor: 'pointer', color: form.eventType ? '#0F1623' : '#9CA3AF' }}>
              <option value="">Selecciona...</option>
              {EVENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#9CA3AF' }}>
              <ChevronDown size={14} />
            </span>
          </div>
        </div>
        <div>
          <label style={labelStyle}>N° de personas</label>
          <div style={{ position: 'relative' }}>
            <span style={iconWrap}><Users size={16} /></span>
            <input
              type="number" placeholder="Ej. 50" min={1}
              value={form.guestCount} onChange={set('guestCount')}
              style={inputBase}
            />
          </div>
        </div>
      </div>

      {/* Espacio (si el host tiene varios) */}
      {spaces.length > 1 && (
        <div>
          <label style={labelStyle}>Lugar de preferencia</label>
          <div style={{ position: 'relative' }}>
            <select
              value={form.spaceId} onChange={set('spaceId')}
              style={{ ...inputBase, paddingLeft: 14, appearance: 'none', cursor: 'pointer', color: form.spaceId ? '#0F1623' : '#9CA3AF' }}>
              <option value="">Sin preferencia</option>
              {spaces.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name} — {s.sector ? `${s.sector}, ` : ''}{s.city}
                </option>
              ))}
            </select>
            <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#9CA3AF' }}>
              <ChevronDown size={14} />
            </span>
          </div>
        </div>
      )}

      {/* Mensaje */}
      <div>
        <label style={labelStyle}>Cuéntanos sobre tu evento</label>
        <div style={{ position: 'relative' }}>
          <span style={{ position: 'absolute', left: 14, top: 14, pointerEvents: 'none', color: '#9CA3AF' }}>
            <MessageSquare size={16} />
          </span>
          <textarea
            rows={3} placeholder="Detalles adicionales, peticiones especiales, presupuesto estimado..."
            value={form.message} onChange={set('message')}
            style={{ ...inputBase, paddingLeft: 42, resize: 'vertical', lineHeight: 1.6 }}
          />
        </div>
      </div>

      {error && (
        <p style={{ color: '#DC2626', fontSize: 13, background: '#FEF2F2', border: '1px solid #FEE2E2', borderRadius: 10, padding: '10px 14px', margin: 0 }}>
          {error}
        </p>
      )}

      <button
        type="submit" disabled={loading}
        style={{
          background: '#35C493', color: '#fff', fontWeight: 800, fontSize: 15,
          padding: '15px 24px', borderRadius: 50, border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
          opacity: loading ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          fontFamily: 'inherit', letterSpacing: '-0.01em', boxShadow: '0 4px 20px rgba(53,196,147,0.35)',
        }}>
        {loading ? <><Loader2 size={17} className="animate-spin" /> Enviando...</> : 'Enviar solicitud →'}
      </button>

      <p style={{ textAlign: 'center', fontSize: 11, color: '#9CA3AF', margin: 0 }}>
        Al enviar aceptas que {hostName} se ponga en contacto contigo para coordinar los detalles.
      </p>
    </form>
  )
}
