'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Lock, CreditCard, Calendar, Users, MapPin,
  ShieldCheck, ChevronLeft, Loader2, AlertCircle,
  CheckCircle,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, formatDate, formatTime } from '@/lib/utils'
import { formatCard, detectBrand } from '@/lib/azul/client'

// ── Iconos de tarjeta ─────────────────────────────────────
function VisaIcon() {
  return (
    <svg width="38" height="24" viewBox="0 0 38 24" fill="none">
      <rect width="38" height="24" rx="4" fill="#1A1F71"/>
      <path d="M16 16.5H13.5L15.1 7.5H17.6L16 16.5Z" fill="white"/>
      <path d="M24.3 7.7C23.8 7.5 23 7.3 22 7.3C19.5 7.3 17.8 8.6 17.8 10.4C17.8 11.7 19 12.5 19.9 12.9C20.8 13.3 21.1 13.6 21.1 14C21.1 14.6 20.4 14.9 19.7 14.9C18.7 14.9 18.2 14.7 17.3 14.4L17 14.2L16.6 16.3C17.2 16.6 18.3 16.8 19.4 16.8C22 16.8 23.7 15.5 23.7 13.6C23.7 12.5 23 11.7 21.5 11.1C20.7 10.7 20.2 10.4 20.2 9.9C20.2 9.5 20.6 9.1 21.6 9.1C22.4 9.1 23 9.3 23.4 9.5L23.6 9.6L24.3 7.7Z" fill="white"/>
      <path d="M27.5 7.5H25.5C24.9 7.5 24.5 7.7 24.3 8.3L20.8 16.5H23.3L23.8 15H26.8L27.1 16.5H29.3L27.5 7.5ZM24.5 13.1C24.7 12.6 25.5 10.4 25.5 10.4C25.5 10.4 25.7 9.8 25.8 9.5L26 10.3C26 10.3 26.6 13 26.7 13.1H24.5Z" fill="white"/>
      <path d="M13 7.5L10.5 13.5L10.2 12C9.7 10.4 8.2 8.7 6.5 7.8L8.8 16.5H11.3L15 7.5H13Z" fill="white"/>
      <path d="M7.9 7.5H4L3.9 7.7C7 8.5 9.1 10.3 10 12.3L9 8.4C8.8 7.8 8.4 7.5 7.9 7.5Z" fill="#F9A533"/>
    </svg>
  )
}

function MCIcon() {
  return (
    <svg width="38" height="24" viewBox="0 0 38 24" fill="none">
      <rect width="38" height="24" rx="4" fill="#252525"/>
      <circle cx="15" cy="12" r="7" fill="#EB001B"/>
      <circle cx="23" cy="12" r="7" fill="#F79E1B"/>
      <path d="M19 6.8C20.5 7.9 21.5 9.8 21.5 12C21.5 14.2 20.5 16.1 19 17.2C17.5 16.1 16.5 14.2 16.5 12C16.5 9.8 17.5 7.9 19 6.8Z" fill="#FF5F00"/>
    </svg>
  )
}

function AmexIcon() {
  return (
    <svg width="38" height="24" viewBox="0 0 38 24" fill="none">
      <rect width="38" height="24" rx="4" fill="#2557D6"/>
      <text x="19" y="16" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold" fontFamily="Arial">AMEX</text>
    </svg>
  )
}

function CardIcon({ brand }: { brand: string }) {
  if (brand === 'visa')       return <VisaIcon />
  if (brand === 'mastercard') return <MCIcon />
  if (brand === 'amex')       return <AmexIcon />
  return <CreditCard size={20} style={{ color: '#94A3B8' }} />
}

