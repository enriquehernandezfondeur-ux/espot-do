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
          .eq('booking_id', bookingId)
          .single()

        if (!installment) { router.push('/dashboard/reservas'); return }

        // Verificar que el booking pertenece al usuario autenticado
        const { data: bk } = await supabase
          .from('bookings').select('guest_id').eq('id', installment.booking_id).single()
        if (!bk || bk.guest_id !== user.id) { router.push('/dashboard/reservas'); return }

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
      if (!amount || Number(amount) <= 0) { router.push('/dashboard/reservas'); return }
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
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/visa-logo.jpg" alt="Visa" style={{ height: 22, width: 'auto', borderRadius: 4, objectFit: 'contain' }} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/mastercard-logo.svg" alt="Mastercard" style={{ height: 22, width: 'auto' }} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/verified-by-visa.svg" alt="Verified by Visa" style={{ height: 20, width: 'auto' }} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/mastercard-id-check.png" alt="Mastercard ID Check" style={{ height: 20, width: 'auto' }} />
        </div>

        {/* Banner seguridad de pago */}
        <div className="mt-6 mx-auto max-w-xs flex items-start gap-2.5 px-4 py-3 rounded-2xl text-left"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#35C493" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
          <div>
            <p className="text-xs font-bold mb-0.5" style={{ color: 'rgba(255,255,255,0.8)' }}>
              Pago 100% seguro
            </p>
            <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.4)' }}>
              Tus datos de tarjeta son procesados por Azul Payments con 3D Secure. Espot nunca almacena tu número de tarjeta.
            </p>
          </div>
        </div>

        <Link href={`/pago/cancelado?b=${bookingId}`}
          className="block mt-4 text-xs" style={{ color: '#CBD5E1', textDecoration: 'underline' }}>
          Cancelar
        </Link>

        {/* Botón de prueba — solo visible en modo test */}
        {TEST_MODE && (
          <button
            onClick={handleTestPay}
            disabled={testLoading}
            className="mt-4 px-5 py-2.5 rounded-xl text-sm font-bold disabled:opacity-50"
            style={{ background: '#F59E0B', color: '#fff', border: '2px dashed rgba(255,255,255,0.3)' }}>
            {testLoading ? 'Procesando...' : 'Simular pago exitoso (TEST)'}
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
