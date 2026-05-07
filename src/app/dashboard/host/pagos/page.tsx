'use client'

import { useState, useEffect } from 'react'
import { getHostBookings, getBankAccount, saveBankAccount } from '@/lib/actions/host'
import { formatCurrency, formatDate } from '@/lib/utils'
import {
  Banknote, TrendingUp, Clock, CheckCircle, CreditCard,
  Save, Loader2, AlertCircle, Info, ChevronDown,
} from 'lucide-react'

const BANKS = [
  'Banco Popular Dominicano','BanReservas','Scotiabank RD','Banco BHD',
  'Banco Santa Cruz','Banco Caribe','Banco Lafise','Banco Promerica',
  'Citibank RD','Banco Ademi','Banco Lopez de Haro','Banco Múltiple Qik','Otro',
]

const PAYOUT_STATUS: Record<string, { label: string; color: string; bg: string }> = {
  pending:     { label: 'Pendiente',   color: '#D97706', bg: 'rgba(217,119,6,0.08)'  },
  en_revision: { label: 'En revisión', color: '#2563EB', bg: 'rgba(37,99,235,0.08)'  },
  liquidado:   { label: 'Liquidado',   color: '#16A34A', bg: 'rgba(22,163,74,0.08)'  },
  retenido:    { label: 'Retenido',    color: '#DC2626', bg: 'rgba(220,38,38,0.08)'  },
  reembolsado: { label: 'Reembolsado', color: '#6B7280', bg: 'rgba(107,114,128,0.08)'},
}

const inputCls = "w-full rounded-xl px-4 py-3 text-sm focus:outline-none transition-all"
const inputStyle: React.CSSProperties = { background: '#F8FAFC', border: '1.5px solid #E2E8F0', color: '#0F1623' }

