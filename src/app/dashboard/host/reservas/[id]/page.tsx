'use client'

import { useEffect, useState, use } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  ArrowLeft, CalendarDays, Clock, Users, Building2, Mail, Phone,
  CheckCircle, XCircle, FileText, Loader2, Check, MessageSquare,
} from 'lucide-react'
import { formatCurrency, formatDate, formatTime } from '@/lib/utils'
import { getHostBookingDetail, acceptBooking, rejectBooking, completeBooking } from '@/lib/actions/host'
import { STATUS_LABELS, STATUS_COLORS } from '@/lib/bookingConfig'
import { countdownLabel } from '@/lib/payments/schedule'
import { getDisputeForBooking } from '@/lib/actions/disputes'
import DisputeSection from '@/app/dashboard/(client)/reservas/[id]/DisputeSection'

type DetailData = Awaited<ReturnType<typeof getHostBookingDetail>>

export default function HostBookingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)

  const [data, setData]                   = useState<DetailData>(null)
  const [loading, setLoading]             = useState(true)
  const [actionId, setActionId]           = useState<string | null>(null)
  const [actionError, setActionError]     = useState('')
  const [showRejectForm, setShowRejectForm] = useState(false)
  const [rejectReason, setRejectReason]   = useState('')
  const [existingDispute, setExistingDispute] = useState<any>(null)

  useEffect(() => {
    let cancelled = false
    Promise.all([
      getHostBookingDetail(id),
      getDisputeForBooking(id),
    ])
      .then(([detail, dispute]) => {
        if (cancelled) return
        setData(detail)
        setExistingDispute(dispute)
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [id])

  function showError(msg: string) {
    setActionError(msg)
    setTimeout(() => setActionError(''), 4000)
  }

  async function doAccept() {
    if (!data) return
    const status = (data.booking as any).status
    if (status !== 'pending' && status !== 'quote_requested') return
    setActionId('accept')
    const r = await acceptBooking(data.booking.id)
    if ('error' in r) {
      showError(r.error ?? 'Error al aceptar')
    } else {
      setData(prev => prev ? {
        ...prev,
        booking: { ...prev.booking, status: 'accepted' as const },
      } : null)
    }
    setActionId(null)
  }

  async function doReject() {
    if (!data) return
    setActionId('reject')
    const r = await rejectBooking(data.booking.id, rejectReason || undefined)
    if ('error' in r) {
      showError(r.error ?? 'Error al rechazar')
    } else {
      setData(prev => prev ? {
        ...prev,
        booking: { ...prev.booking, status: 'rejected' as const },
      } : null)
      setShowRejectForm(false)
      setRejectReason('')
    }
    setActionId(null)
  }

  async function doComplete() {
    if (!data) return
    setActionId('complete')
    const r = await completeBooking(data.booking.id)
    if ('error' in r) {
      showError(r.error ?? 'Error al completar')
    } else {
      setData(prev => prev ? {
        ...prev,
        booking: { ...prev.booking, status: 'completed' as const },
      } : null)
    }
    setActionId(null)
  }

  // ─── Loading ─────────────────────────────────────────────────
  if (loading) return (
    <div className="flex items-center justify-center h-dvh" style={{ background: 'var(--bg-base)' }}>
      <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--brand)' }} />
    </div>
  )

  // ─── Not found ───────────────────────────────────────────────
  if (!data) return (
    <div className="flex flex-col items-center justify-center h-dvh gap-3 px-4 text-center"
      style={{ background: 'var(--bg-base)' }}>
      <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>Reserva no encontrada</p>
      <Link href="/dashboard/host/reservas"
        className="text-sm px-5 py-2.5 rounded-xl font-semibold"
        style={{ background: 'var(--brand)', color: '#fff' }}>
        Volver a mis reservas
      </Link>
    </div>
  )

  const { booking, installments } = data
  const bk      = booking as any
  const space   = bk.spaces as any
  const guest   = bk.profiles as any
  const pricing = bk.space_pricing as any
  const addons  = bk.booking_addons ?? []

  const cover   = space?.space_images?.find((i: any) => i.is_cover)?.url ?? space?.space_images?.[0]?.url
  const sc      = STATUS_COLORS[bk.status as keyof typeof STATUS_COLORS] ?? { color: '#6B7280', bg: '#F4F6F8' }
  const sl      = STATUS_LABELS[bk.status as keyof typeof STATUS_LABELS] ?? bk.status

  const totalAmount   = Number(bk.total_amount) || 0
  const platformFee   = Number(bk.platform_fee) || Math.round(totalAmount * 0.10)
  const hostNet       = Math.round(totalAmount * 0.90)
  const paidAmount    = installments
    .filter((i: any) => i.status === 'paid')
    .reduce((s: number, i: any) => s + Number(i.amount), 0)

  const allPaid   = installments.length > 0 && installments.every((i: any) => i.status === 'paid')
  const isCancelled = bk.status?.startsWith('cancelled_') || bk.status === 'rejected'

  // Razón de cancelación (puede estar en event_notes o en campo propio)
  const cancelReason = bk.reject_reason ?? bk.cancellation_reason ?? null

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 md:py-8" style={{ background: 'var(--bg-base)' }}>

      {/* Toast de error */}
      {actionError && (
        <div className="fixed top-5 left-4 right-4 md:left-auto md:right-5 md:max-w-sm z-50 flex items-center gap-2 px-4 py-3 rounded-2xl text-sm font-semibold shadow-xl"
          style={{ background: '#DC2626', color: '#fff' }}>
          ✕ {actionError}
        </div>
      )}

      {/* Header — volver + nombre espacio */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard/host/reservas"
          className="inline-flex items-center gap-1.5 text-sm font-medium shrink-0"
          style={{ color: 'var(--text-muted)' }}>
          <ArrowLeft size={15} /> Reservas
        </Link>
        <span style={{ color: 'var(--border-medium)' }}>·</span>
        <span className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
          {space?.name ?? 'Espacio'}
        </span>
      </div>

      {/* ── Hero: imagen + nombre + badge ──────────────────── */}
      <div className="rounded-3xl overflow-hidden mb-5"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
        {cover ? (
          <div className="h-52 md:h-64 overflow-hidden relative">
            <Image
              src={cover}
              alt={space?.name ?? 'Espacio'}
              fill
              priority
              sizes="(max-width: 768px) 100vw, 672px"
              className="object-cover"
            />
          </div>
        ) : (
          <div className="h-28 flex items-center justify-center"
            style={{ background: 'var(--bg-elevated)' }}>
            <Building2 size={40} style={{ color: 'var(--border-medium)' }} />
          </div>
        )}
        <div className="p-5">
          <div className="flex items-start justify-between gap-3">
            <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
              {space?.name}
            </h1>
            <span className="text-xs font-semibold px-3 py-1.5 rounded-full shrink-0"
              style={{ background: sc.bg, color: sc.color }}>
              {sl}
            </span>
          </div>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            Reserva #{bk.id?.slice(0, 8).toUpperCase()}
          </p>
        </div>
      </div>

      {/* ── Info del evento ────────────────────────────────── */}
      <div className="rounded-2xl overflow-hidden mb-4"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
        <div className="px-5 py-3.5"
          style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-elevated)' }}>
          <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
            Detalles del evento
          </p>
        </div>
        <div>
          {[
            { icon: <CalendarDays size={13} />, label: 'Fecha',    value: `${formatDate(bk.event_date)} · ${countdownLabel(bk.event_date)}` },
            bk.start_time ? { icon: <Clock size={13} />,    label: 'Horario',  value: `${formatTime(bk.start_time)} – ${formatTime(bk.end_time ?? '')}` } : null,
            { icon: <Users size={13} />,        label: 'Personas', value: String(bk.guest_count) },
            bk.event_type ? { icon: null, label: 'Tipo',    value: bk.event_type } : null,
          ].filter(Boolean).map((row: any) => (
            <div key={row.label}
              className="flex items-center gap-4 px-5 py-3"
              style={{ borderTop: '1px solid var(--border-subtle)' }}>
              <div className="flex items-center gap-1.5 shrink-0 w-24">
                {row.icon && <span style={{ color: 'var(--text-muted)' }}>{row.icon}</span>}
                <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>{row.label}</span>
              </div>
              <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{row.value}</span>
            </div>
          ))}

          {/* Contenido del paquete */}
          {pricing?.pricing_type === 'fixed_package' && pricing?.package_includes && (
            <div className="px-5 py-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
              <p className="text-xs font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>
                {pricing.package_name ? `Paquete · ${pricing.package_name}` : 'Incluye'}
              </p>
              <p className="text-xs whitespace-pre-line leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                {pricing.package_includes}
              </p>
            </div>
          )}

          {/* Notas del cliente */}
          {bk.event_notes && !bk.event_notes.startsWith('[Cotización]') && (
            <div className="px-5 py-3 text-xs italic"
              style={{ borderTop: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
              <span className="font-semibold not-italic" style={{ color: 'var(--text-secondary)' }}>Nota del cliente: </span>
              "{bk.event_notes}"
            </div>
          )}
        </div>
      </div>

      {/* ── Info del cliente ───────────────────────────────── */}
      <div className="rounded-2xl overflow-hidden mb-4"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
        <div className="px-5 py-3.5"
          style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-elevated)' }}>
          <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
            Cliente
          </p>
        </div>
        <div className="p-5">
          {/* Avatar + nombre */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-white font-bold text-base shrink-0"
              style={{ background: 'linear-gradient(135deg, var(--brand), var(--brand-dark, #22a878))' }}>
              {guest?.full_name?.charAt(0)?.toUpperCase() ?? '?'}
            </div>
            <div>
              <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                {guest?.full_name ?? 'Cliente'}
              </p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Organizador del evento</p>
            </div>
          </div>

          <div className="space-y-2.5">
            {/* Email */}
            {guest?.email && (
              <div className="flex items-center gap-2.5">
                <Mail size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                <a href={`mailto:${guest.email}`}
                  className="text-sm"
                  style={{ color: 'var(--brand)' }}>
                  {guest.email}
                </a>
              </div>
            )}

            {/* Teléfono + WhatsApp */}
            {guest?.phone && (
              <div className="flex items-center gap-2.5">
                <Phone size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                <a href={`tel:${guest.phone}`}
                  className="text-sm"
                  style={{ color: 'var(--text-secondary)' }}>
                  {guest.phone}
                </a>
                <a
                  href={`https://wa.me/${guest.phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Hola ${guest.full_name ?? ''}, te contacto por tu reserva en ${space?.name ?? 'Espot'}.`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg ml-1"
                  style={{ background: 'rgba(37,211,102,0.1)', color: '#25D366', border: '1px solid rgba(37,211,102,0.25)' }}>
                  <MessageSquare size={11} /> WhatsApp
                </a>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Estado financiero ──────────────────────────────── */}
      <div className="rounded-2xl overflow-hidden mb-4"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
        <div className="px-5 py-3.5"
          style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-elevated)' }}>
          <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
            Finanzas
          </p>
        </div>
        <div className="p-5 space-y-2.5">
          <div className="flex justify-between items-center">
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Total de la reserva</span>
            <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{formatCurrency(totalAmount)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Comisión Espot (10%)</span>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>- {formatCurrency(platformFee)}</span>
          </div>
          <div className="flex justify-between items-center pt-2"
            style={{ borderTop: '1px solid var(--border-subtle)' }}>
            <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Lo que recibirás</span>
            <span className="text-sm font-bold" style={{ color: 'var(--brand)' }}>{formatCurrency(hostNet)}</span>
          </div>
          {paidAmount > 0 && (
            <div className="flex justify-between items-center pt-1">
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Pagado hasta ahora</span>
              <span className="text-xs font-semibold" style={{ color: 'var(--brand)' }}>{formatCurrency(paidAmount)}</span>
            </div>
          )}

          {/* Payout status */}
          {bk.payout_status && (
            <div className="flex justify-between items-center pt-2"
              style={{ borderTop: '1px solid var(--border-subtle)' }}>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Estado de pago al host</span>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
                style={{
                  background: bk.payout_status === 'paid' ? 'var(--bg-elevated)' : 'rgba(217,119,6,0.1)',
                  color: bk.payout_status === 'paid' ? 'var(--brand)' : '#D97706',
                }}>
                {bk.payout_status === 'paid' ? 'Transferido' : 'Pendiente de transferir'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── Adicionales ───────────────────────────────────── */}
      {addons.length > 0 && (
        <div className="rounded-2xl overflow-hidden mb-4"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
          <div className="px-5 py-3.5"
            style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-elevated)' }}>
            <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
              Servicios adicionales
            </p>
          </div>
          <div className="p-5 space-y-2">
            {addons.map((a: any, i: number) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span style={{ color: 'var(--text-secondary)' }}>
                  {a.space_addons?.name}
                  {a.quantity > 1 && (
                    <span className="text-xs ml-1" style={{ color: 'var(--text-muted)' }}>×{a.quantity}</span>
                  )}
                </span>
                <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {formatCurrency(a.subtotal)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Plan de cuotas (solo lectura para el host) ────── */}
      {installments.length > 0 && (
        <div className="rounded-2xl overflow-hidden mb-4"
          style={{ border: '1.5px solid var(--border-subtle)' }}>
          <div className="flex items-center justify-between px-5 py-3.5"
            style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border-subtle)' }}>
            <span className="text-sm font-bold" style={{ color: 'var(--brand)' }}>Plan de cuotas</span>
            <span className="text-xs font-semibold" style={{ color: 'var(--brand)' }}>
              {installments.filter((i: any) => i.status === 'paid').length}/{installments.length} pagadas
            </span>
          </div>
          {installments.map((inst: any, i: number) => {
            const paid    = inst.status === 'paid'
            const overdue = inst.status === 'overdue'
            const isNext  = !paid && installments.slice(0, i).every((x: any) => x.status === 'paid')
            return (
              <div key={inst.id}
                className="flex items-center gap-3 px-5 py-3.5"
                style={{
                  borderBottom: i < installments.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                  background: 'var(--bg-card)',
                }}>
                {/* Indicador numérico */}
                <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold"
                  style={{
                    background: paid ? 'var(--bg-elevated)' : overdue ? 'rgba(220,38,38,0.08)' : isNext ? 'var(--bg-elevated)' : 'var(--bg-elevated)',
                    color: paid ? 'var(--brand)' : overdue ? '#DC2626' : isNext ? 'var(--brand)' : 'var(--text-muted)',
                    border: `1.5px solid ${paid ? 'var(--bg-elevated)' : overdue ? 'rgba(220,38,38,0.2)' : isNext ? 'var(--border-subtle)' : 'var(--border-medium)'}`,
                  }}>
                  {paid ? <Check size={12} /> : i + 1}
                </div>
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold"
                      style={{ color: paid ? 'var(--text-secondary)' : 'var(--text-primary)' }}>
                      {formatCurrency(Number(inst.amount))}
                    </span>
                    <span className="text-xs font-medium"
                      style={{ color: paid ? 'var(--brand)' : overdue ? '#DC2626' : isNext ? 'var(--brand)' : 'var(--text-muted)' }}>
                      {paid
                        ? `Recibido${inst.paid_at ? ' · ' + formatDate(inst.paid_at.split('T')[0]) : ''}`
                        : countdownLabel(inst.due_date)}
                    </span>
                  </div>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {inst.label ?? `Cuota ${inst.installment_number}`}
                  </p>
                </div>
              </div>
            )
          })}
          {allPaid && (
            <div className="px-5 py-3.5 flex items-center gap-2"
              style={{ borderTop: '1px solid var(--border-subtle)', background: 'var(--bg-elevated)' }}>
              <CheckCircle size={14} style={{ color: 'var(--brand)' }} />
              <span className="text-sm font-semibold" style={{ color: 'var(--brand)' }}>
                Todas las cuotas recibidas
              </span>
            </div>
          )}
        </div>
      )}

      {/* ── Contrato ─────────────────────────────────────── */}
      {(bk.status === 'confirmed' || bk.status === 'completed') && (
        <a href={`/contrato/${bk.id}`} target="_blank" rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl text-sm font-semibold mb-4 transition-all"
          style={{ background: 'var(--bg-elevated)', color: 'var(--brand)', border: '1.5px solid var(--border-subtle)' }}>
          <FileText size={15} /> Ver contrato oficial · Descargar PDF
        </a>
      )}

      {/* ── Razón de cancelación ─────────────────────────── */}
      {isCancelled && cancelReason && (
        <div className="rounded-2xl p-4 mb-4"
          style={{ background: 'rgba(220,38,38,0.04)', border: '1px solid rgba(220,38,38,0.15)' }}>
          <p className="text-xs font-semibold mb-1" style={{ color: '#DC2626' }}>Motivo de cancelación</p>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{cancelReason}</p>
        </div>
      )}

      {/* ── Acciones según estado ─────────────────────────── */}
      {bk.status === 'pending' && !showRejectForm && (
        <div className="flex gap-3 mb-4">
          <button
            onClick={doAccept}
            disabled={!!actionId}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-bold transition-all disabled:opacity-50"
            style={{ background: 'var(--brand)', color: '#fff' }}>
            {actionId === 'accept'
              ? <><Loader2 size={15} className="animate-spin" /> Aceptando...</>
              : <><CheckCircle size={15} /> Aceptar reserva</>}
          </button>
          <button
            onClick={() => setShowRejectForm(true)}
            disabled={!!actionId}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-bold transition-all disabled:opacity-50"
            style={{ background: 'rgba(220,38,38,0.08)', color: '#DC2626', border: '1.5px solid rgba(220,38,38,0.2)' }}>
            <XCircle size={15} /> Rechazar
          </button>
        </div>
      )}

      {/* Formulario de rechazo */}
      {bk.status === 'pending' && showRejectForm && (
        <div className="rounded-2xl overflow-hidden mb-4"
          style={{ background: 'rgba(220,38,38,0.03)', border: '1.5px solid rgba(220,38,38,0.2)' }}>
          <div className="px-5 py-4" style={{ borderBottom: '1px solid rgba(220,38,38,0.12)' }}>
            <p className="text-sm font-semibold" style={{ color: '#DC2626' }}>Confirmar rechazo</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              El cliente será notificado por email.
            </p>
          </div>
          <div className="p-5 space-y-3">
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                Motivo (opcional)
              </label>
              <textarea
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                placeholder="Ej: No tenemos disponibilidad para esa fecha"
                rows={3}
                className="w-full text-sm px-4 py-3 rounded-xl resize-none focus:outline-none"
                style={{
                  background: 'var(--bg-elevated)',
                  border: '1.5px solid var(--border-medium)',
                  color: 'var(--text-primary)',
                  fontSize: 16,
                }}
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={doReject}
                disabled={!!actionId}
                className="flex-1 flex items-center justify-center gap-2 text-sm font-bold py-3 rounded-xl disabled:opacity-50"
                style={{ background: '#DC2626', color: '#fff' }}>
                {actionId === 'reject'
                  ? <><Loader2 size={14} className="animate-spin" /> Enviando...</>
                  : 'Confirmar rechazo'}
              </button>
              <button
                onClick={() => { setShowRejectForm(false); setRejectReason('') }}
                className="px-4 py-3 text-sm rounded-xl"
                style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Estado: esperando pago */}
      {bk.status === 'accepted' && (
        <div className="rounded-2xl px-4 py-4 mb-4 flex items-center gap-3"
          style={{ background: 'var(--bg-elevated)', border: '1px solid var(--bg-elevated)' }}>
          <Loader2 size={15} style={{ color: 'var(--brand)', flexShrink: 0 }} className="animate-spin" />
          <p className="text-sm" style={{ color: 'var(--text-primary)' }}>
            Esperando que el cliente realice el primer pago.
          </p>
        </div>
      )}

      {/* Acción: marcar completado */}
      {bk.status === 'confirmed' && (
        <button
          onClick={doComplete}
          disabled={!!actionId}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-bold mb-4 transition-all disabled:opacity-50"
          style={{ background: 'rgba(124,58,237,0.1)', color: '#7C3AED', border: '1.5px solid rgba(124,58,237,0.2)' }}>
          {actionId === 'complete'
            ? <><Loader2 size={15} className="animate-spin" /> Procesando...</>
            : <><CheckCircle size={15} /> Marcar evento como completado</>}
        </button>
      )}

      {/* ── Sección de disputa ────────────────────────────── */}
      <DisputeSection
        bookingId={bk.id}
        bookingStatus={bk.status}
        existingDispute={existingDispute}
        onDisputeOpened={(disputeId) => setExistingDispute({ id: disputeId, status: 'abierta' })}
      />

      {/* ── Botón volver ──────────────────────────────────── */}
      <div className="mt-6">
        <Link href="/dashboard/host/reservas"
          className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl text-sm font-semibold"
          style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}>
          <ArrowLeft size={15} /> Volver a reservas
        </Link>
      </div>
    </div>
  )
}
