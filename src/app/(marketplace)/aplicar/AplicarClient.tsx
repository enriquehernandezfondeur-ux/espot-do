'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { submitApplication } from '@/lib/actions/host-application'
import {
  Building2, MapPin, Phone, AtSign, FileText, Users,
  Camera, Check, ChevronRight, ChevronLeft, Upload, X, Loader2,
  Star, Clock, Shield,
} from 'lucide-react'
import { SPACE_CATEGORIES } from '@/lib/categories'

// Derivado del catálogo central (incluye wellness/popup). Se excluye 'lounge'
// porque 'bar' ya cubre "Bar / Lounge".
const SPACE_TYPES = SPACE_CATEGORIES
  .filter(c => c.value !== 'lounge')
  .map(c => ({ value: c.value, label: c.label }))

const EVENT_TYPES = [
  'Cumpleaños', 'Boda', 'Quinceañera', 'Graduación', 'Baby Shower',
  'Corporativo', 'Cena / Comida', 'Reunión de equipo', 'Sesión de fotos',
  'Taller / Workshop', 'Concierto / Show', 'Otro',
]

const CITIES = [
  'Santo Domingo', 'Santiago', 'La Romana', 'San Pedro de Macorís',
  'Punta Cana / Bávaro', 'Puerto Plata', 'La Vega', 'San Francisco de Macorís', 'Otro',
]

const STEPS = [
  { id: 1, label: 'Tu negocio',  icon: Building2 },
  { id: 2, label: 'Tu espacio', icon: FileText },
  { id: 3, label: 'Fotos',      icon: Camera },
  { id: 4, label: 'Revisión',   icon: Check },
]

interface FormData {
  business_name:     string
  space_type:        string
  city:              string
  sector:            string
  phone:             string
  whatsapp:          string
  instagram:         string
  description:       string
  capacity_estimate: string
  event_types:       string[]
  photos:            string[]    // Supabase Storage URLs
}

const EMPTY: FormData = {
  business_name:     '',
  space_type:        '',
  city:              '',
  sector:            '',
  phone:             '',
  whatsapp:          '',
  instagram:         '',
  description:       '',
  capacity_estimate: '',
  event_types:       [],
  photos:            [],
}

