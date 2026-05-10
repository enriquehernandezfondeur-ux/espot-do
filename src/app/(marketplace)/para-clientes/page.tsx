import type { Metadata } from 'next'
import Link from 'next/link'
import {
  Search, CalendarCheck, CreditCard, Star,
  MessageSquare, Check, ChevronDown,
  Cake, Briefcase, GraduationCap, Heart,
  Camera, Users, Baby, PartyPopper,
} from 'lucide-react'

export const metadata: Metadata = {
  title: 'Encuentra el espacio perfecto para tu evento — espot.do',
  description:
    'Salones, rooftops, villas, restaurantes y más en República Dominicana. Busca, reserva y paga de forma segura con Azul. Cumpleaños, bodas, graduaciones y eventos corporativos.',
}

const steps = [
  {
    n: '01',
    icon: Search,
    title: 'Busca y filtra',
    body: 'Filtra por tipo de espacio, sector, capacidad, fecha y presupuesto. Encuentra el lugar exacto para tu evento.',
  },
  {
    n: '02',
    icon: CalendarCheck,
    title: 'Elige y reserva',
    body: 'Revisa fotos, precios, servicios adicionales y reseñas. Reserva al instante o solicita una cotización personalizada.',
  },
  {
    n: '03',
    icon: CreditCard,
    title: 'Confirma con un anticipo',
    body: 'Paga el 10% de confirmación de forma segura vía Azul. El resto lo liquidas directamente en el lugar el día del evento.',
  },
  {
    n: '04',
    icon: Star,
    title: 'Disfruta y opina',
    body: 'Celebra tu evento con todo listo. Después deja tu reseña y ayuda a otros a encontrar el espacio ideal.',
  },
]

const eventTypes = [
  { icon: Cake,        label: 'Cumpleaños' },
  { icon: Heart,       label: 'Bodas' },
  { icon: PartyPopper, label: 'Quinceañeras' },
  { icon: GraduationCap, label: 'Graduaciones' },
  { icon: Briefcase,   label: 'Eventos corporativos' },
  { icon: Users,       label: 'Reuniones' },
  { icon: Camera,      label: 'Sesiones fotográficas' },
  { icon: Baby,        label: 'Baby showers' },
]

const benefits = [
  {
    icon: Search,
    title: 'Búsqueda inteligente',
    body: 'Filtra por tipo de espacio, sector de Santo Domingo, capacidad, fecha y precio. Resultados en tiempo real.',
  },
  {
    icon: CalendarCheck,
    title: 'Disponibilidad en tiempo real',
    body: 'Solo ves espacios disponibles en tu fecha. Sin llamadas ni mensajes para preguntar si está libre.',
  },
  {
    icon: MessageSquare,
    title: 'Chat directo con el anfitrión',
    body: 'Coordina detalles, resuelve dudas y confirma el setup de tu evento sin salir de la plataforma.',
  },
  {
    icon: CreditCard,
    title: 'Pago seguro con Azul',
    body: 'Tu anticipo se procesa con Azul, el procesador bancario #1 de RD. Tus datos de tarjeta nunca se almacenan en espot.do.',
  },
  {
    icon: Star,
    title: 'Reseñas verificadas',
    body: 'Todas las calificaciones son de personas que realmente usaron el espacio. Sin reviews falsos.',
  },
  {
    icon: Check,
    title: 'Servicios adicionales incluibles',
    body: 'Muchos espacios ofrecen DJ, barra, decoración, catering y más. Todo en un solo lugar.',
  },
]

