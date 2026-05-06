'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { Save, Camera, Loader2, CheckCircle, Calendar, Copy, RefreshCw, ExternalLink, Link2, Link2Off } from 'lucide-react'
import { getClientProfile, updateClientProfile } from '@/lib/actions/client'
import { getOrCreateIcalToken, regenerateIcalToken, getGoogleCalendarStatus, disconnectGoogleCalendar } from '@/lib/actions/host'
import { createClient } from '@/lib/supabase/client'
import { useSearchParams } from 'next/navigation'

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://espothub.com'

// Wrapper con Suspense requerido por useSearchParams en Next.js 16
export default function HostAjustesPage() {
  return <Suspense fallback={null}><AjustesInner /></Suspense>
}

function AjustesInner() {
  const [loading,   setLoading]   = useState(true)
  const [saving,    setSaving]    = useState(false)
  const [saved,     setSaved]     = useState(false)
  const [error,     setError]     = useState('')
  const [uploading, setUploading] = useState(false)

  const [fullName,  setFullName]  = useState('')
  const [phone,     setPhone]     = useState('')
  const [whatsapp,  setWhatsapp]  = useState('')
  const [email,     setEmail]     = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')

  // iCal
  const [icalToken,      setIcalToken]      = useState<string | null>(null)
  const [icalLoading,    setIcalLoading]    = useState(false)
  const [icalCopied,     setIcalCopied]     = useState(false)
  const [regenerating,   setRegenerating]   = useState(false)
  const [confirmRegen,   setConfirmRegen]   = useState(false)

  // Google Calendar
  const [gcalConnected,    setGcalConnected]    = useState(false)
  const [gcalDisconnecting, setGcalDisconnecting] = useState(false)
  const [gcalMessage,      setGcalMessage]      = useState('')

  const searchParams = useSearchParams()

  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    Promise.all([
      getClientProfile(),
      getGoogleCalendarStatus(),
    ]).then(([p, gcal]) => {
      if (p) {
        setFullName(p.full_name ?? '')
        setPhone(p.phone ?? '')
        setWhatsapp(p.whatsapp ?? '')
        setEmail(p.email ?? '')
        setAvatarUrl(p.avatar_url ?? '')
      }
      setGcalConnected(gcal.connected)
      setLoading(false)
    })
  }, [])

  // Leer mensajes del callback de OAuth
  useEffect(() => {
    const connected = searchParams.get('connected')
    const errParam  = searchParams.get('error')
    if (connected === 'google') { setGcalConnected(true); setGcalMessage('Google Calendar conectado correctamente.') }
    if (errParam === 'google_denied') setGcalMessage('Acceso denegado. Vuelve a intentarlo.')
    if (errParam === 'google_not_configured') setGcalMessage('Google Calendar no está configurado aún.')
    if (errParam) setTimeout(() => setGcalMessage(''), 4000)
  }, [searchParams])

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setError('')
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No autenticado')
      const ext  = file.name.split('.').pop() ?? 'jpg'
      const path = `avatars/${user.id}.${ext}`
      const { error: upErr } = await supabase.storage
        .from('space-images').upload(path, file, { upsert: true, contentType: file.type })
      if (upErr) throw upErr
      const { data: { publicUrl } } = supabase.storage.from('space-images').getPublicUrl(path)
      setAvatarUrl(publicUrl)
      await updateClientProfile({ avatar_url: publicUrl })
    } catch {
      setError('No se pudo subir la foto. Intenta de nuevo.')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function handleSave() {
    setSaving(true)
    setError('')
    const result = await updateClientProfile({ full_name: fullName, phone, whatsapp })
    if ('error' in result) {
      setError(result.error ?? 'Error al guardar')
    } else {
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    }
    setSaving(false)
  }

  async function handleGetIcal() {
    setIcalLoading(true)
    const token = await getOrCreateIcalToken()
    setIcalToken(token)
    setIcalLoading(false)
  }

  async function handleRegenerate() {
    setRegenerating(true)
    const token = await regenerateIcalToken()
    setIcalToken(token)
    setRegenerating(false)
    setConfirmRegen(false)
  }

  function copyIcalUrl() {
    if (!icalToken) return
    const url = `${BASE_URL}/api/cal/${icalToken}`
    navigator.clipboard.writeText(url)
    setIcalCopied(true)
    setTimeout(() => setIcalCopied(false), 2000)
  }

  const icalUrl = icalToken ? `${BASE_URL}/api/cal/${icalToken}` : null

  async function handleDisconnectGcal() {
    setGcalDisconnecting(true)
    await disconnectGoogleCalendar()
    setGcalConnected(false)
    setGcalMessage('Google Calendar desconectado.')
    setTimeout(() => setGcalMessage(''), 3000)
    setGcalDisconnecting(false)
  }

  if (loading) return (
    <div className="flex items-center justify-center h-screen" style={{ background: 'var(--bg-base)' }}>
      <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--brand)' }} />
    </div>
  )

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Ajustes de cuenta</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Tu información como propietario</p>
      </div>

      {/* Avatar */}
      <div className="rounded-2xl p-6 mb-5"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
        <div className="flex items-center gap-5">
          <div className="relative">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt={fullName}
                className="w-20 h-20 rounded-3xl object-cover"
                style={{ border: '2px solid var(--border-subtle)' }} />
            ) : (
              <div className="w-20 h-20 rounded-3xl flex items-center justify-center text-3xl font-bold text-white"
                style={{ background: 'linear-gradient(135deg, var(--brand), var(--brand-dark))' }}>
                {fullName?.charAt(0)?.toUpperCase() || 'H'}
              </div>
            )}
            <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
              className="absolute -bottom-1.5 -right-1.5 w-7 h-7 rounded-xl flex items-center justify-center text-white transition-opacity hover:opacity-80 disabled:opacity-50"
              style={{ background: 'var(--brand)' }}>
              {uploading ? <Loader2 size={11} className="animate-spin" /> : <Camera size={13} />}
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
          </div>
          <div>
            <div className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>{fullName || 'Tu nombre'}</div>
            <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>{email}</div>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              {uploading ? 'Subiendo foto...' : 'Click en la cámara para cambiar tu foto'}
            </p>
          </div>
        </div>
      </div>

      {/* Formulario */}
      <div className="rounded-2xl p-6 mb-5 space-y-5"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
        <h2 className="font-bold" style={{ color: 'var(--text-primary)' }}>Información personal</h2>
        {[
          { label: 'Nombre completo', value: fullName, setter: setFullName, placeholder: 'Tu nombre' },
          { label: 'Teléfono',        value: phone,    setter: setPhone,    placeholder: '+1 (809) 000-0000' },
          { label: 'WhatsApp',        value: whatsapp, setter: setWhatsapp, placeholder: '+1 (829) 000-0000' },
        ].map(field => (
          <div key={field.label}>
            <label className="block text-xs font-semibold uppercase tracking-widest mb-2"
              style={{ color: 'var(--text-muted)' }}>{field.label}</label>
            <input value={field.value} onChange={e => field.setter(e.target.value)}
              placeholder={field.placeholder}
              className="input-base w-full rounded-xl px-4 py-3.5 text-sm" />
          </div>
        ))}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-widest mb-2"
            style={{ color: 'var(--text-muted)' }}>Correo electrónico</label>
          <input value={email} disabled
            className="w-full rounded-xl px-4 py-3.5 text-sm cursor-not-allowed"
            style={{ background: 'var(--bg-elevated)', border: '1.5px solid var(--border-subtle)', color: 'var(--text-muted)' }} />
          <p className="text-xs mt-1.5" style={{ color: 'var(--text-muted)' }}>El email no se puede cambiar</p>
        </div>
      </div>

      {error && (
        <div className="text-sm px-4 py-3 rounded-xl mb-4"
          style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626' }}>{error}</div>
      )}

      <button onClick={handleSave} disabled={saving}
        className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-bold text-sm transition-all disabled:opacity-50 mb-6"
        style={{ background: saved ? 'rgba(22,163,74,0.1)' : 'var(--brand)', color: saved ? '#16A34A' : '#fff' }}>
        {saving ? <><Loader2 size={18} className="animate-spin" /> Guardando...</>
        : saved  ? <><CheckCircle size={18} /> ¡Guardado!</>
        :          <><Save size={18} /> Guardar cambios</>}
      </button>

      {/* ── Google Calendar ── */}
      <div className="rounded-2xl p-6 mb-5"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(66,133,244,0.1)' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" fill="#4285F4"/>
            </svg>
          </div>
          <div>
            <h2 className="font-bold" style={{ color: 'var(--text-primary)' }}>Google Calendar</h2>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Las reservas confirmadas se crean automáticamente en tu calendario
            </p>
          </div>
          {gcalConnected && (
            <span className="ml-auto flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full"
              style={{ background: 'rgba(22,163,74,0.1)', color: '#16A34A' }}>
              <CheckCircle size={11} /> Conectado
            </span>
          )}
        </div>

        {gcalMessage && (
          <div className="mb-4 px-4 py-3 rounded-xl text-sm"
            style={{
              background: gcalMessage.includes('conectado') || gcalMessage.includes('Conectado')
                ? 'rgba(22,163,74,0.06)' : 'rgba(220,38,38,0.06)',
              border: `1px solid ${gcalMessage.includes('conectado') || gcalMessage.includes('Conectado')
                ? 'rgba(22,163,74,0.2)' : 'rgba(220,38,38,0.2)'}`,
              color: gcalMessage.includes('conectado') || gcalMessage.includes('Conectado')
                ? '#166534' : '#991B1B',
            }}>
            {gcalMessage}
          </div>
        )}

        {!gcalConnected ? (
          <div>
            <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
              Conecta tu cuenta de Google para que cada reserva confirmada aparezca automáticamente en tu Google Calendar con todos los detalles del evento.
            </p>
            <div className="flex items-start gap-3 mb-5">
              {['Reservas confirmadas → evento automático', 'Reservas rechazadas/canceladas → evento eliminado', 'Nombre del cliente, personas y horario incluidos'].map(item => (
                <div key={item} className="flex items-start gap-1.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
                  <span style={{ color: 'var(--brand)', marginTop: 1 }}>·</span> {item}
                </div>
              ))}
            </div>
            <a href="/api/auth/google-calendar"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all"
              style={{ background: '#4285F4', color: '#fff' }}>
              <Link2 size={15} /> Conectar Google Calendar
            </a>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="px-4 py-3 rounded-xl text-sm"
              style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>
              Las nuevas reservas confirmadas se crearán automáticamente en tu calendario. Las canceladas y rechazadas se eliminan.
            </div>
            <button
              onClick={handleDisconnectGcal}
              disabled={gcalDisconnecting}
              className="flex items-center gap-1.5 text-xs font-medium transition-colors disabled:opacity-50"
              style={{ color: 'var(--text-muted)' }}>
              {gcalDisconnecting
                ? <><Loader2 size={12} className="animate-spin" /> Desconectando...</>
                : <><Link2Off size={12} /> Desconectar Google Calendar</>}
            </button>
          </div>
        )}
      </div>

      {/* ── Sincronizar calendario (iCal) ── */}
      <div className="rounded-2xl p-6"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(53,196,147,0.1)' }}>
            <Calendar size={18} style={{ color: 'var(--brand)' }} />
          </div>
          <div>
            <h2 className="font-bold" style={{ color: 'var(--text-primary)' }}>Enlace iCal universal</h2>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Para Apple Calendar, Outlook u otras apps de calendario
            </p>
          </div>
        </div>

        {!icalToken ? (
          <div className="mt-5">
            <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
              Genera un enlace iCal privado para sincronizar tus reservas confirmadas y fechas bloqueadas con cualquier aplicación de calendario. El enlace se actualiza automáticamente.
            </p>
            <button onClick={handleGetIcal} disabled={icalLoading}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
              style={{ background: 'var(--brand)', color: '#fff' }}>
              {icalLoading
                ? <><Loader2 size={15} className="animate-spin" /> Generando...</>
                : <><Calendar size={15} /> Generar enlace iCal</>}
            </button>
          </div>
        ) : (
          <div className="mt-5 space-y-4">

            {/* URL del feed */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest mb-2"
                style={{ color: 'var(--text-muted)' }}>Tu enlace iCal privado</label>
              <div className="flex items-center gap-2">
                <div className="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-mono overflow-hidden"
                  style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
                  <span className="truncate">{icalUrl}</span>
                </div>
                <button onClick={copyIcalUrl}
                  className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold shrink-0 transition-all"
                  style={icalCopied
                    ? { background: 'rgba(22,163,74,0.1)', color: '#16A34A', border: '1px solid rgba(22,163,74,0.2)' }
                    : { background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}>
                  {icalCopied ? <><CheckCircle size={13} /> Copiado</> : <><Copy size={13} /> Copiar</>}
                </button>
              </div>
            </div>

            {/* Instrucciones por plataforma */}
            <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border-subtle)' }}>
              {[
                {
                  name: 'Google Calendar',
                  steps: 'Abre Google Calendar → Otros calendarios (+) → Desde URL → pega el enlace → Añadir calendario',
                  href: 'https://calendar.google.com',
                },
                {
                  name: 'Apple Calendar',
                  steps: 'Archivo → Nueva suscripción de calendario → pega el enlace → Suscribirse',
                  href: null,
                },
                {
                  name: 'Outlook',
                  steps: 'Agregar calendario → Suscribirse desde web → pega el enlace → Importar',
                  href: 'https://outlook.live.com/calendar',
                },
              ].map((platform, i, arr) => (
                <div key={platform.name}
                  className="px-4 py-3"
                  style={i < arr.length - 1 ? { borderBottom: '1px solid var(--border-subtle)' } : {}}>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                        {platform.name}
                      </div>
                      <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                        {platform.steps}
                      </div>
                    </div>
                    {platform.href && (
                      <a href={platform.href} target="_blank" rel="noopener noreferrer"
                        className="shrink-0 p-1.5 rounded-lg transition-colors hover:opacity-70"
                        style={{ color: 'var(--text-muted)' }}>
                        <ExternalLink size={13} />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Qué incluye */}
            <div className="px-4 py-3 rounded-xl text-xs space-y-1"
              style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>
              <div className="font-semibold mb-1.5" style={{ color: 'var(--text-primary)' }}>El feed incluye:</div>
              {[
                'Reservas confirmadas (con nombre del cliente, personas, horario)',
                'Reservas aceptadas pendientes de pago',
                'Fechas bloqueadas manualmente',
              ].map(item => (
                <div key={item} className="flex items-start gap-2">
                  <span style={{ color: 'var(--brand)' }}>·</span> {item}
                </div>
              ))}
              <div className="flex items-start gap-2 mt-2 pt-2" style={{ borderTop: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                <span>↻</span> Se actualiza automáticamente cada 30 minutos en tu aplicación de calendario
              </div>
            </div>

            {/* Regenerar enlace */}
            {!confirmRegen ? (
              <button onClick={() => setConfirmRegen(true)}
                className="flex items-center gap-1.5 text-xs font-medium transition-colors"
                style={{ color: 'var(--text-muted)' }}>
                <RefreshCw size={12} /> Regenerar enlace
              </button>
            ) : (
              <div className="px-4 py-3 rounded-xl"
                style={{ background: '#FEF2F2', border: '1px solid #FECACA' }}>
                <p className="text-xs font-semibold mb-2" style={{ color: '#DC2626' }}>
                  Esto invalida el enlace anterior. Tendrás que actualizarlo en todos tus calendarios.
                </p>
                <div className="flex items-center gap-2">
                  <button onClick={handleRegenerate} disabled={regenerating}
                    className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg disabled:opacity-50"
                    style={{ background: '#DC2626', color: '#fff' }}>
                    {regenerating ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                    Regenerar
                  </button>
                  <button onClick={() => setConfirmRegen(false)}
                    className="text-xs font-medium px-3 py-1.5 rounded-lg"
                    style={{ color: 'var(--text-secondary)', background: 'var(--bg-elevated)' }}>
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
