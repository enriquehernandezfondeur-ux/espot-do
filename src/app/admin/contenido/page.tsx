'use client'

import { useState, useEffect } from 'react'
import { getSiteContentFull, updateManyContent } from '@/lib/actions/content'
import { Save, CheckCircle, Loader2, Eye, ChevronRight } from 'lucide-react'
import Link from 'next/link'

type Item = { key: string; value: string | null; type: string; label: string; hint?: string | null }

// Secciones ordenadas de forma visual
const SECTIONS = [
  {
    id: 'hero',
    title: '🎨 Página principal',
    desc: 'El primer bloque que ven los visitantes',
    fields: [
      { key: 'hero_title_1',   label: 'Título (línea 1)',          type: 'text',  hint: 'Ej: "Encuentra el espacio perfecto para"' },
      { key: 'hero_title_2',   label: 'Título (línea 2 en verde)', type: 'text',  hint: 'Ej: "tu próximo evento"' },
      { key: 'hero_subtitle',  label: 'Descripción debajo',        type: 'textarea', hint: '' },
      { key: 'hero_badge',     label: 'Badge pequeño arriba',      type: 'text',  hint: 'Ej: "La plataforma #1 en RD"' },
      { key: 'hero_search_button', label: 'Texto del botón buscar', type: 'text', hint: 'Ej: "Buscar"' },
      { key: 'hero_sectors',   label: 'Sectores populares',        type: 'text',  hint: 'Separados por ·' },
    ],
  },
  {
    id: 'cta',
    title: '📢 Sección para propietarios',
    desc: 'El bloque que invita a publicar espacios',
    fields: [
      { key: 'cta_title',    label: 'Título',              type: 'text',     hint: '' },
      { key: 'cta_subtitle', label: 'Descripción',         type: 'textarea', hint: '' },
      { key: 'cta_button',   label: 'Texto del botón',     type: 'text',     hint: 'Ej: "Publicar mi espacio gratis"' },
    ],
  },
  {
    id: 'how',
    title: '📋 Cómo funciona',
    desc: 'Los 3 pasos explicados',
    fields: [
      { key: 'how_title',       label: 'Título de la sección', type: 'text', hint: '' },
      { key: 'how_subtitle',    label: 'Subtítulo',            type: 'text', hint: '' },
      { key: 'how_step1_title', label: 'Paso 1 · Título',      type: 'text', hint: '' },
      { key: 'how_step1_desc',  label: 'Paso 1 · Descripción', type: 'textarea', hint: '' },
      { key: 'how_step2_title', label: 'Paso 2 · Título',      type: 'text', hint: '' },
      { key: 'how_step2_desc',  label: 'Paso 2 · Descripción', type: 'textarea', hint: '' },
      { key: 'how_step3_title', label: 'Paso 3 · Título',      type: 'text', hint: '' },
      { key: 'how_step3_desc',  label: 'Paso 3 · Descripción', type: 'textarea', hint: '' },
    ],
  },
  {
    id: 'footer',
    title: '📌 Footer',
    desc: 'Pie de página',
    fields: [
      { key: 'footer_email',     label: 'Email de contacto', type: 'text', hint: 'Ej: contacto@espothub.com' },
      { key: 'footer_copyright', label: 'Texto copyright',   type: 'text', hint: 'Ej: © 2026 espothub.com' },
    ],
  },
  {
    id: 'seo',
    title: '🔍 SEO · Google',
    desc: 'Cómo apareces en Google',
    fields: [
      { key: 'seo_title',       label: 'Título en Google',       type: 'text',     hint: 'Máximo 60 caracteres' },
      { key: 'seo_description', label: 'Descripción en Google',  type: 'textarea', hint: 'Máximo 160 caracteres' },
    ],
  },
  {
    id: 'contacto',
    title: '📱 Redes sociales',
    desc: 'Links de contacto',
    fields: [
      { key: 'contact_whatsapp',  label: 'WhatsApp',  type: 'url', hint: 'Ej: https://wa.me/18091234567' },
      { key: 'contact_instagram', label: 'Instagram', type: 'url', hint: 'Ej: https://instagram.com/espothub' },
      { key: 'contact_facebook',  label: 'Facebook',  type: 'url', hint: 'Ej: https://facebook.com/espothub' },
    ],
  },
]

