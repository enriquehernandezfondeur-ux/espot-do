'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  MapPin, Users, Shield, ChevronLeft, ChevronRight,
  Clock, CheckCircle, X, Music, Ban,
  ArrowLeft, Share2, CreditCard, Lock,
} from 'lucide-react'
import { cn, formatCurrency, formatTime } from '@/lib/utils'
import ChatDrawer from '@/components/marketplace/ChatDrawer'
import BookingWidget from '@/components/marketplace/BookingWidget'

const DAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

function addonEmoji(name: string) {
  const n = name.toLowerCase()
  if (n.includes('bartender') || n.includes('barra')) return '🍹'
  if (n.includes('dj'))         return '🎧'
  if (n.includes('sonido'))     return '🔊'
  if (n.includes('iluminaci'))  return '💡'
  if (n.includes('camarero'))   return '🤵'
  if (n.includes('seguridad'))  return '💂'
  if (n.includes('decorac'))    return '🎊'
  if (n.includes('proyector'))  return '📽️'
  if (n.includes('torta') || n.includes('pastel')) return '🎂'
  if (n.includes('menú') || n.includes('catering')) return '🍽️'
  if (n.includes('vino') || n.includes('open bar')) return '🍷'
  if (n.includes('fotóg') || n.includes('foto'))   return '📸'
  if (n.includes('video'))      return '🎬'
  if (n.includes('músico') || n.includes('orquesta')) return '🎵'
  if (n.includes('maquill'))    return '💄'
  if (n.includes('extra') || n.includes('hora adicional')) return '⏰'
  if (n.includes('suite'))      return '🛏️'
  if (n.includes('pantalla') || n.includes('led')) return '📺'
  return '✨'
}

function getFacilities(space: any) {
  const cat = space.category
  const base: { icon: string; label: string }[] = []
  if (['salon','hotel','villa'].includes(cat)) base.push({ icon: '🅿️', label: 'Estacionamiento' })
  if (['restaurante','hotel','villa','salon'].includes(cat)) base.push({ icon: '🍳', label: 'Cocina equipada' })
  base.push({ icon: '❄️', label: 'Aire acondicionado' })
  base.push({ icon: '📶', label: 'WiFi incluido' })
  if (['salon','hotel','villa'].includes(cat)) base.push({ icon: '🔊', label: 'Sistema de sonido' })
  if (['salon','hotel'].includes(cat)) base.push({ icon: '💃', label: 'Pista de baile' })
  if (['rooftop','terraza','villa'].includes(cat)) base.push({ icon: '🌿', label: 'Área al aire libre' })
  if (cat === 'villa') base.push({ icon: '🏊', label: 'Piscina' })
  if (['salon','hotel'].includes(cat)) base.push({ icon: '🚻', label: 'Baños privados' })
  if (['estudio'].includes(cat)) base.push({ icon: '🎬', label: 'Ciclorama profesional' })
  if (['coworking'].includes(cat)) base.push({ icon: '🖨️', label: 'Impresora / scanner' })
  base.push({ icon: '🔒', label: 'Seguridad 24/7' })
  return base.slice(0, 8)
}

const pricingTypeLabel: Record<string, string> = {
  hourly:              'Precio por hora',
  minimum_consumption: 'Consumo mínimo',
  fixed_package:       'Paquete fijo',
  custom_quote:        'Cotización personalizada',
}

const termLabel: Record<string, string> = {
  platform_guarantee: '10% al reservar · Resto en etapas por Espot',
  split_advance:      'Pago dividido en etapas · Todo por Espot',
  full_prepaid:       '100% al reservar por Espot',
  quote_only:         'Cotización · Pago por Espot al aceptar',
}

