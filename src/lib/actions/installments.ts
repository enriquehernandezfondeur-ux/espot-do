'use server'

import { createClient } from '@/lib/supabase/server'
import { buildSchedule } from '@/lib/payments/schedule'

export interface BookingInstallment {
  id:                 string
  booking_id:         string
  installment_number: number
  percentage:         number
  amount:             number
  due_date:           string
  status:             'pending' | 'paid' | 'overdue'
  paid_at:            string | null
  azul_order_id:      string | null
  reminder_7d_sent:   boolean
  reminder_1d_sent:   boolean
  created_at:         string
  label:              string | null
}

/** Obtener cuotas de una reserva */
export async function getInstallments(bookingId: string): Promise<BookingInstallment[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('booking_installments')
    .select('*')
    .eq('booking_id', bookingId)
    .order('installment_number')
  return (data ?? []) as BookingInstallment[]
}

/** Crear cuotas para una reserva (llamado al aceptar o al confirmar) */
export async function createInstallments(
  bookingId: string,
  eventDate: string,
  totalAmount: number
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  // No crear si ya existen
  const { data: existing } = await supabase
    .from('booking_installments')
    .select('id')
    .eq('booking_id', bookingId)
    .limit(1)
  if (existing && existing.length > 0) return { success: true }

  const schedule = buildSchedule(eventDate, totalAmount)

  const rows = schedule.installments.map(i => ({
    booking_id:         bookingId,
    installment_number: i.number,
    percentage:         i.percentage,
    amount:             i.amount,
    due_date:           i.due_date,
    status:             i.number === 1 ? 'pending' : 'pending',
    label:              i.label,
  }))

  const { error } = await supabase.from('booking_installments').insert(rows)
  return error ? { success: false, error: error.message } : { success: true }
}

/** Marcar cuota como pagada */
export async function markInstallmentPaid(
  installmentId: string,
  azulOrderId?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('booking_installments')
    .update({
      status:        'paid',
      paid_at:       new Date().toISOString(),
      azul_order_id: azulOrderId ?? null,
    })
    .eq('id', installmentId)
  return error ? { success: false, error: error.message } : { success: true }
}

/** Obtener cuotas vencidas pendientes de pago (para cron) */
export async function getOverdueInstallments() {
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]
  const { data } = await supabase
    .from('booking_installments')
    .select(`
      *,
      bookings!booking_id(
        id, event_date, event_type, total_amount,
        spaces!space_id(name),
        profiles!guest_id(full_name, email)
      )
    `)
    .eq('status', 'pending')
    .lt('due_date', today)
  return data ?? []
}

/** Obtener cuotas que vencen en los próximos días (para recordatorios) */
export async function getUpcomingInstallments(daysAhead: number) {
  const supabase = await createClient()
  const today    = new Date().toISOString().split('T')[0]
  const future   = new Date()
  future.setDate(future.getDate() + daysAhead)
  const futureStr = future.toISOString().split('T')[0]

  const { data } = await supabase
    .from('booking_installments')
    .select(`
      *,
      bookings!booking_id(
        id, event_date, event_type, total_amount,
        spaces!space_id(name),
        profiles!guest_id(full_name, email)
      )
    `)
    .eq('status', 'pending')
    .gte('due_date', today)
    .lte('due_date', futureStr)
  return data ?? []
}

/** Marcar que se envió recordatorio */
export async function markReminderSent(
  installmentId: string,
  type: '7d' | '1d'
): Promise<void> {
  const supabase = await createClient()
  await supabase
    .from('booking_installments')
    .update({ [`reminder_${type}_sent`]: true })
    .eq('id', installmentId)
}
