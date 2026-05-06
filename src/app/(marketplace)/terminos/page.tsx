import { type Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Términos y Condiciones',
  description: 'Términos y condiciones de uso de la plataforma espot.do',
}

const sections = [
  {
    num: '1', title: 'Objeto de la Plataforma',
    content: `Espot.do actúa únicamente como intermediario tecnológico, facilitando:

• La publicación de espacios disponibles.
• La gestión de solicitudes y reservas.
• El cobro online de la comisión de Espot.

Espot no es propietario, arrendador ni administrador de los espacios, ni presta servicios de alquiler, logística, catering, seguridad, permisos o eventos. La relación contractual del alquiler se establece directamente entre el Anfitrión y el Huésped.`,
  },
  {
    num: '2', title: 'Registro de Usuario',
    content: `Para reservar o publicar un espacio es necesario crear una cuenta.

• La información proporcionada debe ser veraz y actualizada.
• El usuario es responsable de toda actividad realizada desde su cuenta.
• Espot puede suspender o cancelar cuentas por uso indebido, información falsa o incumplimiento de estos términos.`,
  },
  {
    num: '3', title: 'Pagos y Comisión de Espot',
    content: `Al confirmar una reserva, el Huésped paga online únicamente el 10% del valor total, el cual:

• Sirve para asegurar la fecha y las horas reservadas.
• Corresponde íntegramente a la comisión de Espot por el uso de la plataforma y la intermediación.

El 90% restante del valor de la reserva no es cobrado por Espot y deberá ser pagado directamente al Anfitrión, el día del uso o según las condiciones acordadas entre las partes.

Espot no retiene, administra ni transfiere pagos correspondientes al Anfitrión. Los pagos se procesan a través del proveedor Azul. Espot no almacena datos sensibles de tarjetas.`,
  },
  {
    num: '4', title: 'Cancelaciones',
    content: `Cada Anfitrión define su propia política de cancelación, la cual será visible antes de confirmar la reserva.

• En caso de cancelación, la comisión pagada a Espot no es reembolsable, salvo que se indique expresamente lo contrario.
• Cualquier devolución del monto restante corresponde exclusivamente al Anfitrión.
• Espot no interviene en disputas entre Anfitrión y Huésped.`,
  },
  {
    num: '5', title: 'Responsabilidades del Anfitrión',
    content: `El Anfitrión declara que:

• Cuenta con los permisos legales necesarios para alquilar su espacio.
• Cumple con las obligaciones fiscales aplicables.
• El espacio es seguro y apto para el uso ofrecido.

El Anfitrión es el único responsable frente a terceros, autoridades y Huéspedes por cualquier incidente, daño o incumplimiento, liberando a ESPOT, S.R.L. de toda responsabilidad.`,
  },
  {
    num: '6', title: 'Responsabilidades del Huésped',
    content: `El Huésped se compromete a:

• Usar el espacio de forma responsable.
• Respetar las normas del Anfitrión.
• No realizar actividades ilegales o peligrosas.
• Asumir los daños ocasionados durante la reserva.

El Huésped libera de responsabilidad a ESPOT, S.R.L. por cualquier incidente relacionado con el uso del espacio.`,
  },
  {
    num: '7', title: 'Limitación de Responsabilidad',
    content: `ESPOT, S.R.L.:

• No garantiza la calidad, legalidad ni seguridad de los espacios.
• No es responsable de accidentes, daños, pérdidas, lesiones o conflictos ocurridos antes, durante o después del uso del espacio.
• Su función se limita exclusivamente a proveer la plataforma tecnológica y cobrar su comisión.`,
  },
  {
    num: '8', title: 'Contenido Publicado',
    content: 'El Anfitrión es responsable del contenido publicado. Espot puede eliminar contenido falso, engañoso o ilegal.',
  },
  {
    num: '9', title: 'Propiedad Intelectual',
    content: 'Todos los derechos de la plataforma pertenecen a ESPOT, S.R.L. Queda prohibido su uso sin autorización escrita.',
  },
  {
    num: '10', title: 'Modificaciones',
    content: 'Espot puede modificar estos términos en cualquier momento. Los cambios entran en vigor al ser publicados.',
  },
  {
    num: '11', title: 'Ley Aplicable y Jurisdicción',
    content: 'Estos términos se rigen por las leyes de la República Dominicana. Cualquier disputa será conocida por los tribunales del Distrito Nacional.',
  },
]

export default function TerminosPage() {
  return (
    <div style={{ background: 'var(--bg-base)', minHeight: '100vh' }}>
      <div className="max-w-3xl mx-auto px-6 py-12">

        <Link href="/" className="inline-flex items-center gap-1.5 text-sm mb-8"
          style={{ color: 'var(--text-muted)' }}>
          <ArrowLeft size={14} /> Volver al inicio
        </Link>

        <div className="mb-10">
          <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>
            Términos y Condiciones
          </h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Última actualización: 20 de enero de 2026
          </p>
        </div>

        <div className="rounded-2xl p-8 mb-6"
          style={{ background: '#fff', border: '1px solid var(--border-subtle)', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            Bienvenido a <strong style={{ color: 'var(--text-primary)' }}>Espot.do</strong>, una plataforma digital
            propiedad de <strong style={{ color: 'var(--text-primary)' }}>ESPOT, S.R.L.</strong>, cuyo objetivo es
            conectar propietarios y administradores de espacios (en adelante, el Anfitrión) con personas o empresas
            interesadas en alquilarlos por horas o por un tiempo determinado (en adelante, el Huésped).
          </p>
          <p className="text-sm leading-relaxed mt-3" style={{ color: 'var(--text-secondary)' }}>
            Al acceder, registrarte o utilizar Espot.do, aceptas estos Términos y Condiciones y nuestra
            Política de Privacidad. Si no estás de acuerdo, por favor no utilices la plataforma.
          </p>
        </div>

        <div className="space-y-6">
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
            <Link href="/reembolso" style={{ color: 'var(--text-muted)' }}>Política de Reembolso</Link>
            <Link href="/cookies" style={{ color: 'var(--text-muted)' }}>Cookies</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
