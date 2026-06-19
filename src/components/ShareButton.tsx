'use client'

import { useState } from 'react'
import { Share2, Check } from 'lucide-react'

/** Compartir nativo (Web Share API) con fallback a copiar al portapapeles. */
export function ShareButton({ url, title, className = '', style }: {
  url: string
  title: string
  className?: string
  style?: React.CSSProperties
}) {
  const [copied, setCopied] = useState(false)

  async function onShare() {
    try {
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({ title, url })
        return
      }
    } catch { /* el usuario canceló o no soportado → fallback */ }
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* ignorar */ }
  }

  return (
    <button onClick={onShare} className={className} style={style}>
      {copied ? <Check size={16} /> : <Share2 size={16} />}
      {copied ? 'Enlace copiado' : 'Compartir'}
    </button>
  )
}
