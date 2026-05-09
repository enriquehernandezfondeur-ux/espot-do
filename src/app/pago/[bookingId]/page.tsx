'use client'

import { useEffect, use } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Suspense } from 'react'

function PagoContent({ bookingId }: { bookingId: string }) {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const cuotaId      = searchParams.get('cuota') // ID de la cuota específica (installment)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth'); return }

      // Si viene con cuotaId → es un pago de cuota específica
      if (cuotaId) {
        const { data: installment } = await supabase
          .from('booking_installments')
          .select('id, amount, status, booking_id')
          .eq('id', cuotaId)
          .single()

        if (!installment) { router.push('/dashboard/reservas'); return }
        if (installment.status === 'paid') {
          router.push(`/pago/exitoso?b=${bookingId}`)
          return
        }

        // Redirigir a Azul con el monto de esta cuota + cuotaId en el OrderNumber
        window.location.href = `/api/payments/redirect/${bookingId}?amount=${installment.amount}&cuota=${cuotaId}`
        return
      }

      // Pago normal (primera cuota o pago único)
      const { data } = await supabase
        .from('bookings')
        .select('total_amount, payment_status, booking_installments(amount, status, installment_number)')
        .eq('id', bookingId)
        .eq('guest_id', user.id)
        .single()

      if (!data) { router.push('/dashboard/reservas'); return }

      const { isPaid } = await import('@/lib/bookingConfig')
      if (isPaid(data.payment_status)) { router.push(`/pago/exitoso?b=${bookingId}`); return }

      // Si hay cuotas, pagar la primera pendiente
      const insts = (data as any).booking_installments ?? []
      const nextInst = insts
        .sort((a: any, b: any) => a.installment_number - b.installment_number)
        .find((i: any) => i.status !== 'paid')

      const amount = nextInst ? nextInst.amount : data.total_amount
      const cuotaParam = nextInst ? `&cuota=${nextInst.id}` : ''

      window.location.href = `/api/payments/redirect/${bookingId}?amount=${amount}${cuotaParam}`
    }
    load()
  }, [bookingId, cuotaId])

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

export default function PagoPage({ params }: { params: Promise<{ bookingId: string }> }) {
  const { bookingId } = use(params)
  return (
    <Suspense fallback={null}>
      <PagoContent bookingId={bookingId} />
    </Suspense>
  )
}
