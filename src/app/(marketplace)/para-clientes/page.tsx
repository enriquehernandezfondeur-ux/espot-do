import type { Metadata } from 'next'
import Link from 'next/link'
import {
  Search, CalendarCheck, CreditCard, Star,
  Check, ChevronDown, Building2, UtensilsCrossed, Sunset,
  Trees, Wine, Hotel, Home, Camera, Briefcase, LayoutGrid,
  Cake, Heart, GraduationCap, Users, Baby,
  Zap, Clock, CalendarDays, CalendarRange, ArrowRight,
} from 'lucide-react'

export const metadata: Metadata = {
  title: 'Encuentra el espacio perfecto para tu evento — espot.do',
  description:
    'Salones, rooftops, villas, restaurantes y más en República Dominicana. Busca, reserva y paga de forma segura. Cumpleaños, bodas, graduaciones y eventos corporativos.',
}

const eventTypes = [
  { icon: Cake,          label: 'Cumpleaños' },
  { icon: Heart,         label: 'Bodas' },
  { icon: Star,          label: 'Quinceañeras' },
  { icon: GraduationCap, label: 'Graduaciones' },
  { icon: Briefcase,     label: 'Corporativos' },
  { icon: Users,         label: 'Reuniones' },
  { icon: Camera,        label: 'Fotografía' },
  { icon: Baby,          label: 'Baby showers' },
]

const spaceCategories = [
  { icon: Building2,       label: 'Salones',      value: 'salon' },
  { icon: Sunset,          label: 'Rooftops',     value: 'rooftop' },
  { icon: Home,            label: 'Villas',       value: 'villa' },
  { icon: UtensilsCrossed, label: 'Restaurantes', value: 'restaurante' },
  { icon: Trees,           label: 'Terrazas',     value: 'terraza' },
  { icon: Wine,            label: 'Bares',        value: 'bar' },
  { icon: Hotel,           label: 'Hoteles',      value: 'hotel' },
  { icon: Camera,          label: 'Estudios',     value: 'estudio' },
  { icon: Briefcase,       label: 'Coworking',    value: 'coworking' },
  { icon: LayoutGrid,      label: 'Ver todos',    value: '' },
]

const paymentModels = [
  {
    icon: Zap,
    label: 'Menos de 7 días',
    model: 'Pago único',
    desc: 'El evento es próximo, se requiere el total al confirmar.',
    bars: [{ pct: 100, label: 'Al confirmar', color: '#35C493' }],
  },
  {
    icon: Clock,
    label: '7 a 30 días',
    model: '2 cuotas — 50/50',
    desc: 'La mitad al confirmar, la otra mitad 48 horas antes.',
    bars: [
      { pct: 50, label: 'Al confirmar', color: '#35C493' },
      { pct: 50, label: '48h antes',    color: '#4DD9A7' },
    ],
  },
  {
    icon: CalendarDays,
    label: '31 a 60 días',
    model: '2 cuotas — 30/70',
    desc: 'El 30% asegura la fecha. El 70% se paga 48h antes.',
    bars: [
      { pct: 30, label: 'Al confirmar', color: '#35C493' },
      { pct: 70, label: '48h antes',    color: '#4DD9A7' },
    ],
  },
  {
    icon: CalendarRange,
    label: 'Más de 60 días',
    model: '3 cuotas — 25/50/25',
    desc: 'El plan más flexible. Tres momentos clave de pago.',
    bars: [
      { pct: 25, label: 'Al confirmar',  color: '#35C493' },
      { pct: 50, label: '60 días antes', color: '#4DD9A7' },
      { pct: 25, label: '48h antes',     color: '#28A87C' },
    ],
  },
]

