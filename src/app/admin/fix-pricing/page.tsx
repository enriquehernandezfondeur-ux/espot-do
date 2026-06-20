'use client'

import { useState, useEffect } from 'react'
import { DollarSign, RefreshCw, CheckCircle, AlertCircle, Zap } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

export default function FixPricingPage() {
  const [preview, setPreview] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [result,  setResult]  = useState<any>(null)
  const [error,   setError]   = useState('')

  useEffect(() => { loadPreview() }, [])

  async function loadPreview() {
    setLoading(true)
    const res  = await fetch('/api/admin/fix-pricing')
    const data = await res.json()
    setPreview(data)
    setLoading(false)
  }

  async function applyFix() {
    const n = preview?.need_fix ?? 0
    if (!window.confirm(`Vas a escribir/corregir el precio de ${n} espacio(s) en producción. ¿Continuar?`)) return
    setLoading(true)
    setError('')
    try {
      const res  = await fetch('/api/admin/fix-pricing', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Error'); setLoading(false); return }
      setResult(data)
      setPreview(null)
    } catch (e: any) {
      setError(e.message)
    }
    setLoading(false)
  }

  const typeLabel = (t: string) =>
    t === 'hourly'              ? 'Por hora'        :
    t === 'minimum_consumption' ? 'Consumibles'  :
    t === 'fixed_package'       ? 'Paquete fijo'     : t

  return (
    <div className="p-6 md:p-10 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
        Corregir precios
      </h1>
      <p className="text-sm mb-8" style={{ color: 'var(--text-secondary)' }}>
        Aplica el precio correcto a los espacios que muestran "Cotizar" por falta de registro de precio.
      </p>

      {result && (
        <div className="rounded-2xl p-6 mb-6"
          style={{ background: 'rgba(22,163,74,0.07)', border: '1px solid rgba(22,163,74,0.2)' }}>
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle size={18} style={{ color: '#16A34A' }} />
            <span className="font-semibold text-sm" style={{ color: '#16A34A' }}>
              {result.fixed} espacio{result.fixed !== 1 ? 's' : ''} corregido{result.fixed !== 1 ? 's' : ''}
              {result.errors > 0 ? ` · ${result.errors} con error` : ''}
            </span>
          </div>
          <div className="space-y-1">
            {result.results?.map((r: any) => (
              <div key={r.slug} className="text-xs flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
                {r.status === 'created' || r.status === 'updated'
                  ? <span style={{ color: '#16A34A' }}>✓</span>
                  : r.status === 'skip' ? <span style={{ color: 'var(--text-muted)' }}>—</span>
                  : <span style={{ color: '#DC2626' }}>✗</span>}
                <span className="font-medium">{r.name}</span>
                <span style={{ color: 'var(--text-muted)' }}>{r.status}{r.reason ? `: ${r.reason}` : ''}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-2xl p-4 mb-6 flex items-center gap-2"
          style={{ background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.15)', color: '#DC2626' }}>
          <AlertCircle size={15} />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {loading && !preview && (
        <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-muted)' }}>
          <RefreshCw size={15} className="animate-spin" /> Cargando...
        </div>
      )}

      {preview && (
        <div className="rounded-2xl overflow-hidden mb-6" style={{ border: '1px solid var(--border-subtle)' }}>
          <div className="px-5 py-4 flex items-center justify-between"
            style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border-subtle)' }}>
            <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
              Total espacios: {preview.total}
            </span>
            <span className="text-xs font-semibold px-3 py-1 rounded-full"
              style={{ background: preview.need_fix > 0 ? 'rgba(234,179,8,0.1)' : 'rgba(22,163,74,0.1)',
                       color: preview.need_fix > 0 ? '#CA8A04' : '#16A34A' }}>
              {preview.need_fix > 0 ? `${preview.need_fix} sin precio correcto` : '✓ Todos tienen precio'}
            </span>
          </div>

          {preview.need_fix > 0 ? (
            <>
              <div className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
                {preview.spaces?.map((s: any) => (
                  <div key={s.slug} className="flex items-center gap-3 px-5 py-3">
                    <DollarSign size={14} style={{ color: 'var(--brand)', flexShrink: 0 }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{s.name}</p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {s.has_pricing ? 'Tiene pricing pero tipo incorrecto' : 'Sin registro de precio'}
                      </p>
                    </div>
                    {s.fix ? (
                      <div className="text-right shrink-0">
                        <p className="text-xs font-semibold" style={{ color: 'var(--brand)' }}>
                          {typeLabel(s.fix.type)}
                        </p>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                          {formatCurrency(s.fix.price)}
                        </p>
                      </div>
                    ) : (
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Sin mapeo</span>
                    )}
                  </div>
                ))}
              </div>

              <div className="px-5 py-4" style={{ borderTop: '1px solid var(--border-subtle)', background: 'var(--bg-elevated)' }}>
                <button
                  onClick={applyFix}
                  disabled={loading}
                  className="flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-sm transition-all disabled:opacity-40"
                  style={{ background: 'var(--brand)', color: 'var(--brand-navy)' }}>
                  {loading
                    ? <><RefreshCw size={15} className="animate-spin" /> Aplicando...</>
                    : <><Zap size={15} /> Corregir {preview.need_fix} espacio{preview.need_fix !== 1 ? 's' : ''}</>}
                </button>
              </div>
            </>
          ) : (
            <div className="px-5 py-8 text-sm text-center" style={{ color: 'var(--text-muted)' }}>
              Todos los espacios ya tienen precio configurado correctamente.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
