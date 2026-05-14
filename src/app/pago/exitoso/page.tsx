'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { CheckCircle, Calendar, MapPin, ArrowRight, Home, Loader2, Users, Sparkles } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, formatDate, formatTime } from '@/lib/utils'
import { isPaid } from '@/lib/bookingConfig'

function ExitoContent() {
  const sp        = useSearchParams()
  const router    = useRouter()
  const bookingId = sp.get('b')
  const cuotaId   = sp.get('cuota') // ID de la cuota si aplica

  // Parámetros que Azul envía al redirigir al ApprovedUrl
  const orderNumber       = sp.get('OrderNumber') ?? sp.get('ordernumber') ?? ''
  const amount            = sp.get('Amount') ?? ''
  const authorizationCode = sp.get('AuthorizationCode') ?? ''
  const dateTime          = sp.get('DateTime') ?? ''
  const responseCode      = sp.get('ResponseCode') ?? ''
  const isoCode           = sp.get('IsoCode') ?? ''
  const responseMessage   = sp.get('ResponseMessage') ?? ''
  const errorDescription  = sp.get('ErrorDescription') ?? ''
  const rrn               = sp.get('RRN') ?? ''
  const azulOrderId       = sp.get('AzulOrderId') ?? ''
  const authHash          = sp.get('AuthHash') ?? ''

  const [booking,   setBooking]  = useState<any>(null)
  const [confirmed, setConfirmed] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [visible,   setVisible]  = useState(false)

  useEffect(() => {
    if (!bookingId) { router.push('/'); return }

    async function loadAndConfirm() {
      const supabase = createClient()

      // Cargar datos de la reserva
      const { data } = await supabase
        .from('bookings')
        .select('*, spaces!space_id(name, address, city, sector), profiles!guest_id(full_name, email)')
        .eq('id', bookingId)
        .single()

      setBooking(data)

      // Validar que los params requeridos de Azul estén presentes
      const hasAzulParams = isoCode && authHash && orderNumber && amount && azulOrderId

      // Si ya estaba confirmada y no hay params nuevos de Azul (recarga de página), no reprocesar
      // Excepción: si llegan params de Azul + cuotaId, es pago de cuota 2/3 → debe procesarse
      if (isPaid(data?.payment_status) && (!hasAzulParams || !cuotaId)) {
        setConfirmed(true)
        setTimeout(() => setVisible(true), 80)
        return
      }

      // Si Azul envió params de respuesta, verificar y confirmar
      if (hasAzulParams && isoCode === '00') {
        setVerifying(true)
        try {
          const res = await fetch('/api/payments/confirm', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              bookingId,
              cuotaId:           cuotaId || undefined,
              OrderNumber:       orderNumber,
              Amount:            amount,
              AuthorizationCode: authorizationCode,
              DateTime:          dateTime,
              ResponseCode:      responseCode,
              IsoCode:           isoCode,
              ResponseMessage:   responseMessage,
              ErrorDescription:  errorDescription,
              RRN:               rrn,
              AzulOrderId:       azulOrderId,
              AuthHash:          authHash,
            }),
          })
          if (!res.ok && res.status !== 400) throw new Error(`API error: ${res.status}`)
          const result = await res.json()
          if (result.success) {
            setConfirmed(true)
            // Recargar booking para mostrar datos actualizados
            const { data: updated } = await supabase
              .from('bookings')
              .select('*, spaces!space_id(name, address, city, sector), profiles!guest_id(full_name, email)')
              .eq('id', bookingId)
              .single()
            if (updated) setBooking(updated)
          } else {
            // Fallo en verificación — redirigir a fallido
            router.push(`/pago/fallido?b=${bookingId}&r=${encodeURIComponent(result.error ?? 'Error al verificar el pago')}`)
            return
          }
        } catch {
          router.push(`/pago/fallido?b=${bookingId}&r=${encodeURIComponent('Error de conexión al confirmar el pago')}`)
          return
        } finally {
          setVerifying(false)
        }
      } else if (hasAzulParams && isoCode !== '00') {
        // Azul rechazó el pago — redirigir a fallido con el código
        router.push(`/pago/fallido?b=${bookingId}&code=${encodeURIComponent(isoCode)}&r=${encodeURIComponent(responseMessage || 'Pago no aprobado')}`)
        return
      } else {
        // Recarga manual o llegó sin params de Azul — mostrar si ya está pagado en DB
        setConfirmed(isPaid(data?.payment_status))
      }

      setTimeout(() => setVisible(true), 80)
    }

    loadAndConfirm()
  }, [bookingId])

  if (verifying) return (
    <div className="min-h-dvh flex flex-col items-center justify-center gap-4"
      style={{ background: 'linear-gradient(160deg, #071814 0%, #0B0F0E 55%)' }}>
      <Loader2 size={32} className="animate-spin" style={{ color: '#35C493' }} />
      <p className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>Verificando pago con Azul...</p>
    </div>
  )

  if (!booking) return (
    <div className="min-h-dvh flex flex-col items-center justify-center gap-4"
      style={{ background: 'linear-gradient(160deg, #071814 0%, #0B0F0E 55%)' }}>
      <p className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>No se encontró información del pago.</p>
      <a href="/" className="text-sm font-semibold" style={{ color: '#35C493' }}>Volver al inicio</a>
    </div>
  )

  const space     = booking?.spaces as any
  const total     = Number(booking?.total_amount ?? 0)
  const paidSoFar = Number(booking?.paid_amount ?? 0)
  const remaining = total - paidSoFar  // lo que queda por pagar al propietario
  const txId      = booking?.azul_order_id ?? azulOrderId ?? booking?.id?.slice(0, 8).toUpperCase()

  return (
    <div className="min-h-dvh" style={{ background: 'linear-gradient(160deg, #071814 0%, #0B0F0E 55%)' }}>
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, height: 320,
        background: 'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(53,196,147,0.14) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div className="relative max-w-lg mx-auto px-4 py-12 md:py-20">

        <div className="text-center mb-8"
          style={{ opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(16px)', transition: 'all 0.5s ease' }}>
          <div className="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6"
            style={{
              background: 'radial-gradient(circle, rgba(53,196,147,0.2) 0%, rgba(53,196,147,0.06) 70%)',
              border: '2px solid rgba(53,196,147,0.35)',
              boxShadow: '0 0 40px rgba(53,196,147,0.15)',
            }}>
            <CheckCircle size={44} style={{ color: '#35C493' }} />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2" style={{ letterSpacing: '-0.03em' }}>
            ¡Pago exitoso!
          </h1>
          <p className="text-base" style={{ color: 'rgba(255,255,255,0.5)' }}>
            Tu reserva está confirmada. Revisa tu email.
          </p>
        </div>

        {booking && (
          <div className="rounded-3xl overflow-hidden mb-6"
            style={{
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)',
              opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(20px)',
              transition: 'all 0.55s ease 0.1s',
            }}>
            <div className="px-6 py-5 flex items-center justify-between"
              style={{ background: 'rgba(53,196,147,0.1)', borderBottom: '1px solid rgba(53,196,147,0.15)' }}>
              <div>
                <p className="text-xs font-semibold mb-0.5" style={{ color: '#35C493' }}>
                  {booking.event_type ? `${booking.event_type} · ` : ''}RESERVA CONFIRMADA
                </p>
                <p className="text-white font-bold">{space?.name}</p>
              </div>
              <div className="text-right">
                <p className="text-xs mb-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>ID Transacción</p>
                <p className="font-mono text-xs font-bold" style={{ color: '#35C493' }}>{txId}</p>
              </div>
            </div>

            <div className="px-6 py-5 space-y-2.5">
              <div className="flex items-center gap-2.5 text-sm" style={{ color: 'rgba(255,255,255,0.65)' }}>
                <MapPin size={14} style={{ color: '#35C493', flexShrink: 0 }} />
                {space?.address
                  ? `${space.address}, ${[space?.sector, space?.city].filter(Boolean).join(', ')}`
                  : [space?.sector, space?.city].filter(Boolean).join(', ')}
              </div>
              <div className="flex items-center gap-2.5 text-sm" style={{ color: 'rgba(255,255,255,0.65)' }}>
                <Calendar size={14} style={{ color: '#35C493', flexShrink: 0 }} />
                {formatDate(booking.event_date)} · {formatTime(booking.start_time)} – {formatTime(booking.end_time)}
              </div>
              {booking.guest_count && (
                <div className="flex items-center gap-2.5 text-sm" style={{ color: 'rgba(255,255,255,0.65)' }}>
                  <Users size={14} style={{ color: '#35C493', flexShrink: 0 }} />
                  {booking.guest_count} personas
                </div>
              )}
            </div>

            <div style={{ margin: '0 24px', borderTop: '1px dashed rgba(255,255,255,0.1)' }} />

            <div className="px-6 py-5 space-y-3">
              <div className="flex justify-between text-sm">
                <span style={{ color: 'rgba(255,255,255,0.5)' }}>
                  {paidSoFar >= total ? 'Total pagado' : 'Total pagado hasta ahora'}
                </span>
                <span className="font-bold text-white">{formatCurrency(paidSoFar)}</span>
              </div>
              {remaining > 0 && (
                <div className="flex justify-between text-sm">
                  <div>
                    <span style={{ color: 'rgba(255,255,255,0.5)' }}>Pendiente de pago</span>
                    <p className="text-[11px] mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>
                      Pagas el resto según tu plan de cuotas · revisa en "Mis reservas"
                    </p>
                  </div>
                  <span style={{ color: 'rgba(255,255,255,0.5)' }}>{formatCurrency(remaining)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                <span style={{ color: 'rgba(255,255,255,0.5)' }}>Total del evento</span>
                <span className="font-semibold text-white">{formatCurrency(total)}</span>
              </div>
            </div>

            {(booking.azul_auth_code || authorizationCode) && (
              <div className="px-6 pb-5">
                <div className="rounded-xl px-4 py-3 flex items-center justify-between"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <span className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>Código de autorización</span>
                  <span className="font-mono text-xs font-bold" style={{ color: 'rgba(255,255,255,0.6)' }}>
                    {booking.azul_auth_code ?? authorizationCode}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="space-y-3"
          style={{ opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(20px)', transition: 'all 0.6s ease 0.2s' }}>
          <Link href={`/dashboard/reservas/${bookingId}`}
            className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl font-bold text-base"
            style={{ background: '#35C493', color: '#071814', boxShadow: '0 4px 20px rgba(53,196,147,0.25)' }}>
            <Calendar size={17} /> Ver mi reserva y plan de pagos <ArrowRight size={15} />
          </Link>
          {bookingId && (
            <a href={`/contrato/${bookingId}`} target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl font-semibold text-sm"
              style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.75)', border: '1px solid rgba(255,255,255,0.12)' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
              </svg>
              Ver contrato de reserva
            </a>
          )}
          <Link href="/"
            className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl font-semibold text-sm"
            style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.65)', border: '1px solid rgba(255,255,255,0.09)' }}>
            <Home size={15} /> Explorar más espacios
          </Link>
        </div>

        <p className="text-center text-xs mt-8" style={{ color: 'rgba(255,255,255,0.2)' }}>
          espot.do · Procesado por <span style={{ color: '#0057A8', fontWeight: 700 }}>azul</span> payments
        </p>
      </div>
    </div>
  )
}

export default function ExitoPage() {
  return <Suspense fallback={
    <div className="min-h-dvh flex items-center justify-center" style={{ background: '#0B0F0E' }}>
      <Loader2 size={28} className="animate-spin" style={{ color: '#35C493' }} />
    </div>
  }><ExitoContent /></Suspense>
}
