'use server'

import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { revalidatePath } from 'next/cache'
import { sendEmail } from '@/lib/email/send'
import { emailBase, infoBox } from '@/lib/email/templates'
import { formatCurrency, formatDate, escapeHtml } from '@/lib/utils'
import { platformFeeOf, hostNetOf } from '@/lib/pricing'

const SUPERADMIN_EMAIL = process.env.SUPERADMIN_EMAIL ?? 'enriquehernandezfondeur@gmail.com'

async function requireAdmin() {
  // Verificar identidad con cliente anon (lee la sesión del usuario)
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  if (user.email !== SUPERADMIN_EMAIL) {
    const { data } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (data?.role !== 'admin') return null
  }

  // Las acciones de admin requieren service_role para bypassar RLS de forma segura
  try {
    return createServiceClient()
  } catch {
    console.error('[requireAdmin] SUPABASE_SERVICE_ROLE_KEY no configurada — acceso admin denegado')
    return null
  }
}

// ── OBTENER ESPACIO COMPLETO ─────────────────────────────
export async function getAdminSpaceById(id: string) {
  const supabase = await requireAdmin()
  if (!supabase) return null

  const { data } = await supabase
    .from('spaces')
    .select(`
      *,
      profiles!host_id(full_name, email),
      space_pricing(*),
      space_addons(*),
      space_conditions(*),
      space_payment_terms(*),
      space_time_blocks(*),
      space_images(*)
    `)
    .eq('id', id)
    .single()

  return data
}

// ── EDICIÓN COMPLETA DEL ESPACIO ─────────────────────────
export async function adminUpdateSpace(spaceId: string, payload: {
  name?: string; description?: string; category?: string
  capacity_min?: number | null; capacity_max?: number
  address?: string; sector?: string; city?: string
}) {
  const supabase = await requireAdmin()
  if (!supabase) return { error: 'No autorizado' }
  const { error } = await supabase.from('spaces').update(payload).eq('id', spaceId)
  if (!error) {
    revalidatePath('/buscar')
    revalidatePath('/espacios', 'layout')
    revalidatePath('/', 'layout')
  }
  return error ? { error: error.message } : { success: true }
}

function revalidateSpace() {
  revalidatePath('/espacios', 'layout')
  revalidatePath('/admin/espacios')
}

export async function adminUpsertPricing(spaceId: string, pricingId: string | null, payload: Record<string, unknown>) {
  const supabase = await requireAdmin()
  if (!supabase) return { error: 'No autorizado' }
  if (pricingId) {
    const { error } = await supabase.from('space_pricing').update(payload).eq('id', pricingId)
    if (error) return { error: error.message }
    revalidateSpace()
    return { success: true }
  }
  const { data, error } = await supabase.from('space_pricing')
    .insert({ ...payload, space_id: spaceId, is_active: true, platform_fee_pct: 10 })
    .select('id').single()
  if (error) return { error: error.message }
  revalidateSpace()
  return { success: true, id: data?.id }
}

export async function adminUpsertConditions(spaceId: string, conditionsId: string | null, payload: Record<string, unknown>) {
  const supabase = await requireAdmin()
  if (!supabase) return { error: 'No autorizado' }
  if (conditionsId) {
    const { error } = await supabase.from('space_conditions').update(payload).eq('id', conditionsId)
    if (error) return { error: error.message }
    revalidateSpace()
    return { success: true }
  }
  const { data, error } = await supabase.from('space_conditions')
    .insert({ ...payload, space_id: spaceId })
    .select('id').single()
  if (error) return { error: error.message }
  revalidateSpace()
  return { success: true, id: data?.id }
}

export async function adminUpsertPaymentTerms(spaceId: string, termId: string | null, payload: Record<string, unknown>) {
  const supabase = await requireAdmin()
  if (!supabase) return { error: 'No autorizado' }
  if (termId) {
    const { error } = await supabase.from('space_payment_terms').update(payload).eq('id', termId)
    if (error) return { error: error.message }
    revalidateSpace()
    return { success: true }
  }
  const { data, error } = await supabase.from('space_payment_terms')
    .insert({ ...payload, space_id: spaceId })
    .select('id').single()
  if (error) return { error: error.message }
  revalidateSpace()
  return { success: true, id: data?.id }
}

