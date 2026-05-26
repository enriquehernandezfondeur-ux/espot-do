'use client'

import { useState, useEffect } from 'react'
import { getPipelineEvents, updatePipelineStage } from '@/lib/actions/external-events'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { ExternalEvent, PipelineStage } from '@/types'
import { KanbanSquare, Plus, Loader2, X, CalendarDays, ArrowRight } from 'lucide-react'
import Link from 'next/link'

const STAGES: { id: PipelineStage; label: string; color: string; bg: string; desc: string }[] = [
  { id: 'pendiente',  label: 'Nuevos leads',  color: '#6B7280', bg: '#F9FAFB',          desc: 'Consultas sin respuesta' },
  { id: 'cotizacion', label: 'Cotización',    color: '#2563EB', bg: 'rgba(37,99,235,0.06)', desc: 'Precio enviado' },
  { id: 'negociando', label: 'Negociando',    color: '#D97706', bg: 'rgba(217,119,6,0.06)', desc: 'En conversación' },
  { id: 'cerrado',    label: 'Cerrado ✓',     color: '#16A34A', bg: 'rgba(22,163,74,0.06)', desc: 'Deal ganado' },
  { id: 'perdido',    label: 'Perdido',       color: '#9CA3AF', bg: 'rgba(156,163,175,0.06)', desc: 'Deal perdido' },
]

