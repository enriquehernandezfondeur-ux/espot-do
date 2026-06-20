'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { CreditCard, CheckCircle, Clock, Loader2, Receipt, AlertCircle, Printer, X } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'
import { getClientPagosData } from '@/lib/actions/client'
import { LoadError } from '@/components/LoadError'

// ── Comprobante modal ────────────────────────────────────────
type ComprobanteData = { inst: any; booking: any; totalInstallments: number; userName: string }

function ComprobanteModal({ data, onClose }: { data: ComprobanteData; onClose: () => void }) {
  const ref = data.inst.id.replace(/-/g, '').slice(-8).toUpperCase()
  return (
    <>
      {/* Print-only styles */}
      <style>{`@media print { body > *:not(#comprobante-print) { display: none !important; } #comprobante-print { position: static !important; background: white !important; } }`}</style>
      <div id="comprobante-print"
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
        onClick={onClose}>
        <div className="w-full max-w-[340px] rounded-3xl overflow-hidden shadow-2xl"
          style={{ background: '#fff' }}
          onClick={e => e.stopPropagation()}>

          {/* Header verde */}
          <div className="px-6 py-5 text-center relative"
            style={{ background: 'linear-gradient(135deg, #35C493 0%, #1a9e70 100%)' }}>
            <button onClick={onClose}
              className="absolute top-3 right-3 p-1 rounded-full print:hidden"
              style={{ color: 'rgba(255,255,255,0.7)' }}>
              <X size={16} />
            </button>
            <img src="/logo-green.svg" alt="Espot" className="h-5 mx-auto mb-3 brightness-0 invert" />
            <div className="text-white font-bold text-lg">Comprobante de Pago</div>
            <div className="mt-1 text-xs font-mono px-2 py-0.5 rounded-full inline-block"
              style={{ background: 'rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.9)' }}>
              #ESP-{ref}
            </div>
          </div>

          {/* Datos */}
          <div className="px-6 py-5">
            <div className="space-y-3 mb-5">
              {[
                { label: 'Cliente',      value: data.userName || '—' },
                { label: 'Espacio',      value: (data.booking.spaces as any)?.name ?? '—' },
                { label: 'Evento',       value: data.booking.event_type ? `${data.booking.event_type} · ${formatDate(data.booking.event_date)}` : formatDate(data.booking.event_date) },
                { label: 'Cuota',        value: `${data.inst.installment_number} de ${data.totalInstallments}` },
                { label: 'Fecha de pago', value: data.inst.paid_at ? formatDate(data.inst.paid_at) : '—' },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between items-start gap-4">
                  <span className="text-sm shrink-0" style={{ color: '#6B7280' }}>{label}</span>
                  <span className="text-sm font-semibold text-right" style={{ color: '#0F1623' }}>{value}</span>
                </div>
              ))}
            </div>

            {/* Monto */}
            <div className="text-center py-4 mb-4 rounded-2xl" style={{ background: 'rgba(53,196,147,0.07)', border: '1px dashed rgba(53,196,147,0.4)' }}>
              <div className="text-xs font-medium mb-1" style={{ color: '#6B7280' }}>Monto pagado</div>
              <div className="text-3xl font-bold" style={{ color: '#35C493', letterSpacing: '-0.03em' }}>
                {formatCurrency(Number(data.inst.amount))}
              </div>
            </div>

            <div className="text-[10px] text-center mb-4" style={{ color: '#9CA3AF' }}>
              Espot · espot.do · contacto@espot.do
            </div>

            <button onClick={() => window.print()}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl font-semibold text-sm print:hidden"
              style={{ background: '#0F1623', color: '#fff' }}>
              <Printer size={14} /> Imprimir / Guardar PDF
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

// ── Urgency helpers ──────────────────────────────────────────
function daysUntil(dateStr: string) {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  return Math.ceil((new Date(dateStr + 'T12:00').getTime() - today.getTime()) / 86400000)
}
function urgencyColor(days: number) {
  if (days < 0)  return '#DC2626'
  if (days <= 3) return '#DC2626'
  if (days <= 7) return '#D97706'
  return '#2563EB'
}
function urgencyLabel(days: number) {
  if (days < 0)  return `Venció hace ${Math.abs(days)} día${Math.abs(days) !== 1 ? 's' : ''}`
  if (days === 0) return 'Vence hoy'
  if (days === 1) return 'Vence mañana'
  return `Vence en ${days} días`
}

// ── Page ─────────────────────────────────────────────────────
export default function PagosPage() {
  const [pagosData, setPagosData] = useState<Awaited<ReturnType<typeof getClientPagosData>>>(null)
  const [loading, setLoading]     = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [comprobante, setComprobante] = useState<ComprobanteData | null>(null)

  function load() {
    setLoading(true)
    setLoadError(false)
    getClientPagosData()
      .then(d => { setPagosData(d); setLoading(false) })
      .catch(() => { setLoadError(true); setLoading(false) })
  }
  useEffect(() => { load() }, [])

  if (loading) return (
    <div className="flex items-center justify-center h-dvh">
      <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--brand)' }} />
    </div>
  )

  if (loadError) return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <div className="mb-5 md:mb-8">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Pagos</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Historial de cuotas y comprobantes</p>
      </div>
      <div className="rounded-3xl" style={{ background: '#fff', border: '1px solid var(--border-subtle)' }}>
        <LoadError message="No pudimos cargar tus pagos." onRetry={load} />
      </div>
    </div>
  )

  const { installments = [], bookingMap = {}, userName = '' } = pagosData ?? {}

  const pending = installments.filter(i => i.status === 'pending' || i.status === 'overdue')
  const paid    = installments.filter(i => i.status === 'paid')

  // Summary KPIs
  const totalPaid      = paid.reduce((s, i) => s + Number(i.amount), 0)
  const totalPending   = pending.reduce((s, i) => s + Number(i.amount), 0)
  const nextDueDate    = pending.sort((a, b) => a.due_date.localeCompare(b.due_date))[0]?.due_date

  // Total installments per booking (for comprobante "X de Y")
  const totalByBooking: Record<string, number> = {}
  for (const i of installments) {
    totalByBooking[i.booking_id] = (totalByBooking[i.booking_id] ?? 0) + 1
  }

  function openComprobante(inst: any) {
    const booking = bookingMap[inst.booking_id]
    if (!booking) return
    setComprobante({ inst, booking, totalInstallments: totalByBooking[inst.booking_id] ?? 1, userName })
  }

  if (installments.length === 0 && !loading) return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <div className="mb-5 md:mb-8">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Pagos</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Historial de cuotas y comprobantes</p>
      </div>
      <div className="flex flex-col items-center justify-center py-20 rounded-3xl text-center"
        style={{ background: '#fff', border: '2px dashed var(--border-medium)' }}>
        <Receipt size={32} className="mb-3" style={{ color: 'var(--text-muted)' }} />
        <p className="font-medium" style={{ color: 'var(--text-primary)' }}>Sin pagos registrados</p>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Aquí verás tus cuotas cuando reserves un espacio</p>
      </div>
    </div>
  )

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      {comprobante && <ComprobanteModal data={comprobante} onClose={() => setComprobante(null)} />}

      {/* Header */}
      <div className="mb-5 md:mb-8">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Pagos</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Cuotas, historial y comprobantes</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3 mb-7">
        {[
          { label: 'Total pagado',      value: formatCurrency(totalPaid),    color: 'var(--brand)', icon: CheckCircle },
          { label: 'Por pagar',         value: formatCurrency(totalPending), color: '#D97706',       icon: Clock },
          { label: 'Próx. vencimiento', value: nextDueDate ? formatDate(nextDueDate, { day: 'numeric', month: 'short' }) : '—', color: '#2563EB', icon: CreditCard },
        ].map(({ label, value, color, icon: Icon }) => (
          <div key={label} className="rounded-2xl p-4"
            style={{ background: '#fff', border: '1px solid var(--border-subtle)', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            <div className="flex items-center gap-1.5 mb-2">
              <Icon size={11} style={{ color }} />
              <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{label}</span>
            </div>
            <div className="text-base md:text-xl font-bold tabular-nums" style={{ color }}>{value}</div>
          </div>
        ))}
      </div>

      {/* ── POR PAGAR ─────────────────────────────────────── */}
      {pending.length > 0 && (
        <div className="mb-7">
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>Por pagar</h2>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(220,38,38,0.08)', color: '#DC2626' }}>
              {pending.length}
            </span>
          </div>
          <div className="rounded-2xl overflow-hidden"
            style={{ background: '#fff', border: '1px solid var(--border-subtle)', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            <div className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
              {pending
                .sort((a, b) => a.due_date.localeCompare(b.due_date))
                .map(inst => {
                  const booking = bookingMap[inst.booking_id] as any
                  const space   = booking?.spaces as any
                  const days    = daysUntil(inst.due_date)
                  const color   = urgencyColor(days)
                  const isOverdue = inst.status === 'overdue' || days < 0
                  return (
                    <div key={inst.id} className="flex items-center gap-3 px-4 py-4">
                      {/* Urgency dot */}
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                        style={{ background: `${color}14` }}>
                        {isOverdue
                          ? <AlertCircle size={15} style={{ color }} />
                          : <Clock size={15} style={{ color }} />
                        }
                      </div>
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm truncate" style={{ color: 'var(--text-primary)' }}>
                          {space?.name ?? '—'}
                        </div>
                        <div className="text-xs mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                          <span style={{ color }}>{urgencyLabel(days)}</span>
                          <span style={{ color: 'var(--border-medium)' }}>·</span>
                          <span style={{ color: 'var(--text-muted)' }}>Cuota {inst.installment_number} de {totalByBooking[inst.booking_id] ?? '?'}</span>
                          {booking?.event_date && (
                            <>
                              <span style={{ color: 'var(--border-medium)' }}>·</span>
                              <span style={{ color: 'var(--text-muted)' }}>Evento {formatDate(booking.event_date, { day: 'numeric', month: 'short' })}</span>
                            </>
                          )}
                        </div>
                      </div>
                      {/* Amount + CTA */}
                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <span className="font-bold text-sm tabular-nums" style={{ color: 'var(--text-primary)' }}>
                          {formatCurrency(Number(inst.amount))}
                        </span>
                        <Link href={`/pago/${inst.booking_id}`}
                          className="text-xs font-bold px-3 py-1.5 rounded-xl"
                          style={{ background: color, color: '#fff', whiteSpace: 'nowrap' }}>
                          Pagar →
                        </Link>
                      </div>
                    </div>
                  )
                })}
            </div>
          </div>
        </div>
      )}

      {/* ── HISTORIAL ─────────────────────────────────────── */}
      {paid.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>Historial</h2>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(22,163,74,0.08)', color: '#16A34A' }}>
              {paid.length}
            </span>
          </div>
          <div className="rounded-2xl overflow-hidden"
            style={{ background: '#fff', border: '1px solid var(--border-subtle)', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            <div className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
              {paid
                .sort((a, b) => (b.paid_at ?? '').localeCompare(a.paid_at ?? ''))
                .map(inst => {
                  const booking = bookingMap[inst.booking_id] as any
                  const space   = booking?.spaces as any
                  return (
                    <div key={inst.id} className="flex items-center gap-3 px-4 py-4">
                      {/* Check */}
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                        style={{ background: 'rgba(22,163,74,0.08)' }}>
                        <CheckCircle size={15} style={{ color: '#16A34A' }} />
                      </div>
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm truncate" style={{ color: 'var(--text-primary)' }}>
                          {space?.name ?? '—'}
                        </div>
                        <div className="text-xs mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5" style={{ color: 'var(--text-muted)' }}>
                          <span>Cuota {inst.installment_number} de {totalByBooking[inst.booking_id] ?? '?'}</span>
                          {inst.paid_at && (
                            <>
                              <span style={{ color: 'var(--border-medium)' }}>·</span>
                              <span>Pagado {formatDate(inst.paid_at, { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                            </>
                          )}
                        </div>
                      </div>
                      {/* Amount + comprobante */}
                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <span className="font-bold text-sm tabular-nums" style={{ color: '#16A34A' }}>
                          {formatCurrency(Number(inst.amount))}
                        </span>
                        <button onClick={() => openComprobante(inst)}
                          className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-xl transition-all"
                          style={{ background: 'rgba(37,99,235,0.07)', color: '#2563EB' }}>
                          <Receipt size={11} /> Comprobante
                        </button>
                      </div>
                    </div>
                  )
                })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
