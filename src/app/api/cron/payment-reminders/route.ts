import { NextResponse } from 'next/server'
import { getUpcomingInstallments, markReminderSent, getInstallments } from '@/lib/actions/installments'
import { sendEmail } from '@/lib/email/send'
import { tplRecordatorioCuota, tplRecordatorioEvento, tplSolicitudResena } from '@/lib/email/templates'
import { daysUntilDate } from '@/lib/payments/schedule'
import { createClient } from '@/lib/supabase/server'

const SITE        = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://espothub.com'
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

  return NextResponse.json({ ok: true, sent, errors, ts: new Date().toISOString() })
}
