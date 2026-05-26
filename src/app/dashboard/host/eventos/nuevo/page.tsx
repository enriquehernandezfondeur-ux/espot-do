'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createExternalEvent } from '@/lib/actions/external-events'
import { searchClients, createClient_ } from '@/lib/actions/clients'
import type { CreateClientPayload } from '@/lib/actions/clients'
import { createClient } from '@/lib/supabase/client'
import DatePicker from '@/components/ui/DatePicker'
import TimePicker from '@/components/ui/TimePicker'
import {
  ChevronLeft, Loader2, Users, DollarSign,
  Building2, Check, User, FileText, Phone, Mail, Clock,
} from 'lucide-react'
import Link from 'next/link'
import type { HostClient, ExternalEventStatus } from '@/types'

const EVENT_TYPES = [
  'Boda', 'Cumpleaños', 'Corporativo', 'Graduación',
  'Baby shower', 'Quince años', 'Cóctel', 'Cena privada', 'Reunión', 'Otro',
]

const STATUS_OPTIONS: { value: ExternalEventStatus; label: string; color: string; bg: string }[] = [
  { value: 'pendiente',  label: 'Pendiente', color: '#D97706', bg: 'rgba(217,119,6,0.1)'  },
  { value: 'confirmado', label: 'Confirmado',  color: '#16A34A', bg: 'rgba(22,163,74,0.1)'  },
]

interface SpaceBlock { block_name: string; start_time: string; end_time: string }

function fmtInt(raw: string) {
  if (!raw) return ''
  const n = parseInt(raw.replace(/\D/g, ''), 10)
  return isNaN(n) ? '' : n.toLocaleString('en-US')
}
function fmtAmount(raw: string) {
  if (!raw) return ''
  const [intPart, decPart] = raw.split('.')
  const n = parseInt(intPart.replace(/\D/g, '') || '0', 10)
  const base = n.toLocaleString('en-US')
  return decPart !== undefined ? `${base}.${decPart}` : base
}

