'use client'

import { useState, useEffect, useRef } from 'react'
import { CalendarDays, Users, MessageSquare, X, Send, Loader2, CheckCircle, ArrowLeft } from 'lucide-react'
import { formatDate, formatCurrency } from '@/lib/utils'
import { getHostQuotes, respondToQuote } from '@/lib/actions/host'
import { rejectBooking } from '@/lib/actions/booking'
import { buildSchedule, daysUntilEvent } from '@/lib/payments/schedule'
import { cn } from '@/lib/utils'
import { getConversation, sendMessage, markMessagesRead } from '@/lib/actions/messages'
import { createClient } from '@/lib/supabase/client'

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

  // ── Chat ──────────────────────────────────────────────────
  const [chatMessages, setChatMessages] = useState<any[]>([])
  const [chatInput,    setChatInput]    = useState('')
  const [chatSending,  setChatSending]  = useState(false)
  const [chatLoading,  setChatLoading]  = useState(false)
  const [chatUserId,   setChatUserId]   = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    getHostQuotes().then(d => { setQuotes(d); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  // Cargar chat al seleccionar cotización
  useEffect(() => {
    if (!selected) { setChatMessages([]); return }
    setChatLoading(true)
    getConversation(selected.space_id).then(conv => {
      setChatMessages(conv?.messages ?? [])
      setChatUserId(conv?.userId ?? null)
      markMessagesRead(selected.space_id)
      setChatLoading(false)
    }).catch(() => setChatLoading(false))
  }, [selected?.id])

  // Realtime del chat
  useEffect(() => {
    if (!selected) return
    const supabase = createClient()
    const channel = supabase
      .channel(`cot-chat:${selected.space_id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `space_id=eq.${selected.space_id}` },
        payload => setChatMessages(prev => [...prev, payload.new])
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [selected?.space_id])

  // Auto-scroll al último mensaje
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  async function handleSendChat(e: React.FormEvent) {
    e.preventDefault()
    if (!chatInput.trim() || !selected || chatSending) return
    const receiverId = (selected as any).guest_id
    if (!receiverId) return
    setChatSending(true)
    await sendMessage(selected.space_id, receiverId, chatInput.trim())
    setChatInput('')
    setChatSending(false)
  }

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
        <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 lg:h-[calc(100dvh-14rem)]">
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

          {/* Panel de respuesta — split: formulario izquierda + chat derecha */}
          {selected ? (
            <div className="flex-1 flex flex-col lg:flex-row rounded-2xl overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>

              {/* ── IZQUIERDA: formulario de cotización ── */}
              <div className="flex-1 flex flex-col overflow-y-auto lg:border-r" style={{ borderColor: 'var(--border-subtle)' }}>
                <div className="p-5" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <button onClick={() => setSelected(null)}
                    className="lg:hidden flex items-center gap-1.5 text-sm font-medium mb-3"
                    style={{ color: 'var(--text-muted)' }}>
                    <ArrowLeft size={14} /> Volver
                  </button>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <span className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>
                        {(selected as any).profiles?.full_name ?? 'Cliente'}
                      </span>
                      <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                        {(selected as any).profiles?.email}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm font-semibold" style={{ color: 'var(--brand)' }}>{selected.event_type}</div>
                      {selected.event_date && (
                        <div className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                          {formatDate(selected.event_date)} · {selected.guest_count} personas
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="p-5 space-y-5 flex-1">
                  {/* Solicitud del cliente */}
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>Solicitud</div>
                    <div className="rounded-xl p-3.5 text-sm leading-relaxed"
                      style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                      "{(selected as any).event_notes ?? 'Sin descripción adicional.'}"
                    </div>
                  </div>

                  {/* Formulario de precio */}
                  <div className="space-y-3.5">
                    <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Tu propuesta</div>
                    <div>
                      <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Precio total (RD$)</label>
                      <input type="number" value={price} onChange={e => setPrice(e.target.value)}
                        placeholder="Ej: 85000"
                        className="input-base w-full rounded-xl px-4 py-2.5 text-sm"
                        style={{ fontSize: 16 }} />
                      {price && !isNaN(parseFloat(price)) && (
                        <div className="mt-1.5 space-y-1">
                          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                            Comisión 10%: {formatCurrency(parseFloat(price) * 0.10)} · <strong>Recibes: {formatCurrency(parseFloat(price) * 0.90)}</strong>
                          </p>
                          <QuoteSchedulePreview price={parseFloat(price)} eventDate={selected?.event_date ?? ''} />
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Mensaje al cliente (opcional)</label>
                      <textarea value={response} onChange={e => setResponse(e.target.value)}
                        placeholder="Ej: Buenos días, con gusto podemos atender su evento..."
                        rows={3}
                        className="input-base w-full rounded-xl px-4 py-2.5 text-sm resize-none"
                        style={{ fontSize: 16 }} />
                    </div>
                    <div className="flex gap-2">
                      <button onClick={handleRespond} disabled={!price || sending}
                        className="flex-1 flex items-center justify-center gap-1.5 text-sm font-bold py-2.5 rounded-xl transition-all disabled:opacity-40"
                        style={{ background: 'var(--brand)', color: '#fff' }}>
                        {sending ? <><Loader2 size={14} className="animate-spin" /> Enviando...</> : <><Send size={14} /> Enviar cotización</>}
                      </button>
                      <button onClick={() => handleReject(selected.id)} disabled={actionId === selected.id + 'r'}
                        className="px-3.5 py-2.5 rounded-xl text-sm font-semibold"
                        style={{ background: 'rgba(220,38,38,0.08)', color: '#DC2626', border: '1px solid rgba(220,38,38,0.2)' }}>
                        {actionId === selected.id + 'r' ? '...' : <X size={15} />}
                      </button>
                    </div>
                    {(sendError || rejectError) && (
                      <p className="text-xs text-center font-semibold" style={{ color: '#DC2626' }}>{sendError || rejectError}</p>
                    )}
                    <p className="text-xs text-center" style={{ color: 'var(--text-muted)' }}>
                      Al enviar, el cliente recibe el precio y plan de cuotas por email.
                    </p>
                  </div>
                </div>
              </div>

              {/* ── DERECHA: chat en tiempo real ── */}
              <div className="lg:w-96 flex flex-col border-t lg:border-t-0" style={{ borderColor: 'var(--border-subtle)' }}>
                {/* Header chat */}
                <div className="flex items-center gap-2 px-4 py-3 shrink-0" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <MessageSquare size={15} style={{ color: 'var(--brand)' }} />
                  <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Chat con el cliente</span>
                </div>

                {/* Mensajes */}
                <div className="flex-1 overflow-y-auto p-3 space-y-2" style={{ minHeight: 0, maxHeight: '340px' }}>
                  {chatLoading ? (
                    <div className="flex justify-center pt-8">
                      <Loader2 size={20} className="animate-spin" style={{ color: 'var(--text-muted)' }} />
                    </div>
                  ) : chatMessages.length === 0 ? (
                    <div className="text-center pt-8">
                      <MessageSquare size={20} className="mx-auto mb-2" style={{ color: 'var(--text-muted)' }} />
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Sin mensajes aún. Escribe al cliente aquí.</p>
                    </div>
                  ) : (
                    chatMessages.map((msg, i) => {
                      const isMe = msg.sender_id === chatUserId
                      return (
                        <div key={msg.id ?? i} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                          <div className="max-w-[80%] rounded-2xl px-3 py-2 text-xs leading-relaxed"
                            style={isMe
                              ? { background: 'var(--brand)', color: '#fff', borderBottomRightRadius: 6 }
                              : { background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)', borderBottomLeftRadius: 6 }
                            }>
                            {msg.body}
                          </div>
                        </div>
                      )
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input enviar */}
                <form onSubmit={handleSendChat} className="flex items-center gap-2 p-3 shrink-0" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                  <input
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    placeholder="Escribe un mensaje..."
                    className="flex-1 min-w-0 text-sm rounded-xl px-3 py-2 input-base"
                    style={{ fontSize: 16 }}
                  />
                  <button type="submit" disabled={!chatInput.trim() || chatSending}
                    className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all disabled:opacity-40"
                    style={{ background: 'var(--brand)', color: '#fff' }}>
                    {chatSending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                  </button>
                </form>
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