export default function HostPagosPage() {
  const [bookings,   setBookings]   = useState<any[]>([])
  const [loading,    setLoading]    = useState(true)
  const [saving,     setSaving]     = useState(false)
  const [saved,      setSaved]      = useState(false)
  const [saveError,  setSaveError]  = useState('')

  const [bankName,    setBankName]   = useState('')
  const [accountType, setAccountType]= useState<'ahorro'|'corriente'>('ahorro')
  const [currency,    setCurrency]   = useState<'DOP'|'USD'>('DOP')
  const [accountNum,  setAccountNum] = useState('')
  const [holder,      setHolder]     = useState('')
  const [cedula,      setCedula]     = useState('')
  const [bankStatus,  setBankStatus] = useState<string>('pending')

  useEffect(() => {
    Promise.all([getHostBookings(), getBankAccount()]).then(([bks, bank]) => {
      setBookings(bks)
      if (bank) {
        setBankName(bank.bank_name ?? '')
        setAccountType((bank.account_type as 'ahorro'|'corriente') ?? 'ahorro')
        setCurrency((bank.currency as 'DOP'|'USD') ?? 'DOP')
        setAccountNum(bank.account_number ?? '')
        setHolder(bank.account_holder ?? '')
        setCedula(bank.cedula_or_rnc ?? '')
        setBankStatus(bank.status ?? 'pending')
      }
      setLoading(false)
    })
  }, [])

  const paid    = bookings.filter(b => b.payment_status === 'paid' && ['confirmed','completed'].includes(b.status))
  const totalGross    = paid.reduce((s, b) => s + Number(b.total_amount), 0)
  const totalFee      = paid.reduce((s, b) => s + Number(b.platform_fee), 0)
  const totalNet      = totalGross - totalFee
  const pendingPayout = paid.filter(b => b.payout_status === 'pending').reduce((s, b) => s + (Number(b.total_amount) - Number(b.platform_fee)), 0)
  const liquidated    = paid.filter(b => b.payout_status === 'paid').reduce((s, b) => s + (Number(b.total_amount) - Number(b.platform_fee)), 0)

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!bankName || !accountNum || !holder || !cedula) { setSaveError('Completa los campos obligatorios'); return }
    setSaving(true); setSaveError(''); setSaved(false)
    const result = await saveBankAccount({ account_holder: holder, bank_name: bankName, account_type: accountType, currency, account_number: accountNum, cedula_or_rnc: cedula })
    setSaving(false)
    if ('error' in result) setSaveError(result.error ?? 'Error al guardar')
    else { setSaved(true); setTimeout(() => setSaved(false), 3000) }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-screen" style={{ background: '#F4F6F8' }}>
      <Loader2 size={28} className="animate-spin" style={{ color: '#35C493' }} />
    </div>
  )

  const verConfig: Record<string, { label: string; color: string; bg: string }> = {
    pending:  { label: 'Verificación pendiente', color: '#D97706', bg: 'rgba(217,119,6,0.06)' },
    verified: { label: 'Cuenta verificada',      color: '#16A34A', bg: 'rgba(22,163,74,0.06)'  },
    rejected: { label: 'Cuenta rechazada',       color: '#DC2626', bg: 'rgba(220,38,38,0.06)'  },
  }
  const ver = verConfig[bankStatus] ?? verConfig.pending

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-8">

      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Banknote size={15} style={{ color: '#35C493' }} />
          <span className="text-xs font-bold uppercase tracking-widest" style={{ color: '#35C493' }}>Finanzas</span>
        </div>
        <h1 className="text-2xl font-bold" style={{ color: '#0F1623', letterSpacing: '-0.02em' }}>Pagos y liquidaciones</h1>
        <p className="text-sm mt-0.5" style={{ color: '#94A3B8' }}>
          Historial de reservas pagadas y estado de tus liquidaciones
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Balance pendiente', value: pendingPayout, icon: Clock,       color: '#F59E0B', sub: 'Por liquidar' },
          { label: 'Total generado',    value: totalNet,      icon: TrendingUp,  color: '#35C493', sub: 'Neto de comisiones' },
          { label: 'Total liquidado',   value: liquidated,    icon: CheckCircle, color: '#16A34A', sub: 'Ya transferido' },
          { label: 'Comisión Espot',    value: totalFee,      icon: CreditCard,  color: '#7C3AED', sub: `${paid.length} reservas` },
        ].map(({ label, value, icon: Icon, color, sub }) => (
          <div key={label} className="rounded-2xl p-5"
            style={{ background: '#fff', border: '1px solid #E8ECF0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style={{ background: `${color}12` }}>
              <Icon size={16} style={{ color }} />
            </div>
            <div className="text-xl font-bold mb-0.5" style={{ color: '#0F1623', letterSpacing: '-0.02em' }}>
              {formatCurrency(value)}
            </div>
            <div className="text-xs font-semibold" style={{ color: '#374151' }}>{label}</div>
            <div className="text-xs mt-0.5" style={{ color: '#94A3B8' }}>{sub}</div>
          </div>
        ))}
      </div>

      {/* Info */}
      <div className="flex items-start gap-3 px-5 py-4 rounded-2xl"
        style={{ background: 'rgba(37,99,235,0.04)', border: '1px solid rgba(37,99,235,0.12)' }}>
        <Info size={15} style={{ color: '#2563EB', flexShrink: 0, marginTop: 1 }} />
        <p className="text-sm" style={{ color: '#1E40AF', lineHeight: 1.6 }}>
          EspotHub cobra el 100% de cada reserva al cliente y te transfiere el neto después de descontar la comisión de la plataforma. Las liquidaciones se procesan manualmente y recibirás una notificación por email cuando se complete la transferencia.
        </p>
      </div>

      {/* Historial */}
      <div className="rounded-2xl overflow-hidden" style={{ background: '#fff', border: '1px solid #E8ECF0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
        <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid #F0F2F5' }}>
          <h2 className="font-bold text-sm" style={{ color: '#0F1623' }}>Historial de reservas</h2>
          <span className="text-xs px-2.5 py-1 rounded-full font-semibold"
            style={{ background: 'rgba(53,196,147,0.1)', color: '#35C493' }}>
            {paid.length} reservas pagadas
          </span>
        </div>

        {paid.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 text-center">
            <Banknote size={28} className="mb-3" style={{ color: '#CBD5E1' }} />
            <p className="font-semibold text-sm" style={{ color: '#374151' }}>Sin reservas pagadas aún</p>
            <p className="text-xs mt-1" style={{ color: '#94A3B8' }}>Cuando un cliente pague, aparecerá aquí.</p>
          </div>
        ) : (
          /* overflow-x-auto para que en móvil haga scroll horizontal en lugar de romper */
          <div className="overflow-x-auto">
            <div style={{ minWidth: 680 }}>
              <div className="grid gap-3 px-6 py-3 text-[11px] font-bold uppercase tracking-widest"
                style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 1fr', background: '#FAFBFC', borderBottom: '1px solid #F0F2F5', color: '#94A3B8' }}>
                <span>Cliente · Evento</span><span>Fecha</span><span>Total pagado</span><span>Comisión</span><span>Tu neto</span><span>Liquidación</span>
              </div>
              <div className="divide-y divide-[#F8FAFC]">
                {paid.map((bk: any) => {
                  const net = Number(bk.total_amount) - Number(bk.platform_fee)
                  const ps  = PAYOUT_STATUS[bk.payout_status ?? 'pending']
                  const guest = bk.profiles as any
                  return (
                    <div key={bk.id} className="grid gap-3 items-center px-6 py-4 hover:bg-slate-50 transition-colors"
                      style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 1fr' }}>
                      <div>
                        <div className="text-sm font-semibold" style={{ color: '#0F1623' }}>{guest?.full_name ?? 'Cliente'}</div>
                        <div className="text-xs" style={{ color: '#94A3B8' }}>{bk.event_type}</div>
                      </div>
                      <div className="text-sm" style={{ color: '#374151' }}>{formatDate(bk.event_date)}</div>
                      <div className="text-sm font-bold" style={{ color: '#0F1623' }}>{formatCurrency(Number(bk.total_amount))}</div>
                      <div className="text-sm" style={{ color: '#7C3AED' }}>−{formatCurrency(Number(bk.platform_fee))}</div>
                      <div className="text-sm font-bold" style={{ color: '#35C493' }}>{formatCurrency(net)}</div>
                      <span className="text-xs font-semibold px-2.5 py-1.5 rounded-full w-fit"
                        style={{ background: ps?.bg, color: ps?.color }}>
                        {ps?.label ?? 'Pendiente'}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Cuenta bancaria */}
      <div className="rounded-2xl overflow-hidden" style={{ background: '#fff', border: '1px solid #E8ECF0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
        <div className="px-6 py-5 flex items-center justify-between" style={{ borderBottom: '1px solid #F0F2F5' }}>
          <div>
            <h2 className="font-bold text-sm" style={{ color: '#0F1623' }}>Cuenta bancaria</h2>
            <p className="text-xs mt-0.5" style={{ color: '#94A3B8' }}>Para recibir tus liquidaciones</p>
          </div>
          <span className="text-xs font-semibold px-3 py-1.5 rounded-full" style={{ background: ver.bg, color: ver.color }}>
            {ver.label}
          </span>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold mb-1.5" style={{ color: '#6B7280' }}>
                Banco <span style={{ color: '#DC2626' }}>*</span>
              </label>
              <div className="relative">
                <select value={bankName} onChange={e => setBankName(e.target.value)}
                  className={inputCls} style={{ ...inputStyle, appearance: 'none', paddingRight: 36 } as React.CSSProperties}>
                  <option value="">Seleccionar banco...</option>
                  {BANKS.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: '#94A3B8' }} />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: '#6B7280' }}>Tipo de cuenta</label>
              <div className="flex gap-2">
                {(['ahorro','corriente'] as const).map(t => (
                  <button key={t} type="button" onClick={() => setAccountType(t)}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all capitalize"
                    style={accountType === t ? { background: '#0F1623', color: '#fff' } : { background: '#F8FAFC', color: '#6B7280', border: '1.5px solid #E2E8F0' }}>
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: '#6B7280' }}>Moneda</label>
              <div className="flex gap-2">
                {(['DOP','USD'] as const).map(c => (
                  <button key={c} type="button" onClick={() => setCurrency(c)}
                    className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all"
                    style={currency === c ? { background: '#35C493', color: '#fff' } : { background: '#F8FAFC', color: '#6B7280', border: '1.5px solid #E2E8F0' }}>
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: '#6B7280' }}>
                Número de cuenta <span style={{ color: '#DC2626' }}>*</span>
              </label>
              <input value={accountNum} onChange={e => setAccountNum(e.target.value)} placeholder="012345678901"
                className={inputCls} style={inputStyle} />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: '#6B7280' }}>
                Nombre del titular <span style={{ color: '#DC2626' }}>*</span>
              </label>
              <input value={holder} onChange={e => setHolder(e.target.value)} placeholder="Nombre completo"
                className={inputCls} style={inputStyle} />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold mb-1.5" style={{ color: '#6B7280' }}>
                Cédula o RNC <span style={{ color: '#DC2626' }}>*</span>
              </label>
              <input value={cedula} onChange={e => setCedula(e.target.value)} placeholder="000-0000000-0"
                className={inputCls} style={inputStyle} />
            </div>
          </div>

          {saveError && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm"
              style={{ background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.15)', color: '#DC2626' }}>
              <AlertCircle size={14} /> {saveError}
            </div>
          )}

          <div className="flex items-center gap-3 pt-1">
            <button type="submit" disabled={saving}
              className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all disabled:opacity-50"
              style={{ background: '#0F1623', color: '#fff' }}>
              {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
              {saving ? 'Guardando...' : 'Guardar cuenta bancaria'}
            </button>
            {saved && (
              <div className="flex items-center gap-1.5 text-sm font-medium" style={{ color: '#16A34A' }}>
                <CheckCircle size={15} /> Guardado
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}