export default function NuevoEventoPage() {
  const router = useRouter()

  const [spaces,       setSpaces]       = useState<{ id: string; name: string }[]>([])
  const [spaceBlocks,  setSpaceBlocks]  = useState<SpaceBlock[]>([])
  const [clientSuggs,  setClientSuggs]  = useState<HostClient[]>([])
  const [showSuggs,    setShowSuggs]    = useState(false)
  const [linkedClient, setLinkedClient] = useState<HostClient | null>(null)
  const [saving,       setSaving]       = useState(false)
  const [error,        setError]        = useState('')

  const [typeSuggs,    setTypeSuggs]    = useState<string[]>([])
  const [showTypeSugg, setShowTypeSugg] = useState(false)
  const [guestFocus,   setGuestFocus]   = useState(false)
  const [amountFocus,  setAmountFocus]  = useState(false)

  const clientTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const supabaseRef = useRef(createClient())

  const [form, setForm] = useState({
    event_type:    '',
    event_date:    '',
    start_time:    '',
    end_time:      '',
    guest_count:   '',
    total_amount:  '',
    notes:         '',
    status:        'pendiente' as ExternalEventStatus,
    space_id:      '',
    client_name:   '',
    client_phone:  '',
    client_email:  '',
  })

  const f = (field: keyof typeof form, value: string) =>
    setForm(prev => ({ ...prev, [field]: value }))

  // Cargar espacios activos del host
  useEffect(() => {
    const supabase = supabaseRef.current
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      const { data } = await supabase
        .from('spaces').select('id, name')
        .eq('host_id', user.id).eq('is_active', true).order('name')
      const list = data ?? []
      setSpaces(list)
      // Preselect first space and load its blocks
      if (list.length === 1) {
        setForm(prev => ({ ...prev, space_id: list[0].id }))
        loadSpaceBlocks(list[0].id)
      }
    })
  }, [])

  async function loadSpaceBlocks(spaceId: string) {
    if (!spaceId) { setSpaceBlocks([]); return }
    const supabase = supabaseRef.current
    const { data } = await supabase
      .from('space_time_blocks')
      .select('block_name, start_time, end_time')
      .eq('space_id', spaceId)
      .order('start_time')
    setSpaceBlocks(data ?? [])
    // Reset times when space changes
    setForm(prev => ({ ...prev, start_time: '', end_time: '' }))
  }

  function onSpaceChange(spaceId: string) {
    f('space_id', spaceId)
    loadSpaceBlocks(spaceId)
  }

  // Allowed range for TimePicker: union of all blocks
  const timeAllowedRange = spaceBlocks.length > 0
    ? { start: spaceBlocks[0].start_time, end: spaceBlocks[spaceBlocks.length - 1].end_time }
    : undefined

  // ── Autocomplete cliente ──────────────────────────────────
  function onClientNameChange(val: string) {
    f('client_name', val)
    setLinkedClient(null)
    clearTimeout(clientTimer.current)
    if (!val.trim()) { setClientSuggs([]); setShowSuggs(false); return }
    clientTimer.current = setTimeout(async () => {
      const r = await searchClients(val)
      setClientSuggs(r)
      setShowSuggs(r.length > 0)
    }, 250)
  }

  function selectClientSugg(c: HostClient) {
    setLinkedClient(c)
    f('client_name',  c.full_name)
    f('client_phone', c.phone  ?? '')
    f('client_email', c.email  ?? '')
    setClientSuggs([])
    setShowSuggs(false)
  }

  // ── Autocomplete tipo de evento ──────────────────────────
  function onTypeChange(val: string) {
    f('event_type', val)
    if (!val.trim()) { setTypeSuggs([]); setShowTypeSugg(false); return }
    const matches = EVENT_TYPES.filter(t => t.toLowerCase().includes(val.toLowerCase()))
    setTypeSuggs(matches)
    setShowTypeSugg(matches.length > 0)
  }

  // ── Submit ───────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!form.event_date) { setError('La fecha del evento es obligatoria'); return }

    setSaving(true)

    // Título auto-generado
    const autoTitle = [form.event_type.trim(), form.client_name.trim()]
      .filter(Boolean).join(' – ') || 'Nuevo evento'

    // Auto-crear cliente en CRM si es nombre nuevo
    let finalClientId = linkedClient?.id
    if (!linkedClient && form.client_name.trim()) {
      const payload: CreateClientPayload = {
        full_name: form.client_name.trim(),
        source:    'manual',
      }
      if (form.client_phone.trim()) payload.phone = form.client_phone.trim()
      if (form.client_email.trim()) payload.email = form.client_email.trim()
      const result = await createClient_(payload)
      if ('data' in result && result.data) finalClientId = (result.data as any).id
    }

    const r = await createExternalEvent({
      title:        autoTitle,
      event_type:   form.event_type.trim() || undefined,
      event_date:   form.event_date,
      start_time:   form.start_time || undefined,
      end_time:     form.end_time   || undefined,
      guest_count:  form.guest_count  ? Number(form.guest_count.replace(/\D/g, ''))  : undefined,
      total_amount: form.total_amount ? Number(form.total_amount.replace(/,/g, ''))  : undefined,
      notes:        form.notes || undefined,
      status:       form.status,
      source:       'directo',
      space_id:     form.space_id || undefined,
      client_id:    finalClientId || undefined,
      client_name:  (!finalClientId && form.client_name.trim()) ? form.client_name.trim() : undefined,
    })

    if ('error' in r) { setError(r.error ?? 'Error al crear el evento'); setSaving(false); return }
    router.push('/dashboard/host/eventos')
  }

  const canSubmit = !!form.event_date && !saving

  const inputStyle = {
    border: '1.5px solid var(--border-medium)',
    background: 'var(--bg-surface)',
    color: 'var(--text-primary)',
    fontSize: 16,
  }

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

        {/* ── 1. Espacio (primero) ── */}
        <div className="rounded-2xl p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
          <label className="text-xs font-semibold uppercase tracking-widest mb-3 flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
            <Building2 size={11} /> Espacio
          </label>
          {spaces.length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No tienes espacios activos.</p>
          ) : (
            <select
              value={form.space_id} onChange={e => onSpaceChange(e.target.value)}
              className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none"
              style={{ ...inputStyle, border: `1.5px solid ${form.space_id ? 'var(--brand)' : 'var(--border-medium)'}` }}>
              <option value="">— Sin espacio asignado —</option>
              {spaces.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          )}
          {/* Horarios del espacio */}
          {spaceBlocks.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {spaceBlocks.map(b => (
                <span key={b.block_name} className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium"
                  style={{ background: 'rgba(53,196,147,0.1)', color: 'var(--brand)' }}>
                  <Clock size={10} />
                  {b.block_name}: {b.start_time.slice(0,5)} – {b.end_time.slice(0,5)}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* ── 2. Tipo de evento ── */}
        <div className="rounded-2xl p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
          <label className="text-xs font-semibold uppercase tracking-widest mb-3 block" style={{ color: 'var(--text-muted)' }}>
            Tipo de evento
          </label>
          <div className="relative">
            <input
              value={form.event_type}
              onChange={e => onTypeChange(e.target.value)}
              onFocus={() => {
                setTypeSuggs(form.event_type.trim() ? typeSuggs : EVENT_TYPES)
                setShowTypeSugg(true)
              }}
              onBlur={() => setTimeout(() => setShowTypeSugg(false), 150)}
              placeholder="Boda, Corporativo, Cumpleaños…"
              className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none"
              style={inputStyle}
            />
            {showTypeSugg && typeSuggs.length > 0 && (
              <div className="absolute z-20 left-0 right-0 mt-1 rounded-xl overflow-hidden shadow-xl"
                style={{ background: '#fff', border: '1px solid var(--border-subtle)' }}>
                {typeSuggs.map(t => (
                  <button key={t} type="button"
                    onMouseDown={() => { f('event_type', t); setShowTypeSugg(false) }}
                    className="w-full px-4 py-3 text-left text-sm hover:bg-slate-50 transition-colors"
                    style={{ color: 'var(--text-primary)' }}>
                    {t}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── 3. Estado ── */}
        <div className="rounded-2xl p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
          <div className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>Estado</div>
          <div className="flex gap-2">
            {STATUS_OPTIONS.map(s => (
              <button key={s.value} type="button"
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

        {/* ── 4. Fecha ── */}
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

        {/* ── 5. Horario (usa horarios reales del espacio) ── */}
        <div className="rounded-2xl p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
          <div className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>
            Horario {spaceBlocks.length > 0 && <span className="normal-case font-normal" style={{ color: 'var(--brand)' }}>· según horario del espacio</span>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <TimePicker
              value={form.start_time}
              onChange={v => f('start_time', v)}
              placeholder="Hora inicio"
              allowedRange={timeAllowedRange}
            />
            <TimePicker
              value={form.end_time}
              onChange={v => f('end_time', v)}
              placeholder="Hora fin"
              afterValue={form.start_time || undefined}
              minMinutesAfter={30}
              allowedRange={timeAllowedRange}
            />
          </div>
          {spaceBlocks.length === 0 && form.space_id && (
            <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
              Este espacio no tiene horarios configurados. Se mostrarán todos los horarios disponibles.
            </p>
          )}
        </div>

        {/* ── 6. Detalles ── */}
        <div className="rounded-2xl p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
          <div className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>Detalles</div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium mb-1.5 flex items-center gap-1" style={{ color: 'var(--text-secondary)' }}>
                <Users size={11} /> Personas
              </label>
              <input
                inputMode="numeric"
                value={guestFocus ? form.guest_count : fmtInt(form.guest_count)}
                onFocus={() => setGuestFocus(true)}
                onBlur={() => setGuestFocus(false)}
                onChange={e => f('guest_count', e.target.value.replace(/\D/g, ''))}
                placeholder="0"
                className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none"
                style={inputStyle}
              />
            </div>
            <div>
              <label className="text-xs font-medium mb-1.5 flex items-center gap-1" style={{ color: 'var(--text-secondary)' }}>
                <DollarSign size={11} /> Monto total (RD$)
              </label>
              <input
                inputMode="decimal"
                value={amountFocus ? form.total_amount : fmtAmount(form.total_amount)}
                onFocus={() => setAmountFocus(true)}
                onBlur={() => setAmountFocus(false)}
                onChange={e => {
                  const clean = e.target.value.replace(/[^0-9.]/g, '')
                  const parts = clean.split('.')
                  f('total_amount', parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : clean)
                }}
                placeholder="0"
                className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none"
                style={inputStyle}
              />
              {form.total_amount && !amountFocus && (
                <p className="text-xs mt-1 font-medium" style={{ color: 'var(--brand)' }}>
                  RD$ {fmtAmount(form.total_amount)}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ── 7. Cliente ── */}
        <div className="rounded-2xl p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Cliente</div>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Opcional · se guarda en CRM</span>
          </div>

          {/* Nombre */}
          <div className="relative mb-2">
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
                placeholder="Nombre del cliente"
                className="flex-1 bg-transparent text-sm focus:outline-none"
                style={{ color: 'var(--text-primary)', fontSize: 16 }}
              />
              {linkedClient && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full shrink-0"
                  style={{ background: 'rgba(53,196,147,0.12)', color: '#16A34A' }}>
                  CRM ✓
                </span>
              )}
            </div>
            {showSuggs && clientSuggs.length > 0 && (
              <div className="absolute z-20 left-0 right-0 mt-1 rounded-xl overflow-hidden shadow-xl"
                style={{ background: '#fff', border: '1px solid var(--border-subtle)' }}>
                {clientSuggs.map(c => (
                  <button key={c.id} type="button"
                    onMouseDown={() => selectClientSugg(c)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50">
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

          {/* Teléfono + email (aparecen al escribir nombre) */}
          {form.client_name.trim() && (
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
                style={{ border: '1.5px solid var(--border-medium)', background: 'var(--bg-surface)' }}>
                <Phone size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                <input value={form.client_phone} onChange={e => f('client_phone', e.target.value)}
                  placeholder="Teléfono" className="flex-1 bg-transparent text-sm focus:outline-none min-w-0"
                  style={{ color: 'var(--text-primary)', fontSize: 15 }} />
              </div>
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
                style={{ border: '1.5px solid var(--border-medium)', background: 'var(--bg-surface)' }}>
                <Mail size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                <input value={form.client_email} onChange={e => f('client_email', e.target.value)}
                  placeholder="Email" type="email" className="flex-1 bg-transparent text-sm focus:outline-none min-w-0"
                  style={{ color: 'var(--text-primary)', fontSize: 15 }} />
              </div>
            </div>
          )}
          {!linkedClient && form.client_name.trim() && (
            <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
              Se creará como nuevo cliente en tu CRM al guardar.
            </p>
          )}
        </div>

        {/* ── 8. Notas ── */}
        <div className="rounded-2xl p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
          <label className="text-xs font-semibold uppercase tracking-widest mb-3 flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
            <FileText size={11} /> Notas internas
          </label>
          <textarea value={form.notes} onChange={e => f('notes', e.target.value)}
            placeholder="Detalles adicionales, requerimientos, observaciones..."
            rows={3} className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none resize-none"
            style={inputStyle} />
        </div>

        {error && (
          <div className="px-4 py-3 rounded-xl text-sm font-medium"
            style={{ background: 'rgba(220,38,38,0.05)', border: '1px solid rgba(220,38,38,0.2)', color: '#DC2626' }}>
            {error}
          </div>
        )}

        <div className="flex gap-3 pt-1">
          <Link href="/dashboard/host/eventos"
            className="flex-1 py-3.5 rounded-xl text-sm font-semibold text-center transition-colors hover:bg-slate-50"
            style={{ border: '1.5px solid var(--border-medium)', color: 'var(--text-secondary)' }}>
            Cancelar
          </Link>
          <button type="submit" disabled={!canSubmit}
            className="flex-1 py-3.5 rounded-xl text-sm font-semibold text-white disabled:opacity-40 flex items-center justify-center gap-2"
            style={{ background: 'var(--brand)' }}>
            {saving ? <Loader2 size={15} className="animate-spin" /> : <><Check size={15} /> Crear evento</>}
          </button>
        </div>

      </form>
    </div>
  )
}
