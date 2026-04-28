'use client'

import { useState } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { MapPin, Users, Star, Shield, Map, LayoutGrid } from 'lucide-react'

const SpacesMap = dynamic(() => import('@/components/map/SpacesMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full rounded-2xl flex items-center justify-center"
      style={{ height: 420, background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
      <div className="text-sm" style={{ color: 'var(--text-muted)' }}>Cargando mapa...</div>
    </div>
  ),
})

interface Props {
  spaces:            any[]
  params:            Record<string, string | undefined>
  catEmojis:         Record<string, string>
  getPricingDisplay: (space: any) => string | null
  getCoverImage:     (space: any) => string | null
}

export default function BuscarClient({ spaces, params, catEmojis, getPricingDisplay, getCoverImage }: Props) {
  const [view, setView] = useState<'grid' | 'map'>('grid')

  return (
    <>
      {/* Header con contador y toggle vista */}
      <div className="flex items-center justify-between mb-5">
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{spaces.length}</span>
          {' '}espacio{spaces.length !== 1 ? 's' : ''} encontrado{spaces.length !== 1 ? 's' : ''}
          {params.sector && <span> en <strong style={{ color: 'var(--text-primary)' }}>{params.sector}</strong></span>}
        </p>

        {/* Toggle mapa / lista */}
        <div className="flex gap-1 p-1 rounded-xl"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
          <button onClick={() => setView('grid')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all"
            style={view === 'grid'
              ? { background: 'var(--brand)', color: '#fff' }
              : { color: 'var(--text-secondary)' }}>
            <LayoutGrid size={14} /> Lista
          </button>
          <button onClick={() => setView('map')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all"
            style={view === 'map'
              ? { background: 'var(--brand)', color: '#fff' }
              : { color: 'var(--text-secondary)' }}>
            <Map size={14} /> Mapa
          </button>
        </div>
      </div>

      {spaces.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 rounded-3xl text-center"
          style={{ background: 'var(--bg-surface)', border: '2px dashed var(--border-medium)' }}>
          <div className="text-5xl mb-4">🔍</div>
          <h3 className="font-semibold text-lg mb-2" style={{ color: 'var(--text-primary)' }}>
            No encontramos espacios
          </h3>
          <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
            Intenta con otros filtros o sectores
          </p>
          <Link href="/buscar" className="text-sm font-medium" style={{ color: 'var(--brand)' }}>
            Ver todos los espacios →
          </Link>
        </div>
      ) : view === 'map' ? (
        /* ── VISTA MAPA ── */
        <div className="space-y-4">
          <SpacesMap spaces={spaces} />
          {/* Mini lista debajo del mapa */}
          <div className="grid grid-cols-3 gap-4 mt-4">
            {spaces.slice(0, 6).map(space => {
              const cover   = getCoverImage(space)
              const pricing = getPricingDisplay(space)
              return (
                <Link key={space.id} href={`/espacios/${space.slug}`} className="group flex items-center gap-3 p-3 rounded-2xl transition-all card-hover"
                  style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
                  <div className="w-14 h-12 rounded-xl overflow-hidden shrink-0" style={{ background: 'var(--bg-elevated)' }}>
                    {cover
                      ? <img src={cover} alt={space.name} className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center text-xl">
                          {catEmojis[space.category] ?? '🏛️'}
                        </div>}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-xs truncate" style={{ color: 'var(--text-primary)' }}>{space.name}</div>
                    <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{space.sector ?? space.city}</div>
                    {pricing && <div className="text-xs font-bold" style={{ color: 'var(--brand)' }}>{pricing}</div>}
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      ) : (
        /* ── VISTA GRID ── */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {spaces.map(space => {
            const cover   = getCoverImage(space)
            const pricing = getPricingDisplay(space)
            const emoji   = catEmojis[space.category] ?? '🏛️'
            return (
              <Link key={space.id} href={`/espacios/${space.slug}`} className="group block">
                <div className="card-hover rounded-2xl overflow-hidden"
                  style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
                  {/* Image */}
                  <div className="relative h-52 overflow-hidden" style={{ background: 'var(--bg-elevated)' }}>
                    {cover ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={cover} alt={space.name}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                        <span className="text-5xl">{emoji}</span>
                      </div>
                    )}
                    {space.is_verified && (
                      <div className="absolute top-3 left-3 flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full"
                        style={{ background: 'rgba(53,196,147,0.15)', color: 'var(--brand)', backdropFilter: 'blur(8px)', border: '1px solid rgba(53,196,147,0.25)' }}>
                        <Shield size={10} /> Verificado
                      </div>
                    )}
                    {pricing && (
                      <div className="absolute bottom-3 right-3 text-sm font-bold px-3 py-1.5 rounded-full"
                        style={{ background: '#fff', color: 'var(--brand)', boxShadow: '0 2px 8px rgba(0,0,0,0.12)' }}>
                        {pricing}
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-4">
                    <h3 className="font-semibold text-base leading-tight mb-1 group-hover:text-[#35C493] transition-colors"
                      style={{ color: 'var(--text-primary)' }}>
                      {space.name}
                    </h3>
                    <div className="flex items-center gap-1 text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
                      <MapPin size={11} />
                      {space.sector ? `${space.sector}, ` : ''}{space.city}
                    </div>
                    {space.description && (
                      <p className="text-xs mb-3 line-clamp-2" style={{ color: 'var(--text-secondary)' }}>
                        {space.description}
                      </p>
                    )}
                    <div className="flex items-center justify-between pt-3"
                      style={{ borderTop: '1px solid var(--border-subtle)' }}>
                      <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                        <span className="flex items-center gap-1"><Users size={12} /> {space.capacity_max} máx.</span>
                        {space.space_addons?.length > 0 && (
                          <span className="flex items-center gap-1"><Star size={12} /> {space.space_addons.length} extras</span>
                        )}
                      </div>
                      <span className="text-xs font-semibold px-3 py-1.5 rounded-full"
                        style={{ background: 'var(--brand-dim)', color: 'var(--brand)' }}>
                        Ver espacio
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </>
  )
}
