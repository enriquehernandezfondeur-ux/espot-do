'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import Link from 'next/link'
import { XCircle, RefreshCw, MessageCircle } from 'lucide-react'

function FallidoContent() {
  const sp        = useSearchParams()
  const bookingId = sp.get('b')
  const reason    = sp.get('r') ?? 'El pago fue rechazado por la pasarela.'

  return (
    <div className="min-h-screen flex items-center justify-center px-4"
      style={{ background: 'linear-gradient(145deg, #1a0505 0%, #0B0F0E 60%)' }}>
      <div className="w-full max-w-md text-center">

        <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
          style={{ background: 'rgba(220,38,38,0.12)', border: '2px solid rgba(220,38,38,0.2)' }}>
          <XCircle size={40} style={{ color: '#EF4444' }} />
        </div>

        <h1 className="text-3xl font-bold text-white mb-2" style={{ letterSpacing: '-0.02em' }}>
          Pago no procesado
        </h1>
        <p className="text-base mb-4" style={{ color: 'rgba(255,255,255,0.45)' }}>
          {reason}
        </p>
        <p className="text-sm mb-8" style={{ color: 'rgba(255,255,255,0.3)' }}>
          Tu reserva no fue confirmada. No se realizó ningún cargo.
        </p>

        <div className="space-y-3">
          {bookingId && (
            <Link href={`/pago/${bookingId}`}
              className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl font-bold text-sm"
              style={{ background: '#35C493', color: '#0B0F0E' }}>
              <RefreshCw size={15} /> Intentar de nuevo
            </Link>
          )}
          <a href="mailto:contacto@espot.do"
            className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl font-semibold text-sm"
            style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <MessageCircle size={15} /> Contactar soporte
          </a>
        </div>
      </div>
    </div>
  )
}

export default function FallidoPage() {
  return <Suspense fallback={null}><FallidoContent /></Suspense>
}
