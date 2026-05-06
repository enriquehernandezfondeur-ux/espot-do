'use client'

import { useState, useEffect, useTransition } from 'react'
import { getAdminPayouts, markPayoutPaid, getHostBankAccount } from '@/lib/actions/admin'
import { formatCurrency, formatDate } from '@/lib/utils'
import {
  Banknote, CheckCircle, Clock, Building2, User,
  CalendarDays, Copy, Check, Loader2, Filter,
  FileText, AlertCircle, StickyNote,
} from 'lucide-react'

type FilterType = 'pending' | 'paid' | 'all'

const STATUS_COLORS: Record<string, { label: string; color: string; bg: string }> = {
  pendiente:    { label: 'Pendiente',   color: '#D97706', bg: 'rgba(217,119,6,0.08)'  },
  en_revision:  { label: 'En revisión', color: '#2563EB', bg: 'rgba(37,99,235,0.08)'  },
  liquidado:    { label: 'Liquidado',   color: '#16A34A', bg: 'rgba(22,163,74,0.08)'  },
  retenido:     { label: 'Retenido',    color: '#DC2626', bg: 'rgba(220,38,38,0.08)'  },
  reembolsado:  { label: 'Reembolsado', color: '#6B7280', bg: 'rgba(107,114,128,0.08)'},
}

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500) }}
      className="ml-1 opacity-50 hover:opacity-100 transition-opacity" title="Copiar">
      {copied ? <Check size={11} style={{ color: '#35C493' }} /> : <Copy size={11} />}
    </button>
  )
}

function BankInfo({ hostId }: { hostId?: string }) {
  const [bank, setBank]     = useState<any>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!hostId || loaded) return
    getHostBankAccount(hostId).then(d => { setBank(d); setLoaded(true) })
  }, [hostId, loaded])

  if (!hostId)  return <span className="text-xs" style={{ color: '#94A3B8' }}>—</span>
  if (!loaded)  return <span className="text-xs" style={{ color: '#94A3B8' }}>Cargando...</span>
  if (!bank)    return (
    <span className="flex items-center gap-1 text-xs" style={{ color: '#DC2626' }}>
      <AlertCircle size={11} /> Sin cuenta registrada
    </span>
  )

  return (
    <div>
      <div className="text-xs font-semibold" style={{ color: '#0F1623' }}>
        {bank.bank_name}
        <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full"
          style={{ background: 'rgba(53,196,147,0.1)', color: '#35C493' }}>
          {bank.account_type} · {bank.currency}
        </span>
      </div>
      <div className="flex items-center gap-0.5 text-xs mt-0.5" style={{ color: '#6B7280' }}>
        ···· {bank.account_number?.slice(-4) ?? '????'}
        <CopyBtn text={bank.account_number ?? ''} />
        <span className="mx-1 text-slate-200">·</span>
        <span className="truncate max-w-[120px]">{bank.account_holder}</span>
        <span className="mx-1 text-slate-200">·</span>
        {bank.cedula_or_rnc}
      </div>
    </div>
  )
}

