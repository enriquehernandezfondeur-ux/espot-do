'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createExternalEvent } from '@/lib/actions/external-events'
import { searchClients } from '@/lib/actions/clients'
import { createClient } from '@/lib/supabase/client'
import { ChevronLeft, Loader2, CalendarDays, Clock, Users, DollarSign, Building2, Check, User } from 'lucide-react'
import Link from 'next/link'
import type { HostClient, ExternalEventStatus, ExternalEventSource } from '@/types'

const EVENT_TYPES = [
  'Boda', 'Cumpleaños', 'Corporativo', 'Graduación', 'Baby shower',
  'Quince años', 'Cóctel', 'Cena privada', 'Reunión', 'Otro',
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
    source:       'directo' as ExternalEventSource,
    space_id:     '',
    client_name:  '',  // texto libre, sin requerir CRM
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

  // Autocompletar desde CRM mientras escribe el nombre del cliente
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
    if (!form.title.trim())  { setError('El nombre del evento es obligatorio'); return }
    if (!form.event_date)    { setError('La fecha del evento es obligatoria'); return }

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
      source:       form.source,
      space_id:     form.space_id || undefined,
      client_id:    linkedClient?.id || undefined,
      client_name:  (!linkedClient && form.client_name.trim()) ? form.client_name.trim() : undefined,
    })

    if ('error' in r) { setError(r.error ?? 'Error al crear el evento'); setSaving(false); return }
    router.push('/dashboard/host/eventos')
  }

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard/host/eventos"
          className="p-2 rounded-xl transition-colors hover:bg-slate-100 text-gray-500">
          <ChevronLeft size={18} />
        </Link>
        <div>
          <h1 className="text-xl font-bold" style={{ color: '#0F1623', letterSpacing: '-0.02em' }}>Nuevo evento</h1>
          <p className="text-sm text-gray-500">Registra un evento directo o externo</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">

        {/* Card: Datos principales */}
        <div className="rounded-2xl p-5 space-y-4" style={{ background: '#fff', border: '1px solid #E8ECF0' }}>
          <div className="text-xs font-semibold uppercase tracking-widest text-gray-400">Datos del evento</div>

          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Nombre del evento *</label>
            <input required value={form.title} onChange={e => f('title', e.target.value)}
              placeholder="Ej. Boda García – Martínez"
              className="w-full px-4 py-3 rounded-xl text-sm border focus:outline-none"
              style={{ border: '1px solid #E8ECF0', fontSize: 16 }} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Tipo de evento</label>
              <select value={form.event_type} onChange={e => f('event_type', e.target.value)}
                className="w-full px-4 py-3 rounded-xl text-sm border focus:outline-none"
                style={{ border: '1px solid #E8ECF0', fontSize: 16 }}>
                <option value="">— Seleccionar —</option>
                {EVENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Estado inicial</label>
              <select value={form.status} onChange={e => f('status', e.target.value as ExternalEventStatus)}
                className="w-full px-4 py-3 rounded-xl text-sm border focus:outline-none"
                style={{ border: '1px solid #E8ECF0', fontSize: 16 }}>
                <option value="tentativo">Tentativo</option>
                <option value="confirmado">Confirmado</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1.5 block flex items-center gap-1.5">
              <CalendarDays size={12} /> Fecha del evento *
            </label>
            <input required type="date" value={form.event_date} onChange={e => f('event_date', e.target.value)}
              className="w-full px-4 py-3 rounded-xl text-sm border focus:outline-none"
              style={{ border: '1px solid #E8ECF0', fontSize: 16 }} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1.5 block flex items-center gap-1.5">
                <Clock size={12} /> Hora inicio
              </label>
              <input type="time" value={form.start_time} onChange={e => f('start_time', e.target.value)}
                className="w-full px-4 py-3 rounded-xl text-sm border focus:outline-none"
                style={{ border: '1px solid #E8ECF0', fontSize: 16 }} />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Hora fin</label>
              <input type="time" value={form.end_time} onChange={e => f('end_time', e.target.value)}
                className="w-full px-4 py-3 rounded-xl text-sm border focus:outline-none"
                style={{ border: '1px solid #E8ECF0', fontSize: 16 }} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1.5 block flex items-center gap-1.5">
                <Users size={12} /> Personas
              </label>
              <input type="number" min="1" value={form.guest_count} onChange={e => f('guest_count', e.target.value)}
                placeholder="0" className="w-full px-4 py-3 rounded-xl text-sm border focus:outline-none"
                style={{ border: '1px solid #E8ECF0', fontSize: 16 }} />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1.5 block flex items-center gap-1.5">
                <DollarSign size={12} /> Total (RD$)
              </label>
              <input type="number" min="0" step="0.01" value={form.total_amount} onChange={e => f('total_amount', e.target.value)}
                placeholder="0.00" className="w-full px-4 py-3 rounded-xl text-sm border focus:outline-none"
                style={{ border: '1px solid #E8ECF0', fontSize: 16 }} />
            </div>
          </div>

          {spaces.length > 0 && (
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1.5 block flex items-center gap-1.5">
                <Building2 size={12} /> Espacio
              </label>
              <select value={form.space_id} onChange={e => f('space_id', e.target.value)}
                className="w-full px-4 py-3 rounded-xl text-sm border focus:outline-none"
                style={{ border: '1px solid #E8ECF0', fontSize: 16 }}>
                <option value="">— Sin espacio asignado —</option>
                {spaces.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          )}
        </div>

        {/* Card: Cliente — campo libre con autocompletar opcional */}
        <div className="rounded-2xl p-5 space-y-3" style={{ background: '#fff', border: '1px solid #E8ECF0' }}>
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold uppercase tracking-widest text-gray-400">Cliente</div>
            <div className="text-xs text-gray-400">Opcional</div>
          </div>

          <div className="relative">
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl"
              style={{ border: `1px solid ${linkedClient ? 'rgba(53,196,147,0.4)' : '#E8ECF0'}`, background: linkedClient ? 'rgba(53,196,147,0.03)' : '#fff' }}>
              <User size={14} className="text-gray-400 shrink-0" />
              <input
                value={form.client_name}
                onChange={e => onClientNameChange(e.target.value)}
                onFocus={() => clientSuggs.length > 0 && setShowSuggs(true)}
                onBlur={() => setTimeout(() => setShowSuggs(false), 150)}
                placeholder="Nombre del cliente (escribe para buscar en CRM)"
                className="flex-1 bg-transparent text-sm focus:outline-none text-gray-700 placeholder-gray-400"
                style={{ fontSize: 16 }} />
              {linkedClient && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full shrink-0"
                  style={{ background: 'rgba(53,196,147,0.1)', color: '#16A34A' }}>
                  CRM
                </span>
              )}
            </div>

            {/* Dropdown autocompletar */}
            {showSuggs && clientSuggs.length > 0 && (
              <div className="absolute z-20 left-0 right-0 mt-1 rounded-xl overflow-hidden shadow-xl"
                style={{ background: '#fff', border: '1px solid #E8ECF0' }}>
                {clientSuggs.map(c => (
                  <button key={c.id} type="button"
                    onMouseDown={() => selectClientSugg(c)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                      style={{ background: 'var(--brand)' }}>
                      {c.full_name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold truncate" style={{ color: '#0F1623' }}>{c.full_name}</div>
                      <div className="text-xs text-gray-400 truncate">{c.phone || c.email || '—'}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <p className="text-xs text-gray-400">
            Escribe el nombre — si ya existe en tu CRM aparecerá para vincularlo. Si no, se guarda como texto libre.
          </p>
        </div>

        {/* Card: Notas */}
        <div className="rounded-2xl p-5 space-y-3" style={{ background: '#fff', border: '1px solid #E8ECF0' }}>
          <div className="text-xs font-semibold uppercase tracking-widest text-gray-400">Notas internas</div>
          <textarea value={form.notes} onChange={e => f('notes', e.target.value)}
            placeholder="Detalles adicionales, requerimientos, observaciones..."
            rows={3} className="w-full px-4 py-3 rounded-xl text-sm border focus:outline-none resize-none"
            style={{ border: '1px solid #E8ECF0', fontSize: 16 }} />
        </div>

        {error && (
          <div className="px-4 py-3 rounded-xl text-sm font-medium"
            style={{ background: 'rgba(220,38,38,0.05)', border: '1px solid rgba(220,38,38,0.2)', color: '#DC2626' }}>
            {error}
          </div>
        )}

        <div className="flex gap-3 pb-8">
          <Link href="/dashboard/host/eventos"
            className="flex-1 py-3 rounded-xl text-sm font-semibold text-center text-gray-600 hover:bg-slate-50"
            style={{ border: '1px solid #E8ECF0' }}>
            Cancelar
          </Link>
          <button type="submit" disabled={saving || !form.title.trim() || !form.event_date}
            className="flex-1 py-3 rounded-xl text-sm font-semibold text-white disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ background: 'var(--brand)' }}>
            {saving ? <Loader2 size={15} className="animate-spin" /> : <><Check size={15} /> Crear evento</>}
          </button>
        </div>
      </form>
    </div>
  )
}
