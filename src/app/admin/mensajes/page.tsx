'use client'

import { useState, useEffect, useRef } from 'react'
import { Loader2, MessageCircle, Search, ArrowLeft, FileText, Download, Image as ImageIcon, Building2 } from 'lucide-react'
import { getAdminConversations, getAdminConversationMessages } from '@/lib/actions/admin'

function timeLabel(d: string) {
  const date = new Date(d)
  const now  = new Date()
  if (date.toDateString() === now.toDateString())
    return date.toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit' })
  return date.toLocaleDateString('es-DO', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function AdminMensajesPage() {
  const [convs,    setConvs]    = useState<any[]>([])
  const [loading,  setLoading]  = useState(true)
  const [search,   setSearch]   = useState('')
  const [active,   setActive]   = useState<any | null>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [msgLoad,  setMsgLoad]  = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    getAdminConversations()
      .then(setConvs)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function openConv(conv: any) {
    setActive(conv)
    setMsgLoad(true)
    const data = await getAdminConversationMessages(conv.spaceId, conv.user1, conv.user2).catch(() => [])
    setMessages(data)
    setMsgLoad(false)
  }

  const filtered = convs.filter(c => {
    const q = search.toLowerCase()
    return (
      c.space?.name?.toLowerCase().includes(q) ||
      c.participants?.some((p: any) => p?.full_name?.toLowerCase().includes(q) || p?.email?.toLowerCase().includes(q))
    )
  })

  const cover = (space: any) =>
    space?.space_images?.find((i: any) => i.is_cover)?.url ?? space?.space_images?.[0]?.url

  if (loading) return (
    <div className="flex items-center justify-center h-dvh" style={{ background: '#F4F6F8' }}>
      <Loader2 size={28} className="animate-spin" style={{ color: '#35C493' }} />
    </div>
  )

  return (
    <div className="flex h-dvh overflow-hidden" style={{ background: '#F4F6F8' }}>

      {/* ── Lista de conversaciones ── */}
      <div className={`${active ? 'hidden md:flex' : 'flex'} flex-col w-full md:w-80 shrink-0`}
        style={{ background: '#fff', borderRight: '1px solid #E2E8F0' }}>

        {/* Header */}
        <div className="px-5 pt-5 pb-4 border-b" style={{ borderColor: '#E2E8F0' }}>
          <h1 className="text-lg font-bold mb-3" style={{ color: '#0F1623' }}>
            Mensajes
          </h1>
          <p className="text-xs mb-3" style={{ color: '#94A3B8' }}>
            {convs.length} conversación{convs.length !== 1 ? 'es' : ''} en total
          </p>
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
            style={{ background: '#F8FAFC', border: '1.5px solid #E2E8F0' }}>
            <Search size={14} style={{ color: '#94A3B8', flexShrink: 0 }} />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por espacio o usuario..."
              className="bg-transparent text-sm flex-1 focus:outline-none"
              style={{ color: '#0F1623', fontSize: 16 }} />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-5 text-center">
              <MessageCircle size={28} className="mb-3" style={{ color: '#CBD5E1' }} />
              <p className="text-sm font-medium" style={{ color: '#64748B' }}>Sin conversaciones</p>
            </div>
          ) : filtered.map(conv => {
            const spaceCover = cover(conv.space)
            const isActive   = active?.key === conv.key
            const p1 = conv.participants[0]
            const p2 = conv.participants[1]
            return (
              <button key={conv.key} onClick={() => openConv(conv)}
                className="w-full text-left px-4 py-3.5 transition-colors"
                style={{
                  background: isActive ? 'rgba(53,196,147,0.06)' : 'transparent',
                  borderBottom: '1px solid #F1F5F9',
                  borderLeft: isActive ? '3px solid #35C493' : '3px solid transparent',
                }}>
                <div className="flex items-center gap-3">
                  {/* Space cover */}
                  <div className="w-11 h-11 rounded-xl overflow-hidden shrink-0" style={{ background: '#F1F5F9' }}>
                    {spaceCover
                      ? <img src={spaceCover} alt="" className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center"><Building2 size={16} style={{ color: '#CBD5E1' }} /></div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm truncate" style={{ color: '#0F1623' }}>
                      {conv.space?.name ?? '—'}
                    </div>
                    <div className="text-xs truncate" style={{ color: '#64748B' }}>
                      {p1?.full_name ?? '?'} ↔ {p2?.full_name ?? '?'}
                    </div>
                    <div className="text-xs truncate mt-0.5" style={{ color: '#94A3B8' }}>
                      {conv.lastMessage
                        ? conv.lastMessage.length > 40
                          ? conv.lastMessage.slice(0, 40) + '...'
                          : conv.lastMessage
                        : conv.lastType === 'image' ? 'Imagen adjunta' : 'Archivo adjunto'}
                    </div>
                  </div>
                  <div className="text-[10px] shrink-0" style={{ color: '#94A3B8' }}>
                    {timeLabel(conv.lastAt)}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Panel de mensajes ── */}
      {active ? (
        <div className="flex-1 flex flex-col min-h-0">
          {/* Header */}
          <div className="flex items-center gap-3 px-5 py-3.5 shrink-0"
            style={{ background: '#fff', borderBottom: '1px solid #E2E8F0' }}>
            <button onClick={() => setActive(null)}
              className="md:hidden w-8 h-8 flex items-center justify-center rounded-xl shrink-0"
              style={{ background: '#F1F5F9', color: '#64748B' }}>
              <ArrowLeft size={17} />
            </button>
            {cover(active.space) ? (
              <img src={cover(active.space)} alt=""
                className="w-9 h-9 rounded-xl object-cover shrink-0" />
            ) : (
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: '#F1F5F9' }}>
                <Building2 size={14} style={{ color: '#CBD5E1' }} />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm" style={{ color: '#0F1623' }}>
                {active.space?.name ?? '—'}
              </div>
              <div className="text-xs" style={{ color: '#64748B' }}>
                {active.participants[0]?.full_name ?? '?'} · {active.participants[0]?.email ?? ''}
                <span className="mx-1 opacity-40">↔</span>
                {active.participants[1]?.full_name ?? '?'} · {active.participants[1]?.email ?? ''}
              </div>
            </div>
            <div className="text-xs px-2.5 py-1 rounded-full font-semibold"
              style={{ background: 'rgba(53,196,147,0.1)', color: '#0A7A50' }}>
              Solo lectura
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto min-h-0 px-5 py-5 space-y-3"
            style={{ background: '#F8FAFC' }}>
            {msgLoad ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 size={24} className="animate-spin" style={{ color: '#35C493' }} />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <MessageCircle size={28} className="mb-3" style={{ color: '#CBD5E1' }} />
                <p className="text-sm" style={{ color: '#94A3B8' }}>Sin mensajes en esta conversación</p>
              </div>
            ) : messages.map((msg: any) => {
              const sender = (msg.sender as any)
              const isSender1 = msg.sender_id === active.user1
              return (
                <div key={msg.id} className={`flex ${isSender1 ? 'justify-start' : 'justify-end'}`}>
                  <div className="max-w-[75%]">
                    {/* Sender name */}
                    <div className={`text-[10px] font-semibold mb-1 ${isSender1 ? '' : 'text-right'}`}
                      style={{ color: '#94A3B8' }}>
                      {sender?.full_name ?? 'Usuario'} · {timeLabel(msg.created_at)}
                    </div>
                    <div className={`rounded-2xl overflow-hidden ${isSender1 ? 'rounded-tl-sm' : 'rounded-tr-sm'}`}
                      style={isSender1
                        ? { background: '#fff', border: '1px solid #E2E8F0', color: '#0F1623' }
                        : { background: '#0F2A22', color: '#fff' }}>
                      {msg.attachment_url && (
                        <div className={msg.body ? 'p-2 pb-0' : 'p-2'}>
                          {msg.attachment_type === 'image' ? (
                            <img src={msg.attachment_url} alt={msg.attachment_name ?? 'imagen'}
                              className="w-full rounded-xl object-cover max-h-56 cursor-pointer"
                              onClick={() => window.open(msg.attachment_url, '_blank')} />
                          ) : (
                            <a href={msg.attachment_url} target="_blank" rel="noopener noreferrer"
                              download={msg.attachment_name}
                              className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl"
                              style={{ background: isSender1 ? '#F8FAFC' : 'rgba(255,255,255,0.1)', color: 'inherit' }}>
                              <FileText size={16} className="shrink-0" />
                              <span className="text-sm font-medium truncate" style={{ maxWidth: 160 }}>
                                {msg.attachment_name ?? 'Archivo'}
                              </span>
                              <Download size={12} className="shrink-0 opacity-60 ml-auto" />
                            </a>
                          )}
                        </div>
                      )}
                      {msg.body && (
                        <div className="px-4 py-3 text-sm leading-relaxed">{msg.body}</div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
            <div ref={bottomRef} />
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-center"
          style={{ background: '#F8FAFC' }}>
          <div className="w-16 h-16 rounded-3xl flex items-center justify-center mb-4"
            style={{ background: 'rgba(53,196,147,0.08)' }}>
            <MessageCircle size={28} style={{ color: '#35C493' }} />
          </div>
          <p className="font-semibold mb-1" style={{ color: '#0F1623' }}>Selecciona una conversación</p>
          <p className="text-sm" style={{ color: '#64748B' }}>
            Vista de solo lectura — {convs.length} conversación{convs.length !== 1 ? 'es' : ''} registrada{convs.length !== 1 ? 's' : ''}
          </p>
        </div>
      )}
    </div>
  )
}
