'use client'

import { useState, useEffect, useRef } from 'react'
import { Loader2, MessageCircle, Send, Search, Paperclip, FileText, Download, X, ArrowLeft } from 'lucide-react'
import { getMyConversations, getConversation, sendMessage, markMessagesRead } from '@/lib/actions/messages'
import type { MessageAttachment } from '@/lib/actions/messages'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

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

  const bottomRef  = useRef<HTMLDivElement>(null)
  const fileRef    = useRef<HTMLInputElement>(null)
  const channelRef       = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null)
  const globalChannelRef = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null)
  const activeRef        = useRef<any | null>(null)
  const supabase         = createClient()

  useEffect(() => () => {
    channelRef.current?.unsubscribe()
    globalChannelRef.current?.unsubscribe()
  }, [])

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      const uid = user?.id ?? null
      setUserId(uid)
      const data = await getMyConversations()
      setConvs(data)
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
            const spaceId = (payload.new as any).space_id
            setConvs(prev => prev.map(c =>
              c.spaceId === spaceId && c.spaceId !== (activeRef.current?.spaceId)
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
    const data = await getConversation(conv.spaceId)
    setMessages(data?.messages ?? [])
    const otherMsg = (data?.messages ?? []).find((m: any) => m.sender_id !== userId)
    setGuestId(otherMsg?.sender_id ?? null)
    markMessagesRead(conv.spaceId)
    setConvs(prev => prev.map(c => c.spaceId === conv.spaceId ? { ...c, unread: false } : c))

    channelRef.current?.unsubscribe()
    channelRef.current = supabase.channel(`msg-host-${conv.spaceId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `space_id=eq.${conv.spaceId}` },
        payload => { setMessages(prev => prev.find(m => m.id === payload.new.id) ? prev : [...prev, payload.new]) })
    channelRef.current.subscribe()
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
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
      const optimistic = {
        id: Date.now().toString(), sender_id: userId, receiver_id: guestId,
        body: body.trim() || null, attachment_url: att?.url ?? null,
        attachment_type: att?.type ?? null, attachment_name: att?.name ?? null,
        created_at: new Date().toISOString(),
      }
      setMessages(prev => [...prev, optimistic])
      setBody('')
      removeAttachment()
    }
    setSending(false)
  }

  const filtered = convs.filter(c => c.spaceName.toLowerCase().includes(search.toLowerCase()))
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

  return (
    <div className="flex flex-col md:flex-row md:h-dvh" style={{ background: 'var(--bg-base)', color: 'var(--text-primary)', minHeight: '100dvh' }}>

      {/* Sidebar */}
      <div className={`w-full md:w-72 md:flex-col md:shrink-0 flex flex-col ${active ? 'hidden md:flex' : 'flex'}`}
        style={{ background: 'var(--bg-surface)', borderRight: '1px solid var(--border-subtle)', maxHeight: '100dvh' }}>
        <div className="px-5 pt-6 pb-4">
          <h1 className="text-lg font-bold mb-3" style={{ color: 'var(--text-primary)' }}>Mensajes</h1>
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
            <Search size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Buscar..." className="bg-transparent text-sm flex-1 focus:outline-none"
              style={{ color: 'var(--text-primary)', fontSize: 16 }} />
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
            <button key={conv.spaceId} onClick={() => openConv(conv)}
              className="w-full text-left px-5 py-4 transition-colors"
              style={{ background: active?.spaceId === conv.spaceId ? 'var(--brand-dim)' : 'transparent', borderBottom: '1px solid var(--border-subtle)' }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0" style={{ background: 'var(--bg-elevated)' }}>
                  {conv.cover ? <img src={conv.cover} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-lg">🏛️</div>}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-sm truncate" style={{ color: 'var(--text-primary)' }}>{conv.spaceName}</span>
                    <span className="text-xs shrink-0" style={{ color: 'var(--text-muted)' }}>{timeLabel(conv.lastAt)}</span>
                  </div>
                  <div className="flex items-center gap-1 mt-0.5">
                    <p className="text-xs truncate flex-1" style={{ color: 'var(--text-secondary)' }}>
                      {conv.lastMessage ?? (conv.hasAttachment ? '📎 Archivo' : '')}
                    </p>
                    {conv.unread && <span className="w-2 h-2 rounded-full shrink-0" style={{ background: 'var(--brand)' }} />}
                  </div>
                </div>
              </div>
            </button>
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
              {active.cover ? <img src={active.cover} alt="" className="w-full h-full object-cover" /> : <div className="text-center text-xl leading-9">🏛️</div>}
            </div>
            <div className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{active.spaceName}</div>
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
                      {msg.body && <div className="px-4 py-3 text-sm leading-relaxed">{msg.body}</div>}
                      {!msg.body && !hasAttach && <div className="px-4 py-3 text-sm opacity-40 italic">Mensaje vacío</div>}
                    </div>
                    <div className={cn('text-xs mt-1', isMe ? 'text-right' : '')} style={{ color: 'var(--text-muted)' }}>
                      {timeLabel(msg.created_at)}
                    </div>
                  </div>
                </div>
              )
            })}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="px-4 py-3 shrink-0" style={{ background: 'var(--bg-surface)', borderTop: '1px solid var(--border-subtle)' }}>
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
                  style={{ background: 'rgba(220,38,38,0.1)', color: '#DC2626' }}>
                  <X size={13} />
                </button>
              </div>
            )}

            <div className="flex items-end gap-2">
              <input ref={fileRef} type="file" accept={ACCEPTED} className="hidden" onChange={handleFileChange} />
              <button onClick={() => fileRef.current?.click()} disabled={sending || uploading}
                className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 transition-all disabled:opacity-40"
                style={{ background: 'var(--bg-elevated)', color: attachment ? 'var(--brand)' : 'var(--text-muted)', border: attachment ? '1.5px solid var(--brand-border)' : '1.5px solid var(--border-medium)' }}>
                <Paperclip size={17} />
              </button>
              <textarea value={body} onChange={e => setBody(e.target.value)}
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
            <p className="text-xs text-center mt-2" style={{ color: sendError ? '#DC2626' : 'var(--text-muted)' }}>
              {sendError || 'Fotos, PDF, Word · Máx 20MB · 📎 para adjuntar'}
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
