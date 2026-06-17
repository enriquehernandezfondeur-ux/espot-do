import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import {
  getApplication,
  approveApplication,
  rejectApplication,
  requestMoreInfo,
  updateAdminNotes,
} from '@/lib/actions/host-application'
import Link from 'next/link'
import { ArrowLeft, Phone, Check, X, Info } from 'lucide-react'
import ConfirmSubmitButton from '@/components/admin/ConfirmSubmitButton'

const SPACE_TYPE_LABELS: Record<string, string> = {
  salon: 'Salón', restaurante: 'Restaurante', villa: 'Villa', rooftop: 'Rooftop',
  terraza: 'Terraza', bar: 'Bar', jardin: 'Jardín', hotel: 'Hotel',
  coworking: 'Coworking', estudio: 'Estudio', otro: 'Otro',
}

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  pending_admin:  { label: 'Pendiente revisión', color: '#D97706', bg: 'rgba(234,179,8,0.1)' },
  analyzing:      { label: 'Analizando IA',      color: '#3B82F6', bg: 'rgba(59,130,246,0.1)' },
  submitted:      { label: 'Enviada',            color: '#6B7280', bg: 'rgba(107,114,128,0.1)' },
  approved:       { label: 'Aprobada',           color: '#16A34A', bg: 'rgba(22,163,74,0.1)' },
  rejected:       { label: 'Rechazada',          color: '#EF4444', bg: 'rgba(239,68,68,0.1)' },
  info_requested: { label: 'Más info pedida',    color: '#8B5CF6', bg: 'rgba(139,92,246,0.1)' },
  draft:          { label: 'Borrador',           color: '#9CA3AF', bg: 'rgba(156,163,175,0.1)' },
}

function scoreColor(score: number) {
  if (score >= 70) return '#16A34A'
  if (score >= 45) return '#D97706'
  return '#EF4444'
}
function scoreBg(score: number) {
  if (score >= 70) return 'rgba(22,163,74,0.1)'
  if (score >= 45) return 'rgba(234,179,8,0.1)'
  return 'rgba(239,68,68,0.1)'
}

const ACTIONABLE = ['pending_admin', 'analyzing', 'submitted', 'info_requested']

