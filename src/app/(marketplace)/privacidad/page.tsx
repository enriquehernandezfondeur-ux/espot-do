import { type Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Política de Privacidad — EspotHub',
  description: 'Cómo EspotHub recopila, usa y protege tus datos personales.',
}

const sections = [
  {
    num: '1', title: 'Responsable del tratamiento',
    content: `ESPOT, S.R.L., con domicilio en la República Dominicana, es la empresa responsable del tratamiento de los datos personales recopilados a través de la plataforma EspotHub (espothub.com).

Contacto del responsable:
• Correo electrónico: contacto@espot.do
• Teléfono: +1 (829) 548-1998`,
  },
  {
    num: '2', title: 'Datos que recopilamos',
    content: `Recopilamos los siguientes datos cuando utilizas EspotHub:

Datos de registro:
• Nombre completo
• Correo electrónico
• Teléfono y WhatsApp (opcionales)
• Foto de perfil (opcional)

Datos de reserva:
• Fecha y horario del evento
• Número de personas
• Tipo de evento
• Notas adicionales al propietario

Datos técnicos:
• Dirección IP
• Tipo de dispositivo y navegador
• Páginas visitadas y tiempo de sesión (analytics anónimos)

Nota importante: EspotHub NO almacena, procesa ni tiene acceso a los datos de tarjetas de crédito o débito. Esos datos son procesados directamente por Azul Payments, certificado PCI-DSS.`,
  },
  {
    num: '3', title: 'Finalidad del tratamiento',
    content: `Usamos tus datos para:

• Gestionar tu cuenta de usuario y reservas.
• Enviar notificaciones de reserva, confirmaciones y recordatorios por correo electrónico.
• Facilitar la comunicación entre clientes y propietarios de espacios.
• Procesar pagos a través del procesador externo Azul Payments.
• Mejorar la experiencia de usuario en la plataforma.
• Cumplir con obligaciones legales aplicables en la República Dominicana.`,
  },
  {
    num: '4', title: 'Base legal para el tratamiento',
    content: `Tratamos tus datos con base en:

• Tu consentimiento explícito al registrarte y aceptar estos términos.
• La ejecución del contrato de prestación de servicios (reservas).
• El cumplimiento de obligaciones legales.
• Intereses legítimos de ESPOT S.R.L. para mejorar el servicio.`,
  },
  {
    num: '5', title: 'Compartir datos con terceros',
    content: `EspotHub no vende ni alquila tus datos personales. Solo los compartimos en los siguientes casos:

• Con Azul Payments: para procesar pagos con tarjeta (solo datos necesarios para la transacción).
• Con Resend (servicio de email): para enviar notificaciones de reservas.
• Con Supabase: infraestructura de base de datos segura donde se almacena la información.
• Por requerimiento legal: si una autoridad competente lo solicita conforme a las leyes dominicanas.

Todos nuestros proveedores están sujetos a acuerdos de confidencialidad y solo usan los datos para los fines indicados.`,
  },
  {
    num: '6', title: 'Seguridad de los datos',
    content: `Implementamos medidas técnicas y organizativas para proteger tus datos:

• Cifrado TLS 1.2 o superior (HTTPS) en todas las comunicaciones.
• Acceso restringido a datos personales por rol (solo personal autorizado).
• Autenticación segura mediante Supabase Auth.
• Datos de tarjetas: nunca almacenados en nuestros servidores — procesados por Azul Payments bajo estándares PCI-DSS.
• 3D Secure (Verified by Visa / Mastercard ID Check) en todos los pagos.

Para más detalles, visita nuestra Política de Seguridad de Pagos en /seguridad.`,
  },
  {
    num: '7', title: 'Tus derechos',
    content: `Como usuario tienes derecho a:

• Acceder a los datos que tenemos sobre ti.
• Rectificar datos incorrectos o desactualizados.
• Solicitar la eliminación de tu cuenta y datos personales.
• Oponerte al tratamiento de tus datos para fines de marketing.
• Portar tus datos a otro servicio.

Para ejercer estos derechos, escribe a contacto@espot.do con el asunto "Solicitud de Privacidad" y tu nombre completo y correo registrado. Respondemos en un máximo de 30 días hábiles.`,
  },
  {
    num: '8', title: 'Retención de datos',
    content: `Conservamos tus datos mientras mantengas una cuenta activa en EspotHub.

Al eliminar tu cuenta:
• Los datos personales se eliminan en un plazo de 30 días.
• Los registros de transacciones se conservan por 5 años para cumplir obligaciones fiscales y legales dominicanas.
• Los mensajes del chat se eliminan junto con la cuenta.`,
  },
  {
    num: '9', title: 'Cookies',
    content: `EspotHub utiliza cookies técnicas necesarias para el funcionamiento del sitio (sesión, autenticación) y cookies analíticas anónimas para mejorar la experiencia. Puedes gestionar las cookies en tu navegador o consultar nuestra Política de Cookies en /cookies.`,
  },
  {
    num: '10', title: 'Cambios en esta política',
    content: `Podemos actualizar esta política cuando sea necesario. Notificaremos cambios significativos por correo electrónico o mediante un aviso en la plataforma. La fecha de la última actualización aparece al inicio de esta página.`,
  },
]

export default function PrivacidadPage() {
  return (
    <div style={{ background: 'var(--bg-base)', minHeight: '100dvh' }}>
      <div className="max-w-3xl mx-auto px-4 md:px-6 py-8 md:py-12">

        <Link href="/" className="inline-flex items-center gap-1.5 text-sm mb-8"
          style={{ color: 'var(--text-muted)' }}>
          <ArrowLeft size={14} /> Volver al inicio
        </Link>

        <div className="mb-10">
          <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>
            Política de Privacidad
          </h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Última actualización: mayo 2026
          </p>
        </div>

        <div className="space-y-5">
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

        <div className="mt-10 pt-8 flex items-center justify-between text-xs flex-wrap gap-3"
          style={{ borderTop: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
          <span>© 2026 ESPOT, S.R.L. · República Dominicana</span>
          <div className="flex gap-4 flex-wrap">
            <Link href="/terminos" style={{ color: 'var(--text-muted)' }}>Términos y Condiciones</Link>
            <Link href="/reembolso" style={{ color: 'var(--text-muted)' }}>Reembolsos</Link>
            <Link href="/seguridad" style={{ color: 'var(--text-muted)' }}>Seguridad de pagos</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
