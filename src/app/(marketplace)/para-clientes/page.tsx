import type { Metadata } from 'next'
import Link from 'next/link'
import {
  Search, CalendarCheck, CreditCard, Star,
  Check, ChevronDown, Building2, UtensilsCrossed, Sunset,
  Trees, Wine, Hotel, Home, Camera, Briefcase, LayoutGrid,
  Cake, Heart, GraduationCap, Users, Baby, Zap,
  Clock, CalendarDays, CalendarRange,
} from 'lucide-react'

export const metadata: Metadata = {
  title: 'Encuentra el espacio perfecto para tu evento — espot.do',
  description:
    'Salones, rooftops, villas, restaurantes y más en República Dominicana. Busca, reserva y paga de forma segura. Cumpleaños, bodas, graduaciones y eventos corporativos.',
}

const steps = [
  {
    n: '01', icon: Search,
    title: 'Busca y filtra',
    body: 'Filtra por tipo de espacio, sector, capacidad, fecha y presupuesto. Resultados en tiempo real.',
  },
  {
    n: '02', icon: CalendarCheck,
    title: 'Elige y reserva',
    body: 'Revisa fotos, precios, servicios adicionales y reseñas. Reserva al instante o solicita cotización personalizada.',
  },
  {
    n: '03', icon: CreditCard,
    title: 'Confirma con tu primer pago',
    body: 'El primer pago depende de cuántos días faltan para tu evento. Más tiempo = más flexibilidad. Pago seguro con Azul.',
  },
  {
    n: '04', icon: Star,
    title: 'Disfruta y opina',
    body: 'Celebra tu evento. Después deja tu reseña y ayuda a otros a encontrar el espacio ideal.',
  },
]

const eventTypes = [
  { icon: Cake,           label: 'Cumpleaños' },
  { icon: Heart,          label: 'Bodas' },
  { icon: Star,           label: 'Quinceañeras' },
  { icon: GraduationCap,  label: 'Graduaciones' },
  { icon: Briefcase,      label: 'Corporativos' },
  { icon: Users,          label: 'Reuniones' },
  { icon: Camera,         label: 'Fotografía' },
  { icon: Baby,           label: 'Baby showers' },
]

const spaceCategories = [
  { icon: Building2,       label: 'Salones',       value: 'salon' },
  { icon: Sunset,          label: 'Rooftops',      value: 'rooftop' },
  { icon: Home,            label: 'Villas',        value: 'villa' },
  { icon: UtensilsCrossed, label: 'Restaurantes',  value: 'restaurante' },
  { icon: Trees,           label: 'Terrazas',      value: 'terraza' },
  { icon: Wine,            label: 'Bares',         value: 'bar' },
  { icon: Hotel,           label: 'Hoteles',       value: 'hotel' },
  { icon: Camera,          label: 'Estudios',      value: 'estudio' },
  { icon: Briefcase,       label: 'Coworking',     value: 'coworking' },
  { icon: LayoutGrid,      label: 'Ver todos',     value: '' },
]


const paymentModels = [
  {
    icon: Zap,
    label: 'Menos de 7 días',
    model: 'Pago único',
    desc: 'El evento es muy próximo, se requiere el total al confirmar.',
    bars: [{ pct: 100, label: 'Al confirmar', color: '#35C493' }],
  },
  {
    icon: Clock,
    label: '7 a 30 días',
    model: '2 cuotas — 50/50',
    desc: 'La mitad al confirmar, la otra mitad 48 horas antes del evento.',
    bars: [
      { pct: 50, label: 'Al confirmar', color: '#35C493' },
      { pct: 50, label: '48h antes',    color: '#4DD9A7' },
    ],
  },
  {
    icon: CalendarDays,
    label: '31 a 60 días',
    model: '2 cuotas — 30/70',
    desc: 'El 30% asegura la fecha. El 70% se paga 48 horas antes del evento.',
    bars: [
      { pct: 30, label: 'Al confirmar', color: '#35C493' },
      { pct: 70, label: '48h antes',    color: '#4DD9A7' },
    ],
  },
  {
    icon: CalendarRange,
    label: 'Más de 60 días',
    model: '3 cuotas — 25/50/25',
    desc: 'El plan más flexible. Distribuye el pago en tres momentos clave.',
    bars: [
      { pct: 25, label: 'Al confirmar',    color: '#35C493' },
      { pct: 50, label: '60 días antes',   color: '#4DD9A7' },
      { pct: 25, label: '48h antes',       color: '#28A87C' },
    ],
  },
]

