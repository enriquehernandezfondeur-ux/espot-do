'use client'

import { useState, useEffect, useTransition } from 'react'
import { getAdminPayouts, markPayoutPaid } from '@/lib/actions/admin'
import { formatCurrency, formatDate } from '@/lib/utils'
import {
  Banknote, CheckCircle, Clock, Building2, User,
  CalendarDays, Copy, Check, Loader2, Filter,
} from 'lucide-react'

type Filter = 'pending' | 'paid' | 'all'

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500) }}
      className="ml-1 opacity-50 hover:opacity-100 transition-opacity"
      title="Copiar">
      {copied ? <Check size={11} style={{ color: '#35C493' }} /> : <Copy size={11} />}
    </button>
  )
}

export default function AdminPayoutsPage() {
  const [filter, setFilter]       = useState<Filter>('pending')
  const [payouts, setPayouts]     = useState<any[]>([])
  const [banks, setBanks]         = useState<Record<string, any>>({})
  const [loading, setLoading]     = useState(true)
  const [paying, setPaying]       = useState<string | null>(null)
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

  const totalPending = payouts
    .filter(b => b.payout_status === 'pending')
    .reduce((s, b) => s + (Number(b.total_amount) - Number(b.platform_fee)), 0)

  const totalPaid = payouts
    .filter(b => b.payout_status === 'paid')
    .reduce((s, b) => s + (Number(b.total_amount) - Number(b.platform_fee)), 0)

  return (
    <div className="p-8 max-w-7xl mx-auto">

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Banknote size={15} style={{ color: '#35C493' }} />
            <span className="text-xs font-bold uppercase tracking-widest" style={{ color: '#35C493' }}>
              Finanzas
            </span>
          </div>
          <h1 className="text-2xl font-bold" style={{ color: '#0F1623', letterSpacing: '-0.02em' }}>
            Payouts a propietarios
          </h1>
          <p className="text-sm mt-0.5" style={{ color: '#94A3B8' }}>
            Gestiona los pagos pendientes a los propietarios de espacios
          </p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="rounded-2xl p-5"
          style={{ background: 'linear-gradient(135deg, #0A1019, #0F2A22)', boxShadow: '0 4px 20px rgba(0,0,0,0.12)' }}>
          <div className="flex items-center gap-2 mb-3">
            <Clock size={14} style={{ color: '#F59E0B' }} />
            <span className="text-xs font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.35)' }}>
              Pendiente de pagar
            </span>
          </div>
          <div className="text-3xl font-bold text-white" style={{ letterSpacing: '-0.03em' }}>
            {formatCurrency(filter === 'all' ? totalPending : (filter === 'pending' ? totalPending : 0))}
          </div>
          <div className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.3)' }}>
            {payouts.filter(b => b.payout_status === 'pending').length} reservas
          </div>
        </div>

        <div className="rounded-2xl p-5"
          style={{ background: '#fff', border: '1px solid #E8ECF0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle size={14} style={{ color: '#16A34A' }} />
            <span className="text-xs font-bold uppercase tracking-widest" style={{ color: '#94A3B8' }}>
              Ya pagado
            </span>
          </div>
          <div className="text-3xl font-bold" style={{ color: '#0F1623', letterSpacing: '-0.03em' }}>
            {formatCurrency(totalPaid)}
          </div>
          <div className="text-xs mt-1" style={{ color: '#94A3B8' }}>
            {payouts.filter(b => b.payout_status === 'paid').length} reservas pagadas
          </div>
        </div>

        <div className="rounded-2xl p-5"
          style={{ background: '#fff', border: '1px solid #E8ECF0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
          <div className="flex items-center gap-2 mb-3">
            <Banknote size={14} style={{ color: '#35C493' }} />
            <span className="text-xs font-bold uppercase tracking-widest" style={{ color: '#94A3B8' }}>
              Total gestionado
            </span>
          </div>
          <div className="text-3xl font-bold" style={{ color: '#0F1623', letterSpacing: '-0.03em' }}>
            {formatCurrency(totalPending + totalPaid)}
          </div>
          <div className="text-xs mt-1" style={{ color: '#94A3B8' }}>
            {payouts.length} reservas en total
          </div>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-2 mb-6">
        <Filter size={14} style={{ color: '#94A3B8' }} />
        {([
          { value: 'pending', label: 'Pendientes' },
          { value: 'paid',    label: 'Pagados' },
          { value: 'all',     label: 'Todos' },
        ] as { value: Filter; label: string }[]).map(({ value, label }) => (
          <button key={value} onClick={() => setFilter(value)}
            className="px-4 py-2 rounded-xl text-sm font-semibold transition-all"
            style={filter === value
              ? { background: '#0F1623', color: '#fff' }
              : { background: '#fff', color: '#6B7280', border: '1px solid #E8ECF0' }
            }>
            {label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-2xl overflow-hidden"
        style={{ background: '#fff', border: '1px solid #E8ECF0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
        <div className="grid gap-3 px-6 py-3 text-[11px] font-bold uppercase tracking-widest"
          style={{
            gridTemplateColumns: '2fr 1.5fr 1fr 1fr 1.8fr 1fr',
            borderBottom: '1px solid #F0F2F5',
            background: '#FAFBFC',
            color: '#94A3B8',
          }}>
          <span>Espacio · Propietario</span>
          <span>Evento</span>
          <span>Total reserva</span>
          <span>A pagar al host</span>
          <span>Cuenta bancaria</span>
          <span>Acción</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={24} className="animate-spin" style={{ color: '#35C493' }} />
          </div>
        ) : payouts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3"
              style={{ background: 'rgba(53,196,147,0.08)' }}>
              <CheckCircle size={22} style={{ color: '#35C493' }} />
            </div>
            <p className="font-semibold text-sm" style={{ color: '#0F1623' }}>
              {filter === 'pending' ? '¡Todo al día!' : 'Sin payouts'}
            </p>
            <p className="text-xs mt-1" style={{ color: '#94A3B8' }}>
              {filter === 'pending' ? 'No hay payouts pendientes en este momento.' : 'No hay registros para este filtro.'}
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
                <div key={bk.id}
                  className="grid gap-3 px-6 py-4 items-center hover:bg-slate-50 transition-colors"
                  style={{ gridTemplateColumns: '2fr 1.5fr 1fr 1fr 1.8fr 1fr' }}>

                  {/* Space + host */}
                  <div>
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <Building2 size={11} style={{ color: '#94A3B8' }} />
                      <span className="text-sm font-semibold" style={{ color: '#0F1623' }}>
                        {space?.name ?? '—'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <User size={10} style={{ color: '#94A3B8' }} />
                      <span className="text-xs" style={{ color: '#6B7280' }}>
                        {host?.full_name ?? '—'}
                      </span>
                      {host?.email && (
                        <span className="text-xs" style={{ color: '#94A3B8' }}>
                          · {host.email}
                        </span>
                      )}
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
                    <div className="text-sm font-bold" style={{ color: '#0F1623' }}>
                      {formatCurrency(Number(bk.total_amount))}
                    </div>
                    <div className="text-xs" style={{ color: '#94A3B8' }}>
                      Fee: {formatCurrency(Number(bk.platform_fee))}
                    </div>
                  </div>

                  {/* Host amount */}
                  <div>
                    <div className="text-base font-bold" style={{ color: '#35C493' }}>
                      {formatCurrency(hostAmt)}
                    </div>
                    <div className="text-xs" style={{ color: '#94A3B8' }}>al propietario</div>
                  </div>

                  {/* Bank info */}
                  <BankInfo hostId={host?.id} />

                  {/* Action */}
                  <div>
                    {isPaid ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full"
                        style={{ background: 'rgba(22,163,74,0.08)', color: '#16A34A' }}>
                        <CheckCircle size={11} /> Pagado
                      </span>
                    ) : (
                      <button
                        onClick={() => handlePay(bk.id)}
                        disabled={paying === bk.id}
                        className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl transition-all disabled:opacity-50"
                        style={{ background: '#0F1623', color: '#fff' }}>
                        {paying === bk.id
                          ? <Loader2 size={12} className="animate-spin" />
                          : <CheckCircle size={12} />
                        }
                        Marcar pagado
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Componente para mostrar info bancaria del host ────────
function BankInfo({ hostId }: { hostId?: string }) {
  const [bank, setBank] = useState<any>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!hostId || loaded) return
    // Dynamic import to call server action
    import('@/lib/actions/admin').then(({ getHostBankAccount }) => {
      getHostBankAccount(hostId).then(data => {
        setBank(data)
        setLoaded(true)
      })
    })
  }, [hostId, loaded])

  if (!hostId) return <span className="text-xs" style={{ color: '#94A3B8' }}>Sin banco</span>
  if (!loaded) return <span className="text-xs" style={{ color: '#94A3B8' }}>Cargando...</span>
  if (!bank)   return <span className="text-xs" style={{ color: '#DC2626' }}>Sin cuenta registrada</span>

  return (
    <div>
      <div className="text-xs font-semibold" style={{ color: '#0F1623' }}>
        {bank.bank_name}
        <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded-full font-medium"
          style={{ background: 'rgba(53,196,147,0.1)', color: '#35C493' }}>
          {bank.account_type} · {bank.currency}
        </span>
      </div>
      <div className="text-xs flex items-center gap-0.5 mt-0.5" style={{ color: '#6B7280' }}>
        ···· {bank.account_number?.slice(-4) ?? '????'}
        <CopyBtn text={bank.account_number ?? ''} />
        <span className="mx-1" style={{ color: '#E5E7EB' }}>·</span>
        {bank.account_holder}
      </div>
    </div>
  )
}