export default function PipelinePage() {
  const [leads,    setLeads]    = useState<ExternalEvent[]>([])
  const [loading,  setLoading]  = useState(true)
  const [moving,   setMoving]   = useState<string | null>(null)
  const [selected, setSelected] = useState<ExternalEvent | null>(null)

  useEffect(() => {
    getPipelineEvents().then(d => { setLeads(d); setLoading(false) })
  }, [])

  async function handleMove(eventId: string, toStage: PipelineStage) {
    setMoving(eventId)
    const r = await updatePipelineStage(eventId, toStage)
    if (!('error' in r)) {
      if (toStage === 'cerrado' || toStage === 'perdido') {
        // Remove from pipeline (moved to eventos)
        setLeads(prev => prev.filter(l => l.id !== eventId))
        if (selected?.id === eventId) setSelected(null)
      } else {
        setLeads(prev => prev.map(l => l.id === eventId ? { ...l, pipeline_stage: toStage } : l))
        if (selected?.id === eventId) setSelected(s => s ? { ...s, pipeline_stage: toStage } : s)
      }
    }
    setMoving(null)
  }

  const byStage = (stage: PipelineStage) => leads.filter(l => (l.pipeline_stage ?? 'pendiente') === stage)
  const totalValue = leads.reduce((s, l) => s + (l.total_amount ?? 0), 0)

  return (
    <div className="p-4 md:p-6 max-w-full mx-auto">
      <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            <KanbanSquare size={22} style={{ color: 'var(--brand)' }} />
            Pipeline de ventas
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            {leads.length} leads activos · {formatCurrency(totalValue)} en pipeline
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/host/eventos/nuevo"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white"
            style={{ background: 'var(--brand)' }}>
            <Plus size={15} /> Nuevo lead
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--brand)' }} />
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4 items-start">
          {STAGES.map(stage => {
            const cards = byStage(stage.id)
            const stageValue = cards.reduce((s, l) => s + (l.total_amount ?? 0), 0)
            return (
              <div key={stage.id} className="flex-shrink-0 w-72 rounded-2xl overflow-hidden"
                style={{ background: stage.bg, border: `1.5px solid ${stage.color}25` }}>
                {/* Column header */}
                <div className="px-4 py-3 flex items-center justify-between"
                  style={{ borderBottom: `1.5px solid ${stage.color}20` }}>
                  <div>
                    <div className="font-bold text-sm" style={{ color: stage.color }}>{stage.label}</div>
                    <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{stage.desc}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-xs" style={{ color: stage.color }}>{cards.length}</div>
                    {stageValue > 0 && (
                      <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{formatCurrency(stageValue)}</div>
                    )}
                  </div>
                </div>

                {/* Cards */}
                <div className="p-3 flex flex-col gap-2 min-h-[80px]">
                  {cards.length === 0 ? (
                    <div className="text-center py-6 text-xs" style={{ color: 'var(--text-muted)' }}>
                      Sin leads
                    </div>
                  ) : cards.map(lead => (
                    <LeadCard
                      key={lead.id}
                      lead={lead}
                      stages={STAGES}
                      moving={moving === lead.id}
                      selected={selected?.id === lead.id}
                      onSelect={() => setSelected(selected?.id === lead.id ? null : lead)}
                      onMove={handleMove}
                    />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Side panel for selected lead */}
      {selected && (
        <LeadDetailPanel
          lead={selected}
          stages={STAGES}
          moving={moving === selected.id}
          onClose={() => setSelected(null)}
          onMove={handleMove}
        />
      )}
    </div>
  )
}

function LeadCard({ lead, stages, moving, selected, onSelect, onMove }: {
  lead: ExternalEvent
  stages: typeof STAGES
  moving: boolean
  selected: boolean
  onSelect: () => void
  onMove: (id: string, stage: PipelineStage) => void
}) {
  const clientName = lead.client?.full_name ?? (lead as any).client_name ?? '—'
  const currentIdx = stages.findIndex(s => s.id === (lead.pipeline_stage ?? 'pendiente'))
  const nextStage = stages[currentIdx + 1]

  return (
    <div
      onClick={onSelect}
      className="rounded-xl p-3 cursor-pointer transition-all"
      style={{
        background: selected ? '#fff' : 'rgba(255,255,255,0.7)',
        border: selected ? '1.5px solid var(--brand)' : '1px solid rgba(0,0,0,0.06)',
        boxShadow: selected ? '0 2px 12px rgba(53,196,147,0.12)' : '0 1px 3px rgba(0,0,0,0.04)',
        opacity: moving ? 0.5 : 1,
      }}>
      <div className="font-semibold text-sm truncate mb-1" style={{ color: 'var(--text-primary)' }}>
        {lead.title}
      </div>
      <div className="text-xs truncate mb-2" style={{ color: 'var(--text-secondary)' }}>
        {clientName}
      </div>
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {lead.event_date && (
            <span className="flex items-center gap-0.5 text-[11px]" style={{ color: 'var(--text-muted)' }}>
              <CalendarDays size={9} /> {formatDate(lead.event_date, { day: 'numeric', month: 'short' })}
            </span>
          )}
          {lead.total_amount ? (
            <span className="flex items-center gap-0.5 text-[11px] font-semibold" style={{ color: 'var(--brand)' }}>
              {formatCurrency(lead.total_amount)}
            </span>
          ) : null}
        </div>
        {nextStage && nextStage.id !== 'cerrado' && nextStage.id !== 'perdido' && (
          <button
            onClick={e => { e.stopPropagation(); onMove(lead.id, nextStage.id) }}
            disabled={moving}
            className="flex items-center gap-0.5 text-[11px] font-semibold px-2 py-1 rounded-lg transition-all"
            style={{ color: nextStage.color, background: `${nextStage.color}15` }}>
            <ArrowRight size={9} /> {nextStage.label.split(' ')[0]}
          </button>
        )}
      </div>
    </div>
  )
}

function LeadDetailPanel({ lead, stages, moving, onClose, onMove }: {
  lead: ExternalEvent
  stages: typeof STAGES
  moving: boolean
  onClose: () => void
  onMove: (id: string, stage: PipelineStage) => void
}) {
  const clientName = lead.client?.full_name ?? (lead as any).client_name ?? '—'
  const currentStage = stages.find(s => s.id === (lead.pipeline_stage ?? 'pendiente'))

  return (
    <div className="fixed inset-0 z-40 flex items-end md:items-center justify-center p-4 md:p-0"
      style={{ background: 'rgba(0,0,0,0.3)' }}
      onClick={onClose}>
      <div className="w-full max-w-md rounded-3xl overflow-hidden"
        style={{ background: '#fff', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}
        onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4 flex items-center justify-between"
          style={{ borderBottom: '1px solid #F0F2F5' }}>
          <div>
            <div className="font-bold text-sm" style={{ color: '#0F1623' }}>{lead.title}</div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                style={{ background: `${currentStage?.color}15`, color: currentStage?.color }}>
                {currentStage?.label}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-gray-400">
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="rounded-xl p-4 space-y-2" style={{ background: '#F8FAFB', border: '1px solid #E8ECF0' }}>
            {[
              { label: 'Cliente',      value: clientName },
              { label: 'Email',        value: lead.client?.email ?? '—' },
              { label: 'Teléfono',     value: lead.client?.phone ?? '—' },
              { label: 'Fecha evento', value: formatDate(lead.event_date) },
              { label: 'Tipo',         value: lead.event_type ?? '—' },
              { label: 'Personas',     value: lead.guest_count ? `${lead.guest_count}` : '—' },
              { label: 'Valor est.',   value: lead.total_amount ? formatCurrency(lead.total_amount) : '—' },
            ].filter(r => r.value !== '—').map(({ label, value }) => (
              <div key={label} className="flex justify-between text-sm">
                <span className="text-gray-500">{label}</span>
                <span className="font-medium" style={{ color: '#0F1623' }}>{value}</span>
              </div>
            ))}
          </div>

          {lead.notes && (
            <div className="rounded-xl p-3 text-xs text-gray-500" style={{ background: '#F8FAFB', border: '1px solid #E8ECF0' }}>
              {lead.notes}
            </div>
          )}

          <div>
            <div className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">Mover a etapa</div>
            <div className="grid grid-cols-2 gap-2">
              {stages.map(stage => (
                <button
                  key={stage.id}
                  onClick={() => onMove(lead.id, stage.id)}
                  disabled={moving || (lead.pipeline_stage ?? 'pendiente') === stage.id}
                  className="text-xs font-semibold px-3 py-2.5 rounded-xl transition-all disabled:opacity-40"
                  style={(lead.pipeline_stage ?? 'pendiente') === stage.id
                    ? { background: stage.bg, color: stage.color, border: `1.5px solid ${stage.color}40` }
                    : { background: '#F4F6F8', color: '#6B7280', border: '1px solid #E8ECF0' }}>
                  {moving ? <Loader2 size={12} className="animate-spin mx-auto" /> : stage.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <Link href={`/dashboard/host/eventos/${lead.id}/editar`}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-center transition-all"
              style={{ background: '#F4F6F8', color: '#374151', border: '1px solid #E8ECF0' }}>
              Editar lead
            </Link>
            <Link href={`/dashboard/host/mensajes`}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-center text-white"
              style={{ background: 'var(--brand)' }}>
              Mensajear
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
