'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  MapPin, Users, Shield, ChevronLeft, ChevronRight,
  Clock, CheckCircle, X, Music, Ban,
  ArrowLeft, Share2, CreditCard, Lock, ChevronDown, Play, Images, MessageCircle,
} from 'lucide-react'
import { cn, formatCurrency, formatTime } from '@/lib/utils'
import ChatDrawer from '@/components/marketplace/ChatDrawer'
import BookingWidget from '@/components/marketplace/BookingWidget'
import dynamic from 'next/dynamic'
const FavoriteButton = dynamic(() => import('@/components/marketplace/FavoriteButton'), { ssr: false })

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
  const [photoIdx,        setPhotoIdx]        = useState(0)
  const [showLightbox,    setShowLightbox]    = useState(false)
  const [showChat,        setShowChat]        = useState(false)
  const [activeTab,       setActiveTab]       = useState<'info' | 'addons' | 'rules'>('info')
  const [showMobileWidget,setShowMobileWidget]= useState(false)
  const [showVideoModal,  setShowVideoModal]  = useState(false)

  const images      = space.space_images ?? []
  const pricing     = space.space_pricing?.find((p: any) => p.is_active) ?? space.space_pricing?.[0]
  const conditions  = space.space_conditions?.[0]
  const paymentTerms = space.space_payment_terms?.[0]
  const addons      = space.space_addons ?? []
  const timeBlocks  = space.space_time_blocks ?? []
  const host        = space.profiles
  const facilities  = getFacilities(space)

  // Precio display para el sticky CTA móvil
  function getPriceDisplay() {
    if (!pricing) return null
    if (pricing.pricing_type === 'hourly') return `${formatCurrency(pricing.hourly_price)} / hr`
    if (pricing.pricing_type === 'minimum_consumption') return `Desde ${formatCurrency(pricing.minimum_consumption)}`
    if (pricing.pricing_type === 'fixed_package') return formatCurrency(pricing.fixed_price)
    return 'Cotizar'
  }
  const priceDisplay = getPriceDisplay()

  const notAllowed = [
    ...(conditions?.allows_external_food    === false ? ['Comida externa']              : []),
    ...(conditions?.allows_external_alcohol === false ? ['Alcohol externo']             : []),
    ...(conditions?.allows_smoking          === false ? ['Fumar en el local']           : []),
    ...(conditions?.allows_pets             === false ? ['Mascotas']                    : []),
    ...(conditions?.allows_external_decoration === false ? ['Decoración externa']       : []),
    'Subarrendamiento del espacio',
    'Eventos no autorizados',
  ]

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

      {/* ── MODAL BOOKING WIDGET EN MÓVIL ── */}
      {showMobileWidget && (
        <>
          <div className="lg:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowMobileWidget(false)} />
          <div className="lg:hidden fixed inset-x-0 bottom-0 z-50 rounded-t-3xl overflow-hidden slide-in-bottom"
            style={{ background: 'var(--bg-base)', maxHeight: '92dvh', overflowY: 'auto' }}>
            <div className="flex items-center justify-between px-5 pt-4 pb-3 sticky top-0"
              style={{ background: 'var(--bg-base)', borderBottom: '1px solid var(--border-subtle)', zIndex: 1 }}>
              <h3 className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>
                Reservar espacio
              </h3>
              <button onClick={() => setShowMobileWidget(false)}
                className="w-9 h-9 flex items-center justify-center rounded-full"
                style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>
                <X size={18} />
              </button>
            </div>
            <div className="px-4 pb-8">
              <BookingWidget space={space} onChat={() => { setShowMobileWidget(false); setShowChat(true) }} initialDate={initialDate} />
            </div>
          </div>
        </>
      )}

      <div className="max-w-7xl mx-auto px-4 md:px-6 py-5 md:py-8">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-4 md:mb-6">
          <Link href="/buscar" className="flex items-center gap-1.5 text-sm font-medium link-muted">
            <ArrowLeft size={14} /> Explorar
          </Link>
          <span style={{ color: 'var(--border-medium)' }}>/</span>
          <span className="text-sm truncate max-w-[180px] md:max-w-none" style={{ color: 'var(--text-muted)' }}>{space.name}</span>
        </div>

        {/* Title */}
        <div className="flex items-start justify-between gap-4 mb-5 md:mb-6">
          <div className="flex-1 min-w-0">
            <h1 className="font-bold leading-tight mb-2 md:mb-3"
              style={{
                color: 'var(--text-primary)',
                letterSpacing: '-0.02em',
                fontSize: 'clamp(1.5rem, 4vw, 2.25rem)',
              }}>
              {space.name}
            </h1>
            <div className="flex items-center gap-2 md:gap-3 flex-wrap">
              <span className="flex items-center gap-1.5 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                <MapPin size={13} style={{ color: 'var(--brand)' }} />
                {space.sector ? `${space.sector}, ` : ''}{space.city}
              </span>
              <span style={{ color: 'var(--border-medium)' }}>·</span>
              <span className="flex items-center gap-1.5 text-sm" style={{ color: 'var(--text-secondary)' }}>
                <Users size={13} /> {space.capacity_min ? `${space.capacity_min}–` : 'hasta '}{space.capacity_max} personas
              </span>
              {space.is_verified && (
                <span className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full"
                  style={{ background: 'rgba(53,196,147,0.1)', color: 'var(--brand)', border: '1px solid rgba(53,196,147,0.2)' }}>
                  <Shield size={11} /> Verificado
                </span>
              )}
              <span className="hidden sm:inline text-sm px-2.5 py-1 rounded-full capitalize font-medium"
                style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}>
                {space.category}
              </span>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2 shrink-0">
            <FavoriteButton spaceId={space.id} size="md" />
            <button
              onClick={() => {
                const url = window.location.href
                if (navigator.share) {
                  navigator.share({ title: space.name, url })
                } else {
                  navigator.clipboard.writeText(url).then(() => alert('Enlace copiado'))
                }
              }}
              className="btn-outline flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-xl">
              <Share2 size={14} /> Compartir
            </button>
          </div>
        </div>

        {/* ── Galería de medios ── */}
        <div className="mb-6 md:mb-10">

          {/* ────────────────────── DESKTOP: Grid 5 celdas ── */}
          <div className="hidden md:grid gap-2 rounded-3xl overflow-hidden relative"
            style={{ gridTemplateColumns: '1.65fr 1fr 1fr', gridTemplateRows: '224px 224px' }}>

            {/* Celda 1: foto principal (span 2 filas) */}
            <button
              onClick={() => { setPhotoIdx(0); setShowLightbox(true) }}
              className="relative row-span-2 overflow-hidden group cursor-zoom-in"
              style={{ background: 'var(--bg-elevated)' }}>
              {images[0] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={images[0].url} alt={space.name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-8xl opacity-20">🏛️</span>
                </div>
              )}
            </button>

            {/* Celdas 2-5 */}
            {[1, 2, 3, 4].map(slot => {
              const img = images[slot]
              const totalMedia = images.length + (space.video_url ? 1 : 0)
              const isLastCell = slot === 4
              const hiddenCount = totalMedia - 5

              // Slot 4 → video si no hay 5ª foto
              if (!img && slot === 4 && space.video_url) {
                return (
                  <button key="video-cell"
                    onClick={() => setShowVideoModal(true)}
                    className="relative overflow-hidden group cursor-pointer"
                    style={{ background: '#080808' }}>
                    <video src={`${space.video_url}#t=0.5`} muted preload="metadata"
                      className="w-full h-full object-cover opacity-70" />
                    <div className="absolute inset-0 flex items-center justify-center"
                      style={{ background: 'rgba(0,0,0,0.38)' }}>
                      <div className="w-11 h-11 rounded-full flex items-center justify-center shadow-xl transition-transform duration-200 group-hover:scale-110"
                        style={{ background: 'rgba(255,255,255,0.95)' }}>
                        <Play size={18} className="ml-0.5" style={{ color: '#111' }} />
                      </div>
                    </div>
                    <div className="absolute bottom-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
                      style={{ background: 'rgba(0,0,0,0.6)', color: '#fff', backdropFilter: 'blur(6px)' }}>
                      <Play size={10} /> Ver video
                    </div>
                  </button>
                )
              }

              if (!img) return (
                <div key={slot} style={{ background: 'var(--bg-elevated)' }} />
              )

              return (
                <button key={slot}
                  onClick={() => { setPhotoIdx(slot); setShowLightbox(true) }}
                  className="relative overflow-hidden group cursor-zoom-in"
                  style={{ background: 'var(--bg-elevated)' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.url} alt=""
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]" />
                  {/* Overlay "+N más" en la última celda si hay más fotos */}
                  {isLastCell && hiddenCount > 0 && (
                    <div className="absolute inset-0 flex items-center justify-center"
                      style={{ background: 'rgba(3,49,60,0.65)', backdropFilter: 'blur(2px)' }}>
                      <div className="text-white text-center">
                        <div className="text-2xl font-bold tracking-tight">+{hiddenCount}</div>
                        <div className="text-xs font-medium opacity-80 mt-0.5">
                          {hiddenCount === 1 ? 'foto más' : 'fotos más'}
                        </div>
                      </div>
                    </div>
                  )}
                </button>
              )
            })}

            {/* Botón "Ver todas las fotos" */}
            {images.length > 0 && (
              <button
                onClick={() => { setPhotoIdx(0); setShowLightbox(true) }}
                className="absolute bottom-4 right-4 flex items-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-xl shadow-lg transition-all hover:shadow-xl hover:-translate-y-px"
                style={{ background: '#fff', color: 'var(--text-primary)', border: '1px solid rgba(0,0,0,0.08)' }}>
                <Images size={15} />
                Ver fotos{images.length > 1 ? ` (${images.length})` : ''}
              </button>
            )}
          </div>

          {/* ────────────────────── MÓVIL: Carousel ── */}
          <div className="md:hidden relative rounded-2xl overflow-hidden"
            style={{ aspectRatio: '4/3', background: 'var(--bg-elevated)' }}>
            {images.length > 0 ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={images[photoIdx]?.url} alt={space.name}
                className="w-full h-full object-cover"
                onClick={() => setShowLightbox(true)} />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span className="text-6xl opacity-20">🏛️</span>
              </div>
            )}

            {images.length > 1 && (
              <>
                <button onClick={() => setPhotoIdx(i => (i - 1 + images.length) % images.length)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 flex items-center justify-center shadow-lg transition-all active:scale-95"
                  style={{ color: 'var(--text-primary)' }}>
                  <ChevronLeft size={18} />
                </button>
                <button onClick={() => setPhotoIdx(i => (i + 1) % images.length)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 flex items-center justify-center shadow-lg transition-all active:scale-95"
                  style={{ color: 'var(--text-primary)' }}>
                  <ChevronRight size={18} />
                </button>
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                  {images.slice(0, 8).map((_: any, i: number) => (
                    <button key={i} onClick={() => setPhotoIdx(i)}
                      className={cn('h-1.5 rounded-full bg-white transition-all', photoIdx === i ? 'w-5 opacity-100' : 'w-1.5 opacity-40')} />
                  ))}
                </div>
                <div className="absolute top-3 right-3 bg-black/45 backdrop-blur-sm text-white text-xs px-2.5 py-1 rounded-full font-medium">
                  {photoIdx + 1}/{images.length}
                </div>
              </>
            )}

            {/* Botón ver video en móvil */}
            {space.video_url && (
              <button onClick={() => setShowVideoModal(true)}
                className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-semibold transition-all active:scale-95"
                style={{ background: 'rgba(0,0,0,0.6)', color: '#fff', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.15)' }}>
                <Play size={11} /> Ver video
              </button>
            )}
          </div>
        </div>

        {/* ── Lightbox de fotos ── */}
        {showLightbox && images.length > 0 && (
          <div
            className="fixed inset-0 z-[60] flex flex-col items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.96)', backdropFilter: 'blur(4px)' }}
            onClick={() => setShowLightbox(false)}>

            {/* Foto principal */}
            <div className="relative w-full flex items-center justify-center px-12 md:px-20"
              style={{ maxHeight: '78vh' }}
              onClick={e => e.stopPropagation()}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={images[photoIdx]?.url}
                alt={space.name}
                className="max-w-full max-h-[78vh] rounded-2xl object-contain shadow-2xl"
              />

              {/* Flechas */}
              {images.length > 1 && (
                <>
                  <button onClick={() => setPhotoIdx(i => (i - 1 + images.length) % images.length)}
                    className="absolute left-2 md:left-6 w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-110"
                    style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)' }}>
                    <ChevronLeft size={20} />
                  </button>
                  <button onClick={() => setPhotoIdx(i => (i + 1) % images.length)}
                    className="absolute right-2 md:right-6 w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-110"
                    style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)' }}>
                    <ChevronRight size={20} />
                  </button>
                </>
              )}
            </div>

            {/* Contador */}
            <div className="mt-3 text-xs font-medium" style={{ color: 'rgba(255,255,255,0.5)' }}>
              {photoIdx + 1} / {images.length}
            </div>

            {/* Tira de thumbnails */}
            {images.length > 1 && (
              <div className="flex gap-2 mt-3 px-4 overflow-x-auto scrollbar-hide max-w-full"
                onClick={e => e.stopPropagation()}>
                {images.map((img: any, i: number) => (
                  <button key={i} onClick={() => setPhotoIdx(i)}
                    className={cn('h-14 w-20 rounded-lg overflow-hidden shrink-0 transition-all', i === photoIdx ? 'ring-2 opacity-100 scale-105' : 'opacity-35 hover:opacity-65')}
                    style={{ ['--tw-ring-color' as any]: 'var(--brand)' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img.url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            {/* Cerrar */}
            <button onClick={() => setShowLightbox(false)}
              className="absolute top-5 right-5 w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-110"
              style={{ background: 'rgba(255,255,255,0.12)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)' }}>
              <X size={18} />
            </button>
          </div>
        )}

        {/* ── Modal de video ── */}
        {showVideoModal && space.video_url && (
          <>
            <div
              className="fixed inset-0 z-[60] flex items-center justify-center p-4 md:p-10"
              style={{ background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(12px)' }}
              onClick={() => setShowVideoModal(false)}>
              <div className="relative w-full max-w-4xl" onClick={e => e.stopPropagation()}>
                {/* Cerrar */}
                <button
                  onClick={() => setShowVideoModal(false)}
                  className="absolute -top-4 -right-4 z-10 w-9 h-9 rounded-full flex items-center justify-center transition-all hover:scale-110"
                  style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.2)' }}>
                  <X size={17} />
                </button>
                {/* Player */}
                <div className="rounded-2xl overflow-hidden" style={{ background: '#000', boxShadow: '0 24px 64px rgba(0,0,0,0.6)' }}>
                  <video
                    src={space.video_url}
                    controls
                    autoPlay
                    className="w-full"
                    style={{ maxHeight: '78vh', display: 'block' }}>
                    Tu navegador no soporta video.
                  </video>
                </div>
                {/* Nombre del espacio */}
                <p className="text-center mt-3 text-sm font-medium" style={{ color: 'rgba(255,255,255,0.55)' }}>
                  {space.name}
                </p>
              </div>
            </div>
          </>
        )}

        {/* Main grid — widget primero en móvil (order-1), contenido segundo (order-2) */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6 lg:gap-12 items-start">

          {/* ── IZQUIERDA: Contenido (order-2 en móvil, order-1 en desktop) ── */}
          <div className="order-2 lg:order-1">

            {/* Host */}
            {host && (
              <div className="flex items-center gap-4 pb-6 mb-6" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center text-white text-xl font-bold shrink-0"
                  style={{ background: 'linear-gradient(135deg, var(--brand), var(--brand-dark))' }}>
                  {host.full_name?.charAt(0) ?? 'H'}
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-sm md:text-base" style={{ color: 'var(--text-primary)' }}>{host.full_name}</div>
                  <div className="text-xs md:text-sm" style={{ color: 'var(--text-secondary)' }}>Propietario del espacio</div>
                </div>
                {host.id_verified && (
                  <div className="hidden sm:flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full"
                    style={{ background: 'rgba(34,197,94,0.08)', color: '#16A34A', border: '1px solid rgba(34,197,94,0.15)' }}>
                    <CheckCircle size={12} /> Identidad verificada
                  </div>
                )}
              </div>
            )}

            {/* Tabs */}
            <div className="mb-6 md:mb-8">
              <div className="flex gap-1 p-1 rounded-2xl w-full md:w-fit" style={{ background: 'var(--bg-elevated)' }}>
                {([
                  { id: 'info',   label: 'Descripción' },
                  { id: 'addons', label: `Adicionales${addons.length ? ` (${addons.length})` : ''}` },
                  { id: 'rules',  label: 'Reglas' },
                ] as const).map(tab => (
                  <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                    className="flex-1 md:flex-none px-4 md:px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200"
                    style={activeTab === tab.id ? {
                      background: '#fff', color: 'var(--text-primary)',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                    } : { color: 'var(--text-secondary)' }}>
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* ── TAB: Descripción ── */}
            {activeTab === 'info' && (
              <div className="space-y-8 md:space-y-10">

                {space.description && (
                  <div>
                    <p className="text-sm md:text-base leading-7 md:leading-8" style={{ color: 'var(--text-secondary)' }}>
                      {space.description}
                    </p>
                  </div>
                )}

                {/* Detalles */}
                <div>
                  <h3 className="text-base md:text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
                    Detalles del espacio
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                  <h3 className="text-base md:text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
                    Facilidades
                  </h3>
                  <div className="grid grid-cols-4 sm:grid-cols-4 gap-3">
                    {facilities.map(({ icon, label }) => (
                      <div key={label} className="flex flex-col items-center gap-2 p-3 md:p-4 rounded-xl text-center"
                        style={{ background: '#fff', border: '1px solid var(--border-subtle)' }}>
                        <span className="text-xl md:text-2xl">{icon}</span>
                        <span className="text-xs font-medium leading-tight" style={{ color: 'var(--text-secondary)' }}>{label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Amenidades */}
                {(pricing?.package_includes?.length > 0 || addons.length > 0) && (
                  <div>
                    <h3 className="text-base md:text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
                      Amenidades
                    </h3>
                    {pricing?.package_includes?.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {pricing.package_includes.map((item: string) => (
                          <div key={item} className="flex items-center gap-2.5 p-3 rounded-xl"
                            style={{ background: 'rgba(53,196,147,0.05)', border: '1px solid rgba(53,196,147,0.15)' }}>
                            <CheckCircle size={14} style={{ color: 'var(--brand)', flexShrink: 0 }} />
                            <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{item}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
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

                {/* Horarios disponibles */}
                {timeBlocks.length > 0 && (
                  <div>
                    <h3 className="text-base md:text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
                      Horarios disponibles
                    </h3>
                    <div className="space-y-2.5">
                      {timeBlocks.map((block: any, i: number) => (
                        <div key={i} className="p-4 rounded-xl"
                          style={{ background: '#fff', border: '1px solid var(--border-subtle)' }}>
                          <div className="flex items-center gap-3 mb-3">
                            <Clock size={15} style={{ color: 'var(--brand)' }} />
                            <div>
                              <div className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>{block.block_name}</div>
                              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                {formatTime(block.start_time)} – {formatTime(block.end_time)}
                              </div>
                            </div>
                          </div>
                          {/* Días: en móvil se wrap mejor */}
                          <div className="flex gap-1 flex-wrap">
                            {DAYS.map((d, j) => (
                              <span key={j}
                                className="text-xs px-2 py-1 rounded-lg font-semibold"
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
                  <div className="flex items-start gap-3 p-4 md:p-5 rounded-2xl"
                    style={{ background: 'var(--brand-dim)', border: '1px solid var(--brand-border)' }}>
                    <CreditCard size={18} style={{ color: 'var(--brand)', flexShrink: 0, marginTop: 2 }} />
                    <div>
                      <div className="font-semibold text-sm mb-0.5" style={{ color: 'var(--text-primary)' }}>Forma de pago</div>
                      <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>{termLabel[paymentTerms.term_type]}</div>
                    </div>
                  </div>
                )}

                {/* ── Habla con el propietario ── */}
                {host && (
                  <div className="rounded-2xl overflow-hidden"
                    style={{ border: '1px solid var(--border-subtle)', boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>

                    {/* Header */}
                    <div className="flex items-center gap-3.5 px-5 py-4"
                      style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border-subtle)' }}>
                      <div className="relative shrink-0">
                        <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-white text-base font-bold"
                          style={{ background: 'linear-gradient(135deg, var(--brand), var(--brand-dark))' }}>
                          {host.full_name?.charAt(0).toUpperCase() ?? '?'}
                        </div>
                        <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white bg-green-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-sm leading-tight" style={{ color: 'var(--text-primary)' }}>
                          {host.full_name}
                        </div>
                        <div className="text-xs mt-0.5 font-medium" style={{ color: 'var(--brand)' }}>
                          Propietario · Responde en menos de 24h
                        </div>
                      </div>
                      <button
                        onClick={() => setShowChat(true)}
                        className="hidden sm:flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-xl transition-all hover:opacity-90"
                        style={{ background: '#03313C', color: '#fff' }}>
                        <MessageCircle size={13} /> Mensaje
                      </button>
                    </div>

                    {/* Body */}
                    <div className="px-5 pt-4 pb-5" style={{ background: '#fff' }}>
                      <h3 className="font-bold text-base mb-1" style={{ color: 'var(--text-primary)' }}>
                        ¿Tienes preguntas sobre este Espot?
                      </h3>
                      <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                        Habla directamente con {host.full_name?.split(' ')[0]} antes de reservar.
                        Pregunta lo que necesites saber.
                      </p>

                      {/* Preguntas rápidas */}
                      <div className="flex flex-wrap gap-2 mb-4">
                        {[
                          '¿Hay disponibilidad para mi fecha?',
                          '¿Permiten decoración externa?',
                          '¿Cuál es el consumo mínimo?',
                          '¿Hay estacionamiento?',
                          '¿A qué hora puedo montar?',
                          '¿Tienen música en vivo?',
                        ].map(q => (
                          <button
                            key={q}
                            onClick={() => setShowChat(true)}
                            className="text-xs px-3 py-1.5 rounded-full transition-all hover:border-[#35C493] hover:text-[#35C493]"
                            style={{
                              background: 'var(--bg-elevated)',
                              color: 'var(--text-secondary)',
                              border: '1px solid var(--border-subtle)',
                            }}>
                            {q}
                          </button>
                        ))}
                      </div>

                      <button
                        onClick={() => setShowChat(true)}
                        className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-2xl font-bold text-sm transition-all hover:opacity-90 active:scale-[0.99]"
                        style={{
                          background: '#03313C',
                          color: '#fff',
                          boxShadow: '0 4px 16px rgba(3,49,60,0.18)',
                        }}>
                        <MessageCircle size={17} />
                        Enviar mensaje a {host.full_name?.split(' ')[0]}
                      </button>

                      <p className="text-xs text-center mt-2.5" style={{ color: 'var(--text-muted)' }}>
                        Sin compromiso · Respuesta en menos de 24 horas
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── TAB: Adicionales ── */}
            {activeTab === 'addons' && (
              <div>
                {addons.length === 0 ? (
                  <div className="text-center py-12" style={{ color: 'var(--text-muted)' }}>
                    Este espacio no tiene servicios adicionales
                  </div>
                ) : (
                  <>
                    <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
                      Puedes agregar estos servicios al hacer tu reserva.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
              <div className="space-y-6 md:space-y-8">
                {conditions && (
                  <>
                    <div>
                      <h3 className="text-base md:text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
                        Qué está permitido
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

                    <div>
                      <h3 className="text-base md:text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
                        Qué no se permite
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {notAllowed.map(item => (
                          <div key={item} className="flex items-center gap-2.5 p-3.5 rounded-xl"
                            style={{ background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.1)' }}>
                            <Ban size={14} className="text-red-400 shrink-0" />
                            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{item}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h3 className="text-base md:text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
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

          {/* ── DERECHA: BOOKING WIDGET (order-1 en móvil, order-2 en desktop) ── */}
          {/* En desktop aparece como sticky column. En móvil está hidden (se usa el bottom sheet). */}
          <div className="order-1 lg:order-2 lg:sticky lg:top-24 hidden lg:block" style={{ overflow: 'visible' }}>
            <BookingWidget space={space} onChat={() => setShowChat(true)} initialDate={initialDate} />
          </div>

        </div>{/* end grid */}

        {/* ── ESPACIOS SIMILARES ── */}
        {similarSpaces.length > 0 && (() => {
          const hasExact = similarSpaces.some((s: any) => s._isExact)
          return (
            <div className="mt-12 md:mt-16 pt-8 md:pt-12" style={{ borderTop: '1px solid var(--border-subtle)' }}>
              <div className="flex items-start justify-between gap-4 mb-5 md:mb-6">
                <div>
                  <h2 className="text-xl md:text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                    Espacios similares
                  </h2>
                  {!hasExact && (
                    <p className="text-sm mt-1.5" style={{ color: 'var(--text-secondary)' }}>
                      Otros espacios que pueden funcionar para tu evento.
                    </p>
                  )}
                </div>
                <Link href="/buscar" className="text-sm font-medium link-muted shrink-0 mt-1">
                  Ver todos →
                </Link>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                {similarSpaces.map((s: any) => {
                  const cover   = getCover(s)
                  const display = s._pricingDisplay ?? {}
                  return (
                    <Link key={s.id} href={`/espacios/${s.slug}`} className="group block">
                      <div className="card-hover rounded-2xl overflow-hidden h-full flex flex-col"
                        style={{ background: '#fff', border: '1px solid var(--border-subtle)' }}>
                        <div className="relative overflow-hidden shrink-0"
                          style={{ aspectRatio: '4/3', background: 'var(--bg-elevated)' }}>
                          {cover ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={cover} alt={s.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center"
                              style={{ color: 'var(--border-medium)', fontSize: 28 }}>■</div>
                          )}
                          {display.badge && (
                            <span className="absolute top-2 left-2 text-xs font-semibold px-2 py-0.5 rounded-full"
                              style={{
                                background: display.isAltModel ? 'rgba(59,130,246,0.9)' : 'rgba(0,0,0,0.65)',
                                color: '#fff', backdropFilter: 'blur(4px)',
                              }}>
                              {display.badge}
                            </span>
                          )}
                        </div>
                        <div className="p-3 md:p-3.5 flex flex-col flex-1">
                          <h4 className="font-semibold text-sm leading-tight mb-1 group-hover:text-[#35C493] transition-colors"
                            style={{ color: 'var(--text-primary)' }}>
                            {s.name}
                          </h4>
                          <div className="flex items-center gap-1 text-xs mb-2" style={{ color: 'var(--text-muted)' }}>
                            <MapPin size={10} /> {s.sector ?? s.city}
                            <span className="mx-1" style={{ color: 'var(--border-medium)' }}>·</span>
                            <Users size={10} /> {s.capacity_max}
                          </div>
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

        {/* Espacio extra al fondo para el sticky CTA móvil */}
        <div className="h-24 lg:hidden" />
      </div>

      {/* ── MÓVIL: Sticky CTA de reserva ── */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 px-4 py-3 pb-safe"
        style={{
          background: 'rgba(255,255,255,0.97)',
          backdropFilter: 'blur(20px)',
          borderTop: '1px solid var(--border-subtle)',
          boxShadow: '0 -4px 24px rgba(0,0,0,0.10)',
        }}>
        <div className="flex items-center gap-4">
          <div className="flex-1 min-w-0">
            {priceDisplay && (
              <div className="font-bold text-base leading-tight" style={{ color: 'var(--text-primary)' }}>
                {priceDisplay}
              </div>
            )}
            <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              {space.capacity_min ? `${space.capacity_min}–` : 'hasta '}{space.capacity_max} personas
            </div>
          </div>
          <button
            onClick={() => setShowMobileWidget(true)}
            className="btn-brand flex items-center gap-2 px-6 py-3.5 rounded-2xl text-sm font-bold shrink-0"
            style={{ boxShadow: '0 4px 16px rgba(53,196,147,0.35)' }}>
            Reservar
            <ChevronDown size={16} style={{ transform: 'rotate(-90deg)' }} />
          </button>
        </div>
      </div>
    </div>
  )
}
