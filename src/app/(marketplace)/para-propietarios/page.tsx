import type { Metadata } from 'next'
import Link from 'next/link'
import {
  Building2, CalendarCheck, MessageSquare, BarChart3,
  Check, Star, ChevronDown, Banknote, Clock, Shield,
} from 'lucide-react'

export const metadata: Metadata = {
  title: 'Publica tu espacio y genera ingresos — espot.do',
  description:
    'Convierte tu salón, rooftop, villa o restaurant en una fuente de ingresos. Herramientas de gestión completas, pagos seguros con Azul y soporte dedicado en República Dominicana.',
}

const REGISTER_URL = '/auth?mode=register&redirect=/dashboard/host'

const steps = [
  {
    n: '01',
    icon: Building2,
    title: 'Crea tu perfil y publica',
    body: 'Registra tu espacio en minutos: fotos, descripción, capacidad, precios y servicios adicionales. Sin tecnicismos.',
  },
  {
    n: '02',
    icon: CalendarCheck,
    title: 'Configura tu disponibilidad',
    body: 'Define tus horarios, bloquea fechas cuando quieras y sincroniza con Google Calendar o iCal.',
  },
  {
    n: '03',
    icon: MessageSquare,
    title: 'Gestiona reservas y mensajes',
    body: 'Acepta o rechaza solicitudes, chatea directo con los clientes y lleva un control de cada evento desde tu dashboard.',
  },
  {
    n: '04',
    icon: Banknote,
    title: 'Cobra de forma segura',
    body: 'El pago de confirmación llega vía Azul. El saldo lo cobras directamente en el lugar el día del evento.',
  },
]

const features = [
  {
    icon: CalendarCheck,
    title: 'Calendario inteligente',
    body: 'Vista mensual con bloques de tiempo, Google Calendar y iCal incluidos.',
  },
  {
    icon: MessageSquare,
    title: 'Chat con clientes',
    body: 'Mensajería integrada en tiempo real. Sin WhatsApp ni llamadas frías.',
  },
  {
    icon: BarChart3,
    title: 'Finanzas y analytics',
    body: 'Ingresos, comisiones, eventos por mes y exportación a CSV.',
  },
  {
    icon: Shield,
    title: 'Pagos protegidos',
    body: 'Todos los pagos pasan por Azul — el procesador bancario #1 de RD.',
  },
  {
    icon: Clock,
    title: 'Control total de agenda',
    body: 'Tú decides cuándo estás disponible y cuándo no, desde cualquier dispositivo.',
  },
  {
    icon: Star,
    title: 'Reseñas verificadas',
    body: 'Los clientes dejan su opinión tras el evento. Tu reputación crece con cada experiencia.',
  },
]

const faqs = [
  {
    q: '¿Cuánto cuesta publicar mi espacio?',
    a: 'Publicar es completamente gratis. Cobramos una comisión del 10% sobre el valor total de la reserva, descontada del primer pago. Sin costos fijos, sin mensualidades.',
  },
  {
    q: '¿Cómo recibo mis pagos?',
    a: 'El cliente paga en cuotas según los días que faltan para el evento. El primer pago va vía Azul — de ahí se descuenta la comisión de espot.do (10%) y el resto se transfiere a tu cuenta. Los pagos siguientes los recibes directamente del cliente.',
  },
  {
    q: '¿Puedo rechazar una reserva?',
    a: 'Sí. Todas las solicitudes requieren tu aprobación primero. También puedes activar "Reserva instantánea" si prefieres que se confirme automáticamente cuando el cliente pague.',
  },
  {
    q: '¿Qué pasa si el cliente cancela?',
    a: 'Puedes definir tu propia política de cancelación — flexible, moderada o estricta — en la configuración de tu espacio. Tú decides las condiciones.',
  },
  {
    q: '¿Tengo que firmar algún contrato?',
    a: 'No. Sin contratos de permanencia, sin compromisos de exclusividad. Puedes pausar o despublicar tu espacio en cualquier momento.',
  },
  {
    q: '¿Cuánto tiempo tarda en activarse mi listado?',
    a: 'Una vez que completes tu perfil con fotos y la información del espacio, tu listado se activa en menos de 24 horas tras la revisión de nuestro equipo.',
  },
]

