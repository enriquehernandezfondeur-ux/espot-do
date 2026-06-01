'use client'

import { useEffect, useMemo, useState } from 'react'
import { formatCurrency, formatDate } from '@/lib/utils'
import { getBankAccount, saveBankAccount } from '@/lib/actions/host'
import { getHostFinance, type HostFinance } from '@/lib/actions/host-finance'
import {
  Loader2, TrendingUp, TrendingDown, Download, Banknote,
  Building2, Save, AlertCircle, ChevronDown, CheckCircle, CalendarClock,
  ArrowDownToLine, PiggyBank, Hourglass, Info,
} from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

const BANKS = [
  'Banco Popular Dominicano','BanReservas','Scotiabank RD','Banco BHD',
  'Banco Santa Cruz','Banco Caribe','Banco Lafise','Banco Promerica',
  'Citibank RD','Banco Ademi','Banco Lopez de Haro','Banco Múltiple Qik','Otro',
]
const inputCls = "w-full rounded-xl px-4 py-3 text-sm focus:outline-none transition-all"
const inputStyle: React.CSSProperties = { background: 'var(--bg-elevated)', border: '1.5px solid var(--border-medium)', color: 'var(--text-primary)', fontSize: 16 }

const CARD: React.CSSProperties = { background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }
const AMBER = '#D97706', RED = '#DC2626'

const payoutBadge: Record<string, { label: string; color: string; bg: string }> = {
  pagado:    { label: 'Pagado',             color: 'var(--brand)', bg: 'var(--bg-elevated)' },
  pendiente: { label: 'Listo para liquidar', color: AMBER,         bg: 'rgba(217,119,6,0.08)' },
  en_curso:  { label: 'Cobrando',           color: '#6B7280',      bg: 'rgba(107,114,128,0.08)' },
}

