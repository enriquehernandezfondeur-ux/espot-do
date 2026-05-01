'use client'

import { useState, useEffect } from 'react'
import { getSiteContentFull, updateContent } from '@/lib/actions/content'
import {
  Save, CheckCircle, Loader2, Globe, Layout, Type,
  Image, Palette, Phone, Search, Eye
} from 'lucide-react'
import Link from 'next/link'

type ContentItem = {
  id: string; key: string; value: string | null; type: string
  section: string; label: string; hint?: string | null
}

const SECTION_CONFIG: Record<string, { label: string; icon: any; color: string; emoji: string }> = {
  navbar:    { label: 'Navbar',            icon: Layout,  color: '#7C3AED', emoji: '🔝' },
  hero:      { label: 'Hero / Portada',    icon: Image,   color: '#0891B2', emoji: '🎨' },
  spaces:    { label: 'Sección Espacios',  icon: Globe,   color: '#16A34A', emoji: '🏛️' },
  how:       { label: 'Cómo funciona',     icon: Type,    color: '#D97706', emoji: '📋' },
  cta:       { label: 'CTA Propietarios',  icon: Globe,   color: '#35C493', emoji: '📢' },
  footer:    { label: 'Footer',            icon: Layout,  color: '#6B7280', emoji: '📌' },
  seo:       { label: 'SEO / Google',      icon: Search,  color: '#DC2626', emoji: '🔍' },
  colores:   { label: 'Colores',           icon: Palette, color: '#35C493', emoji: '🎨' },
  contacto:  { label: 'Redes y contacto',  icon: Phone,   color: '#0891B2', emoji: '📱' },
}

