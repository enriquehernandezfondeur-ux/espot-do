'use client'

import { useState } from 'react'
import { AlertTriangle, ChevronDown, Loader2, ShieldAlert, CheckCircle2 } from 'lucide-react'
import { openDispute, CATEGORY_LABELS, STATUS_LABELS_DISPUTE } from '@/lib/actions/disputes'
import type { DisputeCategory, DisputeStatus } from '@/lib/actions/disputes'

const CATEGORY_OPTIONS: { value: DisputeCategory; label: string }[] = [
  { value: 'espacio_diferente',   label: 'Espacio diferente a lo prometido' },
  { value: 'cancelacion_injusta', label: 'Cancelación injusta' },
  { value: 'pago_incorrecto',     label: 'Pago incorrecto' },
  { value: 'host_no_responde',    label: 'Host no responde' },
  { value: 'cliente_no_responde', label: 'Cliente no responde' },
  { value: 'danos',               label: 'Daños al espacio' },
  { value: 'otro',                label: 'Otro motivo' },
]

const STATUS_CONFIG: Record<DisputeStatus, { label: string; color: string; bg: string }> = {
  abierta:          { label: 'Abierta',                   color: '#D97706', bg: 'rgba(217,119,6,0.08)'   },
  en_revision:      { label: 'En revisión',               color: '#2563EB', bg: 'rgba(37,99,235,0.08)'   },
  resuelta_cliente: { label: 'Resuelta: a tu favor',      color: '#16A34A', bg: 'rgba(22,163,74,0.08)'   },
  resuelta_host:    { label: 'Resuelta: a favor del host', color: '#7C3AED', bg: 'rgba(124,58,237,0.08)' },
  cerrada:          { label: 'Cerrada',                   color: '#6B7280', bg: 'rgba(107,114,128,0.08)' },
}

interface ExistingDispute {
  id: string
  status: DisputeStatus
  category: string
  reason: string
  created_at: string
  resolution?: string | null
  admin_notes?: string | null
}

interface Props {
  bookingId: string
  bookingStatus: string
  existingDispute?: ExistingDispute | null
}

