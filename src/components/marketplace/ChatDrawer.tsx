'use client'

import { useState, useEffect, useRef } from 'react'
import { X, Send, Loader2, MessageCircle, Paperclip, FileText, Image, Download } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { getConversation, sendMessage, markMessagesRead } from '@/lib/actions/messages'
import type { MessageAttachment } from '@/lib/actions/messages'
import Link from 'next/link'

interface Props {
  spaceId: string
  spaceName: string
  hostId: string
  hostName: string
  onClose: () => void
}

const ACCEPTED_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]
const MAX_MB = 20

function isImage(type: string) { return type.startsWith('image/') }

function FilePreview({ name, url, type }: { name: string; url: string; type: 'image' | 'file' }) {
  if (type === 'image') {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={url} alt={name}
        className="max-w-full rounded-xl object-cover cursor-pointer"
        style={{ maxHeight: 200 }}
        onClick={() => window.open(url, '_blank')}
      />
    )
  }
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" download={name}
      className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all"
      style={{ background: 'rgba(255,255,255,0.15)', color: 'inherit' }}>
      <FileText size={18} className="shrink-0" />
      <span className="text-sm font-medium truncate max-w-[180px]">{name}</span>
      <Download size={14} className="shrink-0 opacity-70" />
    </a>
  )
}

