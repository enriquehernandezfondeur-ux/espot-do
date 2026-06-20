'use client'

import { useState, useEffect, useRef } from 'react'
import {
  CalendarDays, Users, MessageSquare, X, Send, Loader2,
  ArrowLeft, Paperclip, FileText, Download,
} from 'lucide-react'
import { formatDate, formatCurrency } from '@/lib/utils'
import { getHostQuotes, respondToQuote } from '@/lib/actions/host'
import { rejectBooking } from '@/lib/actions/booking'
import { buildSchedule } from '@/lib/payments/schedule'
import { computePlatformFee, computeHostNet } from '@/lib/pricing'
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
      className="flex items-center gap-2 px-3 py-2 rounded-xl"
      style={{ background: 'rgba(255,255,255,0.12)', color: 'inherit' }}>
      <FileText size={14} className="shrink-0" />
      <span className="text-xs font-medium truncate max-w-[160px]">{name}</span>
      <Download size={12} className="shrink-0 ml-auto opacity-60" />
    </a>
  )
}

export default function CotizacionesPage() {
  const [quotes,      setQuotes]      = useState<Quote[]>([])
  const [loading,     setLoading]     = useState(true)
  const [selected,    setSelected]    = useState<Quote | null>(null)
  const [price,       setPrice]       = useState('')
  const [response,    setResponse]    = useState('')
  const [sending,     setSending]     = useState(false)
  const [actionId,    setActionId]    = useState<string | null>(null)
  const [sendError,   setSendError]   = useState('')
  const [rejectError, setRejectError] = useState('')

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

  useEffect(() => {
    getHostQuotes().then(d => { setQuotes(d); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!selected) { setChatMessages([]); return }
    setChatLoading(true)
    const guestId = (selected as any).guest_id
    getConversation(selected.space_id, guestId).then(conv => {
      setChatMessages(conv?.messages ?? [])
      setChatUserId(conv?.userId ?? null)
      markMessagesRead(selected.space_id, guestId).then(() => window.dispatchEvent(new Event('espot:messages-read')))
      setChatLoading(false)
    }).catch(() => setChatLoading(false))
  }, [selected?.id])

  useEffect(() => {
    if (!selected) return
    const supabase = createClient()
    const channel = supabase
      .channel(`cot:${selected.space_id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `space_id=eq.${selected.space_id}` },
        payload => {
          // Solo mensajes con el cliente de esta cotización (no otros del mismo espacio)
          const m = payload.new as any
          const guestId = (selected as any).guest_id
          if (m.sender_id !== guestId && m.receiver_id !== guestId) return
          setChatMessages(prev => prev.find(x => x.id === m.id) ? prev : [...prev, m])
        })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [selected?.space_id])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

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

  async function handleSendChat(e: React.FormEvent) {
    e.preventDefault()
    if ((!chatInput.trim() && !attachment) || !selected || chatSending || uploading) return
    const receiverId = (selected as any).guest_id
    if (!receiverId) { setChatError('No se pudo identificar al cliente'); return }
    setChatSending(true); setChatError('')

    let att: MessageAttachment | undefined
    if (attachment) {
      const uploaded = await uploadAttachment(attachment.file)
      if (!uploaded) { setChatSending(false); return }
      att = uploaded
    }

    const optimistic = {
      id: `opt-${Date.now()}`, sender_id: chatUserId, receiver_id: receiverId,
      body: chatInput.trim() || null,
      attachment_url: att?.url ?? null, attachment_type: att?.type ?? null, attachment_name: att?.name ?? null,
      created_at: new Date().toISOString(),
    }
    setChatMessages(prev => [...prev, optimistic])
    const savedInput = chatInput
    setChatInput(''); removeAttachment()

    const result = await sendMessage(selected.space_id, receiverId, optimistic.body ?? '', att)
    if ('error' in result) {
      setChatError(result.error ?? 'Error al enviar')
      setChatMessages(prev => prev.filter(m => m.id !== optimistic.id))
      setChatInput(savedInput)
    }
    setChatSending(false)
  }

  async function handleRespond() {
    if (!selected || !price) return
    const parsedPrice = parseFloat(price)
    if (isNaN(parsedPrice) || parsedPrice <= 0) return
    setSending(true); setSendError('')
    const result = await respondToQuote(selected.id, parsedPrice, response || undefined)
    if ('error' in result) { setSendError(result.error ?? 'Error al enviar.') }
    else { setQuotes(prev => prev.filter(q => q.id !== selected.id)); setSelected(null); setResponse(''); setPrice('') }
    setSending(false)
  }

  async function handleReject(id: string) {
    setActionId(id + 'r'); setRejectError('')
    const result = await rejectBooking(id)
    if ('error' in result) { setRejectError(result.error ?? 'Error al rechazar') }
    else { setQuotes(prev => prev.filter(q => q.id !== id)); if (selected?.id === id) setSelected(null) }
    setActionId(null)
  }

  if (loading) return (
    <div className="flex items-center justify-center h-dvh" style={{ background: 'var(--bg-base)' }}>
      <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--brand)' }} />
    </div>
  )

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div className="mb-5">
        <h1 className="text-xl md:text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Cotizaciones</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          {quotes.length > 0 ? `${quotes.length} solicitud${quotes.length !== 1 ? 'es' : ''} esperando tu respuesta` : 'Sin cotizaciones pendientes'}
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
        <div className="flex flex-col lg:flex-row gap-4 lg:gap-5 min-h-0 lg:h-[calc(100dvh-14rem)]">

          {/* ── Lista ── */}
          <div className="w-full lg:w-72 shrink-0 space-y-2 overflow-y-auto">
            {quotes.map(q => {
              const g = (q as any).profiles
              const isActive = selected?.id === q.id
              return (
                <button key={q.id}
                  onClick={() => { setSelected(q); setPrice(''); setResponse(''); setSendError('') }}
                  className="w-full text-left p-4 rounded-2xl border transition-all"
                  style={isActive
                    ? { background: 'var(--brand-dim)', borderColor: 'var(--brand-border)' }
                    : { background: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{g?.full_name ?? 'Cliente'}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>Cotización</span>
                  </div>
                  <div className="text-xs font-medium mb-1" style={{ color: 'var(--brand)' }}>{q.event_type}</div>
                  <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                    {q.event_date && <span className="flex items-center gap-1"><CalendarDays size={10} />{formatDate(q.event_date)}</span>}
                    <span className="flex items-center gap-1"><Users size={10} />{q.guest_count}</span>
                  </div>
                </button>
              )
            })}
          </div>

          {/* ── Panel detalle ── */}
          {selected ? (
            <div className="flex-1 flex flex-col lg:flex-row rounded-2xl overflow-hidden min-h-0"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>

              {/* ── IZQUIERDA: Formulario ── */}
              <div className="lg:w-96 shrink-0 flex flex-col overflow-y-auto"
                style={{ borderRight: '1px solid var(--border-subtle)' }}>

                {/* Header */}
                <div className="flex items-start justify-between gap-3 p-5 shrink-0"
                  style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <div className="flex items-center gap-2.5 min-w-0">
                    <button onClick={() => setSelected(null)}
                      className="lg:hidden w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>
                      <ArrowLeft size={14} />
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
                  <div className="text-right shrink-0">
                    <div className="text-sm font-semibold" style={{ color: 'var(--brand)' }}>{selected.event_type}</div>
                    {selected.event_date && (
                      <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                        {formatDate(selected.event_date)} · {selected.guest_count} pax
                      </div>
                    )}
                  </div>
                </div>

                {/* Form body */}
                <div className="p-5 space-y-4 flex-1">
                  {/* Solicitud */}
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>Solicitud</p>
                    <div className="rounded-xl p-3.5 text-sm leading-relaxed"
                      style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', fontStyle: 'italic', border: '1px solid var(--border-subtle)' }}>
                      "{(selected as any).event_notes ?? 'Sin descripción adicional.'}"
                    </div>
                  </div>

                  {/* Precio */}
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>
                      Tu propuesta de precio
                    </label>
                    <input type="number" value={price} onChange={e => setPrice(e.target.value)}
                      placeholder="Precio total en RD$"
                      className="input-base w-full rounded-xl px-4 py-2.5 text-sm"
                      style={{ fontSize: 16 }} />
                    {price && !isNaN(parseFloat(price)) && (
                      <div className="mt-2 space-y-1.5">
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                          Comisión 10%: {formatCurrency(computePlatformFee(parseFloat(price)))} · <strong style={{ color: 'var(--text-primary)' }}>Recibes: {formatCurrency(computeHostNet(parseFloat(price)))}</strong>
                        </p>
                        <QuoteSchedulePreview price={parseFloat(price)} eventDate={selected?.event_date ?? ''} />
                      </div>
                    )}
                  </div>

                  {/* Mensaje */}
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>
                      Mensaje (opcional)
                    </label>
                    <textarea value={response} onChange={e => setResponse(e.target.value)}
                      placeholder="Ej: Hola, con mucho gusto podemos atender su evento..."
                      rows={3} className="input-base w-full rounded-xl px-4 py-2.5 text-sm resize-none"
                      style={{ fontSize: 16 }} />
                  </div>

                  {/* Botones */}
                  <div className="flex gap-2">
                    <button onClick={handleRespond} disabled={!price || sending}
                      className="flex-1 flex items-center justify-center gap-1.5 text-sm font-bold py-3 rounded-xl disabled:opacity-40"
                      style={{ background: 'var(--brand)', color: '#fff', boxShadow: price ? '0 2px 10px rgba(53,196,147,0.3)' : 'none' }}>
                      {sending ? <><Loader2 size={14} className="animate-spin" />Enviando...</> : <><Send size={14} />Enviar cotización</>}
                    </button>
                    <button onClick={() => handleReject(selected.id)} disabled={actionId === selected.id + 'r'}
                      className="px-4 py-3 rounded-xl text-sm font-semibold"
                      style={{ background: 'rgba(220,38,38,0.07)', color: '#DC2626', border: '1px solid rgba(220,38,38,0.18)' }}>
                      {actionId === selected.id + 'r' ? <Loader2 size={14} className="animate-spin" /> : <X size={15} />}
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

              {/* ── DERECHA: Chat ── */}
              <div className="flex-1 flex flex-col min-h-0 border-t lg:border-t-0"
                style={{ borderColor: 'var(--border-subtle)' }}>

                {/* Chat header */}
                <div className="flex items-center gap-2 px-4 py-3 shrink-0"
                  style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-elevated)' }}>
                  <MessageSquare size={14} style={{ color: 'var(--brand)' }} />
                  <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                    Chat con {(selected as any).profiles?.full_name?.split(' ')[0] ?? 'el cliente'}
                  </span>
                </div>

                {/* Mensajes */}
                <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2 min-h-0">
                  {chatLoading ? (
                    <div className="flex justify-center pt-10">
                      <Loader2 size={22} className="animate-spin" style={{ color: 'var(--text-muted)' }} />
                    </div>
                  ) : chatMessages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center py-10">
                      <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3"
                        style={{ background: 'var(--bg-elevated)' }}>
                        <MessageSquare size={20} style={{ color: 'var(--text-muted)' }} />
                      </div>
                      <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Sin mensajes aún</p>
                      <p className="text-xs mt-1 max-w-[220px]" style={{ color: 'var(--text-muted)' }}>
                        Escribe al cliente para aclarar detalles antes de enviar tu precio.
                      </p>
                    </div>
                  ) : (
                    chatMessages.map((msg, i) => {
                      const isMe = msg.sender_id === chatUserId
                      const showTime = i === chatMessages.length - 1 ||
                        new Date(chatMessages[i+1]?.created_at).getTime() - new Date(msg.created_at).getTime() > 300000
                      return (
                        <div key={msg.id ?? i} className={cn('flex flex-col gap-1', isMe ? 'items-end' : 'items-start')}>
                          <div className={cn('max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed', isMe ? 'rounded-br-md' : 'rounded-bl-md')}
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
                            <div className={`flex items-center gap-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
                              <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                                {new Date(msg.created_at).toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                              {isMe && (
                                <svg width="15" height="10" viewBox="0 0 15 10" fill="none" style={{ display:'inline-block', flexShrink:0 }}>
                                  <path d="M1 5.5L3.5 8L8.5 2"  stroke={msg.read_at ? 'var(--brand)' : 'var(--text-muted)'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                  <path d="M6 5.5L8.5 8L13.5 2" stroke={msg.read_at ? 'var(--brand)' : 'var(--text-muted)'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="shrink-0 p-3" style={{ borderTop: '1px solid var(--border-subtle)', paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
                  {attachment && (
                    <div className="flex items-center gap-2 mb-2 px-3 py-2 rounded-xl"
                      style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
                      {attachment.type === 'image'
                        // eslint-disable-next-line @next/next/no-img-element
                        ? <img src={attachment.preview} alt="preview" className="w-9 h-9 rounded-lg object-cover shrink-0" />
                        : <FileText size={16} style={{ color: 'var(--text-muted)' }} className="shrink-0" />
                      }
                      <span className="text-xs flex-1 min-w-0 truncate font-medium" style={{ color: 'var(--text-secondary)' }}>
                        {attachment.file.name}
                      </span>
                      <button onClick={removeAttachment} className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                        style={{ background: 'var(--border-medium)', color: 'var(--text-muted)' }}>
                        <X size={10} />
                      </button>
                    </div>
                  )}
                  {chatError && <p className="text-xs mb-2 font-medium" style={{ color: '#DC2626' }}>{chatError}</p>}

                  <input ref={fileRef} type="file" accept={ACCEPTED_TYPES.join(',')} className="hidden" onChange={handleFileChange} />

                  <form onSubmit={handleSendChat} className="flex items-center gap-2">
                    <button type="button" onClick={() => fileRef.current?.click()}
                      className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all"
                      style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)', border: '1px solid var(--border-subtle)' }}>
                      {uploading ? <Loader2 size={14} className="animate-spin" /> : <Paperclip size={14} />}
                    </button>
                    <input
                      value={chatInput}
                      onChange={e => setChatInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendChat(e as any) } }}
                      placeholder="Escribe un mensaje..."
                      className="flex-1 min-w-0 rounded-xl px-4 py-2.5 text-sm input-base"
                      style={{ fontSize: 16 }}
                    />
                    <button type="submit"
                      disabled={(!chatInput.trim() && !attachment) || chatSending || uploading}
                      className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 disabled:opacity-40"
                      style={{ background: 'var(--brand)', color: '#fff' }}>
                      {chatSending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                    </button>
                  </form>
                </div>

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
