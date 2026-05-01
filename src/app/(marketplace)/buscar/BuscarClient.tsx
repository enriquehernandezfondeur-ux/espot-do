'use client'

import Link from 'next/link'
import { MapPin, Users, Star, Shield } from 'lucide-react'

const CAT_EMOJIS: Record<string, string> = {
  '': '🔍', salon: '🏛️', restaurante: '🍽️', bar: '🍸', rooftop: '🌆',
  terraza: '🌿', estudio: '🎬', coworking: '💼', hotel: '🏨', villa: '🏡', otro: '📍',
}

function getPricingDisplay(space: any): string | null {
  const p = space.space_pricing?.find((x: any) => x.is_active) ?? space.space_pricing?.[0]
  if (!p) return null
  if (p.pricing_type === 'hourly') return `RD$${Number(p.hourly_price).toLocaleString()} / hora`
  if (p.pricing_type === 'minimum_consumption') return `Desde RD$${Number(p.minimum_consumption).toLocaleString()}`
  if (p.pricing_type === 'fixed_package') return `RD$${Number(p.fixed_price).toLocaleString()}`
  return 'Cotizar'
}

function getCoverImage(space: any): string | null {
  return space.space_images?.find((i: any) => i.is_cover)?.url ?? space.space_images?.[0]?.url ?? null
}

interface Props {
  spaces: any[]
  params: Record<string, string | undefined>
}

export default function BuscarClient({ spaces, params }: Props) {
  return (
    <>
      {/* Contador */}
      <div className="flex items-center justify-between mb-5">
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{spaces.length}</span>
          {' '}espacio{spaces.length !== 1 ? 's' : ''} encontrado{spaces.length !== 1 ? 's' : ''}
          {params.sector && <span> en <strong style={{ color: 'var(--text-primary)' }}>{params.sector}</strong></span>}
        </p>
      </div>

      {/* Grid */}
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
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {spaces.map(space => {
            const cover   = getCoverImage(space)
            const pricing = getPricingDisplay(space)
            const emoji   = CAT_EMOJIS[space.category] ?? '🏛️'
            return (
              <Link key={space.id} href={`/espacios/${space.slug}`} className="group block">
                <div className="card-hover rounded-2xl overflow-hidden"
                  style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
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