export async function adminUpsertAddon(spaceId: string, addon: { id?: string; name: string; price: number; unit: string; category: string }) {
  const supabase = await requireAdmin()
  if (!supabase) return { error: 'No autorizado' }
  if (addon.id) {
    const { id, ...updateData } = addon
    const { error } = await supabase.from('space_addons').update(updateData).eq('id', id)
    if (error) return { error: error.message }
    revalidateSpace()
    return { success: true }
  }
  const { data, error } = await supabase.from('space_addons').insert({ ...addon, space_id: spaceId, is_available: true }).select('id').single()
  if (error) return { error: error.message }
  revalidateSpace()
  return { success: true, id: data?.id }
}

export async function adminDeleteAddon(addonId: string) {
  const supabase = await requireAdmin()
  if (!supabase) return { error: 'No autorizado' }
  const { error } = await supabase.from('space_addons').delete().eq('id', addonId)
  if (error) return { error: error.message }
  revalidateSpace()
  return { success: true }
}

// ── MÉTRICAS DEL DASHBOARD ──────────────────────────────
export async function getAdminStats() {
  const supabase = await requireAdmin()
  if (!supabase) return null

  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()

  const [spaces, bookings, profiles, payments, pendingSpaces, pendingBookings, monthRevenue, hosts, admins] = await Promise.all([
    supabase.from('spaces').select('id', { count: 'exact', head: true }),
    supabase.from('bookings').select('id', { count: 'exact', head: true }),
    supabase.from('profiles').select('id', { count: 'exact', head: true }),
    supabase.from('bookings').select('total_amount').in('payment_status', ['advance', 'partial', 'paid']),
    supabase.from('spaces').select('id', { count: 'exact', head: true }).eq('is_published', false).eq('is_active', true),
    supabase.from('bookings').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('bookings').select('total_amount').in('payment_status', ['advance', 'partial', 'paid']).gte('created_at', monthStart),
    supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'host'),
    supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'admin'),
  ])

  const totalRevenue   = (payments.data ?? []).reduce((s, b) => s + platformFeeOf(b), 0)
  const monthlyRevenue = (monthRevenue.data ?? []).reduce((s, b) => s + platformFeeOf(b), 0)

  return {
    totalSpaces:      spaces.count ?? 0,
    pendingSpaces:    pendingSpaces.count ?? 0,
    totalBookings:    bookings.count ?? 0,
    pendingBookings:  pendingBookings.count ?? 0,
    totalUsers:       profiles.count ?? 0,
    totalHosts:       hosts.count ?? 0,
    totalAdmins:      admins.count ?? 0,
    totalRevenue,
    monthlyRevenue,
  }
}

/** Conteos de lo pendiente para los badges del menú lateral del admin. */
export async function getAdminNavCounts() {
  const supabase = await requireAdmin()
  if (!supabase) return null
  const [espacios, aplicaciones, reservas, disputas, payouts] = await Promise.all([
    supabase.from('spaces').select('id', { count: 'exact', head: true }).eq('is_published', false).eq('is_active', true),
    supabase.from('host_applications').select('id', { count: 'exact', head: true }).eq('status', 'pending_admin'),
    supabase.from('bookings').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('disputes').select('id', { count: 'exact', head: true }).eq('status', 'abierta'),
    supabase.from('bookings').select('id', { count: 'exact', head: true }).in('status', ['confirmed', 'completed']).eq('payout_status', 'pending'),
  ])
  return {
    espacios:     espacios.count ?? 0,
    aplicaciones: aplicaciones.count ?? 0,
    reservas:     reservas.count ?? 0,
    disputas:     disputas.count ?? 0,
    payouts:      payouts.count ?? 0,
  }
}

