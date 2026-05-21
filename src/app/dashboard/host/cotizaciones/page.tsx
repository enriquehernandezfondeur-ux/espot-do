'use client'

import { useState, useEffect, useRef } from 'react'
import {
  CalendarDays, Users, MessageSquare, X, Send, Loader2,
  ArrowLeft, Paperclip, FileText, Download, Image as ImageIcon,
} from 'lucide-react'
import { formatDate, formatCurrency } from '@/lib/utils'
import { getHostQuotes, respondToQuote } from '@/lib/actions/host'
import { rejectBooking } from '@/lib/actions/booking'
import { buildSchedule } from '@/lib/payments/schedule'
import { cn } from '@/lib/utils'
import { getConversation, sendMessage, markMessagesRead } from '@/lib/actions/messages'
import type { MessageAttachment } from '@/lib/actions/messages'
import { createClient } from '@/lib/supabase/client'

type Quote = Awaited<ReturnType<typeof getHostQuotes>>[0]

const ACCEPTED_TYPES = [
  'image/jpeg','image/png','image/gif','image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]
const MAX_MB = 20
function isImage(t: string) { return t.startsWith('image/') }

function QuoteSchedulePreview({ price, eventDate }: { price: number; eventDate: string }) {
  if (!eventDate || !price) return null
  const schedule = buildSchedule(eventDate, price)
  return (
    <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border-subtle)' }}>
      <div className="px-3 py-1.5 text-xs font-bold uppercase tracking-wide"
        style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-subtle)' }}>
        Plan de cuotas del cliente
      </div>
      {schedule.installments.map((inst, i) => (
        <div key={i} className="flex justify-between px-3 py-1.5 text-xs"
          style={{ borderBottom: i < schedule.installments.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}>
          <span style={{ color: 'var(--text-secondary)' }}>{inst.label}</span>
          <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{formatCurrency(inst.amount)}</span>
        </div>
      ))}
    </div>
  )
}

function FilePreview({ name, url, type }: { name: string; url: string; type: 'image' | 'file' }) {
  if (type === 'image') return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt={name} className="rounded-xl object-cover cursor-pointer max-w-full"
      style={{ maxHeight: 180 }} onClick={() => window.open(url, '_blank')} />
  )
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" download={name}
      className="flex items-center gap-2 px-3 py-2 rounded-xl transition-all"
      style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}>
      <FileText size={14} className="shrink-0" />
      <span className="text-xs font-medium truncate max-w-[160px]">{name}</span>
      <Download size={12} className="shrink-0 ml-auto opacity-60" />
    </a>
  )
}

