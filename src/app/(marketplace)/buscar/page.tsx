import Link from 'next/link'
import { Search, MapPin, SlidersHorizontal } from 'lucide-react'
import { getPublishedSpaces } from '@/lib/actions/marketplace'
import { formatCurrency } from '@/lib/utils'
import BuscarClient from './BuscarClient'

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
  const catEmojis = Object.fromEntries(categories.map(c => [c.value, c.emoji]))

  return (
    <div style={{ background: 'var(--bg-base)', minHeight: '100vh' }}>

      {/* Search bar */}
      <div className="py-5 px-6 sticky top-16 z-30"
        style={{ background: 'rgba(244,246,245,0.95)', backdropFilter: 'blur(12px)', borderBottom: '1px solid var(--border-subtle)' }}>
        <div className="max-w-7xl mx-auto">
          <form className="flex gap-3">
            <div className="flex-1 flex items-center gap-3 rounded-2xl px-4 py-3 input-base">
              <Search size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
              <input name="q" defaultValue={params.q} placeholder="Buscar espacios..."
                className="flex-1 bg-transparent text-sm focus:outline-none" style={{ color: 'var(--text-primary)' }} />
            </div>
            <div className="flex items-center gap-3 rounded-2xl px-4 py-3 input-base w-44">
              <MapPin size={15} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
              <input name="sector" defaultValue={params.sector} placeholder="Sector"
                className="w-full bg-transparent text-sm focus:outline-none" style={{ color: 'var(--text-primary)' }} />
            </div>
            <select name="capacidad" defaultValue={params.capacidad}
              className="input-base rounded-2xl px-4 py-3 text-sm">
              {capacityOptions.map(o => (
                <option key={o.value} value={o.value} style={{ background: 'var(--bg-surface)' }}>{o.label}</option>
              ))}
            </select>
            <button type="submit"
              className="btn-brand flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-semibold shrink-0">
              <SlidersHorizontal size={15} /> Buscar
            </button>
          </form>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">

        {/* Category pills */}
        <div className="flex gap-2 overflow-x-auto pb-3 mb-6">
          {categories.map(cat => (
            <Link key={cat.value}
              href={`/buscar?${new URLSearchParams({ ...params, categoria: cat.value }).toString()}`}
              className="flex items-center gap-2 px-4 py-2.5 rounded-full border text-sm font-medium whitespace-nowrap transition-all shrink-0"
              style={activeCategory === cat.value ? {
                background: 'var(--brand)', borderColor: 'var(--brand)', color: '#fff',
              } : {
                background: 'var(--bg-surface)', borderColor: 'var(--border-medium)', color: 'var(--text-secondary)',
              }}>
              <span>{cat.emoji}</span> {cat.label}
            </Link>
          ))}
        </div>

        {/* Client component con mapa + lista */}
        <BuscarClient
          spaces={spaces}
          params={params}
          catEmojis={catEmojis}
          getPricingDisplay={getPricingDisplay}
          getCoverImage={getCoverImage}
        />
      </div>
    </div>
  )
}
