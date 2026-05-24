'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createExternalEvent } from '@/lib/actions/external-events'
import { searchClients, createClient_ } from '@/lib/actions/clients'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency } from '@/lib/utils'
import {
  ChevronLeft, Search, Plus, Loader2, CalendarDays, Clock,
  Users, DollarSign, FileText, User, Building2, X, Check,
} from 'lucide-react'
import Link from 'next/link'
import type { HostClient, ExternalEventStatus, ExternalEventSource } from '@/types'

const EVENT_TYPES = [
  'Boda', 'Cumpleaños', 'Corporativo', 'Graduación', 'Baby shower',
  'Quince años', 'Cóctel', 'Cena privada', 'Reunión', 'Otro',
]

const STATUS_OPTIONS: { value: ExternalEventStatus; label: string }[] = [
  { value: 'tentativo',  label: 'Tentativo — pendiente de confirmar' },
  { value: 'confirmado', label: 'Confirmado' },
]

export default function NuevoEventoPage() {
  const router = useRouter()

  const [spaces, setSpaces] = useState<{ id: string; name: string }[]>([])
  const [clientSearch, setClientSearch] = useState('')
  const [clientResults, setClientResults] = useState<HostClient[]>([])
  const [clientLoading, setClientLoading] = useState(false)
  const [showClientDropdown, setShowClientDropdown] = useState(false)
  const [showNewClient, setShowNewClient] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

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
    client_id:    '',
  })

  const [selectedClient, setSelectedClient] = useState<HostClient | null>(null)

  // Form de cliente rápido
  const [quickClient, setQuickClient] = useState({ full_name: '', phone: '', email: '' })

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      const { data } = await supabase
        .from('spaces')
        .select('id, name')
        .eq('host_id', user.id)
        .eq('is_active', true)
        .order('name')
      setSpaces(data ?? [])
    })
  }, [])

  // Buscar clientes con debounce
  useEffect(() => {
    clearTimeout(searchTimer.current)
    if (!clientSearch.trim()) { setClientResults([]); return }
    setClientLoading(true)
    searchTimer.current = setTimeout(async () => {
      const r = await searchClients(clientSearch)
      setClientResults(r)
      setClientLoading(false)
      setShowClientDropdown(true)
    }, 300)
  }, [clientSearch])

  function selectClient(c: HostClient) {
    setSelectedClient(c)
    setForm(f => ({ ...f, client_id: c.id }))
    setClientSearch(c.full_name)
    setShowClientDropdown(false)
  }

  function clearClient() {
    setSelectedClient(null)
    setForm(f => ({ ...f, client_id: '' }))
    setClientSearch('')
  }

  async function handleCreateQuickClient() {
    if (!quickClient.full_name.trim()) return
    setSaving(true)
    const r = await createClient_({ full_name: quickClient.full_name, phone: quickClient.phone, email: quickClient.email, source: 'manual' })
    if ('error' in r) { setError(r.error ?? 'Error'); setSaving(false); return }
    selectClient(r.data as HostClient)
    setShowNewClient(false)
    setQuickClient({ full_name: '', phone: '', email: '' })
    setSaving(false)
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
      client_id:    form.client_id || undefined,
    })

    if ('error' in r) { setError(r.error ?? 'Error'); setSaving(false); return }

    router.push('/dashboard/host/eventos')
  }

  const f = (field: keyof typeof form, value: string) => setForm(prev => ({ ...prev, [field]: value }))

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard/host/eventos"
          className="p-2 rounded-xl transition-colors hover:bg-slate-100 text-gray-500">
          <ChevronLeft size={18} />
        </Link>
        <div>
          <h1 className="text-xl font-bold" style={{ color: '#0F1623', letterSpacing: '-0.02em' }}>Nuevo evento</h1>
          <p className="text-sm text-gray-500">Registra un evento externo o directo</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Card: Datos del evento */}
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
              <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Estado</label>
              <select value={form.status} onChange={e => f('status', e.target.value as ExternalEventStatus)}
                className="w-full px-4 py-3 rounded-xl text-sm border focus:outline-none"
                style={{ border: '1px solid #E8ECF0', fontSize: 16 }}>
                {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
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
                placeholder="0"
                className="w-full px-4 py-3 rounded-xl text-sm border focus:outline-none"
                style={{ border: '1px solid #E8ECF0', fontSize: 16 }} />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1.5 block flex items-center gap-1.5">
                <DollarSign size={12} /> Total evento (RD$)
              </label>
              <input type="number" min="0" step="0.01" value={form.total_amount} onChange={e => f('total_amount', e.target.value)}
                placeholder="0.00"
                className="w-full px-4 py-3 rounded-xl text-sm border focus:outline-none"
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

        {/* Card: Cliente */}
        <div className="rounded-2xl p-5 space-y-4" style={{ background: '#fff', border: '1px solid #E8ECF0' }}>
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold uppercase tracking-widest text-gray-400">Cliente</div>
            {!showNewClient && !selectedClient && (
              <button type="button" onClick={() => setShowNewClient(true)}
                className="text-xs font-semibold flex items-center gap-1" style={{ color: 'var(--brand)' }}>
                <Plus size={12} /> Crear nuevo
              </button>
            )}
          </div>

          {selectedClient ? (
            <div className="flex items-center justify-between p-3 rounded-xl"
              style={{ background: 'rgba(53,196,147,0.05)', border: '1px solid rgba(53,196,147,0.2)' }}>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white"
                  style={{ background: 'var(--brand)' }}>
                  {selectedClient.full_name.charAt(0)}
                </div>
                <div>
                  <div className="text-sm font-semibold" style={{ color: '#0F1623' }}>{selectedClient.full_name}</div>
                  {selectedClient.phone && <div className="text-xs text-gray-400">{selectedClient.phone}</div>}
                </div>
              </div>
              <button type="button" onClick={clearClient} className="text-gray-400 hover:text-gray-600">
                <X size={14} />
              </button>
            </div>
          ) : showNewClient ? (
            <div className="space-y-3 p-3 rounded-xl" style={{ background: '#F8FAFB', border: '1px solid #E8ECF0' }}>
              <div className="text-xs font-semibold text-gray-600">Crear cliente rápido</div>
              <input value={quickClient.full_name} onChange={e => setQuickClient(f => ({ ...f, full_name: e.target.value }))}
                placeholder="Nombre completo *"
                className="w-full px-3 py-2.5 rounded-lg text-sm border focus:outline-none"
                style={{ border: '1px solid #E8ECF0', fontSize: 16 }} />
              <div className="grid grid-cols-2 gap-2">
                <input value={quickClient.phone} onChange={e => setQuickClient(f => ({ ...f, phone: e.target.value }))}
                  placeholder="Teléfono"
                  className="w-full px-3 py-2.5 rounded-lg text-sm border focus:outline-none"
                  style={{ border: '1px solid #E8ECF0', fontSize: 16 }} />
                <input type="email" value={quickClient.email} onChange={e => setQuickClient(f => ({ ...f, email: e.target.value }))}
                  placeholder="Email"
                  className="w-full px-3 py-2.5 rounded-lg text-sm border focus:outline-none"
                  style={{ border: '1px solid #E8ECF0', fontSize: 16 }} />
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setShowNewClient(false)}
                  className="flex-1 py-2 rounded-lg text-xs font-semibold text-gray-500 hover:bg-slate-100"
                  style={{ border: '1px solid #E8ECF0' }}>
                  Cancelar
                </button>
                <button type="button" onClick={handleCreateQuickClient} disabled={!quickClient.full_name.trim() || saving}
                  className="flex-1 py-2 rounded-lg text-xs font-semibold text-white disabled:opacity-50"
                  style={{ background: 'var(--brand)' }}>
                  {saving ? <Loader2 size={12} className="animate-spin mx-auto" /> : 'Crear y asignar'}
                </button>
              </div>
            </div>
          ) : (
            <div className="relative">
              <div className="flex items-center gap-2 px-4 py-3 rounded-xl"
                style={{ border: '1px solid #E8ECF0', background: '#fff' }}>
                <Search size={14} className="text-gray-400 shrink-0" />
                <input value={clientSearch}
                  onChange={e => { setClientSearch(e.target.value); if (!e.target.value) setShowClientDropdown(false) }}
                  onFocus={() => clientResults.length > 0 && setShowClientDropdown(true)}
                  placeholder="Buscar cliente por nombre, email o teléfono..."
                  className="flex-1 bg-transparent text-sm focus:outline-none text-gray-700 placeholder-gray-400"
                  style={{ fontSize: 16 }} />
                {clientLoading && <Loader2 size={13} className="animate-spin text-gray-300" />}
              </div>
              {showClientDropdown && clientResults.length > 0 && (
                <div className="absolute z-20 left-0 right-0 mt-1 rounded-xl overflow-hidden shadow-xl"
                  style={{ background: '#fff', border: '1px solid #E8ECF0' }}>
                  {clientResults.map(c => (
                    <button key={c.id} type="button" onClick={() => selectClient(c)}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                        style={{ background: 'var(--brand)' }}>
                        {c.full_name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold truncate" style={{ color: '#0F1623' }}>{c.full_name}</div>
                        <div className="text-xs text-gray-400 truncate">{c.email || c.phone || '—'}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {showClientDropdown && clientResults.length === 0 && clientSearch.trim() && !clientLoading && (
                <div className="absolute z-20 left-0 right-0 mt-1 rounded-xl p-4 text-center"
                  style={{ background: '#fff', border: '1px solid #E8ECF0' }}>
                  <p className="text-sm text-gray-400 mb-2">No se encontró "{clientSearch}"</p>
                  <button type="button" onClick={() => { setShowClientDropdown(false); setShowNewClient(true); setQuickClient({ full_name: clientSearch, phone: '', email: '' }) }}
                    className="text-sm font-semibold" style={{ color: 'var(--brand)' }}>
                    + Crear como nuevo cliente
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Card: Notas */}
        <div className="rounded-2xl p-5 space-y-3" style={{ background: '#fff', border: '1px solid #E8ECF0' }}>
          <div className="text-xs font-semibold uppercase tracking-widest text-gray-400">Notas internas</div>
          <textarea value={form.notes} onChange={e => f('notes', e.target.value)}
            placeholder="Detalles adicionales, requerimientos especiales, observaciones..."
            rows={3}
            className="w-full px-4 py-3 rounded-xl text-sm border focus:outline-none resize-none"
            style={{ border: '1px solid #E8ECF0', fontSize: 16 }} />
        </div>

        {/* Error */}
        {error && (
          <div className="px-4 py-3 rounded-xl text-sm font-medium text-red-600" style={{ background: 'rgba(220,38,38,0.05)', border: '1px solid rgba(220,38,38,0.2)' }}>
            {error}
          </div>
        )}

        {/* Acciones */}
        <div className="flex gap-3 pb-8">
          <Link href="/dashboard/host/eventos"
            className="flex-1 py-3 rounded-xl text-sm font-semibold text-center text-gray-600 transition-colors hover:bg-slate-50"
            style={{ border: '1px solid #E8ECF0' }}>
            Cancelar
          </Link>
          <button type="submit" disabled={saving || !form.title.trim() || !form.event_date}
            className="flex-1 py-3 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ background: 'var(--brand)' }}>
            {saving ? <Loader2 size={15} className="animate-spin" /> : <><Check size={15} /> Crear evento</>}
          </button>
        </div>
      </form>
    </div>
  )
}