const faqs = [
  {
    q: '¿Cómo reservo un espacio?',
    a: 'Busca en espot.do, elige el espacio que te guste, selecciona tu fecha y horario, y confirma con el pago del anticipo (10% del total). Recibirás una confirmación por correo electrónico de inmediato.',
  },
  {
    q: '¿Cuánto tengo que pagar para confirmar la reserva?',
    a: 'Solo el 10% del valor total, procesado de forma segura vía Azul. El 90% restante lo pagas directamente al anfitrión el día del evento o según lo que acuerden.',
  },
  {
    q: '¿Puedo cancelar mi reserva?',
    a: 'Sí. Cada espacio tiene su propia política de cancelación (flexible, moderada o estricta), visible antes de confirmar. El anticipo del 10% pagado a espot.do no es reembolsable, pero el anfitrión puede devolverte el saldo según su política.',
  },
  {
    q: '¿Qué pasa si el espacio no es como en las fotos?',
    a: 'Puedes contactar al anfitrión directamente desde el chat antes del evento para coordinar y confirmar los detalles. Si encuentras una irregularidad grave, escríbenos a contacto@espot.do.',
  },
  {
    q: '¿Puedo pedir una cotización si no veo precio fijo?',
    a: 'Sí. Algunos espacios operan con cotización personalizada. Envías tu solicitud con los detalles del evento y el anfitrión te responde con un precio y plan de pago.',
  },
  {
    q: '¿Puedo agregar servicios como DJ, barra o decoración?',
    a: 'Muchos espacios ofrecen servicios adicionales (addons) que puedes agregar al reservar. Se muestran en la página del espacio con su precio unitario.',
  },
]

