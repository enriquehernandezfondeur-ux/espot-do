'use client'

import { useState, useEffect, useRef } from 'react'
import { Loader2, MessageCircle, Send, Search, Paperclip, FileText, Download, X, ArrowLeft, Building2, Zap, ChevronDown, Trash2 } from 'lucide-react'
import { getMyConversations, getConversation, sendMessage, markMessagesRead, markAllMessagesRead, hideConversation } from '@/lib/actions/messages'
import type { MessageAttachment } from '@/lib/actions/messages'
import { getMessageTemplates, addMessageTemplate, deleteMessageTemplate, type MessageTemplate } from '@/lib/actions/message-templates'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { LoadError } from '@/components/LoadError'

const ACCEPTED = [
  'image/jpeg','image/png','image/gif','image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
].join(',')
const MAX_MB = 20
function isImage(t: string) { return t.startsWith('image/') }

export default function HostMensajesPage() {
  const [convs,     setConvs]     = useState<any[]>([])
  const [loading,   setLoading]   = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [active,    setActive]    = useState<any | null>(null)
  const [messages,  setMessages]  = useState<any[]>([])
  const [userId,    setUserId]    = useState<string | null>(null)
  const [guestId,   setGuestId]   = useState<string | null>(null)
  const [body,      setBody]      = useState('')
  const [sending,   setSending]   = useState(false)
  const [uploading, setUploading] = useState(false)
  const [sendError, setSendError] = useState('')
  const [search,    setSearch]    = useState('')
  const [attachment, setAttachment] = useState<{ file: File; preview: string; type: 'image' | 'file' } | null>(null)
  const [showQuickReplies, setShowQuickReplies] = useState(false)

  const [templates,    setTemplates]    = useState<MessageTemplate[]>([])
  const [managing,     setManaging]     = useState(false)
  const [newTemplate,  setNewTemplate]  = useState('')

  useEffect(() => { getMessageTemplates().then(setTemplates).catch(() => {}) }, [])

  async function handleAddTemplate() {
    if (!newTemplate.trim()) return
    const r = await addMessageTemplate(newTemplate)
    if (r.template) { setTemplates(t => [...t, r.template!]); setNewTemplate('') }
  }
  async function handleDeleteTemplate(id: string) {
    setTemplates(t => t.filter(x => x.id !== id))
    await deleteMessageTemplate(id)
  }

  const bottomRef    = useRef<HTMLDivElement>(null)
  const fileRef      = useRef<HTMLInputElement>(null)
  const textareaRef  = useRef<HTMLTextAreaElement>(null)
  const channelRef       = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null)
  const globalChannelRef = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null)
  const activeRef        = useRef<any | null>(null)
  const supabaseRef      = useRef(createClient())
  const supabase         = supabaseRef.current

  useEffect(() => () => {
    channelRef.current?.unsubscribe()
    globalChannelRef.current?.unsubscribe()
  }, [])

  useEffect(() => {
    async function init() {
      let uid: string | null = null
      try {
        const { data: { user } } = await supabase.auth.getUser()
        uid = user?.id ?? null
        setUserId(uid)
        const data = await getMyConversations()
        setConvs(data)
        // Abrir la bandeja marca todo como leído y limpia el punto del sidebar
        markAllMessagesRead()
          .then(() => window.dispatchEvent(new Event('espot:messages-read')))
          .catch(() => {})
      } catch { setLoadError(true) }
      setLoading(false)

      // Suscripción global: marca conversaciones inactivas como no leídas
      // cuando llega un mensaje nuevo de un cliente
      if (uid) {
        globalChannelRef.current?.unsubscribe()
        globalChannelRef.current = supabase
          .channel(`msg-host-global-${uid}`)
          .on('postgres_changes', {
            event: 'INSERT', schema: 'public', table: 'messages',
            filter: `receiver_id=eq.${uid}`,
          }, payload => {
            const m = payload.new as any
            const otherId = m.sender_id // receiver soy yo → el otro es el emisor
            setConvs(prev => prev.map(c =>
              c.spaceId === m.space_id && c.otherId === otherId &&
              !(activeRef.current?.spaceId === m.space_id && activeRef.current?.otherId === otherId)
                ? { ...c, unread: true }
                : c
            ))
          })
          .subscribe()
      }
    }
    init()
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function openConv(conv: any) {
    setActive(conv)
    activeRef.current = conv
    setAttachment(null)
    setSendError('')
    const data = await getConversation(conv.spaceId, conv.otherId)
    setMessages(data?.messages ?? [])
    setGuestId(conv.otherId ?? null)
    markMessagesRead(conv.spaceId, conv.otherId).then(() => window.dispatchEvent(new Event('espot:messages-read')))
    setConvs(prev => prev.map(c => (c.spaceId === conv.spaceId && c.otherId === conv.otherId) ? { ...c, unread: false } : c))

    channelRef.current?.unsubscribe()
    channelRef.current = supabase.channel(`msg-host-${conv.spaceId}-${conv.otherId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `space_id=eq.${conv.spaceId}` },
        payload => {
          // Solo mensajes de ESTE cliente (no de otros clientes del mismo espacio)
          const m = payload.new as any
          if (m.sender_id !== conv.otherId && m.receiver_id !== conv.otherId) return
          setMessages(prev => prev.find(x => x.id === m.id) ? prev : [...prev, m])
        })
    channelRef.current.subscribe()
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!ACCEPTED.split(',').includes(file.type)) { setSendError('Tipo de archivo no soportado'); return }
    if (file.size > MAX_MB * 1024 * 1024) { setSendError(`Máximo ${MAX_MB}MB`); return }
    setSendError('')
    setAttachment({ file, preview: isImage(file.type) ? URL.createObjectURL(file) : '', type: isImage(file.type) ? 'image' : 'file' })
    e.target.value = ''
  }

  function removeAttachment() {
    if (attachment?.preview) URL.revokeObjectURL(attachment.preview)
    setAttachment(null)
  }

  async function uploadAttachment(file: File): Promise<MessageAttachment | null> {
    setUploading(true)
    const ext  = file.name.split('.').pop()?.toLowerCase() ?? 'bin'
    const path = `chat/${active?.spaceId}/${userId}/${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('space-images').upload(path, file, { cacheControl: '3600', upsert: false })
    if (error) { setSendError(`Error al subir: ${error.message}`); setUploading(false); return null }
    const { data: { publicUrl } } = supabase.storage.from('space-images').getPublicUrl(path)
    setUploading(false)
    return { url: publicUrl, type: isImage(file.type) ? 'image' : 'file', name: file.name }
  }

  async function handleSend() {
    if ((!body.trim() && !attachment) || sending || uploading || !active || !guestId) return
    setSending(true); setSendError('')

    let att: MessageAttachment | undefined
    if (attachment) {
      const uploaded = await uploadAttachment(attachment.file)
      if (!uploaded) { setSending(false); return }
      att = uploaded
    }

    const result = await sendMessage(active.spaceId, guestId, body, att)
    if ('error' in result) {
      setSendError(result.error ?? 'Error al enviar')
    } else {
      // Usar la fila real devuelta (id UUID) para que el dedup por id del realtime no duplique.
      const real = (result as any).message
      if (real) setMessages(prev => prev.find(m => m.id === real.id) ? prev : [...prev, real])
      setBody('')
      removeAttachment()
      if (textareaRef.current) textareaRef.current.style.height = 'auto'
    }
    setSending(false)
  }

  const filtered = convs.filter(c =>
    c.spaceName.toLowerCase().includes(search.toLowerCase()) ||
    (c.otherName ?? '').toLowerCase().includes(search.toLowerCase()))
  const canSend  = (body.trim() || !!attachment) && !sending && !uploading

  function timeLabel(d: string) {
    const date = new Date(d)
    const now  = new Date()
    if (date.toDateString() === now.toDateString())
      return date.toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit' })
    return date.toLocaleDateString('es-DO', { day: 'numeric', month: 'short' })
  }

  if (loading) return (
    <div className="flex items-center justify-center h-dvh" style={{ background: 'var(--bg-base)' }}>
      <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--brand)' }} />
    </div>
  )
  if (loadError) return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <h1 className="text-xl md:text-2xl font-bold mb-4" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Mensajes</h1>
      <div className="rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
        <LoadError message="No pudimos cargar tus mensajes." onRetry={() => window.location.reload()} />
      </div>
    </div>
  )

  return (
    <div className="flex flex-col md:flex-row h-[calc(100dvh-136px)] md:h-dvh overflow-hidden" style={{ background: 'var(--bg-base)', color: 'var(--text-primary)' }}>

      {/* Sidebar */}
      <div className={`w-full md:w-72 md:flex-col md:shrink-0 flex flex-col ${active ? 'hidden md:flex' : 'flex'}`}
        style={{ background: 'var(--bg-surface)', borderRight: '1px solid var(--border-subtle)', maxHeight: '100dvh' }}>
        <div className="px-5 pt-6 pb-4">
          <h1 className="text-lg font-bold mb-3" style={{ color: 'var(--text-primary)' }}>Mensajes</h1>
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl mb-3"
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
            <Search size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Buscar..." className="bg-transparent text-sm flex-1 focus:outline-none"
              style={{ color: 'var(--text-primary)', fontSize: 16 }} />
          </div>
          {/* Banner seguridad */}
          <div className="flex items-start gap-2.5 px-3 py-2.5 rounded-xl"
            style={{ background: 'rgba(217,119,6,0.06)', border: '1px solid rgba(217,119,6,0.18)' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            <p className="text-xs leading-relaxed" style={{ color: '#92400E' }}>
              <span className="font-bold">No compartas datos bancarios por chat.</span>{' '}
              Espot gestiona todos los pagos. Si un cliente solicita pago directo, repórtalo.
            </p>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center px-5">
              <MessageCircle size={28} className="mb-3" style={{ color: 'var(--text-muted)' }} />
              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Sin mensajes aún</p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                Los clientes pueden escribirte desde el marketplace
              </p>
            </div>
          ) : filtered.map(conv => (
            <div key={`${conv.spaceId}:${conv.otherId}`} className="group relative"
              style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              <button onClick={() => openConv(conv)}
                className="w-full text-left px-5 py-4 transition-colors"
                style={{ background: (active?.spaceId === conv.spaceId && active?.otherId === conv.otherId) ? 'var(--brand-dim)' : 'transparent' }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0" style={{ background: 'var(--bg-elevated)' }}>
                    {conv.cover ? <img src={conv.cover} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><Building2 size={18} style={{ color: '#CBD5E1' }} /></div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-sm truncate" style={{ color: 'var(--text-primary)' }}>{conv.otherName ?? 'Cliente'}</span>
                      <span className="text-xs shrink-0" style={{ color: 'var(--text-muted)' }}>{timeLabel(conv.lastAt)}</span>
                    </div>
                    <div className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{conv.spaceName}</div>
                    <div className="flex items-center gap-1 mt-0.5">
                      <p className="text-xs truncate flex-1" style={{ color: 'var(--text-secondary)' }}>
                        {conv.lastMessage ?? (conv.hasAttachment ? 'Archivo adjunto' : '')}
                      </p>
                      {conv.unread && <span className="w-2 h-2 rounded-full shrink-0" style={{ background: 'var(--brand)' }} />}
                    </div>
                  </div>
                </div>
              </button>
              {/* Botón eliminar — aparece en hover */}
              <button
                onClick={async e => {
                  e.stopPropagation()
                  if (!window.confirm('¿Eliminar esta conversación de tu lista? Los mensajes quedan guardados en el sistema.')) return
                  await hideConversation(conv.spaceId, conv.otherId)
                  setConvs(prev => prev.filter(c => !(c.spaceId === conv.spaceId && c.otherId === conv.otherId)))
                  if (active?.spaceId === conv.spaceId && active?.otherId === conv.otherId) setActive(null)
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg flex items-center justify-center opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
                style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}
                title="Eliminar conversación">
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Chat */}
      {active ? (
        <div className="flex-1 flex flex-col min-h-0">
          {/* Header */}
          <div className="flex items-center gap-3 px-4 md:px-5 py-3.5 shrink-0"
            style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-subtle)' }}>
            <button onClick={() => setActive(null)}
              className="md:hidden w-8 h-8 flex items-center justify-center rounded-xl shrink-0"
              style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>
              <ArrowLeft size={17} />
            </button>
            <div className="w-9 h-9 rounded-xl overflow-hidden shrink-0" style={{ background: 'var(--bg-elevated)' }}>
              {active.cover ? <img src={active.cover} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><Building2 size={16} style={{ color: '#CBD5E1' }} /></div>}
            </div>
            <div className="min-w-0">
              <div className="font-semibold text-sm truncate" style={{ color: 'var(--text-primary)' }}>{active.otherName ?? 'Cliente'}</div>
              <div className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{active.spaceName}</div>
            </div>
          </div>

          {/* Banner seguridad — fijo dentro del chat */}
          <div className="flex items-start gap-2.5 px-4 py-3 shrink-0"
            style={{ background: '#FFFBEB', borderBottom: '1px solid #FDE68A' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
            <p className="text-xs leading-relaxed" style={{ color: '#92400E' }}>
              <span className="font-bold">No acuerdes pagos fuera de Espot.</span>{' '}
              Si aceptas pagos directos pierdes la protección de la plataforma. Los clientes pagan a través de Espot y tú recibes el neto.
            </p>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto min-h-0 px-5 py-5 space-y-3" style={{ background: 'var(--bg-base)' }}>
            {messages.map(msg => {
              const isMe = msg.sender_id === userId
              const hasAttach = !!msg.attachment_url
              return (
                <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                  <div className="max-w-[75%]">
                    <div className={cn('rounded-2xl overflow-hidden', isMe ? 'rounded-br-sm' : 'rounded-bl-sm')}
                      style={isMe
                        ? { background: 'var(--brand)', color: '#fff' }
                        : { background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)' }}>
                      {hasAttach && (
                        <div className={msg.body ? 'p-2 pb-0' : 'p-2'}>
                          {msg.attachment_type === 'image' ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={msg.attachment_url} alt={msg.attachment_name ?? 'imagen'}
                              className="w-full rounded-xl object-cover cursor-pointer max-h-60"
                              onClick={() => window.open(msg.attachment_url, '_blank')} />
                          ) : (
                            <a href={msg.attachment_url} target="_blank" rel="noopener noreferrer" download={msg.attachment_name}
                              className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl"
                              style={{ background: isMe ? 'rgba(255,255,255,0.15)' : 'var(--bg-elevated)', color: 'inherit' }}>
                              <FileText size={17} className="shrink-0" />
                              <span className="text-sm font-medium truncate" style={{ maxWidth: 160 }}>{msg.attachment_name ?? 'Archivo'}</span>
                              <Download size={13} className="shrink-0 opacity-70 ml-auto" />
                            </a>
                          )}
                        </div>
                      )}
                      {msg.body && <div className="px-4 py-3 text-sm leading-relaxed break-words">{msg.body}</div>}
                      {!msg.body && !hasAttach && <div className="px-4 py-3 text-sm opacity-40 italic">Mensaje vacío</div>}
                    </div>
                    <div className={cn('flex items-center gap-1 mt-1', isMe ? 'justify-end' : 'justify-start')}>
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{timeLabel(msg.created_at)}</span>
                      {isMe && (
                        <svg width="15" height="10" viewBox="0 0 15 10" fill="none" style={{ display:'inline-block', flexShrink:0 }}>
                          <path d="M1 5.5L3.5 8L8.5 2"  stroke={msg.read_at ? 'var(--brand)' : 'var(--text-muted)'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M6 5.5L8.5 8L13.5 2" stroke={msg.read_at ? 'var(--brand)' : 'var(--text-muted)'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="px-4 pt-3 shrink-0" style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))', background: 'var(--bg-surface)', borderTop: '1px solid var(--border-subtle)' }}>
            {/* Attachment preview */}
            {attachment && (
              <div className="flex items-center gap-3 mb-3 px-3 py-2.5 rounded-2xl"
                style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
                {attachment.type === 'image' && attachment.preview
                  ? <img src={attachment.preview} alt="" className="w-11 h-11 rounded-xl object-cover shrink-0" />
                  : (
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: 'var(--brand-dim)' }}>
                      <FileText size={18} style={{ color: 'var(--brand)' }} />
                    </div>
                  )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{attachment.file.name}</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{(attachment.file.size / 1024 / 1024).toFixed(1)} MB</p>
                </div>
                <button onClick={removeAttachment} className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: 'rgba(220,38,38,0.1)', color: 'var(--danger)' }}>
                  <X size={13} />
                </button>
              </div>
            )}

            {/* Respuestas rápidas */}
            <div className="relative mb-2">
              <button
                onClick={() => setShowQuickReplies(o => !o)}
                className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-xl transition-all"
                style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)', border: '1px solid var(--border-subtle)' }}>
                <Zap size={11} style={{ color: 'var(--brand)' }} /> Plantillas
                <ChevronDown size={11} style={{ transform: showQuickReplies ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
              </button>
              {showQuickReplies && (
                <div className="absolute bottom-full mb-1 left-0 right-0 rounded-2xl overflow-hidden shadow-xl z-10"
                  style={{ background: '#fff', border: '1px solid var(--border-subtle)', maxHeight: 320, overflowY: 'auto' }}>
                  <div className="flex items-center justify-between px-4 py-2.5" style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-elevated)' }}>
                    <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>Tus plantillas</span>
                    <button type="button" onClick={() => setManaging(m => !m)} className="text-xs font-semibold" style={{ color: 'var(--brand)' }}>
                      {managing ? 'Listo' : 'Gestionar'}
                    </button>
                  </div>
                  {templates.map((t, i) => (
                    <div key={t.id} className="flex items-center gap-2 px-2"
                      style={{ borderBottom: i < templates.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}>
                      <button type="button" disabled={managing}
                        onClick={() => { setBody(t.body); setShowQuickReplies(false) }}
                        className="flex-1 text-left px-2 py-3 text-sm hover:bg-[var(--bg-elevated)] transition-colors rounded-lg disabled:cursor-default"
                        style={{ color: 'var(--text-primary)' }}>
                        {t.body.length > 80 ? t.body.slice(0, 80) + '…' : t.body}
                      </button>
                      {managing && (
                        <button type="button" onClick={() => handleDeleteTemplate(t.id)}
                          className="shrink-0 text-xs font-semibold px-2 py-1 rounded-lg" style={{ color: 'var(--danger)' }}>
                          Borrar
                        </button>
                      )}
                    </div>
                  ))}
                  {managing && (
                    <div className="flex items-center gap-2 px-3 py-2.5" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                      <input value={newTemplate} onChange={e => setNewTemplate(e.target.value)}
                        placeholder="Nueva plantilla…"
                        className="flex-1 px-3 py-2 rounded-lg text-sm"
                        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', fontSize: 16 }} />
                      <button type="button" onClick={handleAddTemplate}
                        className="shrink-0 text-xs font-bold px-3 py-2 rounded-lg" style={{ background: 'var(--brand)', color: '#fff' }}>
                        Añadir
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-end gap-2">
              <input ref={fileRef} type="file" accept={ACCEPTED} className="hidden" onChange={handleFileChange} />
              <button onClick={() => fileRef.current?.click()} disabled={sending || uploading}
                className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 transition-all disabled:opacity-40"
                style={{ background: 'var(--bg-elevated)', color: attachment ? 'var(--brand)' : 'var(--text-muted)', border: attachment ? '1.5px solid var(--brand-border)' : '1.5px solid var(--border-medium)' }}>
                <Paperclip size={17} />
              </button>
              <textarea ref={textareaRef} value={body} onChange={e => setBody(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
                placeholder={attachment ? 'Añade un texto (opcional)...' : 'Responder al cliente...'}
                rows={1}
                className="flex-1 resize-none text-sm px-4 py-3 rounded-2xl focus:outline-none"
                style={{ background: 'var(--bg-elevated)', border: '1.5px solid var(--border-medium)', color: 'var(--text-primary)', maxHeight: 120, fontSize: 16 }}
                onInput={e => { const t = e.target as HTMLTextAreaElement; t.style.height = 'auto'; t.style.height = Math.min(t.scrollHeight, 120) + 'px' }}
              />
              <button onClick={handleSend} disabled={!canSend}
                className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 disabled:opacity-40 transition-all"
                style={{ background: 'var(--brand)', color: '#fff', boxShadow: canSend ? '0 2px 8px rgba(53,196,147,0.3)' : 'none' }}>
                {(sending || uploading) ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
              </button>
            </div>
            <p className="text-xs text-center mt-2" style={{ color: sendError ? 'var(--danger)' : 'var(--text-muted)' }}>
              {sendError || 'Fotos, PDF, Word · Máx 20MB'}
            </p>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 rounded-3xl flex items-center justify-center mb-4" style={{ background: 'var(--brand-dim)' }}>
            <MessageCircle size={28} style={{ color: 'var(--brand)' }} />
          </div>
          <p className="font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Selecciona una conversación</p>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Los clientes pueden escribirte desde el marketplace</p>
        </div>
      )}
    </div>
  )
}