const faqs = [
  {
    q: '¿Cuánto tengo que pagar para confirmar?',
    a: 'Depende de cuántos días faltan para tu evento. Si faltan más de 60 días pagas el 25% ahora. Entre 31–60 días, el 30%. Entre 7–30 días, el 50%. Si faltan menos de 7 días, se requiere el 100%. El resto se paga en cuotas programadas.',
  },
  {
    q: '¿Cómo funciona el plan de cuotas?',
    a: 'Al confirmar la reserva el sistema genera automáticamente tu plan de pago según la fecha del evento. Recibirás un recordatorio antes de cada vencimiento. Puedes ver tu plan completo en tu panel de reservas.',
  },
  {
    q: '¿Puedo cancelar mi reserva?',
    a: 'Sí. Cada espacio tiene su propia política de cancelación (flexible, moderada o estricta), visible antes de confirmar. El primer pago procesado vía Azul no es reembolsable, pero el anfitrión puede devolverte pagos posteriores según su política.',
  },
  {
    q: '¿Qué pasa si no pago una cuota a tiempo?',
    a: 'Recibirás recordatorios por correo antes del vencimiento. Si una cuota vence sin pagar, la reserva puede quedar en riesgo según los términos del anfitrión. Te recomendamos contactar al anfitrión si tienes un inconveniente.',
  },
  {
    q: '¿Puedo solicitar una cotización personalizada?',
    a: 'Sí. Algunos espacios operan con cotización. Envías tu solicitud con los detalles del evento, el anfitrión te responde con un precio y plan de pago, y tú decides si aceptas.',
  },
  {
    q: '¿Los espacios están verificados?',
    a: 'Cada espacio pasa por una revisión antes de publicarse. Las fotos, precios y capacidad deben ser reales. Además, las reseñas son solo de clientes que completaron su reserva.',
  },
]