export default function CotizacionesPage() {
  // ── Cotizaciones ─────────────────────────────────────────
  const [quotes,      setQuotes]      = useState<Quote[]>([])
  const [loading,     setLoading]     = useState(true)
  const [selected,    setSelected]    = useState<Quote | null>(null)
  const [price,       setPrice]       = useState('')
  const [response,    setResponse]    = useState('')
  const [sending,     setSending]     = useState(false)
  const [actionId,    setActionId]    = useState<string | null>(null)
  const [sendError,   setSendError]   = useState('')
  const [rejectError, setRejectError] = useState('')
  const [showForm,    setShowForm]    = useState(false)

  // ── Chat ─────────────────────────────────────────────────
  const [chatMessages, setChatMessages] = useState<any[]>([])
  const [chatInput,    setChatInput]    = useState('')
  const [chatSending,  setChatSending]  = useState(false)
  const [chatLoading,  setChatLoading]  = useState(false)
  const [chatUserId,   setChatUserId]   = useState<string | null>(null)
  const [chatError,    setChatError]    = useState('')
  const [attachment,   setAttachment]   = useState<{ file: File; preview: string; type: 'image' | 'file' } | null>(null)
  const [uploading,    setUploading]    = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileRef        = useRef<HTMLInputElement>(null)
  const chatInputRef   = useRef<HTMLInputElement>(null)

  // ── Load quotes ───────────────────────────────────────────
  useEffect(() => {
    getHostQuotes().then(d => { setQuotes(d); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  // ── Load conversation ─────────────────────────────────────
  useEffect(() => {
    if (!selected) { setChatMessages([]); return }
    setChatLoading(true)
    setShowForm(false)
    getConversation(selected.space_id).then(conv => {
      setChatMessages(conv?.messages ?? [])
      setChatUserId(conv?.userId ?? null)
      markMessagesRead(selected.space_id)
      setChatLoading(false)
    }).catch(() => setChatLoading(false))
  }, [selected?.id])

  // ── Realtime ──────────────────────────────────────────────
  useEffect(() => {
    if (!selected) return
    const supabase = createClient()
    const channel = supabase
      .channel(`cot:${selected.space_id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `space_id=eq.${selected.space_id}` },
        payload => setChatMessages(prev => [...prev, payload.new])
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [selected?.space_id])

  // ── Auto-scroll ───────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  // ── File handling ─────────────────────────────────────────
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!ACCEPTED_TYPES.includes(file.type)) { setChatError('Tipo de archivo no soportado'); return }
    if (file.size > MAX_MB * 1024 * 1024) { setChatError(`Máximo ${MAX_MB}MB`); return }
    setChatError('')
    setAttachment({ file, preview: isImage(file.type) ? URL.createObjectURL(file) : '', type: isImage(file.type) ? 'image' : 'file' })
    e.target.value = ''
  }

  function removeAttachment() {
    if (attachment?.preview) URL.revokeObjectURL(attachment.preview)
    setAttachment(null)
  }

  async function uploadAttachment(file: File): Promise<MessageAttachment | null> {
    setUploading(true)
    const supabase = createClient()
    const ext  = file.name.split('.').pop()?.toLowerCase() ?? 'bin'
    const path = `chat/${selected!.space_id}/${chatUserId}/${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('space-images').upload(path, file, { cacheControl: '3600', upsert: false })
    if (error) { setChatError(`Error al subir: ${error.message}`); setUploading(false); return null }
    const { data: { publicUrl } } = supabase.storage.from('space-images').getPublicUrl(path)
    setUploading(false)
    return { url: publicUrl, type: isImage(file.type) ? 'image' : 'file', name: file.name }
  }

  // ── Send chat message ─────────────────────────────────────
  async function handleSendChat(e: React.FormEvent) {
    e.preventDefault()
    if ((!chatInput.trim() && !attachment) || !selected || chatSending || uploading) return
    const receiverId = (selected as any).guest_id
    if (!receiverId) { setChatError('No se pudo identificar al cliente'); return }

    setChatSending(true)
    setChatError('')

    let att: MessageAttachment | undefined
    if (attachment) {
      const uploaded = await uploadAttachment(attachment.file)
      if (!uploaded) { setChatSending(false); return }
      att = uploaded
    }

    // Optimistic update
    const optimistic = {
      id:              `opt-${Date.now()}`,
      sender_id:       chatUserId,
      receiver_id:     receiverId,
      body:            chatInput.trim() || null,
      attachment_url:  att?.url  ?? null,
      attachment_type: att?.type ?? null,
      attachment_name: att?.name ?? null,
      created_at:      new Date().toISOString(),
    }
    setChatMessages(prev => [...prev, optimistic])
    setChatInput('')
    removeAttachment()

    const result = await sendMessage(selected.space_id, receiverId, optimistic.body ?? '', att)
    if ('error' in result) {
      setChatError(result.error ?? 'Error al enviar')
      // Revertir optimistic
      setChatMessages(prev => prev.filter(m => m.id !== optimistic.id))
      setChatInput(optimistic.body ?? '')
    }
    setChatSending(false)
  }

  // ── Quote actions ─────────────────────────────────────────
  async function handleRespond() {
    if (!selected || !price) return
    const parsedPrice = parseFloat(price)
    if (isNaN(parsedPrice) || parsedPrice <= 0) return
    setSending(true); setSendError('')
    const result = await respondToQuote(selected.id, parsedPrice, response || undefined)
    if ('error' in result) {
      setSendError(result.error ?? 'Error al enviar.')
    } else {
      setQuotes(prev => prev.filter(q => q.id !== selected.id))
      setSelected(null); setResponse(''); setPrice('')
    }
    setSending(false)
  }

  async function handleReject(id: string) {
    setActionId(id + 'r'); setRejectError('')
    const result = await rejectBooking(id)
    if ('error' in result) { setRejectError(result.error ?? 'Error al rechazar') }
    else { setQuotes(prev => prev.filter(q => q.id !== id)); if (selected?.id === id) setSelected(null) }
    setActionId(null)
  }

  // ── Render ────────────────────────────────────────────────
  if (loading) return (
    <div className="flex items-center justify-center h-dvh" style={{ background: 'var(--bg-base)' }}>
      <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--brand)' }} />
    </div>
  )

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">

      {/* Header */}
      <div className="mb-5 md:mb-6">
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
        <div className="flex flex-col lg:flex-row gap-4 lg:gap-5" style={{ height: 'calc(100dvh - 14rem)' }}>

          {/* ── Lista de cotizaciones ── */}
          <div className="w-full lg:w-72 shrink-0 space-y-2 lg:overflow-y-auto">
            {quotes.map(q => {
              const g = (q as any).profiles
              const isActive = selected?.id === q.id
              return (
                <button key={q.id} onClick={() => { setSelected(q); setPrice(''); setResponse(''); setSendError('') }}
                  className="w-full text-left p-4 rounded-2xl border transition-all"
                  style={isActive
                    ? { background: 'var(--brand-dim)', borderColor: 'var(--brand-border)' }
                    : { background: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                      {g?.full_name ?? 'Cliente'}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{ background: 'rgba(8,145,178,0.1)', color: '#0891B2' }}>
                      Cotización
                    </span>
                  </div>
                  <div className="text-xs font-medium mb-1" style={{ color: 'var(--brand)' }}>{q.event_type}</div>
                  <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                    {q.event_date && <span className="flex items-center gap-1"><CalendarDays size={10} /> {formatDate(q.event_date)}</span>}
                    <span className="flex items-center gap-1"><Users size={10} /> {q.guest_count}</span>
                  </div>
                </button>
              )
            })}
          </div>

          {/* ── Panel principal ── */}
          {selected ? (
            <div className="flex-1 flex flex-col rounded-2xl overflow-hidden min-h-0"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>

              {/* HEADER */}
              <div className="flex items-center justify-between gap-4 px-5 py-4 shrink-0"
                style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <div className="flex items-center gap-3 min-w-0">
                  <button onClick={() => setSelected(null)}
                    className="lg:hidden w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>
                    <ArrowLeft size={15} />
                  </button>
                  <div className="min-w-0">
                    <div className="font-bold text-sm truncate" style={{ color: 'var(--text-primary)' }}>
                      {(selected as any).profiles?.full_name ?? 'Cliente'}
                    </div>
                    <div className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                      {(selected as any).profiles?.email}
                    </div>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-sm font-semibold" style={{ color: 'var(--brand)' }}>{selected.event_type}</div>
                  {selected.event_date && (
                    <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                      {formatDate(selected.event_date)} · {selected.guest_count} personas
                    </div>
                  )}
                </div>
              </div>

              {/* FORMULARIO DE COTIZACIÓN — colapsable */}
              <div className="shrink-0" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <button
                  onClick={() => setShowForm(f => !f)}
                  className="w-full flex items-center justify-between px-5 py-3 text-sm font-semibold transition-all"
                  style={{ color: showForm ? 'var(--brand)' : 'var(--text-primary)', background: showForm ? 'var(--brand-dim)' : 'transparent' }}>
                  <span>💬 {showForm ? 'Ocultar formulario de precio' : 'Enviar propuesta de precio'}</span>
                  <span className="text-xs font-normal" style={{ color: 'var(--text-muted)' }}>
                    {showForm ? '▲' : '▼'}
                  </span>
                </button>

                {showForm && (
                  <div className="px-5 pb-5 space-y-3.5" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                    {/* Solicitud */}
                    <div className="rounded-xl p-3.5 text-sm leading-relaxed mt-4"
                      style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                      "{(selected as any).event_notes ?? 'El cliente no dejó descripción adicional.'}"
                    </div>

                    {/* Precio */}
                    <div>
                      <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                        Precio total del evento (RD$) *
                      </label>
                      <input type="number" value={price} onChange={e => setPrice(e.target.value)}
                        placeholder="Ej: 85000"
                        className="input-base w-full rounded-xl px-4 py-2.5 text-sm"
                        style={{ fontSize: 16 }} />
                      {price && !isNaN(parseFloat(price)) && (
                        <div className="mt-2 space-y-1.5">
                          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                            Comisión 10%: {formatCurrency(parseFloat(price) * 0.10)} · <strong>Recibes: {formatCurrency(parseFloat(price) * 0.90)}</strong>
                          </p>
                          <QuoteSchedulePreview price={parseFloat(price)} eventDate={selected?.event_date ?? ''} />
                        </div>
                      )}
                    </div>

                    {/* Mensaje */}
                    <div>
                      <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                        Mensaje al cliente (opcional)
                      </label>
                      <textarea value={response} onChange={e => setResponse(e.target.value)}
                        placeholder="Ej: Buenos días, con gusto podemos atender su evento..."
                        rows={2} className="input-base w-full rounded-xl px-4 py-2.5 text-sm resize-none"
                        style={{ fontSize: 16 }} />
                    </div>

                    {/* Botones */}
                    <div className="flex gap-2">
                      <button onClick={handleRespond} disabled={!price || sending}
                        className="flex-1 flex items-center justify-center gap-1.5 text-sm font-bold py-2.5 rounded-xl disabled:opacity-40"
                        style={{ background: 'var(--brand)', color: '#fff' }}>
                        {sending ? <><Loader2 size={14} className="animate-spin" /> Enviando...</> : <><Send size={14} /> Enviar cotización</>}
                      </button>
                      <button onClick={() => handleReject(selected.id)} disabled={actionId === selected.id + 'r'}
                        className="px-3.5 py-2.5 rounded-xl text-sm font-semibold"
                        style={{ background: 'rgba(220,38,38,0.07)', color: '#DC2626', border: '1px solid rgba(220,38,38,0.18)' }}>
                        {actionId === selected.id + 'r' ? <Loader2 size={14} className="animate-spin" /> : <X size={15} />}
                      </button>
                    </div>

                    {(sendError || rejectError) && (
                      <p className="text-xs text-center font-semibold" style={{ color: '#DC2626' }}>
                        {sendError || rejectError}
                      </p>
                    )}
                    <p className="text-xs text-center" style={{ color: 'var(--text-muted)' }}>
                      Al enviar, el cliente recibe el precio y plan de cuotas por email.
                    </p>
                  </div>
                )}
              </div>

              {/* CHAT — flex-1 */}
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 min-h-0">
                {chatLoading ? (
                  <div className="flex justify-center pt-10">
                    <Loader2 size={22} className="animate-spin" style={{ color: 'var(--text-muted)' }} />
                  </div>
                ) : chatMessages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center py-12">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3"
                      style={{ background: 'var(--bg-elevated)' }}>
                      <MessageSquare size={20} style={{ color: 'var(--text-muted)' }} />
                    </div>
                    <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Sin mensajes aún</p>
                    <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                      Escribe al cliente para aclarar detalles antes de enviar el precio.
                    </p>
                  </div>
                ) : (
                  chatMessages.map((msg, i) => {
                    const isMe = msg.sender_id === chatUserId
                    const showTime = i === chatMessages.length - 1 ||
                      new Date(chatMessages[i+1]?.created_at).getTime() - new Date(msg.created_at).getTime() > 300000
                    return (
                      <div key={msg.id ?? i} className={cn('flex flex-col gap-1', isMe ? 'items-end' : 'items-start')}>
                        <div className={cn('max-w-[75%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed',
                          isMe ? 'rounded-br-md' : 'rounded-bl-md')}
                          style={isMe
                            ? { background: 'var(--brand)', color: '#fff' }
                            : { background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)' }
                          }>
                          {msg.body && <p>{msg.body}</p>}
                          {msg.attachment_url && (
                            <div className="mt-1.5">
                              <FilePreview name={msg.attachment_name ?? 'archivo'} url={msg.attachment_url} type={msg.attachment_type ?? 'file'} />
                            </div>
                          )}
                        </div>
                        {showTime && (
                          <span className="text-[10px] px-1" style={{ color: 'var(--text-muted)' }}>
                            {new Date(msg.created_at).toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                    )
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* INPUT DE CHAT */}
              <div className="shrink-0 px-4 pb-4 pt-2" style={{ borderTop: '1px solid var(--border-subtle)' }}>

                {/* Preview adjunto */}
                {attachment && (
                  <div className="flex items-center gap-2 mb-2 px-3 py-2 rounded-xl"
                    style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
                    {attachment.type === 'image'
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={attachment.preview} alt="preview" className="w-10 h-10 rounded-lg object-cover shrink-0" />
                      : <FileText size={18} style={{ color: 'var(--text-muted)' }} className="shrink-0" />
                    }
                    <span className="text-xs font-medium flex-1 min-w-0 truncate" style={{ color: 'var(--text-secondary)' }}>
                      {attachment.file.name}
                    </span>
                    <button onClick={removeAttachment} className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                      style={{ background: 'var(--border-medium)', color: 'var(--text-muted)' }}>
                      <X size={10} />
                    </button>
                  </div>
                )}

                {chatError && (
                  <p className="text-xs mb-2 font-medium" style={{ color: '#DC2626' }}>{chatError}</p>
                )}

                <form onSubmit={handleSendChat} className="flex items-center gap-2">
                  {/* Adjuntar archivo */}
                  <input ref={fileRef} type="file" accept={ACCEPTED_TYPES.join(',')} className="hidden" onChange={handleFileChange} />
                  <button type="button" onClick={() => fileRef.current?.click()}
                    className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all"
                    style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}
                    title="Adjuntar archivo">
                    {uploading ? <Loader2 size={15} className="animate-spin" /> : <Paperclip size={15} />}
                  </button>

                  {/* Input */}
                  <input
                    ref={chatInputRef}
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendChat(e as any) } }}
                    placeholder="Escribe un mensaje al cliente..."
                    className="flex-1 min-w-0 rounded-xl px-4 py-2.5 text-sm input-base"
                    style={{ fontSize: 16 }}
                  />

                  {/* Enviar */}
                  <button type="submit"
                    disabled={(!chatInput.trim() && !attachment) || chatSending || uploading}
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
                <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
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
