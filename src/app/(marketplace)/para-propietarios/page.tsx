import type { Metadata } from 'next'
import Link from 'next/link'
import {
  CalendarCheck, MessageSquare, BarChart3,
  Check, ChevronDown, Clock, Shield, Star, ArrowRight,
} from 'lucide-react'

export const metadata: Metadata = {
  title: 'Publica tu espacio y genera ingresos — espot.do',
  description:
    'Convierte tu salón, rooftop, villa o restaurant en una fuente de ingresos. Herramientas de gestión completas, pagos seguros con Azul y soporte dedicado en República Dominicana.',
}

const REGISTER_URL = '/auth?mode=register&redirect=/dashboard/host'

const steps = [
  { n: '01', title: 'Crea tu perfil y publica',         body: 'Fotos, descripción, capacidad, precios y servicios en minutos. Sin tecnicismos.' },
  { n: '02', title: 'Configura disponibilidad',          body: 'Define horarios, bloquea fechas y sincroniza con Google Calendar o iCal.' },
  { n: '03', title: 'Gestiona reservas y mensajes',      body: 'Acepta o rechaza solicitudes, chatea con clientes y controla cada evento desde tu dashboard.' },
  { n: '04', title: 'Recibe tus pagos',                  body: 'Todos los pagos del cliente pasan por la plataforma vía Azul. Recibes tu neto en tu cuenta bancaria registrada.' },
]

const features = [
  { icon: CalendarCheck, title: 'Calendario inteligente',   body: 'Vista mensual, bloques de tiempo, Google Calendar e iCal incluidos.' },
  { icon: MessageSquare, title: 'Chat con clientes',        body: 'Mensajería en tiempo real. Sin WhatsApp ni llamadas frías.' },
  { icon: BarChart3,     title: 'Finanzas y analytics',    body: 'Ingresos, comisiones, eventos por mes y exportación a CSV.' },
  { icon: Shield,        title: 'Pagos protegidos',        body: 'Todos los cobros pasan por Azul. Tus datos y los del cliente, protegidos.' },
  { icon: Clock,         title: 'Control total de agenda', body: 'Tú decides cuándo estás disponible, desde cualquier dispositivo.' },
  { icon: Star,          title: 'Reseñas verificadas',     body: 'Los clientes valoran su experiencia. Tu reputación crece sola.' },
]

const faqs = [
  {
    q: '¿Cuánto cuesta publicar mi espacio?',
    a: 'Publicar es completamente gratis. Cobramos el 10% del valor total de cada reserva confirmada, descontado proporcionalmente de cada pago procesado. Sin costos fijos ni mensualidades.',
  },
  {
    q: '¿Cómo recibo mis pagos?',
    a: 'Todos los pagos del cliente pasan por espot.do vía Azul, incluidas todas las cuotas. De cada pago espot.do descuenta el 10% proporcional de ese pago como comisión, y transfiere el 90% restante a tu cuenta bancaria registrada.',
  },
  {
    q: '¿Puedo rechazar una reserva?',
    a: 'Sí. Todas las solicitudes requieren tu aprobación primero. También puedes activar "Reserva instantánea" para que se confirme automáticamente cuando el cliente pague.',
  },
  {
    q: '¿Qué pasa si el cliente cancela?',
    a: 'Puedes definir tu propia política de cancelación — flexible, moderada o estricta — en la configuración de tu espacio. Tú decides las condiciones.',
  },
  {
    q: '¿Tengo que firmar algún contrato?',
    a: 'No. Sin contratos de permanencia ni exclusividad. Puedes pausar o despublicar tu espacio en cualquier momento.',
  },
  {
    q: '¿Cuánto tarda en activarse mi listado?',
    a: 'Una vez que completes tu perfil con fotos e información, tu listado se activa en menos de 24 horas tras la revisión de nuestro equipo.',
  },
]

