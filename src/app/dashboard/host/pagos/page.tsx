'use client'

import { useEffect, useState } from 'react'
import {
  Banknote, CreditCard, TrendingUp, CheckCircle2,
  Clock, Send, ShieldCheck, AlertCircle, ChevronDown,
  Loader2, Save, ArrowUpRight,
} from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'
import { getHostBookings, getHostStats, getBankAccount, saveBankAccount } from '@/lib/actions/host'

// ── Bancos dominicanos ────────────────────────────────────
const BANKS = [
  { name: 'Banco Popular Dominicano',  abbr: 'BPD',  color: '#E31837' },
  { name: 'Banreservas',               abbr: 'BHD',  color: '#006D3B' },
  { name: 'Banco BHD León',            abbr: 'BHD',  color: '#003087' },
  { name: 'Banco Santa Cruz',          abbr: 'BSC',  color: '#C8102E' },
  { name: 'Promerica',                 abbr: 'PRO',  color: '#F4A71D' },
  { name: 'Banco Caribe',              abbr: 'CAR',  color: '#0071BC' },
  { name: 'Banco López de Haro',       abbr: 'LDH',  color: '#1A237E' },
  { name: 'APAP',                      abbr: 'APA',  color: '#E63946' },
  { name: 'Asociación Cibao',          abbr: 'CIB',  color: '#2E7D32' },
  { name: 'Vimenca',                   abbr: 'VIM',  color: '#6A1B9A' },
  { name: 'Scotiabank',                abbr: 'SCO',  color: '#EC0000' },
  { name: 'Citibank',                  abbr: 'CTI',  color: '#003B70' },
  { name: 'Otro',                      abbr: 'OTR',  color: '#6B7280' },
]

// ── Estado de payout por reserva ─────────────────────────
function getPayoutLabel(b: any) {
  if (b.status === 'completed')
    return { label: 'Completado', color: '#16A34A', bg: 'rgba(22,163,74,0.08)' }
  if (b.status === 'confirmed')
    return { label: 'Pendiente',  color: '#D97706', bg: 'rgba(217,119,6,0.08)' }
  return { label: 'En proceso',   color: '#6B7280', bg: 'rgba(107,114,128,0.08)' }
}

