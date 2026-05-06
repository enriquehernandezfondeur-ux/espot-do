'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { CheckCircle, Calendar, ArrowRight, Home } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, formatDate, formatTime } from '@/lib/utils'

function ExitoContent() {
  const sp        = useSearchParams()
  const bookingId = sp.get('b')
  const [booking, setBooking] = useState<any>(null)

  useEffect(() => {
    if (!bookingId) return
    const supabase = createClient()
    supabase.from('bookings')
      .select('*, spaces!space_id(name, address, city), profiles!guest_id(full_name)')
      .eq('id', bookingId)
      .single()
      .then(({ data }) => setBooking(data))
  }, [bookingId])

  const space = booking?.spaces as any

  return (
    <div className="min-h-screen flex items-center justify-center px-4"
      style={{ background: 'linear-gradient(145deg, #071410 0%, #0B0F0E 60%)' }}>
      <div className="w-full max-w-md text-center">

        {/* Success animation */}
        <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
          style={{ background: 'rgba(53,196,147,0.15)', border: '2px solid rgba(53,196,147,0.3)' }}>
          <CheckCircle size={40} style={{ color: '#35C493' }} />
        </div>

        <h1 className="text-3xl font-bold text-white mb-2" style={{ letterSpacing: '-0.02em' }}>
          ¡Pago exitoso!
        </h1>
        <p className="text-base mb-8" style={{ color: 'rgba(255,255,255,0.5)' }}>
          Tu reserva está confirmada. Te enviamos los detalles por email.
        </p>

        {booking && (
          <div className="rounded-2xl p-6 mb-8 text-left"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="text-sm font-bold text-white mb-4">{space?.name}</div>
            <div className="space-y-2.5 text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>
              <div className="flex items-center gap-2">
                <Calendar size={14} style={{ color: '#35C493' }} />
                {formatDate(booking.event_date)} · {formatTime(booking.start_time)} – {formatTime(booking.end_time)}
              </div>
              <div className="flex items-center gap-2">
                <span style={{ color: '#35C493' }}>💰</span>
                Depósito pagado (10%): <span className="text-white font-bold">{formatCurrency(Number(booking.platform_fee))}</span>
              </div>
              <div className="flex items-center gap-2">
                <span style={{ color: 'rgba(255,255,255,0.4)' }}>📋</span>
                <span style={{ color: 'rgba(255,255,255,0.5)' }}>Resta pagar en el espacio: {formatCurrency(Number(booking.total_amount) - Number(booking.platform_fee))}</span>
              </div>
              <div className="flex items-center gap-2">
                <span style={{ color: '#35C493' }}>🆔</span>
                ID: <span className="text-white font-mono text-xs">{booking.azul_order_id ?? booking.id?.slice(0, 8).toUpperCase()}</span>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-3">
          <Link href="/dashboard/reservas"
            className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl font-bold text-sm"
            style={{ background: '#35C493', color: '#0B0F0E' }}>
            <Calendar size={16} /> Ver mis reservas <ArrowRight size={14} />
          </Link>
          <Link href="/"
            className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl font-semibold text-sm"
            style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <Home size={15} /> Ir al inicio
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function ExitoPage() {
  return <Suspense fallback={null}><ExitoContent /></Suspense>
}
