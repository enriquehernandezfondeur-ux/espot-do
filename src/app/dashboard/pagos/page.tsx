'use client'

import { useEffect, useState } from 'react'
import { CreditCard, CheckCircle, Clock, XCircle, Loader2, Receipt } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'
import { getClientBookings } from '@/lib/actions/client'

const paymentStatusConfig: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  unpaid:  { label: 'Sin pago',    color: '#D97706', bg: 'rgba(217,119,6,0.08)',  icon: Clock },
  partial: { label: '10% pagado',  color: '#2563EB', bg: 'rgba(37,99,235,0.08)', icon: CreditCard },
  advance: { label: 'Anticipo',    color: '#7C3AED', bg: 'rgba(124,58,237,0.08)',icon: CreditCard },
  paid:    { label: 'Pagado',      color: '#16A34A', bg: 'rgba(22,163,74,0.08)', icon: CheckCircle },
}

export default function PagosPage() {
  const [bookings, setBookings] = useState<any[]>([])
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    getClientBookings().then(d => { setBookings(d); setLoading(false) })
  }, [])

  const totalPaid   = bookings.filter(b => b.payment_status === 'paid').reduce((s, b) => s + Number(b.platform_fee), 0)
  const totalPending = bookings.filter(b => b.payment_status !== 'paid' && !b.status.startsWith('cancelled')).reduce((s, b) => s + Number(b.platform_fee), 0)

  if (loading) return (
    <div className="flex items-center justify-center h-screen">
      <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--brand)' }} />
    </div>
  )

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Pagos</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          Historial de pagos de tus reservas
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Total pagado',   value: formatCurrency(totalPaid),    color: '#16A34A' },
          { label: 'Pendiente',      value: formatCurrency(totalPending), color: '#D97706' },
          { label: 'Transacciones',  value: bookings.length,              color: 'var(--brand)' },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-2xl p-5"
            style={{ background: '#fff', border: '1px solid var(--border-subtle)', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            <div className="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>{label}</div>
            <div className="text-2xl font-bold" style={{ color }}>{value}</div>
          </div>
        ))}
      </div>

      {bookings.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 rounded-3xl text-center"
          style={{ background: '#fff', border: '2px dashed var(--border-medium)' }}>
          <Receipt size={32} className="mb-3" style={{ color: 'var(--text-muted)' }} />
          <p className="font-medium" style={{ color: 'var(--text-primary)' }}>Sin pagos registrados</p>
        </div>
      ) : (
        <div className="rounded-3xl overflow-hidden"
          style={{ background: '#fff', border: '1px solid var(--border-subtle)', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
          <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 px-6 py-3 text-xs font-semibold uppercase tracking-widest"
            style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
            <span>Reserva</span><span>Fecha</span><span>Monto</span><span>Estado</span>
          </div>
          {bookings.map((bk: any) => {
            const ps = paymentStatusConfig[bk.payment_status] ?? paymentStatusConfig.unpaid
            const Icon = ps.icon
            return (
              <div key={bk.id} className="grid grid-cols-[1fr_auto_auto_auto] gap-4 items-center px-6 py-4"
                style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <div>
                  <div className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>
                    {bk.spaces?.name}
                  </div>
                  <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {bk.event_type} · {bk.guest_count} personas
                  </div>
                </div>
                <div className="text-sm text-right" style={{ color: 'var(--text-secondary)' }}>
                  {formatDate(bk.event_date)}
                </div>
                <div className="text-right">
                  <div className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
                    {formatCurrency(Number(bk.platform_fee))}
                  </div>
                  <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    de {formatCurrency(Number(bk.total_amount))} total
                  </div>
                </div>
                <div>
                  <span className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full"
                    style={{ background: ps.bg, color: ps.color }}>
                    <Icon size={11} /> {ps.label}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
