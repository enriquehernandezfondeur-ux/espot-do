'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ChevronLeft, MapPin, CalendarDays, Clock, Share2, MoreVertical, Trash2,
  Users, UserPlus, Check, Loader2,
} from 'lucide-react'
import { formatDate, formatTime } from '@/lib/utils'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import { ActivityStatusBadge } from '@/components/activities/ActivityStatusBadge'
import { ShareSheet } from '@/components/activities/ShareSheet'
import { cancelActivity, type ActivityDetail } from '@/lib/actions/activities'
import type { ActivityParticipant } from '@/lib/activities/types'

type Tab = 'resumen' | 'participantes' | 'preguntas'

function locationLabel(d: ActivityDetail): string {
  const a = d.activity
  if (a.location_mode === 'external') return a.external_location ?? 'Ubicación externa'
  if (a.location_mode === 'space')    return 'Espacio en Espot'
  if (a.location_mode === 'booking')  return 'Reserva vinculada'
  return 'Sin ubicación'
}

export function ActivityDetailClient({ detail }: { detail: ActivityDetail }) {
  const router = useRouter()
  const { confirm, dialog } = useConfirm()
  const { activity, questions, participants } = detail

  const [tab, setTab]         = useState<Tab>('resumen')
  const [menuOpen, setMenu]   = useState(false)
  const [shareOpen, setShare] = useState(false)
  const [cancelling, setCancelling] = useState(false)

  const confirmed = participants.filter(p => p.status === 'confirmado')
  const totalCompanions = confirmed.reduce((s, p) => s + (p.companions ?? 0), 0)
  const totalGuests = confirmed.length + totalCompanions

  async function handleCancel() {
    setMenu(false)
    const ok = await confirm({
      title: '¿Cancelar esta actividad?',
      message: 'Se dejará de recibir confirmaciones y el enlace público quedará deshabilitado.',
      confirmText: 'Sí, cancelar',
      tone: 'danger',
    })
    if (!ok) return
    setCancelling(true)
    const res = await cancelActivity(activity.id)
    setCancelling(false)
    if (res.ok) router.refresh()
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'resumen', label: 'Resumen' },
    { key: 'participantes', label: 'Participantes' },
    { key: 'preguntas', label: 'Preguntas' },
  ]

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-start gap-3 mb-5">
        <button type="button" onClick={() => router.push('/dashboard/actividades')}
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>
          <ChevronLeft size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl md:text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{activity.title}</h1>
            <ActivityStatusBadge status={activity.status} />
          </div>
          <div className="flex items-center gap-3 mt-1.5 flex-wrap text-sm" style={{ color: 'var(--text-secondary)' }}>
            {activity.event_date && (
              <span className="flex items-center gap-1.5">
                <CalendarDays size={13} /> {formatDate(new Date(activity.event_date + 'T12:00'))}
              </span>
            )}
            {activity.start_time && activity.end_time && (
              <span className="flex items-center gap-1.5">
                <Clock size={13} /> {formatTime(activity.start_time)} – {formatTime(activity.end_time)}
              </span>
            )}
            <span className="flex items-center gap-1.5 min-w-0">
              <MapPin size={13} className="shrink-0" /> <span className="truncate">{locationLabel(detail)}</span>
            </span>
          </div>
        </div>

        {/* Acciones */}
        <div className="flex items-center gap-2 shrink-0">
          <button type="button" onClick={() => setShare(true)}
            className="flex items-center gap-1.5 text-sm font-bold px-3.5 py-2 rounded-xl"
            style={{ background: 'var(--brand)', color: '#fff' }}>
            <Share2 size={15} /> <span className="hidden sm:inline">Compartir</span>
          </button>
          <div className="relative">
            <button type="button" onClick={() => setMenu(o => !o)}
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>
              <MoreVertical size={17} />
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setMenu(false)} />
                <div className="absolute right-0 mt-1.5 z-50 w-44 rounded-xl py-1 overflow-hidden"
                  style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}>
                  <button type="button" onClick={handleCancel} disabled={activity.status === 'cancelada' || cancelling}
                    className="w-full flex items-center gap-2 px-3.5 py-2.5 text-sm font-medium text-left disabled:opacity-40"
                    style={{ color: '#DC2626' }}>
                    {cancelling ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                    Cancelar actividad
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="inline-flex gap-1 p-1 rounded-xl mb-5" style={{ background: 'var(--bg-elevated)' }}>
        {tabs.map(t => {
          const active = tab === t.key
          return (
            <button key={t.key} type="button" onClick={() => setTab(t.key)}
              className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
              style={active ? { background: 'var(--brand)', color: '#fff' } : { background: 'transparent', color: '#6B7280' }}>
              {t.label}
            </button>
          )
        })}
      </div>

      {/* ── Resumen ── */}
      {tab === 'resumen' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            { icon: Users,    label: 'Confirmados',  value: confirmed.length },
            { icon: UserPlus, label: 'Acompañantes', value: totalCompanions },
            { icon: Check,    label: 'Total asistentes', value: totalGuests },
          ].map(stat => {
            const Icon = stat.icon
            return (
              <div key={stat.label} className="rounded-2xl p-4"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
                <span className="w-9 h-9 rounded-xl flex items-center justify-center mb-2.5"
                  style={{ background: 'var(--bg-elevated)' }}>
                  <Icon size={16} style={{ color: 'var(--brand)' }} />
                </span>
                <div className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{stat.value}</div>
                <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{stat.label}</div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Participantes ── */}
      {tab === 'participantes' && (
        <div className="space-y-2">
          {participants.length === 0 ? (
            <div className="rounded-2xl p-8 text-center"
              style={{ background: 'var(--bg-card)', border: '2px dashed var(--border-medium)' }}>
              <p className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Aún no hay confirmaciones</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Comparte el enlace para que tus invitados confirmen.</p>
            </div>
          ) : participants.map(p => <ParticipantRow key={p.id} p={p} />)}
        </div>
      )}

      {/* ── Preguntas (solo lectura) ── */}
      {tab === 'preguntas' && (
        <div className="space-y-2">
          {questions.length === 0 ? (
            <div className="rounded-2xl p-8 text-center"
              style={{ background: 'var(--bg-card)', border: '2px dashed var(--border-medium)' }}>
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Sin preguntas</p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Este tipo de actividad no pide datos extra.</p>
            </div>
          ) : questions.map(q => (
            <div key={q.id} className="rounded-xl p-3.5"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{q.label}</span>
                {q.required && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md"
                    style={{ background: 'var(--brand-dim)', color: 'var(--brand)' }}>Obligatoria</span>
                )}
              </div>
              <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                {q.field_type === 'choice' && q.options?.length
                  ? `Opciones: ${q.options.join(' · ')}`
                  : ({ text: 'Texto libre', number: 'Número', boolean: 'Sí / No', choice: 'Selección' } as Record<string, string>)[q.field_type]}
              </div>
            </div>
          ))}
        </div>
      )}

      <ShareSheet code={activity.public_code} title={activity.title} open={shareOpen} onClose={() => setShare(false)} />

      {dialog}
    </div>
  )
}

