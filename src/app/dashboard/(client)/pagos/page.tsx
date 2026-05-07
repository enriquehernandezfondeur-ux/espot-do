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
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <div className="mb-5 md:mb-8">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Pagos</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          Historial de pagos de tus reservas
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 mb-6 md:mb-8">
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
        <div className="rounded-2xl md:rounded-3xl overflow-hidden"
          style={{ background: '#fff', border: '1px solid var(--border-subtle)', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
          {bookings.map((bk: any, i) => {
            const ps = paymentStatusConfig[bk.payment_status] ?? paymentStatusConfig.unpaid
            const Icon = ps.icon
            return (
              <div key={bk.id} className="flex items-start gap-3 px-4 md:px-6 py-4"
                style={{ borderTop: i > 0 ? '1px solid var(--border-subtle)' : undefined }}>
                {/* Icono estado */}
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                  style={{ background: ps.bg }}>
                  <Icon size={15} style={{ color: ps.color }} />
                </div>
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="font-semibold text-sm truncate" style={{ color: 'var(--text-primary)' }}>
                      {bk.spaces?.name}
                    </div>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full shrink-0"
                      style={{ background: ps.bg, color: ps.color }}>
                      {ps.label}
                    </span>
                  </div>
                  <div className="text-xs mb-1.5" style={{ color: 'var(--text-muted)' }}>
                    {bk.event_type} · {bk.guest_count} personas · {formatDate(bk.event_date)}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
                      {formatCurrency(Number(bk.platform_fee))}
                    </span>
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      de {formatCurrency(Number(bk.total_amount))} total
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
