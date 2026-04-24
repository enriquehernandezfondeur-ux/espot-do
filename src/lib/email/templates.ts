import { formatCurrency, formatDate, formatTime } from '@/lib/utils'

interface BookingEmailData {
  guestName: string
  guestEmail: string
  hostName: string
  hostEmail: string
  spaceName: string
  spaceAddress: string
  eventDate: string
  startTime: string
  endTime: string
  eventType: string
  guestCount: number
  basePrice: number
  addonsTotal: number
  platformFee: number
  totalAmount: number
  selectedAddons: { name: string; price: number }[]
  bookingId: string
}

export function bookingConfirmationGuest(data: BookingEmailData): string {
  const addonRows = data.selectedAddons.length > 0
    ? data.selectedAddons.map(a => `
        <tr>
          <td style="padding:6px 0;color:#94a3b8;font-size:14px;">${a.name}</td>
          <td style="padding:6px 0;color:#94a3b8;font-size:14px;text-align:right;">${formatCurrency(a.price)}</td>
        </tr>`).join('')
    : ''

  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:40px 20px;">

    <!-- Logo -->
    <div style="text-align:center;margin-bottom:32px;">
      <div style="display:inline-flex;align-items:center;gap:8px;">
        <div style="width:36px;height:36px;background:linear-gradient(135deg,#7c3aed,#6d28d9);border-radius:10px;display:inline-flex;align-items:center;justify-content:center;">
          <span style="color:white;font-weight:bold;font-size:18px;">E</span>
        </div>
        <span style="color:white;font-size:22px;font-weight:bold;">espot<span style="color:#a78bfa;font-weight:300;">.do</span></span>
      </div>
    </div>

    <!-- Card -->
    <div style="background:#1e293b;border:1px solid #334155;border-radius:20px;overflow:hidden;">

      <!-- Header -->
      <div style="background:linear-gradient(135deg,#4c1d95,#7c3aed);padding:32px;text-align:center;">
        <div style="font-size:40px;margin-bottom:12px;">🎉</div>
        <h1 style="color:white;font-size:22px;font-weight:bold;margin:0 0 6px;">¡Reserva enviada!</h1>
        <p style="color:#c4b5fd;font-size:14px;margin:0;">Tu solicitud fue recibida. El propietario la confirmará pronto.</p>
      </div>

      <!-- Body -->
      <div style="padding:32px;">

        <p style="color:#e2e8f0;font-size:15px;margin:0 0 24px;">Hola <strong>${data.guestName}</strong>, aquí está el resumen de tu reserva:</p>

        <!-- Space info -->
        <div style="background:#0f172a;border:1px solid #1e293b;border-radius:14px;padding:20px;margin-bottom:20px;">
          <h2 style="color:white;font-size:17px;font-weight:bold;margin:0 0 4px;">${data.spaceName}</h2>
          <p style="color:#64748b;font-size:13px;margin:0 0 16px;">📍 ${data.spaceAddress}</p>

          <table style="width:100%;border-collapse:collapse;">
            <tr>
              <td style="padding:6px 0;color:#94a3b8;font-size:14px;">📅 Fecha</td>
              <td style="padding:6px 0;color:white;font-size:14px;text-align:right;font-weight:600;">${formatDate(data.eventDate)}</td>
            </tr>
            <tr>
              <td style="padding:6px 0;color:#94a3b8;font-size:14px;">⏰ Horario</td>
              <td style="padding:6px 0;color:white;font-size:14px;text-align:right;font-weight:600;">${formatTime(data.startTime)} – ${formatTime(data.endTime)}</td>
            </tr>
            <tr>
              <td style="padding:6px 0;color:#94a3b8;font-size:14px;">🎊 Tipo de evento</td>
              <td style="padding:6px 0;color:white;font-size:14px;text-align:right;">${data.eventType}</td>
            </tr>
            <tr>
              <td style="padding:6px 0;color:#94a3b8;font-size:14px;">👥 Personas</td>
              <td style="padding:6px 0;color:white;font-size:14px;text-align:right;">${data.guestCount}</td>
            </tr>
          </table>
        </div>

        <!-- Price breakdown -->
        <div style="background:#0f172a;border:1px solid #1e293b;border-radius:14px;padding:20px;margin-bottom:24px;">
          <h3 style="color:#94a3b8;font-size:11px;text-transform:uppercase;letter-spacing:1px;margin:0 0 12px;">Desglose de precio</h3>
          <table style="width:100%;border-collapse:collapse;">
            <tr>
              <td style="padding:6px 0;color:#94a3b8;font-size:14px;">Espacio</td>
              <td style="padding:6px 0;color:#94a3b8;font-size:14px;text-align:right;">${formatCurrency(data.basePrice)}</td>
            </tr>
            ${addonRows}
            <tr>
              <td style="padding:10px 0 6px;color:#e2e8f0;font-size:14px;border-top:1px solid #1e293b;">Total del evento</td>
              <td style="padding:10px 0 6px;color:white;font-size:14px;font-weight:bold;text-align:right;border-top:1px solid #1e293b;">${formatCurrency(data.totalAmount)}</td>
            </tr>
            <tr>
              <td style="padding:6px 0;color:#a78bfa;font-size:15px;font-weight:bold;">Pagado ahora (10%)</td>
              <td style="padding:6px 0;color:#a78bfa;font-size:15px;font-weight:bold;text-align:right;">${formatCurrency(data.platformFee)}</td>
            </tr>
          </table>
        </div>

        <!-- Next steps -->
        <div style="background:#1a1040;border:1px solid #4c1d95;border-radius:14px;padding:20px;margin-bottom:24px;">
          <h3 style="color:#a78bfa;font-size:13px;font-weight:600;margin:0 0 12px;">¿Qué sigue?</h3>
          <ul style="color:#c4b5fd;font-size:13px;margin:0;padding:0 0 0 16px;line-height:1.8;">
            <li>El propietario tiene 24 horas para confirmar tu reserva</li>
            <li>Recibirás un email de confirmación cuando sea aprobada</li>
            <li>Puedes contactar al propietario por mensajes en espot.do</li>
          </ul>
        </div>

        <p style="color:#475569;font-size:12px;text-align:center;margin:0;">
          Referencia: <strong style="color:#64748b;">${data.bookingId.slice(0,8).toUpperCase()}</strong>
        </p>
      </div>
    </div>

    <p style="color:#334155;font-size:12px;text-align:center;margin-top:24px;">
      © 2026 espot.do · República Dominicana
    </p>
  </div>
</body>
</html>`
}

export function newBookingHost(data: BookingEmailData): string {
  const addonsList = data.selectedAddons.length > 0
    ? data.selectedAddons.map(a => `<li>${a.name} — ${formatCurrency(a.price)}</li>`).join('')
    : '<li style="color:#64748b;">Sin adicionales</li>'

  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:40px 20px;">

    <!-- Logo -->
    <div style="text-align:center;margin-bottom:32px;">
      <div style="display:inline-flex;align-items:center;gap:8px;">
        <div style="width:36px;height:36px;background:linear-gradient(135deg,#7c3aed,#6d28d9);border-radius:10px;display:inline-flex;align-items:center;justify-content:center;">
          <span style="color:white;font-weight:bold;font-size:18px;">E</span>
        </div>
        <span style="color:white;font-size:22px;font-weight:bold;">espot<span style="color:#a78bfa;font-weight:300;">.do</span></span>
      </div>
    </div>

    <!-- Card -->
    <div style="background:#1e293b;border:1px solid #334155;border-radius:20px;overflow:hidden;">

      <!-- Header urgente -->
      <div style="background:linear-gradient(135deg,#065f46,#047857);padding:28px;text-align:center;">
        <div style="font-size:36px;margin-bottom:10px;">🔔</div>
        <h1 style="color:white;font-size:20px;font-weight:bold;margin:0 0 4px;">¡Nueva solicitud de reserva!</h1>
        <p style="color:#6ee7b7;font-size:13px;margin:0;">Tienes 24 horas para confirmar o rechazar</p>
      </div>

      <div style="padding:32px;">

        <p style="color:#e2e8f0;font-size:15px;margin:0 0 20px;">Hola <strong>${data.hostName}</strong>, alguien quiere reservar <strong>${data.spaceName}</strong>:</p>

        <!-- Guest info -->
        <div style="background:#0f172a;border:1px solid #1e293b;border-radius:14px;padding:20px;margin-bottom:20px;">
          <h3 style="color:#94a3b8;font-size:11px;text-transform:uppercase;letter-spacing:1px;margin:0 0 12px;">Cliente</h3>
          <p style="color:white;font-size:16px;font-weight:bold;margin:0 0 4px;">${data.guestName}</p>
          <p style="color:#64748b;font-size:13px;margin:0;">${data.guestEmail}</p>
        </div>

        <!-- Event details -->
        <div style="background:#0f172a;border:1px solid #1e293b;border-radius:14px;padding:20px;margin-bottom:20px;">
          <h3 style="color:#94a3b8;font-size:11px;text-transform:uppercase;letter-spacing:1px;margin:0 0 12px;">Detalles del evento</h3>
          <table style="width:100%;border-collapse:collapse;">
            <tr>
              <td style="padding:5px 0;color:#94a3b8;font-size:14px;">Evento</td>
              <td style="padding:5px 0;color:white;font-size:14px;text-align:right;font-weight:600;">${data.eventType}</td>
            </tr>
            <tr>
              <td style="padding:5px 0;color:#94a3b8;font-size:14px;">Fecha</td>
              <td style="padding:5px 0;color:white;font-size:14px;text-align:right;font-weight:600;">${formatDate(data.eventDate)}</td>
            </tr>
            <tr>
              <td style="padding:5px 0;color:#94a3b8;font-size:14px;">Horario</td>
              <td style="padding:5px 0;color:white;font-size:14px;text-align:right;">${formatTime(data.startTime)} – ${formatTime(data.endTime)}</td>
            </tr>
            <tr>
              <td style="padding:5px 0;color:#94a3b8;font-size:14px;">Personas</td>
              <td style="padding:5px 0;color:white;font-size:14px;text-align:right;">${data.guestCount}</td>
            </tr>
          </table>
          ${data.selectedAddons.length > 0 ? `
          <div style="margin-top:12px;padding-top:12px;border-top:1px solid #1e293b;">
            <p style="color:#94a3b8;font-size:13px;margin:0 0 6px;">Adicionales solicitados:</p>
            <ul style="color:#e2e8f0;font-size:13px;margin:0;padding:0 0 0 16px;line-height:1.8;">${addonsList}</ul>
          </div>` : ''}
        </div>

        <!-- Revenue -->
        <div style="background:#052e16;border:1px solid #14532d;border-radius:14px;padding:20px;margin-bottom:24px;">
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <div>
              <p style="color:#86efac;font-size:12px;margin:0 0 4px;">Valor total del evento</p>
              <p style="color:white;font-size:28px;font-weight:bold;margin:0;">${formatCurrency(data.totalAmount)}</p>
            </div>
            <div style="text-align:right;">
              <p style="color:#86efac;font-size:12px;margin:0 0 4px;">Ya pagaron (plataforma)</p>
              <p style="color:#4ade80;font-size:18px;font-weight:bold;margin:0;">${formatCurrency(data.platformFee)}</p>
            </div>
          </div>
        </div>

        <!-- CTA -->
        <div style="text-align:center;">
          <a href="https://espot.do/dashboard/reservas" style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#6d28d9);color:white;font-size:15px;font-weight:bold;padding:14px 32px;border-radius:12px;text-decoration:none;">
            Ver reserva en el panel →
          </a>
          <p style="color:#475569;font-size:12px;margin-top:16px;">
            Ref: <strong style="color:#64748b;">${data.bookingId.slice(0,8).toUpperCase()}</strong>
          </p>
        </div>
      </div>
    </div>

    <p style="color:#334155;font-size:12px;text-align:center;margin-top:24px;">
      © 2026 espot.do · República Dominicana
    </p>
  </div>
</body>
</html>`
}