export default function PagosPage() {
  const [bookings, setBookings] = useState<any[]>([])
  const [stats,    setStats]    = useState<any>(null)
  const [account,  setAccount]  = useState<any>(null)
  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState(false)
  const [saved,    setSaved]    = useState(false)
  const [formErr,  setFormErr]  = useState('')

  // Form state
  const [holder,  setHolder]  = useState('')
  const [bank,    setBank]    = useState('')
  const [accType, setAccType] = useState<'ahorro' | 'corriente'>('ahorro')
  const [currency,setCurrency]= useState<'DOP' | 'USD'>('DOP')
  const [accNum,  setAccNum]  = useState('')
  const [cedula,  setCedula]  = useState('')

  useEffect(() => {
    Promise.all([getHostBookings(), getHostStats(), getBankAccount()]).then(([b, s, acc]) => {
      setBookings(b)
      setStats(s)
      if (acc) {
        setAccount(acc)
        setHolder(acc.account_holder)
        setBank(acc.bank_name)
        setAccType(acc.account_type)
        setCurrency(acc.currency)
        setAccNum(acc.account_number)
        setCedula(acc.cedula_or_rnc)
      }
      setLoading(false)
    })
  }, [])

  const activeBookings = bookings.filter(b =>
    !['cancelled_guest', 'cancelled_host', 'rejected'].includes(b.status)
  )
  const totalBruto    = activeBookings.reduce((s, b) => s + Number(b.total_amount), 0)
  const totalComision = activeBookings.reduce((s, b) => s + Number(b.platform_fee), 0)
  const totalNeto     = totalBruto - totalComision
  const pendingPayout = activeBookings
    .filter(b => b.status === 'confirmed')
    .reduce((s, b) => s + Number(b.total_amount) - Number(b.platform_fee), 0)
  const sentPayout = activeBookings
    .filter(b => b.status === 'completed')
    .reduce((s, b) => s + Number(b.total_amount) - Number(b.platform_fee), 0)

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!holder || !bank || !accNum || !cedula) {
      setFormErr('Completa todos los campos requeridos.')
      return
    }
    setSaving(true)
    setFormErr('')
    const result = await saveBankAccount({
      account_holder: holder, bank_name: bank,
      account_type: accType, currency, account_number: accNum,
      cedula_or_rnc: cedula,
    })
    setSaving(false)
    if ('error' in result) {
      setFormErr(result.error ?? 'Error al guardar')
    } else {
      setSaved(true)
      setAccount({ account_holder: holder, bank_name: bank, account_type: accType, currency, account_number: accNum, cedula_or_rnc: cedula, status: 'pending' })
      setTimeout(() => setSaved(false), 3000)
    }
  }

  const selectedBank = BANKS.find(b => b.name === bank)

  if (loading) return (
    <div className="flex items-center justify-center h-screen">
      <Loader2 size={28} className="animate-spin" style={{ color: 'var(--brand)' }} />
    </div>
  )

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">

      {/* ── Header ── */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: '#03313C', letterSpacing: '-0.02em' }}>
          Pagos y payouts
        </h1>
        <p className="text-sm mt-1" style={{ color: '#6B7280' }}>
          Espot gestiona todos los cobros. Aquí recibes tus ingresos netos.
        </p>
      </div>

      {/* ── Balance banner ── */}
      <div className="rounded-3xl overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #03313C 0%, #0A4A3A 100%)', boxShadow: '0 8px 32px rgba(3,49,60,0.2)' }}>
        <div className="p-8">
          <p className="text-xs font-semibold uppercase tracking-widest mb-2"
            style={{ color: 'rgba(255,255,255,0.5)' }}>
            Balance pendiente de payout
          </p>
          <div className="text-5xl font-bold mb-1" style={{ color: '#fff', letterSpacing: '-0.04em' }}>
            {formatCurrency(pendingPayout)}
          </div>
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
            Se transfiere a tu cuenta luego de cada evento confirmado
          </p>

          <div className="grid grid-cols-3 gap-4 mt-8 pt-6"
            style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
            {[
              { label: 'Ingresos brutos',  value: formatCurrency(totalBruto),    icon: TrendingUp  },
              { label: 'Comisión Espot',   value: formatCurrency(totalComision),  icon: CreditCard  },
              { label: 'Payouts enviados', value: formatCurrency(sentPayout),     icon: Send        },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label}>
                <div className="flex items-center gap-1.5 mb-1">
                  <Icon size={12} style={{ color: 'rgba(255,255,255,0.4)' }} />
                  <span className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>{label}</span>
                </div>
                <div className="font-bold text-base" style={{ color: '#fff', letterSpacing: '-0.02em' }}>
                  {value}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Layout: cuenta + historial ── */}
      <div className="grid lg:grid-cols-[1fr_380px] gap-6 items-start">

        {/* ── Historial de payouts ── */}
        <div className="rounded-2xl overflow-hidden"
          style={{ background: '#fff', border: '1px solid #E5E7EB', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
          <div className="px-6 py-5" style={{ borderBottom: '1px solid #F3F4F6' }}>
            <h2 className="font-bold text-sm" style={{ color: '#03313C' }}>Historial de payouts</h2>
            <p className="text-xs mt-0.5" style={{ color: '#9CA3AF' }}>
              Reservas procesadas por Espot
            </p>
          </div>

          {activeBookings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 gap-3">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: '#F9FAFB' }}>
                <Banknote size={20} style={{ color: '#D1D5DB' }} />
              </div>
              <p className="text-sm" style={{ color: '#9CA3AF' }}>Sin transacciones aún</p>
            </div>
          ) : (
            <div>
              {/* Header */}
              <div className="grid px-6 py-3 text-xs font-semibold uppercase tracking-widest"
                style={{ gridTemplateColumns: '1fr auto auto auto', gap: 16, background: '#F9FAFB', color: '#9CA3AF', borderBottom: '1px solid #F3F4F6' }}>
                <span>Reserva</span>
                <span>Fecha</span>
                <span className="text-right">Neto</span>
                <span>Estado</span>
              </div>
              <div className="divide-y" style={{ borderColor: '#F3F4F6' }}>
                {activeBookings.slice(0, 8).map(b => {
                  const guest = (b as any).profiles as any
                  const neto  = Number(b.total_amount) - Number(b.platform_fee)
                  const ps    = getPayoutLabel(b)
                  return (
                    <div key={b.id} className="grid px-6 py-4 items-center"
                      style={{ gridTemplateColumns: '1fr auto auto auto', gap: 16 }}>
                      <div>
                        <div className="font-medium text-sm" style={{ color: '#03313C' }}>
                          {guest?.full_name ?? 'Cliente'}
                        </div>
                        <div className="text-xs mt-0.5" style={{ color: '#9CA3AF' }}>
                          {b.event_type} · {(b as any).spaces?.name}
                        </div>
                      </div>
                      <div className="text-sm" style={{ color: '#6B7280' }}>
                        {formatDate(b.event_date)}
                      </div>
                      <div className="font-bold text-sm text-right" style={{ color: '#16A34A' }}>
                        {formatCurrency(neto)}
                      </div>
                      <div>
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
                          style={{ background: ps.bg, color: ps.color }}>
                          {ps.label}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* ── Cuenta bancaria ── */}
        <div className="rounded-2xl overflow-hidden"
          style={{ background: '#fff', border: '1px solid #E5E7EB', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>

          {/* Header */}
          <div className="px-6 py-5" style={{ borderBottom: '1px solid #F3F4F6' }}>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-bold text-sm" style={{ color: '#03313C' }}>Cuenta bancaria</h2>
                <p className="text-xs mt-0.5" style={{ color: '#9CA3AF' }}>Para recibir tus payouts</p>
              </div>
              {account && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
                  style={account.status === 'verified'
                    ? { background: 'rgba(22,163,74,0.08)', color: '#16A34A' }
                    : { background: 'rgba(217,119,6,0.08)', color: '#D97706' }}>
                  {account.status === 'verified'
                    ? <><ShieldCheck size={11} /> Verificada</>
                    : <><Clock size={11} /> En revisión</>}
                </div>
              )}
            </div>
          </div>

          <form onSubmit={handleSave} className="p-6 space-y-5">

            {/* Banco selector */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest mb-2"
                style={{ color: '#9CA3AF' }}>
                Banco *
              </label>
              <div className="relative">
                {selectedBank && (
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white z-10"
                    style={{ background: selectedBank.color }}>
                    {selectedBank.abbr.slice(0, 2)}
                  </div>
                )}
                <select value={bank} onChange={e => setBank(e.target.value)} required
                  className="w-full rounded-xl text-sm font-medium focus:outline-none appearance-none cursor-pointer"
                  style={{
                    padding: '12px 40px 12px',
                    paddingLeft: selectedBank ? '48px' : '14px',
                    background: '#F9FAFB',
                    border: '1.5px solid #E5E7EB',
                    color: bank ? '#03313C' : '#9CA3AF',
                  }}>
                  <option value="" disabled>Selecciona tu banco</option>
                  {BANKS.map(b => (
                    <option key={b.name} value={b.name}>{b.name}</option>
                  ))}
                </select>
                <ChevronDown size={14} style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF', pointerEvents: 'none' }} />
              </div>
            </div>

            {/* Tipo + Moneda */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-widest mb-2"
                  style={{ color: '#9CA3AF' }}>
                  Tipo de cuenta *
                </label>
                <div className="flex gap-2">
                  {(['ahorro', 'corriente'] as const).map(t => (
                    <button key={t} type="button" onClick={() => setAccType(t)}
                      className="flex-1 py-2.5 rounded-xl text-xs font-semibold capitalize transition-all"
                      style={accType === t
                        ? { background: '#03313C', color: '#fff' }
                        : { background: '#F9FAFB', color: '#6B7280', border: '1.5px solid #E5E7EB' }}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-widest mb-2"
                  style={{ color: '#9CA3AF' }}>
                  Moneda *
                </label>
                <div className="flex gap-2">
                  {(['DOP', 'USD'] as const).map(c => (
                    <button key={c} type="button" onClick={() => setCurrency(c)}
                      className="flex-1 py-2.5 rounded-xl text-xs font-semibold transition-all"
                      style={currency === c
                        ? { background: '#03313C', color: '#fff' }
                        : { background: '#F9FAFB', color: '#6B7280', border: '1.5px solid #E5E7EB' }}>
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Titular */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest mb-2"
                style={{ color: '#9CA3AF' }}>
                Nombre del titular *
              </label>
              <input value={holder} onChange={e => setHolder(e.target.value)} required
                placeholder="Ej: María González"
                className="w-full rounded-xl text-sm font-medium focus:outline-none transition-colors"
                style={{ padding: '12px 14px', background: '#F9FAFB', border: '1.5px solid #E5E7EB', color: '#03313C' }}
                onFocus={e => (e.target.style.borderColor = '#35C493')}
                onBlur={e => (e.target.style.borderColor = '#E5E7EB')}
              />
            </div>

            {/* Número de cuenta */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest mb-2"
                style={{ color: '#9CA3AF' }}>
                Número de cuenta *
              </label>
              <input value={accNum} onChange={e => setAccNum(e.target.value)} required
                placeholder="Ej: 2100123456789"
                className="w-full rounded-xl text-sm font-medium focus:outline-none transition-colors"
                style={{ padding: '12px 14px', background: '#F9FAFB', border: '1.5px solid #E5E7EB', color: '#03313C', fontFamily: 'monospace', letterSpacing: '0.05em' }}
                onFocus={e => (e.target.style.borderColor = '#35C493')}
                onBlur={e => (e.target.style.borderColor = '#E5E7EB')}
              />
            </div>

            {/* Cédula / RNC */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest mb-2"
                style={{ color: '#9CA3AF' }}>
                Cédula o RNC *
              </label>
              <input value={cedula} onChange={e => setCedula(e.target.value)} required
                placeholder="Ej: 001-1234567-8"
                className="w-full rounded-xl text-sm font-medium focus:outline-none transition-colors"
                style={{ padding: '12px 14px', background: '#F9FAFB', border: '1.5px solid #E5E7EB', color: '#03313C', fontFamily: 'monospace', letterSpacing: '0.05em' }}
                onFocus={e => (e.target.style.borderColor = '#35C493')}
                onBlur={e => (e.target.style.borderColor = '#E5E7EB')}
              />
            </div>

            {formErr && (
              <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-xs"
                style={{ background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.15)', color: '#DC2626' }}>
                <AlertCircle size={13} /> {formErr}
              </div>
            )}

            <button type="submit" disabled={saving}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-bold transition-all disabled:opacity-50"
              style={{ background: '#03313C', color: '#fff', boxShadow: '0 2px 12px rgba(3,49,60,0.2)' }}>
              {saving ? <><Loader2 size={16} className="animate-spin" /> Guardando...</> :
               saved  ? <><CheckCircle2 size={16} style={{ color: '#35C493' }} /> Guardada correctamente</> :
                        <><Save size={16} /> Guardar cuenta bancaria</>}
            </button>

            {/* Nota de seguridad */}
            <div className="flex items-start gap-2 text-xs" style={{ color: '#9CA3AF' }}>
              <ShieldCheck size={13} className="shrink-0 mt-0.5" style={{ color: '#35C493' }} />
              <span>Tu información bancaria se almacena de forma segura y se usa únicamente para procesar tus payouts de Espot.</span>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
