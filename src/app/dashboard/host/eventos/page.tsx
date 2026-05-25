'use client'

import { useState, useEffect, useRef } from 'react'
import { getExternalEvents, updateExternalEvent, addEventPayment, deleteExternalEvent, deleteEventPayment } from '@/lib/actions/external-events'
import { formatCurrency, formatDate, formatTime, cn } from '@/lib/utils'
import { CalendarDays, Plus, Search, Loader2, Check, X, CalendarCheck, Paperclip, Copy, Link2 } from 'lucide-react'

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://espot.do'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { ExternalEvent, ExternalEventStatus, ExternalPaymentMethod } from '@/types'

const STATUS_OPTIONS: { value: 'all' | ExternalEventStatus; label: string }[] = [
  { value: 'all',        label: 'Todos' },
  { value: 'tentativo',  label: 'Pendientes' },
  { value: 'confirmado', label: 'Confirmados' },
  { value: 'en_curso',   label: 'En curso' },
  { value: 'completado', label: 'Completados' },
  { value: 'cancelado',  label: 'Cancelados' },
]

const statusConfig: Record<ExternalEventStatus, { label: string; color: string; bg: string }> = {
  tentativo:  { label: 'Pendiente',  color: '#D97706', bg: 'rgba(217,119,6,0.1)'   },
  confirmado: { label: 'Confirmado', color: '#16A34A', bg: 'rgba(22,163,74,0.1)'   },
  en_curso:   { label: 'En curso',   color: '#2563EB', bg: 'rgba(37,99,235,0.1)'   },
  completado: { label: 'Completado', color: '#35C493', bg: 'rgba(53,196,147,0.1)'  },
  cancelado:  { label: 'Cancelado',  color: '#6B7280', bg: 'rgba(107,114,128,0.1)' },
}

