'use client'

import { useState, useEffect, useRef } from 'react'
import { Save, Camera, Loader2, CheckCircle, Calendar, Copy, RefreshCw, ExternalLink } from 'lucide-react'
import { getClientProfile, updateClientProfile } from '@/lib/actions/client'
import { getOrCreateIcalToken, regenerateIcalToken } from '@/lib/actions/host'
import { createClient } from '@/lib/supabase/client'

const BASE_URL = 'https://espothub.com'

export default function HostAjustesPage() {
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

  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    getClientProfile().then(p => {
      if (p) {
        setFullName(p.full_name ?? '')
        setPhone(p.phone ?? '')
        setWhatsapp(p.whatsapp ?? '')
        setEmail(p.email ?? '')
        setAvatarUrl(p.avatar_url ?? '')
      }
      setLoading(false)
    })
  }, [])

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

      {/* ── Sincronizar calendario ── */}
      <div className="rounded-2xl p-6"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(53,196,147,0.1)' }}>
            <Calendar size={18} style={{ color: 'var(--brand)' }} />
          </div>
          <div>
            <h2 className="font-bold" style={{ color: 'var(--text-primary)' }}>Sincronizar calendario</h2>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Agrega tus reservas a Google Calendar, Apple Calendar u Outlook
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
