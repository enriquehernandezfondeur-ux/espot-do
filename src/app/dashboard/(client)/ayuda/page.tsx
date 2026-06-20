'use client'

import { useState } from 'react'
import { ChevronDown, MessageCircle, Mail, Phone, ExternalLink } from 'lucide-react'

const FAQS = [
  {
    q: '¿Cómo funciona el proceso de reserva?',
    a: 'Encuentras el espacio en el marketplace, seleccionas fecha y horario, y envías tu solicitud. El propietario tiene 48 horas para aceptarla o rechazarla. Si acepta, procedes al pago de la primera cuota para confirmar.',
  },
  {
    q: '¿En cuántas cuotas puedo pagar?',
    a: 'El plan de pagos depende del tiempo que falta para tu evento. Si falta más de 90 días, pagas en 3 cuotas. Si falta entre 30 y 90 días, en 2 cuotas. Si falta menos de 30 días, se paga el total de una vez. El propietario puede también ofrecer condiciones personalizadas.',
  },
  {
    q: '¿Puedo cancelar mi reserva?',
    a: 'Sí. Ve a "Mis reservas", abre el detalle de la reserva y usa el botón "Cancelar reserva". El reembolso depende de la política de cancelación del espacio y cuánto tiempo falta para el evento. Si la cancelación es 7+ días antes, suele haber reembolso parcial o total.',
  },
  {
    q: '¿Qué pasa si el propietario cancela?',
    a: 'Si el propietario cancela tu reserva confirmada, recibes un reembolso completo de todo lo que hayas pagado. Nos pondremos en contacto contigo para ayudarte a encontrar un espacio alternativo.',
  },
  {
    q: '¿Cómo descargo el contrato de mi reserva?',
    a: 'En el detalle de tu reserva (sección "Mis reservas"), hay un botón para descargar el contrato en PDF. Este documento detalla las condiciones acordadas con el propietario.',
  },
  {
    q: '¿Cómo descargo un comprobante de pago?',
    a: 'Ve a "Pagos" en el menú lateral. Ahí encontrarás el historial de cuotas pagadas. Cada cuota tiene un botón "Comprobante" que abre un recibo que puedes imprimir o guardar como PDF.',
  },
  {
    q: '¿Mis datos de pago están seguros?',
    a: 'Sí. Todos los pagos se procesan a través de Azul, el gateway de pago más usado en República Dominicana, con certificación PCI DSS. Espot nunca almacena los datos de tu tarjeta.',
  },
  {
    q: '¿Puedo modificar la fecha de mi reserva?',
    a: 'Los cambios de fecha deben coordinarse directamente con el propietario a través del chat de mensajes. Si llegan a un acuerdo, el propietario puede actualizar los detalles de la reserva. No es posible cambiar la fecha de manera autónoma desde el panel.',
  },
]

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="rounded-2xl overflow-hidden transition-all"
      style={{ background: '#fff', border: '1px solid var(--border-subtle)' }}>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left"
        style={{ cursor: 'pointer' }}>
        <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{q}</span>
        <ChevronDown size={16} className={`shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} style={{ color: 'var(--text-muted)' }} />
      </button>
      {open && (
        <div className="px-5 pb-4 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)', borderTop: '1px solid var(--border-subtle)' }}>
          <div className="pt-3">{a}</div>
        </div>
      )}
    </div>
  )
}

export default function AyudaPage() {
  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-7">
        <h1 className="text-xl md:text-2xl font-bold" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Centro de ayuda</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          Encuentra respuestas rápidas o escríbenos directamente.
        </p>
      </div>

      {/* Contacto rápido */}
      <div className="rounded-3xl overflow-hidden mb-7"
        style={{ background: 'linear-gradient(135deg, var(--brand) 0%, #1a9e70 100%)' }}>
        <div className="px-6 py-5">
          <h2 className="font-bold text-white text-base mb-1">¿Necesitas ayuda personalizada?</h2>
          <p className="text-sm mb-5" style={{ color: 'rgba(255,255,255,0.8)' }}>
            Nuestro equipo está disponible de lunes a sábado, 8am – 7pm.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <a href="https://wa.me/18093000000?text=Hola%2C%20necesito%20ayuda%20con%20mi%20reserva%20en%20Espot"
              target="_blank" rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-2xl font-semibold text-sm transition-all"
              style={{ background: '#fff', color: '#16A34A' }}>
              <MessageCircle size={15} /> WhatsApp
            </a>
            <a href="mailto:contacto@espot.do?subject=Ayuda%20desde%20el%20panel%20del%20cliente"
              className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-2xl font-semibold text-sm transition-all"
              style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)' }}>
              <Mail size={15} /> Enviar email
            </a>
          </div>
        </div>
      </div>

      {/* FAQ */}
      <div>
        <h2 className="font-bold text-base mb-4" style={{ color: 'var(--text-primary)' }}>Preguntas frecuentes</h2>
        <div className="flex flex-col gap-2">
          {FAQS.map((faq, i) => <FaqItem key={i} q={faq.q} a={faq.a} />)}
        </div>
      </div>

      {/* Footer links */}
      <div className="mt-8 flex flex-wrap items-center justify-center gap-4 text-xs" style={{ color: 'var(--text-muted)' }}>
        <a href="/terminos" target="_blank" className="flex items-center gap-1 hover:underline">
          Términos de uso <ExternalLink size={10} />
        </a>
        <a href="/privacidad" target="_blank" className="flex items-center gap-1 hover:underline">
          Privacidad <ExternalLink size={10} />
        </a>
        <a href="mailto:contacto@espot.do" className="flex items-center gap-1 hover:underline">
          contacto@espot.do
        </a>
      </div>
    </div>
  )
}
