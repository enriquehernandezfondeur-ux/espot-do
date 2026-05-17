'use client'

import { useState, useEffect, useCallback } from 'react'
import { getAdminDisputes, updateDisputeStatus, CATEGORY_LABELS, STATUS_LABELS_DISPUTE } from '@/lib/actions/disputes'
import type { DisputeStatus } from '@/lib/actions/disputes'
import { formatDate } from '@/lib/utils'
import {
  Search, Loader2, ShieldAlert, X, ChevronDown, CheckCircle2,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ── Tipos ──────────────────────────────────────────────────

type Dispute = Awaited<ReturnType<typeof getAdminDisputes>>[number]

// ── Configuración visual ───────────────────────────────────

const STATUS_OPTIONS: { value: DisputeStatus | 'all'; label: string }[] = [
  { value: 'all',             label: 'Todas' },
  { value: 'abierta',         label: 'Abiertas' },
  { value: 'en_revision',     label: 'En revisión' },
  { value: 'resuelta_cliente', label: 'Resuelta (cliente)' },
  { value: 'resuelta_host',   label: 'Resuelta (host)' },
  { value: 'cerrada',         label: 'Cerradas' },
]

const STATUS_CONFIG: Record<DisputeStatus, { label: string; color: string; bg: string }> = {
  abierta:          { label: 'Abierta',                    color: '#D97706', bg: 'rgba(217,119,6,0.1)'   },
  en_revision:      { label: 'En revisión',                color: '#2563EB', bg: 'rgba(37,99,235,0.1)'   },
  resuelta_cliente: { label: 'Resuelta: cliente',          color: '#16A34A', bg: 'rgba(22,163,74,0.1)'   },
  resuelta_host:    { label: 'Resuelta: host',             color: '#7C3AED', bg: 'rgba(124,58,237,0.1)'  },
  cerrada:          { label: 'Cerrada',                    color: '#6B7280', bg: 'rgba(107,114,128,0.1)' },
}

const STATUS_TRANSITIONS: Record<DisputeStatus, { value: DisputeStatus; label: string }[]> = {
  abierta:          [
    { value: 'en_revision',      label: 'Marcar en revisión' },
    { value: 'resuelta_cliente', label: 'Resolver a favor del cliente' },
    { value: 'resuelta_host',    label: 'Resolver a favor del host' },
    { value: 'cerrada',          label: 'Cerrar sin resolución' },
  ],
  en_revision:      [
    { value: 'resuelta_cliente', label: 'Resolver a favor del cliente' },
    { value: 'resuelta_host',    label: 'Resolver a favor del host' },
    { value: 'cerrada',          label: 'Cerrar sin resolución' },
  ],
  resuelta_cliente: [{ value: 'cerrada', label: 'Cerrar disputa' }],
  resuelta_host:    [{ value: 'cerrada', label: 'Cerrar disputa' }],
  cerrada:          [],
}

// ── Componente principal ───────────────────────────────────

export default function AdminDisputasPage() {
  const [disputes, setDisputes]  = useState<Dispute[]>([])
  const [loading, setLoading]    = useState(true)
  const [filter, setFilter]      = useState<DisputeStatus | 'all'>('all')
  const [search, setSearch]      = useState('')
  const [selected, setSelected]  = useState<Dispute | null>(null)
  const [updating, setUpdating]  = useState(false)
  const [toast, setToast]        = useState<{ msg: string; ok: boolean } | null>(null)

  // Form del modal
  const [newStatus,    setNewStatus]    = useState<DisputeStatus | ''>('')
  const [resolution,   setResolution]   = useState('')
  const [adminNotes,   setAdminNotes]   = useState('')

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3500)
  }

  const loadDisputes = useCallback(async () => {
    setLoading(true)
    const data = await getAdminDisputes(filter === 'all' ? undefined : filter)
    setDisputes(data ?? [])
    setLoading(false)
  }, [filter])

  useEffect(() => { loadDisputes() }, [loadDisputes])

  // Poblar el form al seleccionar una disputa
  function handleSelect(d: Dispute) {
    setSelected(d)
    setNewStatus('')
    setResolution((d as any).resolution ?? '')
    setAdminNotes((d as any).admin_notes ?? '')
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault()
    if (!selected || !newStatus) return
    setUpdating(true)
    const result = await updateDisputeStatus(
      selected.id,
      newStatus as DisputeStatus,
      resolution || undefined,
      adminNotes || undefined,
    )
    setUpdating(false)

    if (result.error) {
      showToast(`Error: ${result.error}`, false)
      return
    }

    showToast('Disputa actualizada correctamente', true)
    setDisputes(prev =>
      prev.map(d => d.id === selected.id
        ? { ...d, status: newStatus as DisputeStatus, resolution, admin_notes: adminNotes }
        : d
      )
    )
    setSelected(null)
  }

  // Filtrado por búsqueda
  const filtered = disputes.filter(d => {
    const opener     = (d as any).opener?.full_name ?? ''
    const respondent = (d as any).respondent?.full_name ?? ''
    const space      = (d as any).bookings?.spaces?.name ?? ''
    const q          = search.toLowerCase()
    return opener.toLowerCase().includes(q)
      || respondent.toLowerCase().includes(q)
      || space.toLowerCase().includes(q)
      || d.id.toLowerCase().includes(q)
  })

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">

      {/* Toast */}
      {toast && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold shadow-xl"
          style={{ background: toast.ok ? '#16A34A' : '#DC2626', color: '#fff' }}>
          {toast.ok ? <CheckCircle2 size={15} /> : <X size={15} />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold" style={{ color: '#0F1623', letterSpacing: '-0.02em' }}>
          Disputas
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          {disputes.length} disputas en total
        </p>
      </div>

      {/* Filtros */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 mb-6">
        <div className="flex gap-1 p-1 rounded-xl overflow-x-auto scrollbar-hide shrink-0"
          style={{ background: '#fff', border: '1px solid #E8ECF0' }}>
          {STATUS_OPTIONS.map(o => (
            <button key={o.value}
              onClick={() => { setFilter(o.value); setLoading(true) }}
              className="px-3 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap shrink-0"
              style={filter === o.value
                ? { background: '#0F1623', color: '#fff' }
                : { color: '#6B7280' }}>
              {o.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 flex-1 px-4 py-2.5 rounded-xl"
          style={{ background: '#fff', border: '1px solid #E8ECF0' }}>
          <Search size={15} className="text-slate-400 shrink-0" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nombre, espacio o ID…"
            className="flex-1 text-sm outline-none bg-transparent"
            style={{ color: '#0F1623' }} />
        </div>
      </div>

      {/* Tabla */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <ShieldAlert size={40} className="mx-auto mb-3 text-slate-300" />
          <p className="text-slate-500 text-sm">No hay disputas con los filtros actuales.</p>
        </div>
      ) : (
        <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid #E8ECF0', background: '#fff' }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid #F0F2F5', background: '#FAFBFC' }}>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 whitespace-nowrap">Reserva</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 whitespace-nowrap">Espacio</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 whitespace-nowrap">Abrió</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 whitespace-nowrap">Contra</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 whitespace-nowrap">Categoría</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 whitespace-nowrap">Estado</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 whitespace-nowrap">Fecha</th>
                  <th className="px-5 py-3.5" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((d, idx) => {
                  const statusCfg   = STATUS_CONFIG[(d as any).status as DisputeStatus] ?? STATUS_CONFIG.abierta
                  const booking     = (d as any).bookings
                  const space       = booking?.spaces
                  const opener      = (d as any).opener
                  const respondent  = (d as any).respondent
                  const catLabel    = CATEGORY_LABELS[(d as any).category as keyof typeof CATEGORY_LABELS] ?? d.category

                  return (
                    <tr key={d.id}
                      className="transition-colors hover:bg-slate-50 cursor-pointer"
                      style={{ borderBottom: idx < filtered.length - 1 ? '1px solid #F0F2F5' : 'none' }}
                      onClick={() => handleSelect(d)}>
                      <td className="px-5 py-4">
                        <span className="font-mono text-xs font-semibold text-slate-600">
                          {(d as any).booking_id?.slice(0, 8).toUpperCase() ?? '—'}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="font-medium text-slate-800">{space?.name ?? '—'}</span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-slate-700">{opener?.full_name ?? '—'}</span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-slate-700">{respondent?.full_name ?? '—'}</span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-xs text-slate-600">{catLabel}</span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
                          style={{ color: statusCfg.color, background: statusCfg.bg }}>
                          {statusCfg.label}
                        </span>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <span className="text-xs text-slate-500">
                          {formatDate((d as any).created_at?.split('T')[0] ?? '')}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <button
                          onClick={e => { e.stopPropagation(); handleSelect(d) }}
                          className="text-xs font-medium px-3 py-1.5 rounded-lg transition-all"
                          style={{ background: '#F0F2F5', color: '#374151' }}>
                          Ver
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal / Drawer de detalle */}
      {selected && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
            onClick={() => setSelected(null)}
          />
          <div className="fixed right-0 top-0 h-full z-50 w-full max-w-xl overflow-y-auto"
            style={{ background: '#fff', boxShadow: '-4px 0 32px rgba(0,0,0,0.12)' }}>

            {/* Header del drawer */}
            <div className="flex items-center justify-between px-6 py-5"
              style={{ borderBottom: '1px solid #F0F2F5', position: 'sticky', top: 0, background: '#fff', zIndex: 1 }}>
              <div>
                <h2 className="font-bold text-base" style={{ color: '#0F1623' }}>
                  Disputa — {(selected as any).id?.slice(0, 8).toUpperCase()}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Abierta el {formatDate((selected as any).created_at?.split('T')[0] ?? '')}
                </p>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors"
                style={{ background: '#F0F2F5', color: '#6B7280' }}>
                <X size={16} />
              </button>
            </div>

            <div className="px-6 py-6 space-y-6">

              {/* Estado actual */}
              {(() => {
                const sc = STATUS_CONFIG[(selected as any).status as DisputeStatus] ?? STATUS_CONFIG.abierta
                return (
                  <div className="flex items-center gap-3 px-4 py-3 rounded-xl"
                    style={{ background: sc.bg, border: `1px solid ${sc.color}22` }}>
                    <ShieldAlert size={16} style={{ color: sc.color }} />
                    <span className="text-sm font-semibold" style={{ color: sc.color }}>
                      {sc.label}
                    </span>
                  </div>
                )
              })()}

              {/* Información de la reserva */}
              <Section title="Reserva">
                <Row label="ID reserva" value={(selected as any).booking_id?.slice(0, 8).toUpperCase() ?? '—'} mono />
                <Row label="Espacio"    value={(selected as any).bookings?.spaces?.name ?? '—'} />
                <Row label="Fecha"      value={formatDate((selected as any).bookings?.event_date ?? '')} />
              </Section>

              {/* Partes */}
              <Section title="Partes involucradas">
                <Row label="Quien abrió" value={`${(selected as any).opener?.full_name ?? '—'} · ${(selected as any).opener?.email ?? ''}`} />
                <Row label="Contra"      value={`${(selected as any).respondent?.full_name ?? '—'} · ${(selected as any).respondent?.email ?? ''}`} />
              </Section>

              {/* Detalle de la disputa */}
              <Section title="Detalle">
                <Row label="Categoría" value={CATEGORY_LABELS[(selected as any).category as keyof typeof CATEGORY_LABELS] ?? (selected as any).category} />
                <div>
                  <span className="text-xs font-medium text-slate-500 block mb-1.5">Descripción</span>
                  <p className="text-sm leading-relaxed text-slate-700 bg-slate-50 rounded-xl p-3.5">
                    {(selected as any).reason}
                  </p>
                </div>
              </Section>

              {/* Resolución existente */}
              {(selected as any).resolution && (
                <Section title="Resolución previa">
                  <p className="text-sm leading-relaxed text-slate-700">{(selected as any).resolution}</p>
                </Section>
              )}
              {(selected as any).admin_notes && (
                <Section title="Notas del admin">
                  <p className="text-sm leading-relaxed text-slate-700">{(selected as any).admin_notes}</p>
                </Section>
              )}

              {/* Form de actualización */}
              {STATUS_TRANSITIONS[(selected as any).status as DisputeStatus]?.length > 0 && (
                <form onSubmit={handleUpdate} className="space-y-4 pt-2"
                  style={{ borderTop: '1px solid #F0F2F5', paddingTop: 24 }}>
                  <h3 className="font-semibold text-sm" style={{ color: '#0F1623' }}>Actualizar estado</h3>

                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1.5">Nuevo estado</label>
                    <div className="relative">
                      <select
                        value={newStatus}
                        onChange={e => setNewStatus(e.target.value as DisputeStatus | '')}
                        required
                        className="w-full px-4 py-3 rounded-xl text-sm outline-none appearance-none"
                        style={{
                          background:  '#F8FAFC',
                          border:      '1px solid #E8ECF0',
                          color:       '#0F1623',
                          fontSize:    '16px',
                        }}>
                        <option value="" disabled>Selecciona un estado…</option>
                        {STATUS_TRANSITIONS[(selected as any).status as DisputeStatus]?.map(t => (
                          <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                      </select>
                      <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1.5">
                      Resolución <span className="text-slate-400">(opcional pero recomendado)</span>
                    </label>
                    <textarea
                      value={resolution}
                      onChange={e => setResolution(e.target.value)}
                      placeholder="Explica la decisión tomada y sus fundamentos…"
                      rows={4}
                      className="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none"
                      style={{
                        background:  '#F8FAFC',
                        border:      '1px solid #E8ECF0',
                        color:       '#0F1623',
                        fontSize:    '16px',
                        lineHeight:  '1.6',
                      }}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1.5">
                      Notas internas <span className="text-slate-400">(solo admin)</span>
                    </label>
                    <textarea
                      value={adminNotes}
                      onChange={e => setAdminNotes(e.target.value)}
                      placeholder="Notas internas del equipo de soporte…"
                      rows={3}
                      className="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none"
                      style={{
                        background:  '#F8FAFC',
                        border:      '1px solid #E8ECF0',
                        color:       '#0F1623',
                        fontSize:    '16px',
                        lineHeight:  '1.6',
                      }}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={updating || !newStatus}
                    className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-bold transition-all disabled:opacity-60"
                    style={{ background: '#0F1623', color: '#fff' }}>
                    {updating
                      ? <><Loader2 size={14} className="animate-spin" /> Actualizando…</>
                      : <><CheckCircle2 size={14} /> Guardar cambios</>}
                  </button>
                </form>
              )}

              {STATUS_TRANSITIONS[(selected as any).status as DisputeStatus]?.length === 0 && (
                <div className="text-center py-4">
                  <p className="text-sm text-slate-400">Esta disputa ya fue cerrada y no admite más cambios.</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ── Sub-componentes internos ────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">{title}</h3>
      <div className="space-y-2.5">{children}</div>
    </div>
  )
}

function Row({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-xs text-slate-500 shrink-0 pt-0.5">{label}</span>
      <span className={cn('text-sm text-right break-all', mono ? 'font-mono text-xs' : 'font-medium text-slate-800')}>
        {value}
      </span>
    </div>
  )
}
