'use client'

import { useState, useEffect } from 'react'
import { Trash2, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react'

export default function CleanupPage() {
  const [preview, setPreview]   = useState<any>(null)
  const [loading, setLoading]   = useState(false)
  const [result,  setResult]    = useState<any>(null)
  const [error,   setError]     = useState('')

  useEffect(() => { loadPreview() }, [])

  async function loadPreview() {
    setLoading(true)
    const res  = await fetch('/api/admin/cleanup-spaces')
    const data = await res.json()
    setPreview(data)
    setLoading(false)
  }

  async function deleteSpaces() {
    const n = preview?.to_delete ?? 0
    if (!window.confirm(`Vas a eliminar ${n} espacio(s) de forma permanente. Esta acción no se puede deshacer.\n\n¿Continuar?`)) return
    setLoading(true)
    setError('')
    try {
      const res  = await fetch('/api/admin/cleanup-spaces', { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Error'); setLoading(false); return }
      setResult(data)
      setPreview(null)
    } catch (e: any) {
      setError(e.message)
    }
    setLoading(false)
  }

  return (
    <div className="p-6 md:p-10 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
        Limpieza de espacios
      </h1>
      <p className="text-sm mb-8" style={{ color: 'var(--text-secondary)' }}>
        Elimina todos los espacios que no forman parte de la migración oficial.
      </p>

      {result && (
        <div className="rounded-2xl p-6 mb-6 flex items-start gap-3"
          style={{ background: 'rgba(22,163,74,0.07)', border: '1px solid rgba(22,163,74,0.2)' }}>
          <CheckCircle size={20} style={{ color: '#16A34A', flexShrink: 0, marginTop: 2 }} />
          <div>
            <p className="font-semibold text-sm" style={{ color: '#16A34A' }}>{result.message}</p>
            {result.deleted_spaces?.map((s: any) => (
              <p key={s.slug} className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>— {s.name}</p>
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
              Espacios en la base de datos: {preview.total}
            </span>
            <div className="flex items-center gap-4 text-xs font-medium">
              <span className="inline-flex items-center gap-1" style={{ color: '#16A34A' }}><CheckCircle size={13} /> Conservar: {preview.keep}</span>
              <span className="inline-flex items-center gap-1" style={{ color: '#DC2626' }}><Trash2 size={13} /> Eliminar: {preview.to_delete}</span>
            </div>
          </div>

          {preview.to_delete > 0 ? (
            <>
              <div className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
                {preview.spaces_to_delete.map((s: any) => (
                  <div key={s.id} className="flex items-center gap-3 px-5 py-3">
                    <Trash2 size={14} style={{ color: '#DC2626', flexShrink: 0 }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{s.name}</p>
                      <p className="text-xs font-mono truncate" style={{ color: 'var(--text-muted)' }}>{s.slug}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="px-5 py-4" style={{ borderTop: '1px solid var(--border-subtle)', background: 'var(--bg-elevated)' }}>
                <button
                  onClick={deleteSpaces}
                  disabled={loading}
                  className="flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-sm transition-all disabled:opacity-40"
                  style={{ background: '#DC2626', color: '#fff' }}>
                  {loading
                    ? <><RefreshCw size={15} className="animate-spin" /> Eliminando...</>
                    : <><Trash2 size={15} /> Eliminar {preview.to_delete} espacios</>}
                </button>
              </div>
            </>
          ) : (
            <div className="px-5 py-6 text-sm text-center" style={{ color: 'var(--text-muted)' }}>
              No hay espacios para eliminar.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
