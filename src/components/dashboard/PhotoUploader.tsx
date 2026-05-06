'use client'

import { useState, useRef } from 'react'
import { Upload, X, Star, Loader2, ImagePlus } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

interface Photo { url: string; path: string; isCover: boolean }

interface Props {
  spaceId?: string
  onChange: (photos: Photo[]) => void
}

export default function PhotoUploader({ spaceId, onChange }: Props) {
  const [photos, setPhotos]         = useState<Photo[]>([])
  const [uploading, setUploading]   = useState(false)
  const [dragOver, setDragOver]     = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [dragIdx, setDragIdx]       = useState<number | null>(null)
  const [overIdx, setOverIdx]       = useState<number | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  // ── Drag & drop reordering ─────────────────────────────
  function onDragStart(i: number) {
    setDragIdx(i)
  }

  function onDragEnter(i: number) {
    setOverIdx(i)
  }

  function onDragEnd() {
    if (dragIdx === null || overIdx === null || dragIdx === overIdx) {
      setDragIdx(null); setOverIdx(null); return
    }
    const next = [...photos]
    const [moved] = next.splice(dragIdx, 1)
    next.splice(overIdx, 0, moved)
    // La primera siempre es portada
    const updated = next.map((p, i) => ({ ...p, isCover: i === 0 }))
    setPhotos(updated)
    onChange(updated)
    setDragIdx(null)
    setOverIdx(null)
  }

  async function uploadFiles(files: FileList) {
    if (!files.length) return
    setUploading(true)
    setUploadError('')

    const uploaded: Photo[] = []
    const folder = spaceId ? `spaces/${spaceId}` : `temp/${Date.now()}`

    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) continue
      if (file.size > 10 * 1024 * 1024) {
        setUploadError(`"${file.name}" supera los 10MB`)
        continue
      }
      const ext = file.name.split('.').pop()
      const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

      const { error } = await supabase.storage
        .from('space-images')
        .upload(path, file, { cacheControl: '3600', upsert: false })

      if (error) {
        setUploadError(`Error al subir ${file.name}: ${error.message}`)
      } else {
        const { data: { publicUrl } } = supabase.storage.from('space-images').getPublicUrl(path)
        console.log('[PhotoUploader] URL generada:', publicUrl)
        uploaded.push({ url: publicUrl, path, isCover: false })
      }
    }

    const next = [...photos, ...uploaded].map((p, i) => ({ ...p, isCover: i === 0 }))
    setPhotos(next)
    onChange(next)
    setUploading(false)
  }

  function setCover(index: number) {
    const next = photos.map((p, i) => ({ ...p, isCover: i === index }))
    setPhotos(next)
    onChange(next)
  }

  async function remove(index: number) {
    const photo = photos[index]
    await supabase.storage.from('space-images').remove([photo.path])
    const next = photos.filter((_, i) => i !== index).map((p, i) => ({ ...p, isCover: i === 0 }))
    setPhotos(next)
    onChange(next)
  }

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => { e.preventDefault(); setDragOver(false); uploadFiles(e.dataTransfer.files) }}
        onClick={() => inputRef.current?.click()}
        className={cn(
          'border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all',
          dragOver ? 'border-[#35C493] bg-[rgba(53,196,147,0.05)]' : 'border-gray-200 hover:border-[#35C493] hover:bg-[rgba(53,196,147,0.03)]'
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={e => e.target.files && uploadFiles(e.target.files)}
        />
        {uploading ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="w-8 h-8 text-[#35C493] animate-spin" />
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Subiendo fotos...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <div className="w-12 h-12 bg-[rgba(53,196,147,0.12)] rounded-xl flex items-center justify-center">
              <ImagePlus className="w-6 h-6 text-[#35C493]" />
            </div>
            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              Arrastra tus fotos aquí
            </p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              o <span className="text-[#35C493] underline underline-offset-2">haz click para seleccionar</span>
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>JPG, PNG · Máximo 10MB por foto · La primera es la portada</p>
          </div>
        )}
      </div>

      {uploadError && (
        <div className="text-xs px-3 py-2 rounded-xl"
          style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#EF4444' }}>
          {uploadError}
        </div>
      )}

      {/* Grid de fotos */}
      {photos.length > 0 && (
        <div className="grid grid-cols-4 gap-3">
          {photos.map((photo, i) => (
            <div
              key={i}
              draggable
              onDragStart={() => onDragStart(i)}
              onDragEnter={() => onDragEnter(i)}
              onDragEnd={onDragEnd}
              onDragOver={e => e.preventDefault()}
              className="relative group rounded-xl overflow-hidden aspect-video cursor-grab active:cursor-grabbing transition-all duration-150"
              style={{
                background: 'var(--bg-elevated)',
                opacity: dragIdx === i ? 0.4 : 1,
                transform: overIdx === i && dragIdx !== i ? 'scale(1.03)' : 'scale(1)',
                outline: overIdx === i && dragIdx !== i ? '2px solid #35C493' : 'none',
                outlineOffset: '2px',
              }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo.url} alt="" className="w-full h-full object-cover" />

              {/* Overlay on hover */}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <button
                  onClick={e => { e.stopPropagation(); setCover(i) }}
                  title="Establecer como portada"
                  className={cn(
                    'p-1.5 rounded-lg transition-colors',
                    photo.isCover ? 'bg-amber-500 text-white' : 'bg-white/20 text-white hover:bg-amber-500'
                  )}
                >
                  <Star size={14} />
                </button>
                <button
                  onClick={e => { e.stopPropagation(); remove(i) }}
                  className="p-1.5 rounded-lg bg-red-500/80 text-white hover:bg-red-500 transition-colors"
                >
                  <X size={14} />
                </button>
              </div>

              {/* Cover badge */}
              {photo.isCover && (
                <div className="absolute top-1.5 left-1.5 bg-amber-500 text-white text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                  <Star size={10} /> Portada
                </div>
              )}

              {/* Number */}
              <div className="absolute bottom-1.5 right-1.5 bg-black/50 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                {i + 1}
              </div>
            </div>
          ))}

          {/* Add more */}
          {photos.length < 10 && (
            <button
              onClick={() => inputRef.current?.click()}
              className="aspect-video rounded-xl border-2 border-dashed border-gray-200 hover:border-[#35C493] flex items-center justify-center transition-all" style={{ color: 'var(--text-muted)' }}
            >
              <Upload size={20} />
            </button>
          )}
        </div>
      )}

      {photos.length > 0 && (
        <p className="text-slate-500 text-xs">
          {photos.length}/10 fotos · Arrastra para reordenar · La primera foto es la portada
        </p>
      )}
    </div>
  )
}
