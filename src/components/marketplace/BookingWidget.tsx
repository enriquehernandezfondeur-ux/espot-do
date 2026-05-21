'use client'

import React, { useState, useMemo, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  CalendarDays, Users, Sparkles, CreditCard,
  ChevronRight, ChevronLeft, Loader2, CheckCircle,
  Minus, Plus, MessageCircle, Clock, ShieldCheck, Info, AlertCircle,
  Timer, Mail, Camera,
  UtensilsCrossed, Package, FileText, Lock,
  Cake, Heart, GraduationCap, Baby, Briefcase,
} from 'lucide-react'
import { formatCurrency, formatTime } from '@/lib/utils'
import { addonIcon } from '@/lib/icon-map'
import { createBooking } from '@/lib/actions/booking'
import { buildSchedule, scheduleModelLabel } from '@/lib/payments/schedule'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import DatePicker from '@/components/ui/DatePicker'
import TimePicker from '@/components/ui/TimePicker'

const ALL_EVENT_TYPES: { label: string; Icon: React.ElementType }[] = [
  { label: 'Cumpleaños',      Icon: Cake },
  { label: 'Boda',            Icon: Heart },
  { label: 'Quinceañera',     Icon: Sparkles },
  { label: 'Graduación',      Icon: GraduationCap },
  { label: 'Baby Shower',     Icon: Baby },
  { label: 'Corporativo',     Icon: Briefcase },
  { label: 'Cena / Comida',   Icon: UtensilsCrossed },
  { label: 'Sesión de fotos', Icon: Camera },
  { label: 'Otro',            Icon: MessageCircle },
]


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
  const router      = useRouter()
  const supabaseRef = useRef(createClient())
  const pricing  = space.space_pricing?.find((p: any) => p.is_active) ?? space.space_pricing?.[0]
  const addons   = space.space_addons ?? []

  const isHourly      = pricing?.pricing_type === 'hourly'
  const isConsumption = pricing?.pricing_type === 'minimum_consumption'
  const isPackage     = pricing?.pricing_type === 'fixed_package'
  const isQuote       = pricing?.pricing_type === 'custom_quote'

  const steps   = addons.length > 0 ? STEPS : STEPS.filter(s => s.id !== 4)
  const maxStep = steps[steps.length - 1].id

  const contentRef = useRef<HTMLDivElement>(null)

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

  const [showNote,         setShowNote]         = useState(false)
  const [showPaymentPlan,  setShowPaymentPlan]  = useState(false)
  const [booking,          setBooking]          = useState(false)
  const [success,          setSuccess]          = useState(false)
  const [successType,      setSuccessType]      = useState<'pending' | 'quote' | 'instant'>('pending')
  const [createdBookingId, setCreatedBookingId] = useState<string | null>(null)
  const [error,            setError]            = useState('')
  const [termsAccepted,    setTermsAccepted]    = useState(false)
  const errorRef = useRef<HTMLDivElement>(null)

  // ── Disponibilidad real de la fecha seleccionada ──────
  const [dateBlocked,  setDateBlocked]  = useState(false)
  const [bookedRanges, setBookedRanges] = useState<{start:string;end:string}[]>([])

  useEffect(() => {
    if (!eventDate) { setDateBlocked(false); setBookedRanges([]); return }
    let mounted = true
    const supabase = supabaseRef.current
    Promise.all([
      supabase.from('space_availability').select('start_time,end_time,block_type')
        .eq('space_id', space.id).eq('blocked_date', eventDate),
      supabase.from('bookings').select('start_time,end_time')
        .eq('space_id', space.id).eq('event_date', eventDate)
        .not('status', 'in', '("cancelled_guest","cancelled_host","rejected")'),
    ]).then(([{ data: avail }, { data: bks }]) => {
      if (!mounted) return
      const fullDay = avail?.some(a => a.block_type === 'full_day' || !a.start_time || !a.end_time)
      setDateBlocked(!!fullDay)
      const ranges: {start:string;end:string}[] = []
      avail?.forEach(a => {
        if (a.start_time && a.end_time && a.block_type !== 'full_day')
          ranges.push({ start: a.start_time.slice(0,5), end: a.end_time.slice(0,5) })
      })
      bks?.forEach(b => {
        if (b.start_time && b.end_time)
          ranges.push({ start: b.start_time.slice(0,5), end: b.end_time.slice(0,5) })
      })
      setBookedRanges(ranges)
    }).catch(() => {})
    return () => { mounted = false }
  }, [eventDate, space.id])

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

  // Convierte el tiempo de cierre de un bloque a minutos, manejando cruces de medianoche.
  // Si el cierre es menor o igual al inicio (ej: 22:00 → 02:00), suma 24h.
  function blockEndToMins(endTime: string, startTime: string): number {
    if (endTime === '00:00') return 24 * 60
    const endM   = timeToMins(endTime)
    const startM = timeToMins(startTime)
    return endM <= startM ? endM + 24 * 60 : endM
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
      const aLen = blockEndToMins(a.end_time, a.start_time) - timeToMins(a.start_time)
      const bLen = blockEndToMins(b.end_time, b.start_time) - timeToMins(b.start_time)
      return bLen - aLen
    })
    return { start: sorted[0].start_time as string, end: sorted[0].end_time as string }
  }, [eventDate, space.space_time_blocks])

  // ── Configuración de límites ───────────────────────────
  const packageHours = pricing?.package_hours ?? 0
  const sessionHours = pricing?.session_hours ?? 0
  const minHours     = pricing?.min_hours ?? 0

  // Límite máximo de horas visible en el picker:
  // - Paquete sin hora extra → packageHours es el máximo incluido
  // - Consumo mínimo con session_hours → session_hours es la duración máxima de sesión
  // - Cualquier tipo con max_hours explícito → respeta ese valor
  const maxHours = (() => {
    const explicit = pricing?.max_hours ?? 0
    if (explicit > 0) return explicit
    if (isPackage && packageHours > 0 && !(Number(pricing?.extra_hour_price) > 0))
      return packageHours
    if (isConsumption && sessionHours > 0)
      return sessionHours
    return 0 // sin límite
  })()

  // El cliente siempre elige sus horas libremente.
  // session_hours y package_hours son sugerencias, no duración forzada.
  const fixedDuration: number = 0

  const SLOT_MINS = 30 // tamaño mínimo de slot (30 minutos)

  // Para duración fija, restringir el picker de inicio
  const startPickerRange = useMemo(() => {
    if (!allowedTimeRange || fixedDuration <= 0) return allowedTimeRange
    const blockEndMins    = blockEndToMins(allowedTimeRange.end, allowedTimeRange.start)
    const latestStartMins = blockEndMins - fixedDuration * 60
    if (latestStartMins < timeToMins(allowedTimeRange.start)) return null
    return { start: allowedTimeRange.start, end: minsToTime(latestStartMins + SLOT_MINS) }
  }, [allowedTimeRange, fixedDuration])

  // Rango para picker de salida: el usuario puede salir hasta la hora exacta de cierre del bloque
  const endPickerAllowedRange = useMemo(() => {
    if (!allowedTimeRange) return allowedTimeRange
    const blockEndMins = blockEndToMins(allowedTimeRange.end, allowedTimeRange.start)
    return { start: allowedTimeRange.start, end: minsToTime(blockEndMins) }
  }, [allowedTimeRange])

  // Bloque demasiado corto para la duración fija
  const blockTooShort = fixedDuration > 0 && allowedTimeRange !== null && allowedTimeRange !== undefined && startPickerRange === null

  // Para consumo mínimo: detectar si el bloque tiene exactamente un solo turno posible
  // (ej: bloque 8pm-12am = exactamente fixedDuration horas → solo un inicio válido)
  const singleTurno = useMemo(() => {
    if (!fixedDuration || !startPickerRange || !allowedTimeRange) return null
    const sStart = timeToMins(startPickerRange.start)
    const sEnd   = blockEndToMins(startPickerRange.end, startPickerRange.start)
    // Si solo cabe un slot de inicio (diferencia < 2 slots) → turno único
    if (sEnd - sStart <= SLOT_MINS) return allowedTimeRange.start
    return null
  }, [startPickerRange, fixedDuration, allowedTimeRange])

  // effectiveStartTime: usa el turno único auto-seleccionado si el usuario no eligió manualmente
  const effectiveStartTime = singleTurno && !startTime ? singleTurno : startTime

  // realEndTime: para duración fija se calcula desde effectiveStartTime; para variable = endTime
  const realEndTime = fixedDuration > 0 && effectiveStartTime
    ? addHoursToTime(effectiveStartTime, fixedDuration)
    : endTime

  // Minutos disponibles desde efectiveStartTime hasta el cierre del bloque (para end picker)
  const minsUntilBlockEnd = useMemo(() => {
    if (!allowedTimeRange || !effectiveStartTime) return undefined
    const blockEndMins = blockEndToMins(allowedTimeRange.end, allowedTimeRange.start)
    return blockEndMins - timeToMins(effectiveStartTime)
  }, [allowedTimeRange, effectiveStartTime])

  const selectedHours = useMemo(
    () => calcHours(effectiveStartTime, realEndTime),
    [effectiveStartTime, realEndTime]
  )

  // ── Validación de horas ────────────────────────────────
  const hoursError = useMemo((): string | null => {
    if (!effectiveStartTime || !realEndTime || selectedHours === 0) return null
    // Mínimo absoluto: 30 minutos (medio slot) — evita reservas de 5 o 15 min por selección manual
    if (selectedHours > 0 && selectedHours < 0.5)
      return 'La reserva mínima es de 30 minutos'
    if (minHours && selectedHours < minHours)
      return `Este espacio requiere mínimo ${minHours} hora${minHours > 1 ? 's' : ''} de reserva`
    if (maxHours && selectedHours > maxHours)
      return `Este espacio permite máximo ${maxHours} hora${maxHours > 1 ? 's' : ''} de reserva`
    if (allowedTimeRange) {
      const endMins      = timeToMins(realEndTime)
      const blockEndMins = blockEndToMins(allowedTimeRange.end, allowedTimeRange.start)
      if (endMins > blockEndMins)
        return `Tu hora de salida sería después del cierre (${formatTime(allowedTimeRange.end)}). Elige una hora de llegada más temprana.`
    }
    return null
  }, [selectedHours, minHours, maxHours, effectiveStartTime, realEndTime, allowedTimeRange])

  // ── Cálculo de precio por modelo ───────────────────────
  const selectedAddonItems = useMemo(
    () => addons.filter((a: any) => selectedAddons.includes(a.id)),
    [addons, selectedAddons]
  )

  // Detectar si la fecha seleccionada es fin de semana (vie=5, sáb=6, dom=0)
  const isWeekend = useMemo(() => {
    if (!eventDate) return false
    const dow = new Date(eventDate + 'T12:00').getDay()
    return dow === 0 || dow === 5 || dow === 6
  }, [eventDate])

  const weekendMultiplier = useMemo(() => {
    const m = Number(pricing?.weekend_multiplier ?? 1)
    // Aplicar si es fin de semana Y el multiplicador es diferente de 1 (ya sea premium o descuento)
    return isWeekend && m > 0 && m !== 1 ? m : 1
  }, [isWeekend, pricing])

  const basePrice = useMemo(() => {
    if (!effectiveStartTime || !realEndTime || selectedHours === 0) return 0

    let price = 0
    if (isHourly) {
      price = (pricing?.hourly_price ?? 0) * selectedHours
    } else if (isConsumption) {
      price = pricing?.minimum_consumption ?? 0
    } else if (isPackage) {
      const base  = pricing?.fixed_price ?? 0
      const extra = Math.max(0, selectedHours - packageHours)
      const extraRate = pricing?.extra_hour_price ?? 0
      price = base + extra * extraRate
    }
    // Aplicar precio de fin de semana si aplica
    return price > 0 ? Math.round(price * weekendMultiplier) : price
  }, [pricing, effectiveStartTime, realEndTime, selectedHours, isHourly, isConsumption, isPackage, packageHours, weekendMultiplier])

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
      if (dateBlocked) return false
      if (allowedTimeRange === null) return false
      if (isQuote) return true
      if (!effectiveStartTime || !realEndTime) return false
      if (selectedHours <= 0) return false
      if (hoursError) return false
      return true
    }
    if (step === 2) return guestCount >= (space.capacity_min ?? 1) && guestCount <= (space.capacity_max ?? 9999)
    if (step === 3) return !!eventType && (eventType !== 'Otro' || customEventType.trim().length > 0)
    if (step === maxStep) return termsAccepted
    return true
  }

  function next() {
    if (canGoNext() && step < maxStep) {
      setStep(s => s + 1)
      // En mobile, scroll al inicio del contenido para ver el nuevo paso
      setTimeout(() => contentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
    }
  }
  function back() {
    if (step > 1) {
      setStep(s => s - 1)
      setTimeout(() => contentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
    }
  }

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
    try {
      const { data: { user } } = await supabaseRef.current.auth.getUser()
      if (!user) {
        router.push(`/auth?redirect=${encodeURIComponent(window.location.pathname)}`)
        return
      }
      const result = await createBooking({
        spaceId: space.id, pricingId: pricing?.id,
        eventDate, startTime: effectiveStartTime, endTime: realEndTime,
        guestCount, eventType: finalEventType,
        eventNotes: guestNote || undefined,
        selectedAddonIds: selectedAddons,
        basePrice, addonsTotal, platformFee,
        totalAmount: subtotal,
      })
      if ('error' in result) {
        setError(result.error ?? 'Error al procesar la solicitud')
        setTimeout(() => errorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50)
      } else {
        setCreatedBookingId(result.bookingId ?? null)
        setSuccessType(
          result.status === 'quote_requested' ? 'quote' :
          result.status === 'accepted'        ? 'instant' :
          'pending'
        )
        setSuccess(true)
      }
    } catch {
      setError('Ocurrió un error inesperado. Por favor intenta de nuevo.')
    } finally {
      setBooking(false)
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
        {effectiveStartTime && realEndTime && effectiveStartTime !== '' && realEndTime !== '' && (
          <>
            <span style={{ color: 'var(--border-medium)' }}>·</span>
            <span className="flex items-center gap-1" style={{ color: 'var(--text-secondary)' }}>
              <Clock size={11} /> {formatTime(effectiveStartTime)} – {formatTime(realEndTime)}
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

  // ── Pantalla de éxito ─────────────────────────────────
  if (success) return (
    <div className="rounded-3xl p-7 text-center"
      style={{ background: '#fff', border: '1px solid var(--border-subtle)', boxShadow: '0 8px 40px rgba(0,0,0,0.08)' }}>
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
        style={{ background: successType === 'instant' ? 'rgba(37,99,235,0.1)' : successType === 'quote' ? 'rgba(8,145,178,0.1)' : 'rgba(53,196,147,0.1)' }}>
        <CheckCircle size={32} style={{ color: successType === 'instant' ? '#2563EB' : successType === 'quote' ? '#0891B2' : 'var(--brand)' }} />
      </div>

      {successType === 'instant' ? (
        <>
          <h3 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
            ¡Reserva aceptada automáticamente!
          </h3>
          <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            Este espacio tiene <strong>confirmación instantánea</strong>. Tu fecha está pre-reservada — completa el pago para asegurarla.
          </p>
          <div className="flex items-start gap-2.5 text-left px-4 py-3 rounded-xl mb-5"
            style={{ background: 'rgba(37,99,235,0.06)', border: '1px solid rgba(37,99,235,0.2)' }}>
            <Timer size={15} style={{ color: '#2563EB', flexShrink: 0, marginTop: 1 }} />
            <p className="text-xs" style={{ color: '#1E40AF', lineHeight: 1.6 }}>
              <strong>Tienes 24 horas para completar el pago.</strong>{' '}
              Si no pagas en ese tiempo, la fecha se liberará automáticamente.
            </p>
          </div>
          <Link href={createdBookingId ? `/pago/${createdBookingId}` : '/dashboard/reservas'}
            className="inline-flex items-center gap-2 text-sm font-semibold px-5 py-3 rounded-xl"
            style={{ background: '#2563EB', color: '#fff' }}>
            Completar pago ahora <ChevronRight size={15} />
          </Link>
          <div className="mt-3">
            <Link href="/dashboard/reservas" className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Pagar después desde mis reservas
            </Link>
          </div>
        </>
      ) : successType === 'quote' ? (
        <>
          <h3 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
            ¡Cotización enviada!
          </h3>
          <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            El propietario recibirá los detalles de tu evento y te enviará una propuesta de precio.
          </p>
          <div className="flex items-start gap-2.5 text-left px-4 py-3 rounded-xl mb-5"
            style={{ background: 'rgba(8,145,178,0.06)', border: '1px solid rgba(8,145,178,0.2)' }}>
            <Mail size={15} style={{ color: '#0891B2', flexShrink: 0, marginTop: 1 }} />
            <p className="text-xs" style={{ color: '#0C4A6E', lineHeight: 1.6 }}>
              <strong>Plazo de respuesta: 48 horas hábiles.</strong>{' '}
              Recibirás un email cuando el propietario envíe su propuesta. Puedes escribirle directamente desde el chat mientras tanto.
            </p>
          </div>
          <Link href="/dashboard/reservas"
            className="inline-flex items-center gap-2 text-sm font-semibold px-5 py-3 rounded-xl"
            style={{ background: '#0891B2', color: '#fff' }}>
            Ver mi cotización <ChevronRight size={15} />
          </Link>
        </>
      ) : (
        <>
          <h3 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
            ¡Solicitud enviada!
          </h3>
          <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            El propietario revisará tu solicitud y confirmará disponibilidad.
          </p>
          <div className="flex items-start gap-2.5 text-left px-4 py-3 rounded-xl mb-5"
            style={{ background: 'rgba(53,196,147,0.06)', border: '1px solid rgba(53,196,147,0.2)' }}>
            <Clock size={14} style={{ color: 'var(--brand)', flexShrink: 0, marginTop: 1 }} />
            <p className="text-xs" style={{ color: '#065F46', lineHeight: 1.6 }}>
              <strong>Respuesta en 24–48 horas.</strong>{' '}
              Te notificaremos por email en cuanto el propietario responda. Solo pagas si acepta.
            </p>
          </div>
          <Link href="/dashboard/reservas"
            className="inline-flex items-center gap-2 text-sm font-semibold px-5 py-3 rounded-xl"
            style={{ background: 'var(--brand)', color: '#fff' }}>
            Ver mis solicitudes <ChevronRight size={15} />
          </Link>
        </>
      )}
    </div>
  )

  // ── Cabecera de precio ────────────────────────────────
  function PriceHeader() {
    if (!pricing) return null
    if (isQuote) return (
      <div>
        <div className="flex items-center gap-2 mb-1">
          <MessageCircle size={18} style={{ color: 'var(--brand)' }} />
          <span className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>Cotización personalizada</span>
        </div>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          Describe tu evento y el propietario te enviará un precio.
        </p>
      </div>
    )
    return (
      <div>
        {space.instant_booking && (
          <div className="flex items-center gap-1.5 mb-3 px-3 py-1.5 rounded-xl w-fit"
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
            <span style={{ fontSize: 13 }}>⚡</span>
            <span className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Confirmación instantánea</span>
          </div>
        )}
        {isHourly && (
          <div>
            <div className="flex items-baseline gap-1 mb-1.5">
              <span className="text-2xl md:text-3xl font-bold" style={{ color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>
                {formatCurrency(pricing.hourly_price)}
              </span>
              <span className="text-sm" style={{ color: 'var(--text-muted)' }}> / hora</span>
            </div>
            {minHours > 0 && (
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Desde {formatCurrency(pricing.hourly_price * minHours)}{' '}
                <span style={{ color: 'var(--text-muted)' }}>· mínimo {minHours} hora{minHours > 1 ? 's' : ''}</span>
                {maxHours > 0 && <span>, máximo {maxHours}h</span>}
              </div>
            )}
          </div>
        )}
        {isConsumption && (
          <div>
            <div className="flex items-baseline gap-1 mb-1.5">
              <span className="text-2xl md:text-3xl font-bold" style={{ color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>
                {formatCurrency(pricing.minimum_consumption)}
              </span>
              <span className="text-sm" style={{ color: 'var(--text-muted)' }}> consumibles</span>
            </div>
            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {minHours > 0 && maxHours > 0
                ? `Desde ${minHours}h hasta ${maxHours}h`
                : minHours > 0 ? `Mínimo ${minHours} hora${minHours > 1 ? 's' : ''}`
                : maxHours > 0 ? `Máximo ${maxHours}h`
                : 'Elige tu horario'}
              {' · se aplica en consumo del local'}
            </div>
          </div>
        )}
        {isPackage && (
          <div>
            {pricing.package_name && (
              <div className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
                {pricing.package_name}
              </div>
            )}
            <div className="flex items-baseline gap-1 mb-1.5">
              <span className="text-2xl md:text-3xl font-bold" style={{ color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>
                {formatCurrency(pricing.fixed_price)}
              </span>
              {packageHours > 0 && (
                <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  · {packageHours} hora{packageHours > 1 ? 's' : ''} incluidas
                </span>
              )}
            </div>
            {pricing.extra_hour_price > 0 && (
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Hora extra: {formatCurrency(pricing.extra_hour_price)}
              </div>
            )}
          </div>
        )}

        {/* Cuotas — solo una línea, el detalle sale en step 1 */}
        <div className="mt-2.5 pt-2.5 flex items-center gap-1.5" style={{ borderTop: '1px solid var(--border-subtle)' }}>
          <CreditCard size={12} style={{ color: 'var(--brand)' }} />
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Pago disponible en cuotas · elige una fecha para ver el plan
          </span>
        </div>
      </div>
    )
  }

  return (
    <div ref={contentRef} className="rounded-3xl w-full max-w-full"
      style={{ background: '#fff', border: '1px solid var(--border-subtle)', boxShadow: '0 8px 40px rgba(0,0,0,0.08)', overflow: 'visible' }}>

      {/* Precio */}
      <div className="px-6 pt-5 pb-4" style={{ borderBottom: '1px solid var(--border-subtle)', borderRadius: '24px 24px 0 0' }}>
        <PriceHeader />
      </div>

      {/* Progreso */}
      <div className="px-5 pt-3 pb-2.5" style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-base)' }}>
        <div className="flex gap-1.5">
          {steps.map(s => (
            <button key={s.id}
              onClick={() => s.id < step && setStep(s.id)}
              disabled={s.id >= step}
              className="flex-1 py-3 flex items-center"
              style={{ cursor: s.id < step ? 'pointer' : 'default' }}>
              <div className="w-full h-1 rounded-full transition-all"
                style={{
                  background: s.id < step ? 'var(--brand)'
                    : s.id === step ? 'var(--brand)'
                    : 'var(--border-medium)',
                  opacity: s.id < step ? 0.45 : s.id === step ? 1 : 0.2,
                }} />
            </button>
          ))}
        </div>
        <p className="text-[11px] mt-0.5 font-medium" style={{ color: 'var(--text-muted)' }}>
          {steps.find(s => s.id === step)?.label}
        </p>
      </div>

      {/* Contenido */}
      <div className="px-5 py-5" style={{ minHeight: 320 }}>
        <MiniSummary />

        {/* ── PASO 1: FECHA Y HORA ────────────────────────── */}
        {step === 1 && (
          <div className="space-y-5">
            <h3 className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>¿Cuándo es tu evento?</h3>

            <DatePicker
              value={eventDate}
              onChange={v => { setEventDate(v); setShowPaymentPlan(false) }}
              minDate={new Date().toISOString().split('T')[0]}
              placeholder="Elige una fecha"
            />

            {/* ── Plan de cuotas desplegable ── */}
            {eventDate && !dateBlocked && allowedTimeRange !== null && allowedTimeRange !== undefined && !isQuote && (() => {
              const today = new Date(); today.setHours(0,0,0,0)
              const daysUntil = Math.max(0, Math.ceil((new Date(eventDate + 'T12:00').getTime() - today.getTime()) / 86400000))
              const sched = buildSchedule(eventDate, 100)
              const daysLabel = daysUntil === 0 ? 'Hoy' : daysUntil === 1 ? 'Mañana' : `${daysUntil} días`
              return (
                <div className="rounded-xl overflow-hidden"
                  style={{ border: '1px solid var(--border-medium)' }}>
                  {/* Fila colapsable */}
                  <button type="button"
                    onClick={() => setShowPaymentPlan(o => !o)}
                    className="w-full flex items-center justify-between px-3 py-2.5 transition-colors"
                    style={{ background: 'var(--bg-elevated)' }}>
                    <span className="text-xs font-semibold flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
                      <CalendarDays size={12} style={{ color: 'var(--brand)' }} />
                      {daysLabel} · {sched.installments.length === 1
                        ? 'Pago único al confirmar'
                        : `${sched.installments.length} cuotas · ${sched.installments.map(i => `${i.percentage}%`).join(' + ')}`}
                    </span>
                    <ChevronRight size={13} style={{
                      color: 'var(--text-muted)',
                      transition: 'transform 0.2s',
                      transform: showPaymentPlan ? 'rotate(90deg)' : 'rotate(0deg)',
                      flexShrink: 0,
                    }} />
                  </button>
                  {/* Detalle expandido */}
                  {showPaymentPlan && (
                    <div style={{ borderTop: '1px solid var(--border-subtle)' }}>
                      {sched.installments.map((inst, i) => (
                        <div key={i} className="flex items-center justify-between px-3 py-2.5"
                          style={{ borderBottom: i < sched.installments.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}>
                          <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full shrink-0"
                              style={{ background: i === 0 ? 'var(--brand)' : 'var(--border-medium)' }} />
                            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                              {i === 0 ? 'Al confirmar reserva' : new Date(inst.due_date + 'T12:00').toLocaleDateString('es-DO', { day: 'numeric', month: 'long' })}
                            </span>
                          </div>
                          <span className="text-xs font-semibold" style={{ color: i === 0 ? 'var(--brand)' : 'var(--text-muted)' }}>
                            {inst.percentage}% del total
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })()}

            {/* Badge precio fin de semana */}
            {isWeekend && weekendMultiplier !== 1 && eventDate && !dateBlocked && (() => {
              const pct = Math.round(Math.abs(weekendMultiplier - 1) * 100)
              const isDiscount = weekendMultiplier < 1
              return (
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs"
                  style={{
                    background: isDiscount ? 'rgba(34,197,94,0.06)' : 'rgba(245,158,11,0.07)',
                    border:     `1px solid ${isDiscount ? 'rgba(34,197,94,0.25)' : 'rgba(245,158,11,0.25)'}`,
                    color:      isDiscount ? '#166534' : '#92400E',
                  }}>
                  <CalendarDays size={12} style={{ color: isDiscount ? '#16A34A' : '#D97706', flexShrink: 0 }} />
                  <span className="font-semibold">
                    Fin de semana · {isDiscount ? `-${pct}%` : `+${pct}%`}
                  </span>
                </div>
              )
            })()}

            {isQuote && (
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs"
                style={{ background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.2)', color: '#92400E' }}>
                <Info size={12} style={{ color: '#D97706', flexShrink: 0 }} />
                El propietario te enviará un precio. El horario es opcional.
              </div>
            )}

            {/* Fecha bloqueada manualmente por el propietario */}
            {dateBlocked && eventDate && (
              <div className="px-4 py-3 rounded-xl text-sm"
                style={{ background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.15)', color: '#DC2626' }}>
                El propietario ha bloqueado esta fecha. Elige otro día o contáctalo directamente.
              </div>
            )}

            {/* Sin horario configurado para este día de la semana */}
            {!dateBlocked && allowedTimeRange === null && eventDate && (
              <div className="px-4 py-3 rounded-xl text-sm"
                style={{ background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.15)', color: '#DC2626' }}>
                El propietario no tiene este día habilitado. Elige otra fecha o consulta con él.
              </div>
            )}

            {/* Selectores de hora */}
            {eventDate && !dateBlocked && allowedTimeRange !== null && (
              <div className="space-y-3">

                {/* Error: bloque demasiado corto */}
                {blockTooShort && (
                  <div className="px-4 py-3 rounded-xl text-sm"
                    style={{ background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.15)', color: '#DC2626' }}>
                    El horario disponible este día no es suficiente para completar la sesión de {fixedDuration}h.
                    Elige otra fecha o consulta al propietario.
                  </div>
                )}

                {/* ── CASO A: Turno único (ej: restaurante 8pm-12am exacto) ── */}
                {!blockTooShort && singleTurno && (
                  <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--brand-border)' }}>
                    <div className="flex items-center justify-between px-4 py-3.5"
                      style={{ background: 'var(--brand-dim)' }}>
                      <div>
                        <div className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                          {formatTime(singleTurno)} → {formatTime(addHoursToTime(singleTurno, fixedDuration))}
                        </div>
                        <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                          Sesión de {fixedDuration} hora{fixedDuration !== 1 ? 's' : ''}
                          {isConsumption ? ' · Consumibles incluidos' : ''}
                        </div>
                      </div>
                      <div className="w-6 h-6 rounded-full flex items-center justify-center"
                        style={{ background: 'var(--brand)' }}>
                        <CheckCircle size={13} className="text-white" />
                      </div>
                    </div>
                  </div>
                )}

                {/* ── CASO B: Duración fija con múltiples inicios posibles ── */}
                {!blockTooShort && fixedDuration > 0 && !singleTurno && (
                  <div className="space-y-3">
                    <TimePicker
                      value={startTime}
                      onChange={v => setStartTime(v)}
                      placeholder={isConsumption ? '¿A qué hora llega tu grupo?' : 'Hora de llegada'}
                      allowedRange={startPickerRange}
                      excludedRanges={bookedRanges}
                    />
                    {startTime && (
                      <div className="flex items-center justify-between px-4 py-3.5 rounded-2xl"
                        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
                        <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
                          {isConsumption ? 'Tu grupo sale a las' : 'Hora de salida'}
                        </span>
                        <span className="text-sm font-bold tabular-nums" style={{ color: 'var(--text-primary)' }}>
                          {formatTime(addHoursToTime(startTime, fixedDuration))}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* ── CASO C: El cliente elige horas libremente ── */}
                {!blockTooShort && fixedDuration === 0 && (
                  <div className="space-y-3">
                    {/* Límite de sesión para consumo mínimo */}
                    {(isConsumption && sessionHours > 0) && (
                      <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs"
                        style={{ background: 'rgba(37,99,235,0.05)', border: '1px solid rgba(37,99,235,0.15)', color: '#1D4ED8' }}>
                        <Clock size={12} style={{ flexShrink: 0 }} />
                        Sesión de hasta {sessionHours}h · Elige tu horario dentro de ese bloque
                      </div>
                    )}
                    {isPackage && packageHours > 0 && (
                      <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs"
                        style={{ background: 'var(--brand-dim)', border: '1px solid var(--brand-border)', color: 'var(--brand)' }}>
                        <Package size={12} style={{ flexShrink: 0 }} />
                        Paquete de {packageHours}h · Elige el horario que mejor te convenga
                        {Number(pricing?.extra_hour_price) > 0 && ` · +${formatCurrency(Number(pricing.extra_hour_price))}/hr adicional`}
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-3">
                      <TimePicker
                        value={startTime}
                        onChange={v => { setStartTime(v); setEndTime('') }}
                        placeholder={isConsumption ? 'Llegada' : 'Hora de inicio'}
                        allowedRange={allowedTimeRange}
                        excludedRanges={bookedRanges}
                      />
                      <TimePicker
                        value={endTime}
                        onChange={setEndTime}
                        placeholder={startTime ? (isConsumption ? 'Salida' : 'Hora de salida') : 'Elige llegada primero'}
                        disabled={!startTime}
                        afterValue={startTime || undefined}
                        minMinutesAfter={minHours ? minHours * 60 : (isPackage && packageHours > 0 ? 30 : undefined)}
                        maxMinutesAfter={
                          minsUntilBlockEnd !== undefined
                            ? (maxHours ? Math.min(maxHours * 60, minsUntilBlockEnd) : minsUntilBlockEnd)
                            : (maxHours ? maxHours * 60 : undefined)
                        }
                        allowedRange={endPickerAllowedRange}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Error de horas */}
            {hoursError && (
              <div className="flex items-start gap-2 px-4 py-3 rounded-xl"
                style={{ background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.2)', color: '#DC2626' }}>
                <AlertCircle size={15} style={{ color: '#DC2626', flexShrink: 0, marginTop: 2 }} />
                <span className="text-xs md:text-sm leading-snug">{hoursError}</span>
              </div>
            )}

            {/* Preview de precio cuando hay horario válido */}
            {effectiveStartTime && realEndTime && selectedHours > 0 && !hoursError && !singleTurno && (
              <div className="flex items-center justify-between px-4 py-3.5 rounded-2xl"
                style={{ background: isConsumption ? 'rgba(37,99,235,0.05)' : 'var(--brand-dim)', border: `1px solid ${isConsumption ? 'rgba(37,99,235,0.15)' : 'var(--brand-border)'}` }}>
                <div>
                  <div className="text-sm font-medium" style={{ color: isConsumption ? '#1D4ED8' : 'var(--text-secondary)' }}>
                    {formatTime(effectiveStartTime)} – {formatTime(realEndTime)}
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
            <div className="mb-4">
              <h3 className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>¿Cuántas personas asistirán?</h3>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                Capacidad: {space.capacity_min ? `${space.capacity_min}–` : 'hasta '}{space.capacity_max} personas
              </p>
            </div>
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
                  style={{ color: 'var(--text-primary)', fontSize: '2rem', minHeight: 48 }}
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
            <h3 className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>¿Qué tipo de evento es?</h3>
            <div className="grid grid-cols-2 gap-2">
              {ALL_EVENT_TYPES.map(({ label, Icon }) => {
                const isSelected = eventType === label
                return (
                  <button key={label} onClick={() => { setEventType(label); if (label !== 'Otro') setCustomEventType('') }}
                    className="flex items-center gap-2.5 px-3.5 py-3 rounded-2xl text-left transition-all"
                    style={isSelected
                      ? { background: 'var(--text-primary)', color: '#fff', boxShadow: '0 2px 12px rgba(3,49,60,0.15)' }
                      : { background: '#fff', color: 'var(--text-primary)', border: '1.5px solid var(--border-medium)' }}>
                    <Icon size={15} className="shrink-0"
                      style={{ color: isSelected ? 'var(--brand)' : 'var(--text-muted)' }} />
                    <span className="text-sm font-medium leading-tight">{label}</span>
                  </button>
                )
              })}
            </div>
            {eventType === 'Otro' && (
              <div className="space-y-3">
                <input value={customEventType} onChange={e => setCustomEventType(e.target.value)}
                  placeholder="Describe tu evento..." className="input-base w-full rounded-xl px-4 py-3 text-sm" autoFocus maxLength={80} style={{ fontSize: 16 }} />
                <textarea value={guestNote} onChange={e => setGuestNote(e.target.value)}
                  placeholder="Cuéntale más al propietario (opcional)..."
                  rows={2} maxLength={400} className="input-base w-full rounded-xl px-4 py-3 text-sm resize-none" style={{ fontSize: 16 }} />
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
                  rows={2} maxLength={400} className="input-base w-full rounded-xl px-4 py-3 text-sm resize-none" style={{ fontSize: 16 }} />
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
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: sel ? 'rgba(53,196,147,0.12)' : 'var(--bg-elevated)' }}>
                      {(() => { const I = addonIcon(addon.name); return <I size={15} style={{ color: 'var(--brand)' }} /> })()}
                    </div>
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
                { icon: Clock, label: 'Horario', value: effectiveStartTime && realEndTime ? `${formatTime(effectiveStartTime)} – ${formatTime(realEndTime)} · ${selectedHours % 1 === 0 ? selectedHours : selectedHours.toFixed(1)} horas` : (isQuote ? 'A definir con el propietario' : '—') },
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
                        {isConsumption && (
                          <span>
                            {effectiveStartTime && realEndTime
                              ? `${selectedHours % 1 === 0 ? selectedHours : selectedHours.toFixed(1)}h · Consumibles`
                              : 'Consumibles'}
                            <span className="block text-[11px] font-normal mt-0.5" style={{ color: 'var(--text-muted)' }}>
                              Se aplica en consumo del local · diferencia se paga en sitio
                            </span>
                          </span>
                        )}
                        {isPackage && (() => {
                          const extra = Math.max(0, selectedHours - packageHours)
                          return extra > 0
                            ? `Paquete (${packageHours}h) + ${extra.toFixed(1)}h adicionales`
                            : `Paquete ${packageHours}h incluidas`
                        })()}
                        {isWeekend && weekendMultiplier !== 1 && (() => {
                          const isDiscount = weekendMultiplier < 1
                          const pct = Math.round(Math.abs(weekendMultiplier - 1) * 100)
                          return (
                            <span className="ml-1.5 text-xs font-semibold px-1.5 py-0.5 rounded-md"
                              style={{
                                background: isDiscount ? 'rgba(34,197,94,0.1)' : 'rgba(245,158,11,0.1)',
                                color:      isDiscount ? '#16A34A' : '#D97706',
                              }}>
                              Tarifa fin de semana ({isDiscount ? '-' : '+'}{pct}%)
                            </span>
                          )
                        })()}
                      </span>
                      <span>{formatCurrency(basePrice)}</span>
                    </div>
                  )}
                  {selectedAddonItems.map((a: any) => (
                    <div key={a.id} className="flex justify-between px-4 py-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
                      <span className="flex items-center gap-1.5">{(() => { const I = addonIcon(a.name); return <I size={13} style={{ color: 'var(--brand)' }} /> })()} {a.name}</span>
                      <span>+ {formatCurrency(a.unit === 'persona' ? a.price * guestCount : a.unit === 'hora' ? a.price * selectedHours : a.price)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between px-4 py-3 text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                    <span>Total</span><span>{formatCurrency(subtotal)}</span>
                  </div>
                </div>
              </div>
            )}




            {guestNote && (
              <div className="px-4 py-3 rounded-xl text-sm italic"
                style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
                "{guestNote}"
              </div>
            )}

            {/* ── Plan de cuotas en resumen final ── */}
            {!isQuote && eventDate && subtotal > 0 && (() => {
              const sched = buildSchedule(eventDate, subtotal)
              if (sched.installments.length === 1) return null
              return (
                <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border-subtle)' }}>
                  <div className="px-4 py-2.5 flex items-center gap-2"
                    style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border-subtle)' }}>
                    <CreditCard size={13} style={{ color: 'var(--brand)', flexShrink: 0 }} />
                    <span className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>
                      Plan de pagos — {sched.installments.length} cuotas
                    </span>
                  </div>
                  {sched.installments.map((inst, i) => (
                    <div key={i} className="flex items-center justify-between px-4 py-2"
                      style={{ borderBottom: i < sched.installments.length - 1 ? '1px solid var(--border-subtle)' : 'none', background: '#fff' }}>
                      <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{inst.label}</span>
                      <span className="text-xs font-semibold tabular-nums" style={{ color: 'var(--text-primary)' }}>
                        {formatCurrency(inst.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              )
            })()}


            {/* Checkbox T&C — requerido por Azul Payments */}
            <label className="flex items-start gap-3 cursor-pointer select-none">
              <div className="relative mt-0.5 shrink-0">
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={e => setTermsAccepted(e.target.checked)}
                  className="sr-only"
                />
                <div className="w-6 h-6 rounded-md flex items-center justify-center transition-all"
                  style={{
                    background: termsAccepted ? 'var(--brand)' : '#fff',
                    border: termsAccepted ? '2px solid var(--brand)' : '2px solid #CBD5E1',
                  }}>
                  {termsAccepted && (
                    <svg width="11" height="9" viewBox="0 0 11 9" fill="none">
                      <path d="M1 4.5L4 7.5L10 1" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </div>
              </div>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                He leído y acepto los{' '}
                <a href="/terminos" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--brand)', textDecoration: 'underline' }}>
                  términos y condiciones
                </a>{' '}y la{' '}
                <a href="/reembolso" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--brand)', textDecoration: 'underline' }}>
                  política de reembolso
                </a>{' '}de Espot. *
              </p>
            </label>

            {/* Logos de seguridad de pago */}
            <div className="flex items-center justify-center gap-2 pt-1 flex-wrap">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/visa-logo.jpg" alt="Visa" style={{ height: 20, width: 35, borderRadius: 3, objectFit: 'contain' }} />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/mastercard-logo.svg" alt="Mastercard" style={{ height: 20, width: 32 }} />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/verified-by-visa.svg" alt="Verified by Visa" style={{ height: 18, width: 54 }} />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/mastercard-id-check.png" alt="Mastercard ID Check" style={{ height: 18, width: 18 }} />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/azul-logo.jpg" alt="Azul Payments" style={{ height: 18, width: 54, borderRadius: 3, objectFit: 'contain' }} />
            </div>

            {error && (
              <div ref={errorRef} className="text-sm px-4 py-3 rounded-xl"
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
          <button onClick={handleBook} disabled={booking || (!isQuote && !termsAccepted) || (!isQuote && subtotal <= 0)}
            className="w-full flex items-center justify-center gap-2.5 py-4 rounded-2xl font-bold text-base transition-all disabled:opacity-50"
            style={{
              background: isQuote ? '#0891B2' : 'var(--brand)', color: '#fff',
              boxShadow: `0 4px 24px ${isQuote ? 'rgba(8,145,178,0.3)' : 'rgba(53,196,147,0.35)'}`,
            }}>
            {booking
              ? <><Loader2 size={18} className="animate-spin" /> Enviando solicitud...</>
              : isQuote
                ? <><MessageCircle size={18} /> Solicitar cotización</>
                : <><CheckCircle size={18} /> Enviar solicitud de reserva</>
            }
          </button>
        ) : (
          <button onClick={next} disabled={!canGoNext()}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-semibold text-sm transition-all disabled:opacity-40"
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
              className="flex items-center gap-1.5 text-xs font-medium px-4 py-3 rounded-xl flex-1 justify-center"
              style={{ color: 'var(--text-secondary)', border: '1px solid var(--border-medium)', background: '#fff' }}>
              <ChevronLeft size={13} /> Atrás
            </button>
          )}
          <button onClick={onChat}
            className={cn('flex items-center gap-1.5 text-xs font-medium px-4 py-3 rounded-xl transition-all', step > 1 ? 'flex-1 justify-center' : 'w-full justify-center')}
            style={{ color: 'var(--text-secondary)', border: '1px solid var(--border-medium)', background: '#fff' }}>
            <MessageCircle size={13} /> Consultar al propietario
          </button>
        </div>
      </div>
    </div>
  )
}
