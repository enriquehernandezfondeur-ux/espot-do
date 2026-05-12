'use client'

import { useState, useEffect } from 'react'
import { CalendarDays, Users, MessageSquare, X, Send, Loader2, CheckCircle } from 'lucide-react'
import { formatDate, formatCurrency } from '@/lib/utils'
import { getHostQuotes, respondToQuote } from '@/lib/actions/host'
import { rejectBooking } from '@/lib/actions/booking'
import { buildSchedule, daysUntilEvent } from '@/lib/payments/schedule'
import { cn } from '@/lib/utils'

type Quote = Awaited<ReturnType<typeof getHostQuotes>>[0]

// Preview del plan de cuotas que verá el cliente
function QuoteSchedulePreview({ price, eventDate }: { price: number; eventDate: string }) {
  if (!eventDate || !price) return null
  const schedule = buildSchedule(eventDate, price)
  return (
    <div className="rounded-xl overflow-hidden mt-1" style={{ border: '1px solid var(--border-subtle)' }}>
      <div className="px-3 py-1.5 text-xs font-bold uppercase tracking-wide"
        style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-subtle)' }}>
        Plan de cuotas que recibirá el cliente
      </div>
      {schedule.installments.map((inst, i) => (
        <div key={i} className="flex items-center justify-between px-3 py-2 text-xs"
          style={{ borderBottom: i < schedule.installments.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}>
          <span style={{ color: 'var(--text-secondary)' }}>{inst.label}</span>
          <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{formatCurrency(inst.amount)}</span>
        </div>
      ))}
    </div>
  )
}

