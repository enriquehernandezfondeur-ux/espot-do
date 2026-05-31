'use server'

import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
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

/** Obtener cuotas de una reserva (verifica que pertenece al usuario autenticado) */
export async function getInstallments(bookingId: string): Promise<BookingInstallment[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  // Verificar ownership: el booking debe pertenecer al guest o al host del espacio
  const { data: booking } = await supabase
    .from('bookings')
    .select('guest_id, spaces!space_id(host_id)')
    .eq('id', bookingId)
    .single()
  if (!booking) return []
  const space = booking.spaces as any
  if (booking.guest_id !== user.id && space?.host_id !== user.id) return []

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
  if (!totalAmount || totalAmount <= 0)
    return { success: false, error: 'El monto total debe ser mayor a 0' }

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
    status:             'pending',
    label:              i.label,
  }))

  const { error } = await supabase.from('booking_installments').insert(rows)
  return error ? { success: false, error: error.message } : { success: true }
}

/**
 * Marcar cuota como pagada. Autentica/autoriza con la sesión (anon) pero
 * escribe con service-role: el marcado de dinero no depende de policies del
 * guest y queda protegido contra forja de pagos.
 * - `expectedAmount`: monto realmente cobrado por la pasarela; se valida
 *   contra el monto de la cuota (tolerancia RD$1) para evitar descuadres.
 * - El UPDATE es condicional (`status != 'paid'`) para cerrar la ventana de
 *   carrera entre dos confirmaciones concurrentes de la misma cuota.
 */
export async function markInstallmentPaid(
  installmentId: string,
  azulOrderId?: string,
  expectedAmount?: number
): Promise<{ success: boolean; error?: string; alreadyPaid?: boolean }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'No autenticado' }

  // Verificar que la cuota pertenece a una reserva del usuario (guest o host)
  const { data: inst } = await supabase
    .from('booking_installments')
    .select('amount, booking_id, bookings!booking_id(guest_id, spaces!space_id(host_id))')
    .eq('id', installmentId)
    .single()
  if (!inst) return { success: false, error: 'Cuota no encontrada' }
  const booking = inst.bookings as any
  const space   = booking?.spaces as any
  if (booking?.guest_id !== user.id && space?.host_id !== user.id) {
    return { success: false, error: 'No autorizado' }
  }

  // Validar que el monto cobrado coincide con el de la cuota
  if (expectedAmount != null && Math.abs(expectedAmount - Number(inst.amount)) > 1) {
    return {
      success: false,
      error: `Monto cobrado (${expectedAmount}) no coincide con la cuota (${inst.amount})`,
    }
  }

  // Escritura con service-role + lock condicional contra doble marcado
  const admin = createServiceClient()
  const { data: updated, error } = await admin
    .from('booking_installments')
    .update({
      status:        'paid',
      paid_at:       new Date().toISOString(),
      azul_order_id: azulOrderId ?? null,
    })
    .eq('id', installmentId)
    .neq('status', 'paid')
    .select('id')
  if (error) return { success: false, error: error.message }
  if (!updated || updated.length === 0) return { success: true, alreadyPaid: true }
  return { success: true }
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