const faqs = [
  {
    q: '¿Cuánto tengo que pagar para confirmar?',
    a: 'Depende de cuántos días faltan. Más de 60 días: 25% ahora. Entre 31–60 días: 30% ahora. Entre 7–30 días: 50% ahora. Menos de 7 días: 100% completo. Las cuotas siguientes las genera la plataforma automáticamente y se pagan también a través de espot.do.',
  },
  {
    q: '¿Cómo funciona el plan de cuotas?',
    a: 'Al confirmar la reserva el sistema genera tu plan automáticamente. Recibirás recordatorios antes de cada vencimiento y puedes ver tu plan completo en tu panel de reservas.',
  },
  {
    q: '¿Puedo cancelar mi reserva?',
    a: 'Sí. Cada espacio tiene su política de cancelación (flexible, moderada o estricta), visible antes de confirmar. Los pagos ya procesados por Azul no son reembolsables por espot.do; para cuotas futuras aplica la política del anfitrión.',
  },
  {
    q: '¿Qué pasa si no pago una cuota a tiempo?',
    a: 'Recibirás recordatorios por correo antes del vencimiento. Si una cuota vence sin pagar, la reserva puede quedar en riesgo. Te recomendamos contactar al anfitrión ante cualquier inconveniente.',
  },
  {
    q: '¿Puedo solicitar una cotización personalizada?',
    a: 'Sí. Algunos espacios operan con cotización. Envías tu solicitud con los detalles, el anfitrión responde con precio y plan de pago, y tú decides si aceptas.',
  },
  {
    q: '¿Los espacios están verificados?',
    a: 'Cada espacio pasa revisión antes de publicarse. Las fotos, precios y capacidad deben ser reales. Las reseñas son solo de clientes que completaron su reserva.',
  },
]

