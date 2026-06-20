'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getAdminHostDetail } from '@/lib/actions/admin'
import { adminSetHostPlan } from '@/lib/actions/subscription'
import { PlanBadge } from '@/components/PlanBadge'
import {
  ArrowLeft, Building2, Mail, Phone, Calendar, CreditCard,
  TrendingUp, Users, Clock, CheckCircle2, XCircle, AlertCircle,
  Banknote, ExternalLink, Loader2, Eye, Package, Star,
} from 'lucide-react'
import Link from 'next/link'
import { STATUS_SHORT, STATUS_COLORS } from '@/lib/bookingConfig'
import { formatCurrency } from '@/lib/utils'
import { platformFeeOf, hostNetOf } from '@/lib/pricing'
import { payoutStyle, externalEventStyle, paymentStyle } from '@/lib/statusConfig'

// ── Formatters ──────────────────────────────────────────────
// Formateador único de moneda (delegado a utils para que TODAS las pantallas
// muestren idéntico símbolo/decimales).
const fmtCurrency = formatCurrency
function fmtDate(d: string | null | undefined, opts?: Intl.DateTimeFormatOptions) {
  if (!d) return '—'
  return new Date(d + (d.length === 10 ? 'T12:00' : '')).toLocaleDateString('es-DO', opts ?? { day: 'numeric', month: 'short', year: 'numeric' })
}
function fmtDateTime(d: string | null | undefined) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('es-DO', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}
// Enmascara datos sensibles dejando solo los últimos 4 (gobernanza: no mostrar secretos completos)
function maskTail(v: string | null | undefined, visible = 4): string {
  if (!v) return '—'
  const s = String(v)
  return s.length <= visible ? s : '•••• ' + s.slice(-visible)
}

// ── Status badges ────────────────────────────────────────────
// Config de estado de reserva unificado desde bookingConfig (consistente con el resto del app)
const bookingStatusCfg: Record<string, { label: string; color: string; bg: string }> =
  Object.fromEntries(
    (Object.keys(STATUS_COLORS) as (keyof typeof STATUS_COLORS)[])
      .map(k => [k, { label: STATUS_SHORT[k], ...STATUS_COLORS[k] }]),
  )
function Badge({ cfg, label }: { cfg?: { label: string; color: string; bg: string }; label?: string }) {
  const c = cfg ?? { label: label ?? '—', color: '#6B7280', bg: 'rgba(107,114,128,0.10)' }
  return (
    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap"
      style={{ color: c.color, background: c.bg }}>
      {c.label}
    </span>
  )
}

// ── KPI Card ─────────────────────────────────────────────────
function KpiCard({ label, value, sub, color, icon: Icon }: {
  label: string; value: string | number; sub?: string; color: string; icon: any
}) {
  return (
    <div className="rounded-2xl p-4" style={{ background: '#fff', border: '1px solid #E8ECF0' }}>
      <div className="flex items-center gap-2 mb-2">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `color-mix(in srgb, ${color} 9%, transparent)` }}>
          <Icon size={13} style={{ color }} />
        </div>
        <span className="text-xs text-gray-400 font-medium">{label}</span>
      </div>
      <div className="text-2xl font-bold tabular-nums" style={{ color: '#0F1623', letterSpacing: '-0.03em' }}>{value}</div>
      {sub && <div className="text-xs text-gray-400 mt-0.5">{sub}</div>}
    </div>
  )
}

