'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { Clock, ArrowRight, Search } from 'lucide-react'

function CanceladoContent() {
  const sp        = useSearchParams()
  const bookingId = sp.get('b')
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    setTimeout(() => setVisible(true), 80)
    // Resetear booking de 'processing' a 'payment_pending' para permitir reintentos
    if (bookingId) {
      fetch('/api/payments/cancel', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ bookingId }),
      }).catch(() => {})
    }
  }, [bookingId])

  return (
    <div className="min-h-dvh" style={{ background: 'linear-gradient(160deg, #03313C 0%, #03313C 55%)' }}>

      {/* Fondo decorativo neutro */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, height: 320,
        background: 'radial-gradient(ellipse 70% 50% at 50% -10%, rgba(100,116,139,0.08) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div className="relative max-w-md mx-auto px-4 py-16 md:py-24 text-center">

        {/* Icono */}
        <div style={{
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0)' : 'translateY(16px)',
          transition: 'all 0.5s ease',
        }}>
          <div className="w-22 h-22 rounded-full flex items-center justify-center mx-auto mb-6"
            style={{
              width: 88, height: 88,
              background: 'rgba(100,116,139,0.1)',
              border: '2px solid rgba(100,116,139,0.2)',
            }}>
            <Clock size={40} style={{ color: '#94A3B8' }} />
          </div>
          <h1 className="text-3xl font-bold text-white mb-3" style={{ letterSpacing: '-0.03em' }}>
            Pago cancelado
          </h1>
          <p className="text-base mb-2" style={{ color: 'rgba(255,255,255,0.45)' }}>
            No se realizó ningún cargo a tu tarjeta.
          </p>
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.25)' }}>
            Tu reserva quedará pendiente hasta que completes el pago.
          </p>
        </div>

        {/* Card informativa */}
        <div className="rounded-2xl mt-8 mb-8 p-5 text-left"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.07)',
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(20px)',
            transition: 'all 0.55s ease 0.1s',
          }}>
          <p className="text-xs font-semibold mb-3" style={{ color: 'rgba(255,255,255,0.35)', letterSpacing: '0.08em' }}>
            ¿QUÉ PASA AHORA?
          </p>
          <ul className="space-y-3">
            {[
              'Tu reserva sigue activa y pendiente de pago.',
              'Puedes completar el pago cuando quieras desde tu panel de reservas.',
              'El espacio permanece disponible para otros clientes hasta que confirmes tu pago.',
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm" style={{ color: 'rgba(255,255,255,0.55)' }}>
                <span className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.4)' }}>
                  {i + 1}
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* Acciones */}
        <div className="space-y-3"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(20px)',
            transition: 'all 0.6s ease 0.2s',
          }}>
          {bookingId && (
            <Link href={`/pago/${bookingId}`}
              className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl font-bold text-base"
              style={{ background: '#35C493', color: '#03313C', boxShadow: '0 4px 20px rgba(53,196,147,0.2)' }}>
              Completar pago <ArrowRight size={16} />
            </Link>
          )}
          <Link href="/dashboard/reservas"
            className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl font-semibold text-sm"
            style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.08)' }}>
            Ver mis reservas
          </Link>
          <Link href="/buscar"
            className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl font-medium text-sm"
            style={{ color: 'rgba(255,255,255,0.3)' }}>
            <Search size={14} /> Explorar espacios
          </Link>
        </div>

        <p className="text-xs mt-10" style={{ color: 'rgba(255,255,255,0.15)' }}>
          espot.do · Pagos seguros por <span style={{ color: '#0057A8', fontWeight: 700 }}>azul</span>
        </p>
      </div>
    </div>
  )
}

export default function CanceladoPage() {
  return <Suspense fallback={
    <div className="min-h-dvh flex items-center justify-center" style={{ background: '#03313C' }}>
      <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#94A3B8' }} />
    </div>
  }><CanceladoContent /></Suspense>
}
