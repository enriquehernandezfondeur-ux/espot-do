import Link from 'next/link'
import {
  Search, MapPin, ArrowRight, Shield, Users,
  Clock, CreditCard, CheckCircle, Star,
  Building2, UtensilsCrossed, Sunset, Wine,
  Trees, Camera, Briefcase, Hotel, Home,
} from 'lucide-react'
import { getPublishedSpaces } from '@/lib/actions/marketplace'
import { formatCurrency } from '@/lib/utils'

// Categorías con iconos SVG y fotos reales de Unsplash
const categories = [
  {
    value: 'salon', label: 'Salones',
    icon: Building2,
    gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    img: 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=400&q=80&fit=crop',
  },
  {
    value: 'restaurante', label: 'Restaurantes',
    icon: UtensilsCrossed,
    gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    img: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&q=80&fit=crop',
  },
  {
    value: 'rooftop', label: 'Rooftops',
    icon: Sunset,
    gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    img: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&q=80&fit=crop',
  },
  {
    value: 'bar', label: 'Bares',
    icon: Wine,
    gradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
    img: 'https://images.unsplash.com/photo-1470337458703-46ad1756a187?w=400&q=80&fit=crop',
  },
  {
    value: 'terraza', label: 'Terrazas',
    icon: Trees,
    gradient: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
    img: 'https://images.unsplash.com/photo-1533090161767-e6ffed986c88?w=400&q=80&fit=crop',
  },
  {
    value: 'estudio', label: 'Estudios',
    icon: Camera,
    gradient: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
    img: 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=400&q=80&fit=crop',
  },
  {
    value: 'coworking', label: 'Coworking',
    icon: Briefcase,
    gradient: 'linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%)',
    img: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&q=80&fit=crop',
  },
  {
    value: 'villa', label: 'Villas',
    icon: Home,
    gradient: 'linear-gradient(135deg, #fbc2eb 0%, #a6c1ee 100%)',
    img: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=400&q=80&fit=crop',
  },
]

const eventTypes = [
  {
    label: 'Cumpleaños', slug: 'cumpleanos',
    img: 'https://images.unsplash.com/photo-1464349095431-e9a21285b5f3?w=600&q=80&fit=crop',
    desc: 'Salones privados, terrazas y más',
  },
  {
    label: 'Bodas', slug: 'bodas',
    img: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=600&q=80&fit=crop',
    desc: 'El día más especial merece el mejor espacio',
  },
  {
    label: 'Corporativo', slug: 'corporativo',
    img: 'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=600&q=80&fit=crop',
    desc: 'Reuniones, lanzamientos y eventos de empresa',
  },
  {
    label: 'Graduación', slug: 'graduacion',
    img: 'https://images.unsplash.com/photo-1627556704302-624286467c65?w=600&q=80&fit=crop',
    desc: 'Celebra este logro a lo grande',
  },
  {
    label: 'Quinceañeras', slug: 'quinceaneras',
    img: 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=600&q=80&fit=crop',
    desc: 'Una celebración única e inolvidable',
  },
  {
    label: 'Baby Shower', slug: 'baby-shower',
    img: 'https://images.unsplash.com/photo-1529634806980-85c3dd6d34ac?w=600&q=80&fit=crop',
    desc: 'Bienvenida al nuevo integrante',
  },
]

const quickFilters = [
  { label: 'Más de 50 invitados', href: '/buscar?capacidad=50' },
  { label: 'Con terraza',         href: '/buscar?categoria=terraza' },
  { label: 'Salones privados',    href: '/buscar?categoria=salon' },
  { label: 'Con piscina',         href: '/buscar?q=piscina' },
]

function getCover(space: any) {
  return space.space_images?.find((i: any) => i.is_cover)?.url ?? space.space_images?.[0]?.url ?? null
}

function getPriceLabel(space: any) {
  const p = space.space_pricing?.find((x: any) => x.is_active) ?? space.space_pricing?.[0]
  if (!p) return null
  if (p.pricing_type === 'hourly') return { price: formatCurrency(p.hourly_price), unit: '/ hora' }
  if (p.pricing_type === 'minimum_consumption') return { price: formatCurrency(p.minimum_consumption), unit: 'consumo mín.' }
  if (p.pricing_type === 'fixed_package') return { price: formatCurrency(p.fixed_price), unit: 'paquete' }
  return { price: 'Cotizar', unit: '' }
}

