'use client'

import { useState, useEffect } from 'react'
import { Save, Camera, User, Shield, Loader2 } from 'lucide-react'
import { getClientProfile, updateClientProfile } from '@/lib/actions/client'

export default function PerfilPage() {
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [saved, setSaved]     = useState(false)
  const [error, setError]     = useState('')

  const [fullName, setFullName] = useState('')
  const [phone, setPhone]       = useState('')
  const [whatsapp, setWhatsapp] = useState('')

  useEffect(() => {
    getClientProfile().then(p => {
      setProfile(p)
      setFullName(p?.full_name ?? '')
      setPhone(p?.phone ?? '')
      setWhatsapp(p?.whatsapp ?? '')
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
    <div className="flex items-center justify-center h-screen">
      <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--brand)' }} />
    </div>
  )

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Mi perfil</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Administra tu información personal</p>
      </div>

      {/* Avatar */}
      <div className="rounded-3xl p-6 mb-5"
        style={{ background: '#fff', border: '1px solid var(--border-subtle)', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
        <div className="flex items-center gap-5">
          <div className="relative">
            <div className="w-20 h-20 rounded-3xl flex items-center justify-center text-3xl font-bold text-white"
              style={{ background: 'linear-gradient(135deg, var(--brand), var(--brand-dark))' }}>
              {fullName?.charAt(0)?.toUpperCase() ?? <User size={28} />}
            </div>
            <button className="absolute -bottom-1.5 -right-1.5 w-7 h-7 rounded-xl flex items-center justify-center text-white shadow-md"
              style={{ background: 'var(--brand)' }}>
              <Camera size={13} />
            </button>
          </div>
          <div>
            <div className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>{fullName || 'Tu nombre'}</div>
            <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>{profile?.email}</div>
            {profile?.id_verified && (
              <div className="flex items-center gap-1.5 text-xs font-medium mt-1.5"
                style={{ color: '#16A34A' }}>
                <Shield size={12} /> Identidad verificada
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="rounded-3xl p-6 mb-5 space-y-5"
        style={{ background: '#fff', border: '1px solid var(--border-subtle)', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
        <h2 className="font-bold" style={{ color: 'var(--text-primary)' }}>Información personal</h2>
        {[
          { label: 'Nombre completo', value: fullName,  setter: setFullName,  placeholder: 'Tu nombre completo', type: 'text' },
          { label: 'Teléfono',        value: phone,     setter: setPhone,     placeholder: '+1 (809) 000-0000',  type: 'tel' },
          { label: 'WhatsApp',        value: whatsapp,  setter: setWhatsapp,  placeholder: '+1 (829) 000-0000',  type: 'tel' },
        ].map(field => (
          <div key={field.label}>
            <label className="block text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>
              {field.label}
            </label>
            <input
              type={field.type}
              value={field.value}
              onChange={e => field.setter(e.target.value)}
              placeholder={field.placeholder}
              className="input-base w-full rounded-xl px-4 py-3.5 text-sm"
            />
          </div>
        ))}

        <div>
          <label className="block text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>
            Correo electrónico
          </label>
          <input value={profile?.email ?? ''} disabled
            className="w-full rounded-xl px-4 py-3.5 text-sm cursor-not-allowed"
            style={{ background: 'var(--bg-elevated)', border: '1.5px solid var(--border-subtle)', color: 'var(--text-muted)' }} />
          <p className="text-xs mt-1.5" style={{ color: 'var(--text-muted)' }}>
            El email no se puede cambiar por seguridad
          </p>
        </div>
      </div>

      {error && (
        <div className="text-sm px-4 py-3 rounded-xl mb-4"
          style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626' }}>
          {error}
        </div>
      )}

      <button onClick={handleSave} disabled={saving}
        className="btn-brand w-full py-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50">
        {saving ? <><Loader2 size={18} className="animate-spin" /> Guardando...</> :
         saved  ? <><Shield size={18} /> ¡Guardado!</> :
                  <><Save size={18} /> Guardar cambios</>}
      </button>
    </div>
  )
}
