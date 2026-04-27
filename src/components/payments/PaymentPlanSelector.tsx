'use client'

import { useState, useMemo } from 'react'
import { CalendarDays, CheckCircle, Info, Building2, CreditCard, Lock } from 'lucide-react'
import { buildPaymentSchedule, DEFAULT_PLANS, type PaymentPlanConfig, type PaymentSchedule } from '@/lib/payments/engine'
import { formatCurrency } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface Props {
  totalEvent:  number      // precio total del evento
  eventDate:   string      // YYYY-MM-DD
  onSelect:    (plan: PaymentPlanConfig, schedule: PaymentSchedule) => void
  selected?:   PaymentPlanConfig
}

const PLAN_ICONS: Record<string, string> = {
  pago_completo:          '💳',
  pago_2_partes:          '✌️',
  pago_3_partes:          '📅',
  cotizacion_personalizada:'💬',
}

export default function PaymentPlanSelector({ totalEvent, eventDate, onSelect, selected }: Props) {
  const [activePlan, setActivePlan] = useState<PaymentPlanConfig>(
    selected ?? DEFAULT_PLANS[2] // pago_3_partes por defecto
  )

  const schedule = useMemo(() => {
    if (!eventDate || !totalEvent) return null
    return buildPaymentSchedule(activePlan, totalEvent, new Date(eventDate + 'T12:00'))
  }, [activePlan, totalEvent, eventDate])

  function selectPlan(plan: PaymentPlanConfig) {
    setActivePlan(plan)
    if (schedule) onSelect(plan, schedule)
  }

  if (!eventDate || totalEvent <= 0) return null

  return (
    <div className="space-y-4">
      {/* Selector de plan */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-widest mb-2.5"
          style={{ color: 'var(--text-muted)' }}>
          Opción de pago
        </label>
        <div className="space-y-2">
          {DEFAULT_PLANS.map(plan => {
            const isActive = activePlan.plan_type === plan.plan_type
            const preview  = buildPaymentSchedule(plan, totalEvent, new Date(eventDate + 'T12:00'))
            const firstPay = preview.payments[0]
            return (
              <button key={plan.plan_type} onClick={() => selectPlan(plan)}
                className="w-full text-left rounded-2xl border transition-all duration-150 overflow-hidden"
                style={isActive ? {
                  borderColor: 'var(--brand)',
                  background: 'rgba(53,196,147,0.04)',
                } : {
                  borderColor: 'var(--border-subtle)',
                  background: 'var(--bg-surface)',
                }}>
                <div className="px-4 py-3.5 flex items-center gap-3">
                  {/* Radio */}
                  <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0"
                    style={isActive ? { background: 'var(--brand)', borderColor: 'var(--brand)' } : { borderColor: 'var(--border-medium)' }}>
                    {isActive && <div className="w-2 h-2 rounded-full bg-white" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                        {PLAN_ICONS[plan.plan_type]} {preview.plan_label}
                      </span>
                      {plan.plan_type === 'pago_3_partes' && (
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{ background: 'var(--brand-dim)', color: 'var(--brand)' }}>
                          Recomendado
                        </span>
                      )}
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                      {preview.plan_description}
                    </div>
                  </div>

                  {firstPay && (
                    <div className="text-right shrink-0">
                      <div className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                        {formatCurrency(firstPay.total)}
                      </div>
                      <div className="text-xs" style={{ color: 'var(--text-muted)' }}>hoy</div>
                    </div>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Calendario de pagos */}
      {schedule && schedule.payments.length > 0 && (
        <div className="rounded-2xl overflow-hidden"
          style={{ border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)' }}>
          <div className="px-4 py-3 flex items-center gap-2"
            style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-elevated)' }}>
            <CalendarDays size={14} style={{ color: 'var(--brand)' }} />
            <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
              Calendario de pagos
            </span>
          </div>

          <div className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
            {schedule.payments.map((payment, i) => (
              <div key={payment.payment_number} className="px-4 py-4">
                <div className="flex items-start gap-3">
                  {/* Número / ícono */}
                  <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-sm font-bold mt-0.5')}
                    style={payment.is_first
                      ? { background: 'var(--brand)', color: '#fff' }
                      : payment.is_final_onsite
                        ? { background: '#F0F9FF', color: '#0369A1', border: '1px solid #BAE6FD' }
                        : { background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}>
                    {payment.is_final_onsite ? <Building2 size={14} /> : payment.payment_number}
                  </div>

                  {/* Info del pago */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                          {payment.label}
                        </div>
                        <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                          {payment.due_label} · {payment.percentage}% del total
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-sm font-bold" style={{ color: payment.is_first ? 'var(--brand)' : 'var(--text-primary)' }}>
                          {formatCurrency(payment.total)}
                        </div>
                        {!payment.is_final_onsite && payment.platform_fee > 0 && (
                          <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                            incl. {formatCurrency(payment.platform_fee)} de plataforma
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Badges */}
                    {payment.badges.length > 0 && (
                      <div className="flex gap-1.5 mt-2 flex-wrap">
                        {payment.badges.map(badge => (
                          <span key={badge} className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium"
                            style={badge === 'Bloquea tu fecha'
                              ? { background: 'rgba(53,196,147,0.1)', color: 'var(--brand)' }
                              : badge === 'Sin cargo de plataforma'
                                ? { background: '#F0F9FF', color: '#0369A1' }
                                : { background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>
                            {badge === 'Bloquea tu fecha' ? <Lock size={10} /> : <CheckCircle size={10} />}
                            {badge}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Barra de progreso visual */}
                {i < schedule.payments.length - 1 && (
                  <div className="ml-4 mt-1 flex items-center gap-1.5 pl-4">
                    <div className="w-px h-5" style={{ background: 'var(--border-subtle)' }} />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Resumen total */}
          <div className="px-4 py-4" style={{ borderTop: '1.5px solid var(--border-medium)', background: 'var(--bg-elevated)' }}>
            <div className="space-y-1.5">
              {schedule.total_online > 0 && schedule.total_onsite > 0 && (
                <>
                  <div className="flex justify-between text-xs" style={{ color: 'var(--text-secondary)' }}>
                    <span className="flex items-center gap-1"><CreditCard size={11} /> Pagas online</span>
                    <span className="font-semibold">{formatCurrency(schedule.total_online)}</span>
                  </div>
                  <div className="flex justify-between text-xs" style={{ color: 'var(--text-secondary)' }}>
                    <span className="flex items-center gap-1"><Building2 size={11} /> Pagas en el espacio</span>
                    <span className="font-semibold">{formatCurrency(schedule.total_onsite)}</span>
                  </div>
                </>
              )}
              <div className="flex justify-between text-sm font-bold pt-1"
                style={{ borderTop: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}>
                <span>Total del evento</span>
                <span>{formatCurrency(schedule.total_event)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Nota informativa */}
      <div className="flex gap-2 px-3 py-2.5 rounded-xl text-xs"
        style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>
        <Info size={13} className="shrink-0 mt-0.5" style={{ color: 'var(--text-muted)' }} />
        <span>
          El primer pago bloquea tu fecha. Si el propietario rechaza la reserva, recibirás un reembolso completo.
          Espot cobra una comisión del 10% sobre los pagos procesados en la plataforma.
        </span>
      </div>
    </div>
  )
}
