'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { getSpaceReviews, type ReviewsSummary } from '@/lib/actions/reviews'
import Link from 'next/link'
import {
  MapPin, Users, Shield, ChevronLeft, ChevronRight,
  Clock, CheckCircle, X, Music, Ban,
  ArrowLeft, Share2, CreditCard, Lock, FileText, ChevronDown, Play, Images, MessageCircle,
  Car, Wifi, Wind, UtensilsCrossed, Volume2, Monitor, Music2, Trees, Waves, Wine,
  Sun, Zap, ShowerHead, Building2, Star, Video, Package, Sparkles, Camera,
} from 'lucide-react'
import { cn, formatCurrency, formatTime } from '@/lib/utils'
import { scheduleModelLabel } from '@/lib/payments/schedule'
import ChatDrawer from '@/components/marketplace/ChatDrawer'
import BookingWidget from '@/components/marketplace/BookingWidget'
import dynamic from 'next/dynamic'
const FavoriteButton     = dynamic(() => import('@/components/marketplace/FavoriteButton'), { ssr: false })
const SpaceLocationMap   = dynamic(() => import('@/components/marketplace/SpaceLocationMap'), {
  ssr: false,
  loading: () => <div className="rounded-2xl animate-pulse" style={{ height: 240, background: 'var(--bg-elevated)' }} />,
})

// Avatar del host con fallback a inicial + onError para URLs rotas
function HostAvatar({ avatarUrl, fullName, size = 56 }: { avatarUrl: string | null; fullName: string | null; size?: number }) {
  const [imgError, setImgError] = useState(false)
  const initial = (fullName ?? 'H').charAt(0).toUpperCase()
  const radius  = Math.round(size * 0.28)

  return (
    <div
      className="shrink-0 overflow-hidden flex items-center justify-center"
      style={{
        width: size, height: size,
        borderRadius: radius,
        background: 'linear-gradient(135deg, var(--brand), var(--brand-dark))',
        flexShrink: 0,
      }}>
      {avatarUrl && !imgError ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={avatarUrl}
          alt={fullName ?? ''}
          className="w-full h-full object-cover"
          onError={() => setImgError(true)}
        />
      ) : (
        <div
          className="w-full h-full flex items-center justify-center text-white font-bold"
          style={{ fontSize: Math.round(size * 0.38) }}>
          {initial}
        </div>
      )}
    </div>
  )
}

function daysToLabel(days: number[]): string {
  if (!days?.length) return '—'
  const s = [...days].sort((a, b) => a - b)
  const N = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
  if (s.length === 7) return 'Todos los días'
  if (s.join() === '1,2,3,4,5') return 'Lun – Vie'
  if (s.join() === '0,6')       return 'Sáb y Dom'
  if (s.join() === '1,2,3,4,5,6') return 'Lun – Sáb'
  if (s.join() === '0,1,2,3,4,5') return 'Dom – Vie'
  // Rango consecutivo
  const isConsec = s.every((d, i) => i === 0 || d === s[i - 1] + 1)
  if (isConsec) return `${N[s[0]]} – ${N[s[s.length - 1]]}`
  // Lista corta
  if (s.length <= 3) return s.map(d => N[d]).join(', ')
  return `${N[s[0]]} – ${N[s[s.length - 1]]}`
}

function addonIcon(name: string) {
  const n = name.toLowerCase()
  if (n.includes('bartender') || n.includes('barra')) return Wine
  if (n.includes('dj'))         return Music2
  if (n.includes('sonido'))     return Volume2
  if (n.includes('iluminaci'))  return Sun
  if (n.includes('camarero'))   return Users
  if (n.includes('seguridad'))  return Shield
  if (n.includes('decorac'))    return Sparkles
  if (n.includes('proyector'))  return Monitor
  if (n.includes('torta') || n.includes('pastel')) return Package
  if (n.includes('menú') || n.includes('catering')) return UtensilsCrossed
  if (n.includes('vino') || n.includes('open bar')) return Wine
  if (n.includes('fotóg') || n.includes('foto'))   return Camera
  if (n.includes('video'))      return Video
  if (n.includes('músico') || n.includes('orquesta')) return Music2
  if (n.includes('maquill'))    return Sparkles
  if (n.includes('extra') || n.includes('hora adicional')) return Clock
  if (n.includes('suite'))      return Building2
  if (n.includes('pantalla') || n.includes('led')) return Monitor
  return Package
}