export default function AdminLiquidacionesPage() {
  const [filter, setFilter]     = useState<FilterType>('pending')
  const [payouts, setPayouts]   = useState<any[]>([])
  const [loading, setLoading]   = useState(true)
  const [paying,  setPaying]    = useState<string | null>(null)
  const [notes,   setNotes]     = useState<Record<string, string>>({})
  const [showNote, setShowNote] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  async function load() {
    setLoading(true)
    const data = await getAdminPayouts(filter)
    setPayouts(data)
    setLoading(false)
  }

  useEffect(() => { load() }, [filter])

  async function handlePay(bookingId: string) {
    setPaying(bookingId)
    startTransition(async () => {
      await markPayoutPaid(bookingId)
      await load()
      setPaying(null)
    })
  }

  const totalPending = payouts.filter(b => b.payout_status !== 'paid').reduce((s, b) => s + (Number(b.total_amount) - Number(b.platform_fee)), 0)
  const totalPaid    = payouts.filter(b => b.payout_status === 'paid').reduce((s, b) => s + (Number(b.total_amount) - Number(b.platform_fee)), 0)

  return (
    <div className="p-8 max-w-7xl mx-auto">

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Banknote size={15} style={{ color: '#35C493' }} />
            <span className="text-xs font-bold uppercase tracking-widest" style={{ color: '#35C493' }}>Finanzas</span>
          </div>
          <h1 className="text-2xl font-bold" style={{ color: '#0F1623', letterSpacing: '-0.02em' }}>
            Liquidaciones a propietarios
          </h1>
          <p className="text-sm mt-0.5" style={{ color: '#94A3B8' }}>
            Gestiona los pagos pendientes a propietarios de espacios
          </p>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="rounded-2xl p-5"
          style={{ background: 'linear-gradient(135deg, #0A1019, #0F2A22)', boxShadow: '0 4px 20px rgba(0,0,0,0.12)' }}>
          <div className="flex items-center gap-2 mb-3">
            <Clock size={13} style={{ color: '#F59E0B' }} />
            <span className="text-xs font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.35)' }}>Pendiente de pagar</span>
          </div>
          <div className="text-3xl font-bold text-white" style={{ letterSpacing: '-0.03em' }}>{formatCurrency(totalPending)}</div>
          <div className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.3)' }}>{payouts.filter(b => b.payout_status !== 'paid').length} reservas</div>
        </div>
        <div className="rounded-2xl p-5" style={{ background: '#fff', border: '1px solid #E8ECF0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle size={13} style={{ color: '#16A34A' }} />
            <span className="text-xs font-bold uppercase tracking-widest" style={{ color: '#94A3B8' }}>Ya liquidado</span>
          </div>
          <div className="text-3xl font-bold" style={{ color: '#0F1623', letterSpacing: '-0.03em' }}>{formatCurrency(totalPaid)}</div>
          <div className="text-xs mt-1" style={{ color: '#94A3B8' }}>{payouts.filter(b => b.payout_status === 'paid').length} transferencias</div>
        </div>
        <div className="rounded-2xl p-5" style={{ background: '#fff', border: '1px solid #E8ECF0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
          <div className="flex items-center gap-2 mb-3">
            <Banknote size={13} style={{ color: '#35C493' }} />
            <span className="text-xs font-bold uppercase tracking-widest" style={{ color: '#94A3B8' }}>Total gestionado</span>
          </div>
          <div className="text-3xl font-bold" style={{ color: '#0F1623', letterSpacing: '-0.03em' }}>{formatCurrency(totalPending + totalPaid)}</div>
          <div className="text-xs mt-1" style={{ color: '#94A3B8' }}>{payouts.length} reservas en total</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 mb-6">
        <Filter size={14} style={{ color: '#94A3B8' }} />
        {([
          { value: 'pending', label: 'Pendientes' },
          { value: 'paid',    label: 'Pagados' },
          { value: 'all',     label: 'Todos' },
        ] as { value: FilterType; label: string }[]).map(({ value, label }) => (
          <button key={value} onClick={() => setFilter(value)}
            className="px-4 py-2 rounded-xl text-sm font-semibold transition-all"
            style={filter === value
              ? { background: '#0F1623', color: '#fff' }
              : { background: '#fff', color: '#6B7280', border: '1px solid #E8ECF0' }}>
            {label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-2xl overflow-hidden" style={{ background: '#fff', border: '1px solid #E8ECF0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
        <div className="grid gap-3 px-6 py-3 text-[11px] font-bold uppercase tracking-widest"
          style={{ gridTemplateColumns: '2fr 1.4fr 0.8fr 0.9fr 2fr 1fr', background: '#FAFBFC', borderBottom: '1px solid #F0F2F5', color: '#94A3B8' }}>
          <span>Espacio · Propietario</span>
          <span>Evento</span>
          <span>Total</span>
          <span>A pagar</span>
          <span>Cuenta bancaria</span>
          <span>Acción</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={24} className="animate-spin" style={{ color: '#35C493' }} />
          </div>
        ) : payouts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <CheckCircle size={28} className="mb-3" style={{ color: '#CBD5E1' }} />
            <p className="font-semibold text-sm" style={{ color: '#374151' }}>
              {filter === 'pending' ? '¡Todo al día! Sin pagos pendientes.' : 'Sin registros.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#F8FAFC]">
            {payouts.map((bk: any) => {
              const space   = bk.spaces as any
              const host    = space?.profiles as any
              const hostAmt = Number(bk.total_amount) - Number(bk.platform_fee)
              const isPaid  = bk.payout_status === 'paid'

              return (
                <div key={bk.id}>
                  <div className="grid gap-3 px-6 py-4 items-center hover:bg-slate-50 transition-colors"
                    style={{ gridTemplateColumns: '2fr 1.4fr 0.8fr 0.9fr 2fr 1fr' }}>

                    {/* Space + host */}
                    <div>
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <Building2 size={11} style={{ color: '#94A3B8' }} />
                        <span className="text-sm font-semibold" style={{ color: '#0F1623' }}>{space?.name ?? '—'}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <User size={10} style={{ color: '#94A3B8' }} />
                        <span className="text-xs" style={{ color: '#6B7280' }}>{host?.full_name ?? '—'}</span>
                        {host?.email && <span className="text-xs" style={{ color: '#94A3B8' }}>· {host.email}</span>}
                      </div>
                    </div>

                    {/* Event */}
                    <div>
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <CalendarDays size={11} style={{ color: '#94A3B8' }} />
                        <span className="text-sm" style={{ color: '#374151' }}>{formatDate(bk.event_date)}</span>
                      </div>
                      <div className="text-xs" style={{ color: '#94A3B8' }}>{bk.event_type}</div>
                    </div>

                    {/* Total */}
                    <div>
                      <div className="text-sm font-bold" style={{ color: '#0F1623' }}>{formatCurrency(Number(bk.total_amount))}</div>
                      <div className="text-xs" style={{ color: '#94A3B8' }}>Fee: {formatCurrency(Number(bk.platform_fee))}</div>
                    </div>

                    {/* Net */}
                    <div className="text-base font-bold" style={{ color: '#35C493' }}>{formatCurrency(hostAmt)}</div>

                    {/* Bank */}
                    <BankInfo hostId={host?.id} />

                    {/* Action */}
                    <div className="flex flex-col gap-1.5">
                      {isPaid ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-full w-fit"
                          style={{ background: 'rgba(22,163,74,0.08)', color: '#16A34A' }}>
                          <CheckCircle size={11} /> Pagado
                        </span>
                      ) : (
                        <button onClick={() => handlePay(bk.id)} disabled={paying === bk.id}
                          className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl transition-all disabled:opacity-50 w-fit"
                          style={{ background: '#0F1623', color: '#fff' }}>
                          {paying === bk.id ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle size={12} />}
                          Marcar pagado
                        </button>
                      )}
                      <button onClick={() => setShowNote(showNote === bk.id ? null : bk.id)}
                        className="flex items-center gap-1 text-xs w-fit transition-all"
                        style={{ color: '#94A3B8' }}>
                        <StickyNote size={11} /> Nota
                      </button>
                    </div>
                  </div>

                  {/* Note panel */}
                  {showNote === bk.id && (
                    <div className="px-6 pb-4 flex items-center gap-3" style={{ background: '#FAFBFC', borderTop: '1px solid #F0F2F5' }}>
                      <FileText size={13} style={{ color: '#94A3B8', flexShrink: 0 }} />
                      <input
                        value={notes[bk.id] ?? ''}
                        onChange={e => setNotes(p => ({ ...p, [bk.id]: e.target.value }))}
                        placeholder="Agregar nota interna (referencia de transferencia, observaciones...)"
                        className="flex-1 text-sm bg-transparent focus:outline-none"
                        style={{ color: '#374151' }}
                      />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