// ── ESPACIOS ─────────────────────────────────────────────
export async function getAdminSpaces(filter?: { status?: string; search?: string }) {
  const supabase = await requireAdmin()
  if (!supabase) return []

  let q = supabase.from('spaces').select(`
    *,
    profiles!host_id(full_name, email),
    space_pricing(pricing_type, hourly_price, minimum_consumption, fixed_price, is_active),
    space_images(url, is_cover),
    bookings(id)
  `).order('created_at', { ascending: false })

  if (filter?.status === 'pending')     q = q.eq('is_published', false).eq('is_active', true)
  if (filter?.status === 'published')   q = q.eq('is_published', true)
  if (filter?.status === 'inactive')    q = q.eq('is_active', false)
  if (filter?.search) q = q.ilike('name', `%${filter.search}%`)

  const { data } = await q
  return data ?? []
}

export async function updateSpaceStatus(spaceId: string, updates: {
  is_published?: boolean
  is_active?: boolean
  is_verified?: boolean
  is_featured?: boolean
}) {
  const supabase = await requireAdmin()
  if (!supabase) return { error: 'No autorizado' }
  const { error } = await supabase.from('spaces').update(updates).eq('id', spaceId)
  if (!error) {
    revalidatePath('/buscar')
    revalidatePath('/espacios', 'layout')
    revalidatePath('/', 'layout')
  }
  return error ? { error: error.message } : { success: true }
}

// ── RESERVAS ──────────────────────────────────────────────
export async function getAdminBookings(filter?: {
  status?: string
  search?: string
}) {
  const supabase = await requireAdmin()
  if (!supabase) return []

  let q = supabase.from('bookings').select(`
    *,
    spaces!space_id(name, category, city, profiles!host_id(full_name, email)),
    profiles!guest_id(full_name, email, phone),
    space_pricing!pricing_id(package_name, package_includes, pricing_type),
    booking_addons(quantity, subtotal, space_addons(name))
  `).order('created_at', { ascending: false })

  if (filter?.status && filter.status !== 'all') q = q.eq('status', filter.status)

  const { data } = await q
  return data ?? []
}

export async function updateBookingStatus(bookingId: string, status: string) {
  const supabase = await requireAdmin()
  if (!supabase) return { error: 'No autorizado' }
  const now = new Date().toISOString()
  const extra: Record<string, unknown> = {}
  if (status === 'confirmed') {
    extra.payment_status = 'advance'
    extra.confirmed_at   = now
    extra.paid_at        = now
  }
  // 'completed' solo cambia el estado. NO se fuerza payment_status='paid':
  // hacerlo permitía que markPayoutPaid liquidara el 90% al host aunque el
  // cliente no hubiera pagado el total. El payment_status lo refleja el flujo de pago real.
  const { error } = await supabase.from('bookings').update({ status, ...extra }).eq('id', bookingId)
  if (error) return { error: error.message }
  revalidatePath('/admin/reservas')
  revalidatePath('/dashboard/host/agenda')
  revalidatePath('/dashboard/reservas')
  return { success: true }
}

// ── USUARIOS ──────────────────────────────────────────────
export async function getAdminUsers(filter?: { role?: string; search?: string }) {
  const supabase = await requireAdmin()
  if (!supabase) return []

  let q = supabase.from('profiles').select('*').order('created_at', { ascending: false })

  if (filter?.role && filter.role !== 'all') q = q.eq('role', filter.role)
  if (filter?.search) q = q.ilike('full_name', `%${filter.search}%`)

  const { data } = await q
  return data ?? []
}

const VALID_ROLES = ['guest', 'host', 'admin'] as const