export default function ParaClientesPage() {
  return (
    <div>

      {/* ── HERO LIGHT ───────────────────────────────────────── */}
      <section style={{ background: 'var(--bg-base)', borderBottom: '1px solid var(--border-subtle)' }}>
        <div className="max-w-6xl mx-auto px-5 py-16 md:py-24">
          <div className="grid md:grid-cols-[1fr_1fr] gap-10 md:gap-16 items-center">

            {/* Texto */}
            <div>
              <div className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 mb-6 text-xs font-bold"
                style={{ background: 'var(--brand-dim)', color: 'var(--brand)', border: '1px solid var(--brand-border)' }}>
                Guía para clientes
              </div>
              <h1 className="font-bold mb-5"
                style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', letterSpacing: '-0.04em', lineHeight: 1.05, color: 'var(--text-primary)' }}>
                Encuentra el espacio
                ideal para tu evento
              </h1>
              <p className="text-base md:text-lg mb-8 leading-relaxed" style={{ color: 'var(--text-secondary)', maxWidth: 440 }}>
                Salones, rooftops, villas, restaurantes y más en RD. Reserva en minutos, paga seguro con Azul.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link href="/buscar"
                  className="inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl font-bold text-sm"
                  style={{ background: 'var(--brand)', color: '#03313C', boxShadow: '0 4px 20px rgba(53,196,147,0.25)' }}>
                  Explorar espacios <ArrowRight size={15} />
                </Link>
                <Link href="/auth?mode=register"
                  className="inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl font-semibold text-sm"
                  style={{ background: 'var(--bg-surface)', color: 'var(--text-primary)', border: '1px solid var(--border-medium)' }}>
                  Crear cuenta gratis
                </Link>
              </div>
              <p className="mt-6 text-xs" style={{ color: 'var(--text-muted)' }}>
                Sin comisiones para el cliente · Plan de pago flexible · Confirmación inmediata
              </p>
            </div>

            {/* Tipos de evento — grid visual */}
            <div className="grid grid-cols-2 min-[400px]:grid-cols-4 gap-3">
              {eventTypes.map(({ icon: Icon, label }, i) => (
                <div key={label} className="flex flex-col items-center gap-2 p-3 rounded-2xl text-center"
                  style={{
                    background: i % 3 === 0 ? 'var(--brand-dim)' : 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                  }}>
                  <Icon size={20} style={{ color: i % 3 === 0 ? 'var(--brand)' : 'var(--text-secondary)' }} />
                  <span className="text-xs font-medium leading-tight" style={{ color: 'var(--text-secondary)' }}>{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── CATEGORÍAS — SCROLL HORIZONTAL ───────────────────── */}
      <section style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-subtle)' }}>
        <div className="max-w-6xl mx-auto px-5 py-8">
          <p className="text-xs font-bold uppercase tracking-widest mb-5" style={{ color: 'var(--text-muted)' }}>
            Explorar por tipo de espacio
          </p>
          <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-hide">
            {spaceCategories.map(({ icon: Icon, label, value }) => (
              <Link key={label} href={value ? `/buscar?categoria=${value}` : '/buscar'}
                className="flex items-center gap-2 px-4 py-2.5 rounded-full whitespace-nowrap flex-shrink-0 font-semibold text-sm transition-all"
                style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-medium)', color: 'var(--text-primary)' }}>
                <Icon size={15} style={{ color: 'var(--brand)' }} />
                {label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── CÓMO FUNCIONA — TIMELINE HORIZONTAL ──────────────── */}
      <section style={{ background: 'var(--bg-base)', overflow: 'hidden' }}>
        <div className="max-w-6xl mx-auto px-5 py-12 md:py-20">

          <div className="mb-14">
            <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--brand)' }}>Cómo funciona</p>
            <h2 className="font-bold" style={{ fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', letterSpacing: '-0.04em', color: 'var(--text-primary)', lineHeight: 1.1 }}>
              De la búsqueda<br />al evento en 4 pasos
            </h2>
          </div>

          {/* Timeline */}
          <div className="relative">
            {/* Línea conectora desktop */}
            <div className="hidden md:block absolute top-8 left-8 right-8 h-px" style={{ background: 'var(--border-medium)' }} />

            <div className="grid md:grid-cols-4 gap-6 md:gap-8">
              {[
                { n: '01', icon: Search,       title: 'Busca y filtra',             body: 'Por tipo, sector, capacidad, fecha y precio. Resultados en tiempo real.' },
                { n: '02', icon: CalendarCheck, title: 'Elige tu espacio',           body: 'Revisa fotos, precios, addons y reseñas. Reserva o solicita cotización.' },
                { n: '03', icon: CreditCard,    title: 'Confirma con tu primer pago', body: 'Según los días al evento. Pago seguro con Azul.' },
                { n: '04', icon: Star,          title: 'Disfruta y opina',            body: 'Celebra tu evento y deja tu reseña.' },
              ].map(({ n, icon: Icon, title, body }) => (
                <div key={n} className="relative flex flex-col gap-4">
                  {/* Número con fondo */}
                  <div className="relative z-10 w-16 h-16 rounded-2xl flex items-center justify-center"
                    style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-medium)', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                    <Icon size={22} style={{ color: 'var(--brand)' }} />
                  </div>
                  <div>
                    <span className="text-xs font-bold" style={{ color: 'var(--text-muted)' }}>PASO {n}</span>
                    <h3 className="font-bold text-base mt-1 mb-1.5" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>{title}</h3>
                    <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── GUÍA DE PAGOS — SECCIÓN TECH ──────────────────────── */}
      <section style={{ background: '#03313C', position: 'relative', overflow: 'hidden' }}>
        <div style={{
          position: 'absolute', inset: 0, opacity: 0.04,
          backgroundImage: 'linear-gradient(rgba(53,196,147,1) 1px, transparent 1px), linear-gradient(90deg, rgba(53,196,147,1) 1px, transparent 1px)',
          backgroundSize: '48px 48px', pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse 60% 50% at 50% 100%, rgba(53,196,147,0.1) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <div className="relative max-w-5xl mx-auto px-5 py-12 md:py-20">
          <div className="mb-14">
            <div className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 mb-5 text-xs font-semibold"
              style={{ background: 'rgba(53,196,147,0.1)', color: '#35C493', border: '1px solid rgba(53,196,147,0.2)' }}>
              Guía de pagos
            </div>
            <h2 className="font-bold text-white mb-3"
              style={{ fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', letterSpacing: '-0.04em', lineHeight: 1.1 }}>
              Tu plan de pago<br />se ajusta automáticamente
            </h2>
            <p className="text-base" style={{ color: 'rgba(255,255,255,0.45)', maxWidth: 460 }}>
              Mientras más anticipación tengas, más flexible es tu plan. El sistema calcula todo solo.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {paymentModels.map(({ icon: Icon, label, model, desc, bars }) => (
              <div key={label} className="rounded-3xl p-6"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
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
                <div className="space-y-2.5 mb-4">
                  {bars.map(bar => (
                    <div key={bar.label}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>{bar.label}</span>
                        <span className="text-xs font-bold" style={{ color: bar.color }}>{bar.pct}%</span>
                      </div>
                      <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
                        <div className="h-full rounded-full" style={{ width: `${bar.pct}%`, background: bar.color, opacity: 0.85 }} />
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.4)' }}>{desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 rounded-2xl px-6 py-4 flex items-start gap-3"
            style={{ background: 'rgba(53,196,147,0.07)', border: '1px solid rgba(53,196,147,0.18)' }}>
            <Check size={15} style={{ color: '#35C493', flexShrink: 0, marginTop: 2 }} />
            <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.55)' }}>
              Todos los pagos del plan se procesan a través de <strong style={{ color: 'rgba(255,255,255,0.75)' }}>espot.do</strong> vía <strong style={{ color: 'rgba(255,255,255,0.75)' }}>Azul</strong>. Recibirás un recordatorio por correo antes de cada vencimiento.
            </p>
          </div>
        </div>
      </section>

      {/* ── FAQ — DOS COLUMNAS ────────────────────────────────── */}
      <section style={{ background: 'var(--bg-surface)' }}>
        <div className="max-w-5xl mx-auto px-5 py-12 md:py-20">
          <div className="grid md:grid-cols-[1fr_2fr] gap-12 items-start">

            {/* Columna izquierda */}
            <div className="md:sticky md:top-24">
              <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--brand)' }}>FAQ</p>
              <h2 className="font-bold mb-4" style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)', letterSpacing: '-0.03em', color: 'var(--text-primary)', lineHeight: 1.2 }}>
                Preguntas frecuentes
              </h2>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                ¿Tienes más dudas? Escríbenos a{' '}
                <a href="mailto:contacto@espot.do" style={{ color: 'var(--brand)' }}>contacto@espot.do</a>
              </p>
            </div>

            {/* Acordeón */}
            <div>
              <style>{`
                .faq-client summary { list-style: none; }
                .faq-client summary::-webkit-details-marker { display: none; }
                .faq-client-icon { transition: transform 0.2s ease; }
                .faq-client[open] .faq-client-icon { transform: rotate(180deg); }
              `}</style>
              <div className="space-y-2">
                {faqs.map(({ q, a }) => (
                  <details key={q} className="faq-client rounded-2xl overflow-hidden"
                    style={{ background: 'var(--bg-base)', border: '1px solid var(--border-subtle)' }}>
                    <summary className="flex items-center justify-between gap-4 px-5 py-4 cursor-pointer select-none font-semibold text-sm"
                      style={{ color: 'var(--text-primary)' }}>
                      {q}
                      <ChevronDown size={15} className="faq-client-icon" style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                    </summary>
                    <div className="px-5 pb-4 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{a}</div>
                  </details>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA FINAL ─────────────────────────────────────────── */}
      <section style={{ background: 'var(--bg-base)', borderTop: '1px solid var(--border-subtle)' }}>
        <div className="max-w-6xl mx-auto px-5 py-10 md:py-16">
          <div className="rounded-3xl overflow-hidden relative"
            style={{ background: 'linear-gradient(135deg, #03313C 0%, #0D2318 60%, #1A4D38 100%)' }}>
            <div style={{
              position: 'absolute', top: 0, right: 0, width: 400, height: 400,
              background: 'radial-gradient(circle, rgba(53,196,147,0.12) 0%, transparent 70%)',
              transform: 'translate(30%, -30%)', pointerEvents: 'none',
            }} />
            <div className="relative grid md:grid-cols-[1fr_auto] items-center gap-6 px-8 py-10 md:px-14 md:py-14">
              <div>
                <h2 className="font-bold text-white mb-3"
                  style={{ fontSize: 'clamp(1.4rem, 3.5vw, 2.2rem)', letterSpacing: '-0.04em', lineHeight: 1.15 }}>
                  Tu próximo evento empieza aquí
                </h2>
                <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.95rem' }}>
                  Encuentra el espacio ideal en República Dominicana y resérvalo hoy.
                </p>
              </div>
              <div className="flex flex-col gap-3 shrink-0">
                <Link href="/buscar"
                  className="inline-flex items-center justify-center gap-2 font-bold px-8 py-4 rounded-2xl text-sm whitespace-nowrap"
                  style={{ background: '#35C493', color: '#060D09', boxShadow: '0 4px 24px rgba(53,196,147,0.3)' }}>
                  Ver todos los espacios <ArrowRight size={15} />
                </Link>
                <p className="text-xs text-center" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  ¿Quieres publicar?{' '}
                  <Link href="/para-propietarios" style={{ color: '#35C493' }}>Ver guía para anfitriones</Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

    </div>
  )
}
