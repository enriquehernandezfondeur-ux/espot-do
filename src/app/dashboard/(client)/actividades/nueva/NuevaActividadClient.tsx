'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ChevronLeft, MapPin, Building2, Search, Check, Loader2, CalendarDays, Clock, ExternalLink,
} from 'lucide-react'
import { formatDate, formatTime } from '@/lib/utils'
import DatePicker from '@/components/ui/DatePicker'
import TimePicker from '@/components/ui/TimePicker'
import { ActivityTypePicker } from '@/components/activities/ActivityTypePicker'
import { getTemplate } from '@/lib/activities/templates'
import {
  createActivity, searchSpacesForActivity,
  type CreateActivityInput, type SpaceSearchResult,
} from '@/lib/actions/activities'
import type { ActivityType, LocationMode } from '@/lib/activities/types'

export interface BookingOption {
  id: string
  spaceName: string
  spaceId: string | null
  address: string | null
  cover: string | null
  eventDate: string | null
  startTime: string | null
  endTime: string | null
}

const STEPS = ['Tipo', 'Detalles', 'Ubicación']

const INPUT_STYLE: React.CSSProperties = {
  fontSize: 16,
  background: 'var(--bg-surface)',
  border: '1.5px solid var(--border-medium)',
  color: 'var(--text-primary)',
}

