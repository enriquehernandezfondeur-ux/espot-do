'use client'

import React, { useEffect, use } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Suspense } from 'react'

const TEST_MODE = process.env.NEXT_PUBLIC_PAYMENT_TEST_MODE === '1'

function PagoContent({ bookingId }: { bookingId: string }) {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const cuotaIdRaw   = searchParams.get('cuota')
  const cuotaId      = cuotaIdRaw && cuotaIdRaw !== 'undefined' ? cuotaIdRaw : null
  const [testLoading, setTestLoading] = React.useState(false)

  async function handleTestPay() {
    setTestLoading(true)
    const res = await fetch('/api/payments/test-confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookingId, cuotaId: cuotaId || undefined }),
    })
    const data = await res.json()
    if (data.success) {
      router.push(`/pago/exitoso?b=${bookingId}${cuotaId ? `&cuota=${cuotaId}` : ''}`)
    } else {
      alert(data.error ?? 'Error al simular el pago')
      setTestLoading(false)
    }
  }

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
        .select('total_amount, payment_status, booking_installments(id, amount, status, installment_number)')
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

        {/* Logos 3D Secure — requerido por Azul */}
        <div className="flex items-center justify-center gap-3 mt-6 flex-wrap">
          <div className="px-3 py-1.5 rounded-lg" style={{ background: '#1A1F71' }}>
            <svg width="36" height="12" viewBox="0 0 36 12"><text x="0" y="10" fontFamily="Arial" fontWeight="900" fontSize="12" fill="#fff">VISA</text></svg>
          </div>
          <div className="px-2 py-1 rounded-lg flex items-center gap-1" style={{ background: '#252525' }}>
            <svg width="24" height="14" viewBox="0 0 24 14"><circle cx="8" cy="7" r="7" fill="#EB001B"/><circle cx="16" cy="7" r="7" fill="#F79E1B"/><path d="M12 2.1a7 7 0 0 1 0 9.8A7 7 0 0 1 12 2.1z" fill="#FF5F00"/></svg>
          </div>
          <div className="px-2.5 py-1 rounded-lg text-[10px] font-bold" style={{ background: '#EEF2FF', color: '#1A1F71', border: '1px solid #C7D2FE' }}>
            Verified by Visa
          </div>
          <div className="px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1" style={{ background: '#FFF7ED', color: '#92400E', border: '1px solid #FED7AA' }}>
            <svg width="12" height="8" viewBox="0 0 12 8"><circle cx="4" cy="4" r="4" fill="#EB001B"/><circle cx="8" cy="4" r="4" fill="#F79E1B"/></svg>
            ID Check
          </div>
        </div>

        <Link href={`/pago/cancelado?b=${bookingId}`}
          className="block mt-6 text-xs" style={{ color: '#CBD5E1', textDecoration: 'underline' }}>
          Cancelar
        </Link>

        {/* Botón de prueba — solo visible en modo test */}
        {TEST_MODE && (
          <button
            onClick={handleTestPay}
            disabled={testLoading}
            className="mt-4 px-5 py-2.5 rounded-xl text-sm font-bold disabled:opacity-50"
            style={{ background: '#F59E0B', color: '#fff', border: '2px dashed rgba(255,255,255,0.3)' }}>
            {testLoading ? '⏳ Procesando...' : '🧪 Simular pago exitoso (TEST)'}
          </button>
        )}
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