function getFacilities(space: any): { icon: any; label: string }[] {
  const cond = space.space_conditions?.[0]
  const result: { icon: any; label: string }[] = []

  if (cond) {
    if (cond.has_parking)       result.push({ icon: Car,            label: 'Estacionamiento' })
    if (cond.has_valet_parking) result.push({ icon: Car,            label: 'Valet parking' })
    if (cond.has_wifi)          result.push({ icon: Wifi,           label: 'WiFi incluido' })
    if (cond.has_ac)            result.push({ icon: Wind,           label: 'Aire acondicionado' })
    if (cond.has_kitchen)       result.push({ icon: UtensilsCrossed,label: 'Cocina equipada' })
    if (cond.has_sound_system)  result.push({ icon: Volume2,        label: 'Sistema de sonido' })
    if (cond.has_projector)     result.push({ icon: Monitor,        label: 'Proyector' })
    if (cond.has_dance_floor)   result.push({ icon: Music2,         label: 'Pista de baile' })
    if (cond.has_outdoor_area)  result.push({ icon: Trees,          label: 'Área al aire libre' })
    if (cond.has_pool)          result.push({ icon: Waves,          label: 'Piscina' })
    if (cond.has_bar)           result.push({ icon: Wine,           label: 'Barra de bar' })
    if (cond.has_stage)         result.push({ icon: Music2,         label: 'Escenario' })
    if (cond.has_cyclorama)     result.push({ icon: Camera,         label: 'Ciclorama profesional' })
    if (cond.has_natural_light) result.push({ icon: Sun,            label: 'Luz natural' })
    if (cond.has_generator)     result.push({ icon: Zap,            label: 'Planta eléctrica' })
    if (cond.has_dressing_room) result.push({ icon: ShowerHead,     label: 'Camerino' })
    if ((cond.chairs_count ?? 0) > 0)
      result.push({ icon: Users,    label: `${cond.chairs_count} sillas` })
    if ((cond.tables_count ?? 0) > 0)
      result.push({ icon: Building2, label: `${cond.tables_count} mesas` })
    if ((cond.bathrooms_count ?? 0) > 0)
      result.push({ icon: ShowerHead, label: `${cond.bathrooms_count} baño${cond.bathrooms_count > 1 ? 's' : ''} privado${cond.bathrooms_count > 1 ? 's' : ''}` })
  }

  // Fallback por categoría si el host no ha configurado facilidades aún
  if (result.length === 0) {
    const cat = space.category
    if (['salon','hotel','villa'].includes(cat))              result.push({ icon: Car,            label: 'Estacionamiento' })
    if (['restaurante','hotel','villa','salon'].includes(cat)) result.push({ icon: UtensilsCrossed,label: 'Cocina equipada' })
    result.push({ icon: Wind,   label: 'Aire acondicionado' })
    result.push({ icon: Wifi,   label: 'WiFi incluido' })
    if (['salon','hotel','villa'].includes(cat))              result.push({ icon: Volume2, label: 'Sistema de sonido' })
    if (['salon','hotel'].includes(cat))                      result.push({ icon: Music2,  label: 'Pista de baile' })
    if (['rooftop','terraza','villa'].includes(cat))          result.push({ icon: Trees,   label: 'Área al aire libre' })
    if (cat === 'villa')                                      result.push({ icon: Waves,   label: 'Piscina' })
    if (['salon','hotel'].includes(cat))                      result.push({ icon: ShowerHead, label: 'Baños privados' })
    if (cat === 'estudio')                                    result.push({ icon: Camera,  label: 'Ciclorama profesional' })
  }

  return result.slice(0, 12)
}

const pricingTypeLabel: Record<string, string> = {
  hourly:              'Precio por hora',
  minimum_consumption: 'Consumibles',
  fixed_package:       'Paquete fijo',
  custom_quote:        'Cotización personalizada',
}

const termLabel: Record<string, string> = {
  platform_guarantee: 'Pago de confirmación al reservar · Saldo en el lugar',
  split_advance:      'Pago dividido en etapas gestionado por espot.do',
  full_prepaid:       '100% al reservar por espot.do',
  quote_only:         'Cotización personalizada · Pago al confirmar',
}

