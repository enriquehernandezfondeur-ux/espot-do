import { type Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Política de Reembolso',
  description: 'Política de reembolso y devoluciones de espot.do',
}

const sections = [
  {
    num: '1', title: 'Introducción',
    content: `La presente Política de Reembolso regula los términos bajo los cuales los usuarios de Espot.do, plataforma propiedad de ESPOT, S.R.L., pueden solicitar devoluciones relacionadas con reservas de espacios realizadas a través de la plataforma.

Al utilizar Espot.do, el usuario reconoce y acepta que esta política forma parte integral de los Términos y Condiciones.`,
  },
  {
    num: '2', title: 'Naturaleza de Espot',
    content: `Espot actúa únicamente como intermediario tecnológico, facilitando la conexión entre anfitriones (propietarios o administradores de espacios) y huéspedes (usuarios que realizan reservas).

Espot no es propietario, arrendador, operador ni administrador de los espacios, ni asume responsabilidad alguna sobre su estado, legalidad, permisos, seguridad, disponibilidad o condiciones de uso.`,
  },
  {
    num: '3', title: 'Procesamiento de Pagos',
    content: `El pago realizado a través de Espot.do corresponde únicamente al 10% del valor total de la reserva, el cual funciona como señal para asegurar la fecha y las horas reservadas.

El 90% restante del valor de la reserva no es cobrado ni administrado por Espot y cualquier pago, devolución o reclamo sobre dicho monto deberá gestionarse directamente entre el Huésped y el Anfitrión.

Todos los pagos se procesan de forma segura a través del proveedor Azul, bajo sus propios términos y condiciones.`,
  },
  {
    num: '4', title: 'Montos No Reembolsables',
    content: `El usuario reconoce expresamente que:

• El 10% pagado al momento de la reserva, correspondiente a la comisión de Espot, no es reembolsable bajo ninguna circunstancia.
• Este monto solo podrá ser reembolsado en casos excepcionales de error técnico comprobable atribuible directamente a Espot o al proveedor de pagos, lo cual será evaluado caso por caso.`,
  },
  {
    num: '5', title: 'Solicitudes de Reembolso',
    content: `Toda solicitud deberá enviarse por escrito a contacto@espot.do, incluyendo los datos de la reserva y la justificación correspondiente.

En los casos aplicables, el proceso de revisión podrá tomar hasta 15 días laborables, sujeto a validaciones técnicas y a los tiempos del sistema bancario.

Espot notificará el resultado de la solicitud por correo electrónico.`,
  },
  {
    num: '6', title: 'Responsabilidad del Anfitrión',
    content: `Cada Anfitrión es responsable de definir y publicar su propia política de cancelación y reembolso, la cual será visible antes de confirmar la reserva.

El Huésped acepta expresamente dichas condiciones al confirmar la reserva. Espot no interviene ni responde por disputas, incumplimientos o acuerdos entre Anfitrión y Huésped relacionados con cancelaciones o devoluciones.`,
  },
  {
    num: '7', title: 'Fuerza Mayor',
    content: `Espot no será responsable por reembolsos ni compensaciones en casos de fuerza mayor, incluyendo, pero no limitado a:

• Desastres naturales (huracanes, tormentas, terremotos).
• Pandemias, restricciones sanitarias o gubernamentales.
• Fallas eléctricas, de telecomunicaciones o accesos.
• Huelgas, disturbios sociales u órdenes de autoridad.

En estos casos, Espot podrá facilitar la comunicación entre las partes, sin asumir obligación de reembolso.`,
  },
  {
    num: '8', title: 'Limitación de Responsabilidad',
    content: `• Espot no garantiza la devolución de montos que no hayan sido cobrados por la plataforma.
• Espot no responde con fondos propios ante solicitudes de reembolso.
• Cualquier reclamo económico adicional deberá resolverse directamente entre Huésped y Anfitrión.`,
  },
  {
    num: '9', title: 'Ley Aplicable y Jurisdicción',
    content: 'Esta política se rige por las leyes de la República Dominicana. Cualquier controversia será sometida a los tribunales del Distrito Nacional.',
  },
]

export default function ReembolsoPage() {
  return (
    <div style={{ background: 'var(--bg-base)', minHeight: '100vh' }}>
      <div className="max-w-3xl mx-auto px-6 py-12">

        <Link href="/" className="inline-flex items-center gap-1.5 text-sm mb-8"
          style={{ color: 'var(--text-muted)' }}>
          <ArrowLeft size={14} /> Volver al inicio
        </Link>

        <div className="mb-10">
          <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>
            Política de Reembolso
          </h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Última actualización: 20 de enero de 2026
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
            <Link href="/terminos" style={{ color: 'var(--text-muted)' }}>Términos y Condiciones</Link>
            <Link href="/cookies" style={{ color: 'var(--text-muted)' }}>Cookies</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