export default function ContenidoPage() {
  const [content, setContent]   = useState<ContentItem[]>([])
  const [loading, setLoading]   = useState(true)
  const [activeSection, setActiveSection] = useState('hero')
  const [values, setValues]     = useState<Record<string, string>>({})
  const [saving, setSaving]     = useState<string | null>(null)
  const [saved, setSaved]       = useState<string | null>(null)
  const [search, setSearch]     = useState('')

  useEffect(() => {
    getSiteContentFull().then(data => {
      setContent(data)
      const vals: Record<string, string> = {}
      data.forEach(item => { vals[item.key] = item.value ?? '' })
      setValues(vals)
      setLoading(false)
    })
  }, [])

  async function handleSave(key: string) {
    setSaving(key)
    await updateContent(key, values[key] ?? '')
    setSaved(key)
    setTimeout(() => setSaved(null), 2000)
    setSaving(null)
  }

  async function handleSaveAll() {
    setSaving('__all__')
    const sectionItems = content.filter(i => i.section === activeSection)
    await Promise.all(sectionItems.map(i => updateContent(i.key, values[i.key] ?? '')))
    setSaved('__all__')
    setTimeout(() => setSaved(null), 2500)
    setSaving(null)
  }

  const sections = [...new Set(content.map(i => i.section))]
  const activeItems = content.filter(i =>
    i.section === activeSection &&
    (search === '' || i.label.toLowerCase().includes(search.toLowerCase()) || (i.value ?? '').toLowerCase().includes(search.toLowerCase()))
  )

  const sectionCfg = SECTION_CONFIG[activeSection] ?? { label: activeSection, icon: Globe, color: '#35C493', emoji: '📄' }

  if (loading) return (
    <div className="flex items-center justify-center h-screen" style={{ background: '#F4F6F8' }}>
      <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#35C493' }} />
    </div>
  )

  return (
    <div className="flex h-screen" style={{ background: '#F4F6F8' }}>

      {/* ── Sidebar de secciones ── */}
      <div className="w-60 shrink-0 flex flex-col" style={{ background: '#fff', borderRight: '1px solid #E8ECF0' }}>
        <div className="px-5 py-5" style={{ borderBottom: '1px solid #E8ECF0' }}>
          <h1 className="font-bold text-base" style={{ color: '#0F1623' }}>Editor de Contenido</h1>
          <p className="text-xs mt-0.5" style={{ color: '#6B7280' }}>Edita el site sin código</p>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {sections.map(section => {
            const cfg = SECTION_CONFIG[section] ?? { label: section, emoji: '📄', color: '#35C493' }
            const isActive = activeSection === section
            return (
              <button key={section} onClick={() => { setActiveSection(section); setSearch('') }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-sm font-medium transition-all"
                style={isActive ? {
                  background: `${cfg.color}12`,
                  color: cfg.color,
                  border: `1px solid ${cfg.color}25`,
                } : { color: '#6B7280' }}>
                <span className="text-base">{cfg.emoji}</span>
                {cfg.label}
              </button>
            )
          })}
        </nav>

        <div className="p-3" style={{ borderTop: '1px solid #E8ECF0' }}>
          <Link href="/" target="_blank"
            className="flex items-center gap-2 text-xs font-medium px-3 py-2 rounded-xl transition-all"
            style={{ background: '#F4F6F8', color: '#6B7280' }}>
            <Eye size={13} /> Ver el site
          </Link>
        </div>
      </div>

      {/* ── Editor principal ── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Header de sección */}
        <div className="px-8 py-5 flex items-center justify-between shrink-0"
          style={{ background: '#fff', borderBottom: '1px solid #E8ECF0' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl"
              style={{ background: `${sectionCfg.color}12` }}>
              {sectionCfg.emoji}
            </div>
            <div>
              <h2 className="font-bold" style={{ color: '#0F1623' }}>{sectionCfg.label}</h2>
              <p className="text-xs" style={{ color: '#9CA3AF' }}>{activeItems.length} campos editables</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Búsqueda */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl"
              style={{ background: '#F4F6F8', border: '1px solid #E8ECF0' }}>
              <Search size={13} style={{ color: '#9CA3AF' }} />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Buscar campo..."
                className="bg-transparent text-sm focus:outline-none w-36"
                style={{ color: '#0F1623' }} />
            </div>
            {/* Guardar todo */}
            <button onClick={handleSaveAll} disabled={saving === '__all__'}
              className="flex items-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-xl transition-all disabled:opacity-50"
              style={{
                background: saved === '__all__' ? 'rgba(22,163,74,0.1)' : '#35C493',
                color: saved === '__all__' ? '#16A34A' : '#fff',
                boxShadow: saving !== '__all__' && saved !== '__all__' ? '0 2px 8px rgba(53,196,147,0.3)' : 'none',
              }}>
              {saving === '__all__'
                ? <><Loader2 size={15} className="animate-spin" /> Guardando...</>
                : saved === '__all__'
                  ? <><CheckCircle size={15} /> ¡Guardado!</>
                  : <><Save size={15} /> Guardar sección</>
              }
            </button>
          </div>
        </div>

        {/* Campos editables */}
        <div className="flex-1 overflow-y-auto px-8 py-6">
          <div className="max-w-3xl space-y-4">
            {activeItems.length === 0 && (
              <div className="text-center py-12" style={{ color: '#9CA3AF' }}>
                No se encontraron campos
              </div>
            )}

            {activeItems.map(item => {
              const isSaving = saving === item.key
              const isSaved  = saved === item.key
              return (
                <div key={item.key} className="rounded-2xl overflow-hidden"
                  style={{ background: '#fff', border: '1px solid #E8ECF0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                  <div className="px-5 py-3 flex items-center justify-between"
                    style={{ borderBottom: '1px solid #F0F2F5', background: '#FAFBFC' }}>
                    <div>
                      <div className="text-sm font-semibold" style={{ color: '#0F1623' }}>{item.label}</div>
                      {item.hint && <div className="text-xs mt-0.5" style={{ color: '#9CA3AF' }}>{item.hint}</div>}
                      <div className="text-xs font-mono mt-0.5" style={{ color: '#D1D5DB' }}>{item.key}</div>
                    </div>
                    <button onClick={() => handleSave(item.key)} disabled={isSaving}
                      className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all disabled:opacity-50"
                      style={isSaved ? {
                        background: 'rgba(22,163,74,0.08)', color: '#16A34A',
                      } : {
                        background: 'rgba(53,196,147,0.1)', color: '#35C493',
                      }}>
                      {isSaving ? <Loader2 size={12} className="animate-spin" /> :
                       isSaved  ? <><CheckCircle size={12} /> Guardado</> :
                                  <><Save size={12} /> Guardar</>}
                    </button>
                  </div>

                  <div className="p-5">
                    {item.type === 'color' ? (
                      <div className="flex items-center gap-4">
                        <input type="color" value={values[item.key] || '#35C493'}
                          onChange={e => setValues(p => ({ ...p, [item.key]: e.target.value }))}
                          className="w-16 h-12 rounded-xl cursor-pointer border-0 p-0"
                          style={{ border: '1px solid #E8ECF0' }} />
                        <input value={values[item.key] || ''}
                          onChange={e => setValues(p => ({ ...p, [item.key]: e.target.value }))}
                          placeholder="#35C493"
                          className="flex-1 px-4 py-3 rounded-xl text-sm font-mono focus:outline-none"
                          style={{ background: '#F8FAFB', border: '1.5px solid #E8ECF0', color: '#0F1623' }} />
                        <div className="w-10 h-10 rounded-xl border shrink-0"
                          style={{ background: values[item.key] || '#35C493', borderColor: '#E8ECF0' }} />
                      </div>
                    ) : item.type === 'html' || (values[item.key] && values[item.key].length > 120) ? (
                      <textarea
                        value={values[item.key] || ''}
                        onChange={e => setValues(p => ({ ...p, [item.key]: e.target.value }))}
                        rows={4}
                        className="w-full px-4 py-3 rounded-xl text-sm resize-none focus:outline-none transition-all"
                        style={{ background: '#F8FAFB', border: '1.5px solid #E8ECF0', color: '#0F1623', lineHeight: 1.6 }}
                        onFocus={e => (e.target.style.borderColor = '#35C493')}
                        onBlur={e => (e.target.style.borderColor = '#E8ECF0')}
                      />
                    ) : (
                      <input
                        value={values[item.key] || ''}
                        onChange={e => setValues(p => ({ ...p, [item.key]: e.target.value }))}
                        className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none transition-all"
                        style={{ background: '#F8FAFB', border: '1.5px solid #E8ECF0', color: '#0F1623' }}
                        onFocus={e => (e.target.style.borderColor = '#35C493')}
                        onBlur={e => (e.target.style.borderColor = '#E8ECF0')}
                      />
                    )}

                    {/* Preview en vivo para textos importantes */}
                    {values[item.key] && item.key.includes('title') && (
                      <div className="mt-3 px-3 py-2 rounded-lg text-xs"
                        style={{ background: '#F0F9FF', border: '1px solid #BAE6FD', color: '#0369A1' }}>
                        <span style={{ opacity: 0.7 }}>Vista previa: </span>
                        <span className="font-semibold">{values[item.key]}</span>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── Preview lateral (mini) ── */}
      <div className="w-72 shrink-0 flex flex-col" style={{ background: '#fff', borderLeft: '1px solid #E8ECF0' }}>
        <div className="px-4 py-4" style={{ borderBottom: '1px solid #E8ECF0' }}>
          <div className="flex items-center gap-2">
            <Eye size={14} style={{ color: '#9CA3AF' }} />
            <span className="text-sm font-semibold" style={{ color: '#0F1623' }}>Vista previa</span>
          </div>
        </div>

        {activeSection === 'hero' && (
          <div className="p-4">
            <div className="rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(135deg, #0F2A22, #1A4D38)' }}>
              <div className="p-4 text-center">
                <div className="text-xs font-bold text-white/60 mb-2">
                  {values['hero_badge'] || 'Badge'}
                </div>
                <div className="text-sm font-bold text-white leading-snug mb-1">
                  {values['hero_title_1'] || 'Título 1'}
                </div>
                <div className="text-sm font-bold mb-2" style={{ color: '#35C493' }}>
                  {values['hero_title_2'] || 'Título 2'}
                </div>
                <div className="text-xs text-white/60 mb-3 leading-relaxed">
                  {(values['hero_subtitle'] || '').slice(0, 80)}...
                </div>
                <div className="bg-white rounded-lg p-2 flex items-center gap-2 mb-2">
                  <span className="text-xs text-gray-400 flex-1 text-left">
                    {values['hero_search_placeholder'] || 'Buscar...'}
                  </span>
                  <span className="text-xs font-bold text-white px-2 py-1 rounded-md" style={{ background: '#35C493' }}>
                    {values['hero_search_button'] || 'Buscar'}
                  </span>
                </div>
                <div className="text-xs text-white/40">
                  {values['hero_sectors'] || 'Sectores...'}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeSection === 'cta' && (
          <div className="p-4">
            <div className="rounded-2xl overflow-hidden p-4 text-center"
              style={{ background: 'linear-gradient(135deg, #0F2A22, #1A4D38)' }}>
              <div className="text-sm font-bold text-white mb-2">
                {values['cta_title'] || 'Título CTA'}
              </div>
              <div className="text-xs text-white/60 mb-3 leading-relaxed">
                {(values['cta_subtitle'] || '').slice(0, 80)}
              </div>
              <div className="text-xs font-bold text-white px-3 py-2 rounded-lg inline-block" style={{ background: '#35C493' }}>
                {values['cta_button'] || 'Botón'}
              </div>
            </div>
          </div>
        )}

        {activeSection === 'colores' && (
          <div className="p-4 space-y-3">
            {['color_brand', 'color_hero_bg'].map(key => (
              <div key={key}>
                <div className="text-xs mb-1" style={{ color: '#9CA3AF' }}>
                  {content.find(i => i.key === key)?.label}
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg border" style={{ background: values[key] || '#35C493', borderColor: '#E8ECF0' }} />
                  <span className="text-xs font-mono" style={{ color: '#6B7280' }}>{values[key]}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeSection === 'seo' && (
          <div className="p-4">
            <div className="rounded-xl p-3" style={{ background: '#F8FAFB', border: '1px solid #E8ECF0' }}>
              <div className="text-xs mb-1" style={{ color: '#9CA3AF' }}>Google preview:</div>
              <div className="text-sm font-semibold text-blue-600 truncate">
                {values['seo_title'] || 'Título del site'}
              </div>
              <div className="text-xs text-green-600 truncate">espothub.com</div>
              <div className="text-xs mt-1 line-clamp-2" style={{ color: '#6B7280' }}>
                {values['seo_description'] || 'Descripción...'}
              </div>
            </div>
          </div>
        )}

        <div className="p-4 mt-auto" style={{ borderTop: '1px solid #E8ECF0' }}>
          <Link href="/" target="_blank"
            className="flex items-center justify-center gap-2 text-sm font-medium py-3 rounded-xl w-full transition-all"
            style={{ background: '#F4F6F8', color: '#6B7280', border: '1px solid #E8ECF0' }}>
            <Eye size={15} /> Abrir site completo
          </Link>
        </div>
      </div>
    </div>
  )
}