export default function ParaPropietariosPage() {
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
        <div
          style={{
            position: 'absolute', inset: 0,
            background: 'radial-gradient(ellipse 70% 50% at 50% -5%, rgba(53,196,147,0.18) 0%, transparent 65%)',
            pointerEvents: 'none',
          }}
        />
        <div className="relative max-w-5xl mx-auto px-5 py-20 md:py-32 text-center">
          <div
            className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-6 text-xs font-semibold"
            style={{
              background: 'rgba(53,196,147,0.12)',
              color: '#35C493',
              border: '1px solid rgba(53,196,147,0.25)',
            }}
          >
            Para propietarios de espacios en República Dominicana
          </div>

          <h1
            className="text-4xl md:text-6xl font-bold text-white mb-5"
            style={{ letterSpacing: '-0.03em', lineHeight: 1.1 }}
          >
            Tu espacio,<br />
            <span style={{ color: '#35C493' }}>una fuente de ingresos</span>
          </h1>

          <p
            className="text-lg md:text-xl mb-10 max-w-xl mx-auto"
            style={{ color: 'rgba(255,255,255,0.6)', lineHeight: 1.65 }}
          >
            Publica tu salón, rooftop, villa o restaurant y conecta con
            clientes que buscan el lugar perfecto para su evento.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href={REGISTER_URL}
              className="px-8 py-4 rounded-2xl font-bold text-base"
              style={{
                background: '#35C493',
                color: '#03313C',
                boxShadow: '0 4px 24px rgba(53,196,147,0.3)',
              }}
            >
              Publicar mi espacio →
            </Link>
            <Link
              href="/buscar"
              className="px-8 py-4 rounded-2xl font-semibold text-sm"
              style={{
                background: 'rgba(255,255,255,0.06)',
                color: 'rgba(255,255,255,0.75)',
                border: '1px solid rgba(255,255,255,0.12)',
              }}
            >
              Ver el marketplace
            </Link>
          </div>

          <p className="mt-6 text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
            Sin suscripciones · Sin costos fijos · Solo 10% de comisión al confirmar
          </p>
        </div>
      </section>

      {/* ── STATS ─────────────────────────────────────────────── */}
      <section style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-subtle)' }}>
        <div className="max-w-4xl mx-auto px-5 py-14">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { n: '10%',   label: 'Comisión por reserva confirmada' },
              { n: 'RD$0',  label: 'Costo de publicación' },
              { n: '< 24h', label: 'Para activar tu listado' },
              { n: '4.9★',  label: 'Calificación promedio de anfitriones' },
            ].map(({ n, label }) => (
              <div key={label} className="text-center">
                <p
                  className="text-3xl md:text-4xl font-bold mb-1"
                  style={{ color: 'var(--text-primary)', letterSpacing: '-0.03em' }}
                >
                  {n}
                </p>
                <p className="text-xs leading-snug" style={{ color: 'var(--text-secondary)' }}>{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CÓMO FUNCIONA ─────────────────────────────────────── */}
      <section style={{ background: 'var(--bg-base)' }}>
        <div className="max-w-5xl mx-auto px-5 py-20">
          <div className="text-center mb-14">
            <h2
              className="text-3xl md:text-4xl font-bold mb-3"
              style={{ color: 'var(--text-primary)', letterSpacing: '-0.025em' }}
            >
              Así de simple
            </h2>
            <p className="text-base" style={{ color: 'var(--text-secondary)' }}>
              De cero a recibir pagos en menos de 24 horas
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-5">
            {steps.map(({ n, icon: Icon, title, body }) => (
              <div
                key={n}
                className="flex gap-5 p-6 rounded-3xl"
                style={{ background: 'var(--bg-surface)', boxShadow: 'var(--shadow-card)' }}
              >
                <div
                  className="shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center"
                  style={{ background: 'var(--brand-dim)', color: 'var(--brand)' }}
                >
                  <Icon size={22} />
                </div>
                <div>
                  <p className="text-xs font-bold mb-1" style={{ color: 'var(--text-muted)' }}>
                    PASO {n}
                  </p>
                  <h3 className="font-bold text-base mb-1.5" style={{ color: 'var(--text-primary)' }}>
                    {title}
                  </h3>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                    {body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HERRAMIENTAS ──────────────────────────────────────── */}
      <section style={{ background: 'var(--bg-surface)' }}>
        <div className="max-w-5xl mx-auto px-5 py-20">
          <div className="text-center mb-14">
            <h2
              className="text-3xl md:text-4xl font-bold mb-3"
              style={{ color: 'var(--text-primary)', letterSpacing: '-0.025em' }}
            >
              Todo lo que necesitas, incluido
            </h2>
            <p className="text-base" style={{ color: 'var(--text-secondary)' }}>
              Un dashboard pensado para propietarios dominicanos
            </p>
          </div>

          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-5">
            {features.map(({ icon: Icon, title, body }) => (
              <div
                key={title}
                className="p-6 rounded-3xl"
                style={{ background: 'var(--bg-base)', border: '1px solid var(--border-subtle)' }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                  style={{ background: 'var(--brand-dim)', color: 'var(--brand)' }}
                >
                  <Icon size={19} />
                </div>
                <h3 className="font-bold text-sm mb-1.5" style={{ color: 'var(--text-primary)' }}>
                  {title}
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  {body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── COMISIÓN ──────────────────────────────────────────── */}
      <section style={{ background: '#03313C' }}>
        <div className="max-w-3xl mx-auto px-5 py-20 text-center">
          <h2
            className="text-3xl md:text-4xl font-bold text-white mb-4"
            style={{ letterSpacing: '-0.025em' }}
          >
            Sin sorpresas.<br />Solo una comisión justa.
          </h2>
          <p className="text-base mb-12" style={{ color: 'rgba(255,255,255,0.5)' }}>
            Así se distribuye el valor total de cada reserva
          </p>

          <div className="grid md:grid-cols-3 gap-4 mb-12">
            {[
              {
                pct: '90%',
                label: 'Para ti',
                sub: 'Tu ganancia neta en cada reserva confirmada',
                highlight: true,
              },
              {
                pct: '10%',
                label: 'espot.do',
                sub: 'Plataforma, soporte y procesamiento de pago',
                highlight: false,
              },
              {
                pct: 'RD$0',
                label: 'Costo fijo',
                sub: 'Sin mensualidades ni cargos de activación',
                highlight: false,
              },
            ].map(({ pct, label, sub, highlight }) => (
              <div
                key={label}
                className="rounded-3xl p-6 text-center"
                style={{
                  background: highlight ? 'rgba(53,196,147,0.12)' : 'rgba(255,255,255,0.04)',
                  border: highlight
                    ? '1px solid rgba(53,196,147,0.3)'
                    : '1px solid rgba(255,255,255,0.08)',
                }}
              >
                <p
                  className="text-4xl font-bold mb-1"
                  style={{
                    color: highlight ? '#35C493' : 'white',
                    letterSpacing: '-0.03em',
                  }}
                >
                  {pct}
                </p>
                <p
                  className="font-semibold text-sm mb-2"
                  style={{ color: highlight ? '#35C493' : 'rgba(255,255,255,0.7)' }}
                >
                  {label}
                </p>
                <p
                  className="text-xs leading-relaxed"
                  style={{ color: 'rgba(255,255,255,0.4)' }}
                >
                  {sub}
                </p>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2">
            {[
              'Sin suscripción mensual',
              'Sin costo por publicar',
              'Sin contrato de permanencia',
            ].map(item => (
              <div
                key={item}
                className="flex items-center gap-2 text-sm"
                style={{ color: 'rgba(255,255,255,0.55)' }}
              >
                <Check size={14} style={{ color: '#35C493' }} />
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ───────────────────────────────────────────────── */}
      <section style={{ background: 'var(--bg-base)' }}>
        <div className="max-w-2xl mx-auto px-5 py-20">
          <h2
            className="text-3xl font-bold mb-10 text-center"
            style={{ color: 'var(--text-primary)', letterSpacing: '-0.025em' }}
          >
            Preguntas frecuentes
          </h2>

          <style>{`
            .faq-item summary { list-style: none; }
            .faq-item summary::-webkit-details-marker { display: none; }
            .faq-icon { transition: transform 0.2s ease; }
            .faq-item[open] .faq-icon { transform: rotate(180deg); }
          `}</style>

          <div className="space-y-3">
            {faqs.map(({ q, a }) => (
              <details
                key={q}
                className="faq-item rounded-2xl overflow-hidden"
                style={{
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <summary
                  className="flex items-center justify-between gap-4 px-6 py-5 cursor-pointer select-none font-semibold text-sm"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {q}
                  <ChevronDown
                    size={16}
                    className="faq-icon"
                    style={{ color: 'var(--text-muted)', flexShrink: 0 }}
                  />
                </summary>
                <div
                  className="px-6 pb-5 text-sm leading-relaxed"
                  style={{ color: 'var(--text-secondary)' }}
                >
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
          <h2
            className="text-3xl md:text-4xl font-bold mb-4"
            style={{ color: 'var(--text-primary)', letterSpacing: '-0.025em' }}
          >
            Empieza a generar ingresos hoy
          </h2>
          <p className="text-base mb-8" style={{ color: 'var(--text-secondary)' }}>
            Únete a los propietarios que ya están maximizando sus espacios en República Dominicana.
          </p>
          <Link
            href={REGISTER_URL}
            className="inline-flex items-center gap-2 px-10 py-4 rounded-2xl font-bold text-base"
            style={{
              background: '#35C493',
              color: '#03313C',
              boxShadow: '0 4px 24px rgba(53,196,147,0.25)',
            }}
          >
            Crear cuenta gratis →
          </Link>
          <p className="mt-5 text-xs" style={{ color: 'var(--text-muted)' }}>
            ¿Ya tienes una cuenta?{' '}
            <Link href="/auth" style={{ color: 'var(--brand)' }}>
              Inicia sesión
            </Link>
          </p>
        </div>
      </section>

    </div>
  )
}
