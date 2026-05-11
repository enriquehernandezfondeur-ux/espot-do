import { type Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, Lock, Shield, CreditCard } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Política de Seguridad de Datos — EspotHub',
  description: 'Políticas de seguridad para la transmisión de datos de tarjetas de crédito y débito en EspotHub.',
}

export default function SeguridadPage() {
  return (
    <div style={{ background: 'var(--bg-base)', minHeight: '100dvh' }}>
      <div className="max-w-3xl mx-auto px-4 md:px-6 py-8 md:py-12">

        <Link href="/" className="inline-flex items-center gap-1.5 text-sm mb-8"
          style={{ color: 'var(--text-muted)' }}>
          <ArrowLeft size={14} /> Volver al inicio
        </Link>

        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
              style={{ background: 'rgba(37,99,235,0.08)' }}>
              <Lock size={22} style={{ color: '#2563EB' }} />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold" style={{ color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>
                Seguridad en los Pagos
              </h1>
              <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
                Última actualización: mayo 2026
              </p>
            </div>
          </div>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            En EspotHub la seguridad de tus datos financieros es prioridad. Esta página describe cómo protegemos la información de tus tarjetas de crédito y débito.
          </p>
        </div>

        {/* Logos 3D Secure — requerido por Azul/Visa/MC */}
        <div className="rounded-2xl p-6 mb-8 text-center"
          style={{ background: '#fff', border: '1px solid var(--border-subtle)' }}>
          <p className="text-xs font-bold uppercase tracking-widest mb-5" style={{ color: 'var(--text-muted)' }}>
            Pagos protegidos con autenticación 3D Secure
          </p>
          <div className="flex items-center justify-center gap-8 flex-wrap">
            {/* Visa + Verified by Visa */}
            <div className="flex flex-col items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/visa-logo.jpg" alt="Visa" style={{ height: 36, width: 'auto', borderRadius: 8, objectFit: 'contain' }} />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/verified-by-visa.png" alt="Verified by Visa" style={{ height: 28, width: 'auto' }} />
              <span className="text-xs font-semibold" style={{ color: '#1A1F71' }}>Verified by Visa</span>
            </div>

            {/* Mastercard ID Check */}
            <div className="flex flex-col items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/mastercard-logo.svg" alt="Mastercard" style={{ height: 36, width: 'auto' }} />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/mastercard-id-check.png" alt="Mastercard ID Check" style={{ height: 28, width: 'auto' }} />
              <span className="text-xs font-semibold" style={{ color: '#252525' }}>Mastercard ID Check</span>
            </div>

            {/* Azul */}
            <div className="flex flex-col items-center gap-2">
              <div className="px-4 py-2 rounded-xl flex items-center gap-2" style={{ background: '#0057A8' }}>
                <Lock size={14} color="#fff" />
                <span style={{ fontFamily: 'Arial', fontWeight: '700', fontSize: 13, color: '#fff' }}>azul</span>
              </div>
              <span className="text-xs font-semibold" style={{ color: '#0057A8' }}>Azul Payments RD</span>
            </div>
          </div>
        </div>

        {/* Sections */}
        <div className="space-y-5">

          <div className="rounded-2xl p-5 md:p-6" style={{ background: '#fff', border: '1px solid var(--border-subtle)' }}>
            <div className="flex items-center gap-2 mb-3">
              <Shield size={16} style={{ color: '#2563EB' }} />
              <h2 className="font-bold" style={{ color: 'var(--text-primary)' }}>Procesamiento de pagos</h2>
            </div>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              EspotHub no almacena, procesa ni transmite datos de tarjetas de crédito o débito en sus servidores. Todos los pagos son procesados directamente por <strong style={{ color: 'var(--text-primary)' }}>Azul Payments</strong>, procesador de pagos certificado PCI-DSS, a través de su plataforma <em>Payment Page</em>.
            </p>
            <p className="text-sm leading-relaxed mt-2" style={{ color: 'var(--text-secondary)' }}>
              Cuando el cliente hace clic en "Pagar", es redirigido al dominio seguro de Azul (<strong>pagos.azul.com.do</strong>) donde ingresa sus datos de tarjeta. EspotHub nunca ve ni toca esa información.
            </p>
          </div>

          <div className="rounded-2xl p-5 md:p-6" style={{ background: '#fff', border: '1px solid var(--border-subtle)' }}>
            <div className="flex items-center gap-2 mb-3">
              <CreditCard size={16} style={{ color: '#2563EB' }} />
              <h2 className="font-bold" style={{ color: 'var(--text-primary)' }}>Autenticación 3D Secure</h2>
            </div>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              Todas las transacciones procesadas a través de EspotHub utilizan el protocolo <strong style={{ color: 'var(--text-primary)' }}>3D Secure</strong>, que añade una capa adicional de verificación de identidad del tarjetahabiente:
            </p>
            <ul className="mt-3 space-y-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
              <li className="flex items-start gap-2"><span style={{ color: 'var(--brand)', marginTop: 2 }}>•</span><span><strong style={{ color: 'var(--text-primary)' }}>Verified by Visa</strong>: autenticación adicional para tarjetas Visa.</span></li>
              <li className="flex items-start gap-2"><span style={{ color: 'var(--brand)', marginTop: 2 }}>•</span><span><strong style={{ color: 'var(--text-primary)' }}>Mastercard ID Check</strong>: protección para tarjetas Mastercard.</span></li>
              <li className="flex items-start gap-2"><span style={{ color: 'var(--brand)', marginTop: 2 }}>•</span><span>El banco emisor puede solicitar un código de verificación (OTP/SMS) antes de aprobar el pago.</span></li>
            </ul>
          </div>

          <div className="rounded-2xl p-5 md:p-6" style={{ background: '#fff', border: '1px solid var(--border-subtle)' }}>
            <div className="flex items-center gap-2 mb-3">
              <Lock size={16} style={{ color: '#2563EB' }} />
              <h2 className="font-bold" style={{ color: 'var(--text-primary)' }}>Protección de datos personales</h2>
            </div>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              La información personal del cliente (nombre, correo, teléfono) es protegida bajo los principios de nuestra{' '}
              <Link href="/terminos" style={{ color: 'var(--brand)' }}>Política de Privacidad</Link>. Los datos se transmiten mediante conexiones cifradas con <strong style={{ color: 'var(--text-primary)' }}>TLS 1.2 o superior</strong> (HTTPS) en todo momento.
            </p>
          </div>

          <div className="rounded-2xl p-5 md:p-6" style={{ background: '#fff', border: '1px solid var(--border-subtle)' }}>
            <div className="flex items-center gap-2 mb-3">
              <Shield size={16} style={{ color: '#2563EB' }} />
              <h2 className="font-bold" style={{ color: 'var(--text-primary)' }}>Responsabilidades del tarjetahabiente</h2>
            </div>
            <ul className="text-sm space-y-2" style={{ color: 'var(--text-secondary)' }}>
              <li className="flex items-start gap-2"><span style={{ color: 'var(--brand)', marginTop: 2 }}>•</span><span>No compartir datos de tarjeta por chat, email o cualquier canal fuera de la página de Azul.</span></li>
              <li className="flex items-start gap-2"><span style={{ color: 'var(--brand)', marginTop: 2 }}>•</span><span>Verificar que la URL de pago pertenece al dominio de Azul antes de ingresar datos.</span></li>
              <li className="flex items-start gap-2"><span style={{ color: 'var(--brand)', marginTop: 2 }}>•</span><span>Reportar cualquier cargo no reconocido inmediatamente a su banco y a EspotHub.</span></li>
            </ul>
          </div>

          <div className="rounded-2xl p-5 md:p-6" style={{ background: '#fff', border: '1px solid var(--border-subtle)' }}>
            <div className="flex items-center gap-2 mb-3">
              <CreditCard size={16} style={{ color: '#2563EB' }} />
              <h2 className="font-bold" style={{ color: 'var(--text-primary)' }}>Contacto de seguridad</h2>
            </div>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              Para reportar incidentes de seguridad o fraude relacionados con pagos en EspotHub:
            </p>
            <div className="mt-3 space-y-2">
              <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                <span style={{ color: 'var(--brand)' }}>✉</span>
                <a href="mailto:contacto@espot.do" style={{ color: 'var(--brand)' }}>contacto@espot.do</a>
              </div>
              <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                <span style={{ color: 'var(--brand)' }}>📞</span>
                <a href="tel:+18095550000" style={{ color: 'var(--brand)' }}>+1 (829) 548-1998</a>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-10 pt-8 flex items-center justify-between text-xs flex-wrap gap-3"
          style={{ borderTop: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
          <span>© 2026 ESPOT, S.R.L. · Santo Domingo, República Dominicana</span>
          <div className="flex gap-4">
            <Link href="/terminos" style={{ color: 'var(--text-muted)' }}>Términos</Link>
            <Link href="/reembolso" style={{ color: 'var(--text-muted)' }}>Reembolsos</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
