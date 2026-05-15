'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Heart, Loader2 } from 'lucide-react'
import { getClientFavorites } from '@/lib/actions/client'
import { SpaceCard } from '@/app/(marketplace)/buscar/SpaceCard'

export default function FavoritosPage() {
  const [favorites, setFavorites] = useState<any[]>([])
  const [loading, setLoading]     = useState(true)

  useEffect(() => {
    getClientFavorites().then(d => { setFavorites(d); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center h-dvh">
      <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--brand)' }} />
    </div>
  )

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      <div className="mb-5 md:mb-8">
        <h1 className="text-xl md:text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Favoritos</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          {favorites.length} espacio{favorites.length !== 1 ? 's' : ''} guardado{favorites.length !== 1 ? 's' : ''}
        </p>
      </div>

      {favorites.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 rounded-3xl text-center"
          style={{ background: '#fff', border: '2px dashed var(--border-medium)' }}>
          <Heart size={32} className="mb-3" style={{ color: 'var(--text-muted)' }} />
          <p className="font-medium mb-1" style={{ color: 'var(--text-primary)' }}>Sin favoritos aún</p>
          <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
            Guarda espacios que te gusten para encontrarlos fácilmente
          </p>
          <Link href="/buscar" className="btn-brand text-sm font-semibold px-5 py-2.5 rounded-xl">
            Explorar espacios
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-5">
          {favorites.filter((fav: any) => fav.spaces != null).map((fav: any) => (
            <SpaceCard
              key={fav.id}
              space={fav.spaces}
              isHovered={false}
              onHover={() => {}}
            />
          ))}
        </div>
      )}
    </div>
  )
}
