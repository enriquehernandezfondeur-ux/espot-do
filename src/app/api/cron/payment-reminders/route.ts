import { NextResponse } from 'next/server'
import { getUpcomingInstallments, markReminderSent, getInstallments } from '@/lib/actions/installments'
import { sendEmail } from '@/lib/email/send'
import { tplRecordatorioCuota } from '@/lib/email/templates'
import { daysUntilDate } from '@/lib/payments/schedule'

const SITE        = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://espot.do'
const CRON_SECRET = process.env.CRON_SECRET ?? ''

// GET /api/cron/payment-reminders
// Vercel Cron — diariamente a las 9am RD (13:00 UTC)
export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization')
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let sent = 0
  let errors = 0

  async function sendReminder(
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

    // Obtener total real de cuotas para este booking
    const allInsts = await getInstallments(booking.id)
    const totalInstallments = allInsts.length

    const subject = reminderType === '1d'
      ? `Pago vence mañana — ${booking?.spaces?.name}`
      : `Recordatorio: pago vence en ${daysLeft} día${daysLeft !== 1 ? 's' : ''} — ${booking?.spaces?.name}`

    await sendEmail({
      to:   guest.email,
      subject,
      html: tplRecordatorioCuota({
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

  // Recordatorios de 7 días
  for (const inst of await getUpcomingInstallments(7)) {
    try { await sendReminder(inst, '7d', 'reminder_7d_sent') }
    catch { errors++ }
  }

  // Recordatorios de 1 día
  for (const inst of await getUpcomingInstallments(1)) {
    try { await sendReminder(inst, '1d', 'reminder_1d_sent') }
    catch { errors++ }
  }

  return NextResponse.json({ ok: true, sent, errors, ts: new Date().toISOString() })
}
