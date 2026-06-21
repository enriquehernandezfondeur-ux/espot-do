'use client'

import { useState } from 'react'
import Image from 'next/image'
import { CalendarDays, Clock, MapPin, CheckCircle2 } from 'lucide-react'
import { submitRsvp, getPublicActivity } from '@/lib/actions/activity-public'

// TODO fase 2: instrumentar vistas/clics (no hay infraestructura de eventos todavía)

type PublicData = NonNullable<Awaited<ReturnType<typeof getPublicActivity>>>

const ACQUISITION_URL = 'https://espot.do?ref=actividad'

function formatDate(d: string): string {
  // Regla del repo: parsear con T12:00 para evitar el corrimiento de zona (UTC-4 RD).
  const date = new Date(d + 'T12:00')
  return date.toLocaleDateString('es-DO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

function formatTime(t: string): string {
  // 'HH:MM' o 'HH:MM:SS' → '7:30 PM'
  const [hRaw, m] = t.split(':')
  const h = Number(hRaw)
  const period = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${h12}:${m} ${period}`
}

export function RsvpClient({ code, data }: { code: string; data: PublicData }) {
  const { activity, questions, space } = data

  const [name, setName] = useState('')
  const [contact, setContact] = useState('')
  const [companions, setCompanions] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  const inputBase: React.CSSProperties = {
    fontSize: 16,
    width: '100%',
    padding: '12px 14px',
    borderRadius: 12,
    background: 'var(--bg-surface)',
    border: '1px solid var(--border-medium)',
    color: 'var(--text-primary)',
    outline: 'none',
  }

  const setAnswer = (id: string, value: string) => setAnswers((prev) => ({ ...prev, [id]: value }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    const res = await submitRsvp({
      code,
      name,
      contact: contact || undefined,
      companions: activity.allow_companions ? companions : undefined,
      answers: Object.keys(answers).length ? answers : undefined,
    })
    setSubmitting(false)
    if (!res.ok) {
      setError(res.error) // se conserva todo lo escrito
      return
    }
    setDone(true)
  }

  const dateLine = activity.event_date ? formatDate(activity.event_date) : null
  const timeLine = activity.start_time
    ? activity.end_time
      ? `${formatTime(activity.start_time)} – ${formatTime(activity.end_time)}`
      : formatTime(activity.start_time)
    : null

  const locationName = space ? space.name : null
  const locationAddress = space
    ? [space.address, space.city].filter(Boolean).join(', ') || null
    : activity.location_mode === 'external'
      ? activity.external_location
      : null

  return (
    <div className="light-theme min-h-dvh" style={{ background: 'var(--bg-base)', color: 'var(--text-primary)' }}>
      <div className="mx-auto w-full max-w-md px-4 pb-16 pt-6">
        <div
          className="overflow-hidden rounded-3xl"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-card)' }}
        >
          {/* Portada o placeholder de marca */}
          <div className="relative h-44" style={{ background: 'var(--bg-elevated)' }}>
            {activity.cover_image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={activity.cover_image} alt={activity.title} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <Image src="/logo-dark.svg" alt="Espot" width={120} height={42} priority />
              </div>
            )}
          </div>

          <div className="space-y-5 p-5">
            {/* Encabezado */}
            <div className="space-y-3">
              <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                {activity.title}
              </h1>
              {activity.description && (
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{activity.description}</p>
              )}

              <div className="space-y-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                {dateLine && (
                  <div className="flex items-center gap-2">
                    <CalendarDays size={16} style={{ color: 'var(--brand)' }} />
                    <span className="capitalize">{dateLine}</span>
                  </div>
                )}
                {timeLine && (
                  <div className="flex items-center gap-2">
                    <Clock size={16} style={{ color: 'var(--brand)' }} />
                    <span>{timeLine}</span>
                  </div>
                )}
                {(locationName || locationAddress) && (
                  <div className="flex items-start gap-2">
                    <MapPin size={16} style={{ color: 'var(--brand)', marginTop: 2 }} />
                    <span>
                      {locationName && <span className="block font-medium" style={{ color: 'var(--text-primary)' }}>{locationName}</span>}
                      {locationAddress && <span className="block">{locationAddress}</span>}
                      {/* TODO fase 2: mapa de la ubicación (SpacesMap es complejo; por ahora solo dirección en texto) */}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--border-subtle)' }} />

            {done ? (
              /* Estado de confirmación cálido y final — reemplaza el formulario */
              <div className="flex flex-col items-center gap-3 py-6 text-center">
                <div
                  className="flex h-14 w-14 items-center justify-center rounded-full"
                  style={{ background: 'var(--brand-dim)' }}
                >
                  <CheckCircle2 size={30} style={{ color: 'var(--brand)' }} />
                </div>
                <div className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>¡Confirmado!</div>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Te esperamos.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-3">
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                      Tu nombre <span style={{ color: 'var(--brand)' }}>*</span>
                    </span>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Nombre y apellido"
                      style={inputBase}
                      required
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                      Teléfono o correo (opcional)
                    </span>
                    <input
                      type="text"
                      value={contact}
                      onChange={(e) => setContact(e.target.value)}
                      placeholder="Para avisarte de cambios"
                      style={inputBase}
                    />
                  </label>

                  {activity.allow_companions && (
                    <label className="block">
                      <span className="mb-1.5 block text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                        ¿Cuántos acompañantes?
                      </span>
                      <select
                        value={companions}
                        onChange={(e) => setCompanions(Number(e.target.value))}
                        style={inputBase}
                      >
                        {Array.from({ length: 21 }, (_, i) => (
                          <option key={i} value={i}>{i}</option>
                        ))}
                      </select>
                    </label>
                  )}

                  {questions.map((q) => (
                    <label key={q.id} className="block">
                      {q.field_type !== 'boolean' && (
                        <span className="mb-1.5 block text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                          {q.label}
                          {q.required && <span style={{ color: 'var(--brand)' }}> *</span>}
                        </span>
                      )}

                      {q.field_type === 'text' && (
                        <input
                          type="text"
                          value={answers[q.id] ?? ''}
                          onChange={(e) => setAnswer(q.id, e.target.value)}
                          style={inputBase}
                          required={q.required}
                        />
                      )}

                      {q.field_type === 'number' && (
                        <input
                          type="number"
                          inputMode="numeric"
                          value={answers[q.id] ?? ''}
                          onChange={(e) => setAnswer(q.id, e.target.value)}
                          style={inputBase}
                          required={q.required}
                        />
                      )}

                      {q.field_type === 'choice' && (
                        <select
                          value={answers[q.id] ?? ''}
                          onChange={(e) => setAnswer(q.id, e.target.value)}
                          style={inputBase}
                          required={q.required}
                        >
                          <option value="" disabled>Selecciona…</option>
                          {((q.options as string[] | null) ?? []).map((opt) => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      )}

                      {q.field_type === 'boolean' && (
                        <span className="flex items-center gap-2.5">
                          <input
                            type="checkbox"
                            checked={answers[q.id] === 'true'}
                            onChange={(e) => setAnswer(q.id, e.target.checked ? 'true' : 'false')}
                            style={{ width: 18, height: 18, accentColor: 'var(--brand)' }}
                          />
                          <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{q.label}</span>
                        </span>
                      )}
                    </label>
                  ))}
                </div>

                {error && (
                  <div
                    className="rounded-xl px-3.5 py-2.5 text-sm"
                    style={{ background: 'rgba(220, 38, 38, 0.08)', color: '#B91C1C', border: '1px solid rgba(220, 38, 38, 0.20)' }}
                  >
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full rounded-2xl px-5 py-3 text-sm font-semibold"
                  style={{ background: 'var(--brand)', color: '#fff', opacity: submitting ? 0.7 : 1 }}
                >
                  {submitting ? 'Confirmando…' : 'Confirmar asistencia'}
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Pie de adquisición — discreto */}
        <div className="pt-5 text-center">
          <a
            href={ACQUISITION_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-medium"
            style={{ color: 'var(--text-muted)' }}
          >
            Organizado con Espot
          </a>
        </div>
      </div>
    </div>
  )
}
