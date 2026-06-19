import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getApplications } from '@/lib/actions/host-application'
import Link from 'next/link'
import { ClipboardList, ChevronRight, Clock, Search } from 'lucide-react'
import type { ApplicationStatus } from '@/types'

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  pending_admin:   { label: 'Pendiente',         color: '#D97706', bg: 'rgba(234,179,8,0.1)' },
  analyzing:       { label: 'Analizando (IA)',   color: '#3B82F6', bg: 'rgba(59,130,246,0.1)' },
  submitted:       { label: 'Enviada',           color: '#6B7280', bg: 'rgba(107,114,128,0.1)' },
  approved:        { label: 'Aprobada',          color: '#16A34A', bg: 'rgba(22,163,74,0.1)' },
  rejected:        { label: 'Rechazada',         color: '#EF4444', bg: 'rgba(239,68,68,0.1)' },
  info_requested:  { label: 'Más info pedida',   color: '#8B5CF6', bg: 'rgba(139,92,246,0.1)' },
  draft:           { label: 'Borrador',          color: '#9CA3AF', bg: 'rgba(156,163,175,0.1)' },
}

const SPACE_TYPE_LABELS: Record<string, string> = {
  salon: 'Salón', restaurante: 'Restaurante', villa: 'Villa', rooftop: 'Rooftop',
  terraza: 'Terraza', bar: 'Bar', jardin: 'Jardín', hotel: 'Hotel',
  coworking: 'Coworking', estudio: 'Estudio', otro: 'Otro',
}

function scoreColor(score: number): string {
  if (score >= 70) return '#16A34A'
  if (score >= 45) return '#D97706'
  return '#EF4444'
}

function scoreBg(score: number): string {
  if (score >= 70) return 'rgba(22,163,74,0.1)'
  if (score >= 45) return 'rgba(234,179,8,0.1)'
  return 'rgba(239,68,68,0.1)'
}