export default function ParaPropietariosPage() {
  return (
    <div>

      {/* ── HERO SPLIT ───────────────────────────────────────── */}
      <section style={{ background: '#03313C', position: 'relative', overflow: 'hidden' }}>
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse 80% 60% at 100% 50%, rgba(53,196,147,0.1) 0%, transparent 60%)',
          pointerEvents: 'none',
        }} />

        <div className="relative max-w-6xl mx-auto px-5 py-16 md:py-24">
          <div className="grid md:grid-cols-[1.1fr_0.9fr] gap-12 items-center">

            {/* Texto izquierda */}
            <div>
              <div className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 mb-6 text-xs font-bold"
                style={{ background: 'rgba(53,196,147,0.12)', color: '#35C493', border: '1px solid rgba(53,196,147,0.25)' }}>
                Para propietarios de espacios en RD
              </div>
              <h1 className="font-bold text-white mb-5"
                style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', letterSpacing: '-0.04em', lineHeight: 1.05 }}>
                Tu espacio,<br />
                <span style={{ color: '#35C493' }}>una fuente de ingresos</span>
              </h1>
              <p className="text-base mb-8 leading-relaxed" style={{ color: 'rgba(255,255,255,0.55)', maxWidth: 420 }}>
                Publica tu salón, rooftop, villa o restaurant y conecta con clientes que buscan el lugar perfecto para su evento.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link href={REGISTER_URL}
                  className="inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl font-bold text-sm"
                  style={{ background: '#35C493', color: '#03313C', boxShadow: '0 4px 20px rgba(53,196,147,0.3)' }}>
                  Publicar mi espacio <ArrowRight size={15} />
                </Link>
                <Link href="/buscar"
                  className="inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl font-semibold text-sm"
                  style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.12)' }}>
                  Ver el marketplace
                </Link>
              </div>
            </div>

            {/* Stats flotantes derecha */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { n: 'RD$0',  label: 'Costo de publicación',          accent: false },
                { n: '10%',   label: 'Comisión por reserva',          accent: true  },
                { n: '< 24h', label: 'Para activar tu listado',       accent: false },
                { n: '4.9★',  label: 'Calificación de anfitriones',   accent: false },
              ].map(({ n, label, accent }) => (
                <div key={label} className="rounded-2xl p-5"
                  style={{
                    background: accent ? 'rgba(53,196,147,0.12)' : 'rgba(255,255,255,0.05)',
                    border: accent ? '1px solid rgba(53,196,147,0.25)' : '1px solid rgba(255,255,255,0.08)',
                  }}>
                  <p className="font-bold text-2xl mb-1"
                    style={{ color: accent ? '#35C493' : '#fff', letterSpacing: '-0.04em' }}>{n}</p>
                  <p className="text-xs leading-snug" style={{ color: accent ? 'rgba(53,196,147,0.7)' : 'rgba(255,255,255,0.4)' }}>{label}</p>
                </div>
              ))}
            </div>

          </div>
        </div>
      </section>

      {/* ── PASOS — TIMELINE VERTICAL ────────────────────────── */}
      <section style={{ background: 'var(--bg-base)' }}>
        <div className="max-w-4xl mx-auto px-5 py-20">
          <div className="mb-12">
            <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--brand)' }}>Proceso</p>
            <h2 className="font-bold" style={{ fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', letterSpacing: '-0.04em', color: 'var(--text-primary)', lineHeight: 1.1 }}>
              De cero a recibir pagos<br />en menos de 24 horas
            </h2>
          </div>

          <div className="relative">
            {/* Línea vertical */}
            <div className="absolute left-6 top-6 bottom-6 w-px hidden md:block" style={{ background: 'var(--border-medium)' }} />

            <div className="space-y-6">
              {steps.map(({ n, title, body }) => (
                <div key={n} className="flex gap-6 items-start">
                  {/* Número */}
                  <div className="relative z-10 shrink-0 w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm"
                    style={{ background: 'var(--bg-surface)', border: '2px solid var(--border-medium)', color: 'var(--brand)', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                    {n}
                  </div>
                  {/* Contenido */}
                  <div className="flex-1 pb-2">
                    <h3 className="font-bold text-base mb-1.5" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>{title}</h3>
                    <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── HERRAMIENTAS — LISTA ASIMÉTRICA ──────────────────── */}
      <section style={{ background: 'var(--bg-surface)' }}>
        <div className="max-w-6xl mx-auto px-5 py-20">
          <div className="grid md:grid-cols-[1fr_1.6fr] gap-16 items-start">

            {/* Izquierda — texto fijo */}
            <div className="md:sticky md:top-24">
              <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--brand)' }}>Dashboard</p>
              <h2 className="font-bold mb-4" style={{ fontSize: 'clamp(1.6rem, 3.5vw, 2.4rem)', letterSpacing: '-0.04em', color: 'var(--text-primary)', lineHeight: 1.15 }}>
                Todo incluido.<br />Sin costo extra.
              </h2>
              <p className="text-sm leading-relaxed mb-6" style={{ color: 'var(--text-secondary)' }}>
                Un dashboard pensado para propietarios de eventos en República Dominicana.
              </p>
              <Link href={REGISTER_URL}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm"
                style={{ background: 'var(--brand-dim)', color: 'var(--brand)', border: '1px solid var(--brand-border)' }}>
                Empezar gratis <ArrowRight size={14} />
              </Link>
            </div>

            {/* Derecha — lista de features */}
            <div className="space-y-px">
              {features.map(({ icon: Icon, title, body }, i) => (
                <div key={title}
                  className="flex items-start gap-5 px-5 py-5"
                  style={{
                    borderTop: i === 0 ? '1px solid var(--border-subtle)' : 'none',
                    borderBottom: '1px solid var(--border-subtle)',
                  }}>
                  <div className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: 'var(--brand-dim)', color: 'var(--brand)' }}>
                    <Icon size={18} />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm mb-1" style={{ color: 'var(--text-primary)' }}>{title}</h3>
                    <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── COMISIÓN — BARRA HORIZONTAL ──────────────────────── */}
      <section style={{ background: '#03313C' }}>
        <div className="max-w-4xl mx-auto px-5 py-20">
          <div className="mb-12">
            <h2 className="font-bold text-white mb-3"
              style={{ fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', letterSpacing: '-0.04em', lineHeight: 1.1 }}>
              Sin sorpresas.<br />Solo una comisión justa.
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.95rem' }}>
              Así se distribuye el valor total de cada reserva
            </p>
          </div>

          {/* Barra de distribución */}
          <div className="rounded-3xl p-6 md:p-8 mb-8"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="flex gap-1 h-10 rounded-xl overflow-hidden mb-5">
              <div className="flex items-center justify-center text-xs font-bold"
                style={{ width: '90%', background: '#35C493', color: '#03313C' }}>90%</div>
              <div className="flex items-center justify-center text-xs font-bold"
                style={{ width: '10%', background: 'rgba(53,196,147,0.3)', color: '#35C493' }}>10%</div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-2xl font-bold mb-1" style={{ color: '#35C493', letterSpacing: '-0.03em' }}>90%</p>
                <p className="text-sm font-semibold text-white mb-1">Para ti</p>
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>Tu ganancia neta por reserva confirmada</p>
              </div>
              <div>
                <p className="text-2xl font-bold mb-1" style={{ color: 'rgba(255,255,255,0.6)', letterSpacing: '-0.03em' }}>10%</p>
                <p className="text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.7)' }}>espot.do</p>
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>Plataforma, soporte y procesamiento</p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-x-8 gap-y-3">
            {['Sin suscripción mensual', 'Sin costo por publicar', 'Sin contrato de permanencia'].map(item => (
              <div key={item} className="flex items-center gap-2 text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
                <Check size={13} style={{ color: '#35C493' }} /> {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ───────────────────────────────────────────────── */}
      <section style={{ background: 'var(--bg-base)' }}>
        <div className="max-w-5xl mx-auto px-5 py-20">
          <div className="grid md:grid-cols-[1fr_2fr] gap-12 items-start">

            {/* Columna izquierda fija */}
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
                .faq-item summary { list-style: none; }
                .faq-item summary::-webkit-details-marker { display: none; }
                .faq-icon { transition: transform 0.2s ease; }
                .faq-item[open] .faq-icon { transform: rotate(180deg); }
              `}</style>
              <div className="space-y-2">
                {faqs.map(({ q, a }) => (
                  <details key={q} className="faq-item rounded-2xl overflow-hidden"
                    style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
                    <summary className="flex items-center justify-between gap-4 px-5 py-4 cursor-pointer select-none font-semibold text-sm"
                      style={{ color: 'var(--text-primary)' }}>
                      {q}
                      <ChevronDown size={15} className="faq-icon" style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
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
      <section style={{ background: 'var(--bg-surface)', borderTop: '1px solid var(--border-subtle)' }}>
        <div className="max-w-6xl mx-auto px-5 py-16">
          <div className="grid md:grid-cols-[1fr_auto] items-center gap-8">
            <div>
              <h2 className="font-bold mb-2"
                style={{ fontSize: 'clamp(1.4rem, 3.5vw, 2rem)', letterSpacing: '-0.04em', color: 'var(--text-primary)' }}>
                Empieza a generar ingresos hoy
              </h2>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Únete a los propietarios que ya maximizan sus espacios en República Dominicana.
              </p>
            </div>
            <div className="flex flex-col gap-2 shrink-0">
              <Link href={REGISTER_URL}
                className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl font-bold text-sm whitespace-nowrap"
                style={{ background: '#35C493', color: '#03313C', boxShadow: '0 4px 20px rgba(53,196,147,0.25)' }}>
                Crear cuenta gratis <ArrowRight size={15} />
              </Link>
              <p className="text-xs text-center" style={{ color: 'var(--text-muted)' }}>
                ¿Ya tienes cuenta?{' '}
                <Link href="/auth" style={{ color: 'var(--brand)' }}>Inicia sesión</Link>
              </p>
            </div>
          </div>
        </div>
      </section>

    </div>
  )
}