function csvCell(v: string | number): string {
  const s = String(v ?? '')
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export default function FinanzasPage() {
  const [fin,     setFin]     = useState<HostFinance | null>(null)
  const [loading, setLoading] = useState(true)
  const [period,  setPeriod]  = useState<'6m' | '12m'>('6m')
  const [channel, setChannel] = useState<'total' | 'espot' | 'directo'>('total')

  // Cuenta bancaria
  const [bankName, setBankName]       = useState('')
  const [accountType, setAccountType] = useState<'ahorro' | 'corriente'>('ahorro')
  const [currency, setCurrency]       = useState<'DOP' | 'USD'>('DOP')
  const [accountNum, setAccountNum]   = useState('')
  const [holder, setHolder]           = useState('')
  const [cedula, setCedula]           = useState('')
  const [bankStatus, setBankStatus]   = useState('pending')
  const [saving, setSaving]           = useState(false)
  const [saved, setSaved]             = useState(false)
  const [saveError, setSaveError]     = useState('')

  useEffect(() => {
    Promise.all([getHostFinance(), getBankAccount()]).then(([f, bank]) => {
      setFin(f)
      if (bank) {
        setBankName(bank.bank_name ?? '')
        setAccountType((bank.account_type as 'ahorro' | 'corriente') ?? 'ahorro')
        setCurrency((bank.currency as 'DOP' | 'USD') ?? 'DOP')
        setAccountNum(bank.account_number ?? '')
        setHolder(bank.account_holder ?? '')
        setCedula(bank.cedula_or_rnc ?? '')
        setBankStatus(bank.status ?? 'pending')
      }
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const chartData = useMemo(() => {
    if (!fin) return []
    const months = period === '6m' ? fin.monthly.slice(-6) : fin.monthly
    return months.map(m => ({
      mes: m.mes,
      valor: channel === 'espot' ? m.espot : channel === 'directo' ? m.directo : m.espot + m.directo,
    }))
  }, [fin, period, channel])

  function exportCSV() {
    if (!fin) return
    const header = ['Reserva', 'Espacio', 'Fecha evento', 'Neto al host', 'Estado liquidación']
    const rows = fin.payouts.map(p => [
      csvCell(p.guest), csvCell(p.space), csvCell(p.event_date ? formatDate(p.event_date) : ''),
      csvCell(p.net.toFixed(2)), csvCell(payoutBadge[p.status]?.label ?? p.status),
    ])
    const csv = [header.map(csvCell), ...rows].map(r => r.join(',')).join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `espot-finanzas-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleSaveBank(e: React.FormEvent) {
    e.preventDefault()
    if (!bankName || !accountNum || !holder || !cedula) { setSaveError('Completa los campos obligatorios'); return }
    setSaving(true); setSaveError(''); setSaved(false)
    const result = await saveBankAccount({ account_holder: holder, bank_name: bankName, account_type: accountType, currency, account_number: accountNum, cedula_or_rnc: cedula })
    setSaving(false)
    if ('error' in result) setSaveError(result.error ?? 'Error al guardar')
    else { setSaved(true); setTimeout(() => setSaved(false), 3000) }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-dvh" style={{ background: 'var(--bg-base)' }}>
      <Loader2 size={28} className="animate-spin" style={{ color: 'var(--brand)' }} />
    </div>
  )
  const f = fin ?? {
    netEarned: 0, collectedTotal: 0, collectedThisMonth: 0, collectedPrevMonth: 0, monthChangePct: null,
    receivable: 0, nextPayout: 0,
    espot: { gross: 0, commission: 0, net: 0, collected: 0, count: 0 },
    directo: { total: 0, collected: 0, count: 0 },
    monthly: [], bySpace: [], payouts: [], upcoming: [],
  } as HostFinance

  const verConfig: Record<string, { label: string; color: string; bg: string }> = {
    pending:  { label: 'Verificación pendiente', color: AMBER,         bg: 'rgba(217,119,6,0.06)' },
    verified: { label: 'Cuenta verificada',      color: 'var(--brand)', bg: 'var(--bg-elevated)' },
    rejected: { label: 'Cuenta rechazada',       color: RED,           bg: 'rgba(220,38,38,0.06)' },
  }
  const ver = verConfig[bankStatus] ?? verConfig.pending
  const maxSpaceNet = Math.max(...f.bySpace.map(s => s.total), 1)
  const chartHasData = chartData.some(d => d.valor > 0)
  // Directo no tiene comisión: el host gana el 100%. Usamos el total facturado
  // (o lo cobrado si el total no está registrado).
  const directoEarned = Math.max(f.directo.total, f.directo.collected)
  const totalNet = f.espot.net + directoEarned

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-5 md:mb-7">
        <div>
          <h1 className="text-xl md:text-2xl font-bold" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Finanzas</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Tu dinero, cobros y liquidaciones</p>
        </div>
        <button onClick={exportCSV}
          className="flex items-center gap-1.5 text-xs md:text-sm font-semibold px-3 md:px-4 py-2 md:py-2.5 rounded-xl shrink-0 transition-all"
          style={{ ...CARD, color: 'var(--text-secondary)' }}>
          <Download size={13} /> <span className="hidden sm:inline">Exportar</span> CSV
        </button>
      </div>

      {/* HERO — Neto ganado + 3 KPIs de caja */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 md:gap-4 mb-3 md:mb-4">
        {/* Hero */}
        <div className="lg:col-span-1 rounded-2xl p-5 md:p-6 flex flex-col justify-between"
          style={{ background: 'linear-gradient(135deg, #03313C 0%, #0A4A3A 100%)', boxShadow: '0 4px 20px rgba(3,49,60,0.15)', minHeight: 150 }}>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'rgba(53,196,147,0.15)', border: '1px solid rgba(53,196,147,0.25)' }}>
              <PiggyBank size={17} color="#35C493" />
            </div>
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'rgba(255,255,255,0.55)' }}>Tu dinero neto</p>
          </div>
          <div>
            <p className="text-3xl md:text-4xl font-bold mt-3" style={{ color: '#fff', letterSpacing: '-0.03em' }}>{formatCurrency(totalNet)}</p>
            <p className="text-xs mt-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>
              Espot (neto, −10%) + Directo · tu dinero combinado
            </p>
          </div>
        </div>

        {/* 3 KPIs */}
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
          <KpiCard
            icon={ArrowDownToLine} label="Neto este mes" value={formatCurrency(f.collectedThisMonth)}
            foot={f.monthChangePct === null
              ? <span style={{ color: 'var(--text-muted)' }}>sin mes anterior</span>
              : <span className="inline-flex items-center gap-1 font-semibold" style={{ color: f.monthChangePct >= 0 ? '#0A7A50' : RED }}>
                  {f.monthChangePct >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                  {f.monthChangePct >= 0 ? '+' : ''}{f.monthChangePct}% vs mes anterior
                </span>} />
          <KpiCard
            icon={Hourglass} label="Por cobrar" value={formatCurrency(f.receivable)}
            foot={<span style={{ color: 'var(--text-muted)' }}>facturado aún no cobrado</span>}
            accent={f.receivable > 0 ? AMBER : undefined} />
          <KpiCard
            icon={Banknote} label="Próximo payout" value={formatCurrency(f.nextPayout)}
            foot={<span style={{ color: 'var(--text-muted)' }}>listo para liquidarte</span>}
            accent={f.nextPayout > 0 ? 'var(--brand)' : undefined} />
        </div>
      </div>

      {/* Ingresos por canal — Espot vs Directo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 mb-5 md:mb-6">
        <div className="rounded-2xl p-5" style={CARD}>
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: 'var(--brand)' }} />
            <span className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>Espot (marketplace)</span>
          </div>
          <div className="text-2xl font-bold" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>{formatCurrency(f.espot.net)}</div>
          <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            neto · bruto {formatCurrency(f.espot.gross)} − {formatCurrency(f.espot.commission)} comisión
          </div>
          <div className="text-xs mt-2.5 pt-2.5" style={{ borderTop: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
            {f.espot.count} reserva{f.espot.count !== 1 ? 's' : ''} · cobrado {formatCurrency(f.espot.collected)}
          </div>
        </div>
        <div className="rounded-2xl p-5" style={CARD}>
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#8B5CF6' }} />
            <span className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>Directo (tus eventos)</span>
          </div>
          <div className="text-2xl font-bold" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>{formatCurrency(directoEarned)}</div>
          <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>sin comisión · el 100% es tuyo</div>
          <div className="text-xs mt-2.5 pt-2.5" style={{ borderTop: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
            {f.directo.count} evento{f.directo.count !== 1 ? 's' : ''} · cobrado {formatCurrency(f.directo.collected)}
          </div>
        </div>
      </div>

      {/* Gráfico interactivo */}
      <div className="rounded-2xl p-5 md:p-6 mb-5 md:mb-6" style={CARD}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
          <div>
            <h2 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>Ingresos netos por mes</h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              {channel === 'total' ? 'Espot + Directo' : channel === 'espot' ? 'Solo Espot (neto)' : 'Solo Directo'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Segmented value={channel} onChange={v => setChannel(v as typeof channel)}
              options={[{ v: 'total', l: 'Total' }, { v: 'espot', l: 'Espot' }, { v: 'directo', l: 'Directo' }]} />
            <Segmented value={period} onChange={v => setPeriod(v as typeof period)}
              options={[{ v: '6m', l: '6m' }, { v: '12m', l: '12m' }]} />
          </div>
        </div>
        {chartHasData ? (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="gradNet" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#35C493" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#35C493" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="var(--border-subtle)" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="mes" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={8} />
              <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} width={52}
                tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`} />
              <Tooltip
                contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 12, color: 'var(--text-primary)', fontSize: 12, boxShadow: '0 4px 16px rgba(0,0,0,0.1)', padding: '10px 14px' }}
                formatter={(v: any) => [formatCurrency(Number(v)), 'Neto']}
                labelStyle={{ fontWeight: 600, marginBottom: 4, color: 'var(--text-primary)' }} />
              <Area type="monotone" dataKey="valor" stroke="#35C493" strokeWidth={2.5} fill="url(#gradNet)" dot={false} activeDot={{ r: 4, fill: '#35C493' }} />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-48 rounded-2xl text-sm"
            style={{ background: 'var(--bg-elevated)', border: '1px dashed var(--border-subtle)', color: 'var(--text-muted)' }}>
            Aparece cuando tengas reservas confirmadas
          </div>
        )}
      </div>

      {/* Calendario de cobros + Mix por espacio */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-5 mb-5 md:mb-6">
        {/* Próximas cuotas */}
        <div className="rounded-2xl p-5 md:p-6" style={CARD}>
          <div className="flex items-center gap-2 mb-4">
            <CalendarClock size={16} style={{ color: 'var(--brand)' }} />
            <h2 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>Próximos cobros</h2>
          </div>
          {f.upcoming.length === 0 ? (
            <EmptyRow icon={CalendarClock} text="No hay cuotas por cobrar" />
          ) : (
            <div className="space-y-2.5">
              {f.upcoming.map(u => (
                <div key={u.id} className="flex items-center justify-between gap-3 rounded-xl px-3.5 py-3"
                  style={{ background: 'var(--bg-elevated)', border: `1px solid ${u.overdue ? 'rgba(220,38,38,0.25)' : 'var(--border-subtle)'}` }}>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{u.guest}</div>
                    <div className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>{u.space}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{formatCurrency(u.amount)}</div>
                    <div className="text-xs mt-0.5 font-medium" style={{ color: u.overdue ? RED : 'var(--text-muted)' }}>
                      {u.overdue ? 'Vencida · ' : ''}{formatDate(u.due_date)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Cuánto genera cada salón */}
        <div className="rounded-2xl p-5 md:p-6" style={CARD}>
          <div className="flex items-center gap-2 mb-1">
            <Building2 size={16} style={{ color: 'var(--brand)' }} />
            <h2 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>Cuánto genera cada salón</h2>
          </div>
          <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>Espot (neto) + Directo por espacio</p>
          {f.bySpace.length === 0 ? (
            <EmptyRow icon={Building2} text="Sin ingresos por espacio aún" />
          ) : (
            <div className="space-y-4">
              {f.bySpace.slice(0, 6).map(s => {
                const espotPct   = Math.round((s.espotNet / maxSpaceNet) * 100)
                const directoPct = Math.round((s.directo  / maxSpaceNet) * 100)
                return (
                  <div key={s.name}>
                    <div className="flex items-center justify-between mb-1.5 gap-2">
                      <span className="text-sm font-medium truncate pr-2" style={{ color: 'var(--text-primary)' }}>{s.name}</span>
                      <span className="text-sm font-bold shrink-0" style={{ color: 'var(--text-primary)' }}>{formatCurrency(s.total)}</span>
                    </div>
                    <div className="flex h-2 rounded-full overflow-hidden mb-1.5" style={{ background: 'var(--bg-elevated)' }}>
                      <div className="h-full transition-all duration-500" style={{ width: `${espotPct}%`, background: 'var(--brand)' }} />
                      <div className="h-full transition-all duration-500" style={{ width: `${directoPct}%`, background: '#8B5CF6' }} />
                    </div>
                    <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                      {s.espotNet > 0 && <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: 'var(--brand)' }} />Espot {formatCurrency(s.espotNet)}</span>}
                      {s.directo > 0 && <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: '#8B5CF6' }} />Directo {formatCurrency(s.directo)}</span>}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Liquidaciones (payouts) */}
      <div className="rounded-2xl overflow-hidden mb-5 md:mb-6" style={CARD}>
        <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <div>
            <h2 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>Liquidaciones</h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>El neto que Espot te transfiere por cada reserva</p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>
            {f.payouts.length}
          </span>
        </div>
        {f.payouts.length === 0 ? (
          <EmptyRow icon={Banknote} text="Sin liquidaciones todavía" pad />
        ) : (
          <div className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
            {f.payouts.slice(0, 30).map(p => {
              const badge = payoutBadge[p.status]
              return (
                <div key={p.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{p.guest}</div>
                    <div className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>
                      {p.space}{p.event_date ? ` · ${formatDate(p.event_date)}` : ''}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-sm font-bold" style={{ color: 'var(--brand)' }}>{formatCurrency(p.net)}</span>
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap" style={{ background: badge.bg, color: badge.color }}>{badge.label}</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Cuenta bancaria */}
      <div className="rounded-2xl overflow-hidden" style={CARD}>
        <div className="px-5 md:px-6 py-5 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <div>
            <h2 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>Cuenta bancaria</h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Para recibir tus liquidaciones</p>
          </div>
          <span className="text-xs font-semibold px-3 py-1.5 rounded-full" style={{ background: ver.bg, color: ver.color }}>{ver.label}</span>
        </div>
        <div className="flex items-start gap-3 px-5 md:px-6 py-4" style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-elevated)' }}>
          <Info size={13} style={{ color: 'var(--brand)', flexShrink: 0, marginTop: 1 }} />
          <p className="text-xs" style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            espot.do cobra al cliente y te transfiere el neto (90%) después de cada evento completado. Recibirás un email cuando se procese la transferencia.
          </p>
        </div>
        <form onSubmit={handleSaveBank} className="p-5 md:p-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Banco <span style={{ color: RED }}>*</span></label>
              <div className="relative">
                <select value={bankName} onChange={e => setBankName(e.target.value)} className={inputCls} style={{ ...inputStyle, appearance: 'none', paddingRight: 36 } as React.CSSProperties}>
                  <option value="">Seleccionar banco...</option>
                  {BANKS.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Tipo de cuenta</label>
              <div className="flex gap-2">
                {(['ahorro','corriente'] as const).map(t => (
                  <button key={t} type="button" onClick={() => setAccountType(t)}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all capitalize"
                    style={accountType === t ? { background: 'var(--text-primary)', color: '#fff' } : { background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1.5px solid var(--border-medium)' }}>{t}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Moneda</label>
              <div className="flex gap-2">
                {(['DOP','USD'] as const).map(c => (
                  <button key={c} type="button" onClick={() => setCurrency(c)}
                    className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all"
                    style={currency === c ? { background: 'var(--brand)', color: '#fff' } : { background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1.5px solid var(--border-medium)' }}>{c}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Número de cuenta <span style={{ color: RED }}>*</span></label>
              <input value={accountNum} onChange={e => setAccountNum(e.target.value)} placeholder="012345678901" className={inputCls} style={inputStyle} />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Nombre del titular <span style={{ color: RED }}>*</span></label>
              <input value={holder} onChange={e => setHolder(e.target.value)} placeholder="Nombre completo" className={inputCls} style={inputStyle} />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Cédula o RNC <span style={{ color: RED }}>*</span></label>
              <input value={cedula} onChange={e => setCedula(e.target.value)} placeholder="000-0000000-0" className={inputCls} style={inputStyle} />
            </div>
          </div>
          {saveError && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm" style={{ background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.15)', color: RED }}>
              <AlertCircle size={14} /> {saveError}
            </div>
          )}
          <div className="flex items-center gap-3 pt-1">
            <button type="submit" disabled={saving} className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all disabled:opacity-50" style={{ background: 'var(--text-primary)', color: '#fff' }}>
              {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}{saving ? 'Guardando...' : 'Guardar cuenta bancaria'}
            </button>
            {saved && <div className="flex items-center gap-1.5 text-sm font-medium" style={{ color: 'var(--brand)' }}><CheckCircle size={15} /> Guardado</div>}
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Subcomponentes ──────────────────────────────────────────
function KpiCard({ icon: Icon, label, value, foot, accent }: {
  icon: any; label: string; value: string; foot: React.ReactNode; accent?: string
}) {
  return (
    <div className="rounded-2xl p-4 md:p-5" style={CARD}>
      <div className="flex items-center justify-between mb-2.5">
        <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>{label}</span>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: accent ? `${accent}14` : 'var(--bg-elevated)' }}>
          <Icon size={14} style={{ color: accent ?? 'var(--text-secondary)' }} />
        </div>
      </div>
      <div className="font-bold text-lg md:text-xl" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>{value}</div>
      <div className="text-xs mt-1">{foot}</div>
    </div>
  )
}

function Segmented({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { v: string; l: string }[] }) {
  return (
    <div className="flex gap-0.5 p-0.5 rounded-xl" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
      {options.map(o => (
        <button key={o.v} onClick={() => onChange(o.v)}
          className="px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all"
          style={value === o.v ? { background: 'var(--bg-card)', color: 'var(--text-primary)', boxShadow: '0 1px 2px rgba(0,0,0,0.08)' } : { color: 'var(--text-muted)' }}>
          {o.l}
        </button>
      ))}
    </div>
  )
}

function EmptyRow({ icon: Icon, text, pad }: { icon: any; text: string; pad?: boolean }) {
  return (
    <div className={`flex flex-col items-center justify-center gap-2 ${pad ? 'py-12' : 'py-10'}`}>
      <Icon size={26} style={{ color: 'var(--text-muted)', opacity: 0.35 }} />
      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{text}</p>
    </div>
  )
}
