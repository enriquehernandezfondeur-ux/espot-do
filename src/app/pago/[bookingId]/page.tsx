'use client'

import { useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function PagoPage({ params }: { params: Promise<{ bookingId: string }> }) {
  const { bookingId } = use(params)
  const router = useRouter()

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth'); return }

      const { data } = await supabase
        .from('bookings')
        .select('total_amount, payment_status')
        .eq('id', bookingId)
        .eq('guest_id', user.id)
        .single()

      if (!data) { router.push('/dashboard/reservas'); return }

      const { isPaid } = await import('@/lib/bookingConfig')
      if (isPaid(data.payment_status)) { router.push(`/pago/exitoso?b=${bookingId}`); return }

      // Pasar el monto en la URL para evitar llamadas a Supabase en el servidor
      window.location.href = `/api/payments/redirect/${bookingId}?amount=${data.total_amount}`
    }
    load()
  }, [bookingId])

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-4"
      style={{ background: '#F4F6F8' }}>
      <div className="text-center">
        <img src="/logo-dark.svg" alt="espot.do"
          style={{ height: 26, width: 'auto', margin: '0 auto 32px' }} />
        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5"
          style={{ background: 'rgba(0,87,168,0.08)', border: '2px solid rgba(0,87,168,0.12)' }}>
          <Loader2 size={28} className="animate-spin" style={{ color: '#0057A8' }} />
        </div>
        <p className="font-semibold mb-1" style={{ color: '#0F1623' }}>
          Conectando con Azul Payments...
        </p>
        <p className="text-sm" style={{ color: '#94A3B8' }}>
          Serás redirigido a la página segura de pago
        </p>
        <Link href={`/pago/cancelado?b=${bookingId}`}
          className="block mt-8 text-xs" style={{ color: '#CBD5E1', textDecoration: 'underline' }}>
          Cancelar
        </Link>
      </div>
    </div>
  )
}
