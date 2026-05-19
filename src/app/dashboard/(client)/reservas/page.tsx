'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { CalendarDays, Clock, Users, MapPin, ChevronRight, Loader2, Search, CreditCard, CheckCircle, X, AlertTriangle, Building2, Star, MessageCircle, ExternalLink, Bell, Check } from 'lucide-react'
import { formatCurrency, formatDate, formatTime } from '@/lib/utils'
import { getClientBookings } from '@/lib/actions/client'
import { STATUS_LABELS, STATUS_COLORS, isPaid } from '@/lib/bookingConfig'
import { cn } from '@/lib/utils'
import { submitReview, getUserReviewedBookings } from '@/lib/actions/reviews'
import { cancelBooking, rejectQuotation, type RefundBankInfo } from '@/lib/actions/booking'
import { getInstallments, type BookingInstallment } from '@/lib/actions/installments'
import { countdownLabel } from '@/lib/payments/schedule'

type Booking = Awaited<ReturnType<typeof getClientBookings>>[0]

const FILTERS = ['Todas', 'Pendientes', 'Cotizaciones', 'Por pagar', 'Confirmadas', 'Completadas', 'Canceladas']

// Helper: etiqueta e info del tipo de precio
function getPricingLabel(pricing: any): { label: string; detail: string; color: string; bg: string } | null {
  if (!pricing) return null
  const p = pricing
  switch (p.pricing_type) {
    case 'hourly':
      return { label: 'Por hora', detail: p.hourly_price ? formatCurrency(p.hourly_price) + '/hr' : '', color: 'var(--text-secondary)', bg: 'var(--bg-elevated)' }
    case 'minimum_consumption':
      return { label: 'Consumibles', detail: p.minimum_consumption ? 'Desde ' + formatCurrency(p.minimum_consumption) : '', color: 'var(--text-secondary)', bg: 'var(--bg-elevated)' }
    case 'fixed_package':
      return { label: p.package_name ?? 'Paquete fijo', detail: p.fixed_price ? formatCurrency(p.fixed_price) : '', color: 'var(--text-secondary)', bg: 'var(--bg-elevated)' }
    case 'custom_quote':
      return { label: 'Cotización', detail: 'Precio personalizado', color: 'var(--text-secondary)', bg: 'var(--bg-elevated)' }
    default:
      return null
  }
}

