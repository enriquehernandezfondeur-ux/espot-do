import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { formatCurrency, formatDate, formatTime } from '@/lib/utils'
import ContratoButtons from './ContratoButtons'

export default async function ContratoPage({ params }: { params: Promise<{ bookingId: string }> }) {
  const { bookingId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return notFound()

  const { data: booking } = await supabase
    .from('bookings')
    .select(`
      *,
      spaces!space_id(name, address, city, sector, profiles!host_id(id, full_name, email, phone)),
      profiles!guest_id(full_name, email, phone),
      space_pricing!pricing_id(pricing_type, package_name, hourly_price, minimum_consumption, fixed_price),
      booking_addons(quantity, unit_price, subtotal, space_addons(name))
    `)
    .eq('id', bookingId)
    .single()

  if (!booking) return notFound()

  const space     = (booking as any).spaces as any
  const host      = space?.profiles as any
  const guest     = (booking as any).profiles as any
  const isGuest   = (booking as any).guest_id === user.id
  const isHost    = host?.id === user.id
  if (!isGuest && !isHost) return notFound()

  const pricing = (booking as any).space_pricing as any
  const addons  = (booking as any).booking_addons ?? []
  const today   = new Date().toLocaleDateString('es-DO', { day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Poppins', sans-serif; color: #1a1a1a; background: #f4f6f5; font-size: 13px; line-height: 1.6; }
        .page { max-width: 720px; margin: 32px auto; padding: 48px; background: #fff; border-radius: 12px; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
        h1 { font-size: 20px; text-align: center; margin-bottom: 4px; letter-spacing: -0.02em; font-weight: 700; }
        .subtitle { text-align: center; color: #888; margin-bottom: 28px; font-size: 12px; }
        .ref { text-align: center; margin-bottom: 28px; }
        .ref span { background: #f0fdf9; border: 1px solid rgba(53,196,147,0.3); padding: 4px 14px; border-radius: 20px; font-family: monospace; font-size: 13px; color: #065f46; font-weight: 700; }
        .intro { margin-bottom: 24px; font-size: 13px; color: #555; line-height: 1.7; padding: 16px; background: #f8fafc; border-radius: 8px; border-left: 3px solid #35C493; }
        h2 { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; margin: 28px 0 10px; padding-bottom: 6px; border-bottom: 2px solid #35C493; color: #03313C; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 4px; }
        td { padding: 7px 12px; vertical-align: top; font-size: 13px; }
        td:first-child { width: 42%; color: #666; font-weight: 400; }
        td:last-child { font-weight: 600; color: #1a1a1a; }
        tr:nth-child(even) td { background: #f8fafc; }
        .clause { margin-bottom: 14px; padding: 12px 14px; background: #f8fafc; border-radius: 8px; }
        .clause-title { font-weight: 700; margin-bottom: 4px; font-size: 13px; color: #03313C; }
        .clause p { color: #555; font-size: 12px; line-height: 1.6; }
        .total-row td { font-size: 15px; font-weight: 700; padding-top: 12px; border-top: 2px solid #03313C; color: #03313C; background: #f0fdf9 !important; }
        .sigs { display: flex; gap: 40px; margin-top: 48px; padding-top: 32px; border-top: 1px solid #e5e7eb; }
        .sig { flex: 1; text-align: center; font-size: 12px; color: #666; }
        .sig-line { height: 1px; background: #333; margin-bottom: 8px; }
        .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #f0f0f0; font-size: 10px; color: #bbb; text-align: center; }
        @media print {
          body { background: #fff; }
          .page { box-shadow: none; border-radius: 0; margin: 0; padding: 32px; }
          .no-print { display: none !important; }
        }
        @media (max-width: 768px) {
          .page { margin: 0; border-radius: 0; padding: 24px 16px; box-shadow: none; }
        }
      `}</style>

      <div className="page">

        <div className="no-print">
          <ContratoButtons />
        </div>

        <h1>CONTRATO DE RESERVA DE ESPACIO</h1>
        <p className="subtitle">espot.do · República Dominicana</p>
        <div className="ref">Referencia: <span>{bookingId.slice(0, 8).toUpperCase()}</span></div>

        <p className="intro">
          En Santo Domingo, República Dominicana, a {today}, las partes identificadas a continuación
          celebran el presente contrato de reserva de espacio para evento a través de la plataforma Espot (espot.do),
          de conformidad con sus términos y condiciones.
        </p>

        <h2>1. Las partes</h2>
        <table>
          <tbody>
            <tr><td>Propietario del espacio</td><td>{host?.full_name ?? '—'}</td></tr>
            {host?.email && <tr><td>Correo del propietario</td><td>{host.email}</td></tr>}
            <tr><td>Cliente / Reservante</td><td>{guest?.full_name ?? '—'}</td></tr>
            {guest?.email && <tr><td>Correo del cliente</td><td>{guest.email}</td></tr>}
            {guest?.phone && <tr><td>Teléfono del cliente</td><td>{guest.phone}</td></tr>}
          </tbody>
        </table>

        <h2>2. Espacio y evento</h2>
        <table>
          <tbody>
            <tr><td>Espacio</td><td>{space?.name ?? '—'}</td></tr>
            {space?.address && <tr><td>Dirección</td><td>{space.address}, {space?.sector}, {space?.city}</td></tr>}
            <tr><td>Fecha del evento</td><td>{formatDate(booking.event_date)}</td></tr>
            {booking.start_time && (
              <tr><td>Horario</td><td>{formatTime(booking.start_time)} – {formatTime(booking.end_time ?? '')}</td></tr>
            )}
            <tr><td>Tipo de evento</td><td>{booking.event_type ?? '—'}</td></tr>
            <tr><td>Número de invitados</td><td>{booking.guest_count} personas</td></tr>
            {pricing && (
              <tr><td>Modalidad de precio</td><td>{
                pricing.pricing_type === 'hourly'              ? `Por hora — ${formatCurrency(pricing.hourly_price)}/hr` :
                pricing.pricing_type === 'minimum_consumption' ? `Consumo mínimo — ${formatCurrency(pricing.minimum_consumption)}` :
                pricing.pricing_type === 'fixed_package'       ? `Paquete — ${pricing.package_name ?? 'Paquete fijo'}` :
                'Precio personalizado (cotización)'
              }</td></tr>
            )}
          </tbody>
        </table>

        <h2>3. Desglose financiero</h2>
        <table>
          <tbody>
            <tr><td>Precio base del evento</td><td>{formatCurrency(Number(booking.base_price ?? booking.total_amount))}</td></tr>
            {addons.length > 0 && addons.map((a: any, i: number) => (
              <tr key={i}><td>{a.space_addons?.name ?? 'Adicional'}</td><td>+ {formatCurrency(a.subtotal)}</td></tr>
            ))}
            <tr className="total-row"><td>TOTAL DEL EVENTO</td><td>{formatCurrency(Number(booking.total_amount))}</td></tr>
          </tbody>
        </table>

        <h2>4. Plan de pagos</h2>
        <table>
          <tbody>
            <tr><td>Procesado vía</td><td>Espot × Azul Payments (3D Secure)</td></tr>
            <tr><td>Estado actual del pago</td><td>{{
              unpaid:  'Sin pago registrado',
              advance: 'Anticipo pagado',
              partial: 'Pagos parciales realizados',
              paid:    'Pagado completo',
            }[(booking as any).payment_status as string] ?? (booking as any).payment_status ?? 'Pendiente'}</td></tr>
          </tbody>
        </table>
        <p style={{ fontSize: 12, color: '#777', marginTop: 8 }}>
          El cliente recibe el plan de cuotas detallado en la plataforma. Los pagos posteriores
          se realizan según las fechas establecidas en dicho plan.
        </p>

        <h2>5. Cláusulas generales</h2>

        <div className="clause">
          <div className="clause-title">5.1 Cancelaciones y reembolsos</div>
          <p>El cliente puede cancelar desde su panel en espot.do. Los reembolsos se aplican
          según la política de cancelación del espacio, visible antes de confirmar la reserva.
          Espot descuenta su comisión del 10% sobre los pagos procesados.</p>
        </div>

        <div className="clause">
          <div className="clause-title">5.2 Responsabilidades del cliente</div>
          <p>El cliente es responsable del uso adecuado del espacio, del cumplimiento de las
          reglas internas del propietario y de cualquier daño causado durante el evento.
          Espot es una plataforma de intermediación y no asume responsabilidad directa por
          el estado del espacio.</p>
        </div>

        <div className="clause">
          <div className="clause-title">5.3 Modificaciones</div>
          <p>Cualquier cambio (fecha, horario, personas) debe realizarse a través de espot.do
          con aprobación expresa del propietario. Cambios no aprobados pueden anular este contrato.</p>
        </div>

        <div className="clause">
          <div className="clause-title">5.4 Ley aplicable</div>
          <p>Este contrato se rige por las leyes de la República Dominicana, incluyendo la
          Ley 358-05 de Protección al Consumidor y el Código Civil dominicano.</p>
        </div>

        <div className="sigs">
          <div className="sig">
            <div style={{ height: 48 }} />
            <div className="sig-line" />
            <strong>{host?.full_name ?? 'Propietario del Espacio'}</strong><br />
            Propietario / Arrendador
          </div>
          <div className="sig">
            <div style={{ height: 48 }} />
            <div className="sig-line" />
            <strong>{guest?.full_name ?? 'Cliente'}</strong><br />
            Cliente / Reservante
          </div>
        </div>

        <div className="footer">
          Documento generado por Espot (espot.do) · Referencia: {bookingId.slice(0, 8).toUpperCase()} · {today}
        </div>

      </div>
    </>
  )
}
