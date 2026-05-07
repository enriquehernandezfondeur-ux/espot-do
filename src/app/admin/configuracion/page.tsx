'use client'

import { useState, useEffect } from 'react'
import { getMarketplaceConfig, updateConfig } from '@/lib/actions/admin'
import { Settings, Save, Loader2, CheckCircle } from 'lucide-react'

const groupLabels: Record<string, string> = {
  general:    '⚙️ General',
  pagos:      '💳 Pagos',
  reservas:   '📅 Reservas',
  espacios:   '🏛️ Espacios',
  marketplace:'🛒 Marketplace',
  legal:      '⚖️ Legal',
}

export default function AdminConfigPage() {
  const [config, setConfig]   = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState<string | null>(null)
  const [saved, setSaved]     = useState<string | null>(null)

  useEffect(() => {
    getMarketplaceConfig().then(d => { setConfig(d); setLoading(false) })
  }, [])

  async function handleSave(key: string, value: string) {
    setSaving(key)
    await updateConfig(key, value)
    setSaved(key)
    setTimeout(() => setSaved(null), 2000)
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

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold" style={{ color: '#0F1623', letterSpacing: '-0.02em' }}>Configuración</h1>
        <p className="text-sm text-slate-500 mt-0.5">Ajustes globales del marketplace</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--brand)' }} />
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([group, items]) => (
            <div key={group} className="rounded-2xl overflow-hidden"
              style={{ background: '#fff', border: '1px solid #E8ECF0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
              <div className="px-6 py-4" style={{ borderBottom: '1px solid #F0F2F5', background: '#FAFBFC' }}>
                <h2 className="font-bold text-sm" style={{ color: '#0F1623' }}>
                  {groupLabels[group] ?? group}
                </h2>
              </div>
              <div className="divide-y divide-[#F0F2F5]">
                {items.map(item => (
                  <div key={item.key} className="flex items-center gap-4 px-6 py-4">
                    <div className="flex-1">
                      <div className="font-medium text-sm" style={{ color: '#374151' }}>{item.label}</div>
                      <div className="text-xs text-slate-400 mt-0.5 font-mono">{item.key}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        value={item.value ?? ''}
                        onChange={e => updateLocal(item.key, e.target.value)}
                        className="px-3 py-2 rounded-xl text-sm font-medium border focus:outline-none transition-colors"
                        style={{ border: '1.5px solid #E8ECF0', color: '#0F1623', background: '#F8FAFB', minWidth: 200 }}
                        onFocus={e => (e.target.style.borderColor = 'var(--brand)')}
                        onBlur={e => (e.target.style.borderColor = '#E8ECF0')}
                      />
                      <button onClick={() => handleSave(item.key, item.value)}
                        disabled={saving === item.key}
                        className="w-9 h-9 rounded-xl flex items-center justify-center transition-all"
                        style={{ background: saved === item.key ? 'rgba(22,163,74,0.1)' : 'rgba(53,196,147,0.1)', color: saved === item.key ? '#16A34A' : 'var(--brand)' }}>
                        {saving === item.key
                          ? <Loader2 size={15} className="animate-spin" />
                          : saved === item.key
                            ? <CheckCircle size={15} />
                            : <Save size={15} />}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