export default function SpaceDetailClient({ space, similarSpaces = [], initialDate }: { space: any; similarSpaces?: any[]; initialDate?: string }) {
  const [photoIdx, setPhotoIdx] = useState(0)
  const [showChat, setShowChat] = useState(false)
  const [activeTab, setActiveTab] = useState<'info' | 'addons' | 'rules'>('info')

  const images      = space.space_images ?? []
  const pricing     = space.space_pricing?.find((p: any) => p.is_active) ?? space.space_pricing?.[0]
  const conditions  = space.space_conditions?.[0]
  const paymentTerms = space.space_payment_terms?.[0]
  const addons      = space.space_addons ?? []
  const timeBlocks  = space.space_time_blocks ?? []
  const host        = space.profiles
  const facilities  = getFacilities(space)


  // Reglas de qué no se permite
  const notAllowed = [
    ...(conditions?.allows_external_food    === false ? ['Comida externa']              : []),
    ...(conditions?.allows_external_alcohol === false ? ['Alcohol externo']             : []),
    ...(conditions?.allows_smoking          === false ? ['Fumar en el local']           : []),
    ...(conditions?.allows_pets             === false ? ['Mascotas']                    : []),
    ...(conditions?.allows_external_decoration === false ? ['Decoración externa']       : []),
    'Subarrendamiento del espacio',
    'Eventos no autorizados',
  ]

  // Cover helper
  function getCover(s: any) {
    return s.space_images?.find((i: any) => i.is_cover)?.url ?? s.space_images?.[0]?.url ?? null
  }

  const hostProfile = space.profiles as any

  return (
    <div style={{ background: 'var(--bg-base)', minHeight: '100vh' }}>

      {/* Chat Drawer */}
      {showChat && hostProfile && (
        <ChatDrawer
          spaceId={space.id}
          spaceName={space.name}
          hostId={hostProfile.id ?? space.host_id}
          hostName={hostProfile.full_name ?? 'Propietario'}
          onClose={() => setShowChat(false)}
        />
      )}

      <div className="max-w-7xl mx-auto px-6 py-8">

        {/* Breadcrumb */}
        <div className="flex items-center gap-3 mb-6">
          <Link href="/buscar" className="flex items-center gap-1.5 text-sm font-medium link-muted">
            <ArrowLeft size={15} /> Explorar
          </Link>
          <span style={{ color: 'var(--border-medium)' }}>/</span>
          <span className="text-sm" style={{ color: 'var(--text-muted)' }}>{space.name}</span>
        </div>

        {/* Title */}
        <div className="flex items-start justify-between gap-6 mb-6">
          <div>
            <h1 className="text-4xl font-bold leading-tight mb-3"
              style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
              {space.name}
            </h1>
            <div className="flex items-center gap-3 flex-wrap">
              <span className="flex items-center gap-1.5 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                <MapPin size={14} style={{ color: 'var(--brand)' }} />
                {space.sector ? `${space.sector}, ` : ''}{space.city}
              </span>
              <span style={{ color: 'var(--border-medium)' }}>·</span>
              <span className="flex items-center gap-1.5 text-sm" style={{ color: 'var(--text-secondary)' }}>
                <Users size={14} /> {space.capacity_min ? `${space.capacity_min}–` : 'hasta '}{space.capacity_max} personas
              </span>
              {space.is_verified && (
                <span className="flex items-center gap-1.5 text-sm font-semibold px-3 py-1 rounded-full"
                  style={{ background: 'rgba(53,196,147,0.1)', color: 'var(--brand)', border: '1px solid rgba(53,196,147,0.2)' }}>
                  <Shield size={12} /> Verificado
                </span>
              )}
              <span className="text-sm px-3 py-1 rounded-full capitalize font-medium"
                style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}>
                {space.category}
              </span>
            </div>
          </div>
          <button className="btn-outline flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-xl shrink-0">
            <Share2 size={15} /> Compartir
          </button>
        </div>

        {/* Photos */}
        <div className="mb-10">
          <div className="relative rounded-3xl overflow-hidden" style={{ aspectRatio: '16/7', background: 'var(--bg-elevated)' }}>
            {images.length > 0 ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={images[photoIdx]?.url} alt={space.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span className="text-8xl opacity-20">🏛️</span>
              </div>
            )}
            {images.length > 1 && (
              <>
                <button onClick={() => setPhotoIdx(i => (i-1+images.length)%images.length)}
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 hover:bg-white flex items-center justify-center shadow-lg transition-all"
                  style={{ color: 'var(--text-primary)' }}>
                  <ChevronLeft size={20} />
                </button>
                <button onClick={() => setPhotoIdx(i => (i+1)%images.length)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 hover:bg-white flex items-center justify-center shadow-lg transition-all"
                  style={{ color: 'var(--text-primary)' }}>
                  <ChevronRight size={20} />
                </button>
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
                  {images.map((_: any, i: number) => (
                    <button key={i} onClick={() => setPhotoIdx(i)}
                      className={cn('h-1.5 rounded-full bg-white transition-all', photoIdx===i ? 'w-6 opacity-100' : 'w-1.5 opacity-50')} />
                  ))}
                </div>
                <div className="absolute top-4 right-4 bg-black/40 backdrop-blur-sm text-white text-xs px-3 py-1.5 rounded-full font-medium">
                  {photoIdx+1} / {images.length}
                </div>
              </>
            )}
          </div>
          {images.length > 1 && (
            <div className="flex gap-2 mt-2.5">
              {images.slice(0,5).map((img: any, i: number) => (
                <button key={i} onClick={() => setPhotoIdx(i)}
                  className={cn('h-16 flex-1 rounded-xl overflow-hidden transition-all', photoIdx===i ? 'ring-2 opacity-100' : 'opacity-55 hover:opacity-80')}
                  style={{ ['--tw-ring-color' as any]: 'var(--brand)' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.url} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Main grid */}
        <div className="grid grid-cols-[1fr_400px] gap-12 items-start">

          {/* ── LEFT ── */}
          <div>

            {/* Host */}
            {host && (
              <div className="flex items-center gap-4 pb-7 mb-7" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-xl font-bold shrink-0"
                  style={{ background: 'linear-gradient(135deg, var(--brand), var(--brand-dark))' }}>
                  {host.full_name?.charAt(0) ?? 'H'}
                </div>
                <div className="flex-1">
                  <div className="font-semibold" style={{ color: 'var(--text-primary)' }}>{host.full_name}</div>
                  <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>Propietario del espacio</div>
                </div>
                {host.id_verified && (
                  <div className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full"
                    style={{ background: 'rgba(34,197,94,0.08)', color: '#16A34A', border: '1px solid rgba(34,197,94,0.15)' }}>
                    <CheckCircle size={12} /> Identidad verificada
                  </div>
                )}
              </div>
            )}

            {/* Tabs */}
            <div className="flex gap-1 mb-8 p-1 rounded-2xl w-fit" style={{ background: 'var(--bg-elevated)' }}>
              {([
                { id: 'info',   label: 'Descripción' },
                { id: 'addons', label: `Adicionales${addons.length ? ` (${addons.length})` : ''}` },
                { id: 'rules',  label: 'Reglas' },
              ] as const).map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className="px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200"
                  style={activeTab === tab.id ? {
                    background: '#fff', color: 'var(--text-primary)',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                  } : { color: 'var(--text-secondary)' }}>
                  {tab.label}
                </button>
              ))}
            </div>

            {/* ── TAB: Descripción ── */}
            {activeTab === 'info' && (
              <div className="space-y-10">

                {/* Descripción */}
                {space.description && (
                  <div>
                    <p className="text-base leading-8" style={{ color: 'var(--text-secondary)' }}>
                      {space.description}
                    </p>
                  </div>
                )}

                {/* Detalles del espacio */}
                <div>
                  <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
                    Detalles del espacio
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: 'Tipo de espacio', value: space.category?.charAt(0).toUpperCase() + space.category?.slice(1), icon: '🏛️' },
                      { label: 'Capacidad', value: `${space.capacity_min ? space.capacity_min + '–' : 'Hasta '}${space.capacity_max} personas`, icon: '👥' },
                      { label: 'Ubicación', value: `${space.sector ? space.sector + ', ' : ''}${space.city}`, icon: '📍' },
                      { label: 'Modalidad', value: pricingTypeLabel[pricing?.pricing_type] ?? '—', icon: '💳' },
                      ...(pricing?.pricing_type === 'hourly' && pricing.min_hours ? [{ label: 'Mínimo de horas', value: `${pricing.min_hours} hora${pricing.min_hours > 1 ? 's' : ''}`, icon: '⏱️' }] : []),
                      ...(pricing?.pricing_type === 'hourly' && pricing.max_hours ? [{ label: 'Máximo de horas', value: `${pricing.max_hours} horas`, icon: '⌛' }] : []),
                      ...(pricing?.pricing_type === 'minimum_consumption' && pricing.session_hours ? [{ label: 'Duración de sesión', value: `${pricing.session_hours} horas`, icon: '⏳' }] : []),
                    ].map(({ label, value, icon }) => (
                      <div key={label} className="flex items-center gap-3 p-4 rounded-xl"
                        style={{ background: '#fff', border: '1px solid var(--border-subtle)' }}>
                        <span className="text-xl shrink-0">{icon}</span>
                        <div>
                          <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</div>
                          <div className="font-semibold text-sm mt-0.5" style={{ color: 'var(--text-primary)' }}>{value}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Facilidades */}
                <div>
                  <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
                    Facilidades
                  </h3>
                  <div className="grid grid-cols-4 gap-3">
                    {facilities.map(({ icon, label }) => (
                      <div key={label} className="flex flex-col items-center gap-2 p-4 rounded-xl text-center"
                        style={{ background: '#fff', border: '1px solid var(--border-subtle)' }}>
                        <span className="text-2xl">{icon}</span>
                        <span className="text-xs font-medium leading-tight" style={{ color: 'var(--text-secondary)' }}>{label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Amenidades (addons incluidos o package_includes) */}
                {(pricing?.package_includes?.length > 0 || addons.length > 0) && (
                  <div>
                    <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
                      Amenidades
                    </h3>
                    {pricing?.package_includes?.length > 0 ? (
                      <div className="grid grid-cols-2 gap-2.5">
                        {pricing.package_includes.map((item: string) => (
                          <div key={item} className="flex items-center gap-2.5 p-3 rounded-xl"
                            style={{ background: 'rgba(53,196,147,0.05)', border: '1px solid rgba(53,196,147,0.15)' }}>
                            <CheckCircle size={14} style={{ color: 'var(--brand)', flexShrink: 0 }} />
                            <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{item}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2.5">
                        {addons.slice(0, 6).map((addon: any) => (
                          <div key={addon.id} className="flex items-center gap-2.5 p-3 rounded-xl"
                            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
                            <span className="text-base shrink-0">{addonEmoji(addon.name)}</span>
                            <div className="min-w-0">
                              <div className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{addon.name}</div>
                              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>+ {formatCurrency(addon.price)}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Horarios */}
                {timeBlocks.length > 0 && (
                  <div>
                    <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
                      Horarios disponibles
                    </h3>
                    <div className="space-y-2.5">
                      {timeBlocks.map((block: any, i: number) => (
                        <div key={i} className="flex items-center justify-between p-4 rounded-xl"
                          style={{ background: '#fff', border: '1px solid var(--border-subtle)' }}>
                          <div className="flex items-center gap-3">
                            <Clock size={16} style={{ color: 'var(--brand)' }} />
                            <div>
                              <div className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>{block.block_name}</div>
                              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                {formatTime(block.start_time)} – {formatTime(block.end_time)}
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-1">
                            {DAYS.map((d, j) => (
                              <span key={j} className="text-xs px-1.5 py-0.5 rounded font-medium"
                                style={block.days_of_week?.includes(j)
                                  ? { background: 'var(--brand-dim)', color: 'var(--brand)' }
                                  : { background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}>
                                {d}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Forma de pago */}
                {paymentTerms && (
                  <div className="flex items-start gap-3 p-5 rounded-2xl"
                    style={{ background: 'var(--brand-dim)', border: '1px solid var(--brand-border)' }}>
                    <CreditCard size={18} style={{ color: 'var(--brand)', flexShrink: 0, marginTop: 2 }} />
                    <div>
                      <div className="font-semibold text-sm mb-0.5" style={{ color: 'var(--text-primary)' }}>Forma de pago</div>
                      <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>{termLabel[paymentTerms.term_type]}</div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── TAB: Adicionales (solo lectura — selección en el widget) ── */}
            {activeTab === 'addons' && (
              <div>
                {addons.length === 0 ? (
                  <div className="text-center py-12" style={{ color: 'var(--text-muted)' }}>
                    Este espacio no tiene servicios adicionales
                  </div>
                ) : (
                  <>
                    <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
                      Puedes agregar estos servicios al hacer tu reserva en el panel de la derecha.
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      {addons.map((addon: any) => (
                        <div key={addon.id}
                          className="flex items-center gap-4 p-4 rounded-2xl"
                          style={{ background: '#fff', border: '1px solid var(--border-subtle)' }}>
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
                            style={{ background: 'var(--bg-elevated)' }}>
                            {addonEmoji(addon.name)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>
                              {addon.name}
                            </div>
                            <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                              {formatCurrency(addon.price)} / {addon.unit}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ── TAB: Reglas ── */}
            {activeTab === 'rules' && (
              <div className="space-y-8">

                {conditions && (
                  <>
                    {/* Qué está permitido */}
                    <div>
                      <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
                        Qué está permitido
                      </h3>
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          { ok: conditions.allows_external_decoration, label: 'Decoración externa' },
                          { ok: conditions.allows_external_food,       label: 'Comida externa' },
                          { ok: conditions.allows_external_alcohol,    label: 'Alcohol externo' },
                          { ok: conditions.allows_smoking,             label: 'Fumar' },
                          { ok: conditions.allows_pets,                label: 'Mascotas' },
                        ].map(item => (
                          <div key={item.label} className="flex items-center gap-3 p-4 rounded-xl"
                            style={{ background: '#fff', border: '1px solid var(--border-subtle)' }}>
                            <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                              style={{ background: item.ok ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.08)' }}>
                              {item.ok
                                ? <CheckCircle size={15} className="text-green-500" />
                                : <X size={15} className="text-red-400" />}
                            </div>
                            <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{item.label}</span>
                          </div>
                        ))}
                        {conditions.music_cutoff_time && (
                          <div className="flex items-center gap-3 p-4 rounded-xl"
                            style={{ background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.2)' }}>
                            <Music size={16} className="text-amber-500 shrink-0" />
                            <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                              Música hasta {formatTime(conditions.music_cutoff_time)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Qué NO se permite */}
                    <div>
                      <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
                        Qué no se permite
                      </h3>
                      <div className="grid grid-cols-2 gap-2.5">
                        {notAllowed.map(item => (
                          <div key={item} className="flex items-center gap-2.5 p-3.5 rounded-xl"
                            style={{ background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.1)' }}>
                            <Ban size={14} className="text-red-400 shrink-0" />
                            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{item}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Política de cancelación */}
                    <div>
                      <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
                        Política de cancelación
                      </h3>
                      <div className="p-5 rounded-2xl" style={{ background: '#fff', border: '1px solid var(--border-subtle)' }}>
                        <div className="font-semibold text-base capitalize mb-2" style={{ color: 'var(--text-primary)' }}>
                          {conditions.cancellation_policy}
                        </div>
                        <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                          {conditions.cancellation_refund_pct}% de reembolso si cancelas con{' '}
                          {conditions.cancellation_hours_before}h o más de anticipación al evento.
                          {conditions.cancellation_refund_pct === 0 && ' No se realizan reembolsos.'}
                        </p>
                      </div>
                    </div>

                    {/* Depósito */}
                    {conditions.deposit_required && (
                      <div className="flex items-start gap-3 p-5 rounded-2xl"
                        style={{ background: 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.15)' }}>
                        <Lock size={16} className="text-blue-500 shrink-0 mt-0.5" />
                        <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                          <strong style={{ color: 'var(--text-primary)' }}>Depósito reembolsable: </strong>
                          {conditions.deposit_amount
                            ? formatCurrency(conditions.deposit_amount)
                            : conditions.deposit_percentage ? `${conditions.deposit_percentage}% del total` : 'Requerido'}
                        </div>
                      </div>
                    )}

                    {conditions.custom_rules && (
                      <div className="p-5 rounded-2xl" style={{ background: '#fff', border: '1px solid var(--border-subtle)' }}>
                        <div className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>
                          Reglas adicionales
                        </div>
                        <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{conditions.custom_rules}</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          {/* ── RIGHT: BOOKING WIDGET ── */}
          <div className="sticky top-24" style={{ overflow: 'visible' }}>
            <BookingWidget space={space} onChat={() => setShowChat(true)} initialDate={initialDate} />
          </div>

        </div>{/* end grid */}

        {/* ── ESPACIOS SIMILARES ── */}
        {similarSpaces.length > 0 && (() => {
          const hasExact = similarSpaces.some((s: any) => s._isExact)
          return (
            <div className="mt-16 pt-12" style={{ borderTop: '1px solid var(--border-subtle)' }}>

              {/* Encabezado */}
              <div className="flex items-start justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                    Espacios similares
                  </h2>
                  {!hasExact && (
                    <p className="text-sm mt-1.5" style={{ color: 'var(--text-secondary)' }}>
                      No encontramos una coincidencia exacta, pero estos espacios pueden funcionar para tu evento.
                    </p>
                  )}
                </div>
                <Link href="/buscar" className="text-sm font-medium link-muted shrink-0 mt-1">
                  Ver todos →
                </Link>
              </div>

              {/* Cards */}
              <div className="grid grid-cols-4 gap-4">
                {similarSpaces.map((s: any) => {
                  const cover   = getCover(s)
                  const display = s._pricingDisplay ?? {}
                  return (
                    <Link key={s.id} href={`/espacios/${s.slug}`} className="group block">
                      <div className="card-hover rounded-2xl overflow-hidden h-full flex flex-col"
                        style={{ background: '#fff', border: '1px solid var(--border-subtle)' }}>

                        {/* Imagen */}
                        <div className="relative h-36 overflow-hidden shrink-0"
                          style={{ background: 'var(--bg-elevated)' }}>
                          {cover ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={cover} alt={s.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center"
                              style={{ color: 'var(--border-medium)', fontSize: 32 }}>■</div>
                          )}
                          {/* Badge tipo de precio */}
                          {display.badge && (
                            <span className="absolute top-2 left-2 text-xs font-semibold px-2 py-0.5 rounded-full"
                              style={{
                                background: display.isAltModel
                                  ? 'rgba(59,130,246,0.9)'
                                  : 'rgba(0,0,0,0.65)',
                                color: '#fff',
                                backdropFilter: 'blur(4px)',
                              }}>
                              {display.badge}
                            </span>
                          )}
                        </div>

                        {/* Info */}
                        <div className="p-3.5 flex flex-col flex-1">
                          <h4 className="font-semibold text-sm leading-tight mb-1 group-hover:text-[#35C493] transition-colors"
                            style={{ color: 'var(--text-primary)' }}>
                            {s.name}
                          </h4>
                          <div className="flex items-center gap-1 text-xs mb-2" style={{ color: 'var(--text-muted)' }}>
                            <MapPin size={10} /> {s.sector ?? s.city}
                            <span className="mx-1" style={{ color: 'var(--border-medium)' }}>·</span>
                            <Users size={10} /> {s.capacity_max}
                          </div>

                          {/* Precio */}
                          <div className="mt-auto pt-2" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                            {display.main && (
                              <div className="text-xs font-bold" style={{ color: 'var(--brand)' }}>
                                {display.main}
                              </div>
                            )}
                            {display.sub && (
                              <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                                {display.sub}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>
          )
        })()}
      </div>
    </div>
  )
}