export async function updateUserRole(userId: string, role: string) {
  if (!VALID_ROLES.includes(role as any)) return { error: 'Rol inválido' }
  const supabase = await requireAdmin()
  if (!supabase) return { error: 'No autorizado' }

  // Obtener datos del usuario antes de actualizar para notificar si corresponde
  const { data: profile } = await supabase
    .from('profiles').select('full_name, email, role').eq('id', userId).single()

  const { error } = await supabase.from('profiles').update({ role }).eq('id', userId)
  if (error) return { error: error.message }

  // Notificar al usuario cuando se le asigna el rol 'host' (si venía de otro rol)
  if (role === 'host' && profile?.email && profile?.role !== 'host') {
    const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://espot.do'
    const name = profile.full_name ?? profile.email.split('@')[0]
    await sendEmail({
      to:      profile.email,
      subject: '¡Tu cuenta fue aprobada como propietario en Espot!',
      html: emailBase({
        title:       '¡Ya puedes publicar tu espacio!',
        subtitle:    'Tu cuenta fue activada como propietario (host) en espot.do.',
        accentColor: '#35C493',
        body: `
          <p style="color:#374151;margin:0 0 16px;">Hola <strong>${escapeHtml(name)}</strong>, el equipo de Espot revisó tu solicitud y activó tu cuenta como propietario.</p>
          <p style="color:#374151;margin:0 0 16px;">Ahora puedes publicar tu espacio, recibir solicitudes de reserva y gestionar tus eventos directamente desde el panel de propietario.</p>
          ${infoBox([
            { label: 'Tu nuevo rol',      value: 'Propietario (Host)' },
            { label: 'Qué puedes hacer',  value: 'Publicar espacios, gestionar reservas y recibir pagos' },
            { label: 'Comisi&oacute;n',   value: '10% por reserva confirmada — el 90% restante es tuyo' },
          ])}
          <p style="color:#6B7280;font-size:13px;margin:0;">Si tienes preguntas, cont&aacute;ctanos en contacto@espot.do.</p>`,
        cta: { text: 'Ir a mi panel de propietario', url: `${SITE}/dashboard/host` },
      }),
    })
  }

  revalidatePath('/admin/usuarios')
  revalidatePath('/dashboard', 'layout')
  return { success: true }
}

// ── PAGOS ─────────────────────────────────────────────────
export async function getAdminPayments() {
  const supabase = await requireAdmin()
  if (!supabase) return []

  const { data } = await supabase.from('bookings')
    .select(`
      id, total_amount, platform_fee, payment_status, status,
      event_date, event_type, created_at,
      spaces!space_id(name, city),
      profiles!guest_id(full_name, email)
    `)
    .not('status', 'in', '("cancelled_guest","cancelled_host","rejected")')
    .order('created_at', { ascending: false })

  return data ?? []
}

// ── REPORTES ──────────────────────────────────────────────
export async function getAdminReports() {
  const supabase = await requireAdmin()
  if (!supabase) return null

  const [topSpaces, byCategory, monthlyData] = await Promise.all([
    supabase.from('bookings')
      .select('space_id, spaces!space_id(name, category), total_amount')
      .not('status', 'in', '("cancelled_guest","cancelled_host")'),
    supabase.from('spaces')
      .select('category')
      .eq('is_published', true),
    supabase.from('bookings')
      .select('created_at, platform_fee, status')
      .not('status', 'in', '("cancelled_guest","cancelled_host")')
      .order('created_at'),
  ])

  // Agrupar por espacio
  const spaceMap: Record<string, { name: string; category: string; count: number; revenue: number }> = {}
  for (const b of topSpaces.data ?? []) {
    const space = (b as any).spaces
    if (!space) continue
    if (!spaceMap[b.space_id]) spaceMap[b.space_id] = { name: space.name, category: space.category, count: 0, revenue: 0 }
    spaceMap[b.space_id].count++
    spaceMap[b.space_id].revenue += Number(b.total_amount)
  }
  const topSpacesList = Object.values(spaceMap).sort((a, b) => b.count - a.count).slice(0, 5)

  // Por categoría
  const catMap: Record<string, number> = {}
  for (const s of byCategory.data ?? []) {
    catMap[s.category] = (catMap[s.category] ?? 0) + 1
  }

  // Ingresos por mes (últimos 6)
  const now = new Date()
  const monthly = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1)
    const start = d.toISOString().split('T')[0]
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0]
    const mes = d.toLocaleDateString('es-DO', { month: 'short' })
    const nextMonthStart = new Date(d.getFullYear(), d.getMonth() + 1, 1).toISOString()
    const items = (monthlyData.data ?? []).filter(b => b.created_at >= start && b.created_at < nextMonthStart)
    return {
      mes: mes.charAt(0).toUpperCase() + mes.slice(1),
      ingresos: items.reduce((s, b) => s + Number(b.platform_fee), 0),
      reservas: items.length,
    }
  })

  return { topSpaces: topSpacesList, byCategory: catMap, monthly }
}