export default function CotizacionesPage() {
  const [quotes, setQuotes]       = useState<Quote[]>([])
  const [loading, setLoading]     = useState(true)
  const [selected, setSelected]   = useState<Quote | null>(null)
  const [response, setResponse]   = useState('')
  const [price, setPrice]         = useState('')
  const [sending, setSending]     = useState(false)
  const [actionId, setActionId]   = useState<string | null>(null)
  const [sendError, setSendError]     = useState('')
  const [rejectError, setRejectError] = useState('')

  useEffect(() => {
    getHostQuotes().then(d => { setQuotes(d); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  async function handleRespond() {
    if (!selected || !price) return
    const parsedPrice = parseFloat(price)
    if (isNaN(parsedPrice) || parsedPrice <= 0) return
    setSending(true)
    setSendError('')
    const result = await respondToQuote(selected.id, parsedPrice, response || undefined)
    if ('error' in result) {
      setSendError(result.error ?? 'Error al enviar la cotización. Intenta de nuevo.')
    } else {
      setQuotes(prev => prev.filter(q => q.id !== selected.id))
      setSelected(null)
      setResponse('')
      setPrice('')
    }
    setSending(false)
  }

  async function handleReject(id: string) {
    setActionId(id + 'r')
    setRejectError('')
    const result = await rejectBooking(id)
    if ('error' in result) {
      setRejectError(result.error ?? 'Error al rechazar la cotización')
    } else {
      setQuotes(prev => prev.filter(q => q.id !== id))
      if (selected?.id === id) setSelected(null)
    }
    setActionId(null)
  }

  if (loading) return (
    <div className="flex items-center justify-center h-dvh" style={{ background: 'var(--bg-base)' }}>
      <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--brand)' }} />
    </div>
  )

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div className="mb-5 md:mb-8">
        <h1 className="text-xl md:text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Cotizaciones</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          {quotes.length > 0
            ? `${quotes.length} solicitud${quotes.length !== 1 ? 'es' : ''} esperando tu respuesta`
            : 'Sin cotizaciones pendientes'}
        </p>
      </div>

      {quotes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 rounded-3xl text-center"
          style={{ background: 'var(--bg-card)', border: '2px dashed var(--border-medium)' }}>
          <MessageSquare size={32} className="mb-3" style={{ color: 'var(--text-muted)' }} />
          <p className="font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Sin solicitudes pendientes</p>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Las cotizaciones aparecen aquí cuando alguien solicita un precio personalizado para tu espacio.
          </p>
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 lg:h-[calc(100vh-14rem)]">
          {/* Lista */}
          <div className="w-full lg:w-80 lg:shrink-0 space-y-2 lg:overflow-y-auto">
            {quotes.map(q => {
              const g = (q as any).profiles
              return (
                <button key={q.id} onClick={() => setSelected(q)}
                  className={cn('w-full text-left p-4 rounded-2xl border transition-all')}
                  style={selected?.id === q.id
                    ? { background: 'var(--brand-dim)', borderColor: 'var(--brand)' }
                    : { background: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                      {g?.full_name ?? 'Cliente'}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{ background: 'rgba(8,145,178,0.1)', color: '#0891B2' }}>
                      Cotización
                    </span>
                  </div>
                  <div className="text-xs font-medium mb-1" style={{ color: 'var(--brand)' }}>
                    {q.event_type}
                  </div>
                  <p className="text-xs line-clamp-2" style={{ color: 'var(--text-secondary)' }}>
                    {(q as any).event_notes ?? 'Sin descripción'}
                  </p>
                  <div className="flex items-center gap-3 mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                    {q.event_date && <span className="flex items-center gap-1"><CalendarDays size={10} /> {formatDate(q.event_date)}</span>}
                    <span className="flex items-center gap-1"><Users size={10} /> {q.guest_count}</span>
                  </div>
                </button>
              )
            })}
          </div>

          {/* Panel de respuesta */}
          {selected ? (
            <div className="flex-1 rounded-2xl overflow-y-auto" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
              <div className="p-6" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>
                        {(selected as any).profiles?.full_name ?? 'Cliente'}
                      </span>
                    </div>
                    <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                      {(selected as any).profiles?.email}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold" style={{ color: 'var(--brand)' }}>{selected.event_type}</div>
                    {selected.event_date && (
                      <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                        {formatDate(selected.event_date)} · {selected.guest_count} personas
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {/* Mensaje del cliente */}
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--text-muted)' }}>
                    Solicitud del cliente
                  </div>
                  <div className="rounded-xl p-4 text-sm leading-relaxed"
                    style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                    "{(selected as any).event_notes ?? 'El cliente no dejó descripción adicional.'}"
                  </div>
                </div>

                {/* Formulario de cotización */}
                <div className="space-y-4">
                  <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                    Tu propuesta de precio
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                      Precio total del evento (RD$)
                    </label>
                    <input type="number" value={price} onChange={e => setPrice(e.target.value)}
                      placeholder="Ej: 85000"
                      className="input-base w-full rounded-xl px-4 py-3 text-sm"
                      style={{ fontSize: 16 }} />
                    {price && !isNaN(parseFloat(price)) && (
                      <div className="mt-2 space-y-1">
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                          Comisión espot.do (10%): {formatCurrency(parseFloat(price) * 0.10)} · <strong>Recibes: {formatCurrency(parseFloat(price) * 0.90)}</strong>
                        </p>
                        <QuoteSchedulePreview price={parseFloat(price)} eventDate={selected?.event_date ?? ''} />
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                      Mensaje al cliente (opcional)
                    </label>
                    <textarea value={response} onChange={e => setResponse(e.target.value)}
                      placeholder="Ej: Buenos días, con gusto podemos atender su evento. El precio incluye..."
                      rows={4}
                      className="input-base w-full rounded-xl px-4 py-3 text-sm resize-none"
                      style={{ fontSize: 16 }} />
                  </div>

                  {sendError && (
                    <div className="text-xs px-3 py-2 rounded-xl mb-2"
                      style={{ background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.2)', color: '#DC2626' }}>
                      {sendError}
                    </div>
                  )}

                  <div className="flex gap-3">
                    <button onClick={handleRespond}
                      disabled={!price || sending}
                      className="flex-1 flex items-center justify-center gap-2 text-sm font-bold py-3 rounded-xl transition-all disabled:opacity-40"
                      style={{ background: 'var(--brand)', color: '#fff', boxShadow: price ? '0 2px 8px rgba(53,196,147,0.3)' : 'none' }}>
                      {sending ? <><Loader2 size={16} className="animate-spin" /> Enviando...</> : <><Send size={16} /> Enviar cotización</>}
                    </button>
                    <button onClick={() => handleReject(selected.id)}
                      disabled={actionId === selected.id + 'r'}
                      className="px-4 py-3 rounded-xl text-sm font-semibold transition-all"
                      style={{ background: 'rgba(220,38,38,0.08)', color: '#DC2626', border: '1px solid rgba(220,38,38,0.2)' }}>
                      {actionId === selected.id + 'r' ? '...' : <X size={16} />}
                    </button>
                  </div>

                  {(sendError || rejectError) && (
                    <p className="text-xs text-center font-semibold" style={{ color: '#DC2626' }}>
                      {sendError || rejectError}
                    </p>
                  )}
                  <p className="text-xs text-center" style={{ color: 'var(--text-muted)' }}>
                    Al enviar, el cliente recibirá el precio y el plan de cuotas por email. La reserva queda lista para pago.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center rounded-2xl"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
              <div className="text-center">
                <MessageSquare size={28} className="mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  Selecciona una cotización para responder
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