export function NuevaActividadClient({ bookings }: { bookings: BookingOption[] }) {
  const router = useRouter()

  const [step, setStep] = useState(0)

  // Paso 1
  const [type, setType] = useState<ActivityType | null>(null)

  // Paso 2
  const [title, setTitle]               = useState('')
  const [eventDate, setEventDate]       = useState('')
  const [startTime, setStartTime]       = useState('')
  const [endTime, setEndTime]           = useState('')
  const [expectedPeople, setExpected]   = useState('')

  // Paso 3
  const [locationMode, setLocationMode] = useState<LocationMode | null>(null)
  const [externalLoc, setExternalLoc]   = useState('')
  const [bookingId, setBookingId]       = useState<string | null>(null)
  const [spaceQuery, setSpaceQuery]     = useState('')
  const [spaceResults, setSpaceResults] = useState<SpaceSearchResult[]>([])
  const [searching, setSearching]       = useState(false)
  const [selectedSpace, setSelectedSpace] = useState<SpaceSearchResult | null>(null)

  const [submitting, setSubmitting] = useState(false)
  const [error, setError]           = useState('')

  const canNextStep1 = !!type
  const canNextStep2 = title.trim().length > 0
  const canSubmit =
    locationMode === 'external' ? externalLoc.trim().length > 0 :
    locationMode === 'booking'  ? !!bookingId :
    locationMode === 'space'    ? !!selectedSpace :
    false

  async function runSearch() {
    setSearching(true)
    try {
      setSpaceResults(await searchSpacesForActivity(spaceQuery))
    } catch {
      setSpaceResults([])
    } finally {
      setSearching(false)
    }
  }

  async function handleSubmit() {
    if (!type || !locationMode) return
    setSubmitting(true)
    setError('')
    const input: CreateActivityInput = {
      type,
      title: title.trim(),
      event_date: eventDate || null,
      start_time: startTime || null,
      end_time: endTime || null,
      expected_people: expectedPeople ? Number(expectedPeople) : null,
      location_mode: locationMode,
      external_location: locationMode === 'external' ? externalLoc.trim() : null,
      booking_id: locationMode === 'booking' ? bookingId : null,
      space_id: locationMode === 'space' ? (selectedSpace?.id ?? null) : null,
    }
    const res = await createActivity(input)
    if (!res.ok) {
      setError(res.error)
      setSubmitting(false)
      return
    }
    router.push('/dashboard/actividades/' + res.id)
  }

  const selectedBooking = bookings.find(b => b.id === bookingId) ?? null

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <button type="button"
          onClick={() => step === 0 ? router.push('/dashboard/actividades') : setStep(s => s - 1)}
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>
          <ChevronLeft size={18} />
        </button>
        <h1 className="text-xl md:text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Nueva actividad</h1>
      </div>

      {/* Control segmentado de progreso */}
      <div className="inline-flex gap-1 p-1 rounded-xl mb-6" style={{ background: 'var(--bg-elevated)' }}>
        {STEPS.map((label, i) => {
          const active = i === step
          const done   = i < step
          return (
            <button key={label} type="button"
              onClick={() => { if (i < step) setStep(i) }}
              disabled={i > step}
              className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5"
              style={active
                ? { background: 'var(--brand)', color: '#fff' }
                : { background: 'transparent', color: done ? 'var(--brand)' : '#6B7280', cursor: i > step ? 'default' : 'pointer' }}>
              {done && <Check size={13} />}
              {i + 1}. {label}
            </button>
          )
        })}
      </div>

      {/* ── Paso 1: Tipo ── */}
      {step === 0 && (
        <div className="space-y-5">
          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>¿Qué vas a organizar?</p>
          <ActivityTypePicker value={type} onChange={setType} />
          <button type="button" disabled={!canNextStep1} onClick={() => setStep(1)}
            className="w-full py-3.5 rounded-2xl text-sm font-bold disabled:opacity-40"
            style={{ background: 'var(--brand)', color: '#fff' }}>
            Continuar
          </button>
        </div>
      )}

      {/* ── Paso 2: Detalles ── */}
      {step === 1 && (
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>
              Nombre de la actividad *
            </label>
            <input value={title} onChange={e => setTitle(e.target.value)}
              placeholder={type ? getTemplate(type).label : 'Ej: Grabación del episodio 5'}
              className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none"
              style={INPUT_STYLE} />
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>
              Fecha
            </label>
            <DatePicker value={eventDate} onChange={setEventDate} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                Hora de inicio
              </label>
              <TimePicker value={startTime} onChange={setStartTime} placeholder="Hora de inicio" />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                Hora de salida
              </label>
              <TimePicker value={endTime} onChange={setEndTime} placeholder="Hora de salida" afterValue={startTime || undefined} />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>
              ¿Cuántas personas esperas?
            </label>
            <input value={expectedPeople} onChange={e => setExpected(e.target.value.replace(/\D/g, ''))}
              inputMode="numeric" placeholder="Ej: 12"
              className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none"
              style={INPUT_STYLE} />
          </div>

          <button type="button" disabled={!canNextStep2} onClick={() => setStep(2)}
            className="w-full py-3.5 rounded-2xl text-sm font-bold disabled:opacity-40"
            style={{ background: 'var(--brand)', color: '#fff' }}>
            Continuar
          </button>
        </div>
      )}

      {/* ── Paso 3: Ubicación ── */}
      {step === 2 && (
        <div className="space-y-4">
          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>¿Dónde será?</p>

          {/* Opciones (divulgación progresiva) */}
          {([
            { mode: 'external' as const, icon: MapPin,    title: 'Otra ubicación',     desc: 'Una dirección fuera de Espot' },
            { mode: 'booking'  as const, icon: CalendarDays, title: 'Una de mis reservas', desc: 'Vincula un espacio que ya reservaste' },
            { mode: 'space'    as const, icon: Building2,  title: 'Un espacio de Espot', desc: 'Busca y vincula un espacio publicado' },
          ]).map(opt => {
            const active = locationMode === opt.mode
            const Icon = opt.icon
            return (
              <div key={opt.mode}>
                <button type="button" onClick={() => setLocationMode(opt.mode)}
                  className="w-full flex items-center gap-3 p-3.5 rounded-2xl text-left transition-all"
                  style={{
                    background: active ? 'var(--brand-dim)' : 'var(--bg-card)',
                    border: `1.5px solid ${active ? 'var(--brand)' : 'var(--border-subtle)'}`,
                  }}>
                  <span className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: active ? 'var(--brand)' : 'var(--bg-elevated)' }}>
                    <Icon size={17} style={{ color: active ? '#fff' : 'var(--text-muted)' }} />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-semibold" style={{ color: active ? 'var(--brand)' : 'var(--text-primary)' }}>{opt.title}</span>
                    <span className="block text-xs" style={{ color: 'var(--text-muted)' }}>{opt.desc}</span>
                  </span>
                  {active && <Check size={16} style={{ color: 'var(--brand)' }} />}
                </button>

                {/* Divulgación progresiva: external */}
                {active && opt.mode === 'external' && (
                  <input value={externalLoc} onChange={e => setExternalLoc(e.target.value)}
                    placeholder="Dirección completa"
                    className="w-full mt-2.5 rounded-xl px-4 py-3 text-sm focus:outline-none"
                    style={INPUT_STYLE} />
                )}

                {/* Divulgación progresiva: booking */}
                {active && opt.mode === 'booking' && (
                  <div className="mt-2.5 space-y-2">
                    {bookings.length === 0 ? (
                      <p className="text-xs px-1" style={{ color: 'var(--text-muted)' }}>
                        No tienes reservas activas para vincular.
                      </p>
                    ) : bookings.map(b => {
                      const sel = bookingId === b.id
                      return (
                        <button key={b.id} type="button" onClick={() => setBookingId(b.id)}
                          className="w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all"
                          style={{ background: 'var(--bg-card)', border: `1.5px solid ${sel ? 'var(--brand)' : 'var(--border-subtle)'}` }}>
                          <div className="w-14 h-12 rounded-lg overflow-hidden shrink-0" style={{ background: 'var(--bg-elevated)' }}>
                            {b.cover
                              // eslint-disable-next-line @next/next/no-img-element
                              ? <img src={b.cover} alt={b.spaceName} className="w-full h-full object-cover" />
                              : <div className="w-full h-full flex items-center justify-center" style={{ color: 'var(--text-muted)' }}><Building2 size={18} /></div>}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{b.spaceName}</div>
                            <div className="flex items-center gap-2 text-xs mt-0.5 flex-wrap" style={{ color: 'var(--text-muted)' }}>
                              {b.eventDate && <span className="flex items-center gap-1"><CalendarDays size={10} />{formatDate(new Date(b.eventDate + 'T12:00'))}</span>}
                              {b.startTime && b.endTime && <span className="flex items-center gap-1"><Clock size={10} />{formatTime(b.startTime)}–{formatTime(b.endTime)}</span>}
                            </div>
                          </div>
                          {sel && <Check size={16} style={{ color: 'var(--brand)' }} className="shrink-0" />}
                        </button>
                      )
                    })}
                  </div>
                )}

                {/* Divulgación progresiva: space */}
                {active && opt.mode === 'space' && (
                  <div className="mt-2.5 space-y-2.5">
                    {selectedSpace ? (
                      <div className="flex items-center gap-3 p-3 rounded-xl"
                        style={{ background: 'var(--bg-card)', border: '1.5px solid var(--brand)' }}>
                        <div className="w-14 h-12 rounded-lg overflow-hidden shrink-0" style={{ background: 'var(--bg-elevated)' }}>
                          {selectedSpace.cover
                            // eslint-disable-next-line @next/next/no-img-element
                            ? <img src={selectedSpace.cover} alt={selectedSpace.name} className="w-full h-full object-cover" />
                            : <div className="w-full h-full flex items-center justify-center" style={{ color: 'var(--text-muted)' }}><Building2 size={18} /></div>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{selectedSpace.name}</div>
                          <div className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                            {[selectedSpace.address, selectedSpace.sector, selectedSpace.city].filter(Boolean).join(', ')}
                          </div>
                        </div>
                        <button type="button" onClick={() => setSelectedSpace(null)}
                          className="text-xs font-semibold px-2.5 py-1.5 rounded-lg shrink-0"
                          style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>
                          Cambiar
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2 rounded-xl px-3 py-2.5"
                          style={{ background: 'var(--bg-surface)', border: '1.5px solid var(--border-medium)' }}>
                          <Search size={15} style={{ color: 'var(--text-muted)' }} className="shrink-0" />
                          <input value={spaceQuery}
                            onChange={e => setSpaceQuery(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); runSearch() } }}
                            placeholder="Buscar espacio por nombre..."
                            className="bg-transparent text-sm focus:outline-none flex-1"
                            style={{ color: 'var(--text-primary)', fontSize: 16 }} />
                          <button type="button" onClick={runSearch}
                            className="text-xs font-bold px-3 py-1.5 rounded-lg shrink-0"
                            style={{ background: 'var(--brand)', color: '#fff' }}>
                            {searching ? <Loader2 size={13} className="animate-spin" /> : 'Buscar'}
                          </button>
                        </div>
                        {spaceResults.length > 0 && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {spaceResults.map(s => (
                              <button key={s.id} type="button" onClick={() => setSelectedSpace(s)}
                                className="flex items-center gap-2.5 p-2.5 rounded-xl text-left"
                                style={{ background: 'var(--bg-card)', border: '1.5px solid var(--border-subtle)' }}>
                                <div className="w-12 h-11 rounded-lg overflow-hidden shrink-0" style={{ background: 'var(--bg-elevated)' }}>
                                  {s.cover
                                    // eslint-disable-next-line @next/next/no-img-element
                                    ? <img src={s.cover} alt={s.name} className="w-full h-full object-cover" />
                                    : <div className="w-full h-full flex items-center justify-center" style={{ color: 'var(--text-muted)' }}><Building2 size={16} /></div>}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{s.name}</div>
                                  <div className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                                    {[s.sector, s.city].filter(Boolean).join(', ') || 'Santo Domingo'}
                                  </div>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                        {!searching && spaceResults.length === 0 && spaceQuery.trim() && (
                          <p className="text-xs px-1" style={{ color: 'var(--text-muted)' }}>
                            Sin resultados. Prueba con otro nombre.
                          </p>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            )
          })}

          {/* Resumen de reserva elegida */}
          {locationMode === 'booking' && selectedBooking && (
            <div className="rounded-xl p-3 flex items-center gap-2 text-xs"
              style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>
              <ExternalLink size={12} style={{ color: 'var(--brand)' }} />
              Se usará la dirección de <strong className="font-semibold">{selectedBooking.spaceName}</strong>
              {selectedBooking.address ? ` (${selectedBooking.address})` : ''}.
            </div>
          )}

          {error && (
            <p className="text-xs font-semibold px-1" style={{ color: 'var(--danger)' }}>{error}</p>
          )}

          <button type="button" disabled={!canSubmit || submitting} onClick={handleSubmit}
            className="w-full py-3.5 rounded-2xl text-sm font-bold disabled:opacity-40 flex items-center justify-center gap-2"
            style={{ background: 'var(--brand)', color: '#fff' }}>
            {submitting ? <><Loader2 size={16} className="animate-spin" /> Creando...</> : 'Crear actividad'}
          </button>
        </div>
      )}
    </div>
  )
}