// ── PAYOUTS A PROPIETARIOS ───────────────────────────────
export async function getAdminPayouts(filter?: 'pending' | 'paid' | 'all') {
  const supabase = await requireAdmin()
  if (!supabase) return []

  let q = supabase.from('bookings')
    .select(`
      id, total_amount, paid_amount, platform_fee, payment_status, payout_status,
      event_date, event_type, status, created_at,
      spaces!space_id(
        id, name, city,
        profiles!host_id(id, full_name, email, phone)
      ),
      profiles!guest_id(full_name),
      liquidaciones!booking_id(admin_notes)
    `)
    .in('status', ['confirmed', 'completed'])
    .order('event_date', { ascending: false })

  if (!filter || filter === 'pending') q = q.eq('payout_status', 'pending')
  if (filter === 'paid')   q = q.eq('payout_status', 'paid')

  const { data } = await q
  return data ?? []
}

export async function markPayoutPaid(
  bookingId: string,
  receipt?: { base64: string; filename: string }
) {
  const supabase = await requireAdmin()
  if (!supabase) return { error: 'No autorizado' }

  // Verificar idempotencia: no procesar si ya está pagado
  const { data: current } = await supabase
    .from('bookings')
    .select('payout_status, payment_status, paid_amount, total_amount')
    .eq('id', bookingId).single()
  if (current?.payout_status === 'paid') return { success: true, already: true }

  // No liquidar al host si la plataforma aún no cobró el total de la reserva.
  // (Antes se pagaba el 90% del total aunque el cliente solo hubiera dado el anticipo.)
  if (current?.payment_status !== 'paid') {
    const collected = Math.round(Number(current?.paid_amount ?? 0))
    const total     = Math.round(Number(current?.total_amount ?? 0))
    return { error: `No se puede liquidar: el cliente aún no ha pagado el total (cobrado ${formatCurrency(collected)} de ${formatCurrency(total)}).` }
  }

  const { data: updated, error } = await supabase
    .from('bookings')
    .update({ payout_status: 'paid', updated_at: new Date().toISOString() })
    .eq('id', bookingId)
    .eq('payout_status', 'pending')
    .select('id')

  if (error) return { error: error.message }
  if (!updated || updated.length === 0) return { success: true, already: true }

  // Obtener datos del booking para notificar al host
  const { data: booking } = await supabase
    .from('bookings')
    .select(`
      total_amount, platform_fee, event_date, event_type,
      spaces!space_id(name, profiles!host_id(full_name, email))
    `)
    .eq('id', bookingId)
    .single()

  if (booking) {
    const space     = (booking as any).spaces as any
    const host      = space?.profiles as any
    const hostEmail = host?.email as string | undefined
    // Neto consistente con la liquidación: usa la comisión real guardada
    // (fuente única hostNetOf; antes total×0.90, que difería en ±RD$1).
    const netAmount = hostNetOf(booking)
    const SITE      = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://espot.do'

    if (hostEmail) {
      const html = emailBase({
        title:    '¡Tu pago ha sido procesado!',
        subtitle: `Hemos transferido el neto de tu reserva en ${space?.name ?? 'tu espacio'}.`,
        body: `
          <p style="font-size:15px;color:#374151;margin:0 0 20px;line-height:1.6;">
            Hola ${host?.full_name ?? 'Propietario'}, el pago correspondiente a la siguiente reserva ha sido transferido a tu cuenta bancaria registrada.
          </p>
          ${infoBox([
            { label: 'Espacio',        value: space?.name ?? '—' },
            { label: 'Evento',         value: booking.event_type ?? '—' },
            { label: 'Fecha',          value: formatDate(booking.event_date) },
            { label: 'Total cliente',  value: formatCurrency(Number(booking.total_amount)) },
            { label: 'Comisión Espot', value: formatCurrency(platformFeeOf(booking)) },
            { label: 'Neto transferido', value: formatCurrency(netAmount) },
          ])}
          <p style="font-size:13px;color:#6B7280;margin:16px 0 0;line-height:1.6;">
            Si tienes alguna pregunta sobre esta transferencia, responde a este email o escríbenos a contacto@espot.do.
          </p>
        `,
        cta: { text: 'Ver mis finanzas', url: `${SITE}/dashboard/host/pagos` },
      })

      await sendEmail({
        to:          hostEmail,
        subject:     `Pago transferido — ${formatCurrency(netAmount)} · ${space?.name ?? 'Tu espacio'}`,
        html,
        attachments: receipt ? [{ filename: receipt.filename, content: receipt.base64 }] : undefined,
      })
    }
  }

  revalidatePath('/admin/liquidaciones')
  revalidatePath('/admin')
  return { success: true }
}

