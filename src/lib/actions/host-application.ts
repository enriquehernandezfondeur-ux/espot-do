'use server'

import { createClient } from '@/lib/supabase/server'
import { analyzeApplication } from '@/lib/ai/analyze-application'
import { sendEmail } from '@/lib/email/send'
import {
  tplSolicitudRecibida,
  tplSolicitudAprobada,
  tplSolicitudRechazada,
  tplNuevaSolicitudAdmin,
} from '@/lib/email/templates'
import type { HostApplication, ApplicationStatus } from '@/types'

const ADMIN_EMAIL   = process.env.ADMIN_EMAIL ?? 'enriquehernandezfondeur@gmail.com'
const SUPERADMIN_EMAIL = process.env.SUPERADMIN_EMAIL ?? 'enriquehernandezfondeur@gmail.com'
const SITE          = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://espot.do'

// Verifica que el usuario autenticado sea superadmin o tenga role='admin'.
// Devuelve el user si es admin, null si no.
async function assertAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  if (user.email === SUPERADMIN_EMAIL) return user
  const { data } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  return data?.role === 'admin' ? user : null
}

// ─── Read ─────────────────────────────────────────────────────────────────────

export async function getMyApplication(): Promise<HostApplication | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('host_applications')
    .select('*')
    .eq('user_id', user.id)
    .single()

  return data ?? null
}

export async function getApplication(id: string): Promise<HostApplication | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('host_applications')
    .select('*, user:profiles!user_id(id, full_name, email, phone, avatar_url)')
    .eq('id', id)
    .single()

  return data ?? null
}

export async function getApplications(
  filter: ApplicationStatus | 'all' = 'all'
): Promise<HostApplication[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  let query = supabase
    .from('host_applications')
    .select('*, user:profiles!user_id(id, full_name, email, phone, avatar_url)')
    .order('created_at', { ascending: false })

  if (filter !== 'all') query = query.eq('status', filter)

  const { data } = await query
  return data ?? []
}

// ─── Submit ───────────────────────────────────────────────────────────────────

interface SubmitPayload {
  business_name:     string
  space_type:        string
  city:              string
  sector?:           string
  phone:             string
  whatsapp?:         string
  instagram?:        string
  description:       string
  capacity_estimate?: number
  event_types:       string[]
  photos:            string[]
}

export async function submitApplication(
  payload: SubmitPayload
): Promise<{ success: boolean; error?: string; applicationId?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'No autenticado' }

  if (payload.photos.length < 3) {
    return { success: false, error: 'Debes subir al menos 3 fotos del espacio' }
  }
  if (payload.description.length < 50) {
    return { success: false, error: 'La descripción debe tener al menos 50 caracteres' }
  }

  // Check if user already has an active application
  const { data: existing } = await supabase
    .from('host_applications')
    .select('id, status')
    .eq('user_id', user.id)
    .single()

  if (existing && !['rejected'].includes(existing.status)) {
    return { success: false, error: 'Ya tienes una solicitud activa en proceso' }
  }

  // Save application as 'analyzing'
  const upsertData = {
    user_id:           user.id,
    business_name:     payload.business_name,
    space_type:        payload.space_type,
    city:              payload.city,
    sector:            payload.sector ?? null,
    phone:             payload.phone,
    whatsapp:          payload.whatsapp ?? null,
    instagram:         payload.instagram ?? null,
    description:       payload.description,
    capacity_estimate: payload.capacity_estimate ?? null,
    event_types:       payload.event_types,
    photos:            payload.photos,
    status:            'analyzing' as ApplicationStatus,
    ai_score:          null,
    ai_analysis:       null,
    reviewed_by:       null,
    reviewed_at:       null,
    rejection_reason:  null,
    admin_notes:       null,
    info_request_msg:  null,
  }

  const { data: app, error: upsertErr } = await supabase
    .from('host_applications')
    .upsert(upsertData, { onConflict: 'user_id' })
    .select('id')
    .single()

  if (upsertErr || !app) {
    console.error('[host-application] upsert error:', upsertErr)
    return { success: false, error: 'Error al guardar la solicitud' }
  }

  // Update profile host_status
  await supabase.from('profiles').update({ host_status: 'applied' }).eq('id', user.id)

  // Get applicant info for emails
  const { data: profile } = await supabase
    .from('profiles').select('full_name, email').eq('id', user.id).single()
  const applicantName  = profile?.full_name ?? 'Propietario'
  const applicantEmail = profile?.email ?? ''

  // Run AI analysis async (don't block the response)
  runAiAnalysis(app.id, payload, applicantName, applicantEmail).catch(err =>
    console.error('[host-application] AI analysis failed:', err)
  )

  // Send confirmation email to applicant
  if (applicantEmail) {
    sendEmail({
      to:      applicantEmail,
      subject: `Recibimos tu solicitud — Espot`,
      html:    tplSolicitudRecibida({ name: applicantName, businessName: payload.business_name }),
    }).catch(() => {})
  }

  return { success: true, applicationId: app.id }
}

