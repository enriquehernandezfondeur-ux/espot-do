'use client'

import { useState, useEffect } from 'react'
import { getAdminSpaces, updateSpaceStatus } from '@/lib/actions/admin'
import { formatCurrency } from '@/lib/utils'
import { Search, Eye, EyeOff, Shield, Star, Trash2, CheckCircle, Loader2, MapPin, Users, Pencil } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

const filters = [
  { key: 'all',       label: 'Todos' },
  { key: 'pending',   label: 'Pendientes' },
  { key: 'published', label: 'Publicados' },
  { key: 'inactive',  label: 'Inactivos' },
]

export default function AdminSpacesPage() {
  const [spaces, setSpaces]   = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter]   = useState('all')
  const [search, setSearch]   = useState('')
  const [actionId, setActionId] = useState<string | null>(null)

  useEffect(() => {
    getAdminSpaces({ status: filter === 'all' ? undefined : filter, search: search || undefined })
      .then(d => { setSpaces(d); setLoading(false) })
  }, [filter, search])

  async function toggle(spaceId: string, field: string, current: boolean) {
    setActionId(spaceId + field)
    await updateSpaceStatus(spaceId, { [field]: !current })
    setSpaces(prev => prev.map(s => s.id === spaceId ? { ...s, [field]: !current } : s))
    setActionId(null)
  }

  function getPrice(space: any) {
    const p = space.space_pricing?.find((x: any) => x.is_active) ?? space.space_pricing?.[0]
    if (!p) return '—'
    if (p.pricing_type === 'hourly') return `${formatCurrency(p.hourly_price)}/hr`
    if (p.pricing_type === 'minimum_consumption') return `Min. ${formatCurrency(p.minimum_consumption)}`
    if (p.pricing_type === 'fixed_package') return formatCurrency(p.fixed_price)
    return 'Cotizar'
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#0F1623', letterSpacing: '-0.02em' }}>Espacios</h1>
          <p className="text-sm text-slate-500 mt-0.5">{spaces.length} espacio{spaces.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex gap-1 p-1 rounded-xl" style={{ background: '#fff', border: '1px solid #E8ECF0' }}>
          {filters.map(f => (
            <button key={f.key} onClick={() => { setFilter(f.key); setLoading(true) }}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
              style={filter === f.key ? { background: '#0F1623', color: '#fff' } : { color: '#6B7280' }}>
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 flex-1 px-4 py-2.5 rounded-xl"
          style={{ background: '#fff', border: '1px solid #E8ECF0' }}>
          <Search size={15} className="text-slate-400 shrink-0" />
          <input value={search} onChange={e => { setSearch(e.target.value); setLoading(true) }}
            placeholder="Buscar por nombre..."
            className="bg-transparent text-sm flex-1 focus:outline-none text-slate-700 placeholder-slate-400" />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--brand)' }} />
        </div>
      ) : (
        <div className="rounded-2xl overflow-hidden" style={{ background: '#fff', border: '1px solid #E8ECF0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
          {/* Table header */}
          <div className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-4 px-5 py-3 text-xs font-semibold uppercase tracking-widest text-slate-400"
            style={{ borderBottom: '1px solid #F0F2F5', background: '#FAFBFC' }}>
            <span>Espacio</span><span>Precio</span><span>Reservas</span><span>Estado</span><span>Acciones</span>
          </div>

          {spaces.length === 0 ? (
            <div className="text-center py-16 text-slate-400">No hay espacios</div>
          ) : (
            <div className="divide-y divide-[#F0F2F5]">
              {spaces.map((space: any) => {
                const cover = space.space_images?.find((i: any) => i.is_cover)?.url ?? space.space_images?.[0]?.url
                const host  = space.profiles
                const bookingsCount = space.bookings?.length ?? 0
                return (
                  <div key={space.id} className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-4 items-center px-5 py-4 hover:bg-slate-50 transition-colors">

                    {/* Space info */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-12 h-10 rounded-xl overflow-hidden shrink-0" style={{ background: '#F0F2F5' }}>
                        {cover
                          ? <img src={cover} alt="" className="w-full h-full object-cover" />
                          : <div className="w-full h-full flex items-center justify-center text-lg">🏛️</div>}
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-sm truncate" style={{ color: '#0F1623' }}>{space.name}</div>
                        <div className="text-xs text-slate-400 flex items-center gap-1">
                          <MapPin size={10} /> {space.sector ?? space.city} · {host?.full_name}
                        </div>
                      </div>
                    </div>

                    {/* Price */}
                    <div className="text-sm font-medium" style={{ color: '#374151' }}>{getPrice(space)}</div>

                    {/* Bookings */}
                    <div className="flex items-center gap-1 text-sm text-slate-500">
                      <Users size={13} /> {bookingsCount}
                    </div>

                    {/* Status badges */}
                    <div className="flex flex-wrap gap-1.5">
                      {space.is_published && (
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: 'rgba(22,163,74,0.1)', color: '#16A34A' }}>Publicado</span>
                      )}
                      {!space.is_published && space.is_active && (
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: 'rgba(217,119,6,0.1)', color: '#D97706' }}>Pendiente</span>
                      )}
                      {!space.is_active && (
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: 'rgba(220,38,38,0.1)', color: '#DC2626' }}>Inactivo</span>
                      )}
                      {space.is_verified && (
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-0.5" style={{ background: 'rgba(37,99,235,0.1)', color: '#2563EB' }}>
                          <Shield size={9} /> Verificado
                        </span>
                      )}
                      {space.is_featured && (
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-0.5" style={{ background: 'rgba(234,179,8,0.1)', color: '#CA8A04' }}>
                          <Star size={9} /> Destacado
                        </span>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1">
                      {/* Publicar/Despublicar */}
                      <button
                        onClick={() => toggle(space.id, 'is_published', space.is_published)}
                        disabled={actionId === space.id + 'is_published'}
                        title={space.is_published ? 'Despublicar' : 'Publicar'}
                        className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:bg-slate-100"
                        style={{ color: space.is_published ? '#16A34A' : '#9CA3AF' }}>
                        {actionId === space.id + 'is_published'
                          ? <Loader2 size={14} className="animate-spin" />
                          : space.is_published ? <Eye size={14} /> : <EyeOff size={14} />}
                      </button>

                      {/* Verificar */}
                      <button
                        onClick={() => toggle(space.id, 'is_verified', space.is_verified)}
                        disabled={actionId === space.id + 'is_verified'}
                        title={space.is_verified ? 'Quitar verificación' : 'Verificar'}
                        className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:bg-slate-100"
                        style={{ color: space.is_verified ? '#2563EB' : '#9CA3AF' }}>
                        {actionId === space.id + 'is_verified'
                          ? <Loader2 size={14} className="animate-spin" />
                          : <Shield size={14} />}
                      </button>

                      {/* Destacar */}
                      <button
                        onClick={() => toggle(space.id, 'is_featured', space.is_featured)}
                        disabled={actionId === space.id + 'is_featured'}
                        title={space.is_featured ? 'Quitar destacado' : 'Destacar'}
                        className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:bg-slate-100"
                        style={{ color: space.is_featured ? '#CA8A04' : '#9CA3AF' }}>
                        {actionId === space.id + 'is_featured'
                          ? <Loader2 size={14} className="animate-spin" />
                          : <Star size={14} />}
                      </button>

                      {/* Desactivar */}
                      <button
                        onClick={() => toggle(space.id, 'is_active', space.is_active)}
                        disabled={actionId === space.id + 'is_active'}
                        title={space.is_active ? 'Desactivar' : 'Activar'}
                        className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:bg-red-50"
                        style={{ color: space.is_active ? '#9CA3AF' : '#DC2626' }}>
                        {actionId === space.id + 'is_active'
                          ? <Loader2 size={14} className="animate-spin" />
                          : space.is_active ? <Trash2 size={14} /> : <CheckCircle size={14} />}
                      </button>

                      <Link href={`/admin/espacios/${space.id}`}
                        className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:bg-blue-50"
                        style={{ color: '#2563EB' }} title="Editar espacio">
                        <Pencil size={14} />
                      </Link>

                      <Link href={`/espacios/${space.slug}`} target="_blank"
                        className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:bg-slate-100"
                        style={{ color: '#9CA3AF' }} title="Ver en marketplace">
                        <Eye size={14} />
                      </Link>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
