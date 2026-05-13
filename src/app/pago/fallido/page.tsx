'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { XCircle, RefreshCw, MessageCircle, Phone, CreditCard, Lightbulb } from 'lucide-react'

// Consejos específicos por código ISO de Azul
const ISO_TIPS: Record<string, { short: string; tip: string }> = {
  '01': { short: 'Requiere autorización del banco',   tip: 'Llama al número del reverso de tu tarjeta y autoriza la transacción antes de intentar de nuevo.' },
  '04': { short: 'Tarjeta retenida',                  tip: 'Tu banco retuvo la tarjeta. Llama al número del reverso para liberar el bloqueo.' },
  '05': { short: 'Pago no autorizado',                tip: 'Tu banco no autorizó el pago. Llama al número del reverso de tu tarjeta para resolver.' },
  '06': { short: 'Error general',                     tip: 'Error general del banco. Intenta de nuevo o usa otra tarjeta.' },
  '12': { short: 'Transacción inválida',              tip: 'Verifica los datos de tu tarjeta e intenta de nuevo.' },
  '13': { short: 'Monto inválido',                    tip: 'Hubo un error con el monto. Contacta soporte.' },
  '14': { short: 'Número de tarjeta incorrecto',      tip: 'Verifica el número de tarjeta con cuidado e intenta de nuevo.' },
  '51': { short: 'Fondos insuficientes',              tip: 'Verifica el saldo disponible o usa otra tarjeta con fondos suficientes.' },
  '52': { short: 'Cuenta inválida',                   tip: 'La cuenta de esta tarjeta no es válida. Usa otra tarjeta.' },
  '54': { short: 'Tarjeta vencida',                   tip: 'Esta tarjeta ya venció. Usa una tarjeta vigente.' },
  '57': { short: 'Transacción no permitida',          tip: 'Tu tarjeta no permite compras en línea. Habilítalo en la app de tu banco o usa otra tarjeta.' },
  '58': { short: 'Transacción no permitida al terminal', tip: 'Tu tarjeta no permite este tipo de operación. Contacta a tu banco.' },
  '62': { short: 'Tarjeta restringida',               tip: 'Tu banco tiene restricciones en esta tarjeta. Contáctalos para habilitarla.' },
  '63': { short: 'Violación de seguridad',            tip: 'Problema de seguridad con esta transacción. Contacta a tu banco.' },
  '65': { short: 'Límite de intentos superado',       tip: 'Espera 24 horas o usa una tarjeta diferente.' },
  '68': { short: 'Respuesta tardía',                  tip: 'El banco tardó demasiado en responder. Intenta de nuevo.' },
  '91': { short: 'Banco no disponible',               tip: 'El banco emisor está temporalmente fuera de servicio. Intenta en unos minutos.' },
  '96': { short: 'Error del sistema',                 tip: 'Error temporal. Espera unos minutos e intenta de nuevo.' },
}

function defaultTip(code: string) {
  return ISO_TIPS[code] ?? { short: 'Pago rechazado', tip: 'Verifica los datos de tu tarjeta o intenta con otra tarjeta.' }
}

function FallidoContent() {
  const sp        = useSearchParams()
  const bookingId = sp.get('b')
  const code      = sp.get('code') ?? ''
  const reason    = sp.get('r') ?? 'El pago fue rechazado por la pasarela.'
  const [visible, setVisible] = useState(false)

  useEffect(() => { setTimeout(() => setVisible(true), 80) }, [])

  const { short, tip } = defaultTip(code)

  return (
    <div className="min-h-dvh" style={{ background: 'linear-gradient(160deg, #140707 0%, #0B0F0E 55%)' }}>

      {/* Fondo decorativo rojo */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, height: 320,
        background: 'radial-gradient(ellipse 70% 50% at 50% -10%, rgba(220,38,38,0.10) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div className="relative max-w-lg mx-auto px-4 py-12 md:py-20">

        {/* Icono */}
        <div className="text-center mb-8"
          style={{ opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(16px)', transition: 'all 0.5s ease' }}>
          <div className="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6"
            style={{
              background: 'radial-gradient(circle, rgba(220,38,38,0.18) 0%, rgba(220,38,38,0.05) 70%)',
              border: '2px solid rgba(220,38,38,0.25)',
            }}>
            <XCircle size={44} style={{ color: '#EF4444' }} />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2" style={{ letterSpacing: '-0.03em' }}>
            Pago no procesado
          </h1>
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
            No se realizó ningún cargo a tu tarjeta.
          </p>
        </div>

        {/* Motivo */}
        <div className="rounded-2xl overflow-hidden mb-4"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(20px)',
            transition: 'all 0.55s ease 0.1s',
          }}>

          <div className="px-5 py-4"
            style={{ background: 'rgba(220,38,38,0.08)', borderBottom: '1px solid rgba(220,38,38,0.12)' }}>
            <p className="text-xs font-semibold mb-0.5" style={{ color: '#EF4444' }}>
              {code ? `CÓDIGO ${code} — ` : ''}{short.toUpperCase()}
            </p>
            <p className="text-sm text-white">{reason}</p>
          </div>

          <div className="px-5 py-4">
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{ background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.2)' }}>
                <Lightbulb size={13} style={{ color: '#F59E0B' }} />
              </div>
              <div>
                <p className="text-xs font-semibold mb-1" style={{ color: 'rgba(255,255,255,0.5)' }}>Qué puedes hacer</p>
                <p className="text-sm" style={{ color: 'rgba(255,255,255,0.7)' }}>{tip}</p>
              </div>
            </div>
          </div>
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
              className="flex items-center justify-center gap-2.5 w-full py-4 rounded-2xl font-bold text-base"
              style={{ background: '#35C493', color: '#071814', boxShadow: '0 4px 20px rgba(53,196,147,0.2)' }}>
              <CreditCard size={17} /> Intentar con otra tarjeta
            </Link>
          )}
          <a href="mailto:contacto@espot.do"
            className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl font-semibold text-sm"
            style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.65)', border: '1px solid rgba(255,255,255,0.09)' }}>
            <MessageCircle size={15} /> Contactar soporte
          </a>
          <Link href="/"
            className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl font-medium text-sm"
            style={{ color: 'rgba(255,255,255,0.3)' }}>
            Volver al inicio
          </Link>
        </div>

        <p className="text-center text-xs mt-10" style={{ color: 'rgba(255,255,255,0.15)' }}>
          espot.do · Procesado por <span style={{ color: '#0057A8', fontWeight: 700 }}>azul</span> payments
        </p>
      </div>
    </div>
  )
}

export default function FallidoPage() {
  return <Suspense fallback={
    <div className="min-h-dvh flex items-center justify-center" style={{ background: '#0B0F0E' }}>
      <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#EF4444' }} />
    </div>
  }><FallidoContent /></Suspense>
}
