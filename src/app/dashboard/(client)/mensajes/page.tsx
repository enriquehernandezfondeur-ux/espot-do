'use client'

import { useState, useEffect, useRef } from 'react'
import { Loader2, MessageCircle, Send, Search, ArrowLeft } from 'lucide-react'
import { getMyConversations, getConversation, sendMessage, markMessagesRead } from '@/lib/actions/messages'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { cn } from '@/lib/utils'

export default function ClientMensajesPage() {
  const [convs, setConvs]           = useState<any[]>([])
  const [loading, setLoading]       = useState(true)
  const [active, setActive]         = useState<any | null>(null)
  const [messages, setMessages]     = useState<any[]>([])
  const [userId, setUserId]         = useState<string | null>(null)
  const [hostId, setHostId]         = useState<string | null>(null)
  const [body, setBody]             = useState('')
  const [sending, setSending]       = useState(false)
  const [search, setSearch]         = useState('')
  const bottomRef    = useRef<HTMLDivElement>(null)
  const channelRef   = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null)
  const supabase     = createClient()

  // Cleanup subscription on unmount
  useEffect(() => () => { channelRef.current?.unsubscribe() }, [])

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      setUserId(user?.id ?? null)
      const data = await getMyConversations()
      setConvs(data)
      setLoading(false)
    }
    init()
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function openConv(conv: any) {
    setActive(conv)
    const data = await getConversation(conv.spaceId)
    setMessages(data?.messages ?? [])
    const space = data?.space as any
    setHostId(space?.host_id ?? null)
    markMessagesRead(conv.spaceId)
    setConvs(prev => prev.map(c => c.spaceId === conv.spaceId ? { ...c, unread: false } : c))

    // Realtime — unsubscribe previous channel first
    channelRef.current?.unsubscribe()
    channelRef.current = supabase.channel(`msg-client-${conv.spaceId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `space_id=eq.${conv.spaceId}` },
        payload => {
          setMessages(prev => prev.find(m => m.id === payload.new.id) ? prev : [...prev, payload.new])
        })
    channelRef.current.subscribe()
  }

  async function handleSend() {
    if (!body.trim() || sending || !active || !hostId) return
    setSending(true)
    await sendMessage(active.spaceId, hostId, body)
    setBody('')
    setSending(false)
  }

  const filtered = convs.filter(c => c.spaceName.toLowerCase().includes(search.toLowerCase()))

  function timeLabel(d: string) {
    const date = new Date(d)
    const now = new Date()
    if (date.toDateString() === now.toDateString()) return date.toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit' })
    return date.toLocaleDateString('es-DO', { day: 'numeric', month: 'short' })
  }

  if (loading) return <div className="flex items-center justify-center h-screen"><Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--brand)' }} /></div>

  return (
    <div className="flex flex-col md:flex-row md:h-screen" style={{ background: 'var(--bg-base)', minHeight: '100dvh' }}>

      {/* Conversation list */}
      <div className={`w-full md:w-72 md:flex-col md:shrink-0 flex flex-col ${active ? 'hidden md:flex' : 'flex'}`}
        style={{ background: '#fff', borderRight: '1px solid var(--border-subtle)', maxHeight: '100dvh' }}>
        <div className="px-5 pt-6 pb-4">
          <h1 className="text-lg font-bold mb-3" style={{ color: 'var(--text-primary)' }}>Mensajes</h1>
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
            <Search size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Buscar conversación..."
              className="bg-transparent text-sm flex-1 focus:outline-none" style={{ color: 'var(--text-primary)' }} />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center px-5">
              <MessageCircle size={28} className="mb-3" style={{ color: 'var(--text-muted)' }} />
              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Sin conversaciones</p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                Visita un espacio y envía un mensaje al propietario
              </p>
              <Link href="/buscar" className="btn-brand mt-4 text-xs font-semibold px-4 py-2 rounded-xl">
                Explorar espacios
              </Link>
            </div>
          ) : (
            filtered.map(conv => (
              <button key={conv.spaceId} onClick={() => openConv(conv)}
                className={cn('w-full text-left px-5 py-4 transition-colors', active?.spaceId === conv.spaceId ? 'bg-[var(--brand-dim)]' : 'hover:bg-[var(--bg-elevated)]')}
                style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl overflow-hidden shrink-0" style={{ background: 'var(--bg-elevated)' }}>
                    {conv.cover
                      ? <img src={conv.cover} alt="" className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center text-lg">🏛️</div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-sm truncate" style={{ color: 'var(--text-primary)' }}>{conv.spaceName}</span>
                      <span className="text-xs shrink-0" style={{ color: 'var(--text-muted)' }}>{timeLabel(conv.lastAt)}</span>
                    </div>
                    <div className="flex items-center gap-1 mt-0.5">
                      <p className="text-xs truncate flex-1" style={{ color: 'var(--text-secondary)' }}>{conv.lastMessage}</p>
                      {conv.unread && <span className="w-2 h-2 rounded-full shrink-0" style={{ background: 'var(--brand)' }} />}
                    </div>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Chat area */}
      {active ? (
        <div className="flex-1 flex flex-col min-h-0">
          {/* Header */}
          <div className="flex items-center gap-3 px-4 md:px-5 py-3.5 md:py-4 shrink-0"
            style={{ background: '#fff', borderBottom: '1px solid var(--border-subtle)' }}>
            {/* Botón volver — solo móvil */}
            <button onClick={() => setActive(null)}
              className="md:hidden w-8 h-8 flex items-center justify-center rounded-xl shrink-0 text-lg"
              style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>
              ←
            </button>
            <div className="w-9 h-9 rounded-xl overflow-hidden shrink-0" style={{ background: 'var(--bg-elevated)' }}>
              {active.cover ? <img src={active.cover} alt="" className="w-full h-full object-cover" /> : <div className="text-center text-xl leading-9">🏛️</div>}
            </div>
            <div>
              <div className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{active.spaceName}</div>
              <Link href={`/espacios/${active.spaceSlug}`} className="text-xs" style={{ color: 'var(--brand)' }}>
                Ver espacio →
              </Link>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-3" style={{ background: '#FAFBFC' }}>
            {messages.map((msg, i) => {
              const isMe = msg.sender_id === userId
              return (
                <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                  <div className={cn('max-w-[70%] px-4 py-3 rounded-2xl text-sm leading-relaxed', isMe ? 'rounded-br-sm' : 'rounded-bl-sm')}
                    style={isMe
                      ? { background: 'var(--brand)', color: '#fff' }
                      : { background: '#fff', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)' }}>
                    {msg.body}
                    <div className={`text-xs mt-1 ${isMe ? 'text-white/60 text-right' : ''}`}
                      style={!isMe ? { color: 'var(--text-muted)' } : {}}>
                      {timeLabel(msg.created_at)}
                    </div>
                  </div>
                </div>
              )
            })}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="px-5 py-4 shrink-0" style={{ background: '#fff', borderTop: '1px solid var(--border-subtle)' }}>
            <div className="flex items-end gap-3">
              <textarea value={body} onChange={e => setBody(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
                placeholder="Escribe un mensaje..." rows={1}
                className="flex-1 resize-none text-sm px-4 py-3 rounded-2xl focus:outline-none"
                style={{ background: 'var(--bg-base)', border: '1.5px solid var(--border-medium)', color: 'var(--text-primary)', maxHeight: 120 }} />
              <button onClick={handleSend} disabled={!body.trim() || sending}
                className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 disabled:opacity-40 transition-all"
                style={{ background: 'var(--brand)', color: '#fff' }}>
                {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-center" style={{ background: '#FAFBFC' }}>
          <div className="w-16 h-16 rounded-3xl flex items-center justify-center mb-4"
            style={{ background: 'var(--brand-dim)' }}>
            <MessageCircle size={28} style={{ color: 'var(--brand)' }} />
          </div>
          <p className="font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Selecciona una conversación</p>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            O visita un espacio para chatear con el propietario
          </p>
        </div>
      )}
    </div>
  )
}