export default function ContenidoPage() {
  const [values, setValues]   = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState<string | null>(null)
  const [saved, setSaved]     = useState<string | null>(null)
  const [active, setActive]   = useState('hero')

  useEffect(() => {
    getSiteContentFull().then(data => {
      const v: Record<string, string> = {}
      data.forEach((item: Item) => { v[item.key] = item.value ?? '' })
      setValues(v)
      setLoading(false)
    })
  }, [])

  async function guardar(sectionId: string) {
    setSaving(sectionId)
    const section = SECTIONS.find(s => s.id === sectionId)
    if (!section) return
    const updates: Record<string, string> = {}
    section.fields.forEach(f => { updates[f.key] = values[f.key] ?? '' })
    await updateManyContent(updates)
    setSaved(sectionId)
    setTimeout(() => setSaved(null), 2500)
    setSaving(null)
  }

  const activeSection = SECTIONS.find(s => s.id === active)

  if (loading) return (
    <div className="flex items-center justify-center h-screen" style={{ background: '#F4F6F8' }}>
      <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#35C493' }} />
    </div>
  )

  return (
    <div className="flex min-h-screen" style={{ background: '#F4F6F8' }}>

      {/* ── Menú izquierdo ── */}
      <div className="w-64 shrink-0 min-h-screen flex flex-col"
        style={{ background: '#fff', borderRight: '1px solid #E8ECF0' }}>
        <div className="px-6 py-6">
          <h1 className="text-lg font-bold" style={{ color: '#0F1623' }}>✏️ Editar site</h1>
          <p className="text-sm mt-1" style={{ color: '#9CA3AF' }}>Cambia textos sin código</p>
        </div>

        <nav className="flex-1 px-3 space-y-1">
          {SECTIONS.map(section => (
            <button key={section.id}
              onClick={() => setActive(section.id)}
              className="w-full text-left px-4 py-3 rounded-2xl flex items-center justify-between transition-all"
              style={active === section.id ? {
                background: 'rgba(53,196,147,0.08)',
                border: '1px solid rgba(53,196,147,0.2)',
              } : { border: '1px solid transparent' }}>
              <div>
                <div className="text-sm font-semibold" style={{ color: active === section.id ? '#35C493' : '#0F1623' }}>
                  {section.title}
                </div>
                <div className="text-xs mt-0.5" style={{ color: '#9CA3AF' }}>{section.desc}</div>
              </div>
              <ChevronRight size={14} style={{ color: '#D1D5DB', flexShrink: 0 }} />
            </button>
          ))}
        </nav>

        <div className="p-4 mt-4" style={{ borderTop: '1px solid #E8ECF0' }}>
          <Link href="/" target="_blank"
            className="flex items-center justify-center gap-2 text-sm font-medium py-3 rounded-xl w-full"
            style={{ background: '#F4F6F8', color: '#6B7280', border: '1px solid #E8ECF0' }}>
            <Eye size={15} /> Ver espothub.com
          </Link>
        </div>
      </div>

      {/* ── Editor ── */}
      <div className="flex-1 max-w-3xl mx-auto px-8 py-8">
        {activeSection && (
          <>
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-bold" style={{ color: '#0F1623' }}>{activeSection.title}</h2>
                <p className="text-sm mt-1" style={{ color: '#9CA3AF' }}>{activeSection.desc}</p>
              </div>
              <button onClick={() => guardar(active)}
                disabled={saving === active}
                className="flex items-center gap-2 text-sm font-bold px-6 py-3 rounded-2xl transition-all disabled:opacity-50"
                style={{
                  background: saved === active ? 'rgba(22,163,74,0.1)' : '#35C493',
                  color: saved === active ? '#16A34A' : '#fff',
                  boxShadow: saved !== active && saving !== active ? '0 4px 16px rgba(53,196,147,0.3)' : 'none',
                }}>
                {saving === active
                  ? <><Loader2 size={16} className="animate-spin" /> Guardando...</>
                  : saved === active
                    ? <><CheckCircle size={16} /> ¡Publicado!</>
                    : <><Save size={16} /> Publicar cambios</>
                }
              </button>
            </div>

            {/* Campos */}
            <div className="space-y-5">
              {activeSection.fields.map(field => (
                <div key={field.key} className="rounded-2xl overflow-hidden"
                  style={{ background: '#fff', border: '1px solid #E8ECF0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                  <div className="px-6 py-4" style={{ borderBottom: '1px solid #F0F2F5' }}>
                    <div className="font-semibold text-sm" style={{ color: '#0F1623' }}>{field.label}</div>
                    {field.hint && <div className="text-xs mt-0.5" style={{ color: '#9CA3AF' }}>{field.hint}</div>}
                  </div>
                  <div className="p-6">
                    {field.type === 'textarea' ? (
                      <textarea
                        value={values[field.key] ?? ''}
                        onChange={e => setValues(p => ({ ...p, [field.key]: e.target.value }))}
                        rows={3}
                        className="w-full px-4 py-3.5 rounded-xl text-sm resize-none focus:outline-none transition-all"
                        style={{ background: '#F8FAFB', border: '1.5px solid #E8ECF0', color: '#0F1623', lineHeight: 1.7 }}
                        onFocus={e => (e.target.style.borderColor = '#35C493')}
                        onBlur={e => (e.target.style.borderColor = '#E8ECF0')}
                        placeholder={`Escribe aquí el ${field.label.toLowerCase()}...`}
                      />
                    ) : (
                      <input
                        type="text"
                        value={values[field.key] ?? ''}
                        onChange={e => setValues(p => ({ ...p, [field.key]: e.target.value }))}
                        className="w-full px-4 py-4 rounded-xl text-sm focus:outline-none transition-all"
                        style={{ background: '#F8FAFB', border: '1.5px solid #E8ECF0', color: '#0F1623', fontSize: 15 }}
                        onFocus={e => (e.target.style.borderColor = '#35C493')}
                        onBlur={e => (e.target.style.borderColor = '#E8ECF0')}
                        placeholder={`Escribe aquí...`}
                      />
                    )}

                    {/* Contador para SEO */}
                    {(field.key === 'seo_title' || field.key === 'seo_description') && (
                      <div className="mt-2 text-xs text-right"
                        style={{ color: (values[field.key] ?? '').length > (field.key === 'seo_title' ? 60 : 160) ? '#DC2626' : '#9CA3AF' }}>
                        {(values[field.key] ?? '').length} / {field.key === 'seo_title' ? 60 : 160} caracteres
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Botón guardar abajo también */}
            <div className="mt-8 flex justify-end">
              <button onClick={() => guardar(active)} disabled={saving === active}
                className="flex items-center gap-2 text-sm font-bold px-8 py-4 rounded-2xl transition-all disabled:opacity-50"
                style={{
                  background: saved === active ? 'rgba(22,163,74,0.1)' : '#35C493',
                  color: saved === active ? '#16A34A' : '#fff',
                  boxShadow: saved !== active ? '0 4px 16px rgba(53,196,147,0.3)' : 'none',
                }}>
                {saving === active
                  ? <><Loader2 size={16} className="animate-spin" /> Guardando...</>
                  : saved === active
                    ? <><CheckCircle size={16} /> ¡Publicado exitosamente!</>
                    : <><Save size={16} /> Publicar cambios</>}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
