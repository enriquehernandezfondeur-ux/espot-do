'use client'

import { useState, useMemo } from 'react'
import {
  CalendarDays, Users, Sparkles, CreditCard,
  ChevronRight, ChevronLeft, CheckCircle, Loader2,
  Minus, Plus, MessageCircle, Clock, Building2, Lock,
} from 'lucide-react'
import { formatCurrency, formatTime } from '@/lib/utils'
import { createBooking } from '@/lib/actions/booking'
import { buildPaymentSchedule, DEFAULT_PLANS, type PaymentPlanConfig } from '@/lib/payments/engine'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import DatePicker from '@/components/ui/DatePicker'
import TimePicker from '@/components/ui/TimePicker'

// ── Configuración de tipos de evento ──────────────────────
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

// ── Pasos ─────────────────────────────────────────────────
const STEPS = [
  { id: 1, label: 'Fecha',     icon: CalendarDays },
  { id: 2, label: 'Personas',  icon: Users },
  { id: 3, label: 'Evento',    icon: Sparkles },
  { id: 4, label: 'Extras',    icon: Sparkles },
  { id: 5, label: 'Pago',      icon: CreditCard },
]

interface Props {
  space:    any
  onChat:   () => void
}

export default function BookingWidget({ space, onChat }: Props) {
  const pricing    = space.space_pricing?.find((p: any) => p.is_active) ?? space.space_pricing?.[0]
  const addons     = space.space_addons ?? []
  const isHourly      = pricing?.pricing_type === 'hourly'
  const isConsumption = pricing?.pricing_type === 'minimum_consumption'
  const isQuote       = pricing?.pricing_type === 'custom_quote'
  // Ambos modelos requieren selección de hora (por hora: para calcular; consumo: para disponibilidad)
  const needsTime     = isHourly || isConsumption

  // Steps — skip step 4 if no addons
  const steps = addons.length > 0 ? STEPS : STEPS.filter(s => s.id !== 4)
  const maxStep = steps[steps.length - 1].id

  // ── State ───────────────────────────────────────────────
  const [step, setStep]           = useState(1)
  const [eventDate, setEventDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime]     = useState('')
  const [guestCount, setGuestCount] = useState(
    space.capacity_min ? Math.max(space.capacity_min, 1) : 1
  )
  const [countInput, setCountInput] = useState(String(space.capacity_min ?? 1))
  const [eventType,       setEventType]       = useState('')
  const [customEventType, setCustomEventType] = useState('')
  const [selectedAddons, setSelectedAddons]   = useState<string[]>([])
  const [paymentPlan] = useState<PaymentPlanConfig>(DEFAULT_PLANS[2])
  const [guestNote, setGuestNote] = useState('')
  const [showNote, setShowNote]   = useState(false)

  // El tipo de evento real que se envía: si es "Otro" usa el texto personalizado
  const finalEventType = eventType === 'Otro'
    ? (customEventType.trim() || 'Otro')
    : eventType
  const [booking, setBooking]     = useState(false)
  const [success, setSuccess]     = useState(false)
  const [error, setError]         = useState('')

  // ── Price calculation ────────────────────────────────────
  const selectedAddonItems = useMemo(
    () => addons.filter((a: any) => selectedAddons.includes(a.id)),
    [addons, selectedAddons]
  )
  // Calcular horas seleccionadas respetando media noche
  function calcHours(start: string, end: string): number {
    if (!start || !end) return 0
    const sh = parseInt(start.split(':')[0]), sm = parseInt(start.split(':')[1] || '0')
    const eh = parseInt(end.split(':')[0]),   em = parseInt(end.split(':')[1] || '0')
    const sn = (sh < 6 ? sh + 24 : sh) * 60 + sm
    const en = (eh < 6 ? eh + 24 : eh) * 60 + em
    return Math.max(0, (en - sn) / 60)
  }

  const selectedHours = isHourly ? calcHours(startTime, endTime) : 0

  // ── Rango horario permitido por los time_blocks del propietario ──
  // undefined = sin restricción | null = este día no tiene horario | {start,end} = rango
  const allowedTimeRange = useMemo(() => {
    const blocks: any[] = space.space_time_blocks ?? []
    if (!blocks.length || !eventDate) return undefined

    const dow = new Date(eventDate + 'T12:00').getDay() // 0=Dom...6=Sáb
    const active = blocks.filter(b =>
      b.is_active !== false && (b.days_of_week ?? []).includes(dow)
    )

    if (!active.length) return null // día configurado pero sin horario

    // Si hay múltiples bloques, tomar el que cubra más horas
    const sorted = active.sort((a: any, b: any) => {
      const aLen = (b.end_time === '00:00' ? 24 : parseInt(b.end_time)) - parseInt(a.start_time)
      const bLen = (b.end_time === '00:00' ? 24 : parseInt(b.end_time)) - parseInt(b.start_time)
      return bLen - aLen
    })
    return { start: sorted[0].start_time as string, end: sorted[0].end_time as string }
  }, [eventDate, space.space_time_blocks])

  // Respetar la unidad del addon: por persona, por hora o precio fijo por evento
  const addonsTotal = useMemo(() =>
    selectedAddonItems.reduce((s: number, a: any) => {
      if (a.unit === 'persona') return s + a.price * guestCount
      if (a.unit === 'hora')    return s + a.price * (selectedHours || 1)
      return s + a.price
    }, 0),
    [selectedAddonItems, guestCount, selectedHours]
  )

  const basePrice = useMemo(() => {
    if (isHourly && startTime && endTime) {
      return pricing.hourly_price * calcHours(startTime, endTime)
    }
    if (pricing?.pricing_type === 'minimum_consumption') return pricing.minimum_consumption
    if (pricing?.pricing_type === 'fixed_package')       return pricing.fixed_price
    return 0
  }, [pricing, startTime, endTime, isHourly])

  const subtotal    = basePrice + addonsTotal
  const platformFee = Math.round(subtotal * 0.10)

  const schedule = useMemo(() => {
    if (!eventDate || !subtotal) return null
    return buildPaymentSchedule(paymentPlan, subtotal, new Date(eventDate + 'T12:00'))
  }, [paymentPlan, subtotal, eventDate])

  const firstPayment = schedule?.payments[0]

  // ── Navigation ───────────────────────────────────────────
  const minHoursOk = !isHourly || !pricing?.min_hours || selectedHours >= pricing.min_hours

  function canGoNext(): boolean {
    if (step === 1) {
      const timeOk = !needsTime || (!!startTime && !!endTime)
      return !!eventDate && timeOk && minHoursOk
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
    const newVal = Math.min(max, Math.max(min, guestCount + delta))
    setGuestCount(newVal)
    setCountInput(String(newVal))
  }

  function handleCountInput(val: string) {
    setCountInput(val)
    const n = parseInt(val)
    if (!isNaN(n)) {
      const min = space.capacity_min ?? 1
      const max = space.capacity_max ?? 9999
      setGuestCount(Math.min(max, Math.max(min, n)))
    }
  }

  function handleCountBlur() {
    setCountInput(String(guestCount))
  }

  function toggleAddon(id: string) {
    setSelectedAddons(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id])
  }

  async function handleBook() {
    setBooking(true)
    setError('')
    const result = await createBooking({
      spaceId: space.id, pricingId: pricing?.id,
      eventDate,
      startTime: startTime || '00:00',
      endTime:   endTime   || '23:59',
      guestCount, eventType: finalEventType,
      eventNotes: guestNote || undefined,
      selectedAddonIds: selectedAddons,
      basePrice, addonsTotal, platformFee,
      totalAmount: subtotal,
    })
    setBooking(false)
    if ('error' in result) setError(result.error ?? 'Error al procesar')
    else setSuccess(true)
  }

  // ── Mini summary (visible en pasos 2+) ───────────────────
  function MiniSummary() {
    if (step === 1) return null
    return (
      <div className="flex items-center gap-2 px-4 py-2.5 mb-4 rounded-xl text-xs"
        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
        {eventDate && (
          <span className="flex items-center gap-1" style={{ color: 'var(--text-secondary)' }}>
            <CalendarDays size={11} />
            {new Date(eventDate + 'T12:00').toLocaleDateString('es-DO', { day: 'numeric', month: 'short' })}
            {needsTime && startTime && ` · ${formatTime(startTime)}`}
          </span>
        )}
        {step > 2 && guestCount > 0 && (
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

  // ── Éxito ────────────────────────────────────────────────
  if (success) return (
    <div className="rounded-3xl p-7 text-center"
      style={{ background: '#fff', border: '1px solid var(--border-subtle)', boxShadow: '0 8px 40px rgba(0,0,0,0.08)' }}>
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
        style={{ background: 'rgba(53,196,147,0.1)' }}>
        <CheckCircle size={32} style={{ color: 'var(--brand)' }} />
      </div>
      <h3 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
        ¡Solicitud enviada!
      </h3>
      <p className="text-sm mb-5" style={{ color: 'var(--text-secondary)' }}>
        El propietario confirmará en menos de 24 horas. Revisa tu email.
      </p>
      <Link href="/dashboard/reservas"
        className="inline-flex items-center gap-2 text-sm font-semibold px-5 py-3 rounded-xl"
        style={{ background: 'var(--brand)', color: '#fff' }}>
        Ver mis reservas <ChevronRight size={15} />
      </Link>
    </div>
  )

  // ── Precio ───────────────────────────────────────────────
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
        {pricing.pricing_type === 'hourly' && (
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-bold" style={{ color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>
              {formatCurrency(pricing.hourly_price)}
            </span>
            <span className="text-sm" style={{ color: 'var(--text-muted)' }}> / hora</span>
            {pricing.min_hours && (
              <span className="text-xs ml-1" style={{ color: 'var(--text-muted)' }}>· mín. {pricing.min_hours}h</span>
            )}
          </div>
        )}
        {pricing.pricing_type === 'minimum_consumption' && (
          <div>
            <div className="text-xs font-semibold uppercase tracking-widest mb-0.5" style={{ color: 'var(--text-muted)' }}>Consumo mínimo</div>
            <span className="text-3xl font-bold" style={{ color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>
              {formatCurrency(pricing.minimum_consumption)}
            </span>
          </div>
        )}
        {pricing.pricing_type === 'fixed_package' && (
          <div>
            <div className="text-xs font-semibold uppercase tracking-widest mb-0.5" style={{ color: 'var(--text-muted)' }}>
              {pricing.package_name ?? 'Paquete completo'}
            </div>
            <span className="text-3xl font-bold" style={{ color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>
              {formatCurrency(pricing.fixed_price)}
            </span>
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

      {/* Barra de pasos */}
      <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-base)' }}>
        <div className="flex items-center w-full min-w-0">
          {steps.map((s, i) => {
            const isActive   = s.id === step
            const isComplete = s.id < step
            return (
              <div key={s.id} className="flex items-center min-w-0" style={{ flex: i < steps.length - 1 ? '1 1 0' : '0 0 auto' }}>
                <button
                  onClick={() => isComplete && setStep(s.id)}
                  disabled={!isComplete && !isActive}
                  className="flex flex-col items-center gap-0.5 shrink-0 min-w-0"
                  style={{ minWidth: 0 }}>
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all shrink-0"
                    style={isComplete
                      ? { background: 'var(--brand)', color: '#fff' }
                      : isActive
                        ? { background: '#0F1623', color: '#fff' }
                        : { background: 'var(--border-medium)', color: 'var(--text-muted)' }}>
                    {isComplete ? <CheckCircle size={11} /> : s.id}
                  </div>
                  <span className="text-xs font-medium leading-none"
                    style={{
                      color: isActive ? '#0F1623' : isComplete ? 'var(--brand)' : 'var(--text-muted)',
                      maxWidth: 44, textAlign: 'center',
                    }}>
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

      {/* Contenido del paso — min-height evita que el widget salte de tamaño */}
      <div className="px-5 py-5" style={{ minHeight: 320 }}>
        <MiniSummary />

        {/* ── PASO 1: FECHA ─────────────────────────────── */}
        {step === 1 && (
          <div className="space-y-4">
            <h3 className="font-bold text-base mb-2" style={{ color: 'var(--text-primary)' }}>
              ¿Cuándo es tu evento?
            </h3>

            {/* Calendario visual */}
            <div>
              <div className="text-xs font-semibold uppercase tracking-widest mb-2"
                style={{ color: 'var(--text-muted)' }}>Fecha del evento</div>
              <DatePicker
                value={eventDate}
                onChange={setEventDate}
                minDate={new Date().toISOString().split('T')[0]}
                placeholder="Elige una fecha"
              />
            </div>

            {/* Aviso de consumo mínimo */}
            {isConsumption && (
              <div className="px-4 py-3 rounded-xl text-sm"
                style={{ background: 'rgba(37,99,235,0.05)', border: '1px solid rgba(37,99,235,0.15)' }}>
                <div className="font-semibold mb-0.5" style={{ color: '#1D4ED8' }}>
                  Consumo mínimo requerido
                </div>
                <div style={{ color: '#3B82F6' }}>
                  Para reservar este espacio, el grupo debe consumir al menos{' '}
                  <strong>{formatCurrency(pricing.minimum_consumption)}</strong> en comida y bebidas durante el evento.
                </div>
              </div>
            )}

            {/* Time pickers — aparecen para por hora (cálculo) y consumo mínimo (disponibilidad) */}
            {needsTime && (
              <div className="space-y-3">
                {/* Restricción de horas (solo modelo por hora) */}
                {isHourly && (pricing.min_hours || pricing.max_hours) && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs"
                    style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
                    <Clock size={13} style={{ color: 'var(--brand)', flexShrink: 0 }} />
                    <span style={{ color: 'var(--text-secondary)' }}>
                      {pricing.min_hours && pricing.max_hours
                        ? `Entre ${pricing.min_hours} y ${pricing.max_hours} horas`
                        : pricing.min_hours
                          ? `Mínimo ${pricing.min_hours} hora${pricing.min_hours > 1 ? 's' : ''}`
                          : `Máximo ${pricing.max_hours} horas`}
                    </span>
                  </div>
                )}
                {/* Aviso de disponibilidad para consumo mínimo */}
                {isConsumption && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs"
                    style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
                    <Clock size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                    <span style={{ color: 'var(--text-secondary)' }}>
                      Indica el horario para verificar disponibilidad
                    </span>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <TimePicker
                    value={startTime}
                    onChange={v => { setStartTime(v); setEndTime('') }}
                    placeholder="Selecciona hora de inicio"
                    allowedRange={allowedTimeRange}
                  />
                  <TimePicker
                    value={endTime}
                    onChange={setEndTime}
                    placeholder={startTime ? 'Selecciona hora de salida' : 'Primero elige inicio'}
                    disabled={!startTime}
                    afterValue={startTime || undefined}
                    minMinutesAfter={isHourly && pricing.min_hours ? pricing.min_hours * 60 : undefined}
                    maxMinutesAfter={isHourly && pricing.max_hours ? pricing.max_hours * 60 : undefined}
                    allowedRange={allowedTimeRange}
                  />
                </div>
              </div>
            )}

            {/* Preview — modelo por hora: muestra total calculado */}
            {isHourly && startTime && endTime && selectedHours > 0 && minHoursOk && (
              <div className="flex items-center justify-between px-4 py-3 rounded-2xl"
                style={{ background: 'var(--brand-dim)', border: '1px solid var(--brand-border)' }}>
                <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                  {selectedHours % 1 === 0
                    ? `${selectedHours} hora${selectedHours !== 1 ? 's' : ''}`
                    : `${selectedHours.toFixed(1)} horas`}
                  {' · '}{formatTime(startTime)} – {formatTime(endTime)}
                </span>
                <span className="font-bold text-base" style={{ color: 'var(--brand)' }}>
                  {formatCurrency(basePrice)}
                </span>
              </div>
            )}

            {/* Preview — modelo consumo mínimo: muestra el mínimo, no multiplica */}
            {isConsumption && startTime && endTime && (
              <div className="flex items-center justify-between px-4 py-3 rounded-2xl"
                style={{ background: 'rgba(37,99,235,0.05)', border: '1px solid rgba(37,99,235,0.15)' }}>
                <span className="text-sm" style={{ color: '#3B82F6' }}>
                  {formatTime(startTime)} – {formatTime(endTime)}
                </span>
                <span className="font-bold text-sm" style={{ color: '#1D4ED8' }}>
                  Desde {formatCurrency(pricing.minimum_consumption)}
                </span>
              </div>
            )}

            {/* Advertencia si no cumple el mínimo de horas */}
            {isHourly && startTime && endTime && selectedHours > 0 && !minHoursOk && (
              <div className="flex items-center gap-2 px-4 py-3 rounded-2xl text-sm"
                style={{ background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.2)', color: '#DC2626' }}>
                <span>
                  Este espacio requiere mínimo <strong>{pricing.min_hours} hora{pricing.min_hours !== 1 ? 's' : ''}</strong>.
                  {' '}Seleccionaste {selectedHours.toFixed(1)}h.
                </span>
              </div>
            )}
          </div>
        )}

        {/* ── PASO 2: PERSONAS ──────────────────────────── */}
        {step === 2 && (
          <div>
            <h3 className="font-bold text-base mb-4" style={{ color: 'var(--text-primary)' }}>
              ¿Cuántas personas asistirán?
            </h3>
            <div className="flex items-stretch gap-0 rounded-2xl overflow-hidden"
              style={{ border: '1.5px solid var(--border-medium)' }}>
              <button onClick={() => adjustCount(-1)}
                disabled={guestCount <= (space.capacity_min ?? 1)}
                className="w-14 flex items-center justify-center transition-colors disabled:opacity-30 shrink-0"
                style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)' }}>
                <Minus size={18} />
              </button>
              <div className="flex-1 flex flex-col items-center justify-center py-4 border-x"
                style={{ borderColor: 'var(--border-medium)' }}>
                <input
                  type="number"
                  value={countInput}
                  onChange={e => handleCountInput(e.target.value)}
                  onBlur={handleCountBlur}
                  className="text-3xl font-bold text-center bg-transparent focus:outline-none w-24 tabular-nums"
                  style={{ color: 'var(--text-primary)' }}
                  min={space.capacity_min ?? 1}
                  max={space.capacity_max}
                />
                <span className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>personas</span>
              </div>
              <button onClick={() => adjustCount(+1)}
                disabled={guestCount >= space.capacity_max}
                className="w-14 flex items-center justify-center transition-colors disabled:opacity-30 shrink-0"
                style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)' }}>
                <Plus size={18} />
              </button>
            </div>
            <div className="flex justify-between mt-2 text-xs px-1"
              style={{ color: 'var(--text-muted)' }}>
              <span>{space.capacity_min ? `Mínimo ${space.capacity_min}` : 'Desde 1'}</span>
              <span>Máximo {space.capacity_max}</span>
            </div>
          </div>
        )}

        {/* ── PASO 3: TIPO DE EVENTO ─────────────────────── */}
        {step === 3 && (
          <div className="space-y-4">
            <div>
              <h3 className="font-bold text-base mb-1" style={{ color: 'var(--text-primary)' }}>
                ¿Qué tipo de evento es?
              </h3>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Esta información ayuda al propietario a preparar el espacio.
              </p>
            </div>

            {/* Pills de tipo de evento */}
            <div className="flex flex-wrap gap-2">
              {EVENT_TYPES.map(et => {
                const isSelected = eventType === et
                return (
                  <button
                    key={et}
                    onClick={() => {
                      setEventType(et)
                      if (et !== 'Otro') setCustomEventType('')
                    }}
                    className="px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
                    style={isSelected ? {
                      background: 'var(--brand)',
                      color: '#fff',
                      boxShadow: '0 2px 8px rgba(53,196,147,0.3)',
                    } : {
                      background: 'var(--bg-elevated)',
                      color: 'var(--text-secondary)',
                      border: '1px solid var(--border-subtle)',
                    }}>
                    {et}
                  </button>
                )
              })}
            </div>

            {/* Campo abierto cuando eligen "Otro" */}
            {eventType === 'Otro' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-widest mb-2"
                    style={{ color: 'var(--text-muted)' }}>
                    Describe tu evento
                  </label>
                  <input
                    value={customEventType}
                    onChange={e => setCustomEventType(e.target.value)}
                    placeholder="Ej: Reunión de empresa, Lanzamiento de producto, Ensayo musical..."
                    className="input-base w-full rounded-xl px-4 py-3 text-sm"
                    autoFocus
                  />
                  {!customEventType.trim() && (
                    <p className="text-xs mt-1.5" style={{ color: 'var(--text-muted)' }}>
                      Requerido para continuar
                    </p>
                  )}
                </div>

                {/* Nota automática cuando es "Otro" */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-widest mb-2"
                    style={{ color: 'var(--text-muted)' }}>
                    Mensaje al propietario <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(opcional)</span>
                  </label>
                  <textarea
                    value={guestNote}
                    onChange={e => setGuestNote(e.target.value)}
                    placeholder="Cuéntale más sobre tu evento: cuántas personas, qué necesitas, si traes equipo propio..."
                    rows={3}
                    className="input-base w-full rounded-xl px-4 py-3 text-sm resize-none"
                  />
                </div>
              </div>
            )}

            {/* Nota opcional para otros tipos también */}
            {eventType && eventType !== 'Otro' && (
              <div>
                {!showNote ? (
                  <button
                    onClick={() => setShowNote(true)}
                    className="text-xs font-medium flex items-center gap-1.5 transition-colors"
                    style={{ color: 'var(--text-muted)' }}>
                    <MessageCircle size={13} /> Añadir nota al propietario (opcional)
                  </button>
                ) : (
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-widest mb-2"
                      style={{ color: 'var(--text-muted)' }}>
                      Mensaje al propietario
                    </label>
                    <textarea
                      value={guestNote}
                      onChange={e => setGuestNote(e.target.value)}
                      placeholder="Ej: Llegaremos 2 horas antes para decorar, traemos nuestro DJ..."
                      rows={2}
                      className="input-base w-full rounded-xl px-4 py-3 text-sm resize-none"
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── PASO 4: ADICIONALES ───────────────────────── */}
        {step === 4 && addons.length > 0 && (
          <div>
            <h3 className="font-bold text-base mb-1" style={{ color: 'var(--text-primary)' }}>
              Servicios adicionales
            </h3>
            <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
              Opcional · Puedes agregarlos o continuar sin ellos.
            </p>
            <div className="space-y-2">
              {addons.map((addon: any) => {
                const sel = selectedAddons.includes(addon.id)
                return (
                  <button key={addon.id} onClick={() => toggleAddon(addon.id)}
                    className="w-full flex items-center gap-3.5 px-4 py-3.5 rounded-2xl border transition-all duration-150"
                    style={sel ? {
                      background: 'rgba(53,196,147,0.05)',
                      borderColor: 'var(--brand)',
                    } : {
                      background: 'var(--bg-base)',
                      borderColor: 'var(--border-subtle)',
                    }}>
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

        {/* ── PASO 5: RESUMEN Y PAGO ─────────────────────── */}
        {step === maxStep && (
          <div className="space-y-5">
            <h3 className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>
              Resumen de tu reserva
            </h3>

            {/* Resumen del evento */}
            <div className="rounded-2xl overflow-hidden"
              style={{ border: '1px solid var(--border-subtle)' }}>
              {[
                { icon: CalendarDays, label: 'Fecha', value: new Date(eventDate + 'T12:00').toLocaleDateString('es-DO', { weekday: 'long', day: 'numeric', month: 'long' }) },
                ...(needsTime && startTime ? [{ icon: Clock, label: 'Horario', value: `${formatTime(startTime)} – ${formatTime(endTime)}` }] : []),
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
              <div className="rounded-2xl overflow-hidden"
                style={{ border: '1px solid var(--border-subtle)' }}>
                <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-elevated)' }}>
                  <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                    Desglose del precio
                  </span>
                </div>
                <div className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
                  {basePrice > 0 && (
                    <div className="flex justify-between px-4 py-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
                      <span>Espacio</span><span>{formatCurrency(basePrice)}</span>
                    </div>
                  )}
                  {selectedAddonItems.map((a: any) => (
                    <div key={a.id} className="flex justify-between px-4 py-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
                      <span>{addonEmoji(a.name)} {a.name}</span>
                      <span>+ {formatCurrency(a.price)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between px-4 py-3 text-sm font-bold"
                    style={{ color: 'var(--text-primary)' }}>
                    <span>Total del evento</span><span>{formatCurrency(subtotal)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Calendario de pagos */}
            {schedule && schedule.payments.length > 0 && (
              <div className="rounded-2xl overflow-hidden"
                style={{ border: '1.5px solid var(--brand-border)', background: 'rgba(53,196,147,0.02)' }}>
                <div className="px-4 py-3 flex items-center gap-2"
                  style={{ borderBottom: '1px solid var(--brand-border)' }}>
                  <CalendarDays size={13} style={{ color: 'var(--brand)' }} />
                  <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--brand)' }}>
                    Calendario de pagos
                  </span>
                </div>
                <div className="divide-y" style={{ borderColor: 'var(--brand-border)' }}>
                  {schedule.payments.map(p => (
                    <div key={p.payment_number} className="flex items-center gap-3 px-4 py-3.5">
                      <div className={cn('w-7 h-7 rounded-xl flex items-center justify-center text-xs font-bold shrink-0')}
                        style={p.is_first
                          ? { background: 'var(--brand)', color: '#fff' }
                          : p.is_final_onsite
                            ? { background: '#E0F2FE', color: '#0369A1' }
                            : { background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>
                        {p.is_final_onsite ? <Building2 size={12} /> : p.payment_number}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                          {p.due_label}
                          {p.is_first && (
                            <span className="ml-1.5 text-xs font-medium px-1.5 py-0.5 rounded-full"
                              style={{ background: 'rgba(53,196,147,0.12)', color: 'var(--brand)' }}>
                              <Lock size={8} className="inline mr-0.5" />Bloquea tu fecha
                            </span>
                          )}
                        </div>
                        <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{p.description}</div>
                      </div>
                      <div className="text-sm font-bold shrink-0"
                        style={{ color: p.is_first ? 'var(--brand)' : 'var(--text-primary)' }}>
                        {formatCurrency(p.total)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Nota — solo visible si fue añadida en el paso 3 */}
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

      {/* ── Navegación ─────────────────────────────────────── */}
      <div className="px-6 pb-6 space-y-3" style={{ borderRadius: '0 0 24px 24px' }}>
        {/* Botón principal */}
        {step === maxStep ? (
          <button onClick={handleBook} disabled={booking}
            className="w-full flex items-center justify-center gap-2.5 py-4 rounded-2xl font-bold text-base transition-all disabled:opacity-50"
            style={{
              background: isQuote ? '#0891B2' : 'var(--brand)',
              color: '#fff',
              boxShadow: `0 4px 24px ${isQuote ? 'rgba(8,145,178,0.3)' : 'rgba(53,196,147,0.35)'}`,
              fontSize: 15,
            }}>
            {booking ? (
              <><Loader2 size={18} className="animate-spin" /> Procesando...</>
            ) : isQuote ? (
              <><MessageCircle size={18} /> Solicitar cotización</>
            ) : firstPayment ? (
              <><CreditCard size={18} /> Reservar fecha · {formatCurrency(firstPayment.total)}</>
            ) : (
              <><CreditCard size={18} /> Reservar fecha</>
            )}
          </button>
        ) : (
          <button onClick={next} disabled={!canGoNext()}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-semibold text-sm transition-all disabled:opacity-35"
            style={{
              background: canGoNext() ? '#0F1623' : 'var(--bg-elevated)',
              color: canGoNext() ? '#fff' : 'var(--text-muted)',
              letterSpacing: '0.01em',
            }}>
            Continuar <ChevronRight size={16} />
          </button>
        )}

        {/* Atrás + chat */}
        <div className="flex items-center gap-2 pb-2">
          {step > 1 && (
            <button onClick={back}
              className="flex items-center gap-1.5 text-xs font-medium px-4 py-2.5 rounded-xl flex-1 justify-center transition-colors"
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
