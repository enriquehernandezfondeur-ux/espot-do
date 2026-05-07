import { getAdminPayments } from '@/lib/actions/admin'
import { formatCurrency, formatDate } from '@/lib/utils'
import { CreditCard, TrendingUp, Clock, CheckCircle } from 'lucide-react'

const paymentConfig: Record<string, { label: string; color: string; bg: string }> = {
  unpaid:  { label: 'Sin pago',   color: '#D97706', bg: 'rgba(217,119,6,0.08)' },
  partial: { label: '10% pagado', color: '#2563EB', bg: 'rgba(37,99,235,0.08)' },
  advance: { label: 'Anticipo',   color: '#7C3AED', bg: 'rgba(124,58,237,0.08)' },
  paid:    { label: 'Pagado',     color: '#16A34A', bg: 'rgba(22,163,74,0.08)' },
}

export default async function AdminPagosPage() {
  const bookings = await getAdminPayments()

  const totalRevenue    = bookings.reduce((s, b) => s + Number((b as any).platform_fee), 0)
  const totalPaid       = bookings.filter(b => (b as any).payment_status === 'paid').reduce((s, b) => s + Number((b as any).platform_fee), 0)
  const totalPending    = bookings.filter(b => (b as any).payment_status !== 'paid').reduce((s, b) => s + Number((b as any).platform_fee), 0)
  const totalEventValue = bookings.reduce((s, b) => s + Number((b as any).total_amount), 0)

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold" style={{ color: '#0F1623', letterSpacing: '-0.02em' }}>Pagos</h1>
        <p className="text-sm text-slate-500 mt-0.5">Historial de comisiones y pagos de la plataforma</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Comisión total',       value: formatCurrency(totalRevenue),    icon: TrendingUp,  color: '#35C493' },
          { label: 'Comisión cobrada',     value: formatCurrency(totalPaid),       icon: CheckCircle, color: '#16A34A' },
          { label: 'Comisión pendiente',   value: formatCurrency(totalPending),    icon: Clock,       color: '#D97706' },
          { label: 'Valor total eventos',  value: formatCurrency(totalEventValue), icon: CreditCard,  color: '#7C3AED' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="rounded-2xl p-5"
            style={{ background: '#fff', border: '1px solid #E8ECF0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
              style={{ background: `${color}12` }}>
              <Icon size={18} style={{ color }} />
            </div>
            <div className="text-xl font-bold" style={{ color: '#0F1623', letterSpacing: '-0.02em' }}>{value}</div>
            <div className="text-xs text-slate-500 mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-2xl overflow-hidden" style={{ background: '#fff', border: '1px solid #E8ECF0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
        <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-3 px-5 py-3 text-xs font-semibold uppercase tracking-widest text-slate-400"
          style={{ borderBottom: '1px solid #F0F2F5', background: '#FAFBFC' }}>
          <span>Reserva</span><span>Fecha evento</span><span>Valor total</span><span>Comisión Espot</span><span>Estado pago</span>
        </div>
        <div className="divide-y divide-[#F0F2F5]">
          {bookings.map((bk: any) => {
            const pc = paymentConfig[bk.payment_status] ?? paymentConfig.unpaid
            return (
              <div key={bk.id} className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-3 items-center px-5 py-4 hover:bg-slate-50 transition-colors">
                <div>
                  <div className="font-semibold text-sm" style={{ color: '#0F1623' }}>{bk.spaces?.name}</div>
                  <div className="text-xs text-slate-400">{bk.profiles?.full_name} · {bk.event_type}</div>
                </div>
                <div className="text-sm text-slate-600">{formatDate(bk.event_date)}</div>
                <div className="text-sm font-bold" style={{ color: '#0F1623' }}>{formatCurrency(Number(bk.total_amount))}</div>
                <div className="text-sm font-bold" style={{ color: '#35C493' }}>{formatCurrency(Number(bk.platform_fee))}</div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full w-fit"
                  style={{ background: pc.bg, color: pc.color }}>
                  {pc.label}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
