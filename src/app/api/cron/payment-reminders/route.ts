import { NextResponse } from 'next/server'
import { getUpcomingInstallments, markReminderSent, getOverdueInstallments } from '@/lib/actions/installments'
import { sendEmail } from '@/lib/email/send'
import { tplRecordatorioCuota } from '@/lib/email/templates'
import { daysUntilDate } from '@/lib/payments/schedule'

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://espot.do'
const CRON_SECRET = process.env.CRON_SECRET ?? ''

// GET /api/cron/payment-reminders
// Llamado por Vercel Cron cada día a las 9am
export async function GET(req: Request) {
  // Verificar que viene de Vercel Cron
  const authHeader = req.headers.get('authorization')
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let sent = 0
  let errors = 0

  // Recordatorios de 7 días
  const sevenDay = await getUpcomingInstallments(7)
  for (const inst of sevenDay) {
    if (inst.reminder_7d_sent) continue
    const booking = (inst as any).bookings
    const guest   = booking?.profiles
    if (!guest?.email) continue

    const daysLeft = daysUntilDate(inst.due_date)
    if (daysLeft > 7) continue // solo los de exactamente 7 días o menos

    try {
      await sendEmail({
        to:      guest.email,
        subject: `Recordatorio: pago ${inst.installment_number} vence en ${daysLeft} día${daysLeft !== 1 ? 's' : ''} — ${booking?.spaces?.name}`,
        html:    tplRecordatorioCuota({
          guestName:          guest.full_name ?? 'Cliente',
          spaceName:          booking?.spaces?.name ?? '—',
          eventDate:          booking?.event_date ?? '',
          installmentNumber:  inst.installment_number,
          totalInstallments:  3, // máximo posible
          amount:             inst.amount,
          dueDate:            inst.due_date,
          daysLeft,
          paymentUrl:         `${SITE}/pago/${booking?.id}?cuota=${inst.id}`,
        }),
      })
      await markReminderSent(inst.id, '7d')
      sent++
    } catch { errors++ }
  }

  // Recordatorios de 1 día
  const oneDay = await getUpcomingInstallments(1)
  for (const inst of oneDay) {
    if (inst.reminder_1d_sent) continue
    const booking = (inst as any).bookings
    const guest   = booking?.profiles
    if (!guest?.email) continue

    const daysLeft = daysUntilDate(inst.due_date)
    try {
      await sendEmail({
        to:      guest.email,
        subject: `Pago vence mañana — ${booking?.spaces?.name}`,
        html:    tplRecordatorioCuota({
          guestName:          guest.full_name ?? 'Cliente',
          spaceName:          booking?.spaces?.name ?? '—',
          eventDate:          booking?.event_date ?? '',
          installmentNumber:  inst.installment_number,
          totalInstallments:  3,
          amount:             inst.amount,
          dueDate:            inst.due_date,
          daysLeft,
          paymentUrl:         `${SITE}/pago/${booking?.id}?cuota=${inst.id}`,
        }),
      })
      await markReminderSent(inst.id, '1d')
      sent++
    } catch { errors++ }
  }

  return NextResponse.json({ ok: true, sent, errors, ts: new Date().toISOString() })
}
