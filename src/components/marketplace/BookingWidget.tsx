'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  CalendarDays, Users, Sparkles, CreditCard,
  ChevronRight, ChevronLeft, Loader2, CheckCircle,
  Minus, Plus, MessageCircle, Clock, ShieldCheck, Info,
} from 'lucide-react'
import { formatCurrency, formatTime } from '@/lib/utils'
import { createBooking } from '@/lib/actions/booking'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import DatePicker from '@/components/ui/DatePicker'
import TimePicker from '@/components/ui/TimePicker'

const EVENT_TYPES = [
  'Cumpleaños', 'Boda', 'Corporativo', 'Graduación',
  'Baby Shower', 'Quinceañera', 'Fiesta', 'Sesión foto', 'Otro',
]

function addonEmoji(name: string) {
  const n = name.toLowerCase()
  if (n.includes('bartender') || n.includes('barra')) return '🍹'
  if (n.includes('dj'))         return '🎧'
  if (n.includes('sonido'))     return '🔊'
  if (n.includes('iluminaci'))  return '💡'
  if (n.includes('camarero'))   return '🤵'
  if (n.includes('seguridad'))  return '💂'
  if (n.includes('decorac'))    return '🎊'
  if (n.includes('proyector'))  return '📽️'
  if (n.includes('menú') || n.includes('catering')) return '🍽️'
  if (n.includes('vino') || n.includes('open bar')) return '🍷'
  if (n.includes('fotóg'))      return '📸'
  if (n.includes('músico') || n.includes('orquesta')) return '🎵'
  if (n.includes('maquill'))    return '💄'
  if (n.includes('extra') || n.includes('hora adic')) return '⏰'
  return '✨'
}

const STEPS = [
  { id: 1, label: 'Fecha',    icon: CalendarDays },
  { id: 2, label: 'Personas', icon: Users },
  { id: 3, label: 'Evento',   icon: Sparkles },
  { id: 4, label: 'Extras',   icon: Sparkles },
  { id: 5, label: 'Pago',     icon: CreditCard },
]

interface Props {
  space:        any
  onChat:       () => void
  initialDate?: string
}

