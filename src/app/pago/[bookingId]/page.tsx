'use client'

import { useState, useEffect, use, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Lock, Calendar, Users, MapPin, Loader2, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, formatDate, formatTime } from '@/lib/utils'
import { isPaid } from '@/lib/bookingConfig'

export default function PagoPage({ params }: { params: Promise<{ bookingId: string }> }) {
  const { bookingId } = use(params)
  const router   = useRouter()
  const supabase = createClient()
  const formRef  = useRef<HTMLFormElement>(null)

  const [booking,  setBooking]  = useState<any>(null)
  const [step,     setStep]     = useState<'loading' | 'redirecting' | 'error'>('loading')
  const [error,    setError]    = useState('')
  const [azulFields,   setAzulFields]   = useState<Record<string, string> | null>(null)
  const [azulPageUrl,  setAzulPageUrl]  = useState('')

  // Auto-submit form a Azul cuando los campos estén listos
  useEffect(() => {
    if (azulFields && formRef.current) {
      formRef.current.submit()
    }
  }, [azulFields])

  useEffect(() => {
    async function loadAndRedirect() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth'); return }

      const { data } = await supabase
        .from('bookings')
        .select(`
          *,
          spaces!space_id(name, address, city, sector, space_images(url, is_cover)),
          profiles!guest_id(full_name, email),
          booking_addons(quantity, unit_price, subtotal, space_addons(name))
        `)
        .eq('id', bookingId)
        .eq('guest_id', user.id)
        .single()

      if (!data) { router.push('/dashboard/reservas'); return }
      if (isPaid(data.payment_status)) { router.push(`/pago/exitoso?b=${bookingId}`); return }

      setBooking(data)
      setStep('redirecting')

      // Iniciar pago automáticamente
      try {
        const res  = await fetch('/api/payments/initiate', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ bookingId }),
        })
        const json = await res.json()

        if (!res.ok || json.error) {
          setError(json.error ?? 'No se pudo iniciar el pago.')
          setStep('error')
          return
        }

        setAzulPageUrl(json.pageUrl)
        setAzulFields(json.fields)
      } catch {
        setError('Error de conexión. Verifica tu red e intenta de nuevo.')
        setStep('error')
      }
    }

    loadAndRedirect()
  }, [bookingId])

  const space = booking?.spaces as any
  const total = Number(booking?.total_amount ?? 0)
  const fee   = Number(booking?.platform_fee) || Math.round(total * 0.10 * 100) / 100

  return (
    <>
      {/* Form oculto que se envía a Azul PaymentPage */}
      {azulFields && azulPageUrl && (
        <form ref={formRef} method="POST" action={azulPageUrl} style={{ display: 'none' }}>
          {Object.entries(azulFields).map(([key, value]) => (
            <input key={key} type="hidden" name={key} value={value} />
          ))}
        </form>
      )}

      <div className="min-h-screen flex flex-col items-center justify-center px-4"
        style={{ background: '#F4F6F8' }}>

        {/* Estado: cargando / redirigiendo */}
        {(step === 'loading' || step === 'redirecting') && (
          <div className="w-full max-w-sm text-center">

            {/* Logo */}
            <img src="/logo-dark.svg" alt="EspotHub" style={{ height: 28, width: 'auto', margin: '0 auto 32px' }} />

            {/* Spinner Azul */}
            <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
              style={{ background: 'rgba(0,87,168,0.08)', border: '2px solid rgba(0,87,168,0.15)' }}>
              <Loader2 size={34} className="animate-spin" style={{ color: '#0057A8' }} />
            </div>

            <h2 className="text-lg font-bold mb-1" style={{ color: '#0F1623' }}>
              {step === 'loading' ? 'Verificando reserva...' : 'Conectando con Azul Payments...'}
            </h2>
            <p className="text-sm mb-8" style={{ color: '#94A3B8' }}>
              Serás redirigido a la página segura de pago
            </p>

            {/* Resumen mini — aparece mientras espera */}
            {booking && (
              <div className="rounded-2xl p-4 text-left mb-6"
                style={{ background: '#fff', border: '1px solid #E8ECF0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                <p className="font-bold text-sm mb-3" style={{ color: '#0F1623' }}>{space?.name}</p>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-xs" style={{ color: '#6B7280' }}>
                    <MapPin size={11} style={{ color: '#35C493' }} />
                    {[space?.sector, space?.city].filter(Boolean).join(', ')}
                  </div>
                  <div className="flex items-center gap-2 text-xs" style={{ color: '#6B7280' }}>
                    <Calendar size={11} style={{ color: '#35C493' }} />
                    {formatDate(booking.event_date)} · {formatTime(booking.start_time)} – {formatTime(booking.end_time)}
                  </div>
                  <div className="flex items-center gap-2 text-xs" style={{ color: '#6B7280' }}>
                    <Users size={11} style={{ color: '#35C493' }} />
                    {booking.guest_count} personas · {booking.event_type}
                  </div>
                </div>
                <div className="flex items-center justify-between mt-3 pt-3"
                  style={{ borderTop: '1px solid #F0F2F5' }}>
                  <span className="text-xs" style={{ color: '#6B7280' }}>Depósito a pagar hoy</span>
                  <span className="font-bold text-sm" style={{ color: '#0F1623' }}>{formatCurrency(fee)}</span>
                </div>
              </div>
            )}

            {/* Badge seguridad */}
            <div className="flex items-center justify-center gap-2 text-xs" style={{ color: '#CBD5E1' }}>
              <Lock size={11} style={{ color: '#35C493' }} />
              Pago seguro SSL · Procesado por{' '}
              <span style={{ color: '#0057A8', fontWeight: 700 }}>azul</span>
            </div>

            <Link href={`/pago/cancelado?b=${bookingId}`}
              className="block mt-6 text-xs" style={{ color: '#CBD5E1', textDecoration: 'underline' }}>
              Cancelar
            </Link>
          </div>
        )}

        {/* Estado: error */}
        {step === 'error' && (
          <div className="w-full max-w-sm text-center">
            <img src="/logo-dark.svg" alt="EspotHub" style={{ height: 28, width: 'auto', margin: '0 auto 32px' }} />

            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5"
              style={{ background: 'rgba(220,38,38,0.08)', border: '2px solid rgba(220,38,38,0.15)' }}>
              <X size={28} style={{ color: '#DC2626' }} />
            </div>

            <h2 className="text-lg font-bold mb-2" style={{ color: '#0F1623' }}>No se pudo iniciar el pago</h2>
            <p className="text-sm mb-6" style={{ color: '#DC2626' }}>{error}</p>

            <button
              className="w-full py-3.5 rounded-2xl font-bold text-sm mb-3"
              style={{ background: '#35C493', color: '#fff' }}
              onClick={async () => {
                setStep('redirecting')
                setError('')
                try {
                  const res  = await fetch('/api/payments/initiate', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ bookingId }),
                  })
                  const json = await res.json()
                  if (!res.ok || json.error) { setError(json.error ?? 'Error'); setStep('error'); return }
                  setAzulPageUrl(json.pageUrl)
                  setAzulFields(json.fields)
                } catch { setError('Error de conexión.'); setStep('error') }
              }}>
              Intentar de nuevo
            </button>

            <Link href="/dashboard/reservas"
              className="block text-xs" style={{ color: '#94A3B8' }}>
              Volver a mis reservas
            </Link>
          </div>
        )}
      </div>
    </>
  )
}
