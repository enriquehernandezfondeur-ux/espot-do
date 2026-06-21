'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { X, Loader2 } from 'lucide-react'
import { updateActivity } from '@/lib/actions/activities'
import type { Activity } from '@/lib/activities/types'

const field: React.CSSProperties = {
  fontSize: 16, width: '100%', padding: '10px 12px', borderRadius: 12,
  background: 'var(--bg-elevated)', border: '1px solid var(--border-medium)',
  color: 'var(--text-primary)', outline: 'none',
}

function Label({ children }: { children: React.ReactNode }) {
  return <span className="mb-1.5 block text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{children}</span>
}

export function EditActivityModal({ activity, open, onClose }: { activity: Activity; open: boolean; onClose: () => void }) {
  const router = useRouter()
  const [title, setTitle] = useState(activity.title)
  const [date, setDate] = useState(activity.event_date ?? '')
  const [start, setStart] = useState(activity.start_time?.slice(0, 5) ?? '')
  const [end, setEnd] = useState(activity.end_time?.slice(0, 5) ?? '')
  const [people, setPeople] = useState(activity.expected_people != null ? String(activity.expected_people) : '')
  const [extLoc, setExtLoc] = useState(activity.external_location ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!open) return null

  async function save() {
    setError(null)
    setSaving(true)
    const res = await updateActivity(activity.id, {
      title,
      event_date: date || null,
      start_time: start || null,
      end_time: end || null,
      expected_people: people.trim() ? Number(people) : null,
      ...(activity.location_mode === 'external' ? { external_location: extLoc || null } : {}),
    })
    setSaving(false)
    if (!res.ok) { setError(res.error); return }
    onClose()
    router.refresh()
  }

  return (
    <>
      <div className="fixed inset-0 z-[70] bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4">
        <div className="w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-6 space-y-4 max-h-[90vh] overflow-y-auto"
          style={{ background: 'var(--bg-card)', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}
          onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>Editar actividad</h3>
            <button type="button" onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}><X size={16} /></button>
          </div>

          <label className="block"><Label>Nombre</Label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} style={field} /></label>
          <label className="block"><Label>Fecha</Label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} style={field} /></label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block"><Label>Inicio</Label>
              <input type="time" value={start} onChange={e => setStart(e.target.value)} style={field} /></label>
            <label className="block"><Label>Fin</Label>
              <input type="time" value={end} onChange={e => setEnd(e.target.value)} style={field} /></label>
          </div>
          <label className="block"><Label>Personas esperadas</Label>
            <input type="number" inputMode="numeric" value={people} onChange={e => setPeople(e.target.value)} style={field} placeholder="Opcional" /></label>
          {activity.location_mode === 'external' && (
            <label className="block"><Label>Ubicación</Label>
              <input type="text" value={extLoc} onChange={e => setExtLoc(e.target.value)} style={field} /></label>
          )}

          {error && (
            <div className="rounded-xl px-3.5 py-2.5 text-sm"
              style={{ background: 'rgba(220,38,38,0.08)', color: '#B91C1C', border: '1px solid rgba(220,38,38,0.20)' }}>{error}</div>
          )}

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
              style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>Cancelar</button>
            <button type="button" onClick={save} disabled={saving}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-1.5"
              style={{ background: 'var(--brand)', color: '#fff', opacity: saving ? 0.7 : 1 }}>
              {saving && <Loader2 size={14} className="animate-spin" />} Guardar
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