export default function AplicarClient() {
  const router      = useRouter()
  const supabaseRef = useRef(createClient())
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [user,          setUser]          = useState<{ id: string; email: string } | null>(null)
  const [authLoading,   setAuthLoading]   = useState(true)
  const [step,          setStep]          = useState(1)
  const [form,          setForm]          = useState<FormData>(EMPTY)
  const [errors,        setErrors]        = useState<Partial<Record<keyof FormData, string>>>({})
  const [uploading,     setUploading]     = useState(false)
  const [submitting,    setSubmitting]    = useState(false)
  const [submitted,     setSubmitted]     = useState(false)
  const [submitError,   setSubmitError]   = useState('')
  const [photoFiles,    setPhotoFiles]    = useState<Array<{ file: File; preview: string; url?: string; uploading?: boolean }>>([])

  // Auth check
  useEffect(() => {
    supabaseRef.current.auth.getUser().then(({ data: { user: u } }) => {
      if (!u) {
        router.push('/auth?redirect=/aplicar')
        return
      }
      setUser({ id: u.id, email: u.email ?? '' })
      setAuthLoading(false)
    })
  }, [router])

  function set(field: keyof FormData, value: string | string[]) {
    setForm(f => ({ ...f, [field]: value }))
    setErrors(e => ({ ...e, [field]: undefined }))
  }

  function toggleEventType(type: string) {
    set('event_types', form.event_types.includes(type)
      ? form.event_types.filter(t => t !== type)
      : [...form.event_types, type])
  }

  // Photo upload to Supabase Storage
  async function handlePhotoFiles(files: FileList) {
    const allowed = Math.min(files.length, 8 - photoFiles.length)
    if (allowed <= 0) return

    const newFiles = Array.from(files).slice(0, allowed).map(file => ({
      file,
      preview: URL.createObjectURL(file),
      uploading: true,
    }))

    setPhotoFiles(prev => [...prev, ...newFiles])
    setUploading(true)

    const uploadedUrls: string[] = []

    for (let i = 0; i < newFiles.length; i++) {
      const { file } = newFiles[i]
      const ext  = file.name.split('.').pop() ?? 'jpg'
      const path = `applications/${user!.id}/${Date.now()}-${i}.${ext}`

      const { data, error } = await supabaseRef.current.storage
        .from('host-applications')
        .upload(path, file, { cacheControl: '3600', upsert: false })

      if (!error && data) {
        const { data: { publicUrl } } = supabaseRef.current.storage
          .from('host-applications')
          .getPublicUrl(data.path)
        uploadedUrls.push(publicUrl)
        setPhotoFiles(prev => prev.map((pf, idx) =>
          pf.preview === newFiles[i].preview
            ? { ...pf, url: publicUrl, uploading: false }
            : pf
        ))
      } else {
        console.error('[upload]', error)
        setPhotoFiles(prev => prev.filter(pf => pf.preview !== newFiles[i].preview))
      }
    }

    setForm(f => ({ ...f, photos: [...f.photos, ...uploadedUrls] }))
    setUploading(false)
    setErrors(e => ({ ...e, photos: undefined }))
  }

  function removePhoto(index: number) {
    const removed = photoFiles[index]
    setPhotoFiles(prev => prev.filter((_, i) => i !== index))
    if (removed.url) {
      setForm(f => ({ ...f, photos: f.photos.filter(u => u !== removed.url) }))
    }
    URL.revokeObjectURL(removed.preview)
  }

  // Validation per step
  function validateStep(s: number): boolean {
    const errs: typeof errors = {}
    if (s === 1) {
      if (!form.business_name.trim()) errs.business_name = 'El nombre del negocio es requerido'
      if (!form.space_type)           errs.space_type = 'Selecciona el tipo de espacio'
      if (!form.city)                 errs.city = 'Selecciona la ciudad'
      if (!form.phone.trim())         errs.phone = 'El teléfono es requerido'
    }
    if (s === 2) {
      if (form.description.trim().length < 50) errs.description = 'La descripción debe tener al menos 50 caracteres'
      if (form.event_types.length === 0) errs.event_types = 'Selecciona al menos un tipo de evento'
    }
    if (s === 3) {
      if (form.photos.length < 3) errs.photos = 'Sube al menos 3 fotos de tu espacio'
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  function nextStep() {
    if (!validateStep(step)) return
    setStep(s => s + 1)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function prevStep() {
    setStep(s => s - 1)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function handleSubmit() {
    if (!validateStep(3)) { setStep(3); return }
    setSubmitting(true)
    setSubmitError('')

    const result = await submitApplication({
      business_name:     form.business_name.trim(),
      space_type:        form.space_type,
      city:              form.city,
      sector:            form.sector.trim() || undefined,
      phone:             form.phone.trim(),
      whatsapp:          form.whatsapp.trim() || undefined,
      instagram:         form.instagram.trim() || undefined,
      description:       form.description.trim(),
      capacity_estimate: form.capacity_estimate ? Number(form.capacity_estimate) : undefined,
      event_types:       form.event_types,
      photos:            form.photos,
    })

    if (result.success) {
      setSubmitted(true)
    } else {
      setSubmitError(result.error ?? 'Error al enviar la solicitud. Intenta de nuevo.')
    }
    setSubmitting(false)
  }

  if (authLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="animate-spin" size={28} style={{ color: 'var(--brand)' }} />
      </div>
    )
  }

  // Success screen
  if (submitted) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
          style={{ background: 'rgba(53,196,147,0.12)' }}>
          <Check size={36} style={{ color: 'var(--brand)' }} />
        </div>
        <h1 className="text-2xl font-bold mb-3" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
          ¡Solicitud enviada!
        </h1>
        <p className="text-base mb-6" style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}>
          Recibimos tu solicitud para <strong>{form.business_name}</strong>.
          Nuestro equipo la revisará y te contactaremos en <strong>24-48 horas hábiles</strong>.
        </p>
        <div className="rounded-2xl p-5 mb-8 text-left space-y-3"
          style={{ background: 'rgba(53,196,147,0.06)', border: '1.5px solid rgba(53,196,147,0.2)' }}>
          <div className="flex items-center gap-3">
            <Clock size={16} style={{ color: 'var(--brand)' }} />
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Revisamos solicitudes de lunes a sábado</span>
          </div>
          <div className="flex items-center gap-3">
            <Shield size={16} style={{ color: 'var(--brand)' }} />
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Tu información está protegida y es confidencial</span>
          </div>
          <div className="flex items-center gap-3">
            <Star size={16} style={{ color: 'var(--brand)' }} />
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Te avisaremos por correo cuando sea aprobada</span>
          </div>
        </div>
        <a href="/" className="inline-flex items-center gap-2 text-sm font-semibold"
          style={{ color: 'var(--brand)' }}>
          Volver al inicio
        </a>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 md:py-12">

      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="text-2xl md:text-3xl font-bold mb-2"
          style={{ color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>
          Publica tu espacio en Espot
        </h1>
        <p className="text-base" style={{ color: 'var(--text-secondary)' }}>
          Completa la información y empieza a recibir reservas
        </p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center justify-between mb-8 px-2">
        {STEPS.map((s, i) => {
          const done    = step > s.id
          const active  = step === s.id
          const Icon    = s.icon
          return (
            <div key={s.id} className="flex-1 flex flex-col items-center gap-1.5">
              <div className="relative flex items-center w-full justify-center">
                {i > 0 && (
                  <div className="absolute right-1/2 h-0.5 w-full"
                    style={{ background: done || active ? 'var(--brand)' : 'var(--border-subtle)' }} />
                )}
                <div className={`relative z-10 w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                  done ? 'text-white' : active ? 'text-white' : ''
                }`}
                  style={{
                    background: done ? 'var(--brand)' : active ? 'var(--brand)' : 'var(--bg-elevated)',
                    border:     done || active ? 'none' : '2px solid var(--border-subtle)',
                  }}>
                  {done
                    ? <Check size={15} />
                    : <Icon size={15} style={{ color: active ? '#fff' : 'var(--text-muted)' }} />
                  }
                </div>
              </div>
              <span className="text-[11px] font-medium hidden sm:block"
                style={{ color: active ? 'var(--brand)' : 'var(--text-muted)' }}>
                {s.label}
              </span>
            </div>
          )
        })}
      </div>

      {/* Card */}
      <div className="rounded-3xl p-6 md:p-8"
        style={{ background: '#fff', border: '1px solid var(--border-subtle)', boxShadow: '0 2px 16px rgba(0,0,0,0.06)' }}>

        {/* Step 1: Tu negocio */}
        {step === 1 && (
          <div className="space-y-5">
            <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Información del negocio</h2>

            <div>
              <label className="block text-sm font-semibold mb-1.5" style={{ color: 'var(--text-primary)' }}>
                Nombre del negocio *
              </label>
              <input
                value={form.business_name}
                onChange={e => set('business_name', e.target.value)}
                placeholder="Ej: Villa Las Palmas, Salón El Encanto..."
                className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all"
                style={{
                  background: 'var(--bg-elevated)',
                  border:     errors.business_name ? '2px solid var(--danger)' : '1.5px solid var(--border-subtle)',
                  color:      'var(--text-primary)',
                  fontSize:   16,
                }}
              />
              {errors.business_name && <p className="text-xs mt-1" style={{ color: 'var(--danger)' }}>{errors.business_name}</p>}
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1.5" style={{ color: 'var(--text-primary)' }}>
                Tipo de espacio *
              </label>
              <select
                value={form.space_type}
                onChange={e => set('space_type', e.target.value)}
                className="w-full rounded-xl px-4 py-3 text-sm outline-none"
                style={{
                  background: 'var(--bg-elevated)',
                  border:     errors.space_type ? '2px solid var(--danger)' : '1.5px solid var(--border-subtle)',
                  color:      form.space_type ? 'var(--text-primary)' : 'var(--text-muted)',
                  fontSize:   16,
                }}>
                <option value="">Selecciona el tipo...</option>
                {SPACE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
              {errors.space_type && <p className="text-xs mt-1" style={{ color: 'var(--danger)' }}>{errors.space_type}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-1.5" style={{ color: 'var(--text-primary)' }}>
                  Ciudad *
                </label>
                <select
                  value={form.city}
                  onChange={e => set('city', e.target.value)}
                  className="w-full rounded-xl px-4 py-3 text-sm outline-none"
                  style={{
                    background: 'var(--bg-elevated)',
                    border:     errors.city ? '2px solid var(--danger)' : '1.5px solid var(--border-subtle)',
                    color:      form.city ? 'var(--text-primary)' : 'var(--text-muted)',
                    fontSize:   16,
                  }}>
                  <option value="">Selecciona...</option>
                  {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                {errors.city && <p className="text-xs mt-1" style={{ color: 'var(--danger)' }}>{errors.city}</p>}
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1.5" style={{ color: 'var(--text-primary)' }}>
                  Sector (opcional)
                </label>
                <input
                  value={form.sector}
                  onChange={e => set('sector', e.target.value)}
                  placeholder="Ej: Piantini, Naco..."
                  className="w-full rounded-xl px-4 py-3 text-sm outline-none"
                  style={{
                    background: 'var(--bg-elevated)',
                    border:     '1.5px solid var(--border-subtle)',
                    color:      'var(--text-primary)',
                    fontSize:   16,
                  }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-1.5" style={{ color: 'var(--text-primary)' }}>
                  <Phone size={13} className="inline mr-1" />Teléfono *
                </label>
                <input
                  value={form.phone}
                  onChange={e => set('phone', e.target.value)}
                  placeholder="809-000-0000"
                  type="tel"
                  className="w-full rounded-xl px-4 py-3 text-sm outline-none"
                  style={{
                    background: 'var(--bg-elevated)',
                    border:     errors.phone ? '2px solid var(--danger)' : '1.5px solid var(--border-subtle)',
                    color:      'var(--text-primary)',
                    fontSize:   16,
                  }}
                />
                {errors.phone && <p className="text-xs mt-1" style={{ color: 'var(--danger)' }}>{errors.phone}</p>}
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1.5" style={{ color: 'var(--text-primary)' }}>
                  WhatsApp (opcional)
                </label>
                <input
                  value={form.whatsapp}
                  onChange={e => set('whatsapp', e.target.value)}
                  placeholder="Si es diferente al tel."
                  type="tel"
                  className="w-full rounded-xl px-4 py-3 text-sm outline-none"
                  style={{
                    background: 'var(--bg-elevated)',
                    border:     '1.5px solid var(--border-subtle)',
                    color:      'var(--text-primary)',
                    fontSize:   16,
                  }}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1.5" style={{ color: 'var(--text-primary)' }}>
                <AtSign size={13} className="inline mr-1" />Instagram (opcional pero recomendado)
              </label>
              <div className="flex items-center rounded-xl overflow-hidden"
                style={{ border: '1.5px solid var(--border-subtle)', background: 'var(--bg-elevated)' }}>
                <span className="px-3 text-sm" style={{ color: 'var(--text-muted)' }}>@</span>
                <input
                  value={form.instagram}
                  onChange={e => set('instagram', e.target.value.replace('@', ''))}
                  placeholder="tu_negocio"
                  className="flex-1 py-3 pr-4 text-sm outline-none bg-transparent"
                  style={{ color: 'var(--text-primary)', fontSize: 16 }}
                />
              </div>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                Ayuda a verificar que tu negocio es real
              </p>
            </div>
          </div>
        )}

        {/* Step 2: Tu espacio */}
        {step === 2 && (
          <div className="space-y-5">
            <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Describe tu espacio</h2>

            <div>
              <label className="block text-sm font-semibold mb-1.5" style={{ color: 'var(--text-primary)' }}>
                Descripción del espacio *
              </label>
              <textarea
                value={form.description}
                onChange={e => set('description', e.target.value)}
                placeholder="Describe tu espacio: características, ambiente, qué lo hace especial, áreas disponibles, servicios incluidos..."
                rows={5}
                className="w-full rounded-xl px-4 py-3 text-sm outline-none resize-none"
                style={{
                  background: 'var(--bg-elevated)',
                  border:     errors.description ? '2px solid var(--danger)' : '1.5px solid var(--border-subtle)',
                  color:      'var(--text-primary)',
                  fontSize:   16,
                  lineHeight: 1.6,
                }}
              />
              <div className="flex items-center justify-between mt-1">
                {errors.description
                  ? <p className="text-xs" style={{ color: 'var(--danger)' }}>{errors.description}</p>
                  : <span />
                }
                <p className="text-xs" style={{ color: form.description.length < 50 ? 'var(--danger)' : 'var(--text-muted)' }}>
                  {form.description.length} / 50 mín.
                </p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1.5" style={{ color: 'var(--text-primary)' }}>
                <Users size={13} className="inline mr-1" />Capacidad aproximada (opcional)
              </label>
              <input
                value={form.capacity_estimate}
                onChange={e => set('capacity_estimate', e.target.value.replace(/\D/g, ''))}
                placeholder="Ej: 80 personas"
                type="number"
                min={1}
                className="w-full rounded-xl px-4 py-3 text-sm outline-none"
                style={{
                  background: 'var(--bg-elevated)',
                  border:     '1.5px solid var(--border-subtle)',
                  color:      'var(--text-primary)',
                  fontSize:   16,
                }}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                Tipos de eventos que recibes *
              </label>
              {errors.event_types && <p className="text-xs mb-2" style={{ color: 'var(--danger)' }}>{errors.event_types}</p>}
              <div className="flex flex-wrap gap-2">
                {EVENT_TYPES.map(type => {
                  const selected = form.event_types.includes(type)
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => toggleEventType(type)}
                      className="px-3.5 py-2 rounded-xl text-sm font-medium transition-all"
                      style={{
                        background: selected ? 'var(--brand)' : 'var(--bg-elevated)',
                        color:      selected ? '#fff' : 'var(--text-secondary)',
                        border:     selected ? 'none' : '1.5px solid var(--border-subtle)',
                      }}>
                      {type}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Fotos */}
        {step === 3 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Fotos de tu espacio</h2>
              <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                Sube entre 3 y 8 fotos reales del espacio. Fotos de buena calidad aumentan significativamente las posibilidades de aprobación.
              </p>
            </div>

            {errors.photos && (
              <p className="text-sm font-medium" style={{ color: 'var(--danger)' }}>{errors.photos}</p>
            )}

            {/* Upload zone */}
            {photoFiles.length < 8 && (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="rounded-2xl border-2 border-dashed p-8 text-center cursor-pointer transition-all hover:border-[var(--brand)]"
                style={{ borderColor: 'var(--border-subtle)' }}
                onDragOver={e => { e.preventDefault() }}
                onDrop={e => { e.preventDefault(); handlePhotoFiles(e.dataTransfer.files) }}>
                <Upload size={28} className="mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Arrastra fotos aquí o haz clic para subir
                </p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                  JPG, PNG · Máx. 10MB por foto · {photoFiles.length}/8 subidas
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  className="hidden"
                  onChange={e => e.target.files && handlePhotoFiles(e.target.files)}
                />
              </div>
            )}

            {/* Photo grid */}
            {photoFiles.length > 0 && (
              <div className="grid grid-cols-3 gap-3">
                {photoFiles.map((pf, i) => (
                  <div key={i} className="relative aspect-square rounded-xl overflow-hidden"
                    style={{ background: 'var(--bg-elevated)' }}>
                    <img src={pf.preview} alt="" className="w-full h-full object-cover" />
                    {pf.uploading && (
                      <div className="absolute inset-0 flex items-center justify-center"
                        style={{ background: 'rgba(0,0,0,0.45)' }}>
                        <Loader2 size={20} className="animate-spin text-white" />
                      </div>
                    )}
                    {!pf.uploading && (
                      <>
                        {i === 0 && (
                          <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-bold text-white"
                            style={{ background: 'var(--brand)' }}>
                            Principal
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => removePhoto(i)}
                          className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center"
                          style={{ background: 'rgba(0,0,0,0.55)', color: '#fff' }}>
                          <X size={12} />
                        </button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="rounded-2xl p-4 space-y-2"
              style={{ background: 'rgba(53,196,147,0.06)', border: '1px solid rgba(53,196,147,0.2)' }}>
              <p className="text-xs font-semibold" style={{ color: 'var(--brand)' }}>💡 Consejos para fotos que se aprueban rápido</p>
              <ul className="text-xs space-y-1" style={{ color: 'var(--text-secondary)' }}>
                <li>• Fotos con buena luz natural o artificial</li>
                <li>• Muestra el espacio desde distintos ángulos</li>
                <li>• Incluye fotos de áreas especiales (terraza, piscina, bar)</li>
                <li>• Evita fotos borrosas, oscuras o muy pequeñas</li>
              </ul>
            </div>
          </div>
        )}

        {/* Step 4: Review */}
        {step === 4 && (
          <div className="space-y-5">
            <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Revisa tu solicitud</h2>

            <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border-subtle)' }}>
              {[
                { label: 'Negocio',    value: form.business_name },
                { label: 'Tipo',       value: SPACE_TYPES.find(t => t.value === form.space_type)?.label ?? '' },
                { label: 'Ciudad',     value: [form.city, form.sector].filter(Boolean).join(', ') },
                { label: 'Teléfono',   value: form.phone },
                { label: 'WhatsApp',   value: form.whatsapp || '—' },
                { label: 'Instagram',  value: form.instagram ? `@${form.instagram}` : '—' },
                { label: 'Capacidad',  value: form.capacity_estimate ? `${form.capacity_estimate} personas` : '—' },
                { label: 'Eventos',    value: form.event_types.join(', ') || '—' },
                { label: 'Fotos',      value: `${form.photos.length} foto(s) subida(s)` },
              ].map(({ label, value }, i, arr) => (
                <div key={label} className="flex gap-3 px-4 py-3"
                  style={{ borderBottom: i < arr.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}>
                  <span className="text-sm w-24 shrink-0 font-medium" style={{ color: 'var(--text-muted)' }}>{label}</span>
                  <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{value}</span>
                </div>
              ))}
            </div>

            <div className="rounded-2xl p-4" style={{ background: 'var(--bg-elevated)' }}>
              <p className="text-xs font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Descripción</p>
              <p className="text-sm" style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>{form.description}</p>
            </div>

            {/* Photo preview strip */}
            {photoFiles.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {photoFiles.map((pf, i) => (
                  <img key={i} src={pf.preview} alt=""
                    className="w-16 h-16 rounded-xl object-cover shrink-0" />
                ))}
              </div>
            )}

            <div className="rounded-2xl p-4" style={{ background: 'rgba(53,196,147,0.06)', border: '1.5px solid rgba(53,196,147,0.2)' }}>
              <p className="text-sm font-semibold mb-1" style={{ color: 'var(--brand)' }}>¿Qué pasa después?</p>
              <ol className="text-sm space-y-1.5" style={{ color: 'var(--text-secondary)' }}>
                <li>1. Nuestro sistema revisa tus fotos y descripción con IA</li>
                <li>2. Un administrador de Espot revisará tu solicitud</li>
                <li>3. Recibirás una respuesta en 24-48h por email</li>
                <li>4. Si es aprobada, accedes al panel de propietario</li>
              </ol>
            </div>

            {submitError && (
              <p className="text-sm font-medium" style={{ color: 'var(--danger)' }}>{submitError}</p>
            )}
          </div>
        )}

        {/* Navigation buttons */}
        <div className="flex items-center justify-between mt-8 pt-5"
          style={{ borderTop: '1px solid var(--border-subtle)' }}>
          {step > 1
            ? <button type="button" onClick={prevStep}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all"
                style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>
                <ChevronLeft size={16} /> Atrás
              </button>
            : <span />
          }

          {step < 4
            ? <button type="button" onClick={nextStep}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold text-white transition-all active:scale-95"
                style={{ background: 'var(--brand)' }}>
                Continuar <ChevronRight size={16} />
              </button>
            : <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting || uploading}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold text-white transition-all active:scale-95 disabled:opacity-60"
                style={{ background: 'var(--brand)' }}>
                {submitting
                  ? <><Loader2 size={16} className="animate-spin" /> Enviando...</>
                  : <>Enviar solicitud <ChevronRight size={16} /></>
                }
              </button>
          }
        </div>
      </div>

      {/* Trust signals */}
      {step === 1 && (
        <div className="mt-8 grid grid-cols-3 gap-4 text-center">
          {[
            { icon: Shield,  text: 'Datos protegidos' },
            { icon: Clock,   text: 'Respuesta en 24-48h' },
            { icon: Star,    text: 'Sin costo inicial' },
          ].map(({ icon: Icon, text }) => (
            <div key={text} className="flex flex-col items-center gap-2">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: 'rgba(53,196,147,0.1)' }}>
                <Icon size={16} style={{ color: 'var(--brand)' }} />
              </div>
              <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>{text}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
