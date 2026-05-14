import { type Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, Mail, Phone, MapPin, Clock, MessageCircle } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Servicio al Cliente — Espot',
  description: 'Contacta a Espot. Estamos aquí para ayudarte con tus reservas, pagos y cualquier consulta.',
}

export default function ContactoPage() {
  return (
    <div style={{ background: 'var(--bg-base)', minHeight: '100dvh' }}>
      <div className="max-w-3xl mx-auto px-4 md:px-6 py-8 md:py-12">

        <Link href="/" className="inline-flex items-center gap-1.5 text-sm mb-8"
          style={{ color: 'var(--text-muted)' }}>
          <ArrowLeft size={14} /> Volver al inicio
        </Link>

        <div className="mb-10">
          <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>
            Servicio al Cliente
          </h1>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Estamos aquí para ayudarte con tus reservas, pagos y cualquier consulta.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">

          {/* Contacto directo */}
          <div className="rounded-2xl p-6" style={{ background: '#fff', border: '1px solid var(--border-subtle)' }}>
            <h2 className="font-bold text-base mb-5" style={{ color: 'var(--text-primary)' }}>Contacto directo</h2>
            <div className="space-y-4">
              <a href="mailto:contacto@espot.do"
                className="flex items-center gap-3 text-sm transition-colors group"
                style={{ color: 'var(--text-secondary)' }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: 'var(--brand-dim)' }}>
                  <Mail size={17} style={{ color: 'var(--brand)' }} />
                </div>
                <div>
                  <div className="font-semibold" style={{ color: 'var(--text-primary)' }}>Correo electrónico</div>
                  <div style={{ color: 'var(--brand)' }}>contacto@espot.do</div>
                </div>
              </a>

              <a href="tel:+18295481998"
                className="flex items-center gap-3 text-sm transition-colors"
                style={{ color: 'var(--text-secondary)' }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: 'var(--brand-dim)' }}>
                  <Phone size={17} style={{ color: 'var(--brand)' }} />
                </div>
                <div>
                  <div className="font-semibold" style={{ color: 'var(--text-primary)' }}>Teléfono</div>
                  <div style={{ color: 'var(--brand)' }}>+1 (829) 548-1998</div>
                </div>
              </a>

              <a href="https://wa.me/18295481998" target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-3 text-sm transition-colors"
                style={{ color: 'var(--text-secondary)' }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: 'rgba(37,211,102,0.1)' }}>
                  <MessageCircle size={17} style={{ color: '#25D366' }} />
                </div>
                <div>
                  <div className="font-semibold" style={{ color: 'var(--text-primary)' }}>WhatsApp</div>
                  <div style={{ color: '#25D366' }}>+1 (829) 548-1998</div>
                </div>
              </a>
            </div>
          </div>

          {/* Información de la empresa */}
          <div className="rounded-2xl p-6" style={{ background: '#fff', border: '1px solid var(--border-subtle)' }}>
            <h2 className="font-bold text-base mb-5" style={{ color: 'var(--text-primary)' }}>Información del comercio</h2>
            <div className="space-y-4">
              <div className="flex items-start gap-3 text-sm">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                  style={{ background: 'var(--brand-dim)' }}>
                  <MapPin size={17} style={{ color: 'var(--brand)' }} />
                </div>
                <div>
                  <div className="font-semibold mb-0.5" style={{ color: 'var(--text-primary)' }}>Dirección permanente</div>
                  <div style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                    ESPOT, S.R.L.<br />
                    Calle Caonabo No. 42, Gazcue<br />
                    Distrito Nacional, República Dominicana
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3 text-sm">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: 'var(--brand-dim)' }}>
                  <Clock size={17} style={{ color: 'var(--brand)' }} />
                </div>
                <div>
                  <div className="font-semibold mb-0.5" style={{ color: 'var(--text-primary)' }}>Horario de atención</div>
                  <div style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                    Lunes – Viernes: 9:00 AM – 6:00 PM<br />
                    Sábados: 10:00 AM – 2:00 PM
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Temas frecuentes */}
        <div className="rounded-2xl p-6 mb-8" style={{ background: '#fff', border: '1px solid var(--border-subtle)' }}>
          <h2 className="font-bold text-base mb-5" style={{ color: 'var(--text-primary)' }}>
            ¿En qué podemos ayudarte?
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { title: 'Problemas con una reserva',     desc: 'Cancelaciones, cambios de fecha o disputas con el propietario' },
              { title: 'Pagos y reembolsos',             desc: 'Cobros incorrectos, reembolsos pendientes o problemas con Azul Payments' },
              { title: 'Acceso a mi cuenta',             desc: 'No puedo entrar, cambio de email o contraseña olvidada' },
              { title: 'Publicar mi espacio',            desc: 'Quiero registrarme como propietario y publicar mi espacio' },
              { title: 'Reportar un problema',           desc: 'Espacio que no cumple lo publicado o comportamiento inapropiado' },
              { title: 'Otro',                           desc: 'Cualquier otra consulta o sugerencia' },
            ].map(item => (
              <a key={item.title} href={`mailto:contacto@espot.do?subject=${encodeURIComponent(item.title)}`}
                className="flex flex-col gap-1 p-4 rounded-xl transition-all hover:opacity-80"
                style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
                <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{item.title}</span>
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{item.desc}</span>
              </a>
            ))}
          </div>
          <p className="text-xs mt-4 text-center" style={{ color: 'var(--text-muted)' }}>
            Al hacer clic en un tema, se abre tu cliente de correo con el asunto pre-llenado.
          </p>
        </div>

        {/* Links de política */}
        <div className="rounded-2xl p-5" style={{ background: 'rgba(53,196,147,0.04)', border: '1px solid rgba(53,196,147,0.15)' }}>
          <p className="text-sm font-semibold mb-3" style={{ color: '#0A7A50' }}>Políticas y documentos relevantes</p>
          <div className="flex flex-wrap gap-3">
            {[
              { href: '/reembolso', label: 'Política de reembolso' },
              { href: '/terminos', label: 'Términos y condiciones' },
              { href: '/privacidad', label: 'Política de privacidad' },
              { href: '/seguridad', label: 'Seguridad de pagos' },
            ].map(link => (
              <Link key={link.href} href={link.href}
                className="text-xs font-semibold px-3 py-1.5 rounded-xl transition-all"
                style={{ background: '#fff', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="mt-8 pt-6 text-xs text-center" style={{ borderTop: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
          © 2026 ESPOT, S.R.L. · República Dominicana
        </div>
      </div>
    </div>
  )
}
