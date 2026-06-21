'use client'

import { useState } from 'react'
import { X, Copy, Check, Send } from 'lucide-react'
import { toWhatsappNumber } from '@/lib/activities/phone'
import type { ActivityParticipant } from '@/lib/activities/types'

export function ReminderSheet({
  open, onClose, title, dateLine, location, code, participants,
}: {
  open: boolean
  onClose: () => void
  title: string
  dateLine: string | null
  location: string | null
  code: string
  participants: ActivityParticipant[]
}) {
  const url = `https://espot.do/a/${code}`
  const defaultMsg =
    `Recordatorio 📅 ${title}\n` +
    `${[dateLine, location].filter(Boolean).join(' · ')}\n\n` +
    `Detalles y confirmación: ${url}`

  const [msg, setMsg] = useState(defaultMsg)
  const [copied, setCopied] = useState(false)

  if (!open) return null

  const withPhone = participants.filter(p => toWhatsappNumber(p.contact))
  const broadcast = `https://wa.me/?text=${encodeURIComponent(msg)}`

  async function copy() {
    try {
      await navigator.clipboard.writeText(msg)
      setCopied(true); setTimeout(() => setCopied(false), 2000)
    } catch { /* noop */ }
  }

  return (
    <>
      <div className="fixed inset-0 z-[70] bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4">
        <div className="w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-6 space-y-4 max-h-[90vh] overflow-y-auto"
          style={{ background: 'var(--bg-card)', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}
          onClick={e => e.stopPropagation()}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>Enviar recordatorio</h3>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                Tú lo envías desde tu WhatsApp. Gratis y sin límite.
              </p>
            </div>
            <button type="button" onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}><X size={16} /></button>
          </div>

          {/* Mensaje editable */}
          <textarea value={msg} onChange={e => setMsg(e.target.value)} rows={5}
            className="w-full rounded-xl p-3 resize-none"
            style={{ fontSize: 16, background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', outline: 'none' }} />

          {/* Acciones principales */}
          <div className="flex gap-2">
            <button type="button" onClick={copy}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold"
              style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)' }}>
              {copied ? <><Check size={15} /> Copiado</> : <><Copy size={15} /> Copiar</>}
            </button>
            <a href={broadcast} target="_blank" rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-bold"
              style={{ background: 'var(--brand)', color: '#fff' }}>
              <Send size={15} /> WhatsApp
            </a>
          </div>

          {/* Envío individual a quien dejó teléfono */}
          {withPhone.length > 0 && (
            <div className="pt-1">
              <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>
                Enviar a quien dejó teléfono
              </p>
              <div className="space-y-1.5">
                {withPhone.map(p => {
                  const num = toWhatsappNumber(p.contact)!
                  const href = `https://wa.me/${num}?text=${encodeURIComponent(msg)}`
                  return (
                    <a key={p.id} href={href} target="_blank" rel="noopener noreferrer"
                      className="flex items-center justify-between gap-2 rounded-xl px-3.5 py-2.5"
                      style={{ background: 'var(--bg-elevated)' }}>
                      <span className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{p.name}</span>
                      <span className="flex items-center gap-1 text-xs font-bold shrink-0" style={{ color: 'var(--brand)' }}>
                        <Send size={13} /> Enviar
                      </span>
                    </a>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