export default async function AplicacionesPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; q?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const isSuperAdmin = user.email === (process.env.SUPERADMIN_EMAIL ?? 'enriquehernandezfondeur@gmail.com')
  if (!isSuperAdmin) {
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'admin') redirect('/admin')
  }

  const { filter = 'pending_admin', q = '' } = await searchParams
  const allApps = await getApplications(filter as ApplicationStatus | 'all')
  const query = q.trim().toLowerCase()
  const apps = query
    ? allApps.filter(a =>
        `${a.business_name ?? ''} ${a.city ?? ''} ${(a.user as any)?.full_name ?? ''}`
          .toLowerCase().includes(query))
    : allApps

  const TABS = [
    { key: 'pending_admin', label: 'Pendientes' },
    { key: 'all',           label: 'Todas' },
    { key: 'approved',      label: 'Aprobadas' },
    { key: 'rejected',      label: 'Rechazadas' },
  ]

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: '#0F1623', letterSpacing: '-0.02em' }}>
          Solicitudes de propietarios
        </h1>
        <p className="text-sm mt-0.5" style={{ color: '#6B7280' }}>
          Revisa y aprueba solicitudes para unirse a Espot como host
        </p>
      </div>

      {/* Tabs — mismo patrón "pills" que Reservas/Usuarios/Espacios */}
      <div className="flex gap-1 mb-3 p-1 rounded-xl w-fit overflow-x-auto scrollbar-hide"
        style={{ background: '#fff', border: '1px solid #E8ECF0' }}>
        {TABS.map(tab => (
          <Link
            key={tab.key}
            href={`/admin/aplicaciones?filter=${tab.key}${q ? `&q=${encodeURIComponent(q)}` : ''}`}
            className="px-3 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap shrink-0"
            style={filter === tab.key ? { background: 'var(--brand)', color: '#fff' } : { color: '#6B7280' }}>
            {tab.label}
          </Link>
        ))}
      </div>

      {/* Buscador (form GET — busca por negocio, ciudad o propietario) */}
      <form method="get" className="relative mb-5 max-w-md">
        <input type="hidden" name="filter" value={filter} />
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#9CA3AF' }} />
        <input
          name="q"
          defaultValue={q}
          placeholder="Buscar por negocio, ciudad o propietario…"
          className="w-full rounded-xl pl-9 pr-3 py-2.5 text-sm outline-none"
          style={{ background: '#fff', border: '1px solid #E5E7EB', color: '#0F1623', fontSize: 16 }}
        />
      </form>

      {/* List */}
      {apps.length === 0 ? (
        <div className="rounded-2xl p-12 text-center"
          style={{ background: '#fff', border: '1px solid #E5E7EB' }}>
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: '#F8FAFC' }}>
            <ClipboardList size={24} style={{ color: '#9CA3AF' }} />
          </div>
          <p className="text-base font-semibold mb-1" style={{ color: '#374151' }}>
            {query ? 'Sin resultados para tu búsqueda' : `No hay solicitudes ${filter !== 'all' ? 'en esta categoría' : ''}`}
          </p>
          <p className="text-sm" style={{ color: '#9CA3AF' }}>
            {query ? 'Prueba con otro nombre, ciudad o propietario' : 'Las nuevas solicitudes aparecerán aquí'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {apps.map(app => {
            const user = app.user as any
            const st   = STATUS_LABELS[app.status] ?? STATUS_LABELS.submitted
            const hasScore = app.ai_score !== null && app.ai_score !== undefined
            const hoursAgo = Math.round((Date.now() - new Date(app.created_at).getTime()) / 3600000)

            return (
              <Link
                key={app.id}
                href={`/admin/aplicaciones/${app.id}`}
                className="block rounded-2xl p-4 transition-all hover:shadow-md"
                style={{ background: '#fff', border: '1px solid #E5E7EB' }}>
                <div className="flex items-start justify-between gap-4">
                  {/* Left: Info */}
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    {/* Avatar */}
                    {user?.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={user.avatar_url} alt=""
                        className="w-10 h-10 rounded-xl object-cover shrink-0"
                        style={{ border: '1px solid #E5E7EB' }} />
                    ) : (
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold text-white shrink-0"
                        style={{ background: 'var(--brand)' }}>
                        {(user?.full_name ?? 'A').charAt(0).toUpperCase()}
                      </div>
                    )}

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold" style={{ color: '#0F1623' }}>
                          {app.business_name}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{ background: st.bg, color: st.color }}>
                          {st.label}
                        </span>
                      </div>
                      <div className="text-xs mt-0.5 space-x-2" style={{ color: '#6B7280' }}>
                        <span>{SPACE_TYPE_LABELS[app.space_type] ?? app.space_type}</span>
                        <span>·</span>
                        <span>{app.city}</span>
                        <span>·</span>
                        <span>{user?.full_name ?? '—'}</span>
                      </div>
                      <div className="flex items-center gap-1 mt-1" style={{ color: '#9CA3AF' }}>
                        <Clock size={11} />
                        <span className="text-xs">
                          {hoursAgo < 1 ? 'Hace menos de 1h' :
                           hoursAgo < 24 ? `Hace ${hoursAgo}h` :
                           `Hace ${Math.round(hoursAgo / 24)} días`}
                        </span>
                        <span className="text-xs">· {app.photos.length} foto(s)</span>
                      </div>
                    </div>
                  </div>

                  {/* Right: AI score + arrow */}
                  <div className="flex items-center gap-3 shrink-0">
                    {hasScore && (
                      <div className="text-center px-3 py-2 rounded-xl"
                        style={{ background: scoreBg(app.ai_score!), minWidth: 56 }}>
                        <div className="text-lg font-black leading-none"
                          style={{ color: scoreColor(app.ai_score!) }}>
                          {Math.round(app.ai_score!)}
                        </div>
                        <div className="text-[9px] font-bold uppercase tracking-wide mt-0.5"
                          style={{ color: scoreColor(app.ai_score!) }}>
                          IA
                        </div>
                      </div>
                    )}
                    <ChevronRight size={16} style={{ color: '#D1D5DB' }} />
                  </div>
                </div>

                {/* Flags */}
                {app.ai_analysis?.flags && app.ai_analysis.flags.length > 0 && (
                  <div className="flex gap-1.5 mt-3 flex-wrap">
                    {app.ai_analysis.flags.map((flag: string) => (
                      <span key={flag} className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                        style={{ background: 'rgba(239,68,68,0.08)', color: '#EF4444' }}>
                        ⚠ {flag.replace(/_/g, ' ')}
                      </span>
                    ))}
                  </div>
                )}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
