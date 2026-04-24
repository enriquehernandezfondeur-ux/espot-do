'use client'

import { useState, useEffect, useRef } from 'react'
import { X, Send, Loader2, MessageCircle, ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { getConversation, sendMessage, markMessagesRead } from '@/lib/actions/messages'
import Link from 'next/link'

interface Props {
  spaceId: string
  spaceName: string
  hostId: string
  hostName: string
  onClose: () => void
}

export default function ChatDrawer({ spaceId, spaceName, hostId, hostName, onClose }: Props) {
  const [messages, setMessages] = useState<any[]>([])
  const [body, setBody]         = useState('')
  const [loading, setLoading]   = useState(true)
  const [sending, setSending]   = useState(false)
  const [sendError, setSendError] = useState('')
  const [userId, setUserId]     = useState<string | null>(null)
  const [notLoggedIn, setNotLoggedIn] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const supabase  = createClient()

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setNotLoggedIn(true); setLoading(false); return }
      setUserId(user.id)

      const conv = await getConversation(spaceId)
      if (conv) {
        setMessages(conv.messages)
        markMessagesRead(spaceId)
      }
      setLoading(false)
    }
    init()
  }, [spaceId])

  // Realtime subscription
  useEffect(() => {
    if (!userId) return

    const channel = supabase
      .channel(`messages:${spaceId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `space_id=eq.${spaceId}`,
      }, payload => {
        setMessages(prev => {
          if (prev.find(m => m.id === payload.new.id)) return prev
          return [...prev, payload.new]
        })
        if (payload.new.receiver_id === userId) markMessagesRead(spaceId)
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [spaceId, userId])

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend() {
    if (!body.trim() || sending || !userId) return
    if (!hostId) { setSendError('No se pudo identificar al propietario. Recarga la página.'); return }
    setSending(true)
    setSendError('')
    const result = await sendMessage(spaceId, hostId, body)
    if ('error' in result) {
      setSendError(result.error ?? 'Error al enviar')
    } else {
      setBody('')
      // Agregar el mensaje localmente para feedback inmediato
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        sender_id: userId,
        receiver_id: hostId,
        body: body.trim(),
        created_at: new Date().toISOString(),
      }])
    }
    setSending(false)
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  function timeLabel(dateStr: string) {
    const d = new Date(dateStr)
    return d.toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm" onClick={onClose} />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-full max-w-md z-50 flex flex-col shadow-2xl animate-in slide-in-from-right duration-300"
        style={{ background: '#fff' }}>

        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4"
          style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <button onClick={onClose} className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors hover:bg-gray-100"
            style={{ color: 'var(--text-secondary)' }}>
            <X size={18} />
          </button>
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-white text-sm shrink-0"
            style={{ background: 'linear-gradient(135deg, var(--brand), var(--brand-dark))' }}>
            {hostName.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-sm truncate" style={{ color: 'var(--text-primary)' }}>
              {hostName}
            </div>
            <div className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
              {spaceName}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>En línea</span>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3" style={{ background: '#FAFBFC' }}>
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--brand)' }} />
            </div>
          ) : notLoggedIn ? (
            <div className="flex flex-col items-center justify-center h-full text-center gap-4">
              <div className="w-16 h-16 rounded-3xl flex items-center justify-center"
                style={{ background: 'var(--brand-dim)' }}>
                <MessageCircle size={28} style={{ color: 'var(--brand)' }} />
              </div>
              <div>
                <p className="font-bold mb-1" style={{ color: 'var(--text-primary)' }}>Inicia sesión para chatear</p>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  Crea una cuenta o inicia sesión para enviarle un mensaje al propietario.
                </p>
              </div>
              <Link href="/auth"
                className="btn-brand px-6 py-3 rounded-xl font-semibold text-sm">
                Iniciar sesión
              </Link>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center gap-3 py-12">
              <div className="w-14 h-14 rounded-3xl flex items-center justify-center"
                style={{ background: 'var(--brand-dim)' }}>
                <MessageCircle size={24} style={{ color: 'var(--brand)' }} />
              </div>
              <div>
                <p className="font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>¡Empieza la conversación!</p>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  Pregúntale al propietario sobre disponibilidad, precios o cualquier duda.
                </p>
              </div>
              {/* Quick starters */}
              <div className="space-y-2 w-full mt-2">
                {[
                  '¿Tienen disponibilidad para mi fecha?',
                  '¿Puedo visitar el espacio antes de reservar?',
                  '¿Aceptan decoración externa?',
                ].map(q => (
                  <button key={q} onClick={() => setBody(q)}
                    className="w-full text-left px-4 py-2.5 rounded-xl text-sm transition-all"
                    style={{ background: '#fff', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {/* Welcome message from host */}
              <div className="flex justify-center mb-4">
                <div className="text-xs px-3 py-1.5 rounded-full" style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}>
                  Conversación con {hostName}
                </div>
              </div>

              {messages.map((msg, i) => {
                const isMe = msg.sender_id === userId
                const showTime = i === messages.length - 1 ||
                  new Date(messages[i+1]?.created_at).getTime() - new Date(msg.created_at).getTime() > 300000

                return (
                  <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className="max-w-[78%]">
                      <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${isMe ? 'rounded-br-sm' : 'rounded-bl-sm'}`}
                        style={isMe ? {
                          background: 'var(--brand)',
                          color: '#fff',
                        } : {
                          background: '#fff',
                          color: 'var(--text-primary)',
                          border: '1px solid var(--border-subtle)',
                        }}>
                        {msg.body}
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

        {/* Input */}
        {!notLoggedIn && (
          <div className="px-4 py-4" style={{ borderTop: '1px solid var(--border-subtle)', background: '#fff' }}>
            <div className="flex items-end gap-3">
              <textarea
                value={body}
                onChange={e => setBody(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Escribe un mensaje..."
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
              <button
                onClick={handleSend}
                disabled={!body.trim() || sending}
                className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 transition-all disabled:opacity-40"
                style={{ background: 'var(--brand)', color: '#fff', boxShadow: body.trim() ? '0 2px 8px rgba(53,196,147,0.3)' : 'none' }}>
                {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
              </button>
            </div>
            <p className="text-xs text-center mt-2" style={{ color: 'var(--text-muted)' }}>
              {sendError
              ? <span className="text-red-500">{sendError}</span>
              : 'Enter para enviar · Shift+Enter para nueva línea'
            }
            </p>
          </div>
        )}
      </div>
    </>
  )
}
