'use client'

import { useState, useEffect } from 'react'
import { Save, Camera, Loader2, CheckCircle } from 'lucide-react'
import { getClientProfile, updateClientProfile } from '@/lib/actions/client'

export default function HostAjustesPage() {
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [saved, setSaved]       = useState(false)
  const [error, setError]       = useState('')
  const [fullName, setFullName] = useState('')
  const [phone, setPhone]       = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [email, setEmail]       = useState('')

  useEffect(() => {
    getClientProfile().then(p => {
      if (p) {
        setFullName(p.full_name ?? '')
        setPhone(p.phone ?? '')
        setWhatsapp(p.whatsapp ?? '')
        setEmail(p.email ?? '')
      }
      setLoading(false)
    })
  }, [])

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
            <div className="w-20 h-20 rounded-3xl flex items-center justify-center text-3xl font-bold text-white"
              style={{ background: 'linear-gradient(135deg, var(--brand), var(--brand-dark))' }}>
              {fullName?.charAt(0)?.toUpperCase() ?? 'H'}
            </div>
            <button className="absolute -bottom-1.5 -right-1.5 w-7 h-7 rounded-xl flex items-center justify-center text-white"
              style={{ background: 'var(--brand)' }}>
              <Camera size={13} />
            </button>
          </div>
          <div>
            <div className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>{fullName || 'Tu nombre'}</div>
            <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>{email}</div>
          </div>
        </div>
      </div>

      {/* Formulario */}
      <div className="rounded-2xl p-6 mb-5 space-y-5"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
        <h2 className="font-bold" style={{ color: 'var(--text-primary)' }}>Información personal</h2>
        {[
          { label: 'Nombre completo', value: fullName,  setter: setFullName,  placeholder: 'Tu nombre' },
          { label: 'Teléfono',        value: phone,     setter: setPhone,     placeholder: '+1 (809) 000-0000' },
          { label: 'WhatsApp',        value: whatsapp,  setter: setWhatsapp,  placeholder: '+1 (829) 000-0000' },
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
        className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-bold text-sm transition-all disabled:opacity-50"
        style={{ background: saved ? 'rgba(22,163,74,0.1)' : 'var(--brand)', color: saved ? '#16A34A' : '#fff' }}>
        {saving  ? <><Loader2 size={18} className="animate-spin" /> Guardando...</>
        : saved   ? <><CheckCircle size={18} /> ¡Guardado!</>
        :           <><Save size={18} /> Guardar cambios</>}
      </button>
    </div>
  )
}
