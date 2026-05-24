'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createExternalEvent } from '@/lib/actions/external-events'
import { searchClients } from '@/lib/actions/clients'
import { createClient } from '@/lib/supabase/client'
import DatePicker from '@/components/ui/DatePicker'
import TimePicker from '@/components/ui/TimePicker'
import {
  ChevronLeft, Loader2, Users, DollarSign,
  Building2, Check, User, FileText,
} from 'lucide-react'
import Link from 'next/link'
import type { HostClient, ExternalEventStatus } from '@/types'

const EVENT_TYPES = [
  'Boda', 'Cumpleaños', 'Corporativo', 'Graduación',
  'Baby shower', 'Quince años', 'Cóctel', 'Cena privada', 'Reunión', 'Otro',
]

const STATUS_OPTIONS: { value: ExternalEventStatus; label: string; color: string; bg: string }[] = [
  { value: 'tentativo',  label: 'Tentativo',  color: '#D97706', bg: 'rgba(217,119,6,0.1)'  },
  { value: 'confirmado', label: 'Confirmado', color: '#16A34A', bg: 'rgba(22,163,74,0.1)'  },
]

export default function NuevoEventoPage() {
  const router = useRouter()

  const [spaces,       setSpaces]       = useState<{ id: string; name: string }[]>([])
  const [clientSuggs,  setClientSuggs]  = useState<HostClient[]>([])
  const [showSuggs,    setShowSuggs]    = useState(false)
  const [linkedClient, setLinkedClient] = useState<HostClient | null>(null)
  const [saving,       setSaving]       = useState(false)
  const [error,        setError]        = useState('')
  const searchTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const [form, setForm] = useState({
    title:        '',
    event_type:   '',
    event_date:   '',
    start_time:   '',
    end_time:     '',
    guest_count:  '',
    total_amount: '',
    notes:        '',
    status:       'tentativo' as ExternalEventStatus,
    space_id:     '',
    client_name:  '',
  })

  const f = (field: keyof typeof form, value: string) =>
    setForm(prev => ({ ...prev, [field]: value }))

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      const { data } = await supabase
        .from('spaces').select('id, name')
        .eq('host_id', user.id).eq('is_active', true).order('name')
      setSpaces(data ?? [])
    })
  }, [])

  function onClientNameChange(val: string) {
    f('client_name', val)
    setLinkedClient(null)
    clearTimeout(searchTimer.current)
    if (!val.trim()) { setClientSuggs([]); setShowSuggs(false); return }
    searchTimer.current = setTimeout(async () => {
      const r = await searchClients(val)
      setClientSuggs(r)
      setShowSuggs(r.length > 0)
    }, 250)
  }

  function selectClientSugg(c: HostClient) {
    setLinkedClient(c)
    f('client_name', c.full_name)
    setClientSuggs([])
    setShowSuggs(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!form.title.trim()) { setError('El nombre del evento es obligatorio'); return }
    if (!form.event_date)   { setError('La fecha del evento es obligatoria'); return }

    setSaving(true)
    const r = await createExternalEvent({
      title:        form.title.trim(),
      event_type:   form.event_type || undefined,
      event_date:   form.event_date,
      start_time:   form.start_time || undefined,
      end_time:     form.end_time || undefined,
      guest_count:  form.guest_count ? Number(form.guest_count) : undefined,
      total_amount: form.total_amount ? Number(form.total_amount) : undefined,
      notes:        form.notes || undefined,
      status:       form.status,
      source:       'directo',
      space_id:     form.space_id || undefined,
      client_id:    linkedClient?.id || undefined,
      client_name:  (!linkedClient && form.client_name.trim()) ? form.client_name.trim() : undefined,
    })

    if ('error' in r) { setError(r.error ?? 'Error al crear el evento'); setSaving(false); return }
    router.push('/dashboard/host/eventos')
  }

  const canSubmit = !!form.title.trim() && !!form.event_date && !saving

  return (
    <div className="p-4 md:p-6 max-w-xl mx-auto pb-16">

      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard/host/eventos"
          className="p-2 rounded-xl transition-colors hover:bg-slate-100"
          style={{ color: 'var(--text-muted)' }}>
          <ChevronLeft size={20} />
        </Link>
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            Nuevo evento
          </h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Registra un evento directo o externo
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">

        {/* ── Nombre ── */}
        <div className="rounded-2xl p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
          <label className="text-xs font-semibold uppercase tracking-widest mb-3 block" style={{ color: 'var(--text-muted)' }}>
            Nombre del evento *
          </label>
          <input
            value={form.title}
            onChange={e => f('title', e.target.value)}
            placeholder="Ej. Boda García – Martínez"
            className="w-full px-4 py-3.5 rounded-xl text-sm font-medium focus:outline-none transition-all"
            style={{
              border: `1.5px solid ${form.title ? 'var(--brand)' : 'var(--border-medium)'}`,
              background: 'var(--bg-surface)',
              color: 'var(--text-primary)',
              fontSize: 16,
            }}
          />
        </div>

        {/* ── Tipo de evento ── */}
        <div className="rounded-2xl p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
          <div className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>
            Tipo de evento
          </div>
          <div className="flex flex-wrap gap-2">
            {EVENT_TYPES.map(t => (
              <button
                key={t}
                type="button"
                onClick={() => f('event_type', form.event_type === t ? '' : t)}
                className="px-3 py-1.5 rounded-full text-sm font-medium transition-all"
                style={form.event_type === t
                  ? { background: 'var(--brand)', color: '#fff', border: '1.5px solid var(--brand)' }
                  : { background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1.5px solid var(--border-subtle)' }
                }>
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* ── Estado ── */}
        <div className="rounded-2xl p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
          <div className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>
            Estado
          </div>
          <div className="flex gap-2">
            {STATUS_OPTIONS.map(s => (
              <button
                key={s.value}
                type="button"
                onClick={() => f('status', s.value)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-1.5"
                style={form.status === s.value
                  ? { background: s.bg, color: s.color, border: `1.5px solid ${s.color}40` }
                  : { background: 'var(--bg-elevated)', color: 'var(--text-muted)', border: '1.5px solid var(--border-subtle)' }
                }>
                {form.status === s.value && <Check size={13} />}
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Fecha ── */}
        <div className="rounded-2xl p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
          <div className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>
            Fecha *
          </div>
          <DatePicker
            value={form.event_date}
            onChange={v => f('event_date', v)}
            placeholder="Seleccionar fecha del evento"
          />
        </div>

        {/* ── Horario ── */}
        <div className="rounded-2xl p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
          <div className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>
            Horario
          </div>
          <div className="grid grid-cols-2 gap-3">
            <TimePicker
              value={form.start_time}
              onChange={v => f('start_time', v)}
              placeholder="Hora inicio"
            />
            <TimePicker
              value={form.end_time}
              onChange={v => f('end_time', v)}
              placeholder="Hora fin"
              afterValue={form.start_time || undefined}
              minMinutesAfter={30}
            />
          </div>
        </div>

        {/* ── Personas y monto ── */}
        <div className="rounded-2xl p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
          <div className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>
            Detalles
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium mb-1.5 flex items-center gap-1" style={{ color: 'var(--text-secondary)' }}>
                <Users size={11} /> Personas
              </label>
              <input
                type="number" min="1" value={form.guest_count}
                onChange={e => f('guest_count', e.target.value)}
                placeholder="0"
                className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none"
                style={{ border: '1.5px solid var(--border-medium)', background: 'var(--bg-surface)', color: 'var(--text-primary)', fontSize: 16 }}
              />
            </div>
            <div>
              <label className="text-xs font-medium mb-1.5 flex items-center gap-1" style={{ color: 'var(--text-secondary)' }}>
                <DollarSign size={11} /> Total (RD$)
              </label>
              <input
                type="number" min="0" step="0.01" value={form.total_amount}
                onChange={e => f('total_amount', e.target.value)}
                placeholder="0.00"
                className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none"
                style={{ border: '1.5px solid var(--border-medium)', background: 'var(--bg-surface)', color: 'var(--text-primary)', fontSize: 16 }}
              />
            </div>
          </div>

          {spaces.length > 0 && (
            <div className="mt-3">
              <label className="text-xs font-medium mb-1.5 flex items-center gap-1" style={{ color: 'var(--text-secondary)' }}>
                <Building2 size={11} /> Espacio
              </label>
              <select
                value={form.space_id} onChange={e => f('space_id', e.target.value)}
                className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none"
                style={{ border: '1.5px solid var(--border-medium)', background: 'var(--bg-surface)', color: 'var(--text-primary)', fontSize: 16 }}>
                <option value="">— Sin espacio asignado —</option>
                {spaces.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          )}
        </div>

        {/* ── Cliente ── */}
        <div className="rounded-2xl p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Cliente</div>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Opcional</span>
          </div>
          <div className="relative">
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl transition-all"
              style={{
                border: `1.5px solid ${linkedClient ? 'var(--brand)' : 'var(--border-medium)'}`,
                background: linkedClient ? 'rgba(53,196,147,0.04)' : 'var(--bg-surface)',
              }}>
              <User size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
              <input
                value={form.client_name}
                onChange={e => onClientNameChange(e.target.value)}
                onFocus={() => clientSuggs.length > 0 && setShowSuggs(true)}
                onBlur={() => setTimeout(() => setShowSuggs(false), 150)}
                placeholder="Nombre (escribe para buscar en CRM)"
                className="flex-1 bg-transparent text-sm focus:outline-none"
                style={{ color: 'var(--text-primary)', fontSize: 16 }}
              />
              {linkedClient && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full shrink-0"
                  style={{ background: 'rgba(53,196,147,0.12)', color: '#16A34A' }}>
                  CRM
                </span>
              )}
            </div>

            {showSuggs && clientSuggs.length > 0 && (
              <div className="absolute z-20 left-0 right-0 mt-1 rounded-xl overflow-hidden shadow-xl"
                style={{ background: '#fff', border: '1px solid var(--border-subtle)' }}>
                {clientSuggs.map(c => (
                  <button key={c.id} type="button"
                    onMouseDown={() => selectClientSugg(c)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                      style={{ background: 'var(--brand)' }}>
                      {c.full_name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{c.full_name}</div>
                      <div className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{c.phone || c.email || '—'}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
          <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
            Si el cliente ya existe en tu CRM aparecerá al escribir. Si no, se guarda como texto libre.
          </p>
        </div>

        {/* ── Notas ── */}
        <div className="rounded-2xl p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
          <label className="text-xs font-semibold uppercase tracking-widest mb-3 flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
            <FileText size={11} /> Notas internas
          </label>
          <textarea
            value={form.notes} onChange={e => f('notes', e.target.value)}
            placeholder="Detalles adicionales, requerimientos, observaciones..."
            rows={3}
            className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none resize-none"
            style={{ border: '1.5px solid var(--border-medium)', background: 'var(--bg-surface)', color: 'var(--text-primary)', fontSize: 16 }}
          />
        </div>

        {/* Error */}
        {error && (
          <div className="px-4 py-3 rounded-xl text-sm font-medium"
            style={{ background: 'rgba(220,38,38,0.05)', border: '1px solid rgba(220,38,38,0.2)', color: '#DC2626' }}>
            {error}
          </div>
        )}

        {/* Botones */}
        <div className="flex gap-3 pt-1">
          <Link href="/dashboard/host/eventos"
            className="flex-1 py-3.5 rounded-xl text-sm font-semibold text-center transition-colors hover:bg-slate-50"
            style={{ border: '1.5px solid var(--border-medium)', color: 'var(--text-secondary)' }}>
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={!canSubmit}
            className="flex-1 py-3.5 rounded-xl text-sm font-semibold text-white disabled:opacity-40 flex items-center justify-center gap-2 transition-opacity"
            style={{ background: 'var(--brand)' }}>
            {saving
              ? <Loader2 size={15} className="animate-spin" />
              : <><Check size={15} /> Crear evento</>
            }
          </button>
        </div>

      </form>
    </div>
  )
}
