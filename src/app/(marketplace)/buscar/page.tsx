import Link from 'next/link'
import { Search, MapPin, Users, Star, Shield, SlidersHorizontal } from 'lucide-react'
import { getPublishedSpaces } from '@/lib/actions/marketplace'
import { formatCurrency } from '@/lib/utils'

const categories = [
  { value: '',            label: 'Todos',         emoji: '🔍' },
  { value: 'salon',       label: 'Salones',        emoji: '🏛️' },
  { value: 'restaurante', label: 'Restaurantes',   emoji: '🍽️' },
  { value: 'rooftop',     label: 'Rooftops',       emoji: '🌆' },
  { value: 'bar',         label: 'Bares',          emoji: '🍸' },
  { value: 'terraza',     label: 'Terrazas',       emoji: '🌿' },
  { value: 'estudio',     label: 'Estudios',       emoji: '🎬' },
  { value: 'hotel',       label: 'Hoteles',        emoji: '🏨' },
  { value: 'villa',       label: 'Villas',         emoji: '🏡' },
  { value: 'coworking',   label: 'Coworking',      emoji: '💼' },
]

const capacityOptions = [
  { value: '',    label: 'Cualquier capacidad' },
  { value: '20',  label: 'Hasta 20 personas' },
  { value: '50',  label: 'Hasta 50 personas' },
  { value: '100', label: 'Hasta 100 personas' },
  { value: '200', label: 'Hasta 200 personas' },
  { value: '500', label: 'Más de 200 personas' },
]

function getPricingDisplay(space: any) {
  const p = space.space_pricing?.find((x: any) => x.is_active) ?? space.space_pricing?.[0]
  if (!p) return null
  if (p.pricing_type === 'hourly') return `${formatCurrency(p.hourly_price)} / hora`
  if (p.pricing_type === 'minimum_consumption') return `Consumo mín. ${formatCurrency(p.minimum_consumption)}`
  if (p.pricing_type === 'fixed_package') return formatCurrency(p.fixed_price)
  return 'Solicitar precio'
}

function getCoverImage(space: any) {
  return space.space_images?.find((i: any) => i.is_cover)?.url ?? space.space_images?.[0]?.url ?? null
}

export default async function BuscarPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; categoria?: string; sector?: string; capacidad?: string }>
}) {
  const params = await searchParams
  const spaces = await getPublishedSpaces({
    category: params.categoria || undefined,
    capacity: params.capacidad ? parseInt(params.capacidad) : undefined,
    sector: params.sector || undefined,
    search: params.q || undefined,
  })

  const activeCategory = params.categoria ?? ''

  return (
    <div style={{ background: 'var(--bg-base)', minHeight: '100vh' }}>

      {/* Header de búsqueda */}
      <div className="py-6 px-6" style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-subtle)' }}>
        <div className="max-w-7xl mx-auto">
          <form className="flex gap-3">
            <div className="flex-1 flex items-center gap-3 rounded-xl px-4 py-3 input-base">
              <Search size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
              <input name="q" defaultValue={params.q} placeholder="Buscar espacios..."
                className="flex-1 bg-transparent text-sm focus:outline-none" style={{ color: 'var(--text-primary)' }} />
            </div>
            <div className="flex items-center gap-3 rounded-xl px-4 py-3 input-base w-44">
              <MapPin size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
              <input name="sector" defaultValue={params.sector} placeholder="Sector"
                className="w-full bg-transparent text-sm focus:outline-none" style={{ color: 'var(--text-primary)' }} />
            </div>
            <select name="capacidad" defaultValue={params.capacidad}
              className="input-base rounded-xl px-4 py-3 text-sm">
              {capacityOptions.map(o => (
                <option key={o.value} value={o.value} style={{ background: 'var(--bg-surface)' }}>{o.label}</option>
              ))}
            </select>
            <button type="submit"
              className="btn-brand flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold shrink-0">
              <SlidersHorizontal size={16} /> Buscar
            </button>
          </form>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">

        {/* Category pills */}
        <div className="flex gap-2 overflow-x-auto pb-3 mb-8">
          {categories.map(cat => (
            <Link
              key={cat.value}
              href={`/buscar?${new URLSearchParams({ ...params, categoria: cat.value }).toString()}`}
              className="flex items-center gap-2 px-4 py-2.5 rounded-full border text-sm font-medium whitespace-nowrap transition-all shrink-0"
              style={activeCategory === cat.value ? {
                background: 'var(--brand)',
                borderColor: 'var(--brand)',
                color: '#fff',
              } : {
                background: 'var(--bg-surface)',
                borderColor: 'var(--border-medium)',
                color: 'var(--text-secondary)',
              }}
            >
              <span>{cat.emoji}</span> {cat.label}
            </Link>
          ))}
        </div>

        {/* Results count */}
        <div className="flex items-center justify-between mb-5">
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{spaces.length}</span>
            {' '}espacio{spaces.length !== 1 ? 's' : ''} encontrado{spaces.length !== 1 ? 's' : ''}
            {params.sector && <span> en <strong style={{ color: 'var(--text-primary)' }}>{params.sector}</strong></span>}
          </p>
        </div>

        {/* Grid */}
        {spaces.length === 0 ? (
          <div className="text-center py-24 rounded-3xl"
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
            {spaces.map((space: any) => {
              const pricing = getPricingDisplay(space)
              const cover = getCoverImage(space)
              const catEmoji = categories.find(c => c.value === space.category)?.emoji ?? '🏛️'
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
                          <span className="text-5xl">{catEmoji}</span>
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
                      <div className="flex items-center justify-between pt-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                        <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                          <span className="flex items-center gap-1"><Users size={12} /> {space.capacity_max} máx.</span>
                          {space.space_addons?.length > 0 && (
                            <span className="flex items-center gap-1"><Star size={12} /> {space.space_addons.length} extras</span>
                          )}
                        </div>
                        <span className="text-xs font-semibold px-3 py-1.5 rounded-full transition-all"
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
      </div>
    </div>
  )
}
