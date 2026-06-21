import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import { getExternalEventForPayment } from '@/lib/actions/external-events'
import PaymentClient from './PaymentClient'
import { formatCurrency, formatDate } from '@/lib/utils'
import { CheckCircle2 } from 'lucide-react'

interface Props {
  params: Promise<{ eventId: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { eventId } = await params
  const event = await getExternalEventForPayment(eventId)
  if (!event) return { title: 'No encontrado' }
  return { title: `Pago — ${(event as any).title} — Espot` }
}

export default async function DirectEventPaymentPage({ params }: Props) {
  const { eventId } = await params
  const event = await getExternalEventForPayment(eventId)
  if (!event) notFound()

  const ev = event as any
  const remaining = Math.max(0, Number(ev.total_amount ?? 0) - Number(ev.paid_amount ?? 0))
  const host = ev.host ?? {}
  const space = ev.space ?? null
  const bank = ev.bank ?? null

  return (
    <div style={{ minHeight: '100dvh', background: '#F4F6F5', fontFamily: 'var(--font-poppins, sans-serif)' }}>
      <div style={{ maxWidth: 480, margin: '0 auto', padding: '32px 16px 64px' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <a href="https://espot.do">
            <img src="/logo-dark.svg" alt="Espot" style={{ height: 26 }} />
          </a>
        </div>

        {/* Event card */}
        <div style={{
          background: '#fff', borderRadius: 20, padding: '24px',
          boxShadow: '0 4px 24px rgba(0,0,0,0.07)', border: '1px solid #E8ECF0',
          marginBottom: 16,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            {host.avatar_url ? (
              <img src={host.avatar_url} alt={host.full_name} style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover' }} />
            ) : (
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(53,196,147,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, color: 'var(--brand)' }}>
                {(host.full_name ?? 'H').charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <p style={{ margin: 0, fontSize: 12, color: '#6B7280' }}>Cobro de</p>
              <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#0F1623' }}>{host.full_name ?? 'Organizador'}</p>
            </div>
          </div>

          <div style={{ borderTop: '1px solid #F3F4F6', paddingTop: 16 }}>
            <h2 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 800, color: '#0F1623', letterSpacing: '-0.02em' }}>
              {ev.title}
            </h2>
            <p style={{ margin: '0 0 16px', fontSize: 13, color: '#6B7280' }}>
              {formatDate(ev.event_date)}{ev.event_type ? ` · ${ev.event_type}` : ''}{space ? ` · ${space.name}` : ''}
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {ev.total_amount > 0 && (
                <div style={{ background: '#F9FAFB', borderRadius: 12, padding: '12px 14px' }}>
                  <p style={{ margin: '0 0 2px', fontSize: 11, color: '#9CA3AF' }}>Total acordado</p>
                  <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0F1623' }}>{formatCurrency(ev.total_amount)}</p>
                </div>
              )}
              {ev.paid_amount > 0 && (
                <div style={{ background: '#F0FDF4', borderRadius: 12, padding: '12px 14px' }}>
                  <p style={{ margin: '0 0 2px', fontSize: 11, color: '#9CA3AF' }}>Ya pagado</p>
                  <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#16A34A' }}>{formatCurrency(ev.paid_amount)}</p>
                </div>
              )}
            </div>

            {remaining > 0 && (
              <div style={{ marginTop: 12, background: 'rgba(53,196,147,0.08)', border: '1.5px solid rgba(53,196,147,0.25)', borderRadius: 14, padding: '14px 16px', textAlign: 'center' }}>
                <p style={{ margin: '0 0 2px', fontSize: 12, color: '#374151' }}>Monto pendiente</p>
                <p style={{ margin: 0, fontSize: 26, fontWeight: 900, color: 'var(--brand)', letterSpacing: '-0.03em' }}>{formatCurrency(remaining)}</p>
              </div>
            )}

            {remaining === 0 && ev.total_amount > 0 && (
              <div style={{ marginTop: 12, background: '#F0FDF4', border: '1.5px solid #86EFAC', borderRadius: 14, padding: '14px 16px', textAlign: 'center' }}>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#16A34A', display: 'inline-flex', alignItems: 'center', gap: 6 }}><CheckCircle2 size={15} /> Pago completado</p>
              </div>
            )}
          </div>
        </div>

        {/* Payment options */}
        {remaining > 0 && (
          <PaymentClient
            eventId={eventId}
            bank={bank}
            remaining={remaining}
            hostName={host.full_name ?? 'el organizador'}
          />
        )}

        <p style={{ textAlign: 'center', fontSize: 11, color: '#9CA3AF', marginTop: 20 }}>
          Powered by{' '}
          <a href="https://espot.do" style={{ color: 'var(--brand)', textDecoration: 'none', fontWeight: 600 }}>espot.do</a>
        </p>
      </div>
    </div>
  )
}
