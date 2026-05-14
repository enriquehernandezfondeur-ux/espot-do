import { NextResponse } from 'next/server'
import { getUpcomingInstallments, markReminderSent, getInstallments } from '@/lib/actions/installments'
import { sendEmail } from '@/lib/email/send'
import { tplRecordatorioCuota, tplRecordatorioEvento, tplSolicitudResena } from '@/lib/email/templates'
import { daysUntilDate } from '@/lib/payments/schedule'
import { createClient } from '@/lib/supabase/server'

const SITE        = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://espot.do'
const CRON_SECRET = process.env.CRON_SECRET ?? ''

// GET /api/cron/payment-reminders
// Vercel Cron — diariamente a las 9am RD (13:00 UTC)
// vercel.json: { "crons": [{ "path": "/api/cron/payment-reminders", "schedule": "0 13 * * *" }] }
export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization')
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let sent = 0
  let errors = 0

  // ── 1. Recordatorios de cuotas (7d y 1d antes de vencimiento) ──────────

  async function sendPaymentReminder(
    inst: any,
    reminderType: '7d' | '1d',
    alreadySentField: 'reminder_7d_sent' | 'reminder_1d_sent'
  ) {
    if (inst[alreadySentField]) return
    const booking = inst.bookings
    const guest   = booking?.profiles
    if (!guest?.email) return

    const daysLeft = daysUntilDate(inst.due_date)
    if (reminderType === '7d' && daysLeft > 7) return

    const allInsts        = await getInstallments(booking.id)
    const totalInstallments = allInsts.length

    const subject = reminderType === '1d'
      ? `Pago vence mañana — ${booking?.spaces?.name}`
      : `Recordatorio: pago vence en ${daysLeft} día${daysLeft !== 1 ? 's' : ''} — ${booking?.spaces?.name}`

    await sendEmail({
      to:      guest.email,
      subject,
      html:    tplRecordatorioCuota({
        guestName:         guest.full_name ?? 'Cliente',
        spaceName:         booking?.spaces?.name ?? '—',
        eventDate:         booking?.event_date ?? '',
        installmentNumber: inst.installment_number,
        totalInstallments,
        amount:            inst.amount,
        dueDate:           inst.due_date,
        daysLeft,
        paymentUrl:        `${SITE}/pago/${booking?.id}?cuota=${inst.id}`,
      }),
    })
    await markReminderSent(inst.id, reminderType)
    sent++
  }

  for (const inst of await getUpcomingInstallments(7)) {
    try { await sendPaymentReminder(inst, '7d', 'reminder_7d_sent') }
    catch { errors++ }
  }
  for (const inst of await getUpcomingInstallments(1)) {
    try { await sendPaymentReminder(inst, '1d', 'reminder_1d_sent') }
    catch { errors++ }
  }

  // ── 2. Recordatorio pre-evento (48h antes) ──────────────────────────────

  try {
    const supabase = await createClient()
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowStr = tomorrow.toISOString().split('T')[0]

    const { data: tomorrowBookings } = await supabase
      .from('bookings')
      .select(`
        id, event_date, start_time, end_time, guest_count,
        spaces!space_id(name, address, city, sector, slug),
        profiles!guest_id(full_name, email)
      `)
      .eq('event_date', tomorrowStr)
      .in('status', ['confirmed'])

    for (const bk of tomorrowBookings ?? []) {
      const guest = (bk as any).profiles
      const space = (bk as any).spaces
      if (!guest?.email) continue
      try {
        await sendEmail({
          to:      guest.email,
          subject: `Tu evento es mañana — ${space?.name}`,
          html:    tplRecordatorioEvento({
            guestName:    guest.full_name ?? 'Cliente',
            spaceName:    space?.name ?? '—',
            spaceAddress: space?.address
              ? `${space.address}, ${space?.sector ?? ''}, ${space?.city ?? ''}`.trim().replace(/^, |, $/g, '')
              : (space?.city ?? ''),
            eventDate:  bk.event_date,
            startTime:  bk.start_time ?? '',
            endTime:    bk.end_time   ?? '',
            guestCount: bk.guest_count ?? 0,
            bookingId:  bk.id,
          }),
        })
        sent++
      } catch { errors++ }
    }
  } catch (err: any) {
    console.error('[cron] pre-event reminders failed:', err.message)
    errors++
  }

  // ── 3. Solicitud de reseña (24-48h después del evento) ─────────────────

  try {
    const supabase = await createClient()
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayStr = yesterday.toISOString().split('T')[0]

    const { data: pastBookings } = await supabase
      .from('bookings')
      .select(`
        id, event_date,
        spaces!space_id(name, slug),
        profiles!guest_id(full_name, email)
      `)
      .eq('event_date', yesterdayStr)
      .in('status', ['confirmed', 'completed'])
      .in('payment_status', ['advance', 'partial', 'paid'])

    // Verificar cuáles ya tienen reseña
    const bookingIds = (pastBookings ?? []).map((b: any) => b.id)
    const { data: existingReviews } = await supabase
      .from('reviews')
      .select('booking_id')
      .in('booking_id', bookingIds)

    const reviewedSet = new Set((existingReviews ?? []).map((r: any) => r.booking_id))

    for (const bk of pastBookings ?? []) {
      if (reviewedSet.has(bk.id)) continue  // ya dejó reseña
      const guest = (bk as any).profiles
      const space = (bk as any).spaces
      if (!guest?.email) continue
      try {
        await sendEmail({
          to:      guest.email,
          subject: `¿Cómo estuvo tu evento en ${space?.name}?`,
          html:    tplSolicitudResena({
            guestName:  guest.full_name ?? 'Cliente',
            spaceName:  space?.name ?? '—',
            eventDate:  bk.event_date,
            bookingId:  bk.id,
            spaceSlug:  space?.slug ?? '',
          }),
        })
        sent++
      } catch { errors++ }
    }
  } catch (err: any) {
    console.error('[cron] review requests failed:', err.message)
    errors++
  }

  // ── 4. SLA 48h: recordatorio a host que no ha respondido reservas pendientes ────

  try {
    const supabase   = await createClient()
    const cutoff48h  = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()
    const cutoff72h  = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString()

    const { data: pendingBookings } = await supabase
      .from('bookings')
      .select(`
        id, event_type, event_date, guest_count, created_at,
        spaces!space_id(name, profiles!host_id(full_name, email)),
        profiles!guest_id(full_name)
      `)
      .eq('status', 'pending')
      .lt('created_at', cutoff48h)   // más de 48h sin respuesta
      .gt('created_at', cutoff72h)   // pero menos de 72h (solo enviar una vez)

    for (const bk of pendingBookings ?? []) {
      const space     = (bk as any).spaces
      const host      = space?.profiles
      const guest     = (bk as any).profiles
      if (!host?.email) continue
      try {
        await sendEmail({
          to:      host.email,
          subject: `Tienes una solicitud pendiente de respuesta — ${space?.name}`,
          html:    `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body style="font-family:Arial,sans-serif;background:#F2F4F3;margin:0;padding:40px 20px;">
            <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,0.07);">
              <div style="height:5px;background:#F59E0B;"></div>
              <div style="padding:32px 36px;">
                <h2 style="color:#0F1623;font-size:19px;margin:0 0 8px;letter-spacing:-0.02em;">Solicitud pendiente de respuesta</h2>
                <p style="color:#6B7280;font-size:14px;margin:0 0 20px;">Hola <strong>${host.full_name ?? 'Propietario'}</strong>, tienes una solicitud de reserva que lleva más de 48 horas sin respuesta.</p>
                <table style="width:100%;border-collapse:collapse;margin-bottom:24px;border:1px solid #E8ECF0;border-radius:12px;overflow:hidden;">
                  <tr><td style="padding:10px 16px;background:#FAFBFC;color:#6B7280;font-size:13px;border-bottom:1px solid #F0F2F5;">Espacio</td><td style="padding:10px 16px;font-size:13px;font-weight:600;color:#0F1623;border-bottom:1px solid #F0F2F5;">${space?.name ?? '—'}</td></tr>
                  <tr><td style="padding:10px 16px;background:#FAFBFC;color:#6B7280;font-size:13px;border-bottom:1px solid #F0F2F5;">Cliente</td><td style="padding:10px 16px;font-size:13px;font-weight:600;color:#0F1623;border-bottom:1px solid #F0F2F5;">${guest?.full_name ?? 'Cliente'}</td></tr>
                  <tr><td style="padding:10px 16px;background:#FAFBFC;color:#6B7280;font-size:13px;">Fecha del evento</td><td style="padding:10px 16px;font-size:13px;font-weight:600;color:#0F1623;">${bk.event_date}</td></tr>
                </table>
                <p style="color:#92400E;font-size:13px;background:#FEF3C7;border:1px solid #FDE68A;border-radius:10px;padding:12px 16px;margin:0 0 24px;">Si no respondes en las próximas 24 horas, la solicitud podría cancelarse automáticamente y el cliente buscará otra opción.</p>
                <div style="text-align:center;">
                  <a href="${SITE}/dashboard/host/reservas" style="display:inline-block;background:#35C493;color:#060D09;font-weight:700;font-size:14px;padding:14px 32px;border-radius:14px;text-decoration:none;">Responder solicitud &rarr;</a>
                </div>
              </div>
            </div>
          </body></html>`,
        })
        sent++
      } catch { errors++ }
    }
  } catch (err: any) {
    console.error('[cron] SLA reminders failed:', err.message)
    errors++
  }

  return NextResponse.json({ ok: true, sent, errors, ts: new Date().toISOString() })
}