export default function BookingWidget({ space, onChat, initialDate }: Props) {
  const router   = useRouter()
  const pricing  = space.space_pricing?.find((p: any) => p.is_active) ?? space.space_pricing?.[0]
  const addons   = space.space_addons ?? []

  const isHourly      = pricing?.pricing_type === 'hourly'
  const isConsumption = pricing?.pricing_type === 'minimum_consumption'
  const isPackage     = pricing?.pricing_type === 'fixed_package'
  const isQuote       = pricing?.pricing_type === 'custom_quote'

  const steps   = addons.length > 0 ? STEPS : STEPS.filter(s => s.id !== 4)
  const maxStep = steps[steps.length - 1].id

  // ── State ──────────────────────────────────────────────
  const [step,           setStep]           = useState(initialDate ? 2 : 1)
  const [eventDate,      setEventDate]      = useState(initialDate ?? '')
  const [startTime,      setStartTime]      = useState('')
  const [endTime,        setEndTime]        = useState('')
  const [guestCount,     setGuestCount]     = useState(space.capacity_min ? Math.max(space.capacity_min, 1) : 1)
  const [countInput,     setCountInput]     = useState(String(space.capacity_min ?? 1))
  const [eventType,      setEventType]      = useState('')
  const [customEventType,setCustomEventType]= useState('')
  const [selectedAddons, setSelectedAddons] = useState<string[]>([])
  const [guestNote,      setGuestNote]      = useState('')
  const [showNote,       setShowNote]       = useState(false)
  const [booking,        setBooking]        = useState(false)
  const [success,        setSuccess]        = useState(false)
  const [error,          setError]          = useState('')

  const finalEventType = eventType === 'Otro' ? (customEventType.trim() || 'Otro') : eventType

  // ── Helpers de tiempo con precisión de minutos ────────
  // Convierte 'HH:MM' a minutos totales. Horas 0-5 = siguiente día (24-29h).
  function timeToMins(t: string): number {
    if (!t) return 0
    const [h, m] = t.split(':').map(Number)
    const baseH = h < 6 ? h + 24 : h
    return baseH * 60 + m
  }

  // Convierte minutos totales de vuelta a 'HH:MM'
  function minsToTime(mins: number): string {
    const h = Math.floor(mins / 60) % 24
    const m = mins % 60
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
  }

  function calcHours(start: string, end: string): number {
    if (!start || !end) return 0
    return Math.max(0, (timeToMins(end) - timeToMins(start)) / 60)
  }

  function addHoursToTime(start: string, hours: number): string {
    return minsToTime(timeToMins(start) + Math.round(hours * 60))
  }

  // ── Rango horario del propietario ─────────────────────
  const allowedTimeRange = useMemo(() => {
    const blocks: any[] = space.space_time_blocks ?? []
    if (!blocks.length || !eventDate) return undefined
    const dow = new Date(eventDate + 'T12:00').getDay()
    const active = blocks.filter(b => b.is_active !== false && (b.days_of_week ?? []).includes(dow))
    if (!active.length) return null
    // Elegir el bloque más largo del día (fix: usaba b.end_time para calcular aLen)
    const sorted = [...active].sort((a: any, b: any) => {
      const aLen = timeToMins(a.end_time === '00:00' ? '24:00' : a.end_time) - timeToMins(a.start_time)
      const bLen = timeToMins(b.end_time === '00:00' ? '24:00' : b.end_time) - timeToMins(b.start_time)
      return bLen - aLen
    })
    return { start: sorted[0].start_time as string, end: sorted[0].end_time as string }
  }, [eventDate, space.space_time_blocks])

  // ── Configuración de límites ───────────────────────────
  const minHours     = pricing?.min_hours     ?? 0
  const maxHours     = pricing?.max_hours     ?? 0
  const packageHours = pricing?.package_hours ?? 0
  const sessionHours = pricing?.session_hours ?? 0

  // Duración fija: consumo mínimo con sesión definida o paquete sin horas extra
  const fixedDuration: number = (() => {
    if (isConsumption && sessionHours > 0) return sessionHours
    if (isPackage && packageHours > 0 && !(Number(pricing?.extra_hour_price) > 0)) return packageHours
    return 0
  })()

  const SLOT_MINS = 30 // tamaño mínimo de slot (30 minutos)

  // Para duración fija, restringir el picker de inicio:
  // solo mostrar starts donde start + fixedDuration <= blockEnd
  const startPickerRange = useMemo(() => {
    if (!allowedTimeRange || fixedDuration <= 0) return allowedTimeRange
    const blockEndMins    = timeToMins(allowedTimeRange.end === '00:00' ? '24:00' : allowedTimeRange.end)
    const latestStartMins = blockEndMins - fixedDuration * 60
    // Si latestStart < blockStart no hay ningún inicio posible
    if (latestStartMins < timeToMins(allowedTimeRange.start)) return null
    // Pasar latestStart + SLOT_MINS como límite exclusivo para que latestStart QUEDE incluido
    return { start: allowedTimeRange.start, end: minsToTime(latestStartMins + SLOT_MINS) }
  }, [allowedTimeRange, fixedDuration])

  // Rango para el picker de hora de SALIDA: extiende el cierre del bloque +1 slot
  // para que la hora exacta de cierre sea seleccionable (el filtro usa n >= end → exclusivo)
  const endPickerAllowedRange = useMemo(() => {
    if (!allowedTimeRange) return allowedTimeRange
    const blockEndMins = timeToMins(allowedTimeRange.end === '00:00' ? '24:00' : allowedTimeRange.end)
    return { start: allowedTimeRange.start, end: minsToTime(blockEndMins + SLOT_MINS) }
  }, [allowedTimeRange])

  // Bloque demasiado corto para la duración fija requerida
  const blockTooShort = fixedDuration > 0 && allowedTimeRange !== null && allowedTimeRange !== undefined && startPickerRange === null

  // Hora de fin efectiva: fija (calculada) o elegida por el usuario
  const effectiveEndTime = fixedDuration > 0 && startTime
    ? addHoursToTime(startTime, fixedDuration)
    : endTime

  // Minutos disponibles desde el inicio hasta el cierre del bloque (para end picker)
  const minsUntilBlockEnd = useMemo(() => {
    if (!allowedTimeRange || !startTime) return undefined
    const blockEndMins = timeToMins(allowedTimeRange.end === '00:00' ? '24:00' : allowedTimeRange.end)
    return blockEndMins - timeToMins(startTime)
  }, [allowedTimeRange, startTime])

  const selectedHours = useMemo(
    () => calcHours(startTime, effectiveEndTime),
    [startTime, effectiveEndTime]
  )

  // ── Validación de horas ────────────────────────────────
  const hoursError = useMemo((): string | null => {
    if (!startTime || !effectiveEndTime || selectedHours === 0) return null
    if (minHours && selectedHours < minHours)
      return `Este Espot requiere mínimo ${minHours} hora${minHours > 1 ? 's' : ''} de reserva`
    if (maxHours && selectedHours > maxHours)
      return `Este Espot permite máximo ${maxHours} hora${maxHours > 1 ? 's' : ''} de reserva`
    // Validar que el fin no exceda el cierre del bloque (comparación con minutos exactos)
    if (allowedTimeRange) {
      const endMins      = timeToMins(effectiveEndTime)
      const blockEndMins = timeToMins(allowedTimeRange.end === '00:00' ? '24:00' : allowedTimeRange.end)
      if (endMins > blockEndMins)
        return `El horario seleccionado excede el cierre del espacio (${formatTime(allowedTimeRange.end)}). Elige una hora de inicio más temprana.`
    }
    return null
  }, [selectedHours, minHours, maxHours, startTime, effectiveEndTime, allowedTimeRange])

  // ── Cálculo de precio por modelo ───────────────────────
  const selectedAddonItems = useMemo(
    () => addons.filter((a: any) => selectedAddons.includes(a.id)),
    [addons, selectedAddons]
  )

  const basePrice = useMemo(() => {
    if (!startTime || !effectiveEndTime || selectedHours === 0) return 0

    if (isHourly) {
      return (pricing?.hourly_price ?? 0) * selectedHours
    }
    if (isConsumption) {
      // El consumo mínimo es fijo — las horas definen el slot, no el precio
      return pricing?.minimum_consumption ?? 0
    }
    if (isPackage) {
      const base  = pricing?.fixed_price ?? 0
      const extra = Math.max(0, selectedHours - packageHours)
      const extraRate = pricing?.extra_hour_price ?? 0
      return base + extra * extraRate
    }
    return 0 // quote
  }, [pricing, startTime, effectiveEndTime, selectedHours, isHourly, isConsumption, isPackage, packageHours])

  const addonsTotal = useMemo(() =>
    selectedAddonItems.reduce((s: number, a: any) => {
      if (a.unit === 'persona') return s + a.price * guestCount
      if (a.unit === 'hora')    return s + a.price * (selectedHours > 0 ? selectedHours : 0)
      return s + a.price
    }, 0),
    [selectedAddonItems, guestCount, selectedHours]
  )

  const subtotal    = basePrice + addonsTotal
  const platformFee = Math.round(subtotal * 0.10)

  // ── Navegación ─────────────────────────────────────────
  function canGoNext(): boolean {
    if (step === 1) {
      if (!eventDate) return false
      if (isQuote) return true
      if (!startTime || !effectiveEndTime) return false
      if (hoursError) return false
      return true
    }
    if (step === 2) return guestCount >= 1
    if (step === 3) return !!eventType && (eventType !== 'Otro' || customEventType.trim().length > 0)
    return true
  }

  function next() { if (canGoNext() && step < maxStep) setStep(s => s + 1) }
  function back() { if (step > 1) setStep(s => s - 1) }

  function adjustCount(delta: number) {
    const min = space.capacity_min ?? 1
    const max = space.capacity_max ?? 9999
    const v = Math.min(max, Math.max(min, guestCount + delta))
    setGuestCount(v); setCountInput(String(v))
  }

  function handleCountInput(val: string) {
    setCountInput(val)
    const n = parseInt(val)
    if (!isNaN(n)) {
      const min = space.capacity_min ?? 1; const max = space.capacity_max ?? 9999
      setGuestCount(Math.min(max, Math.max(min, n)))
    }
  }

  function toggleAddon(id: string) {
    setSelectedAddons(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id])
  }

  async function handleBook() {
    setBooking(true); setError('')
    const { data: { user } } = await createClient().auth.getUser()
    if (!user) {
      setBooking(false)
      router.push(`/auth?redirect=${encodeURIComponent(window.location.pathname)}`)
      return
    }
    const result = await createBooking({
      spaceId: space.id, pricingId: pricing?.id,
      eventDate, startTime, endTime: effectiveEndTime,
      guestCount, eventType: finalEventType,
      eventNotes: guestNote || undefined,
      selectedAddonIds: selectedAddons,
      basePrice, addonsTotal, platformFee,
      totalAmount: subtotal,
    })
    setBooking(false)
    if ('error' in result) {
      setError(result.error ?? 'Error al procesar')
    } else if (result.status === 'quote_requested') {
      setSuccess(true)
    } else {
      router.push(`/pago/${result.bookingId}`)
    }
  }

  // ── Mini resumen (pasos 2+) ────────────────────────────
  function MiniSummary() {
    if (step === 1) return null
    return (
      <div className="flex items-center gap-2 px-4 py-2.5 mb-4 rounded-xl text-xs flex-wrap"
        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
        {eventDate && (
          <span className="flex items-center gap-1" style={{ color: 'var(--text-secondary)' }}>
            <CalendarDays size={11} />
            {new Date(eventDate + 'T12:00').toLocaleDateString('es-DO', { day: 'numeric', month: 'short' })}
          </span>
        )}
        {startTime && effectiveEndTime && (
          <>
            <span style={{ color: 'var(--border-medium)' }}>·</span>
            <span className="flex items-center gap-1" style={{ color: 'var(--text-secondary)' }}>
              <Clock size={11} /> {formatTime(startTime)} – {formatTime(effectiveEndTime)}
              {selectedHours > 0 && ` (${selectedHours % 1 === 0 ? selectedHours : selectedHours.toFixed(1)}h)`}
            </span>
          </>
        )}
        {step > 2 && (
          <>
            <span style={{ color: 'var(--border-medium)' }}>·</span>
            <span className="flex items-center gap-1" style={{ color: 'var(--text-secondary)' }}>
              <Users size={11} /> {guestCount}
            </span>
          </>
        )}
        {step > 3 && finalEventType && (
          <>
            <span style={{ color: 'var(--border-medium)' }}>·</span>
            <span style={{ color: 'var(--text-secondary)' }}>{finalEventType}</span>
          </>
        )}
      </div>
    )
  }

  // ── Éxito (cotización enviada) ────────────────────────
  if (success) return (
    <div className="rounded-3xl p-7 text-center"
      style={{ background: '#fff', border: '1px solid var(--border-subtle)', boxShadow: '0 8px 40px rgba(0,0,0,0.08)' }}>
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
        style={{ background: 'rgba(53,196,147,0.1)' }}>
        <CheckCircle size={32} style={{ color: 'var(--brand)' }} />
      </div>
      <h3 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>¡Solicitud enviada!</h3>
      <p className="text-sm mb-5" style={{ color: 'var(--text-secondary)' }}>
        El propietario te responderá con un precio personalizado. Revisa tu email.
      </p>
      <Link href="/dashboard/reservas"
        className="inline-flex items-center gap-2 text-sm font-semibold px-5 py-3 rounded-xl"
        style={{ background: 'var(--brand)', color: '#fff' }}>
        Ver mis solicitudes <ChevronRight size={15} />
      </Link>
    </div>
  )

  // ── Cabecera de precio ────────────────────────────────
  function PriceHeader() {
    if (!pricing) return null
    if (isQuote) return (
      <div className="flex items-center gap-2 pb-4 mb-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        <MessageCircle size={20} style={{ color: 'var(--brand)' }} />
        <span className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>Cotización personalizada</span>
      </div>
    )
    return (
      <div className="pb-4 mb-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        {isHourly && (
          <div>
            <div className="flex items-baseline gap-1 mb-1">
              <span className="text-3xl font-bold" style={{ color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>
                {formatCurrency(pricing.hourly_price)}
              </span>
              <span className="text-sm" style={{ color: 'var(--text-muted)' }}> / hora</span>
            </div>
            <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
              {minHours > 0 && <span>Mín. {minHours}h</span>}
              {minHours > 0 && maxHours > 0 && <span>·</span>}
              {maxHours > 0 && <span>Máx. {maxHours}h</span>}
              {minHours > 0 && <span>· Mínimo {formatCurrency(pricing.hourly_price * minHours)}</span>}
            </div>
          </div>
        )}
        {isConsumption && (
          <div>
            <div className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>
              Consumo mínimo garantizado
            </div>
            <div className="flex items-baseline gap-1 mb-1">
              <span className="text-3xl font-bold" style={{ color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>
                {formatCurrency(pricing.minimum_consumption)}
              </span>
            </div>
            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {minHours > 0 && maxHours > 0
                ? `Entre ${minHours} y ${maxHours} horas`
                : minHours > 0 ? `Mínimo ${minHours} horas`
                : maxHours > 0 ? `Máximo ${maxHours} horas`
                : 'Elige tu horario'}
            </div>
          </div>
        )}
        {isPackage && (
          <div>
            <div className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>
              {pricing.package_name ?? 'Paquete'}
            </div>
            <div className="flex items-baseline gap-1 mb-1">
              <span className="text-3xl font-bold" style={{ color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>
                {formatCurrency(pricing.fixed_price)}
              </span>
              {packageHours > 0 && (
                <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  · {packageHours}h incluidas
                </span>
              )}
            </div>
            {pricing.extra_hour_price > 0 && (
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Hora adicional: {formatCurrency(pricing.extra_hour_price)}
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="rounded-3xl"
      style={{ background: '#fff', border: '1px solid var(--border-subtle)', boxShadow: '0 8px 40px rgba(0,0,0,0.08)', overflow: 'visible' }}>

      {/* Precio */}
      <div className="px-6 pt-6 pb-5" style={{ borderBottom: '1px solid var(--border-subtle)', borderRadius: '24px 24px 0 0' }}>
        <PriceHeader />
      </div>

      {/* Pasos */}
      <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-base)' }}>
        <div className="flex items-center w-full min-w-0">
          {steps.map((s, i) => {
            const isActive   = s.id === step
            const isComplete = s.id < step
            return (
              <div key={s.id} className="flex items-center min-w-0"
                style={{ flex: i < steps.length - 1 ? '1 1 0' : '0 0 auto' }}>
                <button onClick={() => isComplete && setStep(s.id)}
                  disabled={!isComplete && !isActive}
                  className="flex flex-col items-center gap-0.5 shrink-0 min-w-0">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all shrink-0"
                    style={isComplete
                      ? { background: 'var(--brand)', color: '#fff' }
                      : isActive ? { background: '#0F1623', color: '#fff' }
                      : { background: 'var(--border-medium)', color: 'var(--text-muted)' }}>
                    {isComplete ? <CheckCircle size={11} /> : s.id}
                  </div>
                  <span className="text-xs font-medium leading-none"
                    style={{ color: isActive ? '#0F1623' : isComplete ? 'var(--brand)' : 'var(--text-muted)', maxWidth: 44, textAlign: 'center' }}>
                    {s.label}
                  </span>
                </button>
                {i < steps.length - 1 && (
                  <div className="flex-1 h-px mx-1.5 mt-[-10px]"
                    style={{ background: s.id < step ? 'var(--brand)' : 'var(--border-subtle)', minWidth: 8 }} />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Contenido */}
      <div className="px-5 py-5" style={{ minHeight: 320 }}>
        <MiniSummary />

        {/* ── PASO 1: FECHA Y HORA ────────────────────────── */}
        {step === 1 && (
          <div className="space-y-4">
            <h3 className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>¿Cuándo es tu evento?</h3>

            <DatePicker
              value={eventDate}
              onChange={setEventDate}
              minDate={new Date().toISOString().split('T')[0]}
              placeholder="Elige una fecha"
            />

            {/* Mensaje informativo por modelo */}
            {isConsumption && (
              <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl"
                style={{ background: 'rgba(37,99,235,0.05)', border: '1px solid rgba(37,99,235,0.15)' }}>
                <Info size={14} style={{ color: '#2563EB', flexShrink: 0, marginTop: 1 }} />
                <div className="text-xs" style={{ color: '#1D4ED8', lineHeight: 1.6 }}>
                  <strong>Consumo mínimo garantizado: {formatCurrency(pricing.minimum_consumption)}</strong><br />
                  Tu grupo debe consumir ese monto en comida y bebidas. Lo que exceda ese mínimo lo pagas directo en el lugar.
                  {(minHours > 0 || maxHours > 0) && (
                    <span> · Duración: {minHours > 0 && maxHours > 0
                      ? `${minHours}–${maxHours} horas`
                      : minHours > 0 ? `mín. ${minHours}h` : `máx. ${maxHours}h`}
                    </span>
                  )}
                </div>
              </div>
            )}

            {isPackage && (
              <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl"
                style={{ background: 'rgba(53,196,147,0.05)', border: '1px solid rgba(53,196,147,0.15)' }}>
                <Info size={14} style={{ color: 'var(--brand)', flexShrink: 0, marginTop: 1 }} />
                <div className="text-xs" style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  <strong>Paquete: {formatCurrency(pricing.fixed_price)}</strong>
                  {packageHours > 0 && <span> · {packageHours} horas incluidas</span>}
                  {pricing.extra_hour_price > 0 && (
                    <span> · Hora adicional: {formatCurrency(pricing.extra_hour_price)}</span>
                  )}
                </div>
              </div>
            )}

            {isQuote && (
              <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl"
                style={{ background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.2)' }}>
                <Info size={14} style={{ color: '#D97706', flexShrink: 0, marginTop: 1 }} />
                <div className="text-xs" style={{ color: '#92400E', lineHeight: 1.6 }}>
                  El propietario te enviará un precio personalizado basado en tu horario y evento.
                </div>
              </div>
            )}

            {/* Sin horario disponible este día */}
            {allowedTimeRange === null && eventDate && (
              <div className="px-4 py-3 rounded-xl text-sm"
                style={{ background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.15)', color: '#DC2626' }}>
                No hay horarios disponibles para esta fecha. Elige otro día o consulta al propietario.
              </div>
            )}

            {/* Selectores de hora — visibles cuando hay fecha y horario disponible */}
            {eventDate && allowedTimeRange !== null && !isQuote && (
              <div className="space-y-3">

                {/* Info de límites para modelo por hora */}
                {isHourly && (minHours > 0 || maxHours > 0) && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs"
                    style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
                    <Clock size={12} style={{ color: 'var(--brand)' }} />
                    <span style={{ color: 'var(--text-secondary)' }}>
                      {minHours > 0 && maxHours > 0
                        ? `Reserva entre ${minHours} y ${maxHours} horas`
                        : minHours > 0 ? `Mínimo ${minHours} hora${minHours > 1 ? 's' : ''}`
                        : `Máximo ${maxHours} horas`}
                    </span>
                  </div>
                )}

                {/* Aviso si el bloque es demasiado corto para la duración fija */}
                {blockTooShort && (
                  <div className="px-4 py-3 rounded-xl text-sm"
                    style={{ background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.15)', color: '#DC2626' }}>
                    No hay horarios disponibles este día para completar {fixedDuration} hora{fixedDuration !== 1 ? 's' : ''} de sesión.
                    Elige otra fecha o consulta al propietario.
                  </div>
                )}

                {!blockTooShort && fixedDuration > 0 ? (
                  /* ── Duración fija: solo picker de inicio, salida calculada ── */
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs"
                      style={{ background: 'rgba(53,196,147,0.05)', border: '1px solid var(--brand-border)' }}>
                      <Clock size={12} style={{ color: 'var(--brand)' }} />
                      <span style={{ color: 'var(--text-secondary)' }}>
                        Duración fija: <strong>{fixedDuration} hora{fixedDuration !== 1 ? 's' : ''}</strong>
                        {' '}— La hora de salida se calcula automáticamente.
                      </span>
                    </div>
                    <TimePicker
                      value={startTime}
                      onChange={v => { setStartTime(v) }}
                      placeholder="Hora de inicio"
                      allowedRange={startPickerRange}
                    />
                    {startTime && (
                      <div className="flex items-center justify-between px-4 py-3.5 rounded-2xl"
                        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
                        <span className="text-sm" style={{ color: 'var(--text-muted)' }}>Hora de salida</span>
                        <span className="text-sm font-bold tabular-nums" style={{ color: 'var(--text-primary)' }}>
                          {formatTime(effectiveEndTime)}
                        </span>
                      </div>
                    )}
                  </div>
                ) : !blockTooShort ? (
                  /* ── Duración variable: dos pickers, fin restringido al cierre del bloque ── */
                  <div className="grid grid-cols-2 gap-3">
                    <TimePicker
                      value={startTime}
                      onChange={v => { setStartTime(v); setEndTime('') }}
                      placeholder="Hora de inicio"
                      allowedRange={allowedTimeRange}
                    />
                    <TimePicker
                      value={endTime}
                      onChange={setEndTime}
                      placeholder={startTime ? 'Hora de salida' : 'Elige inicio primero'}
                      disabled={!startTime}
                      afterValue={startTime || undefined}
                      minMinutesAfter={minHours ? minHours * 60 : undefined}
                      maxMinutesAfter={
                        minsUntilBlockEnd !== undefined
                          ? (maxHours ? Math.min(maxHours * 60, minsUntilBlockEnd) : minsUntilBlockEnd)
                          : (maxHours ? maxHours * 60 : undefined)
                      }
                      allowedRange={endPickerAllowedRange}
                    />
                  </div>
                ) : null}
              </div>
            )}

            {/* Error de horas */}
            {hoursError && (
              <div className="px-4 py-3 rounded-xl text-sm"
                style={{ background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.2)', color: '#DC2626' }}>
                {hoursError}
              </div>
            )}

            {/* Preview de precio cuando hay horario válido */}
            {startTime && effectiveEndTime && selectedHours > 0 && !hoursError && (
              <div className="flex items-center justify-between px-4 py-3.5 rounded-2xl"
                style={{ background: isConsumption ? 'rgba(37,99,235,0.05)' : 'var(--brand-dim)', border: `1px solid ${isConsumption ? 'rgba(37,99,235,0.15)' : 'var(--brand-border)'}` }}>
                <div>
                  <div className="text-sm font-medium" style={{ color: isConsumption ? '#1D4ED8' : 'var(--text-secondary)' }}>
                    {formatTime(startTime)} – {formatTime(effectiveEndTime)}
                    <span className="ml-1.5 text-xs opacity-70">
                      ({selectedHours % 1 === 0 ? selectedHours : selectedHours.toFixed(1)} horas)
                    </span>
                  </div>
                  {isPackage && selectedHours > packageHours && packageHours > 0 && (
                    <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      {packageHours}h incluidas + {(selectedHours - packageHours).toFixed(1)}h adicionales
                    </div>
                  )}
                </div>
                <div>
                  {isQuote ? (
                    <span className="text-sm font-semibold" style={{ color: '#D97706' }}>Cotización</span>
                  ) : (
                    <span className="font-bold text-base" style={{ color: isConsumption ? '#1D4ED8' : 'var(--brand)' }}>
                      {formatCurrency(basePrice)}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── PASO 2: PERSONAS ──────────────────────────── */}
        {step === 2 && (
          <div>
            <h3 className="font-bold text-base mb-4" style={{ color: 'var(--text-primary)' }}>¿Cuántas personas asistirán?</h3>
            <div className="flex items-stretch gap-0 rounded-2xl overflow-hidden"
              style={{ border: '1.5px solid var(--border-medium)' }}>
              <button onClick={() => adjustCount(-1)} disabled={guestCount <= (space.capacity_min ?? 1)}
                className="w-14 flex items-center justify-center transition-colors disabled:opacity-30 shrink-0"
                style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)' }}>
                <Minus size={18} />
              </button>
              <div className="flex-1 flex flex-col items-center justify-center py-4 border-x"
                style={{ borderColor: 'var(--border-medium)' }}>
                <input type="number" value={countInput}
                  onChange={e => handleCountInput(e.target.value)}
                  onBlur={() => setCountInput(String(guestCount))}
                  className="text-3xl font-bold text-center bg-transparent focus:outline-none w-24 tabular-nums"
                  style={{ color: 'var(--text-primary)' }}
                  min={space.capacity_min ?? 1} max={space.capacity_max} />
                <span className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>personas</span>
              </div>
              <button onClick={() => adjustCount(+1)} disabled={guestCount >= space.capacity_max}
                className="w-14 flex items-center justify-center transition-colors disabled:opacity-30 shrink-0"
                style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)' }}>
                <Plus size={18} />
              </button>
            </div>
            <div className="flex justify-between mt-2 text-xs px-1" style={{ color: 'var(--text-muted)' }}>
              <span>{space.capacity_min ? `Mínimo ${space.capacity_min}` : 'Desde 1'}</span>
              <span>Máximo {space.capacity_max}</span>
            </div>
          </div>
        )}

        {/* ── PASO 3: TIPO DE EVENTO ────────────────────── */}
        {step === 3 && (
          <div className="space-y-4">
            <div>
              <h3 className="font-bold text-base mb-1" style={{ color: 'var(--text-primary)' }}>¿Qué tipo de evento es?</h3>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Ayuda al propietario a preparar el espacio.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {EVENT_TYPES.map(et => {
                const isSelected = eventType === et
                return (
                  <button key={et} onClick={() => { setEventType(et); if (et !== 'Otro') setCustomEventType('') }}
                    className="flex items-center gap-2.5 px-3.5 py-3 rounded-2xl text-left transition-all"
                    style={isSelected
                      ? { background: '#03313C', color: '#fff', boxShadow: '0 2px 12px rgba(3,49,60,0.2)' }
                      : { background: '#fff', color: 'var(--text-primary)', border: '1.5px solid var(--border-medium)' }}>
                    <span className="w-2 h-2 rounded-full shrink-0"
                      style={{ background: isSelected ? '#35C493' : 'var(--border-medium)' }} />
                    <span className="text-sm font-medium leading-tight">{et}</span>
                  </button>
                )
              })}
            </div>
            {eventType === 'Otro' && (
              <div className="space-y-3">
                <input value={customEventType} onChange={e => setCustomEventType(e.target.value)}
                  placeholder="Describe tu evento..." className="input-base w-full rounded-xl px-4 py-3 text-sm" autoFocus />
                <textarea value={guestNote} onChange={e => setGuestNote(e.target.value)}
                  placeholder="Cuéntale más al propietario (opcional)..."
                  rows={2} className="input-base w-full rounded-xl px-4 py-3 text-sm resize-none" />
              </div>
            )}
            {eventType && eventType !== 'Otro' && (
              !showNote ? (
                <button onClick={() => setShowNote(true)}
                  className="text-xs font-medium flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
                  <MessageCircle size={13} /> Añadir nota al propietario (opcional)
                </button>
              ) : (
                <textarea value={guestNote} onChange={e => setGuestNote(e.target.value)}
                  placeholder="Ej: Llegaremos 2 horas antes para decorar..."
                  rows={2} className="input-base w-full rounded-xl px-4 py-3 text-sm resize-none" />
              )
            )}
          </div>
        )}

        {/* ── PASO 4: ADICIONALES ──────────────────────── */}
        {step === 4 && addons.length > 0 && (
          <div>
            <h3 className="font-bold text-base mb-1" style={{ color: 'var(--text-primary)' }}>Servicios adicionales</h3>
            <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>Opcional · Puedes continuar sin ellos.</p>
            <div className="space-y-2">
              {addons.map((addon: any) => {
                const sel = selectedAddons.includes(addon.id)
                return (
                  <button key={addon.id} onClick={() => toggleAddon(addon.id)}
                    className="w-full flex items-center gap-3.5 px-4 py-3.5 rounded-2xl border transition-all"
                    style={sel
                      ? { background: 'rgba(53,196,147,0.05)', borderColor: 'var(--brand)' }
                      : { background: 'var(--bg-base)', borderColor: 'var(--border-subtle)' }}>
                    <span className="text-xl shrink-0">{addonEmoji(addon.name)}</span>
                    <div className="flex-1 text-left">
                      <div className="text-sm font-semibold" style={{ color: sel ? 'var(--brand)' : 'var(--text-primary)' }}>
                        {addon.name}
                      </div>
                      <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {formatCurrency(addon.price)} / {addon.unit}
                      </div>
                    </div>
                    <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all"
                      style={sel ? { background: 'var(--brand)', borderColor: 'var(--brand)' } : { borderColor: 'var(--border-medium)' }}>
                      {sel && <CheckCircle size={11} className="text-white" />}
                    </div>
                  </button>
                )
              })}
            </div>
            {selectedAddons.length > 0 && (
              <div className="mt-3 text-xs text-right font-semibold" style={{ color: 'var(--brand)' }}>
                + {formatCurrency(addonsTotal)} en adicionales
              </div>
            )}
          </div>
        )}

        {/* ── PASO 5: RESUMEN Y PAGO ────────────────────── */}
        {step === maxStep && (
          <div className="space-y-5">
            <h3 className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>Resumen de tu reserva</h3>

            {/* Evento */}
            <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border-subtle)' }}>
              {[
                { icon: CalendarDays, label: 'Fecha', value: new Date(eventDate + 'T12:00').toLocaleDateString('es-DO', { weekday: 'long', day: 'numeric', month: 'long' }) },
                { icon: Clock, label: 'Horario', value: `${formatTime(startTime)} – ${formatTime(effectiveEndTime)} · ${selectedHours % 1 === 0 ? selectedHours : selectedHours.toFixed(1)} horas` },
                { icon: Users, label: 'Personas', value: `${guestCount} personas` },
                { icon: Sparkles, label: 'Evento', value: finalEventType },
              ].map(({ icon: Icon, label, value }, i, arr) => (
                <div key={label} className="flex items-center gap-3 px-4 py-3"
                  style={i < arr.length - 1 ? { borderBottom: '1px solid var(--border-subtle)' } : {}}>
                  <Icon size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                  <span className="text-sm flex-1" style={{ color: 'var(--text-secondary)' }}>{label}</span>
                  <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{value}</span>
                </div>
              ))}
            </div>

            {/* Desglose de precio */}
            {subtotal > 0 && (
              <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border-subtle)' }}>
                <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-elevated)' }}>
                  <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                    Desglose del precio
                  </span>
                </div>
                <div className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
                  {basePrice > 0 && (
                    <div className="flex justify-between px-4 py-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
                      <span>
                        {isHourly && `${selectedHours % 1 === 0 ? selectedHours : selectedHours.toFixed(1)}h × ${formatCurrency(pricing?.hourly_price)}/hr`}
                        {isConsumption && 'Consumo mínimo garantizado'}
                        {isPackage && (() => {
                          const extra = Math.max(0, selectedHours - packageHours)
                          return extra > 0
                            ? `Paquete (${packageHours}h) + ${extra.toFixed(1)}h adicionales`
                            : `Paquete ${packageHours}h incluidas`
                        })()}
                      </span>
                      <span>{formatCurrency(basePrice)}</span>
                    </div>
                  )}
                  {selectedAddonItems.map((a: any) => (
                    <div key={a.id} className="flex justify-between px-4 py-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
                      <span>{addonEmoji(a.name)} {a.name}</span>
                      <span>+ {formatCurrency(a.unit === 'persona' ? a.price * guestCount : a.unit === 'hora' ? a.price * selectedHours : a.price)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between px-4 py-3 text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                    <span>Total</span><span>{formatCurrency(subtotal)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Nota del consumo mínimo en paso 5 */}
            {isConsumption && (
              <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl"
                style={{ background: 'rgba(37,99,235,0.05)', border: '1px solid rgba(37,99,235,0.15)' }}>
                <Info size={13} style={{ color: '#2563EB', flexShrink: 0, marginTop: 1 }} />
                <p className="text-xs" style={{ color: '#1D4ED8', lineHeight: 1.6 }}>
                  EspotHub cobra el consumo mínimo como garantía. Si tu grupo consume más en el evento, lo pagas directo al lugar.
                </p>
              </div>
            )}

            {!isQuote && (
              <div className="flex items-center gap-3 px-4 py-3 rounded-2xl"
                style={{ background: 'rgba(53,196,147,0.06)', border: '1px solid rgba(53,196,147,0.15)' }}>
                <ShieldCheck size={16} style={{ color: 'var(--brand)', flexShrink: 0 }} />
                <p className="text-xs" style={{ color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  Pago 100% seguro. Tu reserva queda confirmada inmediatamente al pagar.
                </p>
              </div>
            )}

            {guestNote && (
              <div className="px-4 py-3 rounded-xl text-sm italic"
                style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
                "{guestNote}"
              </div>
            )}

            {error && (
              <div className="text-sm px-4 py-3 rounded-xl"
                style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626' }}>
                {error}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Navegación */}
      <div className="px-6 pb-6 space-y-3">
        {step === maxStep ? (
          <button onClick={handleBook} disabled={booking}
            className="w-full flex items-center justify-center gap-2.5 py-4 rounded-2xl font-bold text-base transition-all disabled:opacity-50"
            style={{
              background: isQuote ? '#0891B2' : 'var(--brand)', color: '#fff',
              boxShadow: `0 4px 24px ${isQuote ? 'rgba(8,145,178,0.3)' : 'rgba(53,196,147,0.35)'}`,
            }}>
            {booking
              ? <><Loader2 size={18} className="animate-spin" /> Procesando...</>
              : isQuote
                ? <><MessageCircle size={18} /> Solicitar cotización</>
                : <><CreditCard size={18} /> Continuar al pago · {formatCurrency(subtotal)}</>
            }
          </button>
        ) : (
          <button onClick={next} disabled={!canGoNext()}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-semibold text-sm transition-all disabled:opacity-35"
            style={{
              background: canGoNext() ? '#0F1623' : 'var(--bg-elevated)',
              color: canGoNext() ? '#fff' : 'var(--text-muted)',
            }}>
            Continuar <ChevronRight size={16} />
          </button>
        )}
        <div className="flex items-center gap-2 pb-2">
          {step > 1 && (
            <button onClick={back}
              className="flex items-center gap-1.5 text-xs font-medium px-4 py-2.5 rounded-xl flex-1 justify-center"
              style={{ color: 'var(--text-secondary)', border: '1px solid var(--border-medium)', background: '#fff' }}>
              <ChevronLeft size={13} /> Atrás
            </button>
          )}
          <button onClick={onChat}
            className={cn('flex items-center gap-1.5 text-xs font-medium px-4 py-2.5 rounded-xl transition-all', step > 1 ? 'flex-1 justify-center' : 'w-full justify-center')}
            style={{ color: 'var(--text-secondary)', border: '1px solid var(--border-medium)', background: '#fff' }}>
            <MessageCircle size={13} /> Consultar al propietario
          </button>
        </div>
      </div>
    </div>
  )
}