export default function PagoPage({ params }: { params: Promise<{ bookingId: string }> }) {
  const { bookingId } = use(params)
  const router  = useRouter()
  const supabase = createClient()

  const [booking, setBooking]   = useState<any>(null)
  const [loading, setLoading]   = useState(true)
  const [paying,  setPaying]    = useState(false)
  const [error,   setError]     = useState('')

  // Card state
  const [cardNum,  setCardNum]  = useState('')
  const [expiry,   setExpiry]   = useState('')
  const [cvv,      setCvv]      = useState('')
  const [name,     setName]     = useState('')
  const brand = detectBrand(cardNum)

  useEffect(() => {
    async function load() {
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
      if (data.payment_status === 'paid') { router.push(`/pago/exitoso?b=${bookingId}`); return }
      setBooking(data)
      setLoading(false)
    }
    load()
  }, [bookingId])

  function handleCardInput(val: string) {
    setCardNum(formatCard(val))
  }

  function handleExpiry(val: string) {
    const digits = val.replace(/\D/g, '').slice(0, 6) // soporta MM/AA y MM/AAAA
    if (digits.length >= 2) {
      const mm = digits.slice(0, 2)
      if (Number(mm) > 12) return
      setExpiry(digits.length >= 3 ? `${mm}/${digits.slice(2)}` : mm)
    } else {
      setExpiry(digits)
    }
  }

  function getAzulExpiry(): string {
    const [mm, yy] = expiry.split('/')
    if (!mm || !yy || yy.length < 2) return ''
    const year = yy.length === 2 ? `20${yy}` : yy
    return `${year}${mm.padStart(2, '0')}`
  }

  function isCardExpired(): boolean {
    const [mm, yy] = expiry.split('/')
    if (!mm || !yy || yy.length < 2) return false
    const year = Number(yy.length === 2 ? `20${yy}` : yy)
    const month = Number(mm)
    const now = new Date()
    return year < now.getFullYear() || (year === now.getFullYear() && month < now.getMonth() + 1)
  }

  async function handlePay(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    const cleanCard = cardNum.replace(/\s/g, '')
    if (cleanCard.length < 15) { setError('Número de tarjeta inválido'); return }
    const azulExpiry = getAzulExpiry()
    if (!azulExpiry || azulExpiry.length !== 6) { setError('Fecha de vencimiento inválida (MM/AA)'); return }
    if (isCardExpired()) { setError('La tarjeta está vencida'); return }
    if (cvv.length < 3) { setError('CVV inválido'); return }
    if (!name.trim()) { setError('Ingresa el nombre del titular'); return }

    setPaying(true)
    try {
      const res = await fetch('/api/payments/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId,
          cardNumber:  cleanCard,
          expiration:  azulExpiry,
          cvv,
        }),
      })

      const data = await res.json()

      if (data.success) {
        router.push(`/pago/exitoso?b=${bookingId}`)
      } else {
        setError(data.error ?? 'Pago rechazado. Verifica los datos e intenta de nuevo.')
        setPaying(false)
      }
    } catch {
      setError('Error de conexión. Intenta de nuevo.')
      setPaying(false)
    }
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center"
      style={{ background: '#F4F6F8' }}>
      <Loader2 size={28} className="animate-spin" style={{ color: '#35C493' }} />
    </div>
  )

  if (!booking) return null

  const space   = booking.spaces as any
  const addons  = booking.booking_addons ?? []
  const cover   = space?.space_images?.find((i: any) => i.is_cover)?.url ?? space?.space_images?.[0]?.url
  const total = Number(booking.total_amount)
  const fee   = Number(booking.platform_fee)

  return (
    <div className="min-h-screen" style={{ background: '#F4F6F8' }}>

      {/* Top bar */}
      <div className="sticky top-0 z-50 px-4 md:px-6 py-3.5 flex items-center justify-between"
        style={{ background: '#fff', borderBottom: '1px solid #E8ECF0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
        <Link href={`/espacios/${booking.spaces?.slug ?? ''}`}
          className="flex items-center gap-1.5 text-sm font-medium"
          style={{ color: '#6B7280' }}>
          <ChevronLeft size={16} />
          <span className="hidden sm:inline">Volver al espacio</span>
          <span className="sm:hidden">Volver</span>
        </Link>
        <img src="/logo-dark.svg" alt="espot.do" style={{ height: 22, width: 'auto' }} />
        <div className="flex items-center gap-1.5 text-xs font-medium" style={{ color: '#6B7280' }}>
          <Lock size={12} style={{ color: '#35C493' }} />
          <span className="hidden sm:inline">Pago seguro SSL</span>
          <span className="sm:hidden">SSL</span>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 md:px-6 py-6 md:py-10">
        <h1 className="text-xl md:text-2xl font-bold mb-6 md:mb-8" style={{ color: '#0F1623', letterSpacing: '-0.02em' }}>
          Completar pago
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-[1fr_380px] gap-8">

          {/* ── Formulario de pago ── */}
          <div className="space-y-5">

            {error && (
              <div className="flex items-start gap-3 px-4 py-3.5 rounded-2xl"
                style={{ background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.15)' }}>
                <AlertCircle size={16} style={{ color: '#DC2626', flexShrink: 0, marginTop: 1 }} />
                <p className="text-sm font-medium" style={{ color: '#DC2626' }}>{error}</p>
              </div>
            )}

            <div className="rounded-2xl p-6"
              style={{ background: '#fff', border: '1px solid #E8ECF0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
              <h2 className="font-bold mb-5 flex items-center gap-2" style={{ color: '#0F1623' }}>
                <CreditCard size={16} style={{ color: '#35C493' }} /> Datos de pago
              </h2>

              <form onSubmit={handlePay} className="space-y-4">

                {/* Card number */}
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: '#6B7280' }}>
                    Número de tarjeta
                  </label>
                  <div className="relative">
                    <input
                      type="text" inputMode="numeric" autoComplete="cc-number"
                      value={cardNum} onChange={e => handleCardInput(e.target.value)}
                      placeholder="0000 0000 0000 0000"
                      maxLength={19}
                      className="w-full rounded-xl px-4 py-3.5 text-sm focus:outline-none transition-all"
                      style={{ background: '#F8FAFC', border: '1.5px solid #E2E8F0', color: '#0F1623', paddingRight: 52, fontFamily: 'monospace', letterSpacing: '0.05em' }}
                      onFocus={e => (e.target.style.borderColor = '#35C493')}
                      onBlur={e  => (e.target.style.borderColor = '#E2E8F0')}
                    />
                    <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
                      <CardIcon brand={brand} />
                    </div>
                  </div>
                </div>

                {/* Name */}
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: '#6B7280' }}>
                    Nombre en la tarjeta
                  </label>
                  <input
                    type="text" autoComplete="cc-name"
                    value={name} onChange={e => setName(e.target.value.toUpperCase())}
                    placeholder="NOMBRE APELLIDO"
                    className="w-full rounded-xl px-4 py-3.5 text-sm focus:outline-none transition-all"
                    style={{ background: '#F8FAFC', border: '1.5px solid #E2E8F0', color: '#0F1623', textTransform: 'uppercase', letterSpacing: '0.05em' }}
                    onFocus={e => (e.target.style.borderColor = '#35C493')}
                    onBlur={e  => (e.target.style.borderColor = '#E2E8F0')}
                  />
                </div>

                {/* Expiry + CVV */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: '#6B7280' }}>
                      Vencimiento
                    </label>
                    <input
                      type="text" inputMode="numeric" autoComplete="cc-exp"
                      value={expiry} onChange={e => handleExpiry(e.target.value)}
                      placeholder="MM/AA o MM/AAAA"
                      maxLength={7}
                      className="w-full rounded-xl px-4 py-3.5 text-sm focus:outline-none transition-all"
                      style={{ background: '#F8FAFC', border: '1.5px solid #E2E8F0', color: '#0F1623', fontFamily: 'monospace' }}
                      onFocus={e => (e.target.style.borderColor = '#35C493')}
                      onBlur={e  => (e.target.style.borderColor = '#E2E8F0')}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: '#6B7280' }}>
                      CVV
                    </label>
                    <input
                      type="password" inputMode="numeric" autoComplete="cc-csc"
                      value={cvv} onChange={e => setCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      placeholder="•••"
                      maxLength={4}
                      className="w-full rounded-xl px-4 py-3.5 text-sm focus:outline-none transition-all"
                      style={{ background: '#F8FAFC', border: '1.5px solid #E2E8F0', color: '#0F1623', fontFamily: 'monospace' }}
                      onFocus={e => (e.target.style.borderColor = '#35C493')}
                      onBlur={e  => (e.target.style.borderColor = '#E2E8F0')}
                    />
                  </div>
                </div>

                {/* Submit */}
                <button type="submit" disabled={paying}
                  className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl font-bold text-base transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                  style={{ background: '#35C493', color: '#fff', boxShadow: '0 4px 20px rgba(53,196,147,0.35)', marginTop: 8 }}>
                  {paying ? (
                    <><Loader2 size={20} className="animate-spin" /> Procesando pago...</>
                  ) : (
                    <><Lock size={16} /> Pagar depósito {formatCurrency(fee)}</>
                  )}
                </button>
              </form>
            </div>

            {/* Security badges */}
            <div className="flex items-center justify-center gap-6 py-2">
              {[
                { icon: ShieldCheck, text: 'SSL 256-bit' },
                { icon: Lock,        text: 'Pago seguro' },
                { icon: CheckCircle, text: 'Datos protegidos' },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-1.5 text-xs" style={{ color: '#94A3B8' }}>
                  <Icon size={13} style={{ color: '#35C493' }} />
                  {text}
                </div>
              ))}
            </div>

            <p className="text-xs text-center" style={{ color: '#CBD5E1' }}>
              Procesado por <strong>Azul Payments</strong> · República Dominicana
            </p>
          </div>

          {/* ── Resumen de reserva ── */}
          <div className="space-y-4">
            <div className="rounded-2xl overflow-hidden"
              style={{ background: '#fff', border: '1px solid #E8ECF0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>

              {/* Space image */}
              {cover && (
                <div style={{ height: 160, overflow: 'hidden' }}>
                  <img src={cover} alt={space?.name} className="w-full h-full object-cover" />
                </div>
              )}

              <div className="p-5 space-y-4">
                <div>
                  <h3 className="font-bold text-base" style={{ color: '#0F1623' }}>{space?.name}</h3>
                  <div className="flex items-center gap-1 text-xs mt-1" style={{ color: '#94A3B8' }}>
                    <MapPin size={11} />
                    {[space?.sector, space?.city].filter(Boolean).join(', ')}
                  </div>
                </div>

                <div className="space-y-2.5 text-sm" style={{ borderTop: '1px solid #F0F2F5', paddingTop: 14 }}>
                  <div className="flex items-center gap-2.5" style={{ color: '#374151' }}>
                    <Calendar size={14} style={{ color: '#35C493' }} />
                    <span>{formatDate(booking.event_date)}</span>
                  </div>
                  <div className="flex items-center gap-2.5" style={{ color: '#374151' }}>
                    <div style={{ width: 14, textAlign: 'center', fontSize: 12 }}>⏰</div>
                    <span>{formatTime(booking.start_time)} – {formatTime(booking.end_time)}</span>
                  </div>
                  <div className="flex items-center gap-2.5" style={{ color: '#374151' }}>
                    <Users size={14} style={{ color: '#35C493' }} />
                    <span>{booking.guest_count} personas · {booking.event_type}</span>
                  </div>
                </div>

                {/* Price breakdown */}
                <div className="space-y-2 text-sm" style={{ borderTop: '1px solid #F0F2F5', paddingTop: 14 }}>
                  <div className="flex justify-between" style={{ color: '#6B7280' }}>
                    <span>Espacio</span>
                    <span>{formatCurrency(Number(booking.base_price))}</span>
                  </div>
                  {addons.length > 0 && addons.map((a: any, i: number) => (
                    <div key={i} className="flex justify-between" style={{ color: '#6B7280' }}>
                      <span className="truncate mr-2">{a.space_addons?.name}</span>
                      <span>{formatCurrency(Number(a.subtotal))}</span>
                    </div>
                  ))}
                  <div className="flex justify-between font-bold text-base pt-2"
                    style={{ borderTop: '1px solid #F0F2F5', color: '#0F1623' }}>
                    <span>Total</span>
                    <span>{formatCurrency(total)}</span>
                  </div>
                </div>

                <div className="rounded-xl px-4 py-3"
                  style={{ background: 'rgba(53,196,147,0.06)', border: '1px solid rgba(53,196,147,0.15)' }}>
                  <p className="text-xs font-medium" style={{ color: '#166534' }}>
                    ✅ Al pagar, tu reserva queda inmediatamente confirmada. No se requiere aprobación adicional del propietario.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
