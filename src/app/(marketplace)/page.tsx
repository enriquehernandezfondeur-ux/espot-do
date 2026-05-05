import { type Metadata } from 'next'
import Link from 'next/link'
import {
  ArrowRight, Shield, Users, Search,
  Clock, CreditCard, CheckCircle, MapPin,
  Building2, UtensilsCrossed, Sunset, Wine,
  Trees, Camera, Briefcase, Home,
} from 'lucide-react'
import { getPublishedSpaces } from '@/lib/actions/marketplace'
import { formatCurrency } from '@/lib/utils'
import HomepageSearch from '@/components/marketplace/HomepageSearch'

export const metadata: Metadata = {
  title: 'Reserva el espacio perfecto para tu evento en República Dominicana',
  description: 'Encuentra y reserva salones, rooftops, restaurantes, villas y más para cumpleaños, bodas, eventos corporativos y celebraciones en RD. Confirmación en 24h, paga solo el 10% para asegurar tu fecha.',
  openGraph: {
    title: 'espot.do — Espacios para eventos en República Dominicana',
    description: 'Salones, rooftops, restaurantes y más. Confirma en 24h, paga solo el 10% para asegurar tu fecha.',
    type: 'website',
  },
}

const categories = [
  { value: 'salon',       label: 'Salones',      icon: Building2,    img: 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=600&q=85&fit=crop' },
  { value: 'restaurante', label: 'Restaurantes', icon: UtensilsCrossed, img: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&q=85&fit=crop' },
  { value: 'rooftop',    label: 'Rooftops',     icon: Sunset,       img: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&q=85&fit=crop' },
  { value: 'bar',        label: 'Bares',        icon: Wine,         img: 'https://images.unsplash.com/photo-1470337458703-46ad1756a187?w=600&q=85&fit=crop' },
  { value: 'terraza',    label: 'Terrazas',     icon: Trees,        img: 'https://images.unsplash.com/photo-1533090161767-e6ffed986c88?w=600&q=85&fit=crop' },
  { value: 'estudio',    label: 'Estudios',     icon: Camera,       img: 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=600&q=85&fit=crop' },
  { value: 'coworking',  label: 'Coworking',    icon: Briefcase,    img: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=600&q=85&fit=crop' },
  { value: 'villa',      label: 'Villas',       icon: Home,         img: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=600&q=85&fit=crop' },
]

const eventTypes = [
  { label: 'Cumpleaños',   slug: 'cumpleanos',    img: 'https://images.unsplash.com/photo-1464349095431-e9a21285b5f3?w=700&q=85&fit=crop' },
  { label: 'Bodas',        slug: 'bodas',         img: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=700&q=85&fit=crop' },
  { label: 'Corporativo',  slug: 'corporativo',   img: 'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=700&q=85&fit=crop' },
  { label: 'Graduación',   slug: 'graduacion',    img: 'https://images.unsplash.com/photo-1627556704302-624286467c65?w=700&q=85&fit=crop' },
  { label: 'Quinceañeras', slug: 'quinceaneras',  img: 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=700&q=85&fit=crop' },
  { label: 'Baby Shower',  slug: 'baby-shower',   img: 'https://images.unsplash.com/photo-1529634806980-85c3dd6d34ac?w=700&q=85&fit=crop' },
]

// Fotos del mosaico en el hero
const HERO_FALLBACK = [
  'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=500&q=85&fit=crop',
  'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=500&q=85&fit=crop',
  'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=500&q=85&fit=crop',
  'https://images.unsplash.com/photo-1533090161767-e6ffed986c88?w=500&q=85&fit=crop',
]

function getCover(space: any) {
  return space.space_images?.find((i: any) => i.is_cover)?.url ?? space.space_images?.[0]?.url ?? null
}
function getPriceLabel(space: any) {
  const p = space.space_pricing?.find((x: any) => x.is_active) ?? space.space_pricing?.[0]
  if (!p) return null
  if (p.pricing_type === 'hourly')             return { price: formatCurrency(p.hourly_price), unit: '/ hora' }
  if (p.pricing_type === 'minimum_consumption') return { price: formatCurrency(p.minimum_consumption), unit: 'consumo mín.' }
  if (p.pricing_type === 'fixed_package')       return { price: formatCurrency(p.fixed_price), unit: 'paquete' }
  return { price: 'Cotizar', unit: '' }
}

export default async function HomePage() {
  const spaces = await getPublishedSpaces()

  // Mosaico del hero: fotos reales de espacios o fallback
  const heroCovers = spaces.slice(0, 4).map(getCover).filter(Boolean)
  const mosaicImgs = heroCovers.length >= 4
    ? heroCovers.slice(0, 4)
    : HERO_FALLBACK

  return (
    <div style={{ background: 'var(--bg-base)' }}>

      {/* ─────────────────────────────────────────────
          HERO
          ───────────────────────────────────────── */}
      <section className="relative overflow-hidden"
        style={{ background: 'linear-gradient(155deg, #0A1A14 0%, #0D2318 55%, #0A0E0D 100%)', minHeight: 580 }}>

        {/* Orbes de ambiente */}
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(53,196,147,0.08) 0%, transparent 70%)', transform: 'translate(-50%,-50%)' }} />

        <div className="max-w-7xl mx-auto px-6 py-20 lg:py-24">
          <div className="grid lg:grid-cols-[1fr_420px] gap-16 items-center">

            {/* Contenido izquierdo */}
            <div>
              <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-8 text-xs font-semibold tracking-wide"
                style={{ background: 'rgba(53,196,147,0.1)', border: '1px solid rgba(53,196,147,0.2)', color: '#6EE7C7' }}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#35C493' }} />
                Espacios para eventos en República Dominicana
              </div>

              <h1 className="font-bold text-white mb-5"
                style={{ fontSize: 'clamp(2.4rem, 5vw, 3.6rem)', lineHeight: 1.08, letterSpacing: '-0.04em' }}>
                El espacio perfecto
                <br />
                <span style={{
                  background: 'linear-gradient(95deg, #35C493 0%, #5CE8BC 100%)',
                  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                }}>
                  para tu evento
                </span>
              </h1>

              <p className="mb-10 max-w-md" style={{ color: 'rgba(255,255,255,0.55)', fontSize: '1.05rem', lineHeight: 1.75 }}>
                Reserva salones, rooftops, restaurantes y más — por hora o paquete, confirmación en 24&nbsp;horas.
              </p>

              <HomepageSearch />

              {/* Métricas inline */}
              <div className="flex items-center gap-6 mt-8">
                {[
                  { value: spaces.length + '+', label: 'espacios' },
                  { value: '24h',  label: 'respuesta' },
                  { value: '10%',  label: 'para reservar' },
                ].map((s, i) => (
                  <div key={s.label} className="flex items-center gap-2.5">
                    {i > 0 && <div className="w-px h-7" style={{ background: 'rgba(255,255,255,0.1)' }} />}
                    <div>
                      <div className="font-bold text-white" style={{ fontSize: '1.25rem', letterSpacing: '-0.03em' }}>{s.value}</div>
                      <div className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>{s.label}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Mosaico derecho — oculto en móvil */}
            <div className="hidden lg:grid grid-cols-2 gap-3">
              {mosaicImgs.map((src, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={i}
                  src={src}
                  alt=""
                  className="w-full object-cover"
                  style={{
                    height: i === 0 || i === 3 ? 220 : 170,
                    borderRadius: 16,
                    boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                    marginTop: i === 1 || i === 3 ? 28 : 0,
                  }}
                />
              ))}
            </div>

          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────
          TIPOS DE EVENTO
          ───────────────────────────────────────── */}
      <section style={{ background: '#fff' }} className="py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-end justify-between mb-10">
            <div>
              <p className="text-xs font-semibold tracking-widest uppercase mb-2" style={{ color: '#35C493' }}>
                Por tipo de evento
              </p>
              <h2 className="font-bold" style={{ color: 'var(--text-primary)', fontSize: '1.75rem', letterSpacing: '-0.03em' }}>
                ¿Qué estás celebrando?
              </h2>
            </div>
            <Link href="/buscar" className="hidden md:flex items-center gap-1.5 text-sm font-semibold"
              style={{ color: 'var(--text-secondary)' }}>
              Ver todos <ArrowRight size={14} />
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {eventTypes.map(et => (
              <Link key={et.slug} href={`/buscar?activity=${et.slug}`}
                className="group relative block overflow-hidden"
                style={{ borderRadius: 18, aspectRatio: '16/10', boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={et.img} alt={et.label}
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]" />
                <div className="absolute inset-0"
                  style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.15) 50%, transparent 100%)' }} />
                <div className="absolute bottom-0 left-0 right-0 p-5 flex items-end justify-between">
                  <span className="text-white font-bold text-lg" style={{ letterSpacing: '-0.02em' }}>
                    {et.label}
                  </span>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-2 group-hover:translate-x-0"
                    style={{ background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(8px)' }}>
                    <ArrowRight size={14} className="text-white" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────
          ESPACIOS DESTACADOS
          ───────────────────────────────────────── */}
      <section style={{ background: 'var(--bg-surface)' }} className="py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-end justify-between mb-10">
            <div>
              <p className="text-xs font-semibold tracking-widest uppercase mb-2" style={{ color: '#35C493' }}>
                Espacios disponibles
              </p>
              <h2 className="font-bold" style={{ color: 'var(--text-primary)', fontSize: '1.75rem', letterSpacing: '-0.03em' }}>
                {spaces.length > 0
                  ? `${spaces.length} espacio${spaces.length !== 1 ? 's' : ''} en República Dominicana`
                  : 'Próximamente más espacios'}
              </h2>
            </div>
            <Link href="/buscar" className="hidden md:flex items-center gap-1.5 text-sm font-semibold"
              style={{ color: 'var(--text-secondary)' }}>
              Ver todos <ArrowRight size={14} />
            </Link>
          </div>

          {spaces.length === 0 ? (
            <div className="py-20 text-center rounded-2xl" style={{ background: '#fff', border: '1px solid var(--border-subtle)' }}>
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
                style={{ background: 'var(--brand-dim)' }}>
                <Building2 size={24} style={{ color: 'var(--brand)' }} />
              </div>
              <h3 className="font-bold text-lg mb-2" style={{ color: 'var(--text-primary)' }}>Próximamente más espacios</h3>
              <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>Sé el primero en publicar tu espacio</p>
              <Link href="/auth" className="btn-brand inline-flex items-center gap-2 text-sm font-semibold px-6 py-3 rounded-xl">
                Publicar espacio gratis
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {spaces.slice(0, 6).map((space: any) => {
                const priceInfo = getPriceLabel(space)
                const cover     = getCover(space)
                const catDef    = categories.find(c => c.value === space.category)
                const Icon      = catDef?.icon ?? Building2
                return (
                  <Link key={space.id} href={`/espacios/${space.slug}`} className="group block">
                    <div className="card-hover rounded-2xl overflow-hidden h-full flex flex-col"
                      style={{
                        background: '#fff',
                        border: '1px solid var(--border-subtle)',
                      }}>

                      {/* Imagen */}
                      <div className="relative overflow-hidden" style={{ height: 240, flexShrink: 0 }}>
                        {cover ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={cover} alt={space.name}
                            className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center"
                            style={{ background: 'linear-gradient(135deg,#667eea,#764ba2)' }}>
                            <Icon size={40} className="text-white opacity-70" />
                          </div>
                        )}
                        {/* Precio */}
                        {priceInfo && (
                          <div className="absolute bottom-3 left-3 text-xs font-bold px-3 py-1.5 rounded-full"
                            style={{ background: 'rgba(0,0,0,0.72)', color: '#fff', backdropFilter: 'blur(8px)' }}>
                            {priceInfo.price}
                            {priceInfo.unit && <span className="opacity-75 ml-1">{priceInfo.unit}</span>}
                          </div>
                        )}
                        {/* Capacidad */}
                        <div className="absolute bottom-3 right-3 flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-full"
                          style={{ background: 'rgba(0,0,0,0.6)', color: '#fff', backdropFilter: 'blur(8px)' }}>
                          <Users size={10} /> {space.capacity_max}
                        </div>
                        {/* Verificado */}
                        {space.is_verified && (
                          <div className="absolute top-3 left-3 flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full"
                            style={{ background: 'rgba(53,196,147,0.9)', color: '#fff', backdropFilter: 'blur(8px)' }}>
                            <Shield size={9} /> Verificado
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="p-4 flex flex-col flex-1">
                        <h3 className="font-semibold text-sm leading-snug mb-1.5"
                          style={{ color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
                          {space.name}
                        </h3>
                        <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                          <MapPin size={10} />
                          {space.sector ? `${space.sector}, ` : ''}{space.city}
                        </div>
                        <div className="mt-auto pt-3 flex items-center justify-between"
                          style={{ borderTop: '1px solid var(--border-subtle)', marginTop: 12 }}>
                          <span className="text-xs font-medium capitalize px-2.5 py-1 rounded-lg"
                            style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}>
                            {catDef?.label ?? space.category}
                          </span>
                          <ArrowRight size={14} className="transition-transform duration-200 group-hover:translate-x-1"
                            style={{ color: 'var(--brand)' }} />
                        </div>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}

          <div className="text-center mt-10 md:hidden">
            <Link href="/buscar" className="inline-flex items-center gap-2 text-sm font-semibold px-6 py-3 rounded-xl"
              style={{ border: '1.5px solid var(--border-medium)', color: 'var(--text-primary)' }}>
              Ver todos los espacios <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────
          CATEGORÍAS
          ───────────────────────────────────────── */}
      <section style={{ background: '#fff' }} className="py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-end justify-between mb-10">
            <div>
              <p className="text-xs font-semibold tracking-widest uppercase mb-2" style={{ color: '#35C493' }}>
                Por tipo de espacio
              </p>
              <h2 className="font-bold" style={{ color: 'var(--text-primary)', fontSize: '1.75rem', letterSpacing: '-0.03em' }}>
                Explora tu opción
              </h2>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            {categories.map(cat => {
              const Icon = cat.icon
              return (
                <Link key={cat.value} href={`/buscar?categoria=${cat.value}`}
                  className="cat-hover group flex flex-col items-center gap-3 p-4 rounded-2xl transition-all duration-200 text-center"
                  style={{
                    border: '1px solid var(--border-subtle)',
                    background: '#fff',
                  }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center transition-colors"
                    style={{ background: 'var(--bg-elevated)' }}>
                    <Icon size={18} style={{ color: 'var(--text-secondary)' }} />
                  </div>
                  <span className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
                    {cat.label}
                  </span>
                </Link>
              )
            })}
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────
          CÓMO FUNCIONA
          ───────────────────────────────────────── */}
      <section style={{ background: 'var(--bg-surface)' }} className="py-20">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-14">
            <p className="text-xs font-semibold tracking-widest uppercase mb-3" style={{ color: '#35C493' }}>
              Proceso simple
            </p>
            <h2 className="font-bold" style={{ color: 'var(--text-primary)', fontSize: '1.75rem', letterSpacing: '-0.03em' }}>
              Reserva en tres pasos
            </h2>
            <p className="mt-3 text-sm" style={{ color: 'var(--text-muted)' }}>
              Sin llamadas, sin complicaciones, sin sorpresas
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              { num: '01', icon: Search,     title: 'Busca tu espacio',      desc: 'Filtra por tipo de evento, sector y capacidad. Compara y elige.' },
              { num: '02', icon: Clock,      title: 'Elige fecha y horario',  desc: 'Selecciona la fecha, el horario y los servicios adicionales.' },
              { num: '03', icon: CreditCard, title: 'Reserva con el 10%',    desc: 'Garantiza tu fecha pagando solo el 10%. El resto en el espacio.' },
            ].map((step, i) => {
              const Icon = step.icon
              return (
                <div key={step.num} className="relative rounded-2xl p-7"
                  style={{ background: '#fff', border: '1px solid var(--border-subtle)' }}>
                  <div className="flex items-center gap-4 mb-5">
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: 'var(--brand-dim)' }}>
                      <Icon size={20} style={{ color: 'var(--brand)' }} />
                    </div>
                    <span className="text-xs font-bold tracking-widest" style={{ color: 'var(--border-medium)' }}>
                      PASO {step.num}
                    </span>
                  </div>
                  <h3 className="font-bold mb-2 text-base" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                    {step.title}
                  </h3>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                    {step.desc}
                  </p>
                  {i < 2 && (
                    <div className="hidden md:block absolute top-1/2 -right-3 w-6 h-6 rounded-full flex items-center justify-center z-10"
                      style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
                      <ArrowRight size={12} style={{ color: 'var(--text-muted)' }} />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────
          TRUST
          ───────────────────────────────────────── */}
      <section style={{ background: '#fff', borderTop: '1px solid var(--border-subtle)', borderBottom: '1px solid var(--border-subtle)' }}>
        <div className="max-w-4xl mx-auto px-6 py-14 grid md:grid-cols-3 gap-10">
          {[
            { icon: Shield,      color: '#35C493', title: 'Espacios verificados',    desc: 'Revisamos cada espacio antes de publicarlo en la plataforma.' },
            { icon: CheckCircle, color: '#3B82F6', title: 'Confirmación en 24 horas', desc: 'Los propietarios responden rápido. Máximo 24 horas.' },
            { icon: CreditCard,  color: '#8B5CF6', title: 'Solo el 10% por adelantado', desc: 'Bloquea tu fecha sin pagar el total. Sin sorpresas.' },
          ].map(({ icon: Icon, color, title, desc }) => (
            <div key={title} className="flex flex-col items-start gap-4">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
                style={{ background: `${color}10` }}>
                <Icon size={22} style={{ color }} />
              </div>
              <div>
                <h4 className="font-semibold text-sm mb-1.5" style={{ color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>{title}</h4>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─────────────────────────────────────────────
          CTA PROPIETARIOS
          ───────────────────────────────────────── */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="relative overflow-hidden rounded-3xl"
            style={{ background: 'linear-gradient(140deg, #0D2318 0%, #1A4D38 100%)' }}>

            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-0 right-0 w-80 h-80 rounded-full opacity-10 blur-3xl"
                style={{ background: '#35C493', transform: 'translate(25%,-25%)' }} />
              <div className="absolute bottom-0 left-1/3 w-64 h-64 rounded-full opacity-8 blur-3xl"
                style={{ background: '#35C493', transform: 'translateY(30%)' }} />
            </div>

            <div className="relative grid md:grid-cols-[1fr_auto] items-center gap-8 px-10 py-14 md:px-14">
              <div>
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full mb-5 text-xs font-semibold"
                  style={{ background: 'rgba(53,196,147,0.15)', color: '#6EE7C7', border: '1px solid rgba(53,196,147,0.2)' }}>
                  Para propietarios
                </div>
                <h2 className="font-bold text-white mb-3"
                  style={{ fontSize: 'clamp(1.5rem,3vw,2.25rem)', letterSpacing: '-0.03em', lineHeight: 1.15 }}>
                  ¿Tienes un espacio para eventos?
                </h2>
                <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.95rem', lineHeight: 1.7, maxWidth: 480 }}>
                  Publica tu salón, restaurante, rooftop o villa. Recibe reservas online y gestiona todo desde tu panel.
                </p>
              </div>
              <div className="flex flex-col gap-3 shrink-0">
                <Link href="/auth"
                  className="inline-flex items-center justify-center gap-2 font-bold px-8 py-4 rounded-2xl text-sm whitespace-nowrap"
                  style={{ background: '#35C493', color: '#fff', boxShadow: '0 4px 20px rgba(53,196,147,0.35)' }}>
                  Publicar espacio gratis <ArrowRight size={15} />
                </Link>
                <Link href="/buscar"
                  className="inline-flex items-center justify-center gap-2 font-medium px-8 py-4 rounded-2xl text-sm whitespace-nowrap"
                  style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.12)' }}>
                  Explorar espacios
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

    </div>
  )
}
