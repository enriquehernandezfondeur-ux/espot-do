'use client'

import { useState, useRef } from 'react'
import { Upload, Play, AlertCircle, CheckCircle, SkipForward, FileJson, Download, RefreshCw } from 'lucide-react'

interface MigResult {
  name: string
  slug: string
  status: 'ok' | 'skip' | 'error'
  reason?: string
}

interface Summary { ok: number; skip: number; error: number; total: number }

export default function MigracionPage() {
  const [json,       setJson]       = useState('')
  const [dryRun,     setDryRun]     = useState(true)
  const [loading,    setLoading]    = useState(false)
  const [results,    setResults]    = useState<MigResult[] | null>(null)
  const [summary,    setSummary]    = useState<Summary | null>(null)
  const [parseError, setParseError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      setJson(ev.target?.result as string)
      setParseError('')
      setResults(null)
    }
    reader.readAsText(file)
  }

  function validate(): any[] | null {
    try {
      const parsed = JSON.parse(json)
      if (!Array.isArray(parsed)) { setParseError('El JSON debe ser un array []'); return null }
      setParseError('')
      return parsed
    } catch (e: any) {
      setParseError(`JSON inválido: ${e.message}`)
      return null
    }
  }

  async function runMigration() {
    const records = validate()
    if (!records) return
    setLoading(true)
    setResults(null)
    setSummary(null)
    try {
      const res = await fetch('/api/admin/migrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ records, dryRun }),
      })
      const data = await res.json()
      if (!res.ok) { setParseError(data.error ?? 'Error en la migración'); return }
      setResults(data.results)
      setSummary(data.summary)
    } catch (e: any) {
      setParseError(e.message)
    } finally {
      setLoading(false)
    }
  }

  function downloadTemplate() {
    const template = [{
      _source_id: 'wp-123',
      _source_url: 'https://espot.do/espacio/ejemplo',
      name: 'Salón Ejemplo',
      slug: 'salon-ejemplo',
      category: 'salon',
      description: 'Descripción del espacio...',
      address: 'Av. Winston Churchill #123',
      sector: 'Piantini',
      city: 'Santo Domingo',
      lat: '18.4733',
      lng: '-69.9388',
      capacity_min: 20,
      capacity_max: 150,
      is_published: true,
      host_email: 'propietario@email.com',
      pricing: { type: 'hourly', hourly_price: 5000, min_hours: 2, max_hours: 8 },
      payment_terms: { term_type: 'platform_guarantee' },
      time_blocks: [{ block_name: 'Horario principal', start_time: '08:00', end_time: '23:00', days_of_week: [0,1,2,3,4,5,6] }],
      addons: [{ name: 'Bartender', price: 8000, unit: 'evento' }],
      conditions: { allows_external_decoration: true, allows_external_food: false, allows_external_alcohol: false, allows_smoking: false, allows_pets: false, cancellation_policy: 'moderada', cancellation_hours_before: 72, cancellation_refund_pct: 50 },
      images: ['https://espot.do/wp-content/uploads/foto.jpg'],
      cover_image_index: 0,
      video_url: null,
    }]
    const blob = new Blob([JSON.stringify(template, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'espots-template.json'
    a.click()
  }

  const recordCount = (() => {
    try { const p = JSON.parse(json); return Array.isArray(p) ? p.filter((r: any) => !r._comment).length : 0 } catch { return 0 }
  })()

  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
          Migración de Espots
        </h1>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Importa espacios desde espot.do u otras fuentes hacia EspotHub.
          Descarga la plantilla, complétala con tus datos y sube el archivo.
        </p>
      </div>

      {/* Paso 1: Plantilla */}
      <div className="rounded-2xl p-5 mb-5" style={{ background: '#fff', border: '1px solid var(--border-subtle)' }}>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ background: 'var(--brand)' }}>1</div>
          <h2 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Descarga la plantilla JSON</h2>
        </div>
        <p className="text-xs mb-3" style={{ color: 'var(--text-secondary)' }}>
          Completa la plantilla con la información de tus espacios.
          Cada campo está documentado. Puedes tener múltiples espots en el mismo archivo.
        </p>
        <button onClick={downloadTemplate}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
          style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border-medium)' }}>
          <Download size={15} /> Descargar plantilla
        </button>
      </div>

      {/* Paso 2: Subir JSON */}
      <div className="rounded-2xl p-5 mb-5" style={{ background: '#fff', border: '1px solid var(--border-subtle)' }}>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ background: 'var(--brand)' }}>2</div>
          <h2 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Sube tu archivo JSON</h2>
        </div>
        <div
          onClick={() => fileRef.current?.click()}
          className="border-2 border-dashed rounded-xl p-6 text-center cursor-pointer mb-3 transition-colors"
          style={{ borderColor: json ? 'var(--brand)' : 'var(--border-medium)', background: json ? 'rgba(53,196,147,0.03)' : 'var(--bg-elevated)' }}>
          <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={handleFile} />
          <FileJson size={28} className="mx-auto mb-2" style={{ color: json ? 'var(--brand)' : 'var(--text-muted)' }} />
          <p className="text-sm font-medium" style={{ color: json ? 'var(--brand)' : 'var(--text-secondary)' }}>
            {json ? `✓ Archivo cargado (${recordCount} espacio${recordCount !== 1 ? 's' : ''} detectado${recordCount !== 1 ? 's' : ''})` : 'Click para seleccionar archivo .json'}
          </p>
        </div>

        {/* O pegar JSON directamente */}
        <details className="text-xs">
          <summary className="cursor-pointer font-medium mb-2" style={{ color: 'var(--text-muted)' }}>
            O pega el JSON directamente
          </summary>
          <textarea
            value={json}
            onChange={e => { setJson(e.target.value); setParseError(''); setResults(null) }}
            rows={8}
            placeholder='[{"name":"Mi Espacio",...}]'
            className="w-full rounded-xl px-4 py-3 font-mono text-xs focus:outline-none resize-none"
            style={{ background: 'var(--bg-elevated)', border: '1.5px solid var(--border-medium)', color: 'var(--text-primary)' }}
          />
        </details>

        {parseError && (
          <div className="flex items-start gap-2 mt-3 px-4 py-3 rounded-xl"
            style={{ background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.15)', color: '#DC2626' }}>
            <AlertCircle size={14} className="mt-0.5 shrink-0" />
            <span className="text-xs">{parseError}</span>
          </div>
        )}
      </div>

      {/* Paso 3: Ejecutar */}
      <div className="rounded-2xl p-5 mb-5" style={{ background: '#fff', border: '1px solid var(--border-subtle)' }}>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ background: 'var(--brand)' }}>3</div>
          <h2 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Ejecutar migración</h2>
        </div>

        <label className="flex items-center gap-3 cursor-pointer mb-4">
          <div className="relative">
            <input type="checkbox" className="sr-only" checked={dryRun} onChange={e => setDryRun(e.target.checked)} />
            <div className="w-10 h-5 rounded-full transition-colors" style={{ background: dryRun ? 'var(--brand)' : 'var(--border-medium)' }} />
            <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${dryRun ? 'left-5' : 'left-0.5'}`} />
          </div>
          <div>
            <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              {dryRun ? 'Modo simulación (Dry Run)' : 'Modo producción — escribe en la BD'}
            </span>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {dryRun ? 'Simula la importación sin guardar nada. Úsalo para validar primero.' : '⚠️ Escribe registros reales en Supabase. Descarga imágenes.'}
            </p>
          </div>
        </label>

        <button
          onClick={runMigration}
          disabled={loading || !json.trim()}
          className="flex items-center gap-2.5 px-6 py-3 rounded-2xl font-bold text-sm transition-all disabled:opacity-40"
          style={{ background: dryRun ? '#0F1623' : 'var(--brand)', color: '#fff' }}>
          {loading
            ? <><RefreshCw size={16} className="animate-spin" /> Procesando...</>
            : <><Play size={16} /> {dryRun ? 'Simular importación' : `Importar ${recordCount} espacio${recordCount !== 1 ? 's' : ''}`}</>
          }
        </button>
      </div>

      {/* Resultados */}
      {results && summary && (
        <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border-subtle)' }}>
          {/* Summary */}
          <div className="px-5 py-4 flex items-center gap-6" style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border-subtle)' }}>
            <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              Resultados{dryRun ? ' (simulación)' : ''}
            </span>
            <div className="flex items-center gap-4 text-xs font-medium ml-auto">
              <span className="flex items-center gap-1.5" style={{ color: '#16A34A' }}>
                <CheckCircle size={13} /> {summary.ok} ok
              </span>
              <span className="flex items-center gap-1.5" style={{ color: '#D97706' }}>
                <SkipForward size={13} /> {summary.skip} saltados
              </span>
              <span className="flex items-center gap-1.5" style={{ color: '#DC2626' }}>
                <AlertCircle size={13} /> {summary.error} errores
              </span>
            </div>
          </div>

          {/* Rows */}
          <div className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
            {results.map((r, i) => (
              <div key={i} className="flex items-center gap-3 px-5 py-3 text-sm">
                {r.status === 'ok'    && <CheckCircle size={15} style={{ color: '#16A34A', flexShrink: 0 }} />}
                {r.status === 'skip'  && <SkipForward size={15} style={{ color: '#D97706', flexShrink: 0 }} />}
                {r.status === 'error' && <AlertCircle size={15} style={{ color: '#DC2626', flexShrink: 0 }} />}
                <span className="flex-1 font-medium" style={{ color: 'var(--text-primary)' }}>{r.name}</span>
                <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{r.slug}</span>
                {r.reason && <span className="text-xs" style={{ color: r.status === 'error' ? '#DC2626' : 'var(--text-muted)' }}>{r.reason}</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
