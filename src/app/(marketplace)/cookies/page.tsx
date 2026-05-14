import { type Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Política de Cookies',
  description: 'Política de cookies y privacidad de espot.do',
}

const sections = [
  {
    num: '1', title: '¿Qué son las cookies?',
    content: 'Las cookies son pequeños archivos de texto que se almacenan en tu dispositivo cuando visitas un sitio web. Permiten que la plataforma recuerde tu sesión, preferencias y configuración entre visitas.',
  },
  {
    num: '2', title: 'Cookies esenciales de autenticación',
    content: `Espot.do utiliza cookies de sesión proporcionadas por Supabase, nuestro servicio de autenticación, que son estrictamente necesarias para el funcionamiento de la plataforma:

• sb-access-token — Almacena el token de acceso de tu sesión activa. Sin esta cookie no es posible iniciar sesión ni acceder a tu cuenta.
• sb-refresh-token — Permite renovar tu sesión automáticamente sin tener que volver a introducir tus credenciales.

Estas cookies se eliminan al cerrar sesión o al expirar el tiempo de inactividad. No pueden desactivarse si deseas utilizar la plataforma como usuario registrado.`,
  },
  {
    num: '3', title: 'Cookies de preferencias',
    content: `La plataforma puede almacenar en tu dispositivo pequeñas preferencias de navegación (como el último espacio visto o filtros de búsqueda) mediante cookies de corta duración o almacenamiento local del navegador.

Estas cookies no contienen información personal identificable y se utilizan únicamente para mejorar tu experiencia dentro de la sesión.`,
  },
  {
    num: '4', title: 'Cookies de terceros',
    content: `Espot.do no instala cookies de terceros con fines publicitarios ni de seguimiento entre sitios.

Los pagos son procesados por Azul a través de su propia página de pago. Durante ese proceso, Azul puede utilizar sus propias cookies bajo sus términos y condiciones, sobre las cuales Espot no tiene control.`,
  },
  {
    num: '5', title: 'Gestión y desactivación',
    content: `Puedes configurar tu navegador para bloquear o eliminar cookies en cualquier momento. Sin embargo, ten en cuenta que:

• Bloquear las cookies esenciales de sesión impedirá que puedas iniciar sesión o usar funciones como reservar espacios, gestionar tu dashboard o enviar mensajes.
• Las cookies de preferencias pueden eliminarse sin afectar el funcionamiento principal de la plataforma.

La configuración de cookies se realiza desde los ajustes de tu navegador (Chrome, Safari, Firefox, etc.).`,
  },
  {
    num: '6', title: 'Actualizaciones y Contacto',
    content: `Podemos actualizar esta política en cualquier momento para reflejar cambios técnicos o normativos. La versión vigente siempre estará disponible en esta página con la fecha de la última modificación.

Para cualquier duda sobre el uso de cookies en Espot.do, escríbenos a: contacto@espot.do`,
  },
]

export default function CookiesPage() {
  return (
    <div style={{ background: 'var(--bg-base)', minHeight: '100dvh' }}>
      <div className="max-w-3xl mx-auto px-6 py-12">

        <Link href="/" className="inline-flex items-center gap-1.5 text-sm mb-8"
          style={{ color: 'var(--text-muted)' }}>
          <ArrowLeft size={14} /> Volver al inicio
        </Link>

        <div className="mb-10">
          <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>
            Política de Cookies
          </h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Última actualización: 10 de mayo de 2026
          </p>
        </div>

        <div className="rounded-2xl p-6 mb-6"
          style={{ background: 'var(--brand-dim)', border: '1px solid var(--brand-border)' }}>
          <p className="text-sm" style={{ color: 'var(--text-primary)' }}>
            En <strong>Espot (espot.do)</strong>, propiedad de <strong>ESPOT, S.R.L.</strong>, utilizamos
            cookies esenciales para el funcionamiento de la plataforma. Esta política explica qué cookies usamos y cómo puedes gestionarlas.
          </p>
        </div>

        <div className="space-y-5">
          {sections.map(s => (
            <div key={s.num} className="rounded-2xl p-6"
              style={{ background: '#fff', border: '1px solid var(--border-subtle)' }}>
              <h2 className="font-bold text-base mb-3" style={{ color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
                <span className="text-xs font-bold mr-2 px-2 py-0.5 rounded-lg"
                  style={{ background: 'var(--brand-dim)', color: 'var(--brand)' }}>
                  {s.num}
                </span>
                {s.title}
              </h2>
              <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: 'var(--text-secondary)' }}>
                {s.content}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-10 pt-8 flex items-center justify-between text-xs"
          style={{ borderTop: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
          <span>© 2026 ESPOT, S.R.L. · República Dominicana</span>
          <div className="flex gap-4">
            <Link href="/terminos" style={{ color: 'var(--text-muted)' }}>Términos y Condiciones</Link>
            <Link href="/reembolso" style={{ color: 'var(--text-muted)' }}>Política de Reembolso</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