// ── Section header ────────────────────────────────────────────
function SectionHeader({ title, count }: { title: string; count?: number }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <h2 className="text-base font-bold" style={{ color: '#0F1623' }}>{title}</h2>
      {count !== undefined && (
        <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
          style={{ background: 'rgba(15,22,35,0.07)', color: '#0F1623' }}>
          {count}
        </span>
      )}
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────
export default function AdminHostDetailPage() {
  const params = useParams()
  const router = useRouter()
  const hostId = params.id as string

  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [planWorking, setPlanWorking] = useState(false)
  const [planDays, setPlanDays] = useState(30)
  const [planMsg, setPlanMsg] = useState<{ ok: boolean; text: string } | null>(null)

  useEffect(() => {
    getAdminHostDetail(hostId)
      .then(d => { setData(d); setLoading(false) })
      .catch(() => { setData(null); setLoading(false) })
  }, [hostId])

  async function handlePlanAction(action: 'activate' | 'extend' | 'cancel') {
    if (action === 'cancel' && !window.confirm('¿Cancelar el plan Espot Pro de este propietario?')) return
    setPlanWorking(true)
    setPlanMsg(null)
    const res = await adminSetHostPlan(hostId, action, planDays)
    if (res && 'error' in res) {
      setPlanMsg({ ok: false, text: res.error })
      setPlanWorking(false)
      return
    }
    const d = await getAdminHostDetail(hostId)
    setData(d)
    setPlanMsg({
      ok: true,
      text: action === 'cancel' ? 'Plan Pro cancelado.'
        : action === 'extend' ? `Plan Pro extendido (+${planDays} días).`
        : `Plan Pro activado por ${planDays} días.`,
    })
    setPlanWorking(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-7 h-7 animate-spin" style={{ color: 'var(--brand)' }} />
      </div>
    )
  }
  if (!data || !data.profile) {
    return (
      <div className="p-6 text-center text-gray-400">
        <p>Propietario no encontrado.</p>
        <Link href="/admin/usuarios" className="text-sm text-blue-600 hover:underline mt-2 inline-block">← Volver</Link>
      </div>
    )
  }

  const { profile, spaces, bookings, externalEvents, bankAccount, externalPayments } = data

  // ── Computed KPIs ────────────────────────────────────────────
  const paidStatuses = ['confirmed', 'completed']
  const paidBookings = bookings.filter((b: any) => paidStatuses.includes(b.status))
  const espotRevenue = paidBookings.reduce((s: number, b: any) => s + Number(b.total_amount), 0)
  const espotFees    = paidBookings.reduce((s: number, b: any) => s + platformFeeOf(b), 0)
  const hostNet      = espotRevenue - espotFees

  const directRevenue = externalEvents.reduce((s: number, e: any) => s + Number(e.paid_amount ?? 0), 0)
  const totalRevenue  = espotRevenue + directRevenue

  const pendingPayout = paidBookings.filter((b: any) => b.payout_status === 'pending')
    .reduce((s: number, b: any) => s + hostNetOf(b), 0)

  const totalEvents   = bookings.length + externalEvents.length
  const activeSpaces  = spaces.filter((s: any) => s.is_published && s.is_active).length

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-8">

      {/* ── Back + Header ─────────────────────────────────── */}
      <div>
        <button onClick={() => router.back()}
          className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 transition-colors mb-4">
          <ArrowLeft size={15} /> Volver a usuarios
        </button>

        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          {/* Avatar */}
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-xl font-bold shrink-0"
            style={{ background: 'linear-gradient(135deg, var(--brand), #1a9e70)' }}>
            {profile.full_name?.charAt(0)?.toUpperCase() ?? '?'}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold" style={{ color: '#0F1623', letterSpacing: '-0.02em' }}>
              {profile.full_name ?? 'Sin nombre'}
            </h1>
            <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-gray-500">
              {profile.email && (
                <a href={`mailto:${profile.email}`} className="flex items-center gap-1 hover:underline">
                  <Mail size={13} /> {profile.email}
                </a>
              )}
              {profile.phone && (
                <span className="flex items-center gap-1"><Phone size={13} /> {profile.phone}</span>
              )}
              <span className="flex items-center gap-1"><Calendar size={13} /> Desde {fmtDate(profile.created_at)}</span>
            </div>
          </div>
          {/* Link to host dashboard */}
          <Link href={`/dashboard/host`}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl transition-all whitespace-nowrap shrink-0"
            style={{ background: '#fff', border: '1px solid #E8ECF0', color: '#374151' }}>
            <ExternalLink size={12} /> Ver su dashboard
          </Link>
        </div>
      </div>

      {/* ── KPIs ──────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Ingresos totales"    value={fmtCurrency(totalRevenue)}  sub={`${fmtCurrency(espotRevenue)} Espot + ${fmtCurrency(directRevenue)} Directo`} color="var(--brand)" icon={TrendingUp} />
        <KpiCard label="Neto host (Espot)"   value={fmtCurrency(hostNet)}       sub={`Comisión Espot: ${fmtCurrency(espotFees)}`} color="#2563EB" icon={Banknote} />
        <KpiCard label="Por liquidar"        value={fmtCurrency(pendingPayout)} sub="Reservas Espot pendientes" color="#D97706" icon={Clock} />
        <KpiCard label="Total eventos"       value={totalEvents}                sub={`${spaces.length} espacios · ${activeSpaces} activos`} color="#7C3AED" icon={Users} />
      </div>

      {/* ── Plan Espot Pro ────────────────────────────────── */}
      <div>
        <SectionHeader title="Plan Espot Pro" />
        <div className="rounded-2xl p-5 space-y-4" style={{ background: '#fff', border: '1px solid #E8ECF0' }}>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm" style={{ color: '#374151' }}>Plan actual:</span>
            {data.isPro
              ? <PlanBadge />
              : <span className="text-sm font-semibold" style={{ color: '#6B7280' }}>Normal (gratis)</span>}
            {data.isPro && data.subscription?.current_period_end && (
              <span className="text-xs" style={{ color: '#6B7280' }}>
                · vigente hasta {new Date(data.subscription.current_period_end).toLocaleDateString('es-DO', { day: '2-digit', month: 'short', year: 'numeric' })}
                {data.subscription.payment_provider === 'manual' && ' (activación manual)'}
              </span>
            )}
          </div>
          {data.isPro !== (profile.plan_type === 'pro') && (
            <div className="text-xs rounded-xl p-2" style={{ background: '#FEF3C7', color: '#92400E', border: '1px solid #FDE68A' }}>
              ⚠ El caché de plan (<code>{profile.plan_type}</code>) no coincide con la suscripción real. Pulsa {data.isPro ? '«Activar»' : '«Cancelar»'} para re-sincronizar.
            </div>
          )}

          {/* Duración */}
          <div>
            <div className="text-xs font-medium mb-1.5" style={{ color: '#6B7280' }}>Duración</div>
            <div className="flex flex-wrap items-center gap-2">
              {[{ d: 7, l: '7 días' }, { d: 30, l: '1 mes' }, { d: 90, l: '3 meses' }, { d: 180, l: '6 meses' }, { d: 365, l: '1 año' }].map(o => (
                <button key={o.d} type="button" onClick={() => setPlanDays(o.d)}
                  className="text-xs font-semibold px-3 py-2 rounded-xl transition-all"
                  style={planDays === o.d
                    ? { background: 'var(--pro-dim)', border: '1px solid var(--pro-border)', color: 'var(--pro-strong)' }
                    : { background: '#fff', border: '1px solid #E8ECF0', color: '#374151' }}>
                  {o.l}
                </button>
              ))}
              <label className="text-xs flex items-center gap-1.5" style={{ color: '#6B7280' }}>
                o
                <input type="number" min={1} value={planDays}
                  onChange={e => setPlanDays(Math.max(1, Number(e.target.value) || 1))}
                  className="w-20 rounded-xl px-2 py-1.5 text-sm" style={{ border: '1px solid #E8ECF0', fontSize: 16 }} />
                días
              </label>
            </div>
          </div>

          {/* Acciones */}
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={() => handlePlanAction('activate')} disabled={planWorking}
              className="text-xs font-semibold px-3 py-2 rounded-xl disabled:opacity-60"
              style={{ background: 'var(--pro)', color: '#fff' }}>
              Activar Pro por {planDays} días
            </button>
            <button onClick={() => handlePlanAction('extend')} disabled={planWorking}
              className="text-xs font-semibold px-3 py-2 rounded-xl disabled:opacity-60"
              style={{ background: '#fff', border: '1px solid #E8ECF0', color: '#374151' }}>
              Extender +{planDays} días
            </button>
            <button onClick={() => handlePlanAction('cancel')} disabled={planWorking}
              className="text-xs font-semibold px-3 py-2 rounded-xl disabled:opacity-60"
              style={{ background: '#fff', border: '1px solid #FCA5A5', color: '#DC2626' }}>
              Cancelar
            </button>
          </div>

          {planMsg && (
            <div className="text-xs rounded-xl p-2.5" style={planMsg.ok
              ? { background: 'var(--pro-dim)', color: 'var(--pro-strong)', border: '1px solid var(--pro-border)' }
              : { background: '#FEE2E2', color: '#B91C1C', border: '1px solid #FCA5A5' }}>
              {planMsg.ok ? '✓ ' : '✕ '}{planMsg.text}
            </div>
          )}
        </div>
        <p className="text-xs mt-2" style={{ color: '#9CA3AF' }}>Activación manual por la duración elegida (puente mientras el cobro por Azul se habilita).</p>
      </div>

      {/* ── Bank account ──────────────────────────────────── */}
      <div>
        <SectionHeader title="Cuenta bancaria" />
        {bankAccount ? (
          <div className="rounded-2xl p-5" style={{ background: '#fff', border: '1px solid #E8ECF0' }}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              {[
                { label: 'Banco',           value: bankAccount.bank_name },
                { label: 'Titular',         value: bankAccount.account_holder },
                { label: 'Número',          value: maskTail(bankAccount.account_number) },
                { label: 'Tipo',            value: bankAccount.account_type },
                { label: 'Cédula / RNC',    value: maskTail(bankAccount.id_number) },
                { label: 'Actualizado',     value: fmtDate(bankAccount.updated_at) },
              ].map(({ label, value }) => (
                <div key={label}>
                  <div className="text-[11px] text-gray-400 font-medium uppercase tracking-wide mb-0.5">{label}</div>
                  <div className="font-semibold text-gray-800">{value ?? '—'}</div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="rounded-2xl p-5 text-sm text-gray-400"
            style={{ background: '#FAFBFC', border: '1px solid #E8ECF0' }}>
            No ha registrado cuenta bancaria aún.
          </div>
        )}
      </div>

      {/* ── Spaces ────────────────────────────────────────── */}
      <div>
        <SectionHeader title="Espacios" count={spaces.length} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {spaces.map((sp: any) => {
            const cover = sp.space_images?.find((i: any) => i.is_cover) ?? sp.space_images?.[0]
            const pricing = sp.space_pricing?.[0]
            const bookingCount = sp.bookings?.length ?? 0
            return (
              <div key={sp.id} className="rounded-2xl overflow-hidden flex gap-0"
                style={{ background: '#fff', border: '1px solid #E8ECF0' }}>
                {/* Cover image */}
                <div className="w-24 shrink-0 bg-gray-100 relative overflow-hidden">
                  {cover ? (
                    <img src={cover.url} alt={sp.name} className="w-full h-full object-cover" style={{ minHeight: 80 }} />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center" style={{ minHeight: 80 }}>
                      <Building2 size={20} className="text-gray-300" />
                    </div>
                  )}
                </div>
                <div className="flex-1 p-4 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="font-semibold text-sm truncate" style={{ color: '#0F1623' }}>{sp.name}</div>
                    <div className="flex items-center gap-1 shrink-0">
                      {sp.is_featured && <Star size={11} style={{ color: '#F59E0B' }} fill="#F59E0B" />}
                      {sp.is_published && sp.is_active
                        ? <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(22,163,74,0.10)', color: '#16A34A' }}>Activo</span>
                        : <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(107,114,128,0.10)', color: '#6B7280' }}>Inactivo</span>
                      }
                    </div>
                  </div>
                  <div className="text-xs text-gray-400 mb-2 capitalize">{sp.category}</div>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span className="flex items-center gap-1"><Package size={10} /> {bookingCount} reservas</span>
                    {pricing && (
                      <span className="flex items-center gap-1">
                        <CreditCard size={10} />
                        {pricing.pricing_type === 'hourly' && pricing.hourly_price
                          ? `${fmtCurrency(Number(pricing.hourly_price))}/hr`
                          : pricing.pricing_type === 'minimum_consumption' && pricing.minimum_consumption
                            ? `Min. ${fmtCurrency(Number(pricing.minimum_consumption))}`
                            : pricing.pricing_type === 'fixed_package' && pricing.fixed_price
                              ? fmtCurrency(Number(pricing.fixed_price))
                              : 'Cotización'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
          {spaces.length === 0 && (
            <div className="rounded-2xl p-5 text-sm text-gray-400 col-span-2"
              style={{ background: '#FAFBFC', border: '1px solid #E8ECF0' }}>
              No tiene espacios registrados.
            </div>
          )}
        </div>
      </div>

      {/* ── Espot Bookings ────────────────────────────────── */}
      <div>
        <SectionHeader title="Reservas Espot" count={bookings.length} />
        <div className="rounded-2xl overflow-hidden" style={{ background: '#fff', border: '1px solid #E8ECF0' }}>
          <div className="overflow-x-auto scrollbar-hide">
            <div className="grid gap-3 px-4 py-3 text-[11px] font-semibold uppercase tracking-widest text-gray-400 min-w-[700px]"
              style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 1fr', borderBottom: '1px solid #F0F2F5', background: '#FAFBFC' }}>
              <span>Cliente · Espacio</span><span>Fecha evento</span><span>Total</span><span>Estado</span><span>Pago</span><span>Liquidación</span>
            </div>
            {bookings.length === 0 ? (
              <div className="text-center py-10 text-gray-400 text-sm">Sin reservas Espot</div>
            ) : (
              <div className="divide-y divide-[#F0F2F5]">
                {bookings.map((b: any) => {
                  const guest = b.profiles as any
                  const space = b.spaces as any
                  const bsCfg = bookingStatusCfg[b.status]
                  const poCfg = payoutStyle(b.payout_status)
                  return (
                    <div key={b.id}
                      className="grid gap-3 items-center px-4 py-3 hover:bg-slate-50 transition-colors min-w-[700px] text-sm"
                      style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 1fr' }}>
                      <div className="min-w-0">
                        <div className="font-medium truncate text-gray-800">{guest?.full_name ?? '—'}</div>
                        <div className="text-xs text-gray-400 truncate">{space?.name ?? '—'}</div>
                      </div>
                      <div className="text-xs text-gray-500">{fmtDate(b.event_date, { day: 'numeric', month: 'short' })}</div>
                      <div className="font-semibold text-gray-800 tabular-nums">{fmtCurrency(Number(b.total_amount))}</div>
                      <div><Badge cfg={bsCfg} /></div>
                      <div>
                        <Badge cfg={paymentStyle(b.payment_status)} />
                      </div>
                      <div><Badge cfg={poCfg} /></div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── External Events ───────────────────────────────── */}
      <div>
        <SectionHeader title="Eventos directos" count={externalEvents.length} />
        <div className="rounded-2xl overflow-hidden" style={{ background: '#fff', border: '1px solid #E8ECF0' }}>
          <div className="overflow-x-auto scrollbar-hide">
            <div className="grid gap-3 px-4 py-3 text-[11px] font-semibold uppercase tracking-widest text-gray-400 min-w-[600px]"
              style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', borderBottom: '1px solid #F0F2F5', background: '#FAFBFC' }}>
              <span>Evento · Cliente</span><span>Fecha</span><span>Total</span><span>Cobrado</span><span>Estado</span>
            </div>
            {externalEvents.length === 0 ? (
              <div className="text-center py-10 text-gray-400 text-sm">Sin eventos directos</div>
            ) : (
              <div className="divide-y divide-[#F0F2F5]">
                {externalEvents.map((e: any) => {
                  const client = e.host_clients as any
                  const stCfg = externalEventStyle(e.status)
                  return (
                    <div key={e.id}
                      className="grid gap-3 items-center px-4 py-3 hover:bg-slate-50 transition-colors min-w-[600px] text-sm"
                      style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr' }}>
                      <div className="min-w-0">
                        <div className="font-medium truncate text-gray-800">{e.title ?? e.event_type ?? '—'}</div>
                        <div className="text-xs text-gray-400 truncate">{client?.full_name ?? e.client_name ?? '—'}</div>
                      </div>
                      <div className="text-xs text-gray-500">{fmtDate(e.event_date, { day: 'numeric', month: 'short' })}</div>
                      <div className="font-semibold text-gray-800 tabular-nums">{e.total_amount ? fmtCurrency(Number(e.total_amount)) : '—'}</div>
                      <div className="font-semibold tabular-nums" style={{ color: '#16A34A' }}>{e.paid_amount ? fmtCurrency(Number(e.paid_amount)) : '—'}</div>
                      <div><Badge cfg={stCfg} /></div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Direct payment history ────────────────────────── */}
      {externalPayments.length > 0 && (
        <div>
          <SectionHeader title="Historial de pagos directos" count={externalPayments.length} />
          <div className="rounded-2xl overflow-hidden" style={{ background: '#fff', border: '1px solid #E8ECF0' }}>
            <div className="overflow-x-auto scrollbar-hide">
              <div className="grid gap-3 px-4 py-3 text-[11px] font-semibold uppercase tracking-widest text-gray-400 min-w-[500px]"
                style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr', borderBottom: '1px solid #F0F2F5', background: '#FAFBFC' }}>
                <span>Descripción</span><span>Fecha pago</span><span>Monto</span><span>Método</span>
              </div>
              <div className="divide-y divide-[#F0F2F5]">
                {externalPayments.map((p: any) => (
                  <div key={p.id}
                    className="grid gap-3 items-center px-4 py-3 hover:bg-slate-50 transition-colors min-w-[500px] text-sm"
                    style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr' }}>
                    <div className="text-gray-600 truncate">{p.description ?? p.concept ?? '—'}</div>
                    <div className="text-xs text-gray-500">{fmtDate(p.paid_at, { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                    <div className="font-semibold tabular-nums" style={{ color: '#16A34A' }}>{fmtCurrency(Number(p.amount))}</div>
                    <div className="text-xs text-gray-400 capitalize">{p.payment_method ?? '—'}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
