'use client'

import { AlertTriangle, RotateCw } from 'lucide-react'

/**
 * Estado de error de carga, con reintento. Reemplaza el antipatrón de "carga
 * fallida → estado vacío" (que hacía indistinguible un fallo de backend de
 * "no tienes datos"). Usar cuando una carga inicial falla.
 */
export function LoadError({
  message = 'No pudimos cargar esta información.',
  onRetry,
}: {
  message?: string
  onRetry?: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3"
        style={{ background: 'rgba(220,38,38,0.08)' }}>
        <AlertTriangle size={22} style={{ color: 'var(--danger)' }} />
      </div>
      <p className="font-semibold text-sm mb-1" style={{ color: 'var(--text-primary)' }}>
        Algo salió mal
      </p>
      <p className="text-sm mb-4 max-w-xs" style={{ color: 'var(--text-muted)' }}>{message}</p>
      {onRetry && (
        <button onClick={onRetry}
          className="inline-flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-xl transition-all"
          style={{ background: 'var(--brand)', color: '#fff' }}>
          <RotateCw size={14} /> Reintentar
        </button>
      )}
    </div>
  )
}
