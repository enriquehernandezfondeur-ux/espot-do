import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getMyApplication } from '@/lib/actions/host-application'
import { Clock, CheckCircle, XCircle, AlertCircle, ArrowRight, RefreshCw } from 'lucide-react'
import Link from 'next/link'

export default async function SolicitudPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  // If already approved host, go to dashboard
  const { data: profile } = await supabase
    .from('profiles').select('role, host_status').eq('id', user.id).single()

  if (profile?.role === 'host' || profile?.host_status === 'approved') {
    redirect('/dashboard/host')
  }

  const app = await getMyApplication()

  // No application at all → go apply
  if (!app) redirect('/aplicar')

  const status = app.status

  const STATE = {
    submitted: {
      icon:        Clock,
      iconBg:      'rgba(234,179,8,0.12)',
      iconColor:   '#D97706',
      title:       'Solicitud enviada',
      subtitle:    'Estamos analizando tu información...',
      description: 'Tu solicitud fue recibida. Nuestro sistema de IA está revisando tus fotos y descripción.',
    },
    analyzing: {
      icon:        RefreshCw,
      iconBg:      'rgba(59,130,246,0.1)',
      iconColor:   '#3B82F6',
      title:       'Analizando solicitud',
      subtitle:    'La IA está revisando tu espacio...',
      description: 'Estamos evaluando automáticamente tus fotos y descripción. Esto toma pocos segundos.',
    },
    pending_admin: {
      icon:        Clock,
      iconBg:      'rgba(234,179,8,0.12)',
      iconColor:   '#D97706',
      title:       'En revisión por el equipo',
      subtitle:    'Un administrador revisará tu solicitud en 24-48 horas hábiles.',
      description: 'Tu solicitud pasó el análisis inicial y está en cola de revisión. Te notificaremos por email.',
    },
    info_requested: {
      icon:        AlertCircle,
      iconBg:      'rgba(234,179,8,0.12)',
      iconColor:   '#D97706',
      title:       'Se solicitó información adicional',
      subtitle:    'Necesitamos más detalles para completar tu revisión.',
      description: app.info_request_msg ?? 'Por favor, contáctanos para aclarar algunos detalles.',
    },
    approved: {
      icon:        CheckCircle,
      iconBg:      'rgba(53,196,147,0.12)',
      iconColor:   'var(--brand)',
      title:       '¡Solicitud aprobada!',
      subtitle:    'Ya tienes acceso al panel de propietario.',
      description: 'Tu espacio fue aprobado. Completa la información de tu espacio para aparecer en el marketplace.',
    },
    rejected: {
      icon:        XCircle,
      iconBg:      'rgba(239,68,68,0.1)',
      iconColor:   '#EF4444',
      title:       'Solicitud no aprobada',
      subtitle:    'En esta ocasión no pudimos aprobar tu solicitud.',
      description: app.rejection_reason ?? 'No se indicó una razón específica.',
    },
    draft: {
      icon:        AlertCircle,
      iconBg:      'rgba(107,114,128,0.1)',
      iconColor:   '#6B7280',
      title:       'Solicitud incompleta',
      subtitle:    'No terminaste de completar tu solicitud.',
      description: 'Continúa desde donde lo dejaste.',
    },
  } as const

  const state = STATE[status as keyof typeof STATE] ?? STATE.pending_admin
  const Icon  = state.icon

  const SPACE_TYPE_LABELS: Record<string, string> = {
    salon: 'Salón para eventos', restaurante: 'Restaurante', villa: 'Villa',
    rooftop: 'Rooftop', terraza: 'Terraza', bar: 'Bar / Lounge',
    jardin: 'Jardín', hotel: 'Hotel / Resort', coworking: 'Coworking',
    estudio: 'Estudio', otro: 'Otro',
  }

  const submittedAt = new Date(app.created_at).toLocaleDateString('es-DO', {
    year: 'numeric', month: 'long', day: 'numeric',
  })

  return (
    <div className="host-theme min-h-dvh" style={{ background: 'var(--bg-base)' }}>
      <div className="max-w-lg mx-auto px-4 py-12">

        {/* Status card */}
        <div className="rounded-3xl p-8 text-center mb-6"
          style={{ background: '#fff', border: '1px solid var(--border-subtle)', boxShadow: '0 2px 16px rgba(0,0,0,0.06)' }}>
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
            style={{ background: state.iconBg }}>
            <Icon size={30} style={{ color: state.iconColor }} />
          </div>
          <h1 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            {state.title}
          </h1>
          <p className="text-base font-medium mb-3" style={{ color: 'var(--text-secondary)' }}>
            {state.subtitle}
          </p>
          <p className="text-sm" style={{ color: 'var(--text-muted)', lineHeight: 1.7 }}>
            {state.description}
          </p>
        </div>

        {/* Application summary */}
        <div className="rounded-2xl overflow-hidden mb-6"
          style={{ border: '1px solid var(--border-subtle)', background: '#fff' }}>
          <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
            <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
              Tu solicitud
            </p>
          </div>
          {[
            { label: 'Negocio',    value: app.business_name },
            { label: 'Tipo',       value: SPACE_TYPE_LABELS[app.space_type] ?? app.space_type },
            { label: 'Ciudad',     value: [app.city, app.sector].filter(Boolean).join(', ') },
            { label: 'Enviada',    value: submittedAt },
            { label: 'Fotos',      value: `${app.photos.length} foto(s)` },
          ].map(({ label, value }, i, arr) => (
            <div key={label} className="flex items-center justify-between px-5 py-3"
              style={{ borderBottom: i < arr.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}>
              <span className="text-sm" style={{ color: 'var(--text-muted)' }}>{label}</span>
              <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{value}</span>
            </div>
          ))}

          {/* Photo strip */}
          {app.photos.length > 0 && (
            <div className="px-5 py-4 flex gap-2 overflow-x-auto"
              style={{ borderTop: '1px solid var(--border-subtle)' }}>
              {app.photos.slice(0, 6).map((url, i) => (
                <img key={i} src={url} alt=""
                  className="w-14 h-14 rounded-xl object-cover shrink-0"
                  style={{ border: '1px solid var(--border-subtle)' }} />
              ))}
            </div>
          )}
        </div>

        {/* CTA based on status */}
        {status === 'approved' && (
          <Link href="/dashboard/host"
            className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-sm font-bold text-white transition-all active:scale-95"
            style={{ background: 'var(--brand)' }}>
            Ir a mi panel <ArrowRight size={16} />
          </Link>
        )}

        {status === 'rejected' && (
          <Link href="/aplicar"
            className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-sm font-bold transition-all active:scale-95"
            style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1.5px solid var(--border-subtle)' }}>
            Volver a aplicar <ArrowRight size={16} />
          </Link>
        )}

        {(status === 'submitted' || status === 'analyzing' || status === 'pending_admin') && (
          <div className="text-center">
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              ¿Tienes preguntas?{' '}
              <a href="mailto:contacto@espot.do" className="font-semibold" style={{ color: 'var(--brand)' }}>
                contacto@espot.do
              </a>
            </p>
          </div>
        )}

        <div className="text-center mt-6">
          <Link href="/" className="text-xs" style={{ color: 'var(--text-muted)' }}>
            ← Volver al marketplace
          </Link>
        </div>
      </div>
    </div>
  )
}
