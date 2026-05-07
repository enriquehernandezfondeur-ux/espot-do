'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Heart, MapPin, Users, Loader2, Trash2 } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { getClientFavorites, removeFavorite } from '@/lib/actions/client'

export default function FavoritosPage() {
  const [favorites, setFavorites] = useState<any[]>([])
  const [loading, setLoading]     = useState(true)
  const [removing, setRemoving]   = useState<string | null>(null)

  useEffect(() => {
    getClientFavorites().then(d => { setFavorites(d); setLoading(false) })
  }, [])

  async function handleRemove(favId: string) {
    setRemoving(favId)
    await removeFavorite(favId)
    setFavorites(prev => prev.filter(f => f.id !== favId))
    setRemoving(null)
  }

  function getPrice(space: any) {
    const p = space.space_pricing?.find((x: any) => x.is_active) ?? space.space_pricing?.[0]
    if (!p) return null
    if (p.pricing_type === 'hourly') return `${formatCurrency(p.hourly_price)} / hora`
    if (p.pricing_type === 'minimum_consumption') return `Desde ${formatCurrency(p.minimum_consumption)}`
    if (p.pricing_type === 'fixed_package') return formatCurrency(p.fixed_price)
    return 'Cotizar'
  }

  if (loading) return (
    <div className="flex items-center justify-center h-screen">
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
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-5">
          {favorites.map((fav: any) => {
            const space = fav.spaces
            const cover = space?.space_images?.find((i: any) => i.is_cover)?.url ?? space?.space_images?.[0]?.url
            const price = getPrice(space)
            return (
              <div key={fav.id} className="rounded-2xl overflow-hidden card-hover"
                style={{ background: '#fff', border: '1px solid var(--border-subtle)' }}>
                {/* Image */}
                <div className="relative h-44 overflow-hidden" style={{ background: 'var(--bg-elevated)' }}>
                  {cover
                    ? <img src={cover} alt={space.name} className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center text-4xl opacity-30">🏛️</div>}
                  <button onClick={() => handleRemove(fav.id)} disabled={removing === fav.id}
                    className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center transition-all"
                    style={{ background: 'rgba(255,255,255,0.9)', color: removing === fav.id ? '#ccc' : '#EF4444', boxShadow: '0 2px 8px rgba(0,0,0,0.12)' }}>
                    {removing === fav.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                  </button>
                  <div className="absolute top-3 left-3">
                    <Heart size={14} className="fill-current" style={{ color: '#EF4444' }} />
                  </div>
                </div>
                {/* Info */}
                <div className="p-4">
                  <h3 className="font-semibold text-sm mb-1" style={{ color: 'var(--text-primary)' }}>{space?.name}</h3>
                  <div className="flex items-center gap-1.5 text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
                    <MapPin size={11} /> {space?.sector ? `${space.sector}, ` : ''}{space?.city}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                      <Users size={11} /> hasta {space?.capacity_max}
                    </span>
                    {price && <span className="text-sm font-bold" style={{ color: 'var(--brand)' }}>{price}</span>}
                  </div>
                  <Link href={`/espacios/${space?.slug}`}
                    className="btn-brand w-full mt-3 py-2.5 rounded-xl text-sm font-semibold text-center block">
                    Reservar
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