export default function DisputeSection({ bookingId, bookingStatus, existingDispute }: Props) {
  const [open, setOpen]         = useState(false)
  const [category, setCategory] = useState<DisputeCategory | ''>('')
  const [reason, setReason]     = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]       = useState('')
  const [submitted, setSubmitted] = useState(false)

  const allowed = bookingStatus === 'confirmed' || bookingStatus === 'completed'
  if (!allowed) return null

  // Mostrar estado de disputa existente
  if (existingDispute || submitted) {
    const dispute  = existingDispute
    const statusCfg = dispute
      ? STATUS_CONFIG[dispute.status] ?? STATUS_CONFIG.abierta
      : STATUS_CONFIG.abierta

    return (
      <div className="mt-6 rounded-2xl overflow-hidden"
        style={{ border: '1px solid rgba(217,119,6,0.2)', background: 'rgba(217,119,6,0.04)' }}>
        <div className="flex items-center gap-3 px-5 py-4"
          style={{ borderBottom: '1px solid rgba(217,119,6,0.1)' }}>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'rgba(217,119,6,0.12)' }}>
            <ShieldAlert size={16} style={{ color: '#D97706' }} />
          </div>
          <div>
            <div className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
              Disputa activa
            </div>
            <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              {submitted && !dispute
                ? 'Tu disputa fue enviada y está siendo revisada.'
                : `Abierta el ${dispute ? new Date(dispute.created_at).toLocaleDateString('es-DO', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}`}
            </div>
          </div>
          {dispute && (
            <div className="ml-auto">
              <span className="text-xs font-semibold px-3 py-1.5 rounded-full"
                style={{ color: statusCfg.color, background: statusCfg.bg }}>
                {statusCfg.label}
              </span>
            </div>
          )}
        </div>

        {dispute && (
          <div className="px-5 py-4 space-y-3">
            <div>
              <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                Categoría:
              </span>
              <span className="text-sm font-semibold ml-2" style={{ color: 'var(--text-primary)' }}>
                {CATEGORY_LABELS[dispute.category as DisputeCategory] ?? dispute.category}
              </span>
            </div>
            <div>
              <span className="text-xs font-medium block mb-1" style={{ color: 'var(--text-muted)' }}>
                Descripción:
              </span>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                {dispute.reason}
              </p>
            </div>
            {dispute.resolution && (
              <div className="rounded-xl p-3.5"
                style={{ background: 'rgba(22,163,74,0.06)', border: '1px solid rgba(22,163,74,0.15)' }}>
                <span className="text-xs font-semibold block mb-1" style={{ color: '#16A34A' }}>
                  Resolución del equipo Espot:
                </span>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-primary)' }}>
                  {dispute.resolution}
                </p>
              </div>
            )}
            {dispute.admin_notes && (
              <div className="rounded-xl p-3.5"
                style={{ background: 'rgba(37,99,235,0.04)', border: '1px solid rgba(37,99,235,0.12)' }}>
                <span className="text-xs font-semibold block mb-1" style={{ color: '#2563EB' }}>
                  Notas adicionales:
                </span>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-primary)' }}>
                  {dispute.admin_notes}
                </p>
              </div>
            )}
          </div>
        )}

        {submitted && !dispute && (
          <div className="px-5 py-4 flex items-center gap-2.5">
            <CheckCircle2 size={16} style={{ color: '#16A34A' }} />
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Tu disputa fue recibida. Te contactaremos en las próximas 48 horas hábiles.
            </p>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="mt-6">
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-2.5 text-sm font-medium px-4 py-3 rounded-xl w-full transition-all"
          style={{
            color: '#D97706',
            background: 'rgba(217,119,6,0.06)',
            border: '1px solid rgba(217,119,6,0.18)',
          }}>
          <AlertTriangle size={15} />
          <span className="flex-1 text-left">¿Hay un problema con esta reserva?</span>
          <ChevronDown size={14} className="opacity-60" />
        </button>
      ) : (
        <div className="rounded-2xl overflow-hidden"
          style={{ border: '1px solid rgba(217,119,6,0.2)' }}>
          {/* Header */}
          <div className="flex items-center gap-3 px-5 py-4"
            style={{ background: 'rgba(217,119,6,0.05)', borderBottom: '1px solid rgba(217,119,6,0.12)' }}>
            <AlertTriangle size={16} style={{ color: '#D97706' }} />
            <div>
              <div className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                Abrir disputa
              </div>
              <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                El equipo de Espot revisará tu caso y mediará entre ambas partes.
              </div>
            </div>
            <button
              onClick={() => { setOpen(false); setError('') }}
              className="ml-auto text-xs px-3 py-1.5 rounded-lg transition-all"
              style={{ color: 'var(--text-muted)', background: 'rgba(0,0,0,0.05)' }}>
              Cancelar
            </button>
          </div>

          {/* Form */}
          <form
            onSubmit={async (e) => {
              e.preventDefault()
              if (!category) { setError('Selecciona una categoría'); return }
              if (reason.trim().length < 20) { setError('La descripción debe tener al menos 20 caracteres'); return }
              setSubmitting(true)
              setError('')
              const result = await openDispute(bookingId, reason, category as DisputeCategory)
              setSubmitting(false)
              if (result.error) { setError(result.error); return }
              setSubmitted(true)
              setOpen(false)
            }}
            className="px-5 py-5 space-y-4">

            {/* Categoría */}
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                Tipo de problema
              </label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value as DisputeCategory | '')}
                required
                className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
                style={{
                  background:  'var(--bg-elevated, #1C2332)',
                  border:      '1px solid var(--border-subtle, rgba(255,255,255,0.1))',
                  color:       'var(--text-primary)',
                  fontSize:    '16px', // previene zoom en iOS
                }}>
                <option value="" disabled>Selecciona una categoría…</option>
                {CATEGORY_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {/* Descripción */}
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                Descripción del problema
                <span className="font-normal ml-1" style={{ color: 'var(--text-muted)' }}>
                  (mín. 20 caracteres)
                </span>
              </label>
              <textarea
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder="Describe con detalle qué ocurrió, fechas relevantes, intentos de comunicación previos…"
                rows={5}
                required
                minLength={20}
                className="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none transition-all"
                style={{
                  background:  'var(--bg-elevated, #1C2332)',
                  border:      '1px solid var(--border-subtle, rgba(255,255,255,0.1))',
                  color:       'var(--text-primary)',
                  fontSize:    '16px',
                  lineHeight:  '1.6',
                }}
              />
              <div className="flex justify-between items-center mt-1">
                <span className="text-xs" style={{ color: reason.length >= 20 ? '#35C493' : 'var(--text-muted)' }}>
                  {reason.length} / mín. 20 caracteres
                </span>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm"
                style={{ background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.2)', color: '#DC2626' }}>
                <AlertTriangle size={14} />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-xl text-sm font-bold transition-all disabled:opacity-60"
              style={{ background: '#D97706', color: '#fff' }}>
              {submitting
                ? <><Loader2 size={15} className="animate-spin" /> Enviando disputa…</>
                : <><AlertTriangle size={14} /> Enviar disputa</>}
            </button>

            <p className="text-xs text-center" style={{ color: 'var(--text-muted)' }}>
              Recibirás un email de confirmación. El equipo Espot mediará de forma imparcial.
            </p>
          </form>
        </div>
      )}
    </div>
  )
}
