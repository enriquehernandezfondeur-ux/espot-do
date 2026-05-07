'use client'

import { useState, useRef } from 'react'
import { FileText, X, Upload, Loader2, Download } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Props {
  initialUrl?: string
  initialName?: string
  onChange: (url: string, name: string) => void
  onRemove: () => void
}

export default function MenuUploader({ initialUrl, initialName, onChange, onRemove }: Props) {
  const [url,       setUrl]       = useState(initialUrl ?? '')
  const [fileName,  setFileName]  = useState(initialName ?? '')
  const [uploading, setUploading] = useState(false)
  const [error,     setError]     = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  const ACCEPTED = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ]
  const MAX_MB = 20

  async function handleFile(file: File) {
    if (!ACCEPTED.includes(file.type)) {
      setError('Solo se permiten archivos PDF o Word (.doc, .docx)')
      return
    }
    if (file.size > MAX_MB * 1024 * 1024) {
      setError(`El archivo supera los ${MAX_MB}MB`)
      return
    }

    setUploading(true)
    setError('')

    const ext  = file.name.split('.').pop()?.toLowerCase() ?? 'pdf'
    const path = `menus/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

    const { error: upErr } = await supabase.storage
      .from('space-images')
      .upload(path, file, { cacheControl: '3600', upsert: false })

    if (upErr) {
      setError(`Error al subir: ${upErr.message}`)
      setUploading(false)
      return
    }

    const { data: { publicUrl } } = supabase.storage.from('space-images').getPublicUrl(path)
    setUrl(publicUrl)
    setFileName(file.name)
    onChange(publicUrl, file.name)
    setUploading(false)
  }

  async function handleRemove() {
    // Extraer path del storage desde la URL
    const match = url.match(/space-images\/(.+)$/)
    if (match) await supabase.storage.from('space-images').remove([match[1]])
    setUrl('')
    setFileName('')
    onRemove()
  }

  if (url) {
    return (
      <div className="flex items-center gap-3 px-4 py-3.5 rounded-2xl"
        style={{ background: '#fff', border: '1.5px solid var(--brand-border)' }}>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: 'var(--brand-dim)' }}>
          <FileText size={18} style={{ color: 'var(--brand)' }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
            {fileName || 'Menú subido'}
          </p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Listo para descargar por los clientes</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <a href={url} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-xl transition-all"
            style={{ background: 'var(--brand-dim)', color: 'var(--brand)', border: '1px solid var(--brand-border)' }}>
            <Download size={12} /> Ver
          </a>
          <button type="button" onClick={handleRemove}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-xl transition-all"
            style={{ background: 'rgba(220,38,38,0.07)', color: '#DC2626', border: '1px solid rgba(220,38,38,0.15)' }}>
            <X size={12} /> Quitar
          </button>
        </div>
        <input ref={inputRef} type="file" accept=".pdf,.doc,.docx" className="hidden"
          onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div
        onDragOver={e => e.preventDefault()}
        onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
        onClick={() => !uploading && inputRef.current?.click()}
        className="flex items-center gap-4 px-4 py-4 rounded-2xl border-2 border-dashed cursor-pointer transition-all"
        style={{ borderColor: 'var(--border-medium)', background: 'var(--bg-elevated)' }}>
        <input ref={inputRef} type="file" accept=".pdf,.doc,.docx" className="hidden"
          onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: '#fff', border: '1px solid var(--border-subtle)' }}>
          {uploading ? <Loader2 size={18} className="animate-spin" style={{ color: 'var(--brand)' }} />
                     : <Upload size={18} style={{ color: 'var(--text-muted)' }} />}
        </div>
        <div>
          <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            {uploading ? 'Subiendo...' : 'Subir menú o carta'}
          </p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            PDF, Word · Máximo {MAX_MB}MB
          </p>
        </div>
      </div>
      {error && (
        <p className="text-xs px-3 py-2 rounded-xl"
          style={{ background: 'rgba(220,38,38,0.06)', color: '#DC2626', border: '1px solid rgba(220,38,38,0.1)' }}>
          {error}
        </p>
      )}
    </div>
  )
}
