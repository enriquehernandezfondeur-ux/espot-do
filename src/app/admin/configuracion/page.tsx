'use client'

import { useState, useEffect } from 'react'
import { getMarketplaceConfig, updateConfig } from '@/lib/actions/admin'
import { Save, Loader2, CheckCircle } from 'lucide-react'

const groupLabels: Record<string, string> = {
  tema:       '🎨 Tema y colores',
  general:    '⚙️ General',
  pagos:      '💳 Pagos',
  reservas:   '📅 Reservas',
  espacios:   '🏛️ Espacios',
  marketplace:'🛒 Marketplace',
  legal:      '⚖️ Legal',
}

const GROUP_ORDER = ['tema', 'general', 'pagos', 'reservas', 'espacios', 'marketplace', 'legal']

function isColorKey(key: string, value: string) {
  return key.startsWith('theme_') && /^#[0-9a-fA-F]{3,8}$/.test(value)
}

export default function AdminConfigPage() {
  const [config, setConfig]   = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState<string | null>(null)
  const [saved, setSaved]     = useState<string | null>(null)
  const [toast, setToast]     = useState<{ msg: string; ok: boolean } | null>(null)

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3000)
  }

  useEffect(() => {
    getMarketplaceConfig().then(d => { setConfig(d); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  async function handleSave(key: string, value: string) {
    setSaving(key)
    const result = await updateConfig(key, value)
    if ('error' in result) {
      showToast(`Error: ${result.error}`, false)
    } else {
      setSaved(key)
      showToast('Guardado', true)
      setTimeout(() => setSaved(null), 2000)
    }
    setSaving(null)
  }

  function updateLocal(key: string, value: string) {
    setConfig(prev => prev.map(c => c.key === key ? { ...c, value } : c))
  }

  const grouped = config.reduce<Record<string, typeof config>>((acc, c) => {
    const g = c.group_name ?? 'general'
    if (!acc[g]) acc[g] = []
    acc[g].push(c)
    return acc
  }, {})

  const orderedGroups = [
    ...GROUP_ORDER.filter(g => grouped[g]),
    ...Object.keys(grouped).filter(g => !GROUP_ORDER.includes(g)),
  ]

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      {toast && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold shadow-xl"
          style={{ background: toast.ok ? '#16A34A' : '#DC2626', color: '#fff' }}>
          {toast.ok ? '✓' : '✕'} {toast.msg}
        </div>
      )}

      <div className="mb-8">
        <h1 className="text-2xl font-bold" style={{ color: '#0F1623', letterSpacing: '-0.02em' }}>Configuración</h1>
        <p className="text-sm text-gray-500 mt-0.5">Ajustes globales del marketplace</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--brand)' }} />
        </div>
      ) : (
        <div className="space-y-6">
          {orderedGroups.map(group => (
            <div key={group} className="rounded-2xl overflow-hidden"
              style={{ background: '#fff', border: '1px solid #E8ECF0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
              <div className="px-6 py-4" style={{ borderBottom: '1px solid #F0F2F5', background: '#FAFBFC' }}>
                <h2 className="font-bold text-sm" style={{ color: '#0F1623' }}>
                  {groupLabels[group] ?? group}
                </h2>
                {group === 'tema' && (
                  <p className="text-xs text-gray-400 mt-0.5">
                    Los cambios se aplican en todo el sitio al guardar. Recarga la página para verlos.
                  </p>
                )}
              </div>

              <div className="divide-y divide-[#F0F2F5]">
                {(grouped[group] ?? []).map(item => {
                  const isColor = isColorKey(item.key, item.value ?? '')
                  return (
                    <div key={item.key} className="flex items-center gap-4 px-6 py-4">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm" style={{ color: '#374151' }}>{item.label ?? item.key}</div>
                        {item.description && (
                          <div className="text-xs text-gray-400 mt-0.5">{item.description}</div>
                        )}
                        <div className="text-[10px] text-gray-300 mt-0.5 font-mono">{item.key}</div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {isColor ? (
                          /* Color picker + hex input en línea */
                          <div className="flex items-center gap-2">
                            {/* Swatch clickable */}
                            <label className="relative cursor-pointer shrink-0">
                              <div className="w-10 h-10 rounded-xl border-2 border-white shadow-md transition-transform hover:scale-105"
                                style={{ background: item.value, boxShadow: '0 0 0 1.5px #E8ECF0, 0 2px 6px rgba(0,0,0,0.12)' }} />
                              <input
                                type="color"
                                value={item.value ?? '#35C493'}
                                onChange={e => updateLocal(item.key, e.target.value)}
                                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                              />
                            </label>
                            {/* Hex input */}
                            <input
                              value={item.value ?? ''}
                              onChange={e => updateLocal(item.key, e.target.value)}
                              className="px-3 py-2 rounded-xl text-sm font-mono border focus:outline-none w-28"
                              style={{ border: '1.5px solid #E8ECF0', color: '#0F1623', background: '#F8FAFB' }}
                              onFocus={e => (e.target.style.borderColor = 'var(--brand)')}
                              onBlur={e => (e.target.style.borderColor = '#E8ECF0')}
                              placeholder="#35C493"
                              maxLength={9}
                            />
                          </div>
                        ) : (
                          <input
                            value={item.value ?? ''}
                            onChange={e => updateLocal(item.key, e.target.value)}
                            className="px-3 py-2 rounded-xl text-sm font-medium border focus:outline-none transition-colors"
                            style={{ border: '1.5px solid #E8ECF0', color: '#0F1623', background: '#F8FAFB', minWidth: 200 }}
                            onFocus={e => (e.target.style.borderColor = 'var(--brand)')}
                            onBlur={e => (e.target.style.borderColor = '#E8ECF0')}
                          />
                        )}

                        <button onClick={() => handleSave(item.key, item.value)}
                          disabled={saving === item.key}
                          className="w-9 h-9 rounded-xl flex items-center justify-center transition-all shrink-0"
                          style={{
                            background: saved === item.key ? 'rgba(22,163,74,0.1)' : 'rgba(53,196,147,0.1)',
                            color: saved === item.key ? '#16A34A' : 'var(--brand)',
                          }}>
                          {saving === item.key
                            ? <Loader2 size={15} className="animate-spin" />
                            : saved === item.key
                              ? <CheckCircle size={15} />
                              : <Save size={15} />}
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Preview de colores del tema */}
              {group === 'tema' && (
                <div className="px-6 py-4 flex items-center gap-3 flex-wrap"
                  style={{ borderTop: '1px solid #F0F2F5', background: '#FAFBFC' }}>
                  <span className="text-xs font-medium text-gray-400">Vista previa:</span>
                  {(grouped[group] ?? [])
                    .filter(item => isColorKey(item.key, item.value ?? ''))
                    .map(item => (
                      <div key={item.key} className="flex items-center gap-1.5">
                        <div className="w-5 h-5 rounded-full border border-white shadow-sm"
                          style={{ background: item.value, boxShadow: '0 0 0 1px #E8ECF0' }} />
                        <span className="text-[10px] font-mono text-gray-400">{item.value}</span>
                      </div>
                    ))
                  }
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