export default function EventosPage() {
  const [events,   setEvents]   = useState<ExternalEvent[]>([])
  const [loading,  setLoading]  = useState(true)
  const [filter,   setFilter]   = useState<'all' | ExternalEventStatus>('all')
  const [search,   setSearch]   = useState('')
  const [selected, setSelected] = useState<ExternalEvent | null>(null)
  const [toast,    setToast]    = useState<{ msg: string; ok: boolean } | null>(null)

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3000)
  }

  useEffect(() => {
    setLoading(true)
    getExternalEvents(filter !== 'all' ? { status: filter } : undefined)
      .then(d => { setEvents(d); setLoading(false) })
      .catch(() => { setEvents([]); setLoading(false) })
  }, [filter])

  const filtered = events.filter(ev =>
    ev.title.toLowerCase().includes(search.toLowerCase()) ||
    (clientLabel(ev)).toLowerCase().includes(search.toLowerCase()) ||
    (ev.space?.name ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (ev.event_type ?? '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      {toast && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold shadow-xl"
          style={{ background: toast.ok ? '#16A34A' : '#DC2626', color: '#fff' }}>
          {toast.ok ? <Check size={14} /> : <X size={14} />} {toast.msg}
        </div>
      )}

      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#0F1623', letterSpacing: '-0.02em' }}>Eventos</h1>
          <p className="text-sm text-gray-500 mt-0.5">{events.length} eventos registrados</p>
        </div>
        <Link href="/dashboard/host/eventos/nuevo"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all active:scale-95"
          style={{ background: 'var(--brand)' }}>
          <Plus size={15} /> Nuevo evento
        </Link>
      </div>

      <div className="flex flex-col gap-3 mb-5">
        <div className="flex gap-1 p-1 rounded-xl overflow-x-auto scrollbar-hide"
          style={{ background: '#fff', border: '1px solid #E8ECF0' }}>
          {STATUS_OPTIONS.map(o => (
            <button key={o.value} onClick={() => setFilter(o.value)}
              className="px-3 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap shrink-0"
              style={filter === o.value ? { background: '#0F1623', color: '#fff' } : { color: '#6B7280' }}>
              {o.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl"
          style={{ background: '#fff', border: '1px solid #E8ECF0' }}>
          <Search size={15} className="text-gray-400 shrink-0" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar evento, cliente o espacio..."
            className="bg-transparent text-sm flex-1 focus:outline-none text-gray-700 placeholder-gray-400"
            style={{ fontSize: 16 }} />
          {search && <button onClick={() => setSearch('')} className="text-gray-400"><X size={14} /></button>}
        </div>
      </div>

      <div className="flex flex-col lg:grid lg:grid-cols-[1fr_360px] gap-5 items-start">
        <div className="rounded-2xl overflow-hidden" style={{ background: '#fff', border: '1px solid #E8ECF0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
          <div className="overflow-x-auto scrollbar-hide">
            <div className="grid grid-cols-[2fr_1fr_1fr_auto] gap-3 px-5 py-3 text-xs font-semibold min-w-[500px] uppercase tracking-widest text-gray-400"
              style={{ borderBottom: '1px solid #F0F2F5', background: '#FAFBFC' }}>
              <span>Evento</span><span>Fecha</span><span>Total</span><span>Estado</span>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--brand)' }} />
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-16">
                <CalendarCheck size={32} className="mx-auto mb-3 text-gray-200" />
                <p className="text-sm text-gray-400">
                  {search ? 'Sin resultados' : 'No hay eventos registrados'}
                </p>
                {!search && (
                  <Link href="/dashboard/host/eventos/nuevo"
                    className="mt-3 inline-block text-sm font-semibold" style={{ color: 'var(--brand)' }}>
                    Registrar primer evento
                  </Link>
                )}
              </div>
            ) : (
              <div className="divide-y divide-[#F0F2F5]">
                {filtered.map(ev => {
                  const st = statusConfig[ev.status]
                  const balance = ev.total_amount ? ev.total_amount - (ev.paid_amount ?? 0) : null
                  return (
                    <button key={ev.id}
                      onClick={() => setSelected(selected?.id === ev.id ? null : ev)}
                      className={cn('w-full grid grid-cols-[2fr_1fr_1fr_auto] gap-3 items-center px-5 py-4 min-w-[500px] text-left transition-colors hover:bg-slate-50',
                        selected?.id === ev.id && 'bg-slate-50'
                      )}>
                      <div className="min-w-0">
                        <div className="font-semibold text-sm truncate" style={{ color: '#0F1623' }}>
                          {ev.title}
                        </div>
                        <div className="text-xs text-gray-400 truncate">
                          {clientLabel(ev) || '—'} · {ev.event_type ?? '—'}
                        </div>
                      </div>
                      <div className="text-sm text-gray-600">{formatDate(ev.event_date)}</div>
                      <div className="text-sm">
                        <div className="font-bold" style={{ color: '#0F1623' }}>
                          {ev.total_amount ? formatCurrency(ev.total_amount) : '—'}
                        </div>
                        {balance !== null && balance > 0 && (
                          <div className="text-xs text-orange-500">Pend: {formatCurrency(balance)}</div>
                        )}
                      </div>
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full shrink-0"
                        style={{ background: st.bg, color: st.color }}>
                        {st.label}
                      </span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {selected ? (
          <EventDetailPanel
            event={selected}
            onClose={() => setSelected(null)}
            onUpdated={updated => {
              setEvents(prev => prev.map(e => e.id === updated.id ? updated : e))
              setSelected(updated)
            }}
            onDeleted={() => {
              setEvents(prev => prev.filter(e => e.id !== selected.id))
              setSelected(null)
              showToast('Evento eliminado', true)
            }}
          />
        ) : (
          <div className="rounded-2xl p-8 text-center" style={{ background: '#fff', border: '1px solid #E8ECF0' }}>
            <CalendarDays size={24} className="mx-auto mb-3 text-gray-300" />
            <p className="text-sm text-gray-400">Selecciona un evento para ver el detalle</p>
          </div>
        )}
      </div>
    </div>
  )
}

function clientLabel(ev: ExternalEvent) {
  return ev.client?.full_name ?? (ev as any).client_name ?? ''
}

// ── Panel de detalle ───────────────────────────────────────────
function EventDetailPanel({ event, onClose, onUpdated, onDeleted }: {
  event: ExternalEvent
  onClose: () => void
  onUpdated: (ev: ExternalEvent) => void
  onDeleted: () => void
}) {
  const [saving,      setSaving]      = useState(false)
  const [showPay,     setShowPay]     = useState(false)
  const [deleting,    setDeleting]    = useState(false)
  const [linkCopied,  setLinkCopied]  = useState(false)
  const [receiptFile, setReceiptFile] = useState<File | null>(null)
  const [payForm,     setPayForm]     = useState({
    amount: '', method: 'efectivo' as ExternalPaymentMethod,
    date: new Date().toISOString().slice(0, 10), notes: '', is_deposit: false,
  })
  const supabaseRef = useRef(createClient())

  async function handleStatusChange(status: ExternalEventStatus) {
    setSaving(true)
    const r = await updateExternalEvent({ id: event.id, status })
    if (!('error' in r)) onUpdated({ ...event, status })
    setSaving(false)
  }

  async function handleAddPayment(e: React.FormEvent) {
    e.preventDefault()
    if (!payForm.amount || Number(payForm.amount) <= 0) return
    setSaving(true)

    let receipt_url: string | undefined
    if (receiptFile) {
      const supabase = supabaseRef.current
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const ext  = receiptFile.name.split('.').pop()
        const path = `${user.id}/receipts/${event.id}/${Date.now()}.${ext}`
        const { data: uploaded } = await supabase.storage
          .from('host-documents')
          .upload(path, receiptFile, { upsert: true })
        if (uploaded) {
          const { data: { publicUrl } } = supabase.storage.from('host-documents').getPublicUrl(path)
          receipt_url = publicUrl
        }
      }
    }

    const r = await addEventPayment({
      event_id: event.id,
      amount: Number(payForm.amount),
      payment_method: payForm.method,
      payment_date: payForm.date,
      notes: payForm.notes,
      is_deposit: payForm.is_deposit,
      receipt_url,
    })
    if (!('error' in r)) {
      const newPaid = (event.paid_amount ?? 0) + Number(payForm.amount)
      onUpdated({ ...event, paid_amount: newPaid, payments: [...(event.payments ?? []), r.data as any] })
      setShowPay(false)
      setReceiptFile(null)
      setPayForm({ amount: '', method: 'efectivo', date: new Date().toISOString().slice(0, 10), notes: '', is_deposit: false })
    }
    setSaving(false)
  }

  async function handleDeletePayment(paymentId: string, amount: number) {
    if (!confirm('¿Eliminar este pago?')) return
    const r = await deleteEventPayment(paymentId)
    if (!('error' in r)) {
      onUpdated({
        ...event,
        paid_amount: Math.max(0, (event.paid_amount ?? 0) - amount),
        payments: (event.payments ?? []).filter(p => p.id !== paymentId),
      })
    }
  }

  async function handleDelete() {
    if (!confirm('¿Eliminar este evento? No se puede deshacer.')) return
    setDeleting(true)
    const r = await deleteExternalEvent(event.id)
    if (!('error' in r)) onDeleted()
    setDeleting(false)
  }

  const balance = (event.total_amount ?? 0) - (event.paid_amount ?? 0)
  const client = clientLabel(event)

  return (
    <div className="rounded-2xl overflow-hidden sticky top-8"
      style={{ background: '#fff', border: '1px solid #E8ECF0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
      <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid #F0F2F5' }}>
        <div>
          <div className="font-bold text-sm" style={{ color: '#0F1623' }}>Detalle del evento</div>
          <div className="text-xs text-gray-400 mt-0.5">ID: {event.id.slice(0, 8).toUpperCase()}</div>
        </div>
        <div className="flex items-center gap-1">
          <Link href={`/dashboard/host/eventos/${event.id}/editar`}
            className="text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors hover:bg-slate-100 text-gray-500">
            Editar
          </Link>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-gray-400"><X size={13} /></button>
        </div>
      </div>

      <div className="p-5 space-y-4">
        <div>
          <div className="font-semibold text-sm mb-3" style={{ color: '#0F1623' }}>{event.title}</div>
          <div className="rounded-xl p-4 space-y-2" style={{ background: '#F8FAFB', border: '1px solid #E8ECF0' }}>
            {[
              { label: 'Tipo',     value: event.event_type ?? '—' },
              { label: 'Fecha',    value: formatDate(event.event_date) },
              ...(event.start_time ? [{ label: 'Horario', value: `${formatTime(event.start_time)}${event.end_time ? ` – ${formatTime(event.end_time)}` : ''}` }] : []),
              ...(event.guest_count ? [{ label: 'Personas', value: `${event.guest_count}` }] : []),
              ...(event.space ? [{ label: 'Espacio', value: event.space.name }] : []),
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between text-sm">
                <span className="text-gray-500">{label}</span>
                <span className="font-medium" style={{ color: '#0F1623' }}>{value}</span>
              </div>
            ))}
          </div>
        </div>

        {client && (
          <div>
            <div className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-1">Cliente</div>
            <div className="font-semibold text-sm" style={{ color: '#0F1623' }}>{client}</div>
            {event.client?.email && <div className="text-xs text-gray-500">{event.client.email}</div>}
            {event.client?.phone && <div className="text-xs text-gray-500">{event.client.phone}</div>}
          </div>
        )}

        <div className="rounded-xl p-4 space-y-2" style={{ background: 'rgba(53,196,147,0.05)', border: '1px solid rgba(53,196,147,0.15)' }}>
          <div className="flex justify-between text-sm text-gray-500">
            <span>Total evento</span>
            <span className="font-medium" style={{ color: '#0F1623' }}>{event.total_amount ? formatCurrency(event.total_amount) : '—'}</span>
          </div>
          <div className="flex justify-between text-sm text-gray-500">
            <span>Cobrado</span>
            <span className="font-semibold" style={{ color: '#16A34A' }}>{formatCurrency(event.paid_amount ?? 0)}</span>
          </div>
          {event.total_amount && balance > 0 && (
            <div className="flex justify-between text-sm font-bold pt-1" style={{ borderTop: '1px solid rgba(53,196,147,0.15)', color: '#D97706' }}>
              <span>Pendiente</span><span>{formatCurrency(balance)}</span>
            </div>
          )}
        </div>

        {(event.total_amount ?? 0) > 0 && (event.paid_amount ?? 0) < (event.total_amount ?? 0) && (
          <button
            onClick={() => {
              const url = `${SITE}/pago/evento/${event.id}`
              navigator.clipboard.writeText(url)
              setLinkCopied(true)
              setTimeout(() => setLinkCopied(false), 2500)
            }}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold transition-all"
            style={{ background: linkCopied ? 'rgba(53,196,147,0.1)' : '#F8FAFB', color: linkCopied ? 'var(--brand)' : '#6B7280', border: `1px solid ${linkCopied ? 'rgba(53,196,147,0.3)' : '#E8ECF0'}` }}>
            {linkCopied ? <><Check size={13} /> Link copiado</> : <><Link2 size={13} /> Copiar link de pago</>}
          </button>
        )}

        {(event.payments?.length ?? 0) > 0 && (
          <div>
            <div className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">Pagos registrados</div>
            <div className="space-y-1.5">
              {event.payments!.map(p => (
                <div key={p.id} className="flex items-center justify-between text-xs py-1.5 px-3 rounded-lg group"
                  style={{ background: '#F8FAFB', border: '1px solid #F0F2F5' }}>
                  <div className="min-w-0">
                    <span className="font-semibold text-gray-700">{formatCurrency(p.amount)}</span>
                    <span className="text-gray-400 ml-2">{formatDate(p.payment_date)} · {p.payment_method}</span>
                    {p.is_deposit && <span className="ml-1 text-[#7C3AED]">· Depósito</span>}
                    {(p as any).receipt_url && (
                      <a href={(p as any).receipt_url} target="_blank" rel="noopener noreferrer"
                        className="ml-2 inline-flex items-center gap-0.5 text-[10px] font-semibold"
                        style={{ color: 'var(--brand)' }}>
                        <Paperclip size={9} /> Ver
                      </a>
                    )}
                  </div>
                  <button onClick={() => handleDeletePayment(p.id, p.amount)}
                    className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition-all shrink-0">
                    <X size={11} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {showPay ? (
          <form onSubmit={handleAddPayment} className="rounded-xl p-4 space-y-3" style={{ background: '#F8FAFB', border: '1px solid #E8ECF0' }}>
            <div className="text-xs font-semibold text-gray-600">Registrar pago</div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Monto (RD$)</label>
                <input type="number" required min="1" value={payForm.amount}
                  onChange={e => setPayForm(f => ({ ...f, amount: e.target.value }))}
                  placeholder="0" className="w-full px-3 py-2 rounded-lg text-sm border focus:outline-none"
                  style={{ border: '1px solid #E8ECF0', fontSize: 16 }} />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Método</label>
                <select value={payForm.method}
                  onChange={e => setPayForm(f => ({ ...f, method: e.target.value as ExternalPaymentMethod }))}
                  className="w-full px-3 py-2 rounded-lg text-sm border focus:outline-none"
                  style={{ border: '1px solid #E8ECF0', fontSize: 16 }}>
                  <option value="efectivo">Efectivo</option>
                  <option value="transferencia">Transferencia</option>
                  <option value="tarjeta">Tarjeta</option>
                  <option value="otro">Otro</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Fecha del pago</label>
              <input type="date" required value={payForm.date}
                onChange={e => setPayForm(f => ({ ...f, date: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg text-sm border focus:outline-none"
                style={{ border: '1px solid #E8ECF0', fontSize: 16 }} />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Comprobante (foto/PDF)</label>
              <label className="flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer hover:bg-slate-50"
                style={{ border: '1px dashed #D0D7DE' }}>
                <Paperclip size={14} className="text-gray-400 shrink-0" />
                <span className="text-xs text-gray-500 truncate">
                  {receiptFile ? receiptFile.name : 'Adjuntar comprobante...'}
                </span>
                <input type="file" accept="image/*,.pdf" className="hidden"
                  onChange={e => setReceiptFile(e.target.files?.[0] ?? null)} />
              </label>
              {receiptFile && (
                <button type="button" onClick={() => setReceiptFile(null)}
                  className="text-[11px] text-gray-400 hover:text-red-400 mt-1 flex items-center gap-1">
                  <X size={10} /> Quitar
                </button>
              )}
            </div>
            <label className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer">
              <input type="checkbox" checked={payForm.is_deposit}
                onChange={e => setPayForm(f => ({ ...f, is_deposit: e.target.checked }))} className="rounded" />
              Marcar como depósito/anticipo
            </label>
            <div className="flex gap-2">
              <button type="button" onClick={() => { setShowPay(false); setReceiptFile(null) }}
                className="flex-1 py-2 rounded-lg text-xs font-semibold text-gray-500 hover:bg-slate-100"
                style={{ border: '1px solid #E8ECF0' }}>
                Cancelar
              </button>
              <button type="submit" disabled={saving}
                className="flex-1 py-2 rounded-lg text-xs font-semibold text-white disabled:opacity-50"
                style={{ background: 'var(--brand)' }}>
                {saving ? <Loader2 size={12} className="animate-spin mx-auto" /> : 'Guardar'}
              </button>
            </div>
          </form>
        ) : (
          <button onClick={() => setShowPay(true)}
            className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all"
            style={{ background: 'rgba(53,196,147,0.08)', color: 'var(--brand)', border: '1px solid rgba(53,196,147,0.2)' }}>
            + Registrar pago
          </button>
        )}

        <div>
          <div className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">Cambiar estado</div>
          <div className="grid grid-cols-2 gap-2">
            {(['tentativo', 'confirmado', 'completado', 'cancelado'] as ExternalEventStatus[]).map(status => {
              const s = statusConfig[status]
              return (
                <button key={status} onClick={() => handleStatusChange(status)}
                  disabled={saving || event.status === status}
                  className="text-xs font-semibold px-3 py-2 rounded-lg transition-all disabled:opacity-40"
                  style={event.status === status
                    ? { background: s.bg, color: s.color, border: `1px solid ${s.color}30` }
                    : { background: '#F4F6F8', color: '#6B7280', border: '1px solid #E8ECF0' }}>
                  {s.label}
                </button>
              )
            })}
          </div>
        </div>

        {event.notes && (
          <div className="rounded-xl p-3 text-xs text-gray-500" style={{ background: '#F8FAFB', border: '1px solid #E8ECF0' }}>
            {event.notes}
          </div>
        )}

        <button onClick={handleDelete} disabled={deleting}
          className="w-full py-2 rounded-xl text-xs font-semibold text-red-400 transition-colors hover:bg-red-50 disabled:opacity-40">
          {deleting ? <Loader2 size={13} className="animate-spin mx-auto" /> : 'Eliminar evento'}
        </button>
      </div>
    </div>
  )
}