export default function ChatDrawer({ spaceId, spaceName, hostId, hostName, onClose }: Props) {
  const [messages,    setMessages]   = useState<any[]>([])
  const [body,        setBody]       = useState('')
  const [loading,     setLoading]    = useState(true)
  const [sending,     setSending]    = useState(false)
  const [uploading,   setUploading]  = useState(false)
  const [sendError,   setSendError]  = useState('')
  const [userId,      setUserId]     = useState<string | null>(null)
  const [notLoggedIn, setNotLoggedIn]= useState(false)
  const [attachment,  setAttachment] = useState<{
    file: File; preview: string; url?: string; type: 'image' | 'file'
  } | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const fileRef   = useRef<HTMLInputElement>(null)
  const supabase  = createClient()

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setNotLoggedIn(true); setLoading(false); return }
      setUserId(user.id)
      const conv = await getConversation(spaceId)
      if (conv) { setMessages(conv.messages); markMessagesRead(spaceId) }
      setLoading(false)
    }
    init()
  }, [spaceId])

  // Realtime
  useEffect(() => {
    if (!userId) return
    const channel = supabase
      .channel(`messages:${spaceId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `space_id=eq.${spaceId}` },
        payload => {
          setMessages(prev => prev.find(m => m.id === payload.new.id) ? prev : [...prev, payload.new])
          if (payload.new.receiver_id === userId) markMessagesRead(spaceId)
        })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [spaceId, userId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Seleccionar archivo
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!ACCEPTED_TYPES.includes(file.type)) { setSendError('Tipo de archivo no soportado'); return }
    if (file.size > MAX_MB * 1024 * 1024) { setSendError(`Máximo ${MAX_MB}MB`); return }
    setSendError('')
    const preview = isImage(file.type) ? URL.createObjectURL(file) : ''
    setAttachment({ file, preview, type: isImage(file.type) ? 'image' : 'file' })
    e.target.value = ''
  }

  function removeAttachment() {
    if (attachment?.preview) URL.revokeObjectURL(attachment.preview)
    setAttachment(null)
  }

  async function uploadAttachment(file: File): Promise<MessageAttachment | null> {
    setUploading(true)
    const ext  = file.name.split('.').pop()?.toLowerCase() ?? 'bin'
    const path = `chat/${spaceId}/${userId}/${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('space-images').upload(path, file, { cacheControl: '3600', upsert: false })
    if (error) { setSendError(`Error al subir: ${error.message}`); setUploading(false); return null }
    const { data: { publicUrl } } = supabase.storage.from('space-images').getPublicUrl(path)
    setUploading(false)
    return { url: publicUrl, type: isImage(file.type) ? 'image' : 'file', name: file.name }
  }

  async function handleSend() {
    if ((!body.trim() && !attachment) || sending || uploading) return
    if (!userId) return
    setSending(true); setSendError('')

    let att: MessageAttachment | undefined
    if (attachment) {
      const uploaded = await uploadAttachment(attachment.file)
      if (!uploaded) { setSending(false); return }
      att = uploaded
    }

    const result = await sendMessage(spaceId, hostId, body, att)
    if ('error' in result) {
      setSendError(result.error ?? 'Error al enviar')
    } else {
      const optimistic = {
        id: Date.now().toString(),
        sender_id:       userId,
        receiver_id:     hostId,
        body:            body.trim() || null,
        attachment_url:  att?.url  ?? null,
        attachment_type: att?.type ?? null,
        attachment_name: att?.name ?? null,
        created_at:      new Date().toISOString(),
      }
      setMessages(prev => [...prev, optimistic])
      setBody('')
      removeAttachment()
    }
    setSending(false)
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  function timeLabel(d: string) {
    return new Date(d).toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit' })
  }

  const canSend = (body.trim() || !!attachment) && !sending && !uploading

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-full max-w-md z-50 flex flex-col shadow-2xl"
        style={{ background: '#fff', animation: 'slideInRight 0.25s ease-out' }}>
        <style>{`@keyframes slideInRight{from{transform:translateX(100%)}to{transform:translateX(0)}}`}</style>

        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4"
          style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <button onClick={onClose} className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-gray-100"
            style={{ color: 'var(--text-secondary)' }}>
            <X size={18} />
          </button>
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-white text-sm shrink-0"
            style={{ background: 'linear-gradient(135deg, var(--brand), var(--brand-dark))' }}>
            {hostName.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-sm truncate" style={{ color: 'var(--text-primary)' }}>{hostName}</div>
            <div className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{spaceName}</div>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>En línea</span>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3" style={{ background: '#FAFBFC' }}>
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--brand)' }} />
            </div>
          ) : notLoggedIn ? (
            <div className="flex flex-col items-center justify-center h-full text-center gap-4">
              <div className="w-16 h-16 rounded-3xl flex items-center justify-center" style={{ background: 'var(--brand-dim)' }}>
                <MessageCircle size={28} style={{ color: 'var(--brand)' }} />
              </div>
              <div>
                <p className="font-bold mb-1" style={{ color: 'var(--text-primary)' }}>Inicia sesión para chatear</p>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Crea una cuenta para enviarle un mensaje al propietario.</p>
              </div>
              <Link href="/auth" className="btn-brand px-6 py-3 rounded-xl font-semibold text-sm">Iniciar sesión</Link>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center gap-3 py-12">
              <div className="w-14 h-14 rounded-3xl flex items-center justify-center" style={{ background: 'var(--brand-dim)' }}>
                <MessageCircle size={24} style={{ color: 'var(--brand)' }} />
              </div>
              <div>
                <p className="font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>¡Empieza la conversación!</p>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Pregúntale sobre disponibilidad, precios o cualquier duda.</p>
              </div>
              <div className="space-y-2 w-full mt-2">
                {['¿Tienen disponibilidad para mi fecha?','¿Puedo visitar el espacio?','¿Aceptan decoración externa?'].map(q => (
                  <button key={q} onClick={() => setBody(q)}
                    className="w-full text-left px-4 py-2.5 rounded-xl text-sm"
                    style={{ background: '#fff', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              <div className="flex justify-center mb-4">
                <div className="text-xs px-3 py-1.5 rounded-full" style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}>
                  Conversación con {hostName}
                </div>
              </div>
              {messages.map((msg, i) => {
                const isMe     = msg.sender_id === userId
                const showTime = i === messages.length - 1 ||
                  new Date(messages[i+1]?.created_at).getTime() - new Date(msg.created_at).getTime() > 300000
                const hasAttach = !!msg.attachment_url
                return (
                  <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className="max-w-[80%]">
                      <div className={`rounded-2xl overflow-hidden ${isMe ? 'rounded-br-sm' : 'rounded-bl-sm'}`}
                        style={isMe
                          ? { background: 'var(--brand)', color: '#fff' }
                          : { background: '#fff', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)' }}>

                        {/* Adjunto */}
                        {hasAttach && (
                          <div className={msg.body ? 'p-2 pb-0' : 'p-2'}>
                            {msg.attachment_type === 'image' ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={msg.attachment_url} alt={msg.attachment_name ?? 'imagen'}
                                className="w-full rounded-xl object-cover cursor-pointer max-h-60"
                                onClick={() => window.open(msg.attachment_url, '_blank')}
                              />
                            ) : (
                              <a href={msg.attachment_url} target="_blank" rel="noopener noreferrer" download={msg.attachment_name}
                                className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all"
                                style={{ background: isMe ? 'rgba(255,255,255,0.15)' : 'var(--bg-elevated)', color: 'inherit' }}>
                                <FileText size={18} className="shrink-0" />
                                <span className="text-sm font-medium truncate" style={{ maxWidth: 160 }}>
                                  {msg.attachment_name ?? 'Archivo'}
                                </span>
                                <Download size={13} className="shrink-0 opacity-70 ml-auto" />
                              </a>
                            )}
                          </div>
                        )}

                        {/* Texto */}
                        {msg.body && (
                          <div className="px-4 py-3 text-sm leading-relaxed">{msg.body}</div>
                        )}
                      </div>

                      {showTime && (
                        <div className={`text-xs mt-1 ${isMe ? 'text-right' : 'text-left'}`}
                          style={{ color: 'var(--text-muted)' }}>
                          {timeLabel(msg.created_at)}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
              <div ref={bottomRef} />
            </>
          )}
        </div>

        {/* Input area */}
        {!notLoggedIn && (
          <div className="px-4 py-3" style={{ borderTop: '1px solid var(--border-subtle)', background: '#fff' }}>

            {/* Preview del adjunto seleccionado */}
            {attachment && (
              <div className="flex items-center gap-3 mb-3 px-3 py-2.5 rounded-2xl"
                style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
                {attachment.type === 'image' && attachment.preview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={attachment.preview} alt="" className="w-12 h-12 rounded-xl object-cover shrink-0" />
                ) : (
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: 'var(--brand-dim)' }}>
                    <FileText size={20} style={{ color: 'var(--brand)' }} />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                    {attachment.file.name}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {(attachment.file.size / 1024 / 1024).toFixed(1)} MB
                  </p>
                </div>
                <button onClick={removeAttachment}
                  className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: 'rgba(220,38,38,0.1)', color: '#DC2626' }}>
                  <X size={14} />
                </button>
              </div>
            )}

            {/* Textarea + botones */}
            <div className="flex items-end gap-2">

              {/* Adjuntar */}
              <input ref={fileRef} type="file"
                accept={ACCEPTED_TYPES.join(',')}
                className="hidden"
                onChange={handleFileChange}
              />
              <button
                onClick={() => fileRef.current?.click()}
                disabled={sending || uploading}
                className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 transition-all disabled:opacity-40"
                style={{ background: 'var(--bg-elevated)', color: attachment ? 'var(--brand)' : 'var(--text-muted)', border: attachment ? '1.5px solid var(--brand-border)' : '1.5px solid var(--border-medium)' }}>
                <Paperclip size={18} />
              </button>

              {/* Texto */}
              <textarea
                value={body}
                onChange={e => setBody(e.target.value)}
                onKeyDown={handleKey}
                placeholder={attachment ? 'Añade un texto (opcional)...' : 'Escribe un mensaje...'}
                rows={1}
                className="flex-1 resize-none text-sm px-4 py-3 rounded-2xl focus:outline-none transition-all"
                style={{
                  background: 'var(--bg-base)',
                  border: '1.5px solid var(--border-medium)',
                  color: 'var(--text-primary)',
                  maxHeight: 120,
                }}
                onInput={e => {
                  const t = e.target as HTMLTextAreaElement
                  t.style.height = 'auto'
                  t.style.height = Math.min(t.scrollHeight, 120) + 'px'
                }}
              />

              {/* Enviar */}
              <button
                onClick={handleSend}
                disabled={!canSend}
                className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 transition-all disabled:opacity-40"
                style={{ background: 'var(--brand)', color: '#fff', boxShadow: canSend ? '0 2px 8px rgba(53,196,147,0.3)' : 'none' }}>
                {(sending || uploading) ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
              </button>
            </div>

            {/* Tipos soportados / error */}
            <p className="text-xs text-center mt-2" style={{ color: sendError ? '#DC2626' : 'var(--text-muted)' }}>
              {sendError || 'Fotos, PDF, Word · Máx 20MB · Enter para enviar'}
            </p>
          </div>
        )}
      </div>
    </>
  )
}