export default function ParaClientesPage() {
  return (
    <div>

      {/* ── HERO ─────────────────────────────────────────────── */}
      <section
        style={{
          background: 'linear-gradient(160deg, #03313C 0%, #071A18 100%)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse 70% 50% at 50% -5%, rgba(53,196,147,0.18) 0%, transparent 65%)',
          pointerEvents: 'none',
        }} />
        <div className="relative max-w-5xl mx-auto px-5 py-20 md:py-32 text-center">
          <div
            className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-6 text-xs font-semibold"
            style={{ background: 'rgba(53,196,147,0.12)', color: '#35C493', border: '1px solid rgba(53,196,147,0.25)' }}
          >
            Para quienes organizan eventos en República Dominicana
          </div>

          <h1
            className="text-4xl md:text-6xl font-bold text-white mb-5"
            style={{ letterSpacing: '-0.03em', lineHeight: 1.1 }}
          >
            El espacio perfecto<br />
            <span style={{ color: '#35C493' }}>para tu evento</span>
          </h1>

          <p
            className="text-lg md:text-xl mb-10 max-w-xl mx-auto"
            style={{ color: 'rgba(255,255,255,0.6)', lineHeight: 1.65 }}
          >
            Salones, rooftops, villas, restaurantes y más. Busca, reserva y paga seguro.
            Todo en un solo lugar.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/buscar"
              className="px-8 py-4 rounded-2xl font-bold text-base"
              style={{ background: '#35C493', color: '#03313C', boxShadow: '0 4px 24px rgba(53,196,147,0.3)' }}
            >
              Explorar espacios →
            </Link>
            <Link
              href="/auth?mode=register"
              className="px-8 py-4 rounded-2xl font-semibold text-sm"
              style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.75)', border: '1px solid rgba(255,255,255,0.12)' }}
            >
              Crear cuenta gratis
            </Link>
          </div>

          <p className="mt-6 text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
            Sin comisiones para el cliente · Pago seguro con Azul · Confirmación inmediata
          </p>
        </div>
      </section>

      {/* ── TIPOS DE EVENTO ───────────────────────────────────── */}
      <section style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-subtle)' }}>
        <div className="max-w-4xl mx-auto px-5 py-14">
          <p className="text-center text-xs font-bold uppercase tracking-widest mb-8"
            style={{ color: 'var(--text-muted)' }}>
            Para todo tipo de celebración
          </p>
          <div className="grid grid-cols-4 md:grid-cols-8 gap-4">
            {eventTypes.map(({ icon: Icon, label }) => (
              <div key={label} className="flex flex-col items-center gap-2 text-center">
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center"
                  style={{ background: 'var(--bg-elevated)', color: 'var(--brand)' }}
                >
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

      {/* ── TIPOS DE ESPACIO ──────────────────────────────────── */}
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
            {[
              { label: 'Salones',      emoji: '🏛️' },
              { label: 'Rooftops',     emoji: '🌆' },
              { label: 'Villas',       emoji: '🏡' },
              { label: 'Restaurantes', emoji: '🍽️' },
              { label: 'Terrazas',     emoji: '🌿' },
              { label: 'Bares',        emoji: '🍸' },
              { label: 'Hoteles',      emoji: '🏨' },
              { label: 'Estudios',     emoji: '📸' },
              { label: 'Coworking',    emoji: '💼' },
              { label: 'Y más...',     emoji: '✨' },
            ].map(({ label, emoji }) => (
              <Link
                key={label}
                href={`/buscar?categoria=${label === 'Y más...' ? '' : label.toLowerCase()}`}
                className="flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all"
                style={{
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-primary)',
                }}
              >
                <span className="text-xl">{emoji}</span>
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
            <p className="text-base" style={{ color: 'var(--text-secondary)' }}>
              De la búsqueda al evento en minutos
            </p>
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

      {/* ── BENEFICIOS ────────────────────────────────────────── */}
      <section style={{ background: 'var(--bg-base)' }}>
        <div className="max-w-5xl mx-auto px-5 py-20">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold mb-3"
              style={{ color: 'var(--text-primary)', letterSpacing: '-0.025em' }}>
              Todo lo que necesitas para reservar con confianza
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-5">
            {benefits.map(({ icon: Icon, title, body }) => (
              <div key={title} className="p-6 rounded-3xl"
                style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                  style={{ background: 'var(--brand-dim)', color: 'var(--brand)' }}>
                  <Icon size={19} />
                </div>
                <h3 className="font-bold text-sm mb-1.5" style={{ color: 'var(--text-primary)' }}>{title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── OPCIONES DE PRECIO ────────────────────────────────── */}
      <section style={{ background: '#03313C' }}>
        <div className="max-w-3xl mx-auto px-5 py-20 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4"
            style={{ letterSpacing: '-0.025em' }}>
            Para cualquier presupuesto
          </h2>
          <p className="text-base mb-12" style={{ color: 'rgba(255,255,255,0.5)' }}>
            Cuatro modalidades de precio según el espacio
          </p>
          <div className="grid sm:grid-cols-2 gap-4 mb-12">
            {[
              { label: 'Por hora',           desc: 'Paga exactamente por el tiempo que necesitas. Ideal para reuniones y sesiones cortas.',       highlight: false },
              { label: 'Paquete fijo',        desc: 'Precio cerrado que incluye horas, servicios y todo lo acordado. Sin sorpresas.',              highlight: true  },
              { label: 'Consumo mínimo',      desc: 'Aplica en bares y restaurantes. Llegas con tu grupo y consumes desde el mínimo acordado.',   highlight: false },
              { label: 'Cotización',          desc: 'Para eventos especiales. Describe tu evento y el anfitrión te envía una propuesta a medida.', highlight: false },
            ].map(({ label, desc, highlight }) => (
              <div key={label} className="rounded-3xl p-6 text-left"
                style={{
                  background: highlight ? 'rgba(53,196,147,0.12)' : 'rgba(255,255,255,0.04)',
                  border: highlight ? '1px solid rgba(53,196,147,0.3)' : '1px solid rgba(255,255,255,0.08)',
                }}>
                <p className="font-bold text-sm mb-2"
                  style={{ color: highlight ? '#35C493' : 'rgba(255,255,255,0.85)' }}>
                  {label}
                  {highlight && <span className="ml-2 text-xs font-semibold px-2 py-0.5 rounded-full"
                    style={{ background: 'rgba(53,196,147,0.2)', color: '#35C493' }}>Popular</span>}
                </p>
                <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.45)' }}>{desc}</p>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2">
            {['Sin comisión para el cliente', 'Anticipo del 10% al reservar', 'Saldo el día del evento'].map(item => (
              <div key={item} className="flex items-center gap-2 text-sm" style={{ color: 'rgba(255,255,255,0.55)' }}>
                <Check size={14} style={{ color: '#35C493' }} /> {item}
              </div>
            ))}
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
                <summary
                  className="flex items-center justify-between gap-4 px-6 py-5 cursor-pointer select-none font-semibold text-sm"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {q}
                  <ChevronDown size={16} className="faq-client-icon"
                    style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
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
          <Link
            href="/buscar"
            className="inline-flex items-center gap-2 px-10 py-4 rounded-2xl font-bold text-base"
            style={{ background: '#35C493', color: '#03313C', boxShadow: '0 4px 24px rgba(53,196,147,0.25)' }}
          >
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
