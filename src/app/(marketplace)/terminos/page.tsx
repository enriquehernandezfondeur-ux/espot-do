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
    content: `Espot (espot.do) es una plataforma digital propiedad de ESPOT, S.R.L. que actúa como intermediario tecnológico entre propietarios de espacios (Anfitriones) y personas o empresas que los buscan para realizar eventos (Huéspedes).

Los servicios que ofrece la plataforma incluyen:

• Publicación y gestión de espacios para eventos.
• Búsqueda y reserva de espacios por hora o por jornada.
• Cotizaciones personalizadas entre Anfitrión y Huésped.
• Planes de pago en cuotas para reservas de alto valor.
• Mensajería directa entre Anfitrión y Huésped.
• Herramientas de gestión para Anfitriones (calendario, finanzas, analytics).

Espot no es propietario, arrendador ni administrador de los espacios. La relación contractual del alquiler se establece directamente entre el Anfitrión y el Huésped.`,
  },
  {
    num: '2', title: 'Registro de Usuario',
    content: `Para reservar o publicar un espacio es necesario crear una cuenta en espot.do.

• La información proporcionada debe ser veraz y actualizada.
• El usuario es responsable de toda actividad realizada desde su cuenta.
• Los Anfitriones deben registrarse con datos reales del espacio y del negocio.
• Espot puede suspender o cancelar cuentas por uso indebido, información falsa o incumplimiento de estos términos.`,
  },
  {
    num: '3', title: 'Reservas y Cotizaciones',
    content: `Las reservas pueden realizarse de dos formas:

Reserva directa: El Huésped selecciona fecha, horario y servicios adicionales, y confirma la reserva con el pago del anticipo.

Cotización personalizada: El Huésped envía una solicitud al Anfitrión, quien responde con un precio. Una vez aceptado, el Huésped procede al pago del anticipo para confirmar.

El Anfitrión puede aceptar o rechazar cualquier solicitud antes de que el Huésped realice el pago. Una vez confirmada la reserva, ambas partes quedan sujetos a los términos acordados y a la política de cancelación del espacio.`,
  },
  {
    num: '4', title: 'Pagos, Comisión y Cuotas',
    content: `El plan de pago de una reserva se genera automáticamente según los días que faltan para el evento:

• Menos de 7 días: pago único del 100% al confirmar.
• De 7 a 30 días: 50% al confirmar y 50% en las 48 horas previas al evento.
• De 31 a 60 días: 30% al confirmar y 70% en las 48 horas previas.
• Más de 60 días: 25% al confirmar, 50% a los 60 días del evento, y 25% en las 48 horas previas.

Todos los pagos del plan de cuotas se procesan a través de espot.do vía Azul. De cada cuota procesada, Espot descuenta el 10% proporcional de ese pago como comisión, y transfiere el 90% restante al Anfitrión en su cuenta bancaria registrada. La comisión total de Espot equivale siempre al 10% del valor total de la reserva.

Espot no almacena datos sensibles de tarjetas. Todos los cobros son gestionados por Azul bajo sus propios estándares de seguridad.`,
  },
  {
    num: '5', title: 'Cancelaciones',
    content: `Cada Anfitrión define su propia política de cancelación (flexible, moderada o estricta), visible antes de confirmar la reserva.

• La comisión cobrada por Espot (10% del valor total) no es reembolsable, salvo error técnico comprobable imputable a Espot o a Azul.
• Los pagos ya procesados quedan sujetos a la política de cancelación del Anfitrión. Espot gestionará los reembolsos que procedan según dicha política.
• Espot no actúa como árbitro en disputas de servicio entre Anfitrión y Huésped.`,
  },
  {
    num: '6', title: 'Mensajería y Comunicación',
    content: `La plataforma incluye un sistema de mensajería directa entre Anfitrión y Huésped. Al utilizar este servicio:

• Las comunicaciones deben ser respetuosas y relacionadas con la reserva.
• Queda prohibido compartir información de contacto con el fin de eludir el uso de la plataforma.
• Espot puede monitorear conversaciones para garantizar el cumplimiento de estos términos y la seguridad de los usuarios.`,
  },
  {
    num: '7', title: 'Reseñas y Calificaciones',
    content: `Tras la realización de un evento, el Huésped puede dejar una reseña y calificación del espacio.

• Las reseñas deben ser verídicas y basadas en la experiencia real.
• Espot puede eliminar reseñas que contengan lenguaje ofensivo, información falsa o spam.
• El Anfitrión no puede solicitar la eliminación de reseñas negativas que sean legítimas.`,
  },
  {
    num: '8', title: 'Responsabilidades del Anfitrión',
    content: `El Anfitrión declara y garantiza que:

• Cuenta con los permisos legales para alquilar su espacio para eventos.
• Cumple con las obligaciones fiscales aplicables en la República Dominicana.
• El espacio es seguro, legal y apto para el uso ofrecido.
• La información publicada (fotos, precios, capacidad, horarios) es veraz y actualizada.

El Anfitrión es el único responsable frente a Huéspedes, autoridades y terceros por cualquier incidente, daño o incumplimiento, liberando a ESPOT, S.R.L. de toda responsabilidad.`,
  },
  {
    num: '9', title: 'Responsabilidades del Huésped',
    content: `El Huésped se compromete a:

• Usar el espacio de forma responsable y según el uso declarado al reservar.
• Respetar las normas, horarios y condiciones establecidos por el Anfitrión.
• No realizar actividades ilegales, peligrosas o no autorizadas.
• Asumir los daños causados al espacio durante la reserva.

El Huésped libera de responsabilidad a ESPOT, S.R.L. por cualquier incidente ocurrido antes, durante o después del uso del espacio.`,
  },
  {
    num: '10', title: 'Limitación de Responsabilidad',
    content: `ESPOT, S.R.L.:

• No garantiza la calidad, legalidad, seguridad ni disponibilidad de los espacios.
• No es responsable de accidentes, daños, pérdidas, lesiones ni conflictos ocurridos en los espacios.
• No garantiza la continuidad ininterrumpida de la plataforma.
• Su función se limita a proveer la tecnología de intermediación y cobrar su comisión del 10%.`,
  },
  {
    num: '11', title: 'Contenido Publicado y Propiedad Intelectual',
    content: `El Anfitrión es responsable de todo el contenido que publica (textos, fotos, videos). Espot puede eliminar contenido falso, engañoso o ilegal.

Todos los derechos sobre la plataforma, su diseño, código y marca pertenecen a ESPOT, S.R.L. Queda prohibida su reproducción o uso sin autorización escrita.`,
  },
  {
    num: '12', title: 'Política de Entrega del Servicio',
    content: `Espot es una plataforma digital de intermediación. La "entrega" del servicio consiste en:

• Confirmación de reserva: el servicio se activa inmediatamente tras la confirmación del pago de la primera cuota. El Huésped recibe un correo de confirmación con los detalles de la reserva.
• Acceso al espacio: el Anfitrión pone el espacio a disposición del Huésped en la fecha, hora y dirección acordadas en la reserva confirmada.
• No aplica entrega física de productos: Espot no envía ni entrega bienes materiales. El servicio es el acceso a un espacio para eventos en la República Dominicana.
• En caso de no poder acceder al espacio por causas imputables al Anfitrión, aplica la política de reembolso establecida en la Sección 5 de estos términos.`,
  },
  {
    num: '13', title: 'Privacidad de Datos',
    content: `ESPOT, S.R.L. trata los datos personales conforme a su Política de Privacidad disponible en espot.do/privacidad.

• Los datos personales (nombre, email, teléfono) se utilizan exclusivamente para gestionar reservas, enviar notificaciones y mejorar el servicio.
• No se venden ni comparten datos a terceros sin consentimiento, salvo requerimiento legal.
• Los datos de tarjetas de crédito/débito NO son almacenados por Espot. El procesamiento es realizado íntegramente por Azul Payments bajo sus estándares PCI-DSS.
• El usuario puede solicitar la eliminación de sus datos escribiendo a contacto@espothub.com.`,
  },
  {
    num: '14', title: 'Modificaciones y Ley Aplicable',
    content: `Espot puede modificar estos términos en cualquier momento. Los cambios entran en vigor al ser publicados en esta página. El uso continuado de la plataforma implica la aceptación de los términos vigentes.

Estos términos se rigen por las leyes de la República Dominicana. Cualquier disputa será conocida por los tribunales del Distrito Nacional.`,
  },
]

export default function TerminosPage() {
  return (
    <div style={{ background: 'var(--bg-base)', minHeight: '100dvh' }}>
      <div className="max-w-3xl mx-auto px-4 md:px-6 py-8 md:py-12">

        <Link href="/" className="inline-flex items-center gap-1.5 text-sm mb-8"
          style={{ color: 'var(--text-muted)' }}>
          <ArrowLeft size={14} /> Volver al inicio
        </Link>

        <div className="mb-10">
          <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>
            Términos y Condiciones
          </h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Última actualización: 10 de mayo de 2026
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
            <div key={s.num} className="rounded-2xl p-4 md:p-6"
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
