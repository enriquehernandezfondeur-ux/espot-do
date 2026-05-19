'use client'

import { useState, useEffect, useTransition, useRef } from 'react'
import { getAdminPayouts, markPayoutPaid } from '@/lib/actions/admin'
import { formatCurrency, formatDate } from '@/lib/utils'
import {
  Banknote, CheckCircle, Clock, Building2, User,
  CalendarDays, Copy, Check, Loader2, Paperclip, X, Upload,
} from 'lucide-react'

type PayoutFilter = 'pending' | 'paid' | 'all'

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
  const [filter, setFilter]       = useState<PayoutFilter>('pending')
  const [payouts, setPayouts]     = useState<any[]>([])
  const [banks, setBanks]         = useState<Record<string, any>>({})
  const [loading, setLoading]     = useState(true)
  const [isPending, startTransition] = useTransition()
  const [toast, setToast]         = useState<{ msg: string; ok: boolean } | null>(null)

  // Modal de confirmación con comprobante
  const [confirmModal, setConfirmModal] = useState<any | null>(null)
  const [receipt, setReceipt]           = useState<{ file: File; base64: string } | null>(null)
  const [sending, setSending]           = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3500)
  }

  async function load() {
    setLoading(true)
    const data = await getAdminPayouts(filter)
    setPayouts(data)
    setLoading(false)
  }

  useEffect(() => { load() }, [filter])

  function openConfirm(bk: any) {
    setConfirmModal(bk)
    setReceipt(null)
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1] // quitar el data:...;base64,
      setReceipt({ file, base64 })
    }
    reader.readAsDataURL(file)
  }

  async function handleConfirmPay() {
    if (!confirmModal) return
    setSending(true)
    startTransition(async () => {
      const result = await markPayoutPaid(
        confirmModal.id,
        receipt ? { base64: receipt.base64, filename: receipt.file.name } : undefined
      )
      if (result && 'error' in result) {
        showToast(`Error: ${result.error}`, false)
      } else {
        await load()
        showToast(receipt ? 'Payout enviado con comprobante adjunto' : 'Payout marcado como pagado', true)
      }
      setSending(false)
      setConfirmModal(null)
      setReceipt(null)
    })
  }

  const totalPending = payouts
    .filter(b => b.payout_status === 'pending')
    .reduce((s, b) => s + Number(b.total_amount) * 0.90, 0)

  const totalPaid = payouts
    .filter(b => b.payout_status === 'paid')
    .reduce((s, b) => s + Number(b.total_amount) * 0.90, 0)

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      {toast && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold shadow-xl"
          style={{ background: toast.ok ? '#16A34A' : '#DC2626', color: '#fff' }}>
          {toast.ok ? '✓' : '✕'} {toast.msg}
        </div>
      )}

      {/* ── Modal de confirmación de payout ── */}
      {confirmModal && (() => {
        const space   = confirmModal.spaces as any
        const host    = confirmModal.profiles as any
        const bank    = banks[confirmModal.id] as any
        const net     = Math.round(Number(confirmModal.total_amount) * 0.90)
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
            onClick={e => { if (e.target === e.currentTarget) { setConfirmModal(null); setReceipt(null) } }}>
            <div className="w-full max-w-md rounded-2xl overflow-hidden"
              style={{ background: '#fff', boxShadow: '0 24px 64px rgba(0,0,0,0.18)' }}>

              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4"
                style={{ borderBottom: '1px solid #F0F2F5' }}>
                <span className="font-bold text-base" style={{ color: '#0F1623' }}>Confirmar payout</span>
                <button onClick={() => { setConfirmModal(null); setReceipt(null) }}
                  className="w-8 h-8 flex items-center justify-center rounded-lg"
                  style={{ background: '#F3F4F6', color: '#6B7280' }}>
                  <X size={15} />
                </button>
              </div>

              {/* Resumen */}
              <div className="px-6 py-4 space-y-2.5" style={{ borderBottom: '1px solid #F0F2F5' }}>
                {[
                  { label: 'Propietario',    value: host?.full_name ?? '—' },
                  { label: 'Espacio',        value: space?.name ?? '—' },
                  { label: 'Evento',         value: confirmModal.event_type ?? '—' },
                  { label: 'Fecha',          value: formatDate(confirmModal.event_date) },
                  { label: 'Neto a pagar',   value: formatCurrency(net) },
                  ...(bank ? [{ label: 'Cuenta',  value: `${bank.bank_name} · ${bank.account_number?.slice(-4).padStart(bank.account_number.length, '·')}` }] : []),
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between text-sm">
                    <span style={{ color: '#6B7280' }}>{label}</span>
                    <span className="font-semibold" style={{ color: '#0F1623' }}>{value}</span>
                  </div>
                ))}
              </div>

              {/* Upload comprobante */}
              <div className="px-6 py-4" style={{ borderBottom: '1px solid #F0F2F5' }}>
                <p className="text-xs font-semibold mb-2" style={{ color: '#374151' }}>
                  Comprobante de transferencia <span style={{ color: '#9CA3AF' }}>(opcional)</span>
                </p>
                <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden"
                  onChange={handleFileChange} />
                {receipt ? (
                  <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl"
                    style={{ background: 'rgba(53,196,147,0.06)', border: '1px solid rgba(53,196,147,0.25)' }}>
                    <Paperclip size={13} style={{ color: '#35C493', flexShrink: 0 }} />
                    <span className="text-sm flex-1 truncate" style={{ color: '#0F1623' }}>{receipt.file.name}</span>
                    <button onClick={() => { setReceipt(null); if (fileRef.current) fileRef.current.value = '' }}
                      style={{ color: '#9CA3AF' }}>
                      <X size={13} />
                    </button>
                  </div>
                ) : (
                  <button onClick={() => fileRef.current?.click()}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm transition-colors"
                    style={{ border: '1.5px dashed #D1D5DB', color: '#6B7280', background: '#FAFAFA' }}>
                    <Upload size={14} /> Subir comprobante (PDF, JPG, PNG)
                  </button>
                )}
                {receipt && (
                  <p className="text-xs mt-1.5" style={{ color: '#9CA3AF' }}>
                    Se adjuntará automáticamente al email del propietario.
                  </p>
                )}
              </div>

              {/* Acciones */}
              <div className="flex gap-3 px-6 py-4">
                <button onClick={() => { setConfirmModal(null); setReceipt(null) }}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors"
                  style={{ background: '#F3F4F6', color: '#374151' }}>
                  Cancelar
                </button>
                <button onClick={handleConfirmPay} disabled={sending}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-50"
                  style={{ background: '#0F1623', color: '#fff' }}>
                  {sending
                    ? <><Loader2 size={14} className="animate-spin" /> Enviando...</>
                    : <><CheckCircle size={14} /> Confirmar y enviar</>}
                </button>
              </div>
            </div>
          </div>
        )
      })()}

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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
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
        <Banknote size={14} style={{ color: '#94A3B8' }} />
        {([
          { value: 'pending', label: 'Pendientes' },
          { value: 'paid',    label: 'Pagados' },
          { value: 'all',     label: 'Todos' },
        ] as { value: PayoutFilter; label: string }[]).map(({ value, label }) => (
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
              const hostAmt = Number(bk.total_amount) * 0.90
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
                      Fee: {formatCurrency(Number(bk.platform_fee) || Math.round(Number(bk.total_amount) * 0.10))}
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
                        onClick={() => openConfirm(bk)}
                        className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl transition-all"
                        style={{ background: '#0F1623', color: '#fff' }}>
                        <CheckCircle size={12} /> Marcar pagado
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
