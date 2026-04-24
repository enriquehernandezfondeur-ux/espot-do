'use client'

import { useState } from 'react'
import { CalendarDays, Users, MessageSquare, CheckCircle, X, Send, Plus } from 'lucide-react'
import { formatDate, formatCurrency } from '@/lib/utils'
import { cn } from '@/lib/utils'

const quotes = [
  {
    id: '1', guest_name: 'Laura Jiménez', guest_phone: '+1 (809) 555-0101',
    event_type: 'Boda', event_date: '2026-06-14', guest_count: 150,
    message: 'Buscamos un salón para boda íntima con jardín si es posible. Necesitamos que esté disponible desde las 3pm para fotos.',
    status: 'pending', created_at: '2026-04-23',
  },
  {
    id: '2', guest_name: 'Roberto Castillo', guest_phone: '+1 (829) 555-0202',
    event_type: 'Graduación', event_date: '2026-05-25', guest_count: 100,
    message: 'Necesito el espacio para graduación universitaria con DJ. ¿Tienen servicio de catering o solo el espacio?',
    status: 'pending', created_at: '2026-04-22',
  },
  {
    id: '3', guest_name: 'Empresa Seguros RD', guest_phone: '+1 (849) 555-0303',
    event_type: 'Corporativo', event_date: '2026-05-15', guest_count: 80,
    message: 'Buscamos un espacio para reunión corporativa de todo un día con coffee break.',
    status: 'responded', created_at: '2026-04-20',
    host_response: 'Buenos días, con gusto les ofrezco nuestro paquete corporativo: espacio 8 horas, proyector, sonido y 2 coffee breaks incluidos.',
    quoted_price: 85000,
    quote_includes: ['Espacio 8 horas', 'Proyector + pantalla', 'Sonido', '2 Coffee breaks', 'WiFi empresarial'],
  },
]

