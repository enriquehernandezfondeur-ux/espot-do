import Link from 'next/link'
import { Search, MapPin, ArrowRight, Shield, Users, Star, Clock, CreditCard, CheckCircle } from 'lucide-react'
import { getPublishedSpaces } from '@/lib/actions/marketplace'
import { formatCurrency } from '@/lib/utils'

const categories = [
  { value: 'salon',       label: 'Salones',       emoji: '🏛️' },
  { value: 'restaurante', label: 'Restaurantes',   emoji: '🍽️' },
  { value: 'rooftop',     label: 'Rooftops',       emoji: '🌆' },
  { value: 'bar',         label: 'Bares',          emoji: '🍸' },
  { value: 'terraza',     label: 'Terrazas',       emoji: '🌿' },
  { value: 'estudio',     label: 'Estudios',       emoji: '🎬' },
  { value: 'hotel',       label: 'Hoteles',        emoji: '🏨' },
  { value: 'villa',       label: 'Villas',         emoji: '🏡' },
]

const eventTypes = [
  { label: 'Cumpleaños',  emoji: '🎂' },
  { label: 'Bodas',       emoji: '💍' },
  { label: 'Corporativo', emoji: '💼' },
  { label: 'Graduación',  emoji: '🎓' },
  { label: 'Quinceañeras',emoji: '👑' },
  { label: 'Baby Shower', emoji: '👶' },
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
      {/* ── HERO ──────────────────────────────────────────── */}
      <section className="relative overflow-hidden" style={{
        background: 'linear-gradient(135deg, #0F2A22 0%, #1A3D30 40%, #0F2A22 100%)',
        minHeight: 480,
      }}>
        {/* Decorative circles */}
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full opacity-10"
          style={{ background: 'var(--brand)' }} />
        <div className="absolute -bottom-16 -left-16 w-72 h-72 rounded-full opacity-5"
          style={{ background: 'var(--brand)' }} />

        <div className="relative max-w-5xl mx-auto px-6 pt-16 pb-20 text-center">
          <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-5 text-sm"
            style={{ background: 'rgba(53,196,147,0.15)', border: '1px solid rgba(53,196,147,0.3)', color: '#6EE7C7' }}>
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'var(--brand)' }} />
            La plataforma de espacios #1 en RD
          </div>

          <h1 className="text-5xl md:text-6xl font-bold leading-[1.1] mb-5 text-white">
            Encuentra el espacio
            <br />
            <span style={{ color: 'var(--brand)' }}>perfecto para tu evento</span>
          </h1>
          <p className="text-lg mb-10 max-w-xl mx-auto" style={{ color: 'rgba(255,255,255,0.65)' }}>
            Salones, rooftops, restaurantes y más — busca, compara y reserva en minutos.
          </p>

          {/* ── Search ── */}
          <div className="max-w-3xl mx-auto">
            <form action="/buscar"
              className="flex items-stretch rounded-2xl overflow-hidden shadow-2xl"
              style={{ background: '#fff', border: '1px solid rgba(255,255,255,0.1)' }}
            >
              <div className="flex items-center gap-3 flex-1 px-5">
                <Search size={18} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                <input name="q" placeholder="Salón, rooftop, restaurante..."
                  className="flex-1 bg-transparent py-4 text-sm focus:outline-none"
                  style={{ color: 'var(--text-primary)' }} />
              </div>
              <div className="w-px my-3" style={{ background: 'var(--border-subtle)' }} />
              <div className="flex items-center gap-3 px-5 w-44">
                <MapPin size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                <input name="sector" placeholder="Sector / Ciudad"
                  className="w-full bg-transparent py-4 text-sm focus:outline-none"
                  style={{ color: 'var(--text-primary)' }} />
              </div>
              <button type="submit"
                className="btn-brand px-8 py-4 text-sm font-bold shrink-0 rounded-none rounded-r-2xl">
                Buscar
              </button>
            </form>

            {/* Quick sectors */}
            <div className="flex items-center justify-center gap-2 mt-4 flex-wrap">
              {['Piantini', 'Naco', 'Bella Vista', 'Arroyo Hondo', 'Santiago', 'Punta Cana'].map(s => (
                <Link key={s} href={`/buscar?sector=${s}`}
                  className="text-xs px-3 py-1.5 rounded-full transition-all"
                  style={{ background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.15)' }}>
                  {s}
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Wave bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-10 rounded-t-[50%]"
          style={{ background: 'var(--bg-base)' }} />
      </section>

      {/* ── TIPOS DE EVENTO ─────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-6 pt-12 pb-6">
        <h2 className="text-lg font-bold mb-5" style={{ color: 'var(--text-primary)' }}>
          ¿Qué tipo de evento tienes?
        </h2>
        <div className="grid grid-cols-6 gap-3">
          {eventTypes.map(et => (
            <Link key={et.label} href={`/buscar?q=${et.label}`}
              className="cat-hover flex flex-col items-center gap-2 py-4 px-3 rounded-2xl text-center"
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
              <span className="text-3xl">{et.emoji}</span>
              <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{et.label}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* ── CATEGORÍAS ──────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-6 py-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Explorar por tipo de espacio</h2>
          <Link href="/buscar" className="link-muted flex items-center gap-1 text-sm">
            Ver todos <ArrowRight size={14} />
          </Link>
        </div>
        <div className="flex gap-2.5 overflow-x-auto pb-2">
          {categories.map(cat => (
            <Link key={cat.value} href={`/buscar?categoria=${cat.value}`}
              className="cat-hover flex items-center gap-2.5 px-5 py-3 rounded-full shrink-0"
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
              <span className="text-lg">{cat.emoji}</span>
              <span className="text-sm font-medium whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>
                {cat.label}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* ── ESPACIOS ────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Espacios disponibles</h2>
            <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
              {spaces.length > 0 ? `${spaces.length} espacio${spaces.length !== 1 ? 's' : ''} en República Dominicana` : 'Sé el primero en publicar'}
            </p>
          </div>
          <Link href="/buscar" className="link-muted flex items-center gap-1 text-sm font-medium">
            Ver todos <ArrowRight size={14} />
          </Link>
        </div>

        {spaces.length === 0 ? (
          <div className="text-center py-20 rounded-3xl"
            style={{ background: 'var(--bg-surface)', border: '2px dashed var(--border-medium)' }}>
            <p className="text-4xl mb-4">🏛️</p>
            <h3 className="font-semibold mb-2 text-lg" style={{ color: 'var(--text-primary)' }}>
              Próximamente más espacios
            </h3>
            <p className="text-sm mb-5" style={{ color: 'var(--text-secondary)' }}>
              Sé el primero en publicar tu espacio en espot.do
            </p>
            <Link href="/auth" className="btn-brand inline-flex items-center gap-2 text-sm font-semibold px-6 py-3 rounded-full">
              Publicar mi espacio gratis
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {spaces.slice(0, 6).map((space: any) => {
              const priceInfo = getPriceLabel(space)
              const cover = getCover(space)
              const catEmoji = categories.find(c => c.value === space.category)?.emoji ?? '🏛️'
              return (
                <Link key={space.id} href={`/espacios/${space.slug}`} className="group block">
                  <div className="card-hover rounded-2xl overflow-hidden"
                    style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
                    {/* Image */}
                    <div className="relative h-52 overflow-hidden rounded-t-2xl" style={{ background: 'var(--bg-elevated)' }}>
                      {cover ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={cover} alt={space.name}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                          <span className="text-5xl">{catEmoji}</span>
                          <span className="text-xs capitalize font-medium" style={{ color: 'var(--text-muted)' }}>{space.category}</span>
                        </div>
                      )}

                      {/* Badges */}
                      <div className="absolute top-3 left-3 flex gap-1.5">
                        {space.is_verified && (
                          <span className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full"
                            style={{ background: 'rgba(53,196,147,0.15)', color: 'var(--brand)', backdropFilter: 'blur(8px)', border: '1px solid rgba(53,196,147,0.3)' }}>
                            <Shield size={10} /> Verificado
                          </span>
                        )}
                      </div>
                      <div className="absolute top-3 right-3 text-xs font-medium px-2.5 py-1 rounded-full capitalize"
                        style={{ background: 'rgba(255,255,255,0.9)', color: 'var(--text-secondary)' }}>
                        {space.category}
                      </div>

                      {/* Price overlay */}
                      {priceInfo && (
                        <div className="absolute bottom-3 right-3 text-sm font-bold px-3 py-1.5 rounded-full"
                          style={{ background: '#fff', color: 'var(--brand)', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>
                          {priceInfo.price}
                          {priceInfo.unit && <span className="text-xs font-normal ml-1" style={{ color: 'var(--text-muted)' }}>{priceInfo.unit}</span>}
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
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                          <span className="flex items-center gap-1">
                            <Users size={12} /> hasta {space.capacity_max}
                          </span>
                          {space.space_addons?.length > 0 && (
                            <span className="flex items-center gap-1">
                              <Star size={12} /> {space.space_addons.length} extras
                            </span>
                          )}
                        </div>
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
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
      </section>

      {/* ── CÓMO FUNCIONA ───────────────────────────────── */}
      <section className="py-16 mt-8" style={{ background: '#fff', borderTop: '1px solid var(--border-subtle)', borderBottom: '1px solid var(--border-subtle)' }}>
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
              Reserva en 3 pasos simples
            </h2>
            <p style={{ color: 'var(--text-secondary)' }}>Sin llamadas, sin complicaciones</p>
          </div>
          <div className="grid grid-cols-3 gap-8">
            {[
              { icon: Search,     num: '1', title: 'Busca tu espacio',    desc: 'Filtra por tipo, sector, capacidad y precio. Compara opciones.' },
              { icon: Clock,      num: '2', title: 'Elige fecha y hora',  desc: 'Selecciona cuándo necesitas el espacio y agrega los extras que quieras.' },
              { icon: CreditCard, num: '3', title: 'Reserva y confirma', desc: 'Garantiza tu fecha pagando solo el 10%. El resto lo coordinas directamente.' },
            ].map(({ icon: Icon, num, title, desc }) => (
              <div key={num} className="text-center relative">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5 relative"
                  style={{ background: 'var(--brand-dim)', border: '1.5px solid var(--brand-border)' }}>
                  <Icon size={22} style={{ color: 'var(--brand)' }} />
                  <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
                    style={{ background: 'var(--brand)' }}>{num}</span>
                </div>
                <h3 className="font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>{title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── GARANTÍAS ───────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-6 py-14">
        <div className="grid grid-cols-3 gap-6">
          {[
            { icon: Shield,       title: 'Espacios verificados',     desc: 'Revisamos cada espacio antes de publicarlo.' },
            { icon: CheckCircle,  title: 'Confirmación inmediata',   desc: 'El propietario confirma en menos de 24 horas.' },
            { icon: CreditCard,   title: 'Pago seguro',              desc: 'Solo el 10% por adelantado para garantizar tu fecha.' },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="flex items-start gap-4 p-5 rounded-2xl"
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: 'var(--brand-dim)' }}>
                <Icon size={18} style={{ color: 'var(--brand)' }} />
              </div>
              <div>
                <h4 className="font-semibold text-sm mb-1" style={{ color: 'var(--text-primary)' }}>{title}</h4>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA PROPIETARIOS ────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-6 pb-16">
        <div className="relative overflow-hidden rounded-3xl px-12 py-14 text-center text-white"
          style={{ background: 'linear-gradient(135deg, #0F2A22 0%, #1A4D38 100%)' }}>
          <div className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-10 -translate-y-1/2 translate-x-1/4"
            style={{ background: 'var(--brand)' }} />
          <h2 className="text-2xl font-bold mb-3 relative">¿Tienes un espacio para eventos?</h2>
          <p className="mb-8 max-w-md mx-auto text-sm relative" style={{ color: 'rgba(255,255,255,0.7)' }}>
            Publica tu salón, restaurante, rooftop o venue. Recibe reservas online y gestiona todo desde tu panel.
          </p>
          <div className="flex items-center justify-center gap-4 relative flex-wrap">
            <Link href="/auth" className="btn-brand inline-flex items-center gap-2 font-bold px-8 py-3.5 rounded-full text-sm">
              Publicar mi espacio gratis
            </Link>
            <Link href="/buscar"
              className="inline-flex items-center gap-2 font-medium px-8 py-3.5 rounded-full text-sm transition-colors"
              style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)' }}>
              Ver cómo funciona
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