async function runAiAnalysis(
  appId:          string,
  payload:        SubmitPayload,
  applicantName:  string,
  applicantEmail: string,
) {
  const supabase = await createClient()

  const analysis = await analyzeApplication({
    businessName: payload.business_name,
    spaceType:    payload.space_type,
    city:         payload.city,
    description:  payload.description,
    photoUrls:    payload.photos,
    instagram:    payload.instagram,
  })

  await supabase
    .from('host_applications')
    .update({
      ai_score:    analysis.overall_score,
      ai_analysis: analysis,
      status:      'pending_admin',
    })
    .eq('id', appId)

  // Notify admin
  sendEmail({
    to:      ADMIN_EMAIL,
    subject: `Nueva solicitud de propietario — ${payload.business_name} (score: ${analysis.overall_score})`,
    html:    tplNuevaSolicitudAdmin({
      applicantName,
      applicantEmail,
      businessName: payload.business_name,
      spaceType:    payload.space_type,
      city:         payload.city,
      aiScore:      analysis.overall_score,
      flags:        analysis.flags,
      reviewUrl:    `${SITE}/admin/aplicaciones/${appId}`,
    }),
  }).catch(() => {})
}

// ─── Admin actions ─────────────────────────────────────────────────────────────

export async function approveApplication(
  applicationId: string
): Promise<{ success: boolean; error?: string }> {
  const admin = await assertAdmin()
  if (!admin) return { success: false, error: 'Solo administradores pueden aprobar solicitudes' }

  const supabase = await createClient()
  const user = admin

  const { data: app } = await supabase
    .from('host_applications')
    .select('*, user:profiles!user_id(id, full_name, email)')
    .eq('id', applicationId)
    .single()

  if (!app) return { success: false, error: 'Solicitud no encontrada' }

  await supabase
    .from('host_applications')
    .update({ status: 'approved', reviewed_by: user.id, reviewed_at: new Date().toISOString() })
    .eq('id', applicationId)

  // Grant host role and approved status
  await supabase
    .from('profiles')
    .update({ role: 'host', host_status: 'approved' })
    .eq('id', app.user_id)

  // Notify applicant
  const applicant = app.user as any
  if (applicant?.email) {
    sendEmail({
      to:      applicant.email,
      subject: `¡Tu espacio fue aprobado en Espot! 🎉`,
      html:    tplSolicitudAprobada({
        name:         applicant.full_name ?? 'Propietario',
        businessName: app.business_name,
        dashboardUrl: `${SITE}/dashboard/host`,
      }),
    }).catch(() => {})
  }

  return { success: true }
}

export async function rejectApplication(
  applicationId: string,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  const admin = await assertAdmin()
  if (!admin) return { success: false, error: 'Solo administradores pueden rechazar solicitudes' }

  const supabase = await createClient()
  const user = admin

  const { data: app } = await supabase
    .from('host_applications')
    .select('*, user:profiles!user_id(id, full_name, email)')
    .eq('id', applicationId)
    .single()

  if (!app) return { success: false, error: 'Solicitud no encontrada' }

  await supabase
    .from('host_applications')
    .update({
      status:           'rejected',
      rejection_reason: reason,
      reviewed_by:      user.id,
      reviewed_at:      new Date().toISOString(),
    })
    .eq('id', applicationId)

  await supabase
    .from('profiles')
    .update({ host_status: 'rejected' })
    .eq('id', app.user_id)

  const applicant = app.user as any
  if (applicant?.email) {
    sendEmail({
      to:      applicant.email,
      subject: `Actualización sobre tu solicitud en Espot`,
      html:    tplSolicitudRechazada({
        name:         applicant.full_name ?? 'Propietario',
        businessName: app.business_name,
        reason,
        reapplyUrl:   `${SITE}/aplicar`,
      }),
    }).catch(() => {})
  }

  return { success: true }
}

export async function requestMoreInfo(
  applicationId: string,
  message: string
): Promise<{ success: boolean; error?: string }> {
  const admin = await assertAdmin()
  if (!admin) return { success: false, error: 'Solo administradores pueden solicitar información' }

  const supabase = await createClient()
  const user = admin

  await supabase
    .from('host_applications')
    .update({ status: 'info_requested', info_request_msg: message, reviewed_by: user.id })
    .eq('id', applicationId)

  await supabase
    .from('profiles')
    .update({ host_status: 'applied' })
    .eq('id', (await supabase.from('host_applications').select('user_id').eq('id', applicationId).single()).data?.user_id ?? '')

  return { success: true }
}

export async function updateAdminNotes(
  applicationId: string,
  notes: string
): Promise<void> {
  const admin = await assertAdmin()
  if (!admin) return
  const supabase = await createClient()
  await supabase
    .from('host_applications')
    .update({ admin_notes: notes })
    .eq('id', applicationId)
}
