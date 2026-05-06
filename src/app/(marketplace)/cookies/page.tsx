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
    content: 'Las cookies son pequeños archivos de texto que se almacenan en tu dispositivo (ordenador, móvil o tablet) cuando visitas un sitio web. Sirven para recordar tus preferencias y para ayudarnos a entender cómo interactúas con nuestra plataforma.',
  },
  {
    num: '2', title: '¿Qué cookies utilizamos en Espot.do?',
    content: `Actualmente utilizamos únicamente cookies analíticas de Google Analytics, que nos permiten:

• Saber qué páginas visitan nuestros usuarios.
• Medir la frecuencia de visitas y el tiempo de permanencia en la plataforma.
• Identificar tendencias generales de navegación con fines estadísticos.

Estas cookies no recogen información que te identifique directamente como persona.`,
  },
  {
    num: '3', title: 'Gestión de cookies',
    content: `Al acceder y navegar en Espot.do, aceptas el uso de cookies según esta política. Por el momento, mostramos un aviso informativo sobre el uso de cookies al entrar en la plataforma.

Puedes configurar tu navegador para bloquear o eliminar cookies si lo prefieres. Ten en cuenta que, si decides bloquear las cookies, algunas funcionalidades de la plataforma podrían verse limitadas.`,
  },
  {
    num: '4', title: 'Cambios en la Política de Cookies',
    content: 'Podemos actualizar esta Política de Cookies en cualquier momento para reflejar cambios en la normativa o en la forma en que usamos cookies. Publicaremos la versión actualizada en esta misma página con la fecha de la última modificación.',
  },
  {
    num: '5', title: 'Contacto',
    content: 'Si tienes dudas o comentarios sobre esta Política de Cookies, puedes escribirnos a: contacto@espot.do',
  },
]

export default function CookiesPage() {
  return (
    <div style={{ background: 'var(--bg-base)', minHeight: '100vh' }}>
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
            Última actualización: 16 de septiembre de 2025
          </p>
        </div>

        <div className="rounded-2xl p-6 mb-6"
          style={{ background: 'var(--brand-dim)', border: '1px solid var(--brand-border)' }}>
          <p className="text-sm" style={{ color: 'var(--text-primary)' }}>
            En <strong>ESPOT, S.R.L.</strong> utilizamos cookies para mejorar la experiencia de navegación
            de nuestros usuarios. Esta política explica qué son las cookies, qué tipo usamos y cómo puedes gestionarlas.
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
