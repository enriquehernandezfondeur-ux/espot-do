'use client'

import Link from 'next/link'
import { useState, useRef } from 'react'
import { ArrowLeft, Mail, Phone, MapPin, Clock, MessageCircle, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { sendContactForm } from '@/lib/actions/contact'

const SUBJECTS = [
  'Consulta sobre una reserva',
  'Problema con un pago',
  'Quiero publicar mi espacio',
  'Reporte de incidente',
  'Otro',
]

const MAX_CHARS = 500

// ── Estilos de inputs compartidos ────────────────────────────
const inputStyle: React.CSSProperties = {
  width: '100%',
  fontSize: '16px', // previene zoom en iOS Safari
  padding: '11px 14px',
  borderRadius: '12px',
  border: '1.5px solid var(--border-subtle)',
  background: 'var(--bg-elevated)',
  color: 'var(--text-primary)',
  outline: 'none',
  fontFamily: 'inherit',
  transition: 'border-color 0.15s',
  boxSizing: 'border-box',
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '13px',
  fontWeight: 600,
  color: 'var(--text-secondary)',
  marginBottom: '6px',
}

export default function ContactoPage() {
  const [name,    setName]    = useState('')
  const [email,   setEmail]   = useState('')
  const [phone,   setPhone]   = useState('')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error,   setError]   = useState<string | null>(null)
  const formRef = useRef<HTMLFormElement>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const result = await sendContactForm({
        name:    name.trim(),
        email:   email.trim(),
        phone:   phone.trim() || undefined,
        subject,
        message: message.trim(),
      })

      if (result.success) {
        setSuccess(true)
        formRef.current?.reset()
        setName(''); setEmail(''); setPhone(''); setSubject(''); setMessage('')
      } else {
        setError(result.error ?? 'Ocurrió un error. Inténtalo de nuevo.')
      }
    } catch {
      setError('Error de red. Verifica tu conexión e inténtalo de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ background: 'var(--bg-base)', minHeight: '100dvh' }}>
      <div className="max-w-3xl mx-auto px-4 md:px-6 py-8 md:py-12">

        <Link href="/" className="inline-flex items-center gap-1.5 text-sm mb-8"
          style={{ color: 'var(--text-muted)' }}>
          <ArrowLeft size={14} /> Volver al inicio
        </Link>

        <div className="mb-10">
          <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>
            Servicio al Cliente
          </h1>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Estamos aquí para ayudarte con tus reservas, pagos y cualquier consulta.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">

          {/* Contacto directo */}
          <div className="rounded-2xl p-6" style={{ background: '#fff', border: '1px solid var(--border-subtle)' }}>
            <h2 className="font-bold text-base mb-5" style={{ color: 'var(--text-primary)' }}>Contacto directo</h2>
            <div className="space-y-4">
              <a href="mailto:contacto@espot.do"
                className="flex items-center gap-3 text-sm transition-colors group"
                style={{ color: 'var(--text-secondary)' }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: 'var(--brand-dim)' }}>
                  <Mail size={17} style={{ color: 'var(--brand)' }} />
                </div>
                <div>
                  <div className="font-semibold" style={{ color: 'var(--text-primary)' }}>Correo electrónico</div>
                  <div style={{ color: 'var(--brand)' }}>contacto@espot.do</div>
                </div>
              </a>

              <a href="tel:+18295481998"
                className="flex items-center gap-3 text-sm transition-colors"
                style={{ color: 'var(--text-secondary)' }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: 'var(--brand-dim)' }}>
                  <Phone size={17} style={{ color: 'var(--brand)' }} />
                </div>
                <div>
                  <div className="font-semibold" style={{ color: 'var(--text-primary)' }}>Teléfono</div>
                  <div style={{ color: 'var(--brand)' }}>+1 (829) 548-1998</div>
                </div>
              </a>

              <a href="https://wa.me/18295481998" target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-3 text-sm transition-colors"
                style={{ color: 'var(--text-secondary)' }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: 'rgba(37,211,102,0.1)' }}>
                  <MessageCircle size={17} style={{ color: '#25D366' }} />
                </div>
                <div>
                  <div className="font-semibold" style={{ color: 'var(--text-primary)' }}>WhatsApp</div>
                  <div style={{ color: '#25D366' }}>+1 (829) 548-1998</div>
                </div>
              </a>

              <div className="flex items-start gap-3 text-sm pt-1">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                  style={{ background: 'var(--brand-dim)' }}>
                  <MapPin size={17} style={{ color: 'var(--brand)' }} />
                </div>
                <div>
                  <div className="font-semibold mb-0.5" style={{ color: 'var(--text-primary)' }}>Dirección</div>
                  <div style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                    Calle Caonabo No. 42, Gazcue<br />
                    Distrito Nacional, RD
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3 text-sm">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: 'var(--brand-dim)' }}>
                  <Clock size={17} style={{ color: 'var(--brand)' }} />
                </div>
                <div>
                  <div className="font-semibold mb-0.5" style={{ color: 'var(--text-primary)' }}>Horario</div>
                  <div style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                    Lun – Vie: 9:00 AM – 6:00 PM<br />
                    Sáb: 10:00 AM – 2:00 PM
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Formulario de contacto */}
          <div className="rounded-2xl p-6" style={{ background: '#fff', border: '1px solid var(--border-subtle)' }}>
            <h2 className="font-bold text-base mb-5" style={{ color: 'var(--text-primary)' }}>Envíanos un mensaje</h2>

            {/* Estado de éxito */}
            {success && (
              <div className="flex items-start gap-3 rounded-xl p-4 mb-4"
                style={{ background: 'rgba(53,196,147,0.08)', border: '1.5px solid rgba(53,196,147,0.3)' }}>
                <CheckCircle size={18} style={{ color: 'var(--brand)', flexShrink: 0, marginTop: '1px' }} />
                <div>
                  <p className="text-sm font-semibold" style={{ color: '#0A7A50' }}>
                    ¡Mensaje enviado!
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: '#0A7A50', opacity: 0.8 }}>
                    Te respondemos en menos de 24 horas hábiles.
                  </p>
                </div>
              </div>
            )}

            {/* Estado de error */}
            {error && (
              <div className="flex items-start gap-3 rounded-xl p-4 mb-4"
                style={{ background: 'rgba(220,38,38,0.06)', border: '1.5px solid rgba(220,38,38,0.2)' }}>
                <AlertCircle size={18} style={{ color: '#DC2626', flexShrink: 0, marginTop: '1px' }} />
                <p className="text-sm" style={{ color: '#B91C1C' }}>{error}</p>
              </div>
            )}

            <form ref={formRef} onSubmit={handleSubmit} className="space-y-4" noValidate>
              {/* Nombre */}
              <div>
                <label style={labelStyle}>
                  Nombre completo <span style={{ color: '#DC2626' }}>*</span>
                </label>
                <input
                  type="text"
                  placeholder="Tu nombre"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                  style={inputStyle}
                  onFocus={e => { e.currentTarget.style.borderColor = 'var(--brand)' }}
                  onBlur={e  => { e.currentTarget.style.borderColor = 'var(--border-subtle)' }}
                />
              </div>

              {/* Email */}
              <div>
                <label style={labelStyle}>
                  Correo electrónico <span style={{ color: '#DC2626' }}>*</span>
                </label>
                <input
                  type="email"
                  placeholder="tu@email.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  style={inputStyle}
                  onFocus={e => { e.currentTarget.style.borderColor = 'var(--brand)' }}
                  onBlur={e  => { e.currentTarget.style.borderColor = 'var(--border-subtle)' }}
                />
              </div>

              {/* Teléfono (opcional) */}
              <div>
                <label style={labelStyle}>Teléfono <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(opcional)</span></label>
                <input
                  type="tel"
                  placeholder="+1 (809) 000-0000"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  style={inputStyle}
                  onFocus={e => { e.currentTarget.style.borderColor = 'var(--brand)' }}
                  onBlur={e  => { e.currentTarget.style.borderColor = 'var(--border-subtle)' }}
                />
              </div>

              {/* Motivo */}
              <div>
                <label style={labelStyle}>
                  Motivo <span style={{ color: '#DC2626' }}>*</span>
                </label>
                <select
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  required
                  style={{
                    ...inputStyle,
                    color: subject ? 'var(--text-primary)' : 'var(--text-muted)',
                    cursor: 'pointer',
                    appearance: 'none',
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%236B7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right 14px center',
                    paddingRight: '40px',
                  }}
                  onFocus={e => { e.currentTarget.style.borderColor = 'var(--brand)' }}
                  onBlur={e  => { e.currentTarget.style.borderColor = 'var(--border-subtle)' }}
                >
                  <option value="" disabled>Selecciona un motivo</option>
                  {SUBJECTS.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              {/* Mensaje */}
              <div>
                <label style={{ ...labelStyle, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Mensaje <span style={{ color: '#DC2626' }}>*</span></span>
                  <span style={{
                    fontWeight: 400,
                    color: message.length > MAX_CHARS * 0.9 ? '#DC2626' : 'var(--text-muted)',
                    fontSize: '12px',
                  }}>
                    {message.length}/{MAX_CHARS}
                  </span>
                </label>
                <textarea
                  placeholder="Escribe tu consulta con el mayor detalle posible…"
                  value={message}
                  onChange={e => setMessage(e.target.value.slice(0, MAX_CHARS))}
                  required
                  rows={4}
                  style={{
                    ...inputStyle,
                    resize: 'vertical',
                    minHeight: '100px',
                  }}
                  onFocus={e => { e.currentTarget.style.borderColor = 'var(--brand)' }}
                  onBlur={e  => { e.currentTarget.style.borderColor = 'var(--border-subtle)' }}
                />
              </div>

              {/* Botón submit */}
              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '13px 20px',
                  borderRadius: '50px',
                  border: 'none',
                  background: loading ? 'var(--brand-dim)' : 'var(--brand)',
                  color: loading ? 'var(--brand)' : '#fff',
                  fontSize: '15px',
                  fontWeight: 700,
                  fontFamily: 'inherit',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'opacity 0.15s, background 0.15s',
                  marginTop: '4px',
                }}
                onMouseEnter={e => { if (!loading) e.currentTarget.style.opacity = '0.88' }}
                onMouseLeave={e => { e.currentTarget.style.opacity = '1' }}
              >
                {loading && <Loader2 size={16} className="animate-spin" />}
                {loading ? 'Enviando…' : 'Enviar mensaje'}
              </button>
            </form>
          </div>
        </div>

        {/* Temas frecuentes */}
        <div className="rounded-2xl p-6 mb-8" style={{ background: '#fff', border: '1px solid var(--border-subtle)' }}>
          <h2 className="font-bold text-base mb-5" style={{ color: 'var(--text-primary)' }}>
            ¿En qué podemos ayudarte?
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { title: 'Problemas con una reserva',     desc: 'Cancelaciones, cambios de fecha o disputas con el propietario' },
              { title: 'Pagos y reembolsos',             desc: 'Cobros incorrectos, reembolsos pendientes o problemas con Azul Payments' },
              { title: 'Acceso a mi cuenta',             desc: 'No puedo entrar, cambio de email o contraseña olvidada' },
              { title: 'Publicar mi espacio',            desc: 'Quiero registrarme como propietario y publicar mi espacio' },
              { title: 'Reportar un problema',           desc: 'Espacio que no cumple lo publicado o comportamiento inapropiado' },
              { title: 'Otro',                           desc: 'Cualquier otra consulta o sugerencia' },
            ].map(item => (
              <button
                key={item.title}
                type="button"
                onClick={() => {
                  const match = SUBJECTS.find(s => s.toLowerCase().includes(item.title.split(' ')[0].toLowerCase()))
                  setSubject(match ?? 'Otro')
                  document.querySelector<HTMLElement>('textarea')?.focus()
                }}
                className="flex flex-col gap-1 p-4 rounded-xl transition-all hover:opacity-80 text-left"
                style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', cursor: 'pointer' }}>
                <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{item.title}</span>
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{item.desc}</span>
              </button>
            ))}
          </div>
          <p className="text-xs mt-4 text-center" style={{ color: 'var(--text-muted)' }}>
            Haz clic en un tema para pre-llenar el formulario con ese motivo.
          </p>
        </div>

        {/* Links de política */}
        <div className="rounded-2xl p-5" style={{ background: 'rgba(53,196,147,0.04)', border: '1px solid rgba(53,196,147,0.15)' }}>
          <p className="text-sm font-semibold mb-3" style={{ color: '#0A7A50' }}>Políticas y documentos relevantes</p>
          <div className="flex flex-wrap gap-3">
            {[
              { href: '/reembolso', label: 'Política de reembolso' },
              { href: '/terminos',  label: 'Términos y condiciones' },
              { href: '/privacidad', label: 'Política de privacidad' },
              { href: '/seguridad', label: 'Seguridad de pagos' },
            ].map(link => (
              <Link key={link.href} href={link.href}
                className="text-xs font-semibold px-3 py-1.5 rounded-xl transition-all"
                style={{ background: '#fff', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="mt-8 pt-6 text-xs text-center" style={{ borderTop: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
          © 2026 ESPOT, S.R.L. · República Dominicana
        </div>
      </div>
    </div>
  )
}
