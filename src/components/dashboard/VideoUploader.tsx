'use client'

import { useState, useRef } from 'react'
import { Video, X, Loader2, Play, RotateCcw } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Props {
  initialUrl?: string
  onChange: (url: string, path: string) => void
  onRemove: () => void
}

export default function VideoUploader({ initialUrl, onChange, onRemove }: Props) {
  const [videoUrl,   setVideoUrl]   = useState(initialUrl ?? '')
  const [uploading,  setUploading]  = useState(false)
  const [progress,   setProgress]   = useState(0)
  const [dragOver,   setDragOver]   = useState(false)
  const [uploadError, setUploadError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  const ACCEPTED = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-m4v']
  const MAX_MB   = 200

  async function handleFile(file: File) {
    if (!ACCEPTED.includes(file.type)) {
      setUploadError('Formato no soportado. Usa MP4, MOV o WebM.')
      return
    }
    if (file.size > MAX_MB * 1024 * 1024) {
      setUploadError(`El video supera los ${MAX_MB}MB. Comprime el archivo e inténtalo de nuevo.`)
      return
    }

    setUploading(true)
    setUploadError('')
    setProgress(0)

    const ext  = file.name.split('.').pop()?.toLowerCase() ?? 'mp4'
    const path = `videos/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

    // Simula progreso mientras sube
    const progressInterval = setInterval(() => {
      setProgress(p => Math.min(p + 8, 85))
    }, 300)

    const { error } = await supabase.storage
      .from('space-images')
      .upload(path, file, { cacheControl: '3600', upsert: false })

    clearInterval(progressInterval)

    if (error) {
      setUploadError(`Error al subir el video: ${error.message}`)
      setUploading(false)
      setProgress(0)
      return
    }

    setProgress(100)
    const { data: { publicUrl } } = supabase.storage.from('space-images').getPublicUrl(path)

    setVideoUrl(publicUrl)
    onChange(publicUrl, path)
    setUploading(false)
    setProgress(0)
  }

  async function handleRemove() {
    // Extrae el path del storage desde la URL pública
    const match = videoUrl.match(/space-images\/(.+)$/)
    if (match) {
      await supabase.storage.from('space-images').remove([match[1]])
    }
    setVideoUrl('')
    onRemove()
  }

  if (videoUrl) {
    return (
      <div className="space-y-3">
        <div className="relative rounded-2xl overflow-hidden"
          style={{ aspectRatio: '16/9', background: '#000', border: '1.5px solid var(--border-medium)' }}>
          <video
            src={videoUrl}
            controls
            className="w-full h-full object-contain"
            preload="metadata"
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all"
            style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}>
            <RotateCcw size={13} /> Reemplazar video
          </button>
          <button
            type="button"
            onClick={handleRemove}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all"
            style={{ background: 'rgba(220,38,38,0.07)', color: '#DC2626', border: '1px solid rgba(220,38,38,0.15)' }}>
            <X size={13} /> Eliminar video
          </button>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="video/mp4,video/webm,video/quicktime,video/x-m4v"
          className="hidden"
          onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
        />
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
        onClick={() => !uploading && inputRef.current?.click()}
        className="rounded-2xl border-2 border-dashed p-8 text-center transition-all"
        style={{
          borderColor: dragOver ? 'var(--brand)' : 'var(--border-medium)',
          background:  dragOver ? 'rgba(53,196,147,0.04)' : 'var(--bg-elevated)',
          cursor: uploading ? 'wait' : 'pointer',
        }}>
        <input
          ref={inputRef}
          type="file"
          accept="video/mp4,video/webm,video/quicktime,video/x-m4v"
          className="hidden"
          onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
        />

        {uploading ? (
          <div className="flex flex-col items-center gap-3">
            <Loader2 size={28} className="animate-spin" style={{ color: 'var(--brand)' }} />
            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Subiendo video...</p>
            <div className="w-48 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border-medium)' }}>
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{ width: `${progress}%`, background: 'var(--brand)' }}
              />
            </div>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{progress}%</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(53,196,147,0.12)' }}>
              <Play size={22} style={{ color: 'var(--brand)' }} />
            </div>
            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              Arrastra tu video aquí
            </p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              o <span style={{ color: 'var(--brand)' }} className="underline underline-offset-2">haz click para seleccionar</span>
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              MP4, MOV, WebM · Máximo {MAX_MB}MB
            </p>
          </div>
        )}
      </div>

      {uploadError && (
        <p className="text-xs px-3 py-2.5 rounded-xl"
          style={{ background: 'rgba(220,38,38,0.06)', color: '#DC2626', border: '1px solid rgba(220,38,38,0.12)' }}>
          {uploadError}
        </p>
      )}
    </div>
  )
}