export default async function HomePage() {
  const spaces = await getPublishedSpaces()

  return (
    <div>
      {/* ── HERO ── */}
      <section className="relative overflow-hidden" style={{ minHeight: 520 }}>
        {/* Background con gradiente oscuro */}
        <div className="absolute inset-0" style={{
          background: 'linear-gradient(160deg, #0B1F18 0%, #0F2A22 50%, #0B0F0E 100%)',
        }} />
        {/* Orbes decorativos */}
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full opacity-10 blur-3xl pointer-events-none"
          style={{ background: '#35C493', transform: 'translate(30%, -30%)' }} />
        <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full opacity-5 blur-3xl pointer-events-none"
          style={{ background: '#35C493', transform: 'translate(-30%, 30%)' }} />

        <div className="relative max-w-5xl mx-auto px-6 pt-20 pb-20 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 rounded-full px-5 py-2 mb-7 text-sm font-semibold"
            style={{ background: 'rgba(53,196,147,0.12)', border: '1px solid rgba(53,196,147,0.25)', color: '#6EE7C7' }}>
            <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#35C493' }} />
            Plataforma de espacios para eventos en RD
          </div>

          {/* Título */}
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-5" style={{ letterSpacing: '-0.03em', lineHeight: 1.1 }}>
            El espacio perfecto
            <br />
            <span style={{
              background: 'linear-gradient(90deg, #35C493 0%, #4DD9A7 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              para tu evento
            </span>
          </h1>
          <p className="text-lg mb-10 max-w-xl mx-auto" style={{ color: 'rgba(255,255,255,0.6)', lineHeight: 1.8 }}>
            Reserva salones, rooftops, restaurantes y más — por hora o paquete, en minutos.
          </p>

          {/* Search */}
          <form action="/buscar"
            className="flex items-stretch max-w-3xl mx-auto rounded-2xl overflow-hidden"
            style={{ background: '#fff', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <div className="flex items-center gap-3 flex-1 px-5">
              <Search size={18} style={{ color: '#9CA3AF', flexShrink: 0 }} />
              <input name="q" placeholder="Salón, rooftop, restaurante..."
                className="flex-1 bg-transparent py-4 text-sm focus:outline-none"
                style={{ color: '#0F1623' }} />
            </div>
            <div className="w-px my-4" style={{ background: '#E8ECF0' }} />
            <div className="flex items-center gap-3 px-5 w-48">
              <MapPin size={16} style={{ color: '#9CA3AF', flexShrink: 0 }} />
              <input name="sector" placeholder="Sector / Ciudad"
                className="w-full bg-transparent py-4 text-sm focus:outline-none"
                style={{ color: '#0F1623' }} />
            </div>
            <button type="submit"
              className="px-7 text-sm font-bold text-white rounded-r-2xl transition-all"
              style={{ background: 'linear-gradient(135deg, #35C493, #28A87C)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.1)' }}>
              Buscar
            </button>
          </form>

          {/* Quick sectors */}
          <div className="flex items-center justify-center gap-2 mt-5 flex-wrap">
            {['Piantini', 'Naco', 'Bella Vista', 'Arroyo Hondo', 'Santiago'].map(s => (
              <Link key={s} href={`/buscar?sector=${s}`}
                className="text-xs px-3.5 py-1.5 rounded-full transition-all"
                style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.12)' }}>
                {s}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── STATS ── */}
      <section style={{ background: '#fff', borderBottom: '1px solid var(--border-subtle)' }}>
        <div className="max-w-5xl mx-auto px-6 py-8 grid grid-cols-4 gap-6">
          {[
            { value: spaces.length + '+', label: 'Espacios disponibles' },
            { value: 'RD$', label: 'Sin comisión oculta' },
            { value: '24h', label: 'Respuesta del propietario' },
            { value: '10%', label: 'Primer pago bloquea fecha' },
          ].map(stat => (
            <div key={stat.label} className="text-center">
              <div className="text-2xl font-bold mb-1" style={{ color: '#35C493', letterSpacing: '-0.02em' }}>{stat.value}</div>
              <div className="text-xs" style={{ color: '#9CA3AF' }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── TIPOS DE EVENTO ── */}
      <section className="max-w-7xl mx-auto px-6 py-16">

        {/* Header */}
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold mb-2" style={{ color: 'var(--text-primary)', letterSpacing: '-0.025em' }}>
            ¿Qué tipo de evento estás planeando?
          </h2>
          <p className="text-base" style={{ color: 'var(--text-muted)' }}>
            Encuentra el espacio ideal según tu ocasión
          </p>
        </div>

        {/* Quick filter chips — sin emojis */}
        <div className="flex items-center justify-center gap-2 mb-10 flex-wrap">
          {quickFilters.map(f => (
            <Link key={f.label} href={f.href}
              className="px-4 py-2 rounded-full text-sm font-medium transition-all"
              style={{
                background: '#fff',
                border: '1.5px solid var(--border-medium)',
                color: 'var(--text-secondary)',
                boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
              }}>
              {f.label}
            </Link>
          ))}
        </div>

        {/* Grid desktop / scroll mobile */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-5">
          {eventTypes.map(et => (
            <Link key={et.slug} href={`/buscar?activity=${et.slug}`}
              className="group relative block overflow-hidden rounded-2xl"
              style={{ aspectRatio: '4/3', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>

              {/* Imagen de fondo */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={et.img}
                alt={et.label}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />

              {/* Overlay degradado */}
              <div className="absolute inset-0 transition-opacity duration-300"
                style={{
                  background: 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.2) 50%, rgba(0,0,0,0.05) 100%)',
                }} />

              {/* Hover overlay adicional */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{ background: 'rgba(0,0,0,0.1)' }} />

              {/* Contenido */}
              <div className="absolute bottom-0 left-0 right-0 p-5">
                <h3 className="text-xl font-bold text-white mb-1 tracking-tight">
                  {et.label}
                </h3>
                <p className="text-sm text-white/70 leading-snug">
                  {et.desc}
                </p>
              </div>

              {/* Flecha hover */}
              <div className="absolute top-4 right-4 w-9 h-9 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 -translate-y-1 group-hover:translate-y-0"
                style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)' }}>
                <ArrowRight size={16} className="text-white" />
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── CATEGORÍAS CON FOTOS ── */}
      <section className="max-w-7xl mx-auto px-6 pb-14">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
              Explora por tipo de espacio
            </h2>
            <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
              Cada espacio tiene su propia experiencia
            </p>
          </div>
          <Link href="/buscar" className="flex items-center gap-1 text-sm font-semibold link-muted">
            Ver todos <ArrowRight size={14} />
          </Link>
        </div>
        <div className="grid grid-cols-4 gap-4">
          {categories.map(cat => {
            const Icon = cat.icon
            return (
              <Link key={cat.value} href={`/buscar?categoria=${cat.value}`} className="group relative rounded-2xl overflow-hidden block"
                style={{ aspectRatio: '4/3' }}>
                {/* Foto de fondo */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={cat.img} alt={cat.label}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                {/* Overlay degradado */}
                <div className="absolute inset-0 transition-opacity duration-300"
                  style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.1) 60%, transparent 100%)' }} />
                {/* Icono y nombre */}
                <div className="absolute bottom-0 left-0 right-0 p-4 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                      style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)' }}>
                      <Icon size={16} className="text-white" />
                    </div>
                    <span className="text-white text-sm font-bold">{cat.label}</span>
                  </div>
                  <ArrowRight size={15} className="text-white/60 group-hover:text-white transition-colors" />
                </div>
                {/* Hover overlay */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  style={{ background: `${cat.gradient.replace('135deg', '160deg').slice(0, -1)}, 0.15)`.replace('linear-gradient(160deg, ', 'linear-gradient(160deg, rgba(').replace(') 0%', ') 0%').replace(') 100%)', ') 100%)') || 'rgba(53,196,147,0.1)' }} />
              </Link>
            )
          })}
        </div>
      </section>

      {/* ── ESPACIOS DISPONIBLES ── */}
      <section style={{ background: 'var(--bg-surface)', borderTop: '1px solid var(--border-subtle)', borderBottom: '1px solid var(--border-subtle)' }}>
        <div className="max-w-7xl mx-auto px-6 py-14">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                Espacios disponibles
              </h2>
              <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                {spaces.length} espacio{spaces.length !== 1 ? 's' : ''} en República Dominicana
              </p>
            </div>
            <Link href="/buscar" className="flex items-center gap-1 text-sm font-semibold link-muted">
              Ver todos <ArrowRight size={14} />
            </Link>
          </div>

          {spaces.length === 0 ? (
            <div className="text-center py-20 rounded-3xl"
              style={{ background: '#fff', border: '2px dashed var(--border-medium)' }}>
              <p className="text-4xl mb-4">🏛️</p>
              <h3 className="font-semibold mb-2 text-lg" style={{ color: 'var(--text-primary)' }}>Próximamente más espacios</h3>
              <p className="text-sm mb-5" style={{ color: 'var(--text-secondary)' }}>Sé el primero en publicar tu espacio</p>
              <Link href="/auth" className="btn-brand inline-flex items-center gap-2 text-sm font-semibold px-6 py-3 rounded-full">
                Publicar mi espacio gratis
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-5">
              {spaces.slice(0, 6).map((space: any) => {
                const priceInfo = getPriceLabel(space)
                const cover = getCover(space)
                const catDef = categories.find(c => c.value === space.category)
                const Icon = catDef?.icon ?? Building2
                return (
                  <Link key={space.id} href={`/espacios/${space.slug}`} className="group block">
                    <div className="card-hover rounded-2xl overflow-hidden"
                      style={{ background: '#fff', border: '1px solid var(--border-subtle)' }}>
                      <div className="relative h-52 overflow-hidden">
                        {cover ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={cover} alt={space.name}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center"
                            style={{ background: catDef?.gradient || 'linear-gradient(135deg, #667eea, #764ba2)' }}>
                            <Icon size={40} className="text-white opacity-80" />
                          </div>
                        )}
                        {space.is_verified && (
                          <div className="absolute top-3 left-3 flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full"
                            style={{ background: 'rgba(53,196,147,0.9)', color: '#fff', backdropFilter: 'blur(8px)' }}>
                            <Shield size={10} /> Verificado
                          </div>
                        )}
                        {priceInfo && (
                          <div className="absolute bottom-3 right-3 text-sm font-bold px-3 py-1.5 rounded-full"
                            style={{ background: 'rgba(0,0,0,0.7)', color: '#fff', backdropFilter: 'blur(8px)' }}>
                            {priceInfo.price}
                            {priceInfo.unit && <span className="text-xs ml-1 opacity-75">{priceInfo.unit}</span>}
                          </div>
                        )}
                      </div>
                      <div className="p-5">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h3 className="font-bold text-base leading-tight group-hover:text-[#35C493] transition-colors"
                            style={{ color: 'var(--text-primary)' }}>
                            {space.name}
                          </h3>
                          {space.space_addons?.length > 0 && (
                            <span className="flex items-center gap-0.5 text-xs shrink-0"
                              style={{ color: '#F59E0B' }}>
                              <Star size={11} className="fill-current" /> extras
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
                          <MapPin size={11} />
                          {space.sector ? `${space.sector}, ` : ''}{space.city}
                          <span className="mx-1">·</span>
                          <Users size={11} /> {space.capacity_max} máx.
                        </div>
                        <div className="flex items-center justify-between pt-3"
                          style={{ borderTop: '1px solid var(--border-subtle)' }}>
                          <span className="capitalize text-xs font-medium px-2.5 py-1 rounded-full"
                            style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>
                            {space.category}
                          </span>
                          <span className="text-xs font-bold px-3 py-1.5 rounded-full"
                            style={{ background: 'var(--brand-dim)', color: 'var(--brand)' }}>
                            Ver espacio →
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
      </section>

      {/* ── CÓMO FUNCIONA ── */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-3" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            Tan fácil como 1, 2, 3
          </h2>
          <p style={{ color: 'var(--text-secondary)' }}>Sin llamadas, sin complicaciones, sin sorpresas</p>
        </div>
        <div className="grid grid-cols-3 gap-8 relative">
          {/* Línea conectora */}
          <div className="absolute top-10 left-1/3 right-1/3 h-px hidden lg:block"
            style={{ background: 'linear-gradient(90deg, var(--brand), var(--brand))', opacity: 0.3 }} />
          {[
            {
              num: '01', icon: Search, color: '#35C493',
              title: 'Busca tu espacio',
              desc: 'Filtra por tipo de evento, sector, capacidad y presupuesto. Compara y elige el que más te guste.',
            },
            {
              num: '02', icon: Clock, color: '#3B82F6',
              title: 'Elige fecha y servicios',
              desc: 'Selecciona cuándo necesitas el espacio, el horario y los servicios adicionales que quieras.',
            },
            {
              num: '03', icon: CreditCard, color: '#8B5CF6',
              title: 'Reserva con el 10%',
              desc: 'Garantiza tu fecha pagando solo el 10% ahora. El resto lo pagas directo en el espacio.',
            },
          ].map(step => {
            const Icon = step.icon
            return (
              <div key={step.num} className="relative text-center">
                <div className="relative inline-flex flex-col items-center">
                  {/* Número grande de fondo */}
                  <div className="absolute -top-4 text-8xl font-black opacity-5 select-none"
                    style={{ color: step.color, lineHeight: 1 }}>
                    {step.num}
                  </div>
                  {/* Icono */}
                  <div className="relative w-16 h-16 rounded-2xl flex items-center justify-center mb-5 mx-auto"
                    style={{ background: `${step.color}15`, border: `1.5px solid ${step.color}25` }}>
                    <Icon size={24} style={{ color: step.color }} />
                    <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
                      style={{ background: step.color }}>
                      {step.num.replace('0', '')}
                    </div>
                  </div>
                </div>
                <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--text-primary)' }}>{step.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{step.desc}</p>
              </div>
            )
          })}
        </div>
      </section>

      {/* ── GARANTÍAS ── */}
      <section style={{ background: '#fff', borderTop: '1px solid var(--border-subtle)' }}>
        <div className="max-w-5xl mx-auto px-6 py-12 grid grid-cols-3 gap-6">
          {[
            { icon: Shield,      color: '#35C493', title: 'Espacios verificados',     desc: 'Revisamos cada espacio antes de publicarlo en la plataforma.' },
            { icon: CheckCircle, color: '#3B82F6', title: 'Confirmación en 24h',      desc: 'Los propietarios responden rápido. Máximo 24 horas.' },
            { icon: Star,        color: '#F59E0B', title: 'Reserva garantizada',      desc: 'Solo el 10% por adelantado. Sin pagos sorpresa.' },
          ].map(({ icon: Icon, color, title, desc }) => (
            <div key={title} className="flex items-start gap-4">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: `${color}12` }}>
                <Icon size={20} style={{ color }} />
              </div>
              <div>
                <h4 className="font-semibold text-sm mb-1" style={{ color: 'var(--text-primary)' }}>{title}</h4>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA PROPIETARIOS ── */}
      <section className="max-w-7xl mx-auto px-6 py-16">
        <div className="relative overflow-hidden rounded-3xl px-12 py-14 text-center"
          style={{ background: 'linear-gradient(135deg, #0F2A22 0%, #1A4D38 60%, #0F2A22 100%)' }}>
          {/* Decoración */}
          <div className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-10 blur-3xl"
            style={{ background: '#35C493', transform: 'translate(30%, -30%)' }} />
          <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full opacity-5 blur-3xl"
            style={{ background: '#35C493', transform: 'translate(-20%, 20%)' }} />

          <div className="relative">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-5 text-xs font-bold"
              style={{ background: 'rgba(53,196,147,0.15)', color: '#6EE7C7', border: '1px solid rgba(53,196,147,0.2)' }}>
              Para propietarios de espacios
            </div>
            <h2 className="text-3xl font-bold text-white mb-3" style={{ letterSpacing: '-0.02em' }}>
              ¿Tienes un espacio para eventos?
            </h2>
            <p className="text-base mb-8 max-w-lg mx-auto" style={{ color: 'rgba(255,255,255,0.65)', lineHeight: 1.7 }}>
              Publica tu salón, restaurante, rooftop o villa. Recibe reservas online y gestiona todo desde tu panel.
            </p>
            <div className="flex items-center justify-center gap-4 flex-wrap">
              <Link href="/auth"
                className="inline-flex items-center gap-2 font-bold px-8 py-4 rounded-2xl text-sm transition-all"
                style={{ background: '#35C493', color: '#fff', boxShadow: '0 4px 24px rgba(53,196,147,0.4)' }}>
                Publicar mi espacio gratis <ArrowRight size={16} />
              </Link>
              <Link href="/buscar"
                className="inline-flex items-center gap-2 font-medium px-8 py-4 rounded-2xl text-sm transition-all"
                style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.8)', border: '1px solid rgba(255,255,255,0.15)' }}>
                Ver cómo funciona
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