const statusConfig: Record<string, { label: string; className: string }> = {
  pending:   { label: 'Sin responder', className: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  responded: { label: 'Respondida',    className: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  accepted:  { label: 'Aceptada',      className: 'bg-green-500/10 text-green-400 border-green-500/20' },
  declined:  { label: 'Rechazada',     className: 'bg-red-500/10 text-red-400 border-red-500/20' },
}

export default function CotizacionesPage() {
  const [selected, setSelected] = useState<typeof quotes[0] | null>(quotes[0])
  const [response, setResponse] = useState('')
  const [price, setPrice] = useState('')
  const [includes, setIncludes] = useState<string[]>([])
  const [newInclude, setNewInclude] = useState('')
  const [validUntil, setValidUntil] = useState('')

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Cotizaciones</h1>
        <p className="text-slate-400 mt-1">Responde rápido — los clientes eligen el espacio que primero responde</p>
      </div>

      <div className="flex gap-6 h-[calc(100vh-12rem)]">
        {/* Lista de cotizaciones */}
        <div className="w-80 shrink-0 space-y-2 overflow-y-auto">
          {quotes.map(quote => (
            <button
              key={quote.id}
              onClick={() => setSelected(quote)}
              className={cn(
                'w-full text-left p-4 rounded-xl border transition-all',
                selected?.id === quote.id
                  ? 'bg-[rgba(53,196,147,0.12)] border-[rgba(53,196,147,0.40)]'
                  : 'bg-white/5 border-white/10 hover:border-white/20'
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-white font-medium text-sm">{quote.guest_name}</span>
                <span className={cn('text-xs px-2 py-0.5 rounded-full border', statusConfig[quote.status].className)}>
                  {statusConfig[quote.status].label}
                </span>
              </div>
              <div className="text-amber-400 text-xs font-medium mb-1">{quote.event_type}</div>
              <p className="text-slate-400 text-xs line-clamp-2">{quote.message}</p>
              <div className="flex items-center gap-3 mt-2 text-slate-500 text-xs">
                <span className="flex items-center gap-1"><CalendarDays size={10} /> {formatDate(quote.event_date)}</span>
                <span className="flex items-center gap-1"><Users size={10} /> {quote.guest_count}</span>
              </div>
            </button>
          ))}
        </div>

        {/* Panel de detalle / respuesta */}
        {selected ? (
          <div className="flex-1 bg-white/5 border border-white/10 rounded-2xl overflow-y-auto">
            {/* Header */}
            <div className="p-6 border-b border-white/10">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-white font-bold text-lg">{selected.guest_name}</span>
                    <span className={cn('text-xs px-2.5 py-1 rounded-full border', statusConfig[selected.status].className)}>
                      {statusConfig[selected.status].label}
                    </span>
                  </div>
                  <div className="text-slate-400 text-sm">{selected.guest_phone}</div>
                </div>
                <div className="text-right">
                  <div className="text-amber-400 font-semibold">{selected.event_type}</div>
                  <div className="text-slate-400 text-sm">{formatDate(selected.event_date)} · {selected.guest_count} personas</div>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Mensaje del cliente */}
              <div>
                <div className="flex items-center gap-2 mb-3 text-slate-400 text-sm font-medium">
                  <MessageSquare size={16} /> Solicitud del cliente
                </div>
                <div className="bg-slate-800/50 rounded-xl p-4 text-slate-300 text-sm leading-relaxed border border-white/5">
                  "{selected.message}"
                </div>
              </div>

              {/* Si ya fue respondida */}
              {selected.status === 'responded' && 'host_response' in selected && (
                <div>
                  <div className="text-slate-400 text-sm font-medium mb-3">Tu respuesta enviada</div>
                  <div className="bg-[rgba(53,196,147,0.07)] border border-[rgba(53,196,147,0.20)] rounded-xl p-4">
                    <p className="text-slate-300 text-sm mb-3">{selected.host_response}</p>
                    <div className="border-t border-[rgba(53,196,147,0.20)] pt-3">
                      <div className="text-[#4DD9A7] font-bold text-lg">{formatCurrency(selected.quoted_price!)}</div>
                      <div className="text-slate-400 text-xs mt-1">Incluye:</div>
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {selected.quote_includes?.map(item => (
                          <span key={item} className="bg-[rgba(53,196,147,0.12)] text-[#4DD9A7] text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
                            <CheckCircle size={10} /> {item}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Formulario de respuesta (solo si está pendiente) */}
              {selected.status === 'pending' && (
                <div className="space-y-4">
                  <div className="text-white font-semibold">Envía tu propuesta</div>

                  <div>
                    <label className="block text-slate-300 text-sm font-medium mb-1.5">Tu mensaje</label>
                    <textarea
                      value={response}
                      onChange={e => setResponse(e.target.value)}
                      placeholder="Hola, con gusto te ofrezco una propuesta para tu evento..."
                      rows={4}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-[#35C493] text-sm transition-colors resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-slate-300 text-sm font-medium mb-1.5">Precio propuesto (RD$)</label>
                      <input
                        type="number"
                        value={price}
                        onChange={e => setPrice(e.target.value)}
                        placeholder="85000"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-[#35C493] text-sm transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-300 text-sm font-medium mb-1.5">Válido hasta</label>
                      <input
                        type="date"
                        value={validUntil}
                        onChange={e => setValidUntil(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#35C493] text-sm transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-300 text-sm font-medium mb-2">¿Qué incluye?</label>
                    <div className="flex gap-2 mb-2">
                      <input
                        value={newInclude}
                        onChange={e => setNewInclude(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter' && newInclude.trim()) { setIncludes([...includes, newInclude.trim()]); setNewInclude('') }}}
                        placeholder="Ej: Espacio 5 horas, DJ, catering..."
                        className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-[#35C493] text-sm transition-colors"
                      />
                      <button
                        onClick={() => { if (newInclude.trim()) { setIncludes([...includes, newInclude.trim()]); setNewInclude('') }}}
                        className="bg-white/10 hover:bg-white/15 text-white px-3 rounded-xl transition-colors"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                    {includes.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {includes.map((item, i) => (
                          <span key={i} className="flex items-center gap-1.5 bg-[rgba(53,196,147,0.12)] text-[#4DD9A7] px-3 py-1 rounded-full text-xs">
                            <CheckCircle size={10} /> {item}
                            <button onClick={() => setIncludes(includes.filter((_, j) => j !== i))}><X size={10} /></button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {price && (
                    <div className="bg-[rgba(53,196,147,0.07)] border border-[rgba(53,196,147,0.20)] rounded-xl p-4 text-sm">
                      <div className="text-slate-400 mb-1">El cliente verá:</div>
                      <div className="text-[#4DD9A7] font-bold text-xl">{formatCurrency(Number(price))}</div>
                      <div className="text-slate-500 text-xs mt-1">Comisión Espot: {formatCurrency(Number(price) * 0.10)} · Tú recibes: {formatCurrency(Number(price) * 0.90)}</div>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <button className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-[#35C493] to-[#28A87C] hover:from-violet-500 hover:to-purple-500 text-white font-semibold py-3 rounded-xl transition-all shadow-lg shadow-[rgba(53,196,147,0.20)]">
                      <Send size={16} /> Enviar propuesta
                    </button>
                    <button className="px-4 py-3 bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/20 rounded-xl transition-colors text-sm font-medium">
                      Rechazar
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-500">
            Selecciona una cotización para responder
          </div>
        )}
      </div>
    </div>
  )
}
