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
  const [photos, setPhotos] = useState<Photo[]>([])
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  async function uploadFiles(files: FileList) {
    if (!files.length) return
    setUploading(true)

    const uploaded: Photo[] = []
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) continue
      const ext = file.name.split('.').pop()
      const path = `spaces/${spaceId ?? 'temp-' + Date.now()}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

      const { error } = await supabase.storage
        .from('space-images')
        .upload(path, file, { cacheControl: '3600', upsert: false })

      if (!error) {
        const { data: { publicUrl } } = supabase.storage.from('space-images').getPublicUrl(path)
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
          dragOver ? 'border-violet-500 bg-[rgba(53,196,147,0.07)]' : 'border-white/10 hover:border-violet-500/40 hover:bg-[#35C493]/5'
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
            <p className="text-slate-400 text-sm">Subiendo fotos...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <div className="w-12 h-12 bg-[rgba(53,196,147,0.12)] rounded-xl flex items-center justify-center">
              <ImagePlus className="w-6 h-6 text-[#35C493]" />
            </div>
            <p className="text-white text-sm font-medium">
              Arrastra tus fotos aquí
            </p>
            <p className="text-slate-400 text-xs">
              o <span className="text-[#35C493] underline underline-offset-2">haz click para seleccionar</span>
            </p>
            <p className="text-slate-600 text-xs mt-1">JPG, PNG · Máximo 10 fotos · La primera es la portada</p>
          </div>
        )}
      </div>

      {/* Grid de fotos */}
      {photos.length > 0 && (
        <div className="grid grid-cols-4 gap-3">
          {photos.map((photo, i) => (
            <div key={i} className="relative group rounded-xl overflow-hidden aspect-video bg-slate-800">
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
              className="aspect-video rounded-xl border-2 border-dashed border-white/10 hover:border-violet-500/40 flex items-center justify-center text-slate-500 hover:text-[#35C493] transition-all"
            >
              <Upload size={20} />
            </button>
          )}
        </div>
      )}

      {photos.length > 0 && (
        <p className="text-slate-500 text-xs">
          {photos.length}/10 fotos · Click en ⭐ para cambiar la portada · La portada es la primera imagen que verán los clientes
        </p>
      )}
    </div>
  )
}
