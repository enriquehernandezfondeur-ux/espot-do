'use client'

import { useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { X, Link2, Check, Share2 } from 'lucide-react'

interface ShareSheetProps {
  code: string
  title: string
  open: boolean
  onClose: () => void
}

/**
 * Hoja para compartir una actividad pública: enlace de solo-lectura,
 * copiar al portapapeles, QR del enlace y compartir (Web Share API con
 * fallback a WhatsApp). CTA primario en `var(--brand)`.
 */
export function ShareSheet({ code, title, open, onClose }: ShareSheetProps) {
  const [copied, setCopied] = useState(false)
  const url = `https://espot.do/a/${code}`

  if (!open) return null

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // El portapapeles puede no estar disponible (contexto no seguro): no romper.
    }
  }

  const handleShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title, url })
        return
      } catch {
        // El usuario canceló o falló: no abrir fallback.
        return
      }
    }
    const waUrl = `https://wa.me/?text=${encodeURIComponent(`${title} ${url}`)}`
    window.open(waUrl, '_blank', 'noopener,noreferrer')
  }

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: 'rgba(0,0,0,0.45)' }}
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-sm rounded-t-3xl sm:rounded-2xl p-5"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <p className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
            Compartir actividad
          </p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="flex items-center justify-center w-9 h-9 rounded-xl"
            style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* QR del enlace */}
        <div className="flex justify-center mb-5">
          <div className="p-3 rounded-2xl" style={{ background: '#fff', border: '1px solid var(--border-subtle)' }}>
            <QRCodeSVG value={url} size={180} />
          </div>
        </div>

        {/* URL pública (solo lectura) */}
        <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>
          Enlace público
        </label>
        <input
          type="text"
          readOnly
          value={url}
          onFocus={e => e.currentTarget.select()}
          className="w-full px-3 py-3 rounded-xl mb-3"
          style={{
            fontSize: '16px',
            background: 'var(--bg-elevated)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-subtle)',
          }}
        />

        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={handleCopy}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-bold"
            style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)' }}
          >
            {copied ? <Check size={18} /> : <Link2 size={18} />}
            {copied ? '¡Copiado!' : 'Copiar enlace'}
          </button>

          <button
            type="button"
            onClick={handleShare}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-bold"
            style={{ background: 'var(--brand)', color: '#fff' }}
          >
            <Share2 size={18} />
            Compartir
          </button>
        </div>
      </div>
    </div>
  )
}