export default function MisReservasPage() {
  const [bookings, setBookings]   = useState<Booking[]>([])
  const [loading, setLoading]     = useState(true)
  const [filter, setFilter]       = useState('Todas')
  const [search, setSearch]       = useState('')
  const [reviewFor, setReviewFor] = useState<string | null>(null) // bookingId activo
  const [hoverStar, setHoverStar] = useState(0)
  const [rating, setRating]       = useState(0)
  const [comment, setComment]     = useState('')
  const [reviewed, setReviewed]   = useState<Set<string>>(new Set())
  const [submitting, setSubmitting]   = useState(false)
  const [reviewError, setReviewError] = useState('')
  const [selected, setSelected]       = useState<Booking | null>(null)
  const [cancelModal, setCancelModal] = useState<Booking | null>(null)
  const [cancelStep, setCancelStep]   = useState<1 | 2>(1)
  const [cancelReason, setCancelReason] = useState('')
  const [cancelling, setCancelling]   = useState(false)
  const [cancelError, setCancelError] = useState('')
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [refundBank, setRefundBank]   = useState<RefundBankInfo>({ holderName: '', bank: '', accountNumber: '', accountType: 'ahorro' })
  const [installments, setInstallments] = useState<BookingInstallment[]>([])
  const router = useRouter()

  const cancelHasPaid = cancelModal ? isPaid((cancelModal as any).payment_status) : false

  function openCancelModal(bk: Booking) {
    setCancelModal(bk)
    setCancelStep(1)
    setCancelReason('')
    setRefundBank({ holderName: '', bank: '', accountNumber: '', accountType: 'ahorro' })
  }

  function closeCancelModal() {
    setCancelModal(null)
    setCancelStep(1)
    setCancelReason('')
    setRefundBank({ holderName: '', bank: '', accountNumber: '', accountType: 'ahorro' })
  }

  async function handleCancel() {
    if (!cancelModal) return
    setCancelling(true)
    setCancelError('')
    const bankInfo = cancelHasPaid && refundBank.accountNumber ? refundBank : undefined
    const result = await cancelBooking(cancelModal.id, cancelReason || undefined, bankInfo)
    if ('error' in result) {
      setCancelError(result.error ?? 'No se pudo cancelar la reserva')
      setCancelling(false)
      return
    }
    setBookings(prev => prev.map(b =>
      b.id === cancelModal.id ? { ...b, status: 'cancelled_guest' as any } : b
    ))
    if (selected?.id === cancelModal.id)
      setSelected((prev: Booking | null) => prev ? { ...prev, status: 'cancelled_guest' as any } : null)
    setCancelling(false)
    closeCancelModal()
  }

  async function handleRejectQuotation(bk: Booking) {
    const confirmed = window.confirm('¿Rechazar esta cotización? No podrás deshacer esta acción.')
    if (!confirmed) return
    setRejectingId(bk.id)
    const result = await rejectQuotation(bk.id)
    setRejectingId(null)
    if ('error' in result) {
      alert(result.error ?? 'No se pudo rechazar la cotización')
      return
    }
    setBookings(prev => prev.map(b =>
      b.id === bk.id ? { ...b, status: 'cancelled_guest' as any } : b
    ))
    if (selected?.id === bk.id)
      setSelected((prev: Booking | null) => prev ? { ...prev, status: 'cancelled_guest' as any } : null)
  }

  useEffect(() => {
    Promise.all([
      getClientBookings(),
      getUserReviewedBookings(),
    ]).then(([bookingsData, reviewedIds]) => {
      setBookings(bookingsData)
      setReviewed(reviewedIds)
      setLoading(false)
      // Auto-expandir la próxima reserva activa al cargar
      const todayStr = new Date().toISOString().split('T')[0]
      const ACTIVE = ['pending', 'quote_requested', 'accepted', 'confirmed']
      const next = bookingsData
        .filter(b => b.event_date >= todayStr && ACTIVE.includes(b.status))
        .sort((a, b) => a.event_date.localeCompare(b.event_date))[0]
      if (next) {
        setSelected(next as any)
        if (['accepted', 'confirmed'].includes(next.status)) {
          getInstallments(next.id).then(setInstallments).catch(() => {})
        }
      }
    }).catch(() => setLoading(false))
  }, [])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && cancelModal) closeCancelModal()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [cancelModal])

  const today = new Date().toISOString().split('T')[0]

  const filtered = bookings
    .filter(b => {
      const matchFilter =
        filter === 'Todas'         ||
        (filter === 'Pendientes'   && b.status === 'pending') ||
        (filter === 'Cotizaciones' && b.status === 'quote_requested') ||
        (filter === 'Por pagar'    && b.status === 'accepted') ||
        (filter === 'Confirmadas'  && b.status === 'confirmed') ||
        (filter === 'Completadas'  && b.status === 'completed') ||
        (filter === 'Canceladas'   && b.status.startsWith('cancelled'))
      const matchSearch =
        ((b as any).spaces?.name ?? '').toLowerCase().includes(search.toLowerCase()) ||
        (b.event_type ?? '').toLowerCase().includes(search.toLowerCase())
      return matchFilter && matchSearch
    })
    .sort((a, b) => {
      // Prioridad 1: activas y futuras (más próximas primero)
      const ACTIVE = ['pending', 'quote_requested', 'accepted', 'confirmed']
      const aUpcoming = a.event_date >= today && ACTIVE.includes(a.status)
      const bUpcoming = b.event_date >= today && ACTIVE.includes(b.status)
      if (aUpcoming && !bUpcoming) return -1
      if (!aUpcoming && bUpcoming) return 1
      if (aUpcoming && bUpcoming) return a.event_date.localeCompare(b.event_date) // más próxima primero
      // Prioridad 2: el resto — más reciente primero
      return b.event_date.localeCompare(a.event_date)
    })

  // Primera reserva activa y futura (la "próxima")
  const nextActiveId = filtered.find(b =>
    b.event_date >= today && ['pending', 'quote_requested', 'accepted', 'confirmed'].includes(b.status)
  )?.id ?? null

  // Redirige al flujo de pago Azul — no se procesa aquí directamente
  function handlePay(bookingId: string) {
    router.push(`/pago/${bookingId}`)
  }

  // Cuántas reservas están esperando pago
  const pendingPayment = bookings.filter(b => b.status === 'accepted').length

  if (loading) return (
    <div className="flex items-center justify-center h-dvh">
      <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--brand)' }} />
    </div>
  )

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      <div className="mb-5 md:mb-8">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Mis reservas</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          {bookings.length} reserva{bookings.length !== 1 ? 's' : ''} en total
          {pendingPayment > 0 && (
            <span className="ml-2 font-semibold" style={{ color: '#03313C' }}>
              · {pendingPayment} esperan tu pago
            </span>
          )}
        </p>
      </div>

      {/* Alerta de pago pendiente */}
      {pendingPayment > 0 && (() => {
        const firstPending = bookings.find(b => b.status === 'accepted')
        return (
          <div className="mb-6 rounded-2xl px-5 py-4 flex items-center gap-4"
            style={{ background: 'rgba(3,49,60,0.04)', border: '1.5px solid rgba(3,49,60,0.18)' }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'rgba(3,49,60,0.08)' }}>
              <Bell size={16} style={{ color: '#03313C' }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm" style={{ color: '#03313C' }}>
                ¡Tu reserva fue aceptada!
              </div>
              <div className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                Completa el pago para confirmar tu fecha.
              </div>
            </div>
            {firstPending && (
              <Link href={`/pago/${firstPending.id}`}
                className="text-xs font-bold px-4 py-2.5 rounded-xl shrink-0"
                style={{ background: '#03313C', color: '#fff', whiteSpace: 'nowrap' }}>
                Pagar ahora
              </Link>
            )}
          </div>
        )
      })()}

      {/* Filtros */}
      <div className="space-y-2 mb-5 md:mb-6">
        {/* Pills de filtro — scroll horizontal en mobile, sin stacking */}
        <div className="flex gap-1 p-1 rounded-2xl overflow-x-auto scrollbar-hide" style={{ background: 'var(--bg-elevated)' }}>
          {FILTERS.map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className="px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0"
              style={filter === f
                ? { background: '#fff', color: 'var(--text-primary)', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }
                : { color: 'var(--text-secondary)', background: 'transparent' }}>
              {f}
            </button>
          ))}
        </div>
        {/* Búsqueda — siempre en su propia fila para no causar layout shift */}
        <div className="flex items-center gap-2 rounded-xl px-4 py-2.5 input-base">
          <Search size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar reserva..."
            className="bg-transparent text-sm focus:outline-none flex-1"
            style={{ color: 'var(--text-primary)', fontSize: 16 }} />
          {search && (
            <button onClick={() => setSearch('')} style={{ color: 'var(--text-muted)', flexShrink: 0 }}>
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 rounded-3xl text-center"
          style={{ background: '#fff', border: '2px dashed var(--border-medium)' }}>
          <CalendarDays size={32} className="mb-3" style={{ color: 'var(--text-muted)' }} />
          <p className="font-medium mb-1" style={{ color: 'var(--text-primary)' }}>Sin reservas</p>
          <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
            {filter === 'Todas' ? 'Aún no has hecho ninguna reserva' : `No tienes reservas ${filter.toLowerCase()}`}
          </p>
          <Link href="/buscar" className="btn-brand text-sm font-semibold px-5 py-2.5 rounded-xl">
            Explorar espacios
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((bk: any) => {
            const sc    = STATUS_COLORS[bk.status as keyof typeof STATUS_COLORS] ?? { color: '#6B7280', bg: '#F4F6F8' }
            const sl    = STATUS_LABELS[bk.status as keyof typeof STATUS_LABELS] ?? bk.status
            const space = bk.spaces
            const cover = space?.space_images?.find((i: any) => i.is_cover)?.url ?? space?.space_images?.[0]?.url
            const isSelected  = selected?.id === bk.id
            const isNextActive = bk.id === nextActiveId  // es la próxima reserva activa

            return (
              <div key={bk.id} className="rounded-2xl overflow-hidden transition-all"
                style={{ background: '#fff', border: `1.5px solid ${isSelected ? 'var(--brand)' : isNextActive ? 'rgba(3,49,60,0.25)' : bk.status === 'accepted' ? 'rgba(3,49,60,0.2)' : 'var(--border-subtle)'}` }}>

                {/* Banner "Tu próxima reserva" */}
                {isNextActive && (
                  <div className="flex items-center gap-1.5 px-4 py-2"
                    style={{ background: 'rgba(3,49,60,0.04)', borderBottom: '1px solid rgba(3,49,60,0.10)' }}>
                    <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#03313C', flexShrink: 0 }} />
                    <span className="text-xs font-bold" style={{ color: '#03313C' }}>
                      {(() => {
                        const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1)
                        const tomorrowStr = tomorrow.toISOString().split('T')[0]
                        if (bk.event_date === today) return 'Tu próxima reserva — ¡Hoy!'
                        if (bk.event_date === tomorrowStr) return 'Tu próxima reserva — Mañana'
                        const days = Math.round((new Date(bk.event_date + 'T12:00').getTime() - new Date(today + 'T12:00').getTime()) / 86400000)
                        return `Tu próxima reserva — en ${days} día${days !== 1 ? 's' : ''}`
                      })()}
                    </span>
                  </div>
                )}

                <button className="w-full text-left" onClick={() => {
                  const next = isSelected ? null : bk
                  setSelected(next)
                  setInstallments([])
                  if (next && (next.status === 'accepted' || next.status === 'confirmed')) {
                    const targetId = next.id
                    getInstallments(targetId).then(data => {
                      setSelected((prev: Booking | null) => prev?.id === targetId ? prev : null)
                      setInstallments(data)
                    }).catch(() => {})
                  }
                }}>
                  <div className="flex items-center gap-3 p-4">
                    {/* Imagen */}
                    <div className="w-16 h-14 md:w-20 md:h-16 rounded-xl overflow-hidden shrink-0" style={{ background: 'var(--bg-elevated)' }}>
                      {cover
                        ? <img src={cover} alt={space?.name} className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center" style={{ color: 'var(--text-muted)' }}><Building2 size={24} /></div>}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      {/* Nombre + estado */}
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <div className="font-semibold text-sm leading-tight truncate" style={{ color: 'var(--text-primary)' }}>
                            {space?.name}
                          </div>
                          {space?.slug && (
                            <Link href={`/espacios/${space.slug}`}
                              onClick={e => e.stopPropagation()}
                              className="shrink-0 w-5 h-5 flex items-center justify-center rounded"
                              style={{ color: 'var(--text-muted)' }}
                              title="Ver espacio">
                              <ExternalLink size={11} />
                            </Link>
                          )}
                        </div>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full shrink-0"
                          style={{ background: sc.bg, color: sc.color }}>
                          {sl}
                        </span>
                      </div>
                      {/* Ubicación + tipo de precio */}
                      <div className="flex items-start gap-1 text-xs mb-1.5" style={{ color: 'var(--text-muted)' }}>
                        <MapPin size={10} className="shrink-0 mt-0.5" />
                        <span>
                          {space?.address ? `${space.address}, ` : ''}{space?.sector ? `${space.sector}, ` : ''}{space?.city}
                        </span>
                      </div>
                      {/* Badge pricing */}
                      {(() => {
                        const pl = getPricingLabel((bk as any).space_pricing)
                        if (!pl) return null
                        return (
                          <div className="flex items-center gap-1.5 mb-2">
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-md"
                              style={{ background: pl.bg, color: pl.color }}>
                              {pl.label}
                            </span>
                            {pl.detail && (
                              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{pl.detail}</span>
                            )}
                          </div>
                        )
                      })()}
                      {/* Meta: fecha + hora + monto en fila */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
                            <CalendarDays size={10} /> {formatDate(bk.event_date)}
                          </span>
                          {bk.start_time && bk.end_time && (
                            <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
                              <Clock size={10} /> {formatTime(bk.start_time)} – {formatTime(bk.end_time)}
                            </span>
                          )}
                          <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
                            <Users size={10} /> {bk.guest_count}
                          </span>
                        </div>
                        <span className="font-bold text-sm shrink-0" style={{ color: 'var(--text-primary)' }}>
                          {formatCurrency(Number(bk.total_amount))}
                        </span>
                      </div>
                    </div>
                    <ChevronRight size={15}
                      className={cn('shrink-0 transition-transform', isSelected && 'rotate-90')}
                      style={{ color: 'var(--text-muted)' }} />
                  </div>
                </button>

                {/* ── CTA de pago cuando está aceptada y NO ha pagado aún ── */}
                {/* Solo cuando la tarjeta está colapsada — al expandir el detalle también lo muestra */}
                {bk.status === 'accepted' && !isPaid(bk.payment_status) && !isSelected && (
                  <div className="mx-4 mb-4 px-4 py-4 rounded-2xl"
                    style={{ background: 'rgba(3,49,60,0.03)', border: '1px solid rgba(3,49,60,0.14)' }}>
                    <div className="mb-3">
                      {/* Diferenciar cotización respondida de reserva normal aceptada */}
                      {(bk as any).event_notes?.startsWith('[Cotización]') ? (
                        <>
                          <div className="text-sm font-semibold" style={{ color: '#03313C' }}>
                            Cotización respondida — precio confirmado
                          </div>
                          <div className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                            El propietario fijó el precio en {formatCurrency(Number(bk.total_amount))}. Paga la primera cuota para reservar.
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="text-sm font-semibold" style={{ color: '#03313C' }}>
                            El propietario aceptó tu reserva
                          </div>
                          <div className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                            Completa el pago para confirmar tu fecha
                          </div>
                        </>
                      )}
                    </div>
                    <button
                      onClick={() => handlePay(bk.id)}
                      className="w-full flex items-center justify-center gap-1.5 text-sm font-bold px-4 py-3 rounded-xl transition-all"
                      style={{ background: '#03313C', color: '#fff', boxShadow: '0 2px 8px rgba(3,49,60,0.2)' }}>
                      <CreditCard size={15} /> Pagar primera cuota →
                    </button>
                    {(bk as any).event_notes?.startsWith('[Cotización]') && (
                      <button
                        onClick={() => handleRejectQuotation(bk)}
                        disabled={rejectingId === bk.id}
                        className="w-full flex items-center justify-center gap-1.5 text-xs font-semibold px-4 py-2.5 rounded-xl transition-all disabled:opacity-50 mt-2"
                        style={{ background: 'rgba(220,38,38,0.06)', color: '#DC2626', border: '1px solid rgba(220,38,38,0.2)' }}>
                        {rejectingId === bk.id ? <><Loader2 size={13} className="animate-spin" /> Rechazando...</> : <><X size={13} /> Rechazar precio</>}
                      </button>
                    )}
                  </div>
                )}

                {/* ── Detalle expandido ── */}
                {isSelected && (
                  <div className="px-5 pb-5 pt-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>

                    {/* Fila rápida: tipo evento + horario + personas + precio + total */}
                    <div className="flex items-center gap-2 mb-4 flex-wrap">
                      {bk.start_time && bk.end_time && (
                        <span className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full"
                          style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)' }}>
                          <Clock size={11} /> {formatTime(bk.start_time)} – {formatTime(bk.end_time)}
                        </span>
                      )}
                      {bk.event_type && (
                        <span className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full"
                          style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}>
                          {bk.event_type}
                        </span>
                      )}
                      <span className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full"
                        style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}>
                        <Users size={11} /> {bk.guest_count} personas
                      </span>
                      {/* Tipo de precio */}
                      {(() => {
                        const pl = getPricingLabel((bk as any).space_pricing)
                        if (!pl) return null
                        return (
                          <span className="text-xs font-semibold px-3 py-1.5 rounded-full"
                            style={{ background: pl.bg, color: pl.color }}>
                            {pl.label}{pl.detail ? ` · ${pl.detail}` : ''}
                          </span>
                        )
                      })()}
                      <span className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full ml-auto"
                        style={{ background: 'var(--bg-elevated)', color: isPaid(bk.payment_status) ? '#16A34A' : 'var(--text-primary)', border: '1px solid var(--border-subtle)' }}>
                        {formatCurrency(Number(bk.total_amount))} total
                      </span>
                    </div>

                    {/* Layout principal: plan de pagos + info secundaria */}
                    <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 items-start">
                      {/* Plan de pagos — columna principal */}
                      <div className="min-w-0">

                      {/* ── Plan de pagos ── */}
                      {isSelected && installments.length > 0 && (() => {
                        const nextInst  = installments.find(i => i.status !== 'paid')
                        const paidCount = installments.filter(i => i.status === 'paid').length
                        const allPaid   = paidCount === installments.length
                        const isOD      = nextInst?.status === 'overdue'

                        return (
                          <div className="mt-3 rounded-2xl overflow-hidden"
                            style={{ border: '1px solid var(--border-subtle)' }}>

                            <div className="flex items-center justify-between px-4 py-3"
                              style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border-subtle)' }}>
                              <div className="flex items-center gap-2">
                                <CreditCard size={13} style={{ color: 'var(--text-secondary)' }} />
                                <span className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>
                                  Plan de pagos
                                </span>
                              </div>
                              <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
                                style={{ background: allPaid ? 'rgba(22,163,74,0.1)' : 'var(--bg-elevated)', color: allPaid ? '#16A34A' : 'var(--text-secondary)' }}>
                                {allPaid ? 'Completado' : `${paidCount}/${installments.length} pagadas`}
                              </span>
                            </div>

                            {/* Cuotas */}
                            <div style={{ background: '#fff' }}>
                              {installments.map((inst, i) => {
                                const isPaidI = inst.status === 'paid'
                                const isOvD   = inst.status === 'overdue'
                                const isNext  = !isPaidI && installments.slice(0, i).every(x => x.status === 'paid')
                                const isLast  = i === installments.length - 1

                                return (
                                  <div key={inst.id} className="flex items-center gap-3 px-4 py-3.5"
                                    style={{
                                      borderBottom: isLast ? 'none' : '1px solid var(--border-subtle)',
                                      background: '#fff',
                                    }}>
                                    <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold"
                                      style={{
                                        background: isPaidI ? 'rgba(22,163,74,0.1)' : isOvD ? 'rgba(220,38,38,0.08)' : isNext ? 'rgba(3,49,60,0.08)' : 'var(--bg-elevated)',
                                        color:      isPaidI ? '#16A34A' : isOvD ? '#DC2626' : isNext ? '#03313C' : 'var(--text-muted)',
                                        border:     `1.5px solid ${isPaidI ? 'rgba(22,163,74,0.3)' : isOvD ? 'rgba(220,38,38,0.2)' : isNext ? 'rgba(3,49,60,0.2)' : 'var(--border-medium)'}`,
                                      }}>
                                      {isPaidI ? <Check size={13} /> : i + 1}
                                    </div>

                                    {/* Texto */}
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center justify-between gap-2">
                                        <span className="text-sm font-bold" style={{
                                          color: isPaidI ? 'var(--text-secondary)' : isOvD ? '#DC2626' : 'var(--text-primary)',
                                          letterSpacing: '-0.02em',
                                        }}>
                                          {formatCurrency(inst.amount)}
                                        </span>
                                        <span className="text-xs shrink-0 font-medium" style={{
                                          color: isPaidI ? '#16A34A' : isOvD ? '#DC2626' : isNext ? '#03313C' : 'var(--text-muted)',
                                        }}>
                                          {isPaidI
                                            ? `✓ Pagado${inst.paid_at ? ' · ' + formatDate(inst.paid_at.split('T')[0]) : ''}`
                                            : countdownLabel(inst.due_date)}
                                        </span>
                                      </div>
                                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{inst.label}</span>
                                    </div>

                                    {isNext && !isOvD && (
                                      <span className="text-[10px] font-bold px-2 py-1 rounded-lg shrink-0"
                                        style={{ background: 'rgba(3,49,60,0.07)', color: '#03313C', border: '1px solid rgba(3,49,60,0.15)' }}>
                                        Próxima
                                      </span>
                                    )}
                                    {isOvD && (
                                      <span className="text-[10px] font-bold px-2 py-1 rounded-lg shrink-0"
                                        style={{ background: 'rgba(220,38,38,0.08)', color: '#DC2626' }}>
                                        Vencida
                                      </span>
                                    )}
                                  </div>
                                )
                              })}
                            </div>

                            {/* CTA */}
                            {nextInst && !allPaid && (
                              <div className="p-3" style={{ borderTop: '1px solid var(--border-subtle)', background: 'var(--bg-elevated)' }}>
                                <Link href={`/pago/${selected?.id}?cuota=${nextInst.id}`}
                                  className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-bold transition-all"
                                  style={{
                                    background: isOD ? '#DC2626' : '#03313C',
                                    color: '#fff',
                                    boxShadow: isOD ? '0 2px 12px rgba(220,38,38,0.25)' : '0 2px 12px rgba(3,49,60,0.2)',
                                  }}>
                                  <CreditCard size={15} />
                                  {isOD ? `Pagar cuota vencida — ${formatCurrency(nextInst.amount)}` : `Pagar ahora — ${formatCurrency(nextInst.amount)}`}
                                </Link>
                              </div>
                            )}

                            {allPaid && (
                              <div className="px-4 py-3 flex items-center gap-2"
                                style={{ borderTop: '1px solid var(--border-subtle)', background: 'var(--bg-elevated)' }}>
                                <CheckCircle size={14} style={{ color: '#16A34A' }} />
                                <span className="text-sm font-semibold" style={{ color: '#16A34A' }}>
                                  Todas las cuotas pagadas
                                </span>
                              </div>
                            )}
                          </div>
                        )
                      })()}
                      </div>{/* fin columna principal */}

                      {/* Columna secundaria — notas y adicionales */}
                      {(bk.event_notes || bk.booking_addons?.length > 0 || ((bk as any).space_pricing?.pricing_type === 'fixed_package' && (bk as any).space_pricing?.package_includes)) && (
                        <div className="space-y-3 md:w-56">
                          {(bk as any).space_pricing?.pricing_type === 'fixed_package' && (bk as any).space_pricing?.package_includes && (
                            <div className="rounded-xl p-3" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
                              <p className="text-xs font-bold mb-1.5" style={{ color: 'var(--text-muted)' }}>
                                {(bk as any).space_pricing.package_name ?? 'Paquete incluye'}
                              </p>
                              <p className="text-xs whitespace-pre-line leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                                {(bk as any).space_pricing.package_includes}
                              </p>
                            </div>
                          )}
                          {bk.event_notes && (
                            <div className="rounded-xl p-3" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
                              <p className="text-xs font-bold mb-1" style={{ color: 'var(--text-muted)' }}>Nota enviada</p>
                              <p className="text-xs italic leading-relaxed" style={{ color: 'var(--text-secondary)' }}>"{bk.event_notes}"</p>
                            </div>
                          )}
                          {bk.booking_addons?.length > 0 && (
                            <div className="rounded-xl p-3" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
                              <p className="text-xs font-bold mb-1.5" style={{ color: 'var(--text-muted)' }}>Adicionales</p>
                              {bk.booking_addons.map((a: any, i: number) => (
                                <div key={i} className="flex justify-between text-xs py-0.5" style={{ color: 'var(--text-secondary)' }}>
                                  <span>{a.space_addons?.name}</span>
                                  <span className="font-semibold">{formatCurrency(a.subtotal)}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>{/* fin grid */}

                    {/* Acciones por estado */}
                    {bk.status === 'pending' && (() => {
                      const hoursElapsed = Math.floor((Date.now() - new Date(bk.created_at).getTime()) / 3600000)
                      const hoursLeft    = Math.max(0, 48 - hoursElapsed)
                      const expired      = hoursElapsed >= 48
                      const urgent       = hoursLeft <= 6 && !expired
                      return (
                        <div className="mt-4 space-y-3">
                          {/* Barra de progreso del tiempo */}
                          <div className="px-4 py-3 rounded-xl"
                            style={{
                              background: expired ? 'rgba(220,38,38,0.05)' : urgent ? 'rgba(217,119,6,0.08)' : 'rgba(217,119,6,0.04)',
                              border: `1px solid ${expired ? 'rgba(220,38,38,0.2)' : 'rgba(217,119,6,0.15)'}`,
                            }}>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-semibold flex items-center gap-1.5"
                                style={{ color: expired ? '#DC2626' : '#92400E' }}>
                                {expired
                                  ? <><AlertTriangle size={12} /> Sin respuesta después de 48h</>
                                  : urgent
                                    ? <><Clock size={12} /> El propietario tiene {hoursLeft}h para responder</>
                                    : <><Clock size={12} /> Esperando respuesta · {hoursLeft}h restantes</>}
                              </span>
                              <span className="text-xs tabular-nums" style={{ color: expired ? '#DC2626' : 'var(--text-muted)' }}>
                                {hoursElapsed}h transcurridas
                              </span>
                            </div>
                            <div className="w-full h-1.5 rounded-full" style={{ background: 'var(--border-subtle)' }}>
                              <div className="h-1.5 rounded-full transition-all"
                                style={{
                                  width: `${Math.min(100, (hoursElapsed / 48) * 100)}%`,
                                  background: expired ? '#DC2626' : urgent ? '#D97706' : 'var(--brand)',
                                }} />
                            </div>
                            <p className="text-xs mt-2" style={{ color: expired ? '#DC2626' : '#92400E' }}>
                              {expired
                                ? 'La solicitud no tiene pagos — puedes cancelarla cuando quieras. Si prefieres esperar, el propietario aún puede confirmar.'
                                : 'Te notificamos por email cuando el propietario responda.'}
                            </p>
                          </div>
                          <div className="flex gap-2 flex-wrap">
                            <Link href="/dashboard/mensajes"
                              className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg transition-all"
                              style={{ color: 'var(--text-secondary)', background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
                              <MessageCircle size={12} /> Contactar propietario
                            </Link>
                            <button onClick={() => openCancelModal(bk)}
                              className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg transition-all"
                              style={{ color: '#DC2626', background: 'rgba(220,38,38,0.05)', border: '1px solid rgba(220,38,38,0.15)' }}>
                              <X size={12} /> Cancelar solicitud
                            </button>
                          </div>
                        </div>
                      )
                    })()}
                    {bk.status === 'quote_requested' && (() => {
                      const hoursElapsed = Math.floor((Date.now() - new Date(bk.created_at).getTime()) / 3600000)
                      const hoursLeft    = Math.max(0, 48 - hoursElapsed)
                      const expired      = hoursElapsed >= 48
                      return (
                      <div className="mt-4 space-y-3">
                        <div className="px-4 py-3 rounded-xl"
                          style={{ background: expired ? 'rgba(220,38,38,0.05)' : 'rgba(8,145,178,0.05)', border: `1px solid ${expired ? 'rgba(220,38,38,0.2)' : 'rgba(8,145,178,0.2)'}`, color: expired ? '#DC2626' : '#0369A1' }}>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs font-semibold flex items-center gap-1.5">
                              {expired
                                ? <><AlertTriangle size={12} /> Sin respuesta después de 48h</>
                                : <><Clock size={12} /> Cotización pendiente · {hoursLeft}h restantes</>}
                            </span>
                          </div>
                          <div className="w-full h-1.5 rounded-full mb-2" style={{ background: 'var(--border-subtle)' }}>
                            <div className="h-1.5 rounded-full" style={{ width: `${Math.min(100, (hoursElapsed / 48) * 100)}%`, background: expired ? '#DC2626' : '#0891B2' }} />
                          </div>
                          <p className="text-xs">
                            {expired ? 'El propietario no respondió en el plazo. Escríbele directamente o cancela.' : 'Te notificamos por email cuando el propietario envíe el precio. Puedes escribirle mientras tanto.'}
                          </p>
                        </div>
                        <Link href="/dashboard/mensajes"
                          className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg transition-all w-fit"
                          style={{ color: 'var(--brand)', background: 'var(--brand-dim)', border: '1px solid var(--brand-border)' }}>
                          <MessageCircle size={12} /> Contactar propietario
                        </Link>
                      </div>
                      )
                    })()}
                    {bk.status === 'accepted' && (
                      <div className="mt-4 space-y-2">
                        <div className="flex gap-2 flex-wrap">
                          <Link href="/dashboard/mensajes"
                            className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg transition-all"
                            style={{ color: 'var(--brand)', background: 'var(--brand-dim)', border: '1px solid var(--brand-border)' }}>
                            <MessageCircle size={12} /> Contactar propietario
                          </Link>
                          {(bk as any).event_notes?.startsWith('[Cotización]') ? (
                            <button
                              onClick={() => handleRejectQuotation(bk)}
                              disabled={rejectingId === bk.id}
                              className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg transition-all disabled:opacity-50"
                              style={{ color: '#DC2626', background: 'rgba(220,38,38,0.05)', border: '1px solid rgba(220,38,38,0.15)' }}>
                              {rejectingId === bk.id ? <><Loader2 size={12} className="animate-spin" /> Rechazando...</> : <><X size={12} /> Rechazar precio</>}
                            </button>
                          ) : (
                            <button onClick={() => openCancelModal(bk)}
                              className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg transition-all"
                              style={{ color: '#DC2626', background: 'rgba(220,38,38,0.05)', border: '1px solid rgba(220,38,38,0.15)' }}>
                              <X size={12} /> Cancelar reserva
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                    {bk.status === 'confirmed' && (
                      <div className="mt-4 space-y-3">
                        <div className="px-4 py-3 rounded-xl text-sm"
                          style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
                          Reserva confirmada. Las cuotas restantes se cobrarán según el plan de pagos.
                        </div>
                        <div className="flex gap-2 flex-wrap">
                          <Link href="/dashboard/mensajes"
                            className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg transition-all"
                            style={{ color: 'var(--brand)', background: 'var(--brand-dim)', border: '1px solid var(--brand-border)' }}>
                            <MessageCircle size={12} /> Contactar propietario
                          </Link>
                          {new Date(bk.event_date + 'T12:00') > new Date() && (
                            <button onClick={() => openCancelModal(bk)}
                              className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg transition-all"
                              style={{ color: '#DC2626', background: 'rgba(220,38,38,0.05)', border: '1px solid rgba(220,38,38,0.15)' }}>
                              <X size={12} /> Cancelar reserva
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                    {bk.status === 'rejected' && (
                      <div className="mt-4 space-y-3">
                        <div className="px-4 py-3 rounded-xl text-sm"
                          style={{ background: 'rgba(220,38,38,0.05)', border: '1px solid rgba(220,38,38,0.15)', color: '#991B1B' }}>
                          El propietario no pudo aceptar tu solicitud para esta fecha.
                          {bk.rejection_reason && (
                            <p className="mt-1 font-medium">Motivo: {bk.rejection_reason}</p>
                          )}
                        </div>
                        <Link href="/buscar" className="btn-brand text-sm font-semibold px-5 py-2.5 rounded-xl inline-block">
                          Buscar otro espacio
                        </Link>
                      </div>
                    )}
                    {bk.status === 'cancelled_host' && (
                      <div className="mt-4 space-y-3">
                        <div className="px-4 py-3 rounded-xl text-sm"
                          style={{ background: 'rgba(220,38,38,0.05)', border: '1px solid rgba(220,38,38,0.15)', color: '#991B1B' }}>
                          El propietario canceló esta reserva.
                          {bk.cancellation_reason && (
                            <p className="mt-1 font-medium">Motivo: {bk.cancellation_reason}</p>
                          )}
                        </div>
                        <Link href="/buscar" className="btn-brand text-sm font-semibold px-5 py-2.5 rounded-xl inline-block">
                          Buscar otro espacio
                        </Link>
                      </div>
                    )}
                    {bk.status === 'cancelled_guest' && (
                      <div className="mt-4 px-4 py-3 rounded-xl text-sm"
                        style={{ background: 'rgba(107,114,128,0.05)', border: '1px solid rgba(107,114,128,0.15)', color: '#6B7280' }}>
                        Cancelaste esta reserva.
                        {bk.cancellation_reason && (
                          <p className="mt-1">Motivo: {bk.cancellation_reason}</p>
                        )}
                      </div>
                    )}

                    {/* ── Reseña — aparece para reservas completadas con fecha pasada ── */}
                    {(bk.status === 'confirmed' || bk.status === 'completed') &&
                     isPaid(bk.payment_status) &&
                     new Date(bk.event_date + 'T12:00') < new Date() && (
                      <div className="mt-4">
                        {reviewed.has(bk.id) ? (
                          <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm"
                            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
                            <Star size={14} style={{ color: '#F59E0B', fill: '#F59E0B' }} /> ¡Gracias por tu reseña!
                          </div>
                        ) : reviewFor === bk.id ? (
                          <div className="p-4 rounded-2xl space-y-3"
                            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
                            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                              ¿Cómo estuvo tu evento en {(bk as any).spaces?.name}?
                            </p>
                            {/* Estrellas */}
                            <div className="flex gap-1">
                              {[1,2,3,4,5].map(s => (
                                <button key={s} type="button"
                                  onMouseEnter={() => setHoverStar(s)}
                                  onMouseLeave={() => setHoverStar(0)}
                                  onClick={() => setRating(s)}>
                                  <svg width="28" height="28" viewBox="0 0 16 16" style={{ transition: 'transform 0.1s', transform: s <= (hoverStar || rating) ? 'scale(1.15)' : 'scale(1)' }}>
                                    <path d="M8 1l1.8 3.6L14 5.3l-3 2.9.7 4.1L8 10.4l-3.7 1.9.7-4.1-3-2.9 4.2-.7z"
                                      fill={s <= (hoverStar || rating) ? '#F59E0B' : '#D1D5DB'}/>
                                  </svg>
                                </button>
                              ))}
                            </div>
                            <textarea
                              value={comment} onChange={e => setComment(e.target.value)}
                              placeholder="Cuéntanos cómo fue tu experiencia (opcional)"
                              rows={3}
                              className="w-full rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none"
                              style={{ background: '#fff', border: '1.5px solid var(--border-medium)', color: 'var(--text-primary)', fontSize: 16 }}
                            />
                            <div className="flex gap-2">
                              <button
                                disabled={rating === 0 || submitting}
                                onClick={async () => {
                                  if (!rating) return
                                  setSubmitting(true)
                                  setReviewError('')
                                  const { error } = await submitReview({
                                    bookingId: bk.id,
                                    spaceId:   (bk as any).space_id,
                                    rating,
                                    comment,
                                  })
                                  setSubmitting(false)
                                  if (error) { setReviewError(error) }
                                  else {
                                    setReviewed(prev => new Set([...prev, bk.id]))
                                    setReviewFor(null)
                                    setRating(0)
                                    setComment('')
                                    setReviewError('')
                                  }
                                }}
                                className="px-4 py-2 rounded-xl text-sm font-bold disabled:opacity-40"
                                style={{ background: '#03313C', color: '#fff' }}>
                                {submitting ? 'Publicando...' : 'Publicar reseña'}
                              </button>
                              <button onClick={() => { setReviewFor(null); setRating(0); setComment(''); setHoverStar(0); setReviewError('') }}
                                className="px-4 py-2 rounded-xl text-sm"
                                style={{ color: 'var(--text-secondary)' }}>
                                Cancelar
                              </button>
                            </div>
                            {reviewError && (
                              <p className="text-xs font-semibold mt-2" style={{ color: '#DC2626' }}>{reviewError}</p>
                            )}
                          </div>
                        ) : (
                          <button onClick={() => { setReviewFor(bk.id); setRating(0); setComment('') }}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold w-full"
                            style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', color: '#92400E' }}>
                            <Star size={14} style={{ color: '#F59E0B', fill: '#F59E0B' }} /> Dejar reseña de este espacio
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ── Modal cancelar reserva ── */}
      {cancelModal && (
        <>
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" onClick={closeCancelModal} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md rounded-3xl p-6 space-y-5"
              style={{ background: '#fff', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>

              {/* ── PASO 1: Confirmar cancelación + motivo ── */}
              {cancelStep === 1 && (
                <>
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
                      style={{ background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.15)' }}>
                      <AlertTriangle size={20} style={{ color: '#DC2626' }} />
                    </div>
                    <div>
                      <h3 className="font-bold text-base mb-1" style={{ color: 'var(--text-primary)' }}>
                        ¿Cancelar reserva?
                      </h3>
                      {cancelHasPaid ? (() => {
                        const cond = (cancelModal as any)?.spaces?.space_conditions?.[0]
                        const paidAmt = Number((cancelModal as any)?.paid_amount ?? 0)
                        const hoursLeft = cancelModal?.event_date
                          ? Math.floor((new Date(cancelModal.event_date + 'T12:00').getTime() - Date.now()) / 3600000)
                          : null
                        const refundPct = cond?.cancellation_hours_before != null && hoursLeft != null
                          ? (hoursLeft >= cond.cancellation_hours_before ? (cond.cancellation_refund_pct ?? 0) : 0)
                          : null
                        const refundAmt = refundPct != null && paidAmt > 0 ? Math.round(paidAmt * refundPct / 100) : null
                        return (
                          <div className="space-y-2">
                            {refundAmt != null ? (
                              <div className="rounded-xl px-4 py-3 text-sm"
                                style={{ background: refundAmt > 0 ? 'rgba(22,163,74,0.06)' : 'rgba(220,38,38,0.05)', border: `1px solid ${refundAmt > 0 ? 'rgba(22,163,74,0.2)' : 'rgba(220,38,38,0.15)'}` }}>
                                {refundAmt > 0 ? (
                                  <span style={{ color: '#166534' }}>
                                    <strong>Reembolso estimado: {formatCurrency(refundAmt)}</strong>
                                    {' '}({refundPct}% de lo pagado). Política: {cond?.cancellation_policy ?? 'estándar'}.
                                  </span>
                                ) : (
                                  <span style={{ color: '#991B1B' }}>
                                    <strong>Sin reembolso</strong> — cancelación con menos de {cond.cancellation_hours_before}h de anticipación. Política: {cond?.cancellation_policy ?? 'estándar'}.
                                  </span>
                                )}
                              </div>
                            ) : (
                              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                                Ya realizaste un pago. El reembolso depende de la política de cancelación del espacio.
                              </p>
                            )}
                          </div>
                        )
                      })() : (
                        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Esta acción no se puede deshacer.</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                      Motivo (opcional)
                    </label>
                    <textarea
                      value={cancelReason}
                      onChange={e => setCancelReason(e.target.value)}
                      placeholder="Ej: Cambio de fecha, evento cancelado..."
                      rows={2}
                      className="input-base w-full rounded-xl px-4 py-3 text-sm resize-none"
                    />
                  </div>

                  <div className="flex gap-3">
                    <button onClick={closeCancelModal}
                      className="flex-1 py-3 rounded-xl text-sm font-semibold btn-outline">
                      Volver
                    </button>
                    <button
                      onClick={() => cancelHasPaid ? setCancelStep(2) : handleCancel()}
                      disabled={cancelling}
                      className="flex-1 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                      style={{ background: '#DC2626', color: '#fff' }}>
                      {cancelHasPaid ? 'Continuar →' : (cancelling ? <><Loader2 size={15} className="animate-spin" /> Cancelando...</> : 'Sí, cancelar')}
                    </button>
                  </div>
                  {cancelError && !cancelHasPaid && (
                    <p className="text-xs text-center font-semibold mt-2" style={{ color: '#DC2626' }}>
                      {cancelError}
                    </p>
                  )}
                </>
              )}

              {/* ── PASO 2: Datos bancarios para reembolso ── */}
              {cancelStep === 2 && (
                <>
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
                      <CreditCard size={18} style={{ color: 'var(--text-secondary)' }} />
                    </div>
                    <div>
                      <h3 className="font-bold text-base mb-1" style={{ color: 'var(--text-primary)' }}>
                        Datos para tu reembolso
                      </h3>
                      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                        Te transferiremos el monto pagado a esta cuenta en 3–5 días hábiles.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                        Nombre del titular *
                      </label>
                      <input
                        value={refundBank.holderName}
                        onChange={e => setRefundBank(p => ({ ...p, holderName: e.target.value }))}
                        placeholder="Como aparece en tu cuenta bancaria"
                        className="input-base w-full rounded-xl px-4 py-3 text-sm"
                        style={{ fontSize: 16 }}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                          Banco *
                        </label>
                        <select
                          value={refundBank.bank}
                          onChange={e => setRefundBank(p => ({ ...p, bank: e.target.value }))}
                          className="input-base w-full rounded-xl px-4 py-3 text-sm"
                          style={{ fontSize: 16 }}>
                          <option value="">Seleccionar</option>
                          <option>Banco Popular</option>
                          <option>BHD León</option>
                          <option>Banreservas</option>
                          <option>Scotiabank</option>
                          <option>Banco Santa Cruz</option>
                          <option>Asociación Popular</option>
                          <option>Asociación La Nacional</option>
                          <option>Otro</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                          Tipo *
                        </label>
                        <select
                          value={refundBank.accountType}
                          onChange={e => setRefundBank(p => ({ ...p, accountType: e.target.value }))}
                          className="input-base w-full rounded-xl px-4 py-3 text-sm"
                          style={{ fontSize: 16 }}>
                          <option value="ahorro">Ahorro</option>
                          <option value="corriente">Corriente</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                        Número de cuenta *
                      </label>
                      <input
                        value={refundBank.accountNumber}
                        onChange={e => setRefundBank(p => ({ ...p, accountNumber: e.target.value }))}
                        placeholder="Ej: 2100012345678"
                        className="input-base w-full rounded-xl px-4 py-3 text-sm"
                        inputMode="numeric"
                        style={{ fontSize: 16 }}
                      />
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button onClick={() => setCancelStep(1)}
                      className="flex-1 py-3 rounded-xl text-sm font-semibold btn-outline">
                      ← Atrás
                    </button>
                    <button
                      onClick={handleCancel}
                      disabled={cancelling || !refundBank.holderName || !refundBank.bank || !refundBank.accountNumber}
                      className="flex-1 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                      style={{ background: '#DC2626', color: '#fff' }}>
                      {cancelling ? <><Loader2 size={15} className="animate-spin" /> Procesando...</> : 'Confirmar cancelación'}
                    </button>
                  </div>
                  <p className="text-xs text-center" style={{ color: 'var(--text-muted)' }}>
                    Estos datos solo se usan para procesarte el reembolso.
                  </p>
                  {cancelError && (
                    <p className="text-xs text-center font-semibold mt-2" style={{ color: '#DC2626' }}>
                      {cancelError}
                    </p>
                  )}
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
