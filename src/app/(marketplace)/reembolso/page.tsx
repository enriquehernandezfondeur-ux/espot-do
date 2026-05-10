import { type Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Política de Reembolso',
  description: 'Política de reembolso y devoluciones de espot.do',
}

const sections = [
  {
    num: '1', title: 'Alcance de esta Política',
    content: `Esta Política de Reembolso regula las devoluciones relacionadas con pagos realizados a través de EspotHub (espot.do), plataforma de ESPOT, S.R.L. que conecta propietarios de espacios (Anfitriones) con quienes los reservan para eventos (Huéspedes).

Al utilizar Espot.do, el usuario acepta esta política como parte integral de los Términos y Condiciones.`,
  },
  {
    num: '2', title: 'Qué cobra Espot',
    content: `Espot procesa todos los pagos de cada reserva a través de Azul, incluyendo todas las cuotas del plan de pago. De cada pago procesado, Espot descuenta su comisión del 10% sobre el valor total de la reserva y transfiere el neto al Anfitrión en su cuenta bancaria registrada.

El monto de cada cuota varía según el plan generado automáticamente (basado en los días que faltan para el evento), pero la comisión total de Espot es siempre el 10% del valor total de la reserva.`,
  },
  {
    num: '3', title: 'Comisión No Reembolsable',
    content: `El anticipo del 10% pagado a Espot no es reembolsable, salvo en los siguientes casos excepcionales:

• Error técnico comprobable imputable directamente a Espot o a Azul (ej. cobro duplicado).
• Falla del sistema que impidió completar la reserva pero el cargo fue procesado igualmente.

En estos casos, el usuario debe contactar a contacto@espot.do dentro de los 7 días calendario siguientes al incidente, adjuntando el comprobante de pago y la descripción del problema.`,
  },
  {
    num: '4', title: 'Planes de Pago en Cuotas',
    content: `Algunas reservas permiten dividir el anticipo en cuotas programadas. En estos casos:

• Cada cuota tiene una fecha de vencimiento definida al momento de confirmar la reserva.
• El incumplimiento de una cuota puede resultar en la cancelación automática de la reserva según la política del Anfitrión.
• Las cuotas ya pagadas no son reembolsables, excepto por error técnico comprobable.
• El Huésped recibirá notificación por correo electrónico antes del vencimiento de cada cuota.`,
  },
  {
    num: '5', title: 'Cancelaciones y Política del Anfitrión',
    content: `Cada Anfitrión define su propia política de cancelación (flexible, moderada o estricta), que es visible antes de confirmar la reserva. El Huésped acepta estas condiciones al completar el pago.

• Si el Huésped cancela: se aplica la política de cancelación del Anfitrión sobre los pagos ya procesados. Espot gestionará la devolución si aplica según dicha política.
• Si el Anfitrión cancela: Espot procederá a reembolsar los pagos procesados al Huésped, descontando la comisión de plataforma no reembolsable.
• Espot no actúa como árbitro en disputas entre Anfitrión y Huésped.`,
  },
  {
    num: '6', title: 'Proceso de Solicitud de Reembolso',
    content: `Para solicitar un reembolso de la comisión de Espot (casos excepcionales):

1. Enviar un correo a contacto@espot.do con el asunto "Solicitud de Reembolso".
2. Incluir: nombre completo, correo de la cuenta, ID de la reserva y descripción del problema.
3. Adjuntar comprobante del cobro (número de transacción Azul).

El proceso de revisión puede tomar hasta 15 días laborables. Espot notificará el resultado por correo electrónico. Los reembolsos aprobados se procesan a través de Azul y pueden tardar entre 3 y 10 días hábiles adicionales según el banco emisor.`,
  },
  {
    num: '7', title: 'Fuerza Mayor',
    content: `Espot no será responsable por reembolsos en casos de fuerza mayor, incluyendo:

• Desastres naturales (huracanes, terremotos, inundaciones).
• Pandemias o restricciones sanitarias y gubernamentales.
• Fallas generalizadas de telecomunicaciones o electricidad.
• Huelgas, disturbios sociales u órdenes de autoridades.

En estos casos, Espot puede facilitar la comunicación entre las partes sin asumir obligación de reembolso.`,
  },
  {
    num: '8', title: 'Limitación de Responsabilidad',
    content: `• Espot no responde con fondos propios ante incumplimientos del Anfitrión.
• La responsabilidad máxima de Espot se limita al monto efectivamente procesado por la plataforma.
• Espot no garantiza reembolsos sobre montos en disputa entre Anfitrión y Huésped derivados del incumplimiento del servicio del espacio.`,
  },
  {
    num: '9', title: 'Ley Aplicable',
    content: 'Esta política se rige por las leyes de la República Dominicana. Cualquier controversia será sometida a los tribunales del Distrito Nacional.',
  },
]

export default function ReembolsoPage() {
  return (
    <div style={{ background: 'var(--bg-base)', minHeight: '100dvh' }}>
      <div className="max-w-3xl mx-auto px-4 md:px-6 py-8 md:py-12">

        <Link href="/" className="inline-flex items-center gap-1.5 text-sm mb-8"
          style={{ color: 'var(--text-muted)' }}>
          <ArrowLeft size={14} /> Volver al inicio
        </Link>

        <div className="mb-10">
          <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>
            Política de Reembolso
          </h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Última actualización: 10 de mayo de 2026
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
            <Link href="/terminos" style={{ color: 'var(--text-muted)' }}>Términos y Condiciones</Link>
            <Link href="/cookies" style={{ color: 'var(--text-muted)' }}>Cookies</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
