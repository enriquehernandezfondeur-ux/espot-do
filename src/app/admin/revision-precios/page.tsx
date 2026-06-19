'use client'

import { useState, useEffect } from 'react'
import { getPricingReviewQueue, applyHourlyConversion } from '@/lib/actions/admin'
import { Loader2, Check, Tag } from 'lucide-react'

interface Row {
  id: string
  spaceId: string
  spaceName: string
  spaceSlug: string | null
  pricingType: string
  minHoursCur: number | null
  maxHoursCur: number | null
  suggestion: { hourlyPrice: number | null; minHours: number | null; isConsumable: boolean; reason: string }
}

const TYPE_LABELS: Record<string, string> = {
  minimum_consumption: 'Consumo mínimo',
  fixed_package: 'Paquete fijo',
  custom_quote: 'Cotización',
}

export default function RevisionPreciosPage() {
  const [rows, setRows] = useState<Row[] | null>(null)
  const [draft, setDraft] = useState<Record<string, { hourly: string; min: string; max: string; consumable: boolean }>>({})
  const [saving, setSaving] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  async function load() {
    const data = await getPricingReviewQueue()
    setRows(data)
    const d: typeof draft = {}
    for (const r of data) {
      d[r.id] = {
        hourly: r.suggestion.hourlyPrice != null ? String(r.suggestion.hourlyPrice) : '',
        min: String(r.suggestion.minHours ?? r.minHoursCur ?? 1),
        max: r.maxHoursCur != null ? String(r.maxHoursCur) : '',
        consumable: r.suggestion.isConsumable,
      }
    }
    setDraft(d)
  }
  useEffect(() => { load() }, [])

  async function apply(id: string) {
    const d = draft[id]
    if (!d) return
    setSaving(id)
    const res = await applyHourlyConversion(id, {
      hourlyPrice: Number(d.hourly),
      minHours: Number(d.min) || 1,
      maxHours: d.max ? Number(d.max) : null,
      isConsumable: d.consumable,
    })
    setSaving(null)
    if ('error' in res) { setToast(res.error); setTimeout(() => setToast(null), 3000); return }
    setToast('Convertido a precio por hora'); setTimeout(() => setToast(null), 3000)
    await load()
  }

  function set(id: string, k: 'hourly' | 'min' | 'max', v: string) {
    setDraft(prev => ({ ...prev, [id]: { ...prev[id], [k]: v } }))
  }

  if (!rows) {
    return <div className="flex items-center justify-center py-24"><Loader2 className="animate-spin" style={{ color: 'var(--brand)' }} /></div>
  }

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      {toast && (
        <div className="fixed top-16 right-4 md:top-5 md:right-5 z-50 px-4 py-3 rounded-2xl text-sm font-semibold shadow-xl"
          style={{ background: '#16A34A', color: '#fff' }}>{toast}</div>
      )}

      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: '#0F1623', letterSpacing: '-0.02em' }}>Revisión de precios</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Espacios con un modelo de precio legacy. Confirma la conversión a “por hora” (la sugerencia es un punto de partida — verifica los montos).
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-2xl p-10 text-center" style={{ background: '#fff', border: '1px solid #E8ECF0' }}>
          <Tag size={28} className="mx-auto mb-3" style={{ color: '#9CA3AF' }} />
          <p className="text-sm text-gray-500">No hay precios pendientes de revisión.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map(r => {
            const d = draft[r.id] ?? { hourly: '', min: '1', max: '', consumable: false }
            return (
              <div key={r.id} className="rounded-2xl p-5" style={{ background: '#fff', border: '1px solid #E8ECF0' }}>
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div>
                    <div className="font-semibold" style={{ color: '#0F1623' }}>{r.spaceName}</div>
                    <div className="text-xs text-gray-500">Modelo actual: {TYPE_LABELS[r.pricingType] ?? r.pricingType}</div>
                  </div>
                </div>
                <p className="text-xs mb-3 rounded-lg p-2" style={{ background: 'rgba(217,119,6,0.08)', color: '#92400E' }}>{r.suggestion.reason}</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <label className="text-xs font-medium text-gray-600">Precio por hora (RD$)
                    <input type="number" inputMode="numeric" value={d.hourly} onChange={e => set(r.id, 'hourly', e.target.value)}
                      className="mt-1 w-full rounded-xl px-3 py-2 text-sm" style={{ border: '1px solid #E8ECF0', fontSize: 16 }} />
                  </label>
                  <label className="text-xs font-medium text-gray-600">Mínimo de horas
                    <input type="number" inputMode="numeric" value={d.min} onChange={e => set(r.id, 'min', e.target.value)}
                      className="mt-1 w-full rounded-xl px-3 py-2 text-sm" style={{ border: '1px solid #E8ECF0', fontSize: 16 }} />
                  </label>
                  <label className="text-xs font-medium text-gray-600">Máximo de horas
                    <input type="number" inputMode="numeric" value={d.max} onChange={e => set(r.id, 'max', e.target.value)}
                      className="mt-1 w-full rounded-xl px-3 py-2 text-sm" style={{ border: '1px solid #E8ECF0', fontSize: 16 }} />
                  </label>
                  <label className="text-xs font-medium text-gray-600 flex flex-col">¿Consumible?
                    <button type="button" onClick={() => setDraft(prev => ({ ...prev, [r.id]: { ...prev[r.id], consumable: !prev[r.id]?.consumable } }))}
                      className="mt-1 rounded-xl px-3 py-2 text-sm font-semibold"
                      style={{ border: '1px solid #E8ECF0', background: d.consumable ? 'rgba(53,196,147,0.12)' : '#fff', color: d.consumable ? 'var(--brand)' : '#6B7280' }}>
                      {d.consumable ? 'Sí, consumible' : 'Solo uso del espacio'}
                    </button>
                  </label>
                </div>
                <div className="mt-4 flex justify-end">
                  <button onClick={() => apply(r.id)} disabled={saving === r.id || !d.hourly}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-60"
                    style={{ background: 'var(--brand)', color: '#fff' }}>
                    {saving === r.id ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
                    Convertir a por hora
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
