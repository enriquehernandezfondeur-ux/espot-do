'use client'

import { useState, useRef } from 'react'
import { Upload, X, Star, Loader2, ImagePlus, Pencil } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

interface Photo { url: string; path: string; isCover: boolean }

interface Props {
  spaceId?:       string
  onChange:       (photos: Photo[]) => void
  initialPhotos?: Photo[]
}

export default function PhotoUploader({ spaceId, onChange, initialPhotos }: Props) {
  const [photos, setPhotos]           = useState<Photo[]>(initialPhotos ?? [])
  const [uploading, setUploading]     = useState(false)
  const [dragOver, setDragOver]       = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [dragIdx, setDragIdx]         = useState<number | null>(null)
  const [overIdx, setOverIdx]         = useState<number | null>(null)
  const [activeIdx, setActiveIdx]     = useState<number | null>(null)  // para touch
  const inputRef    = useRef<HTMLInputElement>(null)
  const supabaseRef = useRef(createClient())
  const supabase    = supabaseRef.current

  // ── Reordenar por drag ────────────────────────────────────
  function onDragStart(i: number) { setDragIdx(i) }
  function onDragEnter(i: number) { setOverIdx(i) }
  function onDragEnd() {
    if (dragIdx === null || overIdx === null || dragIdx === overIdx) {
      setDragIdx(null); setOverIdx(null); return
    }
    const next = [...photos]
    const [moved] = next.splice(dragIdx, 1)
    next.splice(overIdx, 0, moved)
    const updated = next.map((p, i) => ({ ...p, isCover: i === 0 }))
    setPhotos(updated); onChange(updated)
    setDragIdx(null); setOverIdx(null)
  }

  // ── Subir archivos ────────────────────────────────────────
  async function uploadFiles(files: FileList) {
    if (!files.length) return
    setUploading(true); setUploadError('')

    const uploaded: Photo[] = []
    const folder = spaceId ? `spaces/${spaceId}` : `temp/${Date.now()}`

    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) continue
      if (file.size > 10 * 1024 * 1024) { setUploadError(`"${file.name}" supera los 10MB`); continue }
      const ext  = file.name.split('.').pop()
      const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { error } = await supabase.storage.from('space-images').upload(path, file, { cacheControl: '3600', upsert: false })
      if (error) { setUploadError(`Error al subir ${file.name}: ${error.message}`) }
      else {
        const { data: { publicUrl } } = supabase.storage.from('space-images').getPublicUrl(path)
        uploaded.push({ url: publicUrl, path, isCover: false })
      }
    }

    const next = [...photos, ...uploaded].map((p, i) => ({ ...p, isCover: i === 0 }))
    setPhotos(next); onChange(next); setUploading(false)
  }

  function setCover(index: number) {
    const next = photos.map((p, i) => ({ ...p, isCover: i === index }))
    setPhotos(next); onChange(next)
  }

  async function remove(index: number) {
    const photo = photos[index]
    // path puede ser null si la foto fue cargada antes de que se guardara el path en DB.
    // Fallback: extraer el path del public URL de Supabase Storage.
    const storagePath = photo.path || (() => {
      const marker = '/object/public/space-images/'
      const idx = photo.url.indexOf(marker)
      return idx !== -1 ? decodeURIComponent(photo.url.slice(idx + marker.length).split('?')[0]) : null
    })()
    if (storagePath) await supabase.storage.from('space-images').remove([storagePath])
    const next = photos.filter((_, i) => i !== index).map((p, i) => ({ ...p, isCover: i === 0 }))
    setPhotos(next); onChange(next)
    if (activeIdx === index) setActiveIdx(null)
  }

  return (
    <div className="space-y-3">

      {/* Drop zone — toca para seleccionar en mobile */}
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => { e.preventDefault(); setDragOver(false); uploadFiles(e.dataTransfer.files) }}
        onClick={() => inputRef.current?.click()}
        className={cn(
          'border-2 border-dashed rounded-2xl p-5 md:p-8 text-center cursor-pointer transition-all',
          dragOver
            ? 'border-[var(--brand)] bg-[rgba(53,196,147,0.05)]'
            : 'border-[var(--border-medium)] hover:border-[var(--brand)] hover:bg-[rgba(53,196,147,0.03)]'
        )}>
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
            <Loader2 className="w-7 h-7 animate-spin" style={{ color: 'var(--brand)' }} />
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Subiendo fotos...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: 'rgba(53,196,147,0.12)' }}>
              <ImagePlus className="w-5 h-5" style={{ color: 'var(--brand)' }} />
            </div>
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              Subir fotos del espacio
            </p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              <span style={{ color: 'var(--brand)' }}>Toca para seleccionar</span> · JPG o PNG
            </p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Máx. 10MB · La primera foto es la portada</p>
          </div>
        )}
      </div>

      {uploadError && (
        <div className="text-xs px-3 py-2 rounded-xl flex items-center gap-2"
          style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: 'var(--danger)' }}>
          <X size={12} className="shrink-0" /> {uploadError}
        </div>
      )}

      {/* Grid de fotos — 3 cols en mobile, 4 en desktop */}
      {photos.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 md:gap-3">
          {photos.map((photo, i) => (
            <div
              key={i}
              draggable
              onDragStart={() => onDragStart(i)}
              onDragEnter={() => onDragEnter(i)}
              onDragEnd={onDragEnd}
              onDragOver={e => e.preventDefault()}
              // Touch: tap para activar/desactivar acciones
              onClick={() => setActiveIdx(activeIdx === i ? null : i)}
              className="relative rounded-xl overflow-hidden cursor-pointer transition-all duration-150"
              style={{
                aspectRatio: '4/3',
                background: 'var(--bg-elevated)',
                opacity:   dragIdx === i ? 0.4 : 1,
                transform: overIdx === i && dragIdx !== i ? 'scale(1.03)' : 'scale(1)',
                outline:   overIdx === i && dragIdx !== i ? '2px solid var(--brand)' : 'none',
                outlineOffset: '2px',
              }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo.url} alt="" className="w-full h-full object-cover" loading="lazy" />

              {/* Overlay — visible en hover (desktop) O al tocar (mobile) */}
              <div className={cn(
                'absolute inset-0 transition-opacity flex flex-col',
                activeIdx === i ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 md:group-hover:opacity-100'
              )}
                style={{ background: 'rgba(0,0,0,0.55)' }}>
                {/* Botones centrados */}
                <div className="flex-1 flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={e => { e.stopPropagation(); setCover(i); setActiveIdx(null) }}
                    title="Establecer como portada"
                    className={cn(
                      'p-2 rounded-xl transition-colors',
                      photo.isCover ? 'bg-amber-500 text-white' : 'bg-white/20 text-white'
                    )}>
                    <Star size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={e => { e.stopPropagation(); remove(i) }}
                    className="p-2 rounded-xl bg-red-500/80 text-white">
                    <X size={15} />
                  </button>
                </div>
              </div>

              {/* Badges siempre visibles */}
              {photo.isCover && (
                <div className="absolute top-1.5 left-1.5 text-white text-[10px] px-1.5 py-0.5 rounded-full font-semibold flex items-center gap-0.5"
                  style={{ background: 'rgba(245,158,11,0.9)' }}>
                  <Star size={8} /> Portada
                </div>
              )}
              <div className="absolute bottom-1 right-1 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold"
                style={{ background: 'rgba(0,0,0,0.5)' }}>
                {i + 1}
              </div>

              {/* Indicador visual de "toca para editar" en mobile cuando no está activo */}
              {activeIdx !== i && (
                <div className="absolute bottom-1 left-1 md:hidden">
                  <div className="w-4 h-4 rounded-full flex items-center justify-center"
                    style={{ background: 'rgba(0,0,0,0.4)' }}>
                    <Pencil size={9} style={{ color: 'rgba(255,255,255,0.7)' }} />
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Agregar más */}
          {photos.length < 10 && (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="rounded-xl border-2 border-dashed flex items-center justify-center transition-all"
              style={{ aspectRatio: '4/3', borderColor: 'var(--border-medium)', color: 'var(--text-muted)' }}>
              <div className="flex flex-col items-center gap-1">
                <Upload size={18} />
                <span className="text-xs hidden sm:block">Agregar</span>
              </div>
            </button>
          )}
        </div>
      )}

      {photos.length > 0 && (
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          {photos.length}/10 fotos ·{' '}
          <span className="md:hidden">Toca una foto para editarla · </span>
          <span className="hidden md:inline">Arrastra para reordenar · </span>
          La primera es la portada
        </p>
      )}
    </div>
  )
}
