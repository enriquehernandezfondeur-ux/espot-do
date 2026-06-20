'use client'

import { useState } from 'react'
import { CreditCard } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'
import { platformFeeOf } from '@/lib/pricing'
import Pagination from '@/components/ui/Pagination'

const paymentConfig: Record<string, { label: string; color: string; bg: string }> = {
  unpaid:  { label: 'Sin pago',         color: '#D97706', bg: 'rgba(217,119,6,0.08)'   },
  partial: { label: 'Pago parcial',     color: '#2563EB', bg: 'rgba(37,99,235,0.08)'   },
  advance: { label: 'Anticipo pagado',  color: '#16A34A', bg: 'rgba(22,163,74,0.08)'   },
  paid:    { label: 'Pago completo',    color: 'var(--brand)', bg: 'rgba(53,196,147,0.08)'  },
}

const PAGE_SIZE = 25

export default function PagosTable({ bookings }: { bookings: any[] }) {
  const [page, setPage] = useState(1)
  const start = (page - 1) * PAGE_SIZE
  const visible = bookings.slice(start, start + PAGE_SIZE)

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: '#fff', border: '1px solid #E8ECF0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
      <div className="overflow-x-auto scrollbar-hide">
        <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-3 px-5 py-3 text-xs font-semibold uppercase tracking-widest text-gray-400 min-w-[640px]"
          style={{ borderBottom: '1px solid #F0F2F5', background: '#FAFBFC' }}>
          <span>Reserva</span><span>Fecha evento</span><span>Valor total</span><span>Comisión Espot</span><span>Estado pago</span>
        </div>
        <div className="divide-y divide-[#F0F2F5]">
          {bookings.length === 0 && (
            <div className="px-5 py-12 text-center text-sm min-w-[640px]" style={{ color: '#94A3B8' }}>
              <CreditCard size={28} className="mx-auto mb-3 opacity-40" />
              Aún no hay pagos registrados en la plataforma.
            </div>
          )}
          {visible.map((bk: any) => {
            const pc = paymentConfig[bk.payment_status] ?? paymentConfig.unpaid
            return (
              <div key={bk.id} className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-3 items-center px-5 py-4 hover:bg-slate-50 transition-colors min-w-[640px]">
                <div>
                  <div className="font-semibold text-sm" style={{ color: '#0F1623' }}>{bk.spaces?.name}</div>
                  <div className="text-xs text-gray-400">{bk.profiles?.full_name} · {bk.event_type}</div>
                </div>
                <div className="text-sm text-gray-600">{formatDate(bk.event_date)}</div>
                <div className="text-sm font-bold tabular-nums" style={{ color: '#0F1623' }}>{formatCurrency(Number(bk.total_amount))}</div>
                <div className="text-sm font-bold tabular-nums" style={{ color: 'var(--brand)' }}>{formatCurrency(platformFeeOf(bk))}</div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full w-fit"
                  style={{ background: pc.bg, color: pc.color }}>
                  {pc.label}
                </span>
              </div>
            )
          })}
        </div>
      </div>
      {bookings.length > PAGE_SIZE && (
        <div className="px-5 pb-4">
          <Pagination page={page} total={bookings.length} pageSize={PAGE_SIZE} onChange={setPage} />
        </div>
      )}
    </div>
  )
}