function ParticipantRow({ p }: { p: ActivityParticipant }) {
  const STATUS: Record<string, { label: string; color: string }> = {
    confirmado: { label: 'Confirmado', color: '#16A34A' },
    invitado:   { label: 'Invitado',   color: '#6B7280' },
    rechazado:  { label: 'No asiste',  color: '#DC2626' },
    registrado: { label: 'Registrado', color: '#0891B2' },
  }
  const s = STATUS[p.status] ?? STATUS.confirmado
  const answers = p.answers && Object.keys(p.answers).length > 0 ? p.answers : null

  return (
    <div className="rounded-xl p-3.5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{p.name}</span>
          {p.companions > 0 && (
            <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full shrink-0"
              style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>
              <UserPlus size={10} /> +{p.companions}
            </span>
          )}
        </div>
        <span className="flex items-center gap-1.5 text-xs font-medium shrink-0" style={{ color: s.color }}>
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.color }} />
          {s.label}
        </span>
      </div>
      {answers && (
        <div className="mt-2 space-y-1 pt-2" style={{ borderTop: '1px solid var(--border-subtle)' }}>
          {Object.entries(answers).map(([k, v]) => (
            <div key={k} className="flex gap-2 text-xs">
              <span className="font-medium shrink-0" style={{ color: 'var(--text-muted)' }}>{k}:</span>
              <span style={{ color: 'var(--text-secondary)' }}>{v}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