export default async function AplicacionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const isSuperAdmin = user.email === (process.env.SUPERADMIN_EMAIL ?? 'enriquehernandezfondeur@gmail.com')
  if (!isSuperAdmin) {
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'admin') redirect('/admin')
  }

  const app = await getApplication(id)
  if (!app) redirect('/admin/aplicaciones')

  const applicant = app.user as any
  const st        = STATUS_LABELS[app.status] ?? STATUS_LABELS.submitted
  const hasScore  = app.ai_score !== null && app.ai_score !== undefined
  const canAct    = ACTIONABLE.includes(app.status)

  const photoScore = app.ai_analysis?.photo_score ?? 0
  const descScore  = app.ai_analysis?.description_score ?? 0

  async function handleApprove(formData: FormData) {
    'use server'
    await approveApplication(formData.get('id') as string)
    redirect('/admin/aplicaciones')
  }

  async function handleReject(formData: FormData) {
    'use server'
    await rejectApplication(formData.get('id') as string, formData.get('reason') as string)
    redirect('/admin/aplicaciones')
  }

  async function handleRequestInfo(formData: FormData) {
    'use server'
    await requestMoreInfo(formData.get('id') as string, formData.get('message') as string)
    redirect('/admin/aplicaciones')
  }

  async function handleSaveNotes(formData: FormData) {
    'use server'
    const noteId = formData.get('id') as string
    await updateAdminNotes(noteId, formData.get('notes') as string)
    revalidatePath(`/admin/aplicaciones/${noteId}`)
  }

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">

      {/* Header breadcrumb */}
      <div className="flex items-center gap-2 mb-6 flex-wrap">
        <Link href="/admin/aplicaciones"
          className="flex items-center gap-1.5 text-sm font-medium"
          style={{ color: '#6B7280' }}>
          <ArrowLeft size={15} />
          Aplicaciones
        </Link>
        <span style={{ color: '#D1D5DB' }}>/</span>
        <span className="text-sm font-semibold" style={{ color: '#0F1623' }}>{app.business_name}</span>
        <span className="ml-auto text-xs px-2.5 py-1 rounded-full font-semibold"
          style={{ background: st.bg, color: st.color }}>
          {st.label}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* ── Left: info + photos ── */}
        <div className="lg:col-span-2 space-y-5">

          {/* Applicant */}
          <div className="rounded-2xl p-5 flex items-center gap-4"
            style={{ background: '#fff', border: '1px solid #E5E7EB' }}>
            {applicant?.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={applicant.avatar_url} alt=""
                className="w-14 h-14 rounded-2xl object-cover shrink-0"
                style={{ border: '1px solid #E5E7EB' }} />
            ) : (
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-lg font-bold text-white shrink-0"
                style={{ background: 'var(--brand)' }}>
                {(applicant?.full_name ?? 'A').charAt(0).toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-base font-bold truncate" style={{ color: '#0F1623' }}>
                {applicant?.full_name ?? '—'}
              </p>
              <p className="text-sm truncate" style={{ color: '#6B7280' }}>{applicant?.email ?? '—'}</p>
              {applicant?.phone && (
                <p className="text-sm flex items-center gap-1 mt-0.5" style={{ color: '#9CA3AF' }}>
                  <Phone size={11} />{applicant.phone}
                </p>
              )}
            </div>
            <div className="text-right shrink-0">
              <p className="text-xs" style={{ color: '#9CA3AF' }}>Enviada</p>
              <p className="text-sm font-semibold" style={{ color: '#374151' }}>
                {new Date(app.created_at).toLocaleDateString('es-DO', {
                  year: 'numeric', month: 'short', day: 'numeric',
                })}
              </p>
            </div>
          </div>

          {/* Business details */}
          <div className="rounded-2xl overflow-hidden"
            style={{ background: '#fff', border: '1px solid #E5E7EB' }}>
            <div className="px-5 py-3.5" style={{ borderBottom: '1px solid #E5E7EB' }}>
              <p className="text-xs font-bold uppercase tracking-widest" style={{ color: '#9CA3AF' }}>
                Información del espacio
              </p>
            </div>
            {([
              { label: 'Negocio',         value: app.business_name },
              { label: 'Tipo',            value: SPACE_TYPE_LABELS[app.space_type] ?? app.space_type },
              { label: 'Ciudad',          value: [app.city, app.sector].filter(Boolean).join(', ') },
              { label: 'Teléfono',        value: app.phone },
              { label: 'WhatsApp',        value: app.whatsapp ?? '—' },
              { label: 'Instagram',       value: app.instagram ? `@${app.instagram.replace('@', '')}` : '—' },
              { label: 'Capacidad est.',  value: app.capacity_estimate ? `${app.capacity_estimate} personas` : '—' },
              { label: 'Tipos de evento', value: app.event_types.length > 0 ? app.event_types.join(', ') : '—' },
            ] as { label: string; value: string }[]).map(({ label, value }, i, arr) => (
              <div key={label}
                className="flex items-start justify-between px-5 py-3 gap-4"
                style={{ borderBottom: i < arr.length - 1 ? '1px solid #F3F4F6' : 'none' }}>
                <span className="text-sm shrink-0" style={{ color: '#9CA3AF' }}>{label}</span>
                <span className="text-sm font-semibold text-right" style={{ color: '#374151' }}>{value}</span>
              </div>
            ))}
          </div>

          {/* Description */}
          <div className="rounded-2xl p-5"
            style={{ background: '#fff', border: '1px solid #E5E7EB' }}>
            <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#9CA3AF' }}>
              Descripción
            </p>
            <p className="text-sm leading-relaxed" style={{ color: '#374151', lineHeight: 1.75 }}>
              {app.description}
            </p>
          </div>

          {/* Photo grid */}
          {app.photos.length > 0 && (
            <div className="rounded-2xl p-5"
              style={{ background: '#fff', border: '1px solid #E5E7EB' }}>
              <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: '#9CA3AF' }}>
                Fotos ({app.photos.length})
              </p>
              <div className="grid grid-cols-3 gap-2.5">
                {app.photos.map((url, i) => (
                  <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt={`Foto ${i + 1}`}
                      className="w-full aspect-square object-cover rounded-xl transition-opacity hover:opacity-85"
                      style={{ border: '1px solid #E5E7EB' }} />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Right: AI + actions ── */}
        <div className="space-y-5">

          {/* AI Analysis */}
          {hasScore && app.ai_analysis && (
            <div className="rounded-2xl p-5"
              style={{ background: '#fff', border: '1px solid #E5E7EB' }}>
              <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: '#9CA3AF' }}>
                Análisis IA
              </p>

              <div className="flex items-center gap-4 mb-5">
                <div className="w-16 h-16 rounded-2xl flex flex-col items-center justify-center shrink-0"
                  style={{ background: scoreBg(app.ai_score!) }}>
                  <span className="text-2xl font-black leading-none" style={{ color: scoreColor(app.ai_score!) }}>
                    {Math.round(app.ai_score!)}
                  </span>
                  <span className="text-[9px] font-bold uppercase tracking-wide"
                    style={{ color: scoreColor(app.ai_score!) }}>
                    /100
                  </span>
                </div>
                <div className="flex-1 space-y-2.5">
                  {([
                    { label: 'Fotos', score: photoScore },
                    { label: 'Descripción', score: descScore },
                  ]).map(({ label, score }) => (
                    <div key={label}>
                      <div className="flex justify-between text-xs mb-1">
                        <span style={{ color: '#6B7280' }}>{label}</span>
                        <span className="font-bold" style={{ color: scoreColor(score) }}>{Math.round(score)}</span>
                      </div>
                      <div className="h-1.5 rounded-full" style={{ background: '#F3F4F6' }}>
                        <div className="h-1.5 rounded-full"
                          style={{ width: `${Math.min(score, 100)}%`, background: scoreColor(score) }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {app.ai_analysis.overall_summary && (
                <p className="text-sm leading-relaxed mb-4" style={{ color: '#6B7280', lineHeight: 1.65 }}>
                  {app.ai_analysis.overall_summary}
                </p>
              )}

              {app.ai_analysis.photo_notes && (
                <div className="mb-3">
                  <p className="text-xs font-semibold mb-1" style={{ color: '#374151' }}>Fotos</p>
                  <p className="text-xs" style={{ color: '#6B7280' }}>{app.ai_analysis.photo_notes}</p>
                </div>
              )}

              {app.ai_analysis.description_notes && (
                <div className="mb-3">
                  <p className="text-xs font-semibold mb-1" style={{ color: '#374151' }}>Descripción</p>
                  <p className="text-xs" style={{ color: '#6B7280' }}>{app.ai_analysis.description_notes}</p>
                </div>
              )}

              {app.ai_analysis.flags && app.ai_analysis.flags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3 pt-3"
                  style={{ borderTop: '1px solid #F3F4F6' }}>
                  {app.ai_analysis.flags.map((flag: string) => (
                    <span key={flag} className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                      style={{ background: 'rgba(239,68,68,0.08)', color: '#EF4444' }}>
                      ⚠ {flag.replace(/_/g, ' ')}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          {canAct ? (
            <div className="rounded-2xl p-5 space-y-3"
              style={{ background: '#fff', border: '1px solid #E5E7EB' }}>
              <p className="text-xs font-bold uppercase tracking-widest" style={{ color: '#9CA3AF' }}>Acciones</p>

              <form action={handleApprove}>
                <input type="hidden" name="id" value={app.id} />
                <ConfirmSubmitButton
                  confirmMessage="Aprobar esta solicitud creará una cuenta de propietario (host) en producción. ¿Continuar?"
                  pendingLabel="Aprobando..."
                  className="w-full py-3 rounded-xl text-sm font-bold text-white transition-all active:scale-[0.98]"
                  style={{ background: '#16A34A' }}>
                  <span className="inline-flex items-center justify-center gap-2"><Check size={15} /> Aprobar solicitud</span>
                </ConfirmSubmitButton>
              </form>

              <details>
                <summary
                  className="cursor-pointer w-full py-3 rounded-xl text-sm font-bold text-center select-none"
                  style={{ background: 'rgba(239,68,68,0.07)', color: '#EF4444', listStyle: 'none' }}>
                  <span className="inline-flex items-center justify-center gap-2"><X size={15} /> Rechazar solicitud</span>
                </summary>
                <form action={handleReject} className="mt-3 space-y-2">
                  <input type="hidden" name="id" value={app.id} />
                  <textarea name="reason" required rows={3}
                    placeholder="Razón del rechazo (visible para el solicitante)..."
                    className="w-full rounded-xl px-3 py-2.5 text-sm resize-none outline-none"
                    style={{
                      background: '#F9FAFB', border: '1px solid #E5E7EB',
                      color: '#374151', fontSize: 16,
                    }} />
                  <button type="submit"
                    className="w-full py-2.5 rounded-xl text-sm font-bold text-white"
                    style={{ background: '#EF4444' }}>
                    Confirmar rechazo
                  </button>
                </form>
              </details>

              <details>
                <summary
                  className="cursor-pointer w-full py-3 rounded-xl text-sm font-bold text-center select-none"
                  style={{ background: 'rgba(139,92,246,0.07)', color: '#8B5CF6', listStyle: 'none' }}>
                  <span className="inline-flex items-center justify-center gap-2"><Info size={15} /> Pedir más información</span>
                </summary>
                <form action={handleRequestInfo} className="mt-3 space-y-2">
                  <input type="hidden" name="id" value={app.id} />
                  <textarea name="message" required rows={3}
                    placeholder="Explica qué información adicional necesitas..."
                    className="w-full rounded-xl px-3 py-2.5 text-sm resize-none outline-none"
                    style={{
                      background: '#F9FAFB', border: '1px solid #E5E7EB',
                      color: '#374151', fontSize: 16,
                    }} />
                  <button type="submit"
                    className="w-full py-2.5 rounded-xl text-sm font-bold text-white"
                    style={{ background: '#8B5CF6' }}>
                    Enviar mensaje
                  </button>
                </form>
              </details>
            </div>
          ) : (
            <div className="rounded-2xl p-5"
              style={{ background: '#fff', border: '1px solid #E5E7EB' }}>
              <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#9CA3AF' }}>Estado</p>
              <div className="px-4 py-3 rounded-xl"
                style={{ background: st.bg }}>
                <span className="text-sm font-semibold" style={{ color: st.color }}>{st.label}</span>
              </div>
              {app.rejection_reason && (
                <div className="mt-4">
                  <p className="text-xs font-semibold mb-1.5" style={{ color: '#374151' }}>Razón del rechazo</p>
                  <p className="text-sm" style={{ color: '#6B7280', lineHeight: 1.65 }}>{app.rejection_reason}</p>
                </div>
              )}
              {app.info_request_msg && (
                <div className="mt-4">
                  <p className="text-xs font-semibold mb-1.5" style={{ color: '#374151' }}>Mensaje enviado</p>
                  <p className="text-sm" style={{ color: '#6B7280', lineHeight: 1.65 }}>{app.info_request_msg}</p>
                </div>
              )}
            </div>
          )}

          {/* Admin notes */}
          <div className="rounded-2xl p-5"
            style={{ background: '#fff', border: '1px solid #E5E7EB' }}>
            <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#9CA3AF' }}>
              Notas internas
            </p>
            <form action={handleSaveNotes} className="space-y-2">
              <input type="hidden" name="id" value={app.id} />
              <textarea name="notes" rows={4}
                defaultValue={app.admin_notes ?? ''}
                placeholder="Notas privadas del equipo (no visibles para el solicitante)..."
                className="w-full rounded-xl px-3 py-2.5 text-sm resize-none outline-none"
                style={{
                  background: '#F9FAFB', border: '1px solid #E5E7EB',
                  color: '#374151', fontSize: 14,
                }} />
              <button type="submit"
                className="w-full py-2.5 rounded-xl text-xs font-bold transition-all"
                style={{ background: '#F1F5F9', color: '#6B7280' }}>
                Guardar notas
              </button>
            </form>
          </div>

        </div>
      </div>
    </div>
  )
}
