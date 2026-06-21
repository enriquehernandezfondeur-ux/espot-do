import { NextResponse } from 'next/server'
import { sendEmail, sendEmailIfEnabled } from '@/lib/email/send'
import { tplRecordatorioCuota, tplRecordatorioEvento, tplSolicitudResena, emailBase, infoBox } from '@/lib/email/templates'
import { daysUntilDate } from '@/lib/payments/schedule'
import { createServiceClient } from '@/lib/supabase/service'
import { formatDate, todayInRD, escapeHtml } from '@/lib/utils'
import { sendWhatsAppToUser, wa } from '@/lib/whatsapp/send'

const SITE        = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://espot.do'
const CRON_SECRET = process.env.CRON_SECRET ?? ''

// Fecha YYYY-MM-DD a N días de hoy en hora de RD (no UTC), estable sin importar el TZ del servidor.
function rdDateOffset(days: number): string {
  const d = new Date(todayInRD() + 'T12:00:00Z')
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().split('T')[0]
}

// GET /api/cron/payment-reminders
// Vercel Cron — diariamente a las 9am RD (13:00 UTC)
// vercel.json: { "crons": [{ "path": "/api/cron/payment-reminders", "schedule": "0 13 * * *" }] }
export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization')
  if (!CRON_SECRET || authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Service client bypasea RLS — el cron no tiene sesión de usuario
  const sb = createServiceClient()

  let sent = 0
  let errors = 0

  // ── 0. Marcar cuotas vencidas como overdue ──
  try {
    const today = todayInRD()
    const { data: overdueData, error: overdueError } = await sb
      .from('booking_installments')
      .update({ status: 'overdue' })
      .eq('status', 'pending')
      .lt('due_date', today)
      .select('id')
    if (overdueError) {
      console.error('[cron] overdue update failed:', overdueError.message)
    } else {
      console.info(`[cron] overdue marcadas: ${overdueData?.length ?? 0} cuotas actualizadas a 'overdue'`)
    }
  } catch (err: any) {
    console.error('[cron] overdue update exception:', err.message)
  }

  // ── 1. Auto-cancelar reservas accepted + unpaid con más de 72h sin pago ──

  let autoCancelled = 0

  try {
    const cutoff = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString()

    const { data: stale } = await sb
      .from('bookings')
      .select(`
        id, event_date,
        spaces!space_id(name, profiles!host_id(email, full_name)),
        profiles!guest_id(email, full_name)
      `)
      .eq('status', 'accepted')
      .eq('payment_status', 'unpaid')
      .not('accepted_at', 'is', null)
      .lt('accepted_at', cutoff)

    for (const bk of stale ?? []) {
      try {
        // Cancelar la reserva
        const { error: cancelErr } = await sb
          .from('bookings')
          .update({
            status: 'cancelled_host',
            cancelled_at: new Date().toISOString(),
            cancellation_reason: 'Auto-cancelado: pago no recibido en 72 horas',
          })
          .eq('id', bk.id)

        if (cancelErr) {
          console.error(`[cron] auto-cancel booking ${bk.id} failed:`, cancelErr.message)
          errors++
          continue
        }

        // Cancelar cuotas pendientes y vencidas
        await sb
          .from('booking_installments')
          .update({ status: 'cancelled' })
          .eq('booking_id', bk.id)
          .in('status', ['pending', 'overdue'])

        const space = (bk as any).spaces
        const guest = (bk as any).profiles
        const host  = space?.profiles

        // Email al cliente: reserva cancelada por falta de pago
        if (guest?.email) {
          await sendEmail({
            to:      guest.email,
            subject: `Tu reserva fue cancelada — ${space?.name ?? ''}`,
            html:    emailBase({
              title:       'Reserva cancelada por falta de pago',
              subtitle:    `No recibimos el pago para confirmar tu fecha en ${space?.name ?? ''}.`,
              accentColor: '#6B7280',
              body: `
                <p style="color:#374151;margin:0 0 16px;">Hola <strong>${guest.full_name ?? 'Cliente'}</strong>, tu reserva fue cancelada porque el pago no fue completado en las primeras 72 horas.</p>
                ${infoBox([
                  { label: 'Espacio',      value: space?.name ?? '—' },
                  { label: 'Fecha',        value: formatDate(bk.event_date) },
                  { label: 'Motivo',       value: 'Pago no recibido en 72 horas' },
                ])}
                <p style="color:#374151;margin:0 0 16px;">La fecha quedó libre. Si aún te interesa el espacio, puedes hacer una nueva solicitud.</p>
                <p style="color:#6B7280;font-size:13px;margin:0;">¿Tienes preguntas? Escríbenos a <a href="mailto:contacto@espot.do" style="color:var(--brand);">contacto@espot.do</a>.</p>`,
              cta: { text: 'Explorar espacios', url: `${SITE}/buscar` },
            }),
          })
          sent++
        }

        // Email al host: fecha liberada por falta de pago del cliente
        if (host?.email) {
          await sendEmail({
            to:      host.email,
            subject: `Fecha liberada — ${space?.name ?? ''} (pago no completado)`,
            html:    emailBase({
              title:       'La fecha volvió a estar disponible',
              subtitle:    `El cliente no completó el pago en 72 horas.`,
              accentColor: 'var(--brand)',
              body: `
                <p style="color:#374151;margin:0 0 16px;">Hola <strong>${host.full_name ?? 'Propietario'}</strong>, la reserva para el ${formatDate(bk.event_date)} en <strong>${space?.name ?? ''}</strong> fue cancelada automáticamente porque el cliente no completó el pago.</p>
                ${infoBox([
                  { label: 'Espacio',      value: space?.name ?? '—' },
                  { label: 'Fecha',        value: formatDate(bk.event_date) },
                  { label: 'Cliente',      value: guest?.full_name ?? '—' },
                  { label: 'Motivo',       value: 'Pago no recibido en 72 horas' },
                ])}
                <p style="color:#374151;margin:0;">La fecha <strong>${formatDate(bk.event_date)}</strong> volvió a estar disponible para nuevas reservas.</p>`,
              cta: { text: 'Ver mis reservas', url: `${SITE}/dashboard/host/agenda` },
            }),
          })
          sent++
        }

        autoCancelled++
      } catch (err: any) {
        console.error(`[cron] auto-cancel loop error for ${bk.id}:`, err.message)
        errors++
      }
    }

    if (autoCancelled > 0) {
      console.info(`[cron] auto-cancelled ${autoCancelled} reservas por falta de pago`)
    }
  } catch (err: any) {
    console.error('[cron] auto-cancel step failed:', err.message)
    errors++
  }

  // ── 2. Recordatorios de cuotas (7d y 1d antes de vencimiento) ──────────

  async function getUpcoming(daysAhead: number) {
    const targetStr = rdDateOffset(daysAhead)
    const { data } = await sb
      .from('booking_installments')
      .select(`
        id, installment_number, amount, due_date,
        reminder_7d_sent, reminder_1d_sent,
        bookings!booking_id(
          id, event_date, guest_id,
          spaces!space_id(name),
          profiles!guest_id(full_name, email, phone, whatsapp)
        )
      `)
      .eq('due_date', targetStr)
      .in('status', ['pending', 'overdue'])
    return data ?? []
  }

  async function markSent(id: string, type: '7d' | '1d') {
    const field = type === '7d' ? 'reminder_7d_sent' : 'reminder_1d_sent'
    await sb.from('booking_installments').update({ [field]: true }).eq('id', id)
  }

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

    const { data: allInsts } = await sb
      .from('booking_installments')
      .select('id')
      .eq('booking_id', booking.id)
    const totalInstallments = allInsts?.length ?? 1

    const subject = reminderType === '1d'
      ? `Pago vence mañana — ${booking?.spaces?.name}`
      : `Recordatorio: pago vence en ${daysLeft} día${daysLeft !== 1 ? 's' : ''} — ${booking?.spaces?.name}`

    await sendEmailIfEnabled(
      guest.email,
      subject,
      tplRecordatorioCuota({
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
      booking?.guest_id ?? undefined,
      'payment_reminders',
    )

    // WhatsApp solo en el recordatorio de 1d (más urgente)
    if (reminderType === '1d') {
      sendWhatsAppToUser(
        guest.whatsapp,
        guest.phone,
        wa.recordatorioCuota(
          guest.full_name ?? 'Cliente',
          booking?.spaces?.name ?? '—',
          formatDate(booking?.event_date ?? ''),
          inst.amount,
          booking?.id ?? '',
          inst.id,
        )
      ).catch(() => {})
    }

    await markSent(inst.id, reminderType)
    sent++
  }

  for (const inst of await getUpcoming(7)) {
    try { await sendPaymentReminder(inst, '7d', 'reminder_7d_sent') }
    catch { errors++ }
  }
  for (const inst of await getUpcoming(1)) {
    try { await sendPaymentReminder(inst, '1d', 'reminder_1d_sent') }
    catch { errors++ }
  }

  // ── 2. Recordatorio pre-evento (48h antes) ──────────────────────────────

  try {
    const supabase = sb
    // "Mañana" en hora RD (no UTC) para que coincida con la agenda del host
    const tomorrowStr = rdDateOffset(1)

    const { data: tomorrowBookings } = await supabase
      .from('bookings')
      .select(`
        id, event_date, start_time, end_time, guest_count, guest_id,
        spaces!space_id(name, address, city, sector, slug),
        profiles!guest_id(full_name, email, phone, whatsapp)
      `)
      .eq('event_date', tomorrowStr)
      .in('status', ['confirmed'])

    for (const bk of tomorrowBookings ?? []) {
      const guest = (bk as any).profiles
      const space = (bk as any).spaces
      if (!guest?.email) continue
      try {
        const spaceAddress = space?.address
          ? `${space.address}, ${space?.sector ?? ''}, ${space?.city ?? ''}`.trim().replace(/^, |, $/g, '')
          : (space?.city ?? '')

        await sendEmailIfEnabled(
          guest.email,
          `Tu evento es mañana — ${space?.name}`,
          tplRecordatorioEvento({
            guestName:    guest.full_name ?? 'Cliente',
            spaceName:    space?.name ?? '—',
            spaceAddress,
            eventDate:  bk.event_date,
            startTime:  bk.start_time ?? '',
            endTime:    bk.end_time   ?? '',
            guestCount: bk.guest_count ?? 0,
            bookingId:  bk.id,
          }),
          (bk as any).guest_id ?? undefined,
          'booking_updates',
        )
        sent++

        // WhatsApp: recordatorio pre-evento (día anterior)
        sendWhatsAppToUser(
          (guest as any).whatsapp,
          (guest as any).phone,
          wa.recordatorioEvento(
            guest.full_name ?? 'Cliente',
            space?.name ?? '—',
            spaceAddress,
            formatDate(bk.event_date),
            bk.start_time ?? '',
            bk.end_time   ?? '',
            bk.id,
          )
        ).catch(() => {})
      } catch { errors++ }
    }
  } catch (err: any) {
    console.error('[cron] pre-event reminders failed:', err.message)
    errors++
  }

  // ── 3. Solicitud de reseña (24-48h después del evento) ─────────────────

  try {
    const supabase = sb
    const yesterdayStr = rdDateOffset(-1)

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
    const supabase   = sb
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
                  <a href="${SITE}/dashboard/host/agenda" style="display:inline-block;background:var(--brand);color:#060D09;font-weight:700;font-size:14px;padding:14px 32px;border-radius:14px;text-decoration:none;">Responder solicitud &rarr;</a>
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

  // ── 5. Recordatorio pre-evento (48h) — eventos directos ───────────────────

  try {
    const tomorrowStr = rdDateOffset(1)

    const { data: directTomorrow } = await sb
      .from('external_events')
      .select(`
        id, title, event_date, start_time, end_time, guest_count, total_amount,
        client_name,
        client:host_clients(full_name, email),
        space:spaces(name, address, sector, city)
      `)
      .eq('event_date', tomorrowStr)
      .eq('status', 'confirmado')

    for (const ev of directTomorrow ?? []) {
      const client      = (ev as any).client as { full_name: string; email: string } | null
      const clientEmail = client?.email ?? null
      const clientName  = client?.full_name || (ev as any).client_name || 'Cliente'
      const space       = (ev as any).space as { name: string; address?: string; sector?: string; city?: string } | null
      if (!clientEmail) continue

      const spaceAddress = space?.address
        ? `${space.address}, ${space.sector ?? ''}, ${space.city ?? ''}`.replace(/^, |, $/g, '')
        : (space?.city ?? '')

      try {
        await sendEmail({
          to:      clientEmail,
          subject: `Tu evento es mañana — ${ev.title}`,
          html:    tplRecordatorioEvento({
            guestName:    clientName,
            spaceName:    space?.name ?? ev.title,
            spaceAddress,
            eventDate:    ev.event_date,
            startTime:    (ev as any).start_time ?? '',
            endTime:      (ev as any).end_time   ?? '',
            guestCount:   (ev as any).guest_count ?? 0,
            bookingId:    ev.id,
          }),
        })
        sent++
      } catch { errors++ }
    }
  } catch (err: any) {
    console.error('[cron] direct event pre-event reminders failed:', err.message)
    errors++
  }

  // ── 6. Solicitud de reseña — eventos directos (24-48h después) ────────────

  try {
    const yesterdayStr = rdDateOffset(-1)

    const { data: directPast } = await sb
      .from('external_events')
      .select(`
        id, title, event_date,
        client_name,
        client:host_clients(full_name, email)
      `)
      .eq('event_date', yesterdayStr)
      .in('status', ['confirmado', 'completado'])

    for (const ev of directPast ?? []) {
      const client      = (ev as any).client as { full_name: string; email: string } | null
      const clientEmail = client?.email ?? null
      const clientName  = client?.full_name || (ev as any).client_name || 'Cliente'
      if (!clientEmail) continue

      try {
        await sendEmail({
          to:      clientEmail,
          subject: `¿Cómo estuvo tu evento? — ${ev.title}`,
          html:    tplSolicitudResena({
            guestName:  clientName,
            spaceName:  ev.title,
            eventDate:  ev.event_date,
            bookingId:  ev.id,
            spaceSlug:  '',
          }),
        })
        sent++
      } catch { errors++ }
    }
  } catch (err: any) {
    console.error('[cron] direct event review requests failed:', err.message)
    errors++
  }

  // ── 7. Espot Pro: expiración automática + recordatorios ───────────────────
  // Barre suscripciones trialing/active vencidas → expired/cancelled (+ plan_type
  // free + auditoría) y envía recordatorios 14/7/3/1d. Dedupe por
  // subscription_notifications (índice único host+evento+periodo+canal).
  try {
    const DAY = 86_400_000
    const nowMs = Date.now()
    const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://espot.do'
    const { data: proSubs } = await sb.from('host_subscriptions')
      .select('id, host_id, status, current_period_end, cancel_at_period_end, activation_type, host:profiles!host_id(full_name, email)')
      .in('status', ['trialing', 'active'])
      .not('current_period_end', 'is', null)

    for (const s of (proSubs ?? []) as any[]) {
      const host = s.host as { full_name?: string; email?: string } | null
      const end = new Date(s.current_period_end).getTime()
      const isTrial = s.activation_type === 'trial'

      // Envío con dedupe: inserta una fila 'pending'; si choca con el índice
      // único, ya se envió ese aviso para este periodo → no reenvía.
      const notify = async (eventType: string, title: string, bodyHtml: string) => {
        const { error: insErr, data: row } = await sb.from('subscription_notifications')
          .insert({ host_id: s.host_id, subscription_id: s.id, event_type: eventType, channel: 'email', period_key: s.current_period_end, status: 'pending' })
          .select('id').maybeSingle()
        if (insErr || !row) return
        if (!host?.email) { await sb.from('subscription_notifications').update({ status: 'failed', error: 'sin email' }).eq('id', row.id); return }
        try {
          await sendEmail({ to: host.email, subject: title, html: emailBase({ title, subtitle: '', accentColor: '#B8860B', body: bodyHtml, cta: { text: 'Ver mi plan', url: `${SITE}/dashboard/host/pro` } }) })
          await sb.from('subscription_notifications').update({ status: 'sent', sent_at: new Date().toISOString() }).eq('id', row.id)
          sent++
        } catch (e: any) {
          await sb.from('subscription_notifications').update({ status: 'failed', error: String(e?.message ?? e) }).eq('id', row.id)
          errors++
        }
      }

      if (end <= nowMs) {
        const newStatus = s.cancel_at_period_end ? 'cancelled' : 'expired'
        const nowISO = new Date().toISOString()
        await sb.from('host_subscriptions').update({ status: newStatus, updated_at: nowISO, ...(newStatus === 'cancelled' ? { cancelled_at: nowISO } : {}) }).eq('id', s.id)
        await sb.from('profiles').update({ plan_type: 'free' }).eq('id', s.host_id)
        await sb.from('subscription_audit_log').insert({ host_id: s.host_id, subscription_id: s.id, admin_id: null, action: 'expirar', old_status: s.status, new_status: newStatus, note: 'Vencimiento automático (cron)' })
        await notify(isTrial ? 'prueba_terminada' : 'pro_vencido',
          isTrial ? 'Tu prueba de Espot Pro terminó' : 'Tu Espot Pro venció',
          `<p style="color:#374151;margin:0 0 16px;">Hola <strong>${escapeHtml(host?.full_name ?? '')}</strong>, tu ${isTrial ? 'prueba gratuita' : 'plan Espot Pro'} terminó. Tus datos (clientes, reservas externas, calendario) se conservan; las funciones Pro quedan en solo lectura. Puedes volver a Pro cuando quieras por RD$499/mes sin perder nada.</p>`)
        continue
      }

      const days = Math.ceil((end - nowMs) / DAY)
      if ([14, 7, 3, 1].includes(days)) {
        const when = days === 1 ? 'mañana' : `en ${days} días`
        const verbo = isTrial ? 'termina' : (s.cancel_at_period_end ? 'termina' : 'se renueva')
        await notify(`${isTrial ? 'prueba' : 'pro'}_${days}d`,
          isTrial ? `Tu prueba de Espot Pro termina ${when}` : `Tu Espot Pro ${verbo} ${when}`,
          `<p style="color:#374151;margin:0 0 16px;">Hola <strong>${escapeHtml(host?.full_name ?? '')}</strong>, tu ${isTrial ? 'prueba gratuita' : 'plan Pro'} ${verbo} ${when} (${formatDate(s.current_period_end)}).</p>`)
      }
    }
  } catch (err: any) {
    console.error('[cron] pro lifecycle failed:', err?.message)
    errors++
  }

  return NextResponse.json({ ok: true, sent, errors, autoCancelled, ts: new Date().toISOString() })
}
