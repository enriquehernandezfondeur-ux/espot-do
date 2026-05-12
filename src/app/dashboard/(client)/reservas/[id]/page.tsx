'use client'

import { useEffect, useState, use } from 'react'
import Link from 'next/link'
import {
  ArrowLeft, CalendarDays, Calendar, Clock, Users, MapPin, MessageCircle,
  CreditCard, CheckCircle, Sparkles, ExternalLink,
  Phone, Mail, Loader2, Check, Building2,
} from 'lucide-react'
import { formatCurrency, formatDate, formatTime } from '@/lib/utils'
import { getClientBookingDetail } from '@/lib/actions/client'
import { STATUS_LABELS, STATUS_COLORS } from '@/lib/bookingConfig'
import { countdownLabel } from '@/lib/payments/schedule'

export default function BookingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [data, setData]       = useState<Awaited<ReturnType<typeof getClientBookingDetail>>>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getClientBookingDetail(id)
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return (
    <div className="flex items-center justify-center h-dvh">
      <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--brand)' }} />
    </div>
  )

  if (!data) return (
    <div className="flex flex-col items-center justify-center h-dvh gap-3 px-4 text-center">
      <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>Reserva no encontrada</p>
      <Link href="/dashboard/reservas" className="btn-brand text-sm px-5 py-2.5 rounded-xl font-semibold">
        Volver a mis reservas
      </Link>
    </div>
  )

  const { booking, installments } = data
  const space   = (booking as any).spaces as any
  const host    = space?.profiles as any
  const addons  = (booking as any).booking_addons ?? []
  const cover   = space?.space_images?.find((i: any) => i.is_cover)?.url ?? space?.space_images?.[0]?.url
  const sc      = STATUS_COLORS[(booking as any).status as keyof typeof STATUS_COLORS] ?? { color: '#6B7280', bg: '#F4F6F8' }
  const sl      = STATUS_LABELS[(booking as any).status as keyof typeof STATUS_LABELS] ?? (booking as any).status
  const allPaid = installments.length > 0 && installments.every(i => i.status === 'paid')
  const nextInst = installments.find(i => i.status !== 'paid')

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 md:py-8">

      {/* Back */}
      <Link href="/dashboard/reservas"
        className="inline-flex items-center gap-1.5 text-sm font-medium mb-6"
        style={{ color: 'var(--text-muted)' }}>
        <ArrowLeft size={15} /> Mis reservas
      </Link>

      {/* Hero imagen + nombre */}
      <div className="rounded-3xl overflow-hidden mb-5"
        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
        {cover ? (
          <div className="h-52 md:h-64 overflow-hidden">
            <img src={cover} alt={space?.name} className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className="h-28 flex items-center justify-center"
            style={{ background: 'var(--bg-elevated)' }}>
            <Building2 size={40} style={{ color: 'var(--border-medium)' }} />
          </div>
        )}
        <div className="p-5">
          <div className="flex items-start justify-between gap-3 mb-1">
            <div>
              <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                {space?.name}
              </h1>
              {space?.address && (
                <p className="text-sm mt-0.5 flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
                  <MapPin size={12} /> {space.address}, {space?.sector}, {space?.city}
                </p>
              )}
            </div>
            <span className="text-xs font-semibold px-3 py-1.5 rounded-full shrink-0"
              style={{ background: sc.bg, color: sc.color }}>
              {sl}
            </span>
          </div>
          {space?.slug && (
            <Link href={`/espacios/${space.slug}`} target="_blank"
              className="inline-flex items-center gap-1 text-xs mt-2"
              style={{ color: 'var(--brand)' }}>
              <ExternalLink size={11} /> Ver espacio
            </Link>
          )}
        </div>
      </div>

      {/* Detalles del evento */}
      <div className="rounded-2xl p-5 mb-4"
        style={{ background: '#fff', border: '1px solid var(--border-subtle)' }}>
        <h2 className="text-sm font-bold uppercase tracking-wide mb-4" style={{ color: 'var(--text-muted)' }}>
          Tu evento
        </h2>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'var(--brand-dim)' }}>
              <CalendarDays size={16} style={{ color: 'var(--brand)' }} />
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                {formatDate(booking.event_date)}
              </p>
              <p className="text-xs" style={{ color: 'var(--brand)' }}>{countdownLabel(booking.event_date)}</p>
            </div>
          </div>
          {booking.start_time && booking.end_time && (
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: 'var(--brand-dim)' }}>
                <Clock size={16} style={{ color: 'var(--brand)' }} />
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {formatTime(booking.start_time)} – {formatTime(booking.end_time)}
                </p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Horario</p>
              </div>
            </div>
          )}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'var(--brand-dim)' }}>
              <Users size={16} style={{ color: 'var(--brand)' }} />
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                {booking.guest_count} personas
              </p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Invitados</p>
            </div>
          </div>
          {booking.event_type && (
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: 'var(--brand-dim)' }}>
                <Sparkles size={16} style={{ color: 'var(--brand)' }} />
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {booking.event_type}
                </p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Tipo de evento</p>
              </div>
            </div>
          )}
        </div>
        {(booking as any).event_notes && !(booking as any).event_notes.startsWith('[Cotización]') && (
          <div className="mt-4 pt-4 text-xs italic" style={{ borderTop: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
            📝 "{(booking as any).event_notes}"
          </div>
        )}
      </div>

      {/* Plan de pagos — nota si es cotización sin plan aún */}
      {installments.length === 0 && (booking as any).status === 'quote_requested' && (
        <div className="rounded-2xl px-5 py-4 mb-4 flex items-center gap-3"
          style={{ background: 'rgba(8,145,178,0.08)', border: '1px solid rgba(8,145,178,0.2)' }}>
          <CreditCard size={16} style={{ color: '#0891B2', flexShrink: 0 }} />
          <p className="text-sm" style={{ color: '#0369A1' }}>
            El plan de pagos se mostrará cuando el anfitrión confirme el precio de tu cotización.
          </p>
        </div>
      )}

      {/* Plan de pagos */}
      {installments.length > 0 && (
        <div className="rounded-2xl overflow-hidden mb-4"
          style={{ border: '1.5px solid var(--brand-border)' }}>
          <div className="flex items-center justify-between px-5 py-3.5"
            style={{ background: 'var(--brand-dim)', borderBottom: '1px solid var(--brand-border)' }}>
            <div className="flex items-center gap-2">
              <CreditCard size={14} style={{ color: 'var(--brand)' }} />
              <span className="text-sm font-bold" style={{ color: 'var(--brand)' }}>Plan de pagos</span>
            </div>
            <span className="text-xs font-semibold" style={{ color: 'var(--brand)' }}>
              {formatCurrency(Number(booking.total_amount))} total
            </span>
          </div>
          {installments.map((inst, i) => {
            const paid = inst.status === 'paid'
            const overdue = inst.status === 'overdue'
            const isNext = !paid && installments.slice(0, i).every(x => x.status === 'paid')
            return (
              <div key={inst.id} className="flex items-center gap-3 px-5 py-3.5"
                style={{ borderBottom: i < installments.length - 1 ? '1px solid var(--border-subtle)' : 'none', background: '#fff' }}>
                <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold"
                  style={{
                    background: paid ? 'rgba(22,163,74,0.1)' : overdue ? 'rgba(220,38,38,0.08)' : isNext ? 'var(--brand-dim)' : 'var(--bg-elevated)',
                    color: paid ? '#16A34A' : overdue ? '#DC2626' : isNext ? 'var(--brand)' : 'var(--text-muted)',
                    border: `1.5px solid ${paid ? 'rgba(22,163,74,0.3)' : overdue ? 'rgba(220,38,38,0.2)' : isNext ? 'var(--brand-border)' : 'var(--border-medium)'}`,
                  }}>
                  {paid ? <Check size={12} /> : i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold" style={{ color: paid ? 'var(--text-secondary)' : 'var(--text-primary)' }}>
                      {formatCurrency(inst.amount)}
                    </span>
                    <span className="text-xs font-medium" style={{ color: paid ? '#16A34A' : overdue ? '#DC2626' : isNext ? 'var(--brand)' : 'var(--text-muted)' }}>
                      {paid ? `Pagado${inst.paid_at ? ' · ' + formatDate(inst.paid_at.split('T')[0]) : ''}` : countdownLabel(inst.due_date)}
                    </span>
                  </div>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{inst.label}</p>
                </div>
              </div>
            )
          })}
          {nextInst && (
            <div className="p-3" style={{ borderTop: '1px solid var(--brand-border)', background: 'var(--brand-dim)' }}>
              <Link href={`/pago/${booking.id}?cuota=${nextInst.id}`}
                className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-bold"
                style={{ background: 'var(--brand)', color: '#fff', boxShadow: '0 2px 12px rgba(53,196,147,0.3)' }}>
                <CreditCard size={15} /> Pagar ahora — {formatCurrency(nextInst.amount)}
              </Link>
            </div>
          )}
          {allPaid && (
            <div className="px-5 py-3.5 flex items-center gap-2"
              style={{ borderTop: '1px solid var(--brand-border)', background: 'var(--brand-dim)' }}>
              <CheckCircle size={14} style={{ color: 'var(--brand)' }} />
              <span className="text-sm font-semibold" style={{ color: 'var(--brand)' }}>
                Todas las cuotas pagadas
              </span>
            </div>
          )}
        </div>
      )}

      {/* Propietario */}
      {host && (
        <div className="rounded-2xl p-5 mb-4"
          style={{ background: '#fff', border: '1px solid var(--border-subtle)' }}>
          <h2 className="text-sm font-bold uppercase tracking-wide mb-4" style={{ color: 'var(--text-muted)' }}>
            Tu anfitrión
          </h2>
          <div className="flex items-center gap-3 mb-4">
            {host.avatar_url ? (
              <img src={host.avatar_url} alt={host.full_name}
                className="w-12 h-12 rounded-2xl object-cover shrink-0" />
            ) : (
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold shrink-0"
                style={{ background: 'var(--brand)' }}>
                {host.full_name?.charAt(0)?.toUpperCase() ?? 'H'}
              </div>
            )}
            <div className="min-w-0">
              <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{host.full_name}</p>
              {host.email && (
                <a href={`mailto:${host.email}`} className="text-xs flex items-center gap-1 mt-0.5"
                  style={{ color: 'var(--text-muted)' }}>
                  <Mail size={11} /> {host.email}
                </a>
              )}
              {host.phone && (
                <a href={`tel:${host.phone}`} className="text-xs flex items-center gap-1 mt-0.5"
                  style={{ color: 'var(--text-muted)' }}>
                  <Phone size={11} /> {host.phone}
                </a>
              )}
            </div>
          </div>
          <Link href="/dashboard/mensajes"
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-semibold transition-all"
            style={{ background: 'var(--brand-dim)', color: 'var(--brand)', border: '1px solid var(--brand-border)' }}>
            <MessageCircle size={15} /> Enviar mensaje al anfitrión
          </Link>
        </div>
      )}

      {/* Adicionales */}
      {addons.length > 0 && (
        <div className="rounded-2xl p-5 mb-4"
          style={{ background: '#fff', border: '1px solid var(--border-subtle)' }}>
          <h2 className="text-sm font-bold uppercase tracking-wide mb-3" style={{ color: 'var(--text-muted)' }}>
            Servicios adicionales
          </h2>
          <div className="space-y-2">
            {addons.map((a: any, i: number) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span style={{ color: 'var(--text-secondary)' }}>
                  {a.space_addons?.name}
                  {a.quantity > 1 && <span className="text-xs ml-1" style={{ color: 'var(--text-muted)' }}>×{a.quantity}</span>}
                </span>
                <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {formatCurrency(a.subtotal)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Antes de tu evento */}
      <div className="rounded-2xl p-5 mb-4"
        style={{ background: '#fff', border: '1px solid var(--border-subtle)' }}>
        <h2 className="text-sm font-bold uppercase tracking-wide mb-4" style={{ color: 'var(--text-muted)' }}>
          Antes de tu evento
        </h2>
        <div className="space-y-3">
          {[
            { icon: Clock,         text: 'Llega 15 minutos antes para revisar el espacio y coordinarte con el anfitrión.' },
            { icon: CreditCard,    text: 'Ten a la mano tu confirmación de reserva (este pantalla o el email de confirmación).' },
            { icon: MessageCircle, text: 'Coordina los detalles de decoración o acceso con anticipación vía mensajes.' },
            { icon: MapPin,        text: space?.address ? `Dirección: ${space.address}, ${space?.sector}, ${space?.city}` : `El espacio está en ${space?.sector}, ${space?.city}.` },
          ].map(({ icon: Icon, text }, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                style={{ background: 'var(--bg-elevated)' }}>
                <Icon size={13} style={{ color: 'var(--brand)' }} />
              </div>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{text}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Añadir al calendario */}
      {booking.event_date && booking.start_time && (() => {
        const dt = booking.event_date.replace(/-/g, '')
        const st = (booking.start_time ?? '').slice(0,5).replace(':', '')
        const et = (booking.end_time ?? '').slice(0,5).replace(':', '')
        const title = encodeURIComponent(`${booking.event_type ?? 'Evento'} — ${space?.name ?? ''}`)
        const loc   = encodeURIComponent(space?.address ? `${space.address}, ${space?.city}` : space?.city ?? '')
        const gcal  = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dt}T${st}00/${dt}T${et}00&location=${loc}`
        return (
          <a href={gcal} target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl text-sm font-semibold mb-3 transition-all"
            style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}>
            <Calendar size={15} /> Añadir a Google Calendar
          </a>
        )
      })()}

      {/* Acciones */}
      <div className="flex gap-3">
        <Link href="/dashboard/reservas"
          className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-semibold"
          style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}>
          <ArrowLeft size={15} /> Mis reservas
        </Link>
        {space?.slug && (
          <Link href={`/espacios/${space.slug}`}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-semibold"
            style={{ background: 'var(--brand-dim)', color: 'var(--brand)', border: '1px solid var(--brand-border)' }}>
            <ExternalLink size={15} /> Ver espacio
          </Link>
        )}
      </div>
    </div>
  )
}
