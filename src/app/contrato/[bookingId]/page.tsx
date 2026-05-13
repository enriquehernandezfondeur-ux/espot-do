import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { formatCurrency, formatDate, formatTime } from '@/lib/utils'

export default async function ContratoPage({ params }: { params: Promise<{ bookingId: string }> }) {
  const { bookingId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return notFound()

  const { data: booking } = await supabase
    .from('bookings')
    .select(`
      *,
      spaces!space_id(name, address, city, sector, profiles!host_id(full_name, email, phone)),
      profiles!guest_id(full_name, email, phone),
      space_pricing!pricing_id(pricing_type, package_name, hourly_price, minimum_consumption, fixed_price),
      booking_addons(quantity, unit_price, subtotal, space_addons(name))
    `)
    .eq('id', bookingId)
    .single()

  // Verificar que el usuario es el cliente O el propietario del espacio
  if (!booking) return notFound()
  const spaceHostId = (booking as any).spaces?.profiles?.id ?? null
  const isGuest     = (booking as any).guest_id === user.id
  const isHost      = spaceHostId === user.id
  if (!isGuest && !isHost) return notFound()

  const space  = (booking as any).spaces as any
  const host   = space?.profiles as any
  const guest  = (booking as any).profiles as any
  const pricing = (booking as any).space_pricing as any
  const addons  = (booking as any).booking_addons ?? []

  const today = new Date().toLocaleDateString('es-DO', { day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <html lang="es">
    <head>
      <meta charSet="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>Contrato de Reserva — {bookingId.slice(0,8).toUpperCase()}</title>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: Georgia, 'Times New Roman', serif; color: #1a1a1a; background: #fff; font-size: 13px; line-height: 1.6; }
        .page { max-width: 720px; margin: 40px auto; padding: 48px; border: 1px solid #e0e0e0; }
        h1 { font-size: 22px; text-align: center; margin-bottom: 6px; letter-spacing: -0.02em; }
        .subtitle { text-align: center; color: #666; margin-bottom: 32px; font-style: italic; }
        .ref { text-align: center; margin-bottom: 32px; }
        .ref span { background: #f5f5f5; border: 1px solid #ddd; padding: 4px 12px; border-radius: 4px; font-family: monospace; font-size: 14px; }
        h2 { font-size: 14px; text-transform: uppercase; letter-spacing: 0.08em; margin: 28px 0 12px; padding-bottom: 4px; border-bottom: 1px solid #ddd; color: #333; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
        td { padding: 6px 10px; vertical-align: top; }
        td:first-child { width: 40%; color: #555; }
        td:last-child { font-weight: 600; }
        tr:nth-child(even) td { background: #fafafa; }
        .clause { margin-bottom: 12px; }
        .clause-title { font-weight: 700; margin-bottom: 4px; }
        .total-row td { font-size: 15px; font-weight: 700; padding-top: 10px; border-top: 2px solid #333; }
        .sigs { display: flex; gap: 48px; margin-top: 48px; }
        .sig { flex: 1; border-top: 1px solid #333; padding-top: 8px; text-align: center; font-size: 12px; color: #555; }
        .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #eee; font-size: 11px; color: #999; text-align: center; }
        @media print {
          body { margin: 0; }
          .page { border: none; margin: 0; padding: 32px; }
          .no-print { display: none !important; }
        }
      `}</style>
    </head>
    <body>
      <div className="page">

        <div className="no-print" style={{ marginBottom: 24, display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <button onClick={() => window.print()}
            style={{ padding: '8px 20px', background: '#35C493', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>
            Imprimir / Descargar PDF
          </button>
          <button onClick={() => window.close()}
            style={{ padding: '8px 16px', background: '#F4F6F8', border: '1px solid #ddd', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>
            Cerrar
          </button>
        </div>

        <h1>CONTRATO DE RESERVA DE ESPACIO PARA EVENTO</h1>
        <p className="subtitle">EspotHub · espothub.com</p>
        <div className="ref">Referencia: <span>{bookingId.slice(0,8).toUpperCase()}</span></div>

        <p style={{ marginBottom: 24, fontSize: 13, color: '#444' }}>
          En Santo Domingo, República Dominicana, a {today}, las partes identificadas a continuación
          celebran el presente contrato de reserva de espacio para evento, de conformidad con los términos
          y condiciones de la plataforma EspotHub.
        </p>

        <h2>1. PARTES</h2>
        <table>
          <tbody>
            <tr><td>Propietario del espacio</td><td>{host?.full_name ?? '—'}</td></tr>
            <tr><td>Correo del propietario</td><td>{host?.email ?? '—'}</td></tr>
            <tr><td>Cliente</td><td>{guest?.full_name ?? '—'}</td></tr>
            <tr><td>Correo del cliente</td><td>{guest?.email ?? '—'}</td></tr>
            {guest?.phone && <tr><td>Teléfono del cliente</td><td>{guest.phone}</td></tr>}
          </tbody>
        </table>

        <h2>2. ESPACIO Y EVENTO</h2>
        <table>
          <tbody>
            <tr><td>Espacio</td><td>{space?.name ?? '—'}</td></tr>
            {space?.address && <tr><td>Dirección</td><td>{space.address}, {space?.sector}, {space?.city}</td></tr>}
            <tr><td>Fecha del evento</td><td>{formatDate(booking.event_date)}</td></tr>
            {booking.start_time && <tr><td>Horario</td><td>{formatTime(booking.start_time)} – {formatTime(booking.end_time ?? '')}</td></tr>}
            <tr><td>Tipo de evento</td><td>{booking.event_type ?? '—'}</td></tr>
            <tr><td>Número de personas</td><td>{booking.guest_count}</td></tr>
            {pricing && <tr><td>Modalidad de precio</td><td>{
              pricing.pricing_type === 'hourly' ? `Por hora — ${formatCurrency(pricing.hourly_price)}/hr` :
              pricing.pricing_type === 'minimum_consumption' ? `Consumo mínimo — ${formatCurrency(pricing.minimum_consumption)}` :
              pricing.pricing_type === 'fixed_package' ? `Paquete fijo — ${pricing.package_name ?? 'Paquete'}` :
              'Precio personalizado (cotización)'
            }</td></tr>}
          </tbody>
        </table>

        <h2>3. DESGLOSE FINANCIERO</h2>
        <table>
          <tbody>
            <tr><td>Precio base del evento</td><td>{formatCurrency(Number(booking.base_price ?? booking.total_amount))}</td></tr>
            {addons.length > 0 && addons.map((a: any, i: number) => (
              <tr key={i}><td>{a.space_addons?.name ?? 'Adicional'}</td><td>{formatCurrency(a.subtotal)}</td></tr>
            ))}
            <tr className="total-row"><td>TOTAL DEL EVENTO</td><td>{formatCurrency(Number(booking.total_amount))}</td></tr>
          </tbody>
        </table>

        <h2>4. PLAN DE PAGOS</h2>
        <p style={{ marginBottom: 12, color: '#555' }}>
          Los pagos se realizan a través de la plataforma EspotHub con Azul Payments.
          El cliente recibe un plan de cuotas detallado en la plataforma al momento de la confirmación.
          Estado actual del pago: <strong>{booking.payment_status ?? 'Sin pago'}</strong>.
        </p>

        <h2>5. CLÁUSULAS GENERALES</h2>
        <div className="clause">
          <div className="clause-title">5.1 Cancelaciones</div>
          <p>El cliente puede cancelar su reserva desde su panel de usuario. Los reembolsos se aplicarán según la
          política de cancelación del espacio, visible en la plataforma. EspotHub actuará como intermediario
          en la devolución de los pagos procesados, descontando su comisión del 10%.</p>
        </div>
        <div className="clause">
          <div className="clause-title">5.2 Responsabilidades</div>
          <p>El cliente es responsable del uso adecuado del espacio, del cumplimiento de las reglas internas
          del propietario y de cualquier daño causado durante el evento. EspotHub es una plataforma tecnológica
          de intermediación y no asume responsabilidad directa por el estado o disponibilidad del espacio.</p>
        </div>
        <div className="clause">
          <div className="clause-title">5.3 Modificaciones</div>
          <p>Cualquier cambio en las condiciones del evento (fecha, horario, número de personas) debe realizarse
          a través de la plataforma EspotHub, con la aprobación expresa del propietario.</p>
        </div>
        <div className="clause">
          <div className="clause-title">5.4 Ley aplicable</div>
          <p>El presente contrato se rige por las leyes de la República Dominicana, específicamente la
          Ley 358-05 de Protección al Consumidor y las disposiciones del Código Civil dominicano.</p>
        </div>

        <div className="sigs">
          <div className="sig">
            <div style={{ marginBottom: 40 }}></div>
            <strong>{host?.full_name ?? 'Propietario del Espacio'}</strong><br />
            Propietario
          </div>
          <div className="sig">
            <div style={{ marginBottom: 40 }}></div>
            <strong>{guest?.full_name ?? 'Cliente'}</strong><br />
            Cliente / Reservante
          </div>
        </div>

        <div className="footer">
          Documento generado automáticamente por EspotHub (espothub.com) · Referencia: {bookingId} · {today}
        </div>
      </div>
    </body>
    </html>
  )
}