export default function ParaClientesPage() {
  return (
    <div>

      {/* ── HERO ─────────────────────────────────────────────── */}
      <section style={{ background: 'linear-gradient(160deg, #03313C 0%, #071A18 100%)', position: 'relative', overflow: 'hidden' }}>
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse 70% 50% at 50% -5%, rgba(53,196,147,0.18) 0%, transparent 65%)',
          pointerEvents: 'none',
        }} />
        <div className="relative max-w-5xl mx-auto px-5 py-20 md:py-32 text-center">
          <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-6 text-xs font-semibold"
            style={{ background: 'rgba(53,196,147,0.12)', color: '#35C493', border: '1px solid rgba(53,196,147,0.25)' }}>
            Para quienes organizan eventos en República Dominicana
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-5"
            style={{ letterSpacing: '-0.03em', lineHeight: 1.1 }}>
            El espacio perfecto<br />
            <span style={{ color: '#35C493' }}>para tu evento</span>
          </h1>
          <p className="text-lg md:text-xl mb-10 max-w-xl mx-auto"
            style={{ color: 'rgba(255,255,255,0.6)', lineHeight: 1.65 }}>
            Salones, rooftops, villas, restaurantes y más. Busca, reserva y paga seguro. Todo en un solo lugar.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/buscar" className="px-8 py-4 rounded-2xl font-bold text-base"
              style={{ background: '#35C493', color: '#03313C', boxShadow: '0 4px 24px rgba(53,196,147,0.3)' }}>
              Explorar espacios →
            </Link>
            <Link href="/auth?mode=register" className="px-8 py-4 rounded-2xl font-semibold text-sm"
              style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.75)', border: '1px solid rgba(255,255,255,0.12)' }}>
              Crear cuenta gratis
            </Link>
          </div>
          <p className="mt-6 text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
            Sin comisiones para el cliente · Plan de pago flexible · Confirmación inmediata
          </p>
        </div>
      </section>

      {/* ── TIPOS DE EVENTO ───────────────────────────────────── */}
      <section style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-subtle)' }}>
        <div className="max-w-4xl mx-auto px-5 py-14">
          <p className="text-center text-xs font-bold uppercase tracking-widest mb-8" style={{ color: 'var(--text-muted)' }}>
            Para todo tipo de celebración
          </p>
          <div className="grid grid-cols-4 md:grid-cols-8 gap-4">
            {eventTypes.map(({ icon: Icon, label }) => (
              <div key={label} className="flex flex-col items-center gap-2 text-center">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
                  style={{ background: 'var(--bg-elevated)', color: 'var(--brand)' }}>
                  <Icon size={20} />
                </div>
                <span className="text-xs font-medium leading-tight" style={{ color: 'var(--text-secondary)' }}>
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CATEGORÍAS DE ESPACIO ─────────────────────────────── */}
      <section style={{ background: 'var(--bg-base)' }}>
        <div className="max-w-5xl mx-auto px-5 py-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-3"
              style={{ color: 'var(--text-primary)', letterSpacing: '-0.025em' }}>
              Espacios para cada ocasión
            </h2>
            <p className="text-base" style={{ color: 'var(--text-secondary)' }}>
              Desde salones íntimos hasta rooftops con vistas panorámicas
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {spaceCategories.map(({ icon: Icon, label, value }) => (
              <Link key={label}
                href={value ? `/buscar?categoria=${value}` : '/buscar'}
                className="flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all"
                style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}>
                <Icon size={17} style={{ color: 'var(--brand)', flexShrink: 0 }} />
                <span className="text-sm font-semibold">{label}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── CÓMO FUNCIONA ─────────────────────────────────────── */}
      <section style={{ background: 'var(--bg-surface)' }}>
        <div className="max-w-5xl mx-auto px-5 py-20">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold mb-3"
              style={{ color: 'var(--text-primary)', letterSpacing: '-0.025em' }}>
              Reserva en 4 pasos
            </h2>
            <p className="text-base" style={{ color: 'var(--text-secondary)' }}>De la búsqueda al evento en minutos</p>
          </div>
          <div className="grid md:grid-cols-2 gap-5">
            {steps.map(({ n, icon: Icon, title, body }) => (
              <div key={n} className="flex gap-5 p-6 rounded-3xl"
                style={{ background: 'var(--bg-base)', border: '1px solid var(--border-subtle)' }}>
                <div className="shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center"
                  style={{ background: 'var(--brand-dim)', color: 'var(--brand)' }}>
                  <Icon size={22} />
                </div>
                <div>
                  <p className="text-xs font-bold mb-1" style={{ color: 'var(--text-muted)' }}>PASO {n}</p>
                  <h3 className="font-bold text-base mb-1.5" style={{ color: 'var(--text-primary)' }}>{title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── GUÍA DE PAGOS — SECCIÓN TECH ──────────────────────── */}
      <section style={{ background: '#03313C', position: 'relative', overflow: 'hidden' }}>
        {/* Grid decorativo de fondo */}
        <div style={{
          position: 'absolute', inset: 0, opacity: 0.04,
          backgroundImage: 'linear-gradient(rgba(53,196,147,1) 1px, transparent 1px), linear-gradient(90deg, rgba(53,196,147,1) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse 60% 50% at 50% 100%, rgba(53,196,147,0.1) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <div className="relative max-w-5xl mx-auto px-5 py-20">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 mb-5 text-xs font-semibold"
              style={{ background: 'rgba(53,196,147,0.1)', color: '#35C493', border: '1px solid rgba(53,196,147,0.2)' }}>
              Guía de pagos
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4"
              style={{ letterSpacing: '-0.025em' }}>
              Tu plan de pago se ajusta automáticamente
            </h2>
            <p className="text-base max-w-lg mx-auto" style={{ color: 'rgba(255,255,255,0.5)' }}>
              Mientras más anticipación tengas, más flexible es tu plan. El sistema calcula todo solo.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {paymentModels.map(({ icon: Icon, label, model, desc, bars }) => (
              <div key={label} className="rounded-3xl p-6"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>

                {/* Header */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: 'rgba(53,196,147,0.12)', color: '#35C493' }}>
                    <Icon size={17} />
                  </div>
                  <div>
                    <p className="text-xs font-bold" style={{ color: '#35C493' }}>{label}</p>
                    <p className="text-sm font-bold text-white">{model}</p>
                  </div>
                </div>

                {/* Barras de progreso */}
                <div className="space-y-2.5 mb-4">
                  {bars.map(bar => (
                    <div key={bar.label}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>{bar.label}</span>
                        <span className="text-xs font-bold" style={{ color: bar.color }}>{bar.pct}%</span>
                      </div>
                      <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
                        <div className="h-full rounded-full transition-all"
                          style={{ width: `${bar.pct}%`, background: bar.color, opacity: 0.85 }} />
                      </div>
                    </div>
                  ))}
                </div>

                <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.4)' }}>{desc}</p>
              </div>
            ))}
          </div>

          {/* Nota al pie */}
          <div className="mt-8 rounded-2xl px-6 py-4 flex items-start gap-3"
            style={{ background: 'rgba(53,196,147,0.07)', border: '1px solid rgba(53,196,147,0.18)' }}>
            <Check size={15} style={{ color: '#35C493', flexShrink: 0, marginTop: 2 }} />
            <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.55)' }}>
              El primer pago de cada reserva se procesa de forma segura a través de <strong style={{ color: 'rgba(255,255,255,0.75)' }}>Azul</strong>.
              Los pagos siguientes se coordinan directamente con el anfitrión según las fechas de vencimiento de tu plan.
            </p>
          </div>
        </div>
      </section>

      {/* ── FAQ ───────────────────────────────────────────────── */}
      <section style={{ background: 'var(--bg-base)' }}>
        <div className="max-w-2xl mx-auto px-5 py-20">
          <h2 className="text-3xl font-bold mb-10 text-center"
            style={{ color: 'var(--text-primary)', letterSpacing: '-0.025em' }}>
            Preguntas frecuentes
          </h2>

          <style>{`
            .faq-client summary { list-style: none; }
            .faq-client summary::-webkit-details-marker { display: none; }
            .faq-client-icon { transition: transform 0.2s ease; }
            .faq-client[open] .faq-client-icon { transform: rotate(180deg); }
          `}</style>

          <div className="space-y-3">
            {faqs.map(({ q, a }) => (
              <details key={q} className="faq-client rounded-2xl overflow-hidden"
                style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
                <summary className="flex items-center justify-between gap-4 px-6 py-5 cursor-pointer select-none font-semibold text-sm"
                  style={{ color: 'var(--text-primary)' }}>
                  {q}
                  <ChevronDown size={16} className="faq-client-icon" style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                </summary>
                <div className="px-6 pb-5 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  {a}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA FINAL ─────────────────────────────────────────── */}
      <section style={{ background: 'var(--bg-surface)', borderTop: '1px solid var(--border-subtle)' }}>
        <div className="max-w-2xl mx-auto px-5 py-20 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4"
            style={{ color: 'var(--text-primary)', letterSpacing: '-0.025em' }}>
            Tu próximo evento empieza aquí
          </h2>
          <p className="text-base mb-8" style={{ color: 'var(--text-secondary)' }}>
            Encuentra el espacio ideal en República Dominicana y resérvalo hoy.
          </p>
          <Link href="/buscar"
            className="inline-flex items-center gap-2 px-10 py-4 rounded-2xl font-bold text-base"
            style={{ background: '#35C493', color: '#03313C', boxShadow: '0 4px 24px rgba(53,196,147,0.25)' }}>
            Ver todos los espacios →
          </Link>
          <p className="mt-5 text-xs" style={{ color: 'var(--text-muted)' }}>
            ¿Tienes un espacio y quieres publicarlo?{' '}
            <Link href="/para-propietarios" style={{ color: 'var(--brand)' }}>
              Conoce cómo funciona para anfitriones
            </Link>
          </p>
        </div>
      </section>

    </div>
  )
}
