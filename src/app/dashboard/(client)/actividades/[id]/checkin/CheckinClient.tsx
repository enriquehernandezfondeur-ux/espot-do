'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { QRCodeSVG } from 'qrcode.react'
import { ChevronLeft, Search, QrCode, Check, UserPlus, X, RefreshCw } from 'lucide-react'
import { setCheckin, type ActivityDetail } from '@/lib/actions/activities'
import type { ActivityParticipant } from '@/lib/activities/types'

function timeOf(iso: string | null): string | null {
  if (!iso) return null
  const d = new Date(iso)
  let h = d.getHours()
  const m = String(d.getMinutes()).padStart(2, '0')
  const period = h >= 12 ? 'PM' : 'AM'
  h = h % 12 === 0 ? 12 : h % 12
  return `${h}:${m} ${period}`
}

export function CheckinClient({ detail }: { detail: ActivityDetail }) {
  const router = useRouter()
  const { activity } = detail

  // Estado local para reflejar el toque al instante (optimista).
  const [rows, setRows] = useState<ActivityParticipant[]>(
    detail.participants.filter(p => p.status !== 'rechazado'),
  )
  const [query, setQuery] = useState('')
  const [showQr, setShowQr] = useState(false)
  const [busy, setBusy] = useState<Set<string>>(new Set())

  // Reconciliar con el servidor cuando llegan confirmaciones nuevas (tras refresh).
  useEffect(() => {
    if (busy.size === 0) setRows(detail.participants.filter(p => p.status !== 'rechazado'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detail.participants])

  const publicUrl = `https://espot.do/a/${activity.public_code}`
  const registered = rows.filter(p => p.status === 'registrado').length
  const total = rows.length
  const pct = total ? Math.round((registered / total) * 100) : 0

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = q ? rows.filter(p => p.name.toLowerCase().includes(q)) : rows
    // Pendientes primero, registrados al final.
    return [...list].sort((a, b) => Number(a.status === 'registrado') - Number(b.status === 'registrado'))
  }, [rows, query])

  async function toggle(p: ActivityParticipant) {
    const checkedIn = p.status !== 'registrado'
    // Optimista
    setRows(prev => prev.map(r => r.id === p.id
      ? { ...r, status: checkedIn ? 'registrado' : 'confirmado', checked_in_at: checkedIn ? new Date().toISOString() : null }
      : r))
    setBusy(prev => new Set(prev).add(p.id))
    const res = await setCheckin(p.id, activity.id, checkedIn)
    setBusy(prev => { const n = new Set(prev); n.delete(p.id); return n })
    if (!res.ok) {
      // Revertir
      setRows(prev => prev.map(r => r.id === p.id ? p : r))
    } else {
      router.refresh()
    }
  }

  return (
    <div className="min-h-dvh" style={{ background: 'var(--bg-base)' }}>
      <div className="max-w-lg mx-auto px-4 pb-24 pt-4">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <button type="button" onClick={() => router.push(`/dashboard/actividades/${activity.id}`)}
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>
            <ChevronLeft size={18} />
          </button>
          <div className="min-w-0">
            <h1 className="text-lg font-bold truncate" style={{ color: 'var(--text-primary)' }}>Check-in</h1>
            <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{activity.title}</p>
          </div>
          <button type="button" onClick={() => router.refresh()} aria-label="Actualizar"
            className="ml-auto w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}>
            <RefreshCw size={15} />
          </button>
          <button type="button" onClick={() => setShowQr(s => !s)}
            className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl shrink-0"
            style={{ background: showQr ? 'var(--brand)' : 'var(--bg-elevated)', color: showQr ? '#fff' : 'var(--text-primary)', border: '1px solid var(--border-subtle)' }}>
            <QrCode size={14} /> QR
          </button>
        </div>

        {/* QR para que lleguen y confirmen en el momento */}
        {showQr && (
          <div className="rounded-2xl p-5 mb-4 flex flex-col items-center text-center gap-2"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
            <div className="rounded-xl p-3" style={{ background: '#fff' }}>
              <QRCodeSVG value={publicUrl} size={172} />
            </div>
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Escanea para confirmar</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Quien aún no confirmó puede hacerlo aquí. Toca Actualizar para verlo en la lista.</p>
          </div>
        )}

        {/* Progreso */}
        <div className="rounded-2xl p-4 mb-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
          <div className="flex items-end justify-between mb-2">
            <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Registrados</span>
            <span className="text-sm font-bold" style={{ color: 'var(--brand)' }}>{registered} / {total}</span>
          </div>
          <div className="h-2.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-elevated)' }}>
            <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: 'var(--brand)' }} />
          </div>
        </div>

        {/* Buscador */}
        {total > 0 && (
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl mb-3"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
            <Search size={16} style={{ color: '#9CA3AF' }} />
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar invitado…"
              className="flex-1 bg-transparent outline-none" style={{ fontSize: 16, color: '#374151' }} />
            {query && <button type="button" onClick={() => setQuery('')} aria-label="Limpiar"><X size={15} style={{ color: '#9CA3AF' }} /></button>}
          </div>
        )}

        {/* Lista */}
        {total === 0 ? (
          <div className="rounded-2xl p-8 text-center" style={{ background: 'var(--bg-card)', border: '2px dashed var(--border-medium)' }}>
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Sin confirmaciones aún</p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Muestra el QR para que confirmen al llegar.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {visible.map(p => {
              const on = p.status === 'registrado'
              const working = busy.has(p.id)
              return (
                <button key={p.id} type="button" onClick={() => toggle(p)} disabled={working}
                  className="w-full flex items-center gap-3 rounded-xl p-3.5 text-left transition-colors"
                  style={{
                    background: on ? 'var(--brand-dim)' : 'var(--bg-card)',
                    border: `1px solid ${on ? 'var(--brand)' : 'var(--border-subtle)'}`,
                    opacity: working ? 0.6 : 1,
                  }}>
                  <span className="flex h-9 w-9 items-center justify-center rounded-full shrink-0"
                    style={{ background: on ? 'var(--brand)' : 'var(--bg-elevated)', color: on ? '#fff' : 'var(--text-muted)' }}>
                    <Check size={17} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{p.name}</span>
                      {p.companions > 0 && (
                        <span className="flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full shrink-0"
                          style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>
                          <UserPlus size={10} /> +{p.companions}
                        </span>
                      )}
                    </span>
                    <span className="text-xs" style={{ color: on ? 'var(--brand)' : 'var(--text-muted)' }}>
                      {on ? `Registrado ${timeOf(p.checked_in_at) ?? ''}`.trim() : 'Tocar para registrar entrada'}
                    </span>
                  </span>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