export async function saveLiquidacionNote(bookingId: string, note: string) {
  const supabase = await requireAdmin()
  if (!supabase) return { error: 'No autorizado' }
  const { error } = await supabase
    .from('liquidaciones')
    .update({ admin_notes: note || null })
    .eq('booking_id', bookingId)
  if (error) return { error: error.message }
  return { success: true }
}

export async function getHostBankAccount(hostId: string) {
  const supabase = await requireAdmin()
  if (!supabase) return null
  const { data } = await supabase
    .from('host_bank_accounts')
    .select('*')
    .eq('host_id', hostId)
    .single()
  return data ?? null
}

// ── PERFIL COMPLETO DE UN PROPIETARIO (admin) ────────────
export async function getAdminHostDetail(hostId: string) {
  const supabase = await requireAdmin()
  if (!supabase) return null

  const [profileRes, spacesRes, bookingsRes, externalRes, bankRes, externalPaymentsRes, subRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', hostId).single(),
    supabase.from('spaces').select(`
      id, name, category, is_published, is_active, is_verified, is_featured, created_at,
      space_images(url, is_cover),
      space_pricing(pricing_type, hourly_price, minimum_consumption, fixed_price, is_active),
      bookings(id)
    `).eq('host_id', hostId).order('created_at', { ascending: false }),
    supabase.from('bookings').select(`
      id, status, payment_status, payout_status, total_amount, platform_fee,
      paid_amount, event_date, event_type, guest_count, created_at, confirmed_at,
      profiles!guest_id(full_name, email),
      spaces!space_id(name)
    `).in('space_id',
      await supabase.from('spaces').select('id').eq('host_id', hostId).then(r => (r.data ?? []).map((s: any) => s.id))
    ).order('event_date', { ascending: false }),
    supabase.from('external_events').select(`
      id, title, event_type, event_date, status, total_amount, paid_amount, client_name,
      host_clients(full_name, email)
    `).eq('host_id', hostId).order('event_date', { ascending: false }),
    supabase.from('host_bank_accounts').select('*').eq('host_id', hostId).single(),
    supabase.from('external_event_payments').select('*').eq('host_id', hostId).order('paid_at', { ascending: false }),
    supabase.from('host_subscriptions')
      .select('status, current_period_end, payment_provider, started_at, cancelled_at')
      .eq('host_id', hostId)
      .in('status', ['active', 'pending_payment', 'past_due'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  // Fuente de verdad del plan: la suscripción viva (no el caché profiles.plan_type).
  const sub = subRes.data ?? null
  const isPro = !!sub && sub.status === 'active'
    && (!sub.current_period_end || new Date(sub.current_period_end).getTime() > Date.now())

  return {
    profile:         profileRes.data,
    spaces:          spacesRes.data   ?? [],
    bookings:        bookingsRes.data ?? [],
    externalEvents:  externalRes.data ?? [],
    bankAccount:     bankRes.data     ?? null,
    externalPayments: externalPaymentsRes.data ?? [],
    subscription:    sub,
    isPro,
  }
}

// ── ACTIVIDAD RECIENTE ───────────────────────────────────
export async function getAdminActivity() {
  const supabase = await requireAdmin()
  if (!supabase) return []

  const { data } = await supabase.from('bookings')
    .select(`
      id, status, total_amount, event_type, event_date, created_at, updated_at,
      spaces!space_id(name),
      profiles!guest_id(full_name)
    `)
    .order('updated_at', { ascending: false })
    .limit(12)

  return data ?? []
}

// ── CONFIG ────────────────────────────────────────────────
export async function getMarketplaceConfig() {
  const supabase = await requireAdmin()
  if (!supabase) return []
  const { data } = await supabase.from('marketplace_config').select('*').order('group_name')
  return data ?? []
}

const ALLOWED_CONFIG_KEYS = ['platform_fee_pct', 'min_advance_pct', 'cancellation_window_hours', 'site_announcement'] as const

export async function updateConfig(key: string, value: string) {
  if (!ALLOWED_CONFIG_KEYS.includes(key as any)) return { error: 'Clave de configuración no permitida' }
  const supabase = await requireAdmin()
  if (!supabase) return { error: 'No autorizado' }
  const { error } = await supabase.from('marketplace_config').upsert({ key, value })
  if (error) return { error: error.message }
  revalidatePath('/', 'layout')
  return { success: true }
}

// ── MENSAJES ──────────────────────────────────────────────
export async function getAdminConversations() {
  const supabase = await requireAdmin()
  if (!supabase) return []

  // Solo los 200 más recientes — deduplicar sobre 200 filas es O(200), no O(2000)
  const { data: msgs } = await supabase
    .from('messages')
    .select('id, body, created_at, space_id, sender_id, receiver_id, attachment_type')
    .order('created_at', { ascending: false })
    .limit(200)

  if (!msgs || !msgs.length) return []

  const userIds  = [...new Set(msgs.flatMap(m => [m.sender_id, m.receiver_id]))]
  const spaceIds = [...new Set(msgs.map(m => m.space_id))]

  const [{ data: profiles }, { data: spaces }] = await Promise.all([
    supabase.from('profiles').select('id, full_name, email, avatar_url').in('id', userIds),
    supabase.from('spaces').select('id, name, slug, space_images(url, is_cover)').in('id', spaceIds),
  ])

  const profileMap = Object.fromEntries((profiles ?? []).map(p => [p.id, p]))
  const spaceMap   = Object.fromEntries((spaces ?? []).map(s => [s.id, s]))

  // Deduplicar por (space_id + par de usuarios ordenado) — primera aparición = más reciente
  const seen = new Set<string>()
  const conversations: any[] = []

  for (const msg of msgs) {
    const sorted = [msg.sender_id, msg.receiver_id].sort()
    const key    = `${msg.space_id}:${sorted.join(':')}`
    if (seen.has(key)) continue
    seen.add(key)
    conversations.push({
      key,
      spaceId:      msg.space_id,
      space:        spaceMap[msg.space_id] ?? null,
      participants: sorted.map(id => profileMap[id] ?? { id, full_name: 'Usuario', email: '' }),
      user1:        sorted[0],
      user2:        sorted[1],
      lastMessage:  msg.body,
      lastType:     msg.attachment_type,
      lastAt:       msg.created_at,
    })
  }

  return conversations
}

export async function getAdminConversationMessages(spaceId: string, user1Id: string, user2Id: string) {
  const supabase = await requireAdmin()
  if (!supabase) return []

  const { data } = await supabase
    .from('messages')
    .select('*, sender:profiles!sender_id(id, full_name, avatar_url)')
    .eq('space_id', spaceId)
    .in('sender_id',   [user1Id, user2Id])
    .in('receiver_id', [user1Id, user2Id])
    .order('created_at', { ascending: true })

  return data ?? []
}
