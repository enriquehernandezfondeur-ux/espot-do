'use client'

import { useState } from 'react'
import { CheckCircle, Clock, AlertTriangle, Building2, CreditCard, Loader2 } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface ScheduledPayment {
  id: string
  payment_number: number
  description: string
  percentage: number
  subtotal: number
  platform_fee: number
  total: number
  due_date: string
  is_final_onsite: boolean
  status: 'pending' | 'paid' | 'overdue' | 'cancelled' | 'skipped'
  paid_at?: string
}

interface Props {
  payments: ScheduledPayment[]
  onPay: (paymentId: string) => Promise<void>
  readOnly?: boolean
}

const STATUS_CONFIG = {
  paid:      { label: 'Pagado',    color: '#16A34A', bg: 'rgba(22,163,74,0.08)',   icon: CheckCircle },
  pending:   { label: 'Pendiente', color: '#D97706', bg: 'rgba(217,119,6,0.08)',   icon: Clock },
  overdue:   { label: 'Vencido',   color: '#DC2626', bg: 'rgba(220,38,38,0.08)',   icon: AlertTriangle },
  cancelled: { label: 'Cancelado', color: '#9CA3AF', bg: 'rgba(156,163,175,0.08)', icon: X },
  skipped:   { label: 'En sitio',  color: '#0891B2', bg: 'rgba(8,145,178,0.08)',   icon: Building2 },
} as const

function X({ size, className }: { size: number; className?: string }) {
  return <span className={className} style={{ fontSize: size }}>×</span>
}

function formatDueDate(dateStr: string): string {
  const date = new Date(dateStr + 'T12:00')
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diff = Math.round((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  if (diff < 0) return `Venció hace ${Math.abs(diff)} día${Math.abs(diff) !== 1 ? 's' : ''}`
  if (diff === 0) return 'Vence hoy'
  if (diff === 1) return 'Vence mañana'
  if (diff <= 7) return `Vence en ${diff} días`
  return date.toLocaleDateString('es-DO', { day: 'numeric', month: 'long' })
}

export default function BookingPaymentStatus({ payments, onPay, readOnly = false }: Props) {
  const [paying, setPaying] = useState<string | null>(null)

  if (!payments?.length) return null

  const totalPaid = payments.filter(p => p.status === 'paid').reduce((s, p) => s + p.total, 0)
  const totalPending = payments.filter(p => p.status === 'pending' && !p.is_final_onsite).reduce((s, p) => s + p.total, 0)
  const progress = payments.length > 0
    ? (payments.filter(p => p.status === 'paid' || p.status === 'skipped').length / payments.length) * 100
    : 0

  async function handlePay(id: string) {
    setPaying(id)
    await onPay(id)
    setPaying(null)
  }

  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ background: '#fff', border: '1px solid var(--border-subtle)' }}>

      {/* Header con progreso */}
      <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            Calendario de pagos
          </span>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {payments.filter(p => p.status === 'paid').length}/{payments.length} completados
          </span>
        </div>
        {/* Barra de progreso */}
        <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-elevated)' }}>
          <div className="h-full rounded-full transition-all duration-500"
            style={{ width: `${progress}%`, background: 'var(--brand)' }} />
        </div>
        <div className="flex justify-between mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>
          <span>Pagado: {formatCurrency(totalPaid)}</span>
          {totalPending > 0 && <span>Pendiente: {formatCurrency(totalPending)}</span>}
        </div>
      </div>

      {/* Lista de pagos */}
      <div className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
        {payments.map(payment => {
          const sc    = STATUS_CONFIG[payment.status]
          const Icon  = sc.icon
          const isPending = payment.status === 'pending'
          const isOverdue = payment.status === 'overdue'
          const isPayable = (isPending || isOverdue) && !payment.is_final_onsite && !readOnly

          return (
            <div key={payment.id} className={cn('px-5 py-4 transition-colors', isOverdue && 'bg-red-50/50')}>
              <div className="flex items-start gap-3">
                {/* Ícono de estado */}
                <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                  style={{ background: sc.bg }}>
                  <Icon size={15} style={{ color: sc.color }} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                        {payment.description}
                      </div>
                      <div className="text-xs mt-0.5" style={{ color: isOverdue ? '#DC2626' : 'var(--text-muted)' }}>
                        {payment.status === 'paid'
                          ? `Pagado el ${new Date((payment.paid_at ?? '') + '').toLocaleDateString('es-DO', { day: 'numeric', month: 'short' })}`
                          : payment.is_final_onsite
                            ? 'Se paga directamente en el espacio'
                            : formatDueDate(payment.due_date)
                        }
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm font-bold" style={{ color: payment.status === 'paid' ? '#16A34A' : 'var(--text-primary)' }}>
                        {formatCurrency(payment.total)}
                      </div>
                      <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {payment.percentage}% del total
                      </div>
                    </div>
                  </div>

                  {/* Botón de pago */}
                  {isPayable && (
                    <button onClick={() => handlePay(payment.id)}
                      disabled={paying === payment.id}
                      className="mt-3 flex items-center gap-2 text-xs font-bold px-4 py-2 rounded-xl transition-all disabled:opacity-50"
                      style={{
                        background: isOverdue ? '#DC2626' : 'var(--brand)',
                        color: '#fff',
                        boxShadow: `0 2px 8px ${isOverdue ? 'rgba(220,38,38,0.25)' : 'rgba(53,196,147,0.25)'}`,
                      }}>
                      {paying === payment.id
                        ? <><Loader2 size={12} className="animate-spin" /> Procesando...</>
                        : <><CreditCard size={12} /> {isOverdue ? 'Pagar ahora (vencido)' : `Pagar ${formatCurrency(payment.total)}`}</>
                      }
                    </button>
                  )}

                  {payment.is_final_onsite && (
                    <div className="mt-2 flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg w-fit"
                      style={{ background: '#F0F9FF', color: '#0369A1', border: '1px solid #BAE6FD' }}>
                      <Building2 size={11} /> Sin cargo de plataforma
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