export default function SpaceDetailClient({ space, similarSpaces = [], initialDate }: { space: any; similarSpaces?: any[]; initialDate?: string }) {
  const [photoIdx,        setPhotoIdx]        = useState(0)
  const [showLightbox,    setShowLightbox]    = useState(false)
  const mobileTouchX = useRef<number | null>(null)
  const [showChat,        setShowChat]        = useState(false)
  const [activeTab,       setActiveTab]       = useState<'info' | 'addons' | 'rules' | 'reviews'>('info')
  const [reviewsData,     setReviewsData]     = useState<ReviewsSummary | null>(null)

  // Auto-abrir chat si viene de ?chat=1 (desde botón "Preguntar" en SpaceCard)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const p = new URLSearchParams(window.location.search)
    if (p.get('chat') !== '1') return
    const url = new URL(window.location.href)
    url.searchParams.delete('chat')
    window.history.replaceState({}, '', url.toString())
    const t = setTimeout(() => setShowChat(true), 300)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    getSpaceReviews(space.id).then(setReviewsData).catch(() => {})
  }, [space.id])

  useEffect(() => {
    function onEscape(e: KeyboardEvent) {
      if (e.key !== 'Escape') return
      setShowLightbox(false)
      setShowVideoModal(false)
      setShowMobileWidget(false)
    }
    document.addEventListener('keydown', onEscape)
    return () => document.removeEventListener('keydown', onEscape)
  }, [])
  const [showMobileWidget,setShowMobileWidget]= useState(false)
  const [showVideoModal,  setShowVideoModal]  = useState(false)
  const [showShareMenu,   setShowShareMenu]   = useState(false)
  const [copied,          setCopied]          = useState(false)

  const images      = [...(space.space_images ?? [])].sort((a: any, b: any) => {
    if (a.is_cover && !b.is_cover) return -1
    if (!a.is_cover && b.is_cover) return 1
    return (a.position ?? 99) - (b.position ?? 99)
  })
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
    if (pricing.pricing_type === 'hourly')
      return pricing.hourly_price ? `${formatCurrency(pricing.hourly_price)} / hr` : 'Por hora'
    if (pricing.pricing_type === 'minimum_consumption')
      return pricing.minimum_consumption ? `Desde ${formatCurrency(pricing.minimum_consumption)}` : 'Consumibles'
    if (pricing.pricing_type === 'fixed_package')
      return pricing.fixed_price ? formatCurrency(pricing.fixed_price) : 'Paquete'
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
    <div style={{ background: 'var(--bg-base)', minHeight: '100dvh' }}>

      {/* Chat Drawer */}
      {showChat && hostProfile && (
        <ChatDrawer
          spaceId={space.id}
          spaceName={space.name}
          hostId={hostProfile.id ?? space.host_id}
          hostName={hostProfile.full_name ?? 'Propietario'}
          hostAvatarUrl={hostProfile.avatar_url ?? null}
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
              <h3 className="font-bold text-sm truncate" style={{ color: 'var(--text-primary)' }}>
                {space.name}
              </h3>
              <button onClick={() => setShowMobileWidget(false)}
                className="w-10 h-10 flex items-center justify-center rounded-full"
                style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>
                <X size={18} />
              </button>
            </div>
            <div className="px-4 pb-safe">
              <BookingWidget space={space} onChat={() => { setShowMobileWidget(false); setShowChat(true) }} initialDate={initialDate} />
              {/* Garantía compacta en móvil */}
              <div className="flex items-center justify-center gap-4 flex-wrap py-4 mt-1">
                {[
                  { Icon: FileText,   text: 'Contrato incluido' },
                  { Icon: CreditCard, text: 'Pago en cuotas' },
                  { Icon: Lock,       text: 'Reembolso garantizado' },
                ].map(({ Icon, text }) => (
                  <div key={text} className="flex items-center gap-1.5">
                    <Icon size={12} style={{ color: 'var(--brand)', flexShrink: 0 }} />
                    <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>{text}</span>
                  </div>
                ))}
              </div>
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
                <Users size={13} /> {space.capacity_max
                  ? (space.capacity_min && space.capacity_min !== space.capacity_max
                    ? `${space.capacity_min}–${space.capacity_max}`
                    : `Hasta ${space.capacity_max}`)
                  : 'A consultar'} personas
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
          <div className="flex items-center gap-2 shrink-0">
            <FavoriteButton spaceId={space.id} size="md" />

            {/* Botón compartir — visible en mobile y desktop */}
            <div className="relative">
              <button
                onClick={() => {
                  const url = window.location.href
                  // En móvil con Web Share API → share sheet nativo (WhatsApp, Instagram, SMS...)
                  if (navigator.share) {
                    navigator.share({ title: space.name, text: `¡Mira este espacio en espot.do! ${space.name}`, url })
                  } else {
                    setShowShareMenu(s => !s)
                  }
                }}
                className="btn-outline flex items-center gap-2 text-sm font-medium px-3 md:px-4 py-2 rounded-xl">
                <Share2 size={14} />
                <span className="hidden sm:inline">Compartir</span>
              </button>

              {/* Dropdown para desktop (cuando no hay Web Share API) */}
              {showShareMenu && (
                <>
                  <div className="fixed inset-0 z-[9998]" onClick={() => setShowShareMenu(false)} />
                  <div className="absolute right-0 mt-2 z-[9999] rounded-2xl overflow-hidden shadow-xl"
                    style={{ background: '#fff', border: '1px solid var(--border-subtle)', width: 220 }}>

                    {/* WhatsApp */}
                    <a
                      href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`¡Mira este espacio en espot.do! ${space.name} — ${window.location.href}`)}`}
                      target="_blank" rel="noopener noreferrer"
                      onClick={() => setShowShareMenu(false)}
                      className="flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors hover:bg-gray-50"
                      style={{ color: '#111827' }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="#25D366">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                        <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.554 4.117 1.523 5.845L.044 23.956a.5.5 0 0 0 .622.622l6.111-1.479A11.946 11.946 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.836 9.836 0 0 1-5.023-1.377l-.36-.213-3.628.877.893-3.628-.235-.374A9.818 9.818 0 0 1 2.182 12C2.182 6.57 6.57 2.182 12 2.182S21.818 6.57 21.818 12 17.43 21.818 12 21.818z"/>
                      </svg>
                      WhatsApp
                    </a>

                    {/* Copiar enlace */}
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(window.location.href)
                        setCopied(true)
                        setTimeout(() => { setCopied(false); setShowShareMenu(false) }, 2000)
                      }}
                      className="flex items-center gap-3 px-4 py-3 text-sm font-medium w-full text-left transition-colors hover:bg-gray-50"
                      style={{ color: copied ? '#16A34A' : '#111827', borderTop: '1px solid #F3F4F6' }}>
                      {copied ? (
                        <CheckCircle size={17} style={{ color: '#16A34A' }} />
                      ) : (
                        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#6B7280' }}>
                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                        </svg>
                      )}
                      {copied ? '¡Enlace copiado!' : 'Copiar enlace'}
                    </button>
                  </div>
                </>
              )}
            </div>
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
                <Image
                  src={images[0].url}
                  alt={space.name}
                  fill
                  priority
                  sizes="(max-width: 768px) 100vw, 60vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Building2 size={80} style={{ color: 'var(--text-muted)', opacity: 0.12 }} />
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
                <div key={slot} className="flex items-center justify-center"
                  style={{ background: 'var(--bg-elevated)' }}>
                  <Images size={20} style={{ color: 'var(--text-muted)', opacity: 0.25 }} />
                </div>
              )

              return (
                <button key={slot}
                  onClick={() => { setPhotoIdx(slot); setShowLightbox(true) }}
                  className="relative overflow-hidden group cursor-zoom-in"
                  style={{ background: 'var(--bg-elevated)' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.url} alt=""
                    loading="lazy"
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

          {/* ────────────────────── MÓVIL: Carousel con swipe ── */}
          <div className="md:hidden relative rounded-2xl overflow-hidden"
            style={{ aspectRatio: '4/3', background: 'var(--bg-elevated)' }}
            onTouchStart={e => { mobileTouchX.current = e.touches[0].clientX }}
            onTouchEnd={e => {
              if (mobileTouchX.current === null || images.length <= 1) return
              const dx = e.changedTouches[0].clientX - mobileTouchX.current
              if (Math.abs(dx) > 40) {
                setPhotoIdx(i => dx < 0
                  ? (i + 1) % images.length
                  : (i - 1 + images.length) % images.length
                )
              }
              mobileTouchX.current = null
            }}>
            {images.length > 0 ? (
              <Image src={images[photoIdx]?.url} alt={space.name}
                fill priority
                sizes="100vw"
                className="object-cover cursor-zoom-in"
                onClick={() => setShowLightbox(true)} />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Building2 size={60} style={{ color: 'var(--text-muted)', opacity: 0.12 }} />
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
                  {images.slice(0, 8).map((img: any, i: number) => (
                    <button key={img?.url ?? i} onClick={() => setPhotoIdx(i)}
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
                    <img src={img.url} alt="" loading="lazy" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            {/* Cerrar */}
            <button onClick={() => setShowLightbox(false)}
              className="absolute top-3 right-3 w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-110"
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
                  className="absolute -top-4 -right-4 z-10 w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-110"
                  style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.2)' }}>
                  <X size={17} />
                </button>
                {/* Player */}
                <div className="rounded-2xl overflow-hidden" style={{ background: '#000', boxShadow: '0 24px 64px rgba(0,0,0,0.6)' }}>
                  <video
                    src={space.video_url}
                    controls
                    playsInline
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
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6 lg:gap-8 items-start">

          {/* ── IZQUIERDA: Contenido (order-2 en móvil, order-1 en desktop) ── */}
          <div className="order-2 lg:order-1">

            {/* Host */}
            {host && (
              <div className="flex items-center gap-4 pb-6 mb-6" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <HostAvatar
                  avatarUrl={(host as any).avatar_url ?? null}
                  fullName={(host as any).full_name ?? null}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm md:text-base" style={{ color: 'var(--text-primary)' }}>
                      {(host as any).full_name}
                    </span>
                    {(host as any).id_verified && (
                      <span className="flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full shrink-0"
                        style={{ background: 'rgba(34,197,94,0.1)', color: '#16A34A', border: '1px solid rgba(34,197,94,0.2)' }}>
                        <CheckCircle size={10} /> Verificado
                      </span>
                    )}
                  </div>
                  <div className="text-xs md:text-sm" style={{ color: 'var(--text-secondary)' }}>Propietario del espacio</div>
                </div>
                {/* Botón Preguntar junto al perfil del propietario */}
                <button
                  onClick={() => setShowChat(true)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold shrink-0 transition-all hover:opacity-90"
                  style={{ background: 'var(--brand-dim)', color: 'var(--brand)', border: '1.5px solid var(--brand-border)' }}>
                  <MessageCircle size={14} />
                  <span className="hidden sm:inline">Preguntar</span>
                </button>
              </div>
            )}

            {/* ── Menú / carta descargable — visible fuera de los tabs ── */}
            {space.menu_url && (
              <div className="mb-6">
                <a
                  href={space.menu_url}
                  download={space.menu_file_name || 'menu'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all w-full group"
                  style={{ background: '#fff', border: '1.5px solid var(--brand-border)' }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: 'var(--brand-dim)' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--brand)' }}>
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                      <polyline points="14 2 14 8 20 8"/>
                      <line x1="12" y1="12" x2="12" y2="18"/>
                      <polyline points="9 15 12 18 15 15"/>
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {space.menu_file_name || 'Menú del espacio'}
                    </div>
                    <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      Toca para descargar
                    </div>
                  </div>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                    style={{ color: 'var(--brand)', flexShrink: 0 }}>
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                </a>
              </div>
            )}

            {/* Tabs */}
            <div className="mb-6 md:mb-8">
              <div className="flex gap-1 p-1 rounded-2xl overflow-x-auto scrollbar-hide w-full md:w-fit" style={{ background: 'var(--bg-elevated)' }}>
                {([
                  { id: 'info',    label: 'Descripción' },
                  { id: 'addons',  label: `Adicionales${addons.length ? ` (${addons.length})` : ''}` },
                  { id: 'rules',   label: 'Reglas' },
                  { id: 'reviews', label: reviewsData?.total ? `Reseñas (${reviewsData.total})` : 'Reseñas' },
                ] as const).map(tab => (
                  <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                    className="flex-1 md:flex-none px-3 md:px-5 py-3 rounded-xl text-sm font-medium transition-all duration-200 whitespace-nowrap"
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
                      { label: 'Tipo de espacio', value: space.category?.charAt(0).toUpperCase() + space.category?.slice(1), icon: Building2 },
                      { label: 'Capacidad', value: space.capacity_max
                        ? (space.capacity_min && space.capacity_min !== space.capacity_max
                          ? `${space.capacity_min}–${space.capacity_max} personas`
                          : `Hasta ${space.capacity_max} personas`)
                        : 'A consultar', icon: Users },
                      { label: 'Ubicación', value: `${space.sector ? space.sector + ', ' : ''}${space.city}`, icon: MapPin },
                      { label: 'Modalidad', value: pricingTypeLabel[pricing?.pricing_type] ?? '—', icon: CreditCard },
                      ...(pricing?.pricing_type === 'hourly' && pricing.min_hours ? [{ label: 'Mínimo de horas', value: `${pricing.min_hours} hora${pricing.min_hours > 1 ? 's' : ''}`, icon: Clock }] : []),
                      ...(pricing?.pricing_type === 'hourly' && pricing.max_hours ? [{ label: 'Máximo de horas', value: `${pricing.max_hours} horas`, icon: Clock }] : []),
                      ...(pricing?.pricing_type === 'minimum_consumption' && pricing.session_hours ? [{ label: 'Duración de sesión', value: `${pricing.session_hours} horas`, icon: Clock }] : []),
                    ].map(({ label, value, icon }) => (
                      <div key={label} className="flex items-center gap-3 p-4 rounded-xl"
                        style={{ background: '#fff', border: '1px solid var(--border-subtle)' }}>
                        {(() => { const I = icon as any; return <I size={18} style={{ color: 'var(--brand)' }} /> })()}
                        <div>
                          <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</div>
                          <div className="font-semibold text-sm mt-0.5" style={{ color: 'var(--text-primary)' }}>{value}</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Nota explicativa solo para consumo mínimo */}
                  {pricing?.pricing_type === 'minimum_consumption' && (
                    <div className="mt-3 flex items-start gap-2.5 px-4 py-3 rounded-xl"
                      style={{ background: 'rgba(217,119,6,0.06)', border: '1px solid rgba(217,119,6,0.15)' }}>
                      <Lock size={13} style={{ color: '#D97706', flexShrink: 0, marginTop: 1 }} />
                      <p className="text-xs leading-relaxed" style={{ color: '#92400E' }}>
                        <strong>¿Qué son los consumibles?</strong> Pagas <strong>{pricing.minimum_consumption ? formatCurrency(pricing.minimum_consumption) : 'este monto'}</strong> a
                        través de Espot y ese dinero es tu crédito de comida y bebidas en el lugar durante el evento.
                        Si consumes más, pagas la diferencia directamente en el local.
                      </p>
                    </div>
                  )}
                </div>

                {/* Facilidades */}
                <div>
                  <h3 className="text-base md:text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
                    Facilidades
                  </h3>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                    {facilities.map(({ icon, label }) => (
                      <div key={label} className="flex flex-col items-center gap-2 p-3 md:p-4 rounded-xl text-center"
                        style={{ background: '#fff', border: '1px solid var(--border-subtle)' }}>
                        {(() => { const I = icon as any; return <I size={20} style={{ color: 'var(--text-secondary)' }} /> })()}
                        <span className="text-xs font-medium leading-tight" style={{ color: 'var(--text-secondary)' }}>{label}</span>
                      </div>
                    ))}
                  </div>
                </div>


                {/* ── Horarios disponibles ── */}
                {timeBlocks.length > 0 && (() => {
                  // Mapear cada día → todos sus bloques activos (puede haber mañana y tarde)
                  const map: Record<number, any[]> = {}
                  timeBlocks.forEach((b: any) => {
                    (b.days_of_week ?? []).forEach((d: number) => {
                      if (!map[d]) map[d] = []
                      map[d].push(b)
                    })
                  })
                  const DAY_NAMES = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb']
                  const ORDER     = [1,2,3,4,5,6,0]   // Lun → Dom
                  const todayIdx  = new Date().getDay()

                  return (
                    <div>
                      <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        Horarios disponibles
                      </h3>
                      <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border-subtle)' }}>
                        {ORDER.map((d, i) => {
                          const blocks  = map[d] ?? []
                          const isToday = d === todayIdx
                          return (
                            <div key={d}
                              className="flex items-start justify-between px-4 py-2.5"
                              style={{
                                borderBottom: i < 6 ? '1px solid var(--border-subtle)' : undefined,
                                background: isToday ? 'rgba(53,196,147,0.05)' : '#fff',
                              }}>

                              {/* Día */}
                              <div className="flex items-center gap-2 shrink-0 pt-0.5">
                                <span className="text-sm w-8"
                                  style={{ fontWeight: isToday ? 700 : 500, color: blocks.length ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                                  {DAY_NAMES[d]}
                                </span>
                                {isToday && (
                                  <span className="text-xs font-semibold px-1.5 py-0.5 rounded-full"
                                    style={{ background: 'var(--brand-dim)', color: 'var(--brand)' }}>
                                    Hoy
                                  </span>
                                )}
                              </div>

                              {/* Horarios — puede haber varios bloques */}
                              {blocks.length > 0 ? (
                                <div className="flex flex-col items-end gap-0.5">
                                  {blocks.map((b: any, bi: number) => (
                                    <span key={bi} className="text-sm font-semibold tabular-nums"
                                      style={{ color: isToday ? 'var(--brand)' : 'var(--text-primary)' }}>
                                      {formatTime(b.start_time)} – {formatTime(b.end_time)}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
                                  No disponible
                                </span>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })()}

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

                {/* ── Mapa de ubicación ── */}
                <SpaceLocationMap space={space} />

                {/* ── Habla con el propietario ── */}
                {host && (
                  <div className="rounded-2xl overflow-hidden"
                    style={{ border: '1px solid var(--border-subtle)', boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>

                    {/* Header */}
                    <div className="flex items-center gap-3.5 px-5 py-4"
                      style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border-subtle)' }}>
                      {/* Avatar con foto real */}
                      <div className="relative shrink-0">
                        <HostAvatar
                          avatarUrl={(host as any).avatar_url ?? null}
                          fullName={(host as any).full_name ?? null}
                          size={48}
                        />
                        {/* Indicador online eliminado — hardcoded verde engañaría al usuario */}
                      </div>

                      <div className="flex-1 min-w-0">
                        {/* Nombre + badge verificado */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm leading-tight" style={{ color: 'var(--text-primary)' }}>
                            {host.full_name}
                          </span>
                          {host.id_verified && (
                            <span className="flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full shrink-0"
                              style={{ background: 'rgba(34,197,94,0.12)', color: '#16A34A', border: '1px solid rgba(34,197,94,0.25)' }}>
                              <CheckCircle size={10} /> Verificado
                            </span>
                          )}
                        </div>
                        <div className="text-xs mt-0.5 font-medium" style={{ color: 'var(--brand)' }}>
                          Propietario{(host as any).created_at
                            ? ` · Desde ${new Date((host as any).created_at).getFullYear()}`
                            : ''}
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
                        ¿Tienes preguntas sobre este espacio?
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
                          '¿Hay estacionamiento?',
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
                        Sin compromiso · El propietario confirma disponibilidad
                      </p>

                      {/* Banner de seguridad */}
                      <div className="flex items-start gap-3 mt-4 px-4 py-3.5 rounded-2xl"
                        style={{ background: '#F8FAFC', border: '1px solid #E5E7EB' }}>
                        <Shield size={15} style={{ color: '#35C493', flexShrink: 0, marginTop: 1 }} />
                        <div>
                          <p className="text-xs font-bold mb-0.5" style={{ color: '#0F1623' }}>
                            Comunícate siempre a través de Espot
                          </p>
                          <p className="text-xs leading-relaxed" style={{ color: '#6B7280' }}>
                            Para proteger tu reserva, nunca pagues ni acuerdes condiciones por fuera de la plataforma.
                          </p>
                        </div>
                      </div>
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
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                            style={{ background: 'var(--bg-elevated)' }}>
                            {(() => { const I = addonIcon(addon.name); return <I size={18} style={{ color: 'var(--text-secondary)' }} /> })()}
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
            {/* ── TAB: Reseñas ── */}
            {activeTab === 'reviews' && (
              <div>
                {!reviewsData || reviewsData.total === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{ background: 'var(--bg-elevated)' }}>
                      <Star size={24} style={{ color: 'var(--text-muted)' }} />
                    </div>
                    <p className="font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Aún no hay reseñas</p>
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                      Sé el primero en dejar una reseña después de tu evento.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Resumen compacto */}
                    <div className="flex items-center gap-3 p-4 rounded-2xl"
                      style={{ background: '#fff', border: '1px solid var(--border-subtle)' }}>
                      <div className="text-3xl md:text-4xl font-bold" style={{ color: 'var(--text-primary)', lineHeight: 1 }}>
                        {reviewsData.average}
                      </div>
                      <div>
                        <div className="flex gap-0.5 mb-0.5">
                          {[1,2,3,4,5].map(s => (
                            <svg key={s} width="16" height="16" viewBox="0 0 16 16">
                              <path d="M8 1l1.8 3.6L14 5.3l-3 2.9.7 4.1L8 10.4l-3.7 1.9.7-4.1-3-2.9 4.2-.7z"
                                fill={s <= Math.floor(reviewsData.average + 0.5) ? '#F59E0B' : '#E5E7EB'}/>
                            </svg>
                          ))}
                        </div>
                        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                          {reviewsData.total} {reviewsData.total === 1 ? 'reseña' : 'reseñas'}
                        </p>
                      </div>
                    </div>

                    {/* Lista de reseñas */}
                    {/* Aviso si hay más de 30 reseñas */}
                    {reviewsData.total > 30 && (
                      <div className="text-xs text-center py-2 mb-2" style={{ color: 'var(--text-muted)' }}>
                        Mostrando las 30 reseñas más recientes de {reviewsData.total}
                      </div>
                    )}

                    {reviewsData.reviews.map(r => {
                      const name    = r.guest.full_name ?? 'Usuario'
                      const initial = name.charAt(0).toUpperCase()
                      const colors  = ['#35C493','#6366F1','#F59E0B','#EF4444','#0EA5E9']
                      const color   = colors[name.charCodeAt(0) % colors.length]
                      const date    = new Date(r.created_at).toLocaleDateString('es-DO', { month: 'short', year: 'numeric' })
                      return (
                        <div key={r.id} className="p-4 rounded-2xl"
                          style={{ background: '#fff', border: '1px solid var(--border-subtle)' }}>
                          <div className="flex items-start gap-3">
                            <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                              style={{ background: color }}>
                              {initial}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2 mb-1">
                                <span className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{name}</span>
                                <span className="text-xs flex-shrink-0" style={{ color: 'var(--text-muted)' }}>{date}</span>
                              </div>
                              <div className="flex gap-0.5 mb-2">
                                {[1,2,3,4,5].map(s => (
                                  <svg key={s} width="12" height="12" viewBox="0 0 16 16">
                                    <path d="M8 1l1.8 3.6L14 5.3l-3 2.9.7 4.1L8 10.4l-3.7 1.9.7-4.1-3-2.9 4.2-.7z"
                                      fill={s <= r.rating ? '#F59E0B' : '#E5E7EB'}/>
                                  </svg>
                                ))}
                                <span className="text-xs ml-1" style={{ color: 'var(--text-muted)', fontSize: 10 }}>✓ Reserva verificada</span>
                              </div>
                              {r.comment && (
                                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{r.comment}</p>
                              )}
                              {/* Respuesta del propietario */}
                              {r.host_response && (
                                <div className="mt-3 rounded-xl px-4 py-3"
                                  style={{ background: 'var(--brand-dim)', border: '1px solid var(--brand-border)' }}>
                                  <div className="flex items-center gap-1.5 mb-1">
                                    <CheckCircle size={11} style={{ color: 'var(--brand)' }} />
                                    <span className="text-xs font-semibold" style={{ color: 'var(--brand)' }}>
                                      Respuesta del propietario
                                    </span>
                                  </div>
                                  <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                                    {r.host_response}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'rules' && (
              <div className="space-y-6 md:space-y-8">
                {!conditions && (
                  <p className="text-sm py-8 text-center" style={{ color: 'var(--text-muted)' }}>
                    Este espacio no tiene reglas especiales configuradas.
                  </p>
                )}
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

          {/* ── DERECHA: resumen rápido + BOOKING WIDGET ── */}
          <div className="order-1 lg:order-2 lg:sticky lg:top-20 hidden lg:block space-y-3 lg:max-h-[calc(100dvh-5rem)] lg:overflow-y-auto" style={{ overflow: 'visible' }}>

            {/* Resumen de precio antes del widget */}
            {(() => {
              const p = pricing
              if (!p) return null
              const items = []
              if (p.pricing_type === 'hourly') {
                if (p.hourly_price) items.push({ label: 'Precio', value: `${formatCurrency(p.hourly_price)} / hora` })
                if (p.min_hours) items.push({ label: 'Mínimo', value: `${p.min_hours} hora${p.min_hours > 1 ? 's' : ''}` })
              }
              if (p.pricing_type === 'minimum_consumption') {
                if (p.minimum_consumption) items.push({ label: 'Consumibles', value: formatCurrency(p.minimum_consumption) })
                if (p.session_hours) items.push({ label: 'Sesión', value: `${p.session_hours}h incluidas` })
              }
              if (p.pricing_type === 'fixed_package') {
                if (p.fixed_price) items.push({ label: 'Paquete', value: formatCurrency(p.fixed_price) })
                if (p.package_hours) items.push({ label: 'Incluye', value: `${p.package_hours}h` })
                if (p.extra_hour_price > 0) items.push({ label: 'Hora adicional', value: formatCurrency(p.extra_hour_price) })
              }
              if (!items.length) return null
              return (
                <div className="rounded-2xl px-4 py-3 flex items-center justify-between gap-4 flex-wrap"
                  style={{ background: 'var(--brand-dim)', border: '1.5px solid var(--brand-border)' }}>
                  {items.map((item, i) => (
                    <div key={i} className="text-center flex-1 min-w-0">
                      <p className="text-xs font-medium mb-0.5" style={{ color: 'var(--brand)' }}>{item.label}</p>
                      <p className="text-sm font-bold" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>{item.value}</p>
                    </div>
                  ))}
                  {space.instant_booking && (
                    <span className="flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full shrink-0"
                      style={{ background: 'rgba(37,99,235,0.12)', color: '#1D4ED8', border: '1px solid rgba(37,99,235,0.2)' }}>
                      ⚡ Confirmación instantánea
                    </span>
                  )}
                </div>
              )
            })()}

            <BookingWidget space={space} onChat={() => setShowChat(true)} initialDate={initialDate} />

            {/* ── Garantía Espot ── */}
            <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)' }}>
              <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <Shield size={14} style={{ color: 'var(--brand)', flexShrink: 0 }} />
                <span className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>
                  Garantía Espot
                </span>
              </div>
              <div className="px-4 py-3 space-y-2.5">
                {[
                  { icon: FileText,    label: 'Contrato oficial incluido',           sub: 'Firmado entre tú y el propietario' },
                  { icon: CreditCard,  label: 'Paga en cuotas',                      sub: 'Sin coordinar transferencias manualmente' },
                  { icon: Lock,        label: 'Reembolso si cancela el propietario', sub: 'Tu dinero está protegido' },
                  { icon: CheckCircle, label: 'Espacios verificados',                sub: 'Revisados por el equipo de Espot' },
                ].map(({ icon: Icon, label, sub }) => (
                  <div key={label} className="flex items-start gap-2.5">
                    <Icon size={13} style={{ color: 'var(--brand)', flexShrink: 0, marginTop: 2 }} />
                    <div>
                      <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{label}</p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{sub}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
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
                              loading="lazy"
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
        <div className="h-28 lg:hidden" />
      </div>

      {/* ── MÓVIL: Sticky CTA de reserva ── */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-[45] px-4 py-3 pb-safe"
        style={{
          background: 'rgba(255,255,255,0.97)',
          backdropFilter: 'blur(20px)',
          borderTop: '1px solid var(--border-subtle)',
          boxShadow: '0 -4px 24px rgba(0,0,0,0.10)',
        }}>
        <div className="flex items-center gap-4">
          <div className="flex-1 min-w-0 overflow-hidden">
            {priceDisplay && (
              <div className="font-bold text-base leading-tight truncate" style={{ color: 'var(--text-primary)' }}>
                {priceDisplay}
              </div>
            )}
            <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              {space.capacity_max
                ? (space.capacity_min && space.capacity_min !== space.capacity_max
                  ? `${space.capacity_min}–${space.capacity_max}`
                  : `Hasta ${space.capacity_max}`)
                : 'A consultar'} personas
              {pricing?.pricing_type !== 'custom_quote' && (
                <span className="ml-1.5 px-1.5 py-0.5 rounded-md text-[10px] font-semibold"
                  style={{ background: 'var(--brand-dim)', color: 'var(--brand)' }}>
                  Pago en cuotas
                </span>
              )}
            </div>
          </div>
          <button
            onClick={() => setShowMobileWidget(true)}
            className="btn-brand flex items-center gap-2 px-6 py-4 rounded-2xl text-sm font-bold shrink-0"
            style={{ boxShadow: '0 4px 16px rgba(53,196,147,0.35)' }}>
            {pricing?.pricing_type === 'custom_quote' ? 'Solicitar precio' : 'Reservar'}
            <ChevronDown size={16} style={{ transform: 'rotate(-90deg)' }} />
          </button>
        </div>
      </div>
    </div>
  )
}
