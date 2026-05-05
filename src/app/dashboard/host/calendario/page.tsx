'use client'

import { useState, useEffect, useMemo } from 'react'
import { ChevronLeft, ChevronRight, Lock, Loader2, Plus, X, Clock, Users, CheckCircle } from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'
import { getHostCalendarBookings } from '@/lib/actions/host'
import { createClient } from '@/lib/supabase/client'

const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const DAYS   = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb']

// Horas disponibles: 6am → 3am (siguiente día)
const HOURS = [
  '06:00','07:00','08:00','09:00','10:00','11:00',
  '12:00','13:00','14:00','15:00','16:00','17:00',
  '18:00','19:00','20:00','21:00','22:00','23:00',
  '00:00','01:00','02:00','03:00',
]

function toLabel(h: string) {
  const [hh] = h.split(':')
  const n = parseInt(hh)
  const ampm = n >= 12 ? 'PM' : 'AM'
  const h12 = n % 12 || 12
  return `${h12}:00 ${ampm}`
}

function hourToNum(h: string) {
  const n = parseInt(h.split(':')[0])
  return n < 6 ? n + 24 : n // treat 00-05 as 24-29 for sorting
}

function isHourInRange(hour: string, start: string, end: string): boolean {
  const h = hourToNum(hour)
  const s = hourToNum(start)
  const e = hourToNum(end)
  if (s <= e) return h >= s && h < e
  return h >= s || h < e
}

type CalBooking = Awaited<ReturnType<typeof getHostCalendarBookings>>[0]

interface BlockedSlot {
  id: string
  start_time: string | null
  end_time: string | null
  block_type: string
  reason: string | null
}

export default function CalendarioPage() {
  const today = new Date()
  const [current, setCurrent] = useState({ year: today.getFullYear(), month: today.getMonth() })
  const [bookings, setBookings] = useState<CalBooking[]>([])
  const [blockedSlots, setBlockedSlots] = useState<Record<string, BlockedSlot[]>>({})
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<string | null>(null)

  // Block form state
  const [blocking, setBlocking] = useState(false)
  const [blockStart, setBlockStart] = useState('20:00')
  const [blockEnd, setBlockEnd] = useState('23:00')
  const [blockReason, setBlockReason] = useState('')
  const [blockSaving, setBlockSaving] = useState(false)
  const [blockError, setBlockError] = useState('')
  const [spaceId, setSpaceId]   = useState<string | null>(null)
  const [spaceList, setSpaceList] = useState<{ id: string; name: string }[]>([])
  const [spaceName, setSpaceName] = useState<string>('')

  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const [bk, spaces] = await Promise.all([
        getHostCalendarBookings(),
        supabase.from('spaces').select('id, name').eq('is_active', true).order('created_at'),
      ])
      setBookings(bk)
      setSpaceList(spaces.data ?? [])

      if (spaces.data?.length) {
        const sid = spaces.data[0].id
        setSpaceId(sid)
        setSpaceName(spaces.data[0].name)
        const { data: avail } = await supabase
          .from('space_availability')
          .select('*')
          .eq('space_id', sid)
        if (avail) {
          const grouped: Record<string, BlockedSlot[]> = {}
          avail.forEach((a: any) => {
            if (!grouped[a.blocked_date]) grouped[a.blocked_date] = []
            grouped[a.blocked_date].push(a)
          })
          setBlockedSlots(grouped)
        }
      }
      setLoading(false)
    }
    load()
  }, [])

  function prevMonth() { setCurrent(c => c.month === 0 ? { year: c.year-1, month: 11 } : {...c, month: c.month-1}) }
  function nextMonth() { setCurrent(c => c.month === 11 ? { year: c.year+1, month: 0 } : {...c, month: c.month+1}) }

  const firstDay    = new Date(current.year, current.month, 1).getDay()
  const daysInMonth = new Date(current.year, current.month+1, 0).getDate()

  function dateKey(day: number) {
    return `${current.year}-${String(current.month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`
  }

  const bookingsByDate = useMemo(() =>
    bookings.reduce<Record<string, CalBooking[]>>((acc, b) => {
      if (!acc[b.event_date]) acc[b.event_date] = []
      acc[b.event_date].push(b)
      return acc
    }, {}),
  [bookings])

  const selectedBookings = selected ? (bookingsByDate[selected] ?? []) : []
  const selectedBlocks   = selected ? (blockedSlots[selected] ?? []) : []

  const monthRevenue = bookings
    .filter(b => b.event_date.startsWith(`${current.year}-${String(current.month+1).padStart(2,'0')}`) && b.status === 'confirmed')
    .reduce((s, b) => s + Number(b.total_amount), 0)

  const monthEvents = bookings.filter(b =>
    b.event_date.startsWith(`${current.year}-${String(current.month+1).padStart(2,'0')}`)
  ).length

  async function handleBlockTime() {
    if (!selected) return
    if (!blockStart || !blockEnd) { setBlockError('Selecciona hora de inicio y fin'); return }
    setBlockSaving(true)
    setBlockError('')

    const sid = spaceId ?? (await supabase.from('spaces').select('id').limit(1)).data?.[0]?.id
    if (!sid) { setBlockError('No se encontró tu espacio'); setBlockSaving(false); return }

    const { data, error } = await supabase
      .from('space_availability')
      .insert({
        space_id: sid,
        blocked_date: selected,
        start_time: blockStart,
        end_time: blockEnd,
        block_type: 'time_range',
        reason: blockReason || null,
      })
      .select()
      .single()

    if (error) {
      // Si falla por columnas faltantes, sugerir correr la migración
      if (error.message.includes('column') || error.message.includes('schema')) {
        setBlockError('Debes correr la migración SQL 006 en Supabase primero.')
      } else {
        setBlockError(error.message)
      }
      setBlockSaving(false)
      return
    }

    if (data) {
      setBlockedSlots(prev => ({
        ...prev,
        [selected]: [...(prev[selected] ?? []), data as BlockedSlot],
      }))
      setBlocking(false)
      setBlockReason('')
      setBlockStart('20:00')
      setBlockEnd('23:00')
    }
    setBlockSaving(false)
  }

  async function handleRemoveBlock(dateStr: string, blockId: string) {
    await supabase.from('space_availability').delete().eq('id', blockId)
    setBlockedSlots(prev => ({
      ...prev,
      [dateStr]: (prev[dateStr] ?? []).filter(b => b.id !== blockId),
    }))
  }

  function getHourStatus(hour: string, date: string) {
    // Check bookings
    const dayBookings = bookingsByDate[date] ?? []
    for (const b of dayBookings) {
      if (isHourInRange(hour, b.start_time, b.end_time)) {
        return { type: 'booked' as const, booking: b }
      }
    }
    // Check manual blocks
    const dayBlocks = blockedSlots[date] ?? []
    for (const bl of dayBlocks) {
      const isFullDay = !bl.start_time || !bl.end_time || bl.block_type === 'full_day'
      if (isFullDay) return { type: 'blocked' as const, block: bl }
      if (isHourInRange(hour, bl.start_time!, bl.end_time!)) {
        return { type: 'blocked' as const, block: bl }
      }
    }
    return { type: 'available' as const }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ background: 'var(--bg-base)' }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--brand)' }} />
      </div>
    )
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Calendario</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          Gestiona la disponibilidad de tu espacio por día y por horas
        </p>
      </div>

      {/* ── Contexto del espacio ── */}
      <div className="flex items-center gap-3 mb-6 px-4 py-3 rounded-2xl"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
        <div className="w-2 h-2 rounded-full shrink-0" style={{ background: 'var(--brand)' }} />
        <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
          Espacio activo:
        </span>
        {spaceList.length > 1 ? (
          <select
            value={spaceId ?? ''}
            onChange={async e => {
              const sid  = e.target.value
              const name = spaceList.find(s => s.id === sid)?.name ?? ''
              setSpaceId(sid)
              setSpaceName(name)
              setSelected(null)
              // Recargar disponibilidad del espacio seleccionado
              const { data: avail } = await supabase
                .from('space_availability').select('*').eq('space_id', sid)
              if (avail) {
                const grouped: Record<string, any[]> = {}
                avail.forEach((a: any) => {
                  if (!grouped[a.blocked_date]) grouped[a.blocked_date] = []
                  grouped[a.blocked_date].push(a)
                })
                setBlockedSlots(grouped)
              }
            }}
            className="text-sm font-semibold bg-transparent focus:outline-none flex-1"
            style={{ color: 'var(--text-primary)' }}>
            {spaceList.map(s => (
              <option key={s.id} value={s.id} style={{ background: 'var(--bg-base)' }}>{s.name}</option>
            ))}
          </select>
        ) : (
          <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            {spaceName || 'Cargando...'}
          </span>
        )}
      </div>

      <div className="flex gap-6">
        {/* ── CALENDARIO MENSUAL ─────────────────────────── */}
        <div className="flex-1">
          {/* Nav */}
          <div className="flex items-center justify-between mb-5">
            <button onClick={prevMonth}
              className="p-2 rounded-xl transition-colors"
              style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>
              <ChevronLeft size={20} />
            </button>
            <div className="text-center">
              <div className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{MONTHS[current.month]}</div>
              <div className="text-sm" style={{ color: 'var(--text-muted)' }}>{current.year}</div>
            </div>
            <button onClick={nextMonth}
              className="p-2 rounded-xl transition-colors"
              style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>
              <ChevronRight size={20} />
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3 mb-5">
            <div className="rounded-xl p-3 text-center" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
              <div className="text-lg font-bold" style={{ color: 'var(--brand)' }}>{formatCurrency(monthRevenue)}</div>
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>ingresos confirmados</div>
            </div>
            <div className="rounded-xl p-3 text-center" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
              <div className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{monthEvents}</div>
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>eventos este mes</div>
            </div>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 mb-1">
            {DAYS.map(d => (
              <div key={d} className="text-center text-xs py-2 font-semibold" style={{ color: 'var(--text-muted)' }}>{d}</div>
            ))}
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7 gap-1">
            {Array(firstDay).fill(null).map((_,i) => <div key={`e-${i}`} />)}
            {Array(daysInMonth).fill(null).map((_,i) => {
              const day   = i + 1
              const dk    = dateKey(day)
              const dayBk = bookingsByDate[dk] ?? []
              const dayBl = blockedSlots[dk] ?? []
              const isToday  = dk === today.toISOString().split('T')[0]
              const isSel    = selected === dk
              const isPast   = new Date(dk) < new Date(today.toISOString().split('T')[0])
              const hasConfirmed = dayBk.some(b => b.status === 'confirmed')
              const hasPending   = dayBk.some(b => b.status === 'pending')
              const hasBlocked   = dayBl.length > 0

              return (
                <button
                  key={day}
                  onClick={() => { setSelected(isSel ? null : dk); setBlocking(false) }}
                  className={cn('relative flex flex-col items-center justify-center rounded-xl py-2 px-1 text-sm font-medium transition-all aspect-square')}
                  style={{
                    background: isToday ? 'var(--brand)' :
                                isSel  ? 'var(--brand-dim)' :
                                isPast ? 'transparent' : 'var(--bg-card)',
                    color: isToday ? '#fff' :
                           isSel  ? 'var(--brand)' :
                           isPast ? 'var(--text-muted)' : 'var(--text-primary)',
                    border: isSel ? '2px solid var(--brand)' : '1px solid var(--border-subtle)',
                    opacity: isPast && !isSel ? 0.5 : 1,
                  }}
                >
                  <span>{day}</span>
                  {/* Indicadores */}
                  <div className="flex gap-0.5 mt-0.5">
                    {hasConfirmed && <span className="w-1.5 h-1.5 rounded-full bg-green-400" />}
                    {hasPending   && <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />}
                    {hasBlocked   && <span className="w-1.5 h-1.5 rounded-full bg-red-400" />}
                  </div>
                </button>
              )
            })}
          </div>

          {/* Leyenda */}
          <div className="flex items-center gap-4 mt-5 text-xs" style={{ color: 'var(--text-muted)' }}>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-green-400" />Confirmada</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-400" />Pendiente</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-400" />Bloqueado</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ background: 'var(--brand)' }} />Hoy</span>
          </div>
        </div>

        {/* ── PANEL LATERAL ──────────────────────────────── */}
        <div className="w-80 shrink-0">
          {selected ? (
            <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>

              {/* Header del día */}
              <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {new Date(selected + 'T12:00').toLocaleDateString('es-DO', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      {selectedBookings.length > 0
                        ? `${selectedBookings.length} reserva${selectedBookings.length > 1 ? 's' : ''} · ${selectedBlocks.length} bloqueo${selectedBlocks.length !== 1 ? 's' : ''}`
                        : 'Sin reservas'}
                    </div>
                  </div>
                  {!blocking && (
                    <button
                      onClick={() => setBlocking(true)}
                      className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
                      style={{ background: 'var(--brand-dim)', color: 'var(--brand)', border: '1px solid var(--brand-border)' }}>
                      <Plus size={12} /> Bloquear
                    </button>
                  )}
                </div>
              </div>

              {/* Formulario de bloqueo */}
              {blocking && (
                <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--border-subtle)', background: 'rgba(239,68,68,0.04)' }}>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Bloquear horario</span>
                    <button onClick={() => setBlocking(false)} style={{ color: 'var(--text-muted)' }}><X size={16} /></button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <div>
                      <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Desde</label>
                      <input type="time" value={blockStart} onChange={e => setBlockStart(e.target.value)}
                        className="input-base w-full rounded-lg px-3 py-2 text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Hasta</label>
                      <input type="time" value={blockEnd} onChange={e => setBlockEnd(e.target.value)}
                        className="input-base w-full rounded-lg px-3 py-2 text-sm" />
                    </div>
                  </div>
                  <input
                    value={blockReason}
                    onChange={e => setBlockReason(e.target.value)}
                    placeholder="Razón (opcional)"
                    className="input-base w-full rounded-lg px-3 py-2 text-sm mb-3"
                  />
                  {blockError && (
                    <div className="text-xs px-3 py-2 rounded-lg mb-2"
                      style={{ background: 'rgba(239,68,68,0.1)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.2)' }}>
                      {blockError}
                    </div>
                  )}
                  {/* Resumen del bloqueo */}
                  {blockStart && blockEnd && selected && (
                    <div className="text-xs px-3 py-2 rounded-lg mb-2"
                      style={{ background: 'rgba(239,68,68,0.06)', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(239,68,68,0.15)' }}>
                      Bloquearás <strong style={{ color: 'rgba(255,255,255,0.8)' }}>
                        {new Date(selected + 'T12:00').toLocaleDateString('es-DO', { day: 'numeric', month: 'short' })}
                        {' de '}{blockStart}{' a '}{blockEnd}
                      </strong> en <strong style={{ color: 'rgba(255,255,255,0.8)' }}>{spaceName}</strong>
                    </div>
                  )}
                  <button
                    onClick={handleBlockTime}
                    disabled={blockSaving}
                    className="w-full text-sm font-semibold py-2 rounded-lg transition-colors"
                    style={{ background: '#EF4444', color: '#fff' }}>
                    {blockSaving ? 'Guardando...' : 'Confirmar bloqueo'}
                  </button>
                </div>
              )}

              {/* Timeline de horas */}
              <div className="overflow-y-auto" style={{ maxHeight: 480 }}>
                {HOURS.map(hour => {
                  const status = getHourStatus(hour, selected)
                  return (
                    <div key={hour} className="flex items-center gap-3 px-4 py-2.5"
                      style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      {/* Hora */}
                      <span className="text-xs font-medium w-16 shrink-0 tabular-nums"
                        style={{ color: 'var(--text-muted)' }}>
                        {toLabel(hour)}
                      </span>

                      {/* Estado */}
                      {status.type === 'available' && (
                        <div className="flex-1 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-green-400 shrink-0" />
                          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Disponible</span>
                        </div>
                      )}

                      {status.type === 'booked' && (
                        <div className="flex-1 flex items-center gap-2 rounded-lg px-2.5 py-1"
                          style={{ background: status.booking.status === 'confirmed' ? 'rgba(34,197,94,0.1)' : 'rgba(251,191,36,0.1)' }}>
                          <span className={cn('w-2 h-2 rounded-full shrink-0', status.booking.status === 'confirmed' ? 'bg-green-400' : 'bg-amber-400')} />
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                              {(status.booking as any).profiles?.full_name ?? 'Cliente'}
                            </div>
                            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                              {status.booking.event_type} · {status.booking.start_time.slice(0,5)}–{status.booking.end_time.slice(0,5)}
                            </div>
                          </div>
                        </div>
                      )}

                      {status.type === 'blocked' && (
                        <div className="flex-1 flex items-center justify-between gap-2 rounded-lg px-2.5 py-1"
                          style={{ background: 'rgba(239,68,68,0.08)' }}>
                          <div className="flex items-center gap-2 min-w-0">
                            <Lock size={11} className="shrink-0 text-red-400" />
                            <span className="text-xs truncate" style={{ color: '#EF4444' }}>
                              {status.block?.reason || 'Bloqueado'}
                            </span>
                          </div>
                          {status.block?.id && (
                            <button
                              onClick={() => handleRemoveBlock(selected, status.block!.id)}
                              className="shrink-0 text-red-300 hover:text-red-500 transition-colors">
                              <X size={12} />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            <div className="rounded-2xl p-6 text-center" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
              <Clock className="w-8 h-8 mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
              <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
                Selecciona un día
              </p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Verás las reservas y podrás bloquear horarios específicos
              </p>
            </div>
          )}

          {/* Próximos eventos */}
          <div className="mt-4 rounded-2xl p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
            <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Próximos eventos</h3>
            {bookings
              .filter(b => b.event_date >= today.toISOString().split('T')[0])
              .sort((a, b) => a.event_date.localeCompare(b.event_date))
              .slice(0, 5)
              .length === 0 ? (
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Sin eventos próximos</p>
            ) : (
              <div className="space-y-2">
                {bookings
                  .filter(b => b.event_date >= today.toISOString().split('T')[0])
                  .sort((a, b) => a.event_date.localeCompare(b.event_date))
                  .slice(0, 5)
                  .map((b: any) => (
                    <div key={b.id} className="flex items-center gap-3">
                      <div className={cn('w-1.5 h-8 rounded-full shrink-0', b.status === 'confirmed' ? 'bg-green-400' : 'bg-amber-400')} />
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                          {b.profiles?.full_name ?? 'Cliente'}
                        </div>
                        <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                          {new Date(b.event_date + 'T12:00').toLocaleDateString('es-DO', { day: 'numeric', month: 'short' })} · {b.start_time?.slice(0,5)}
                        </div>
                      </div>
                      <div className="text-xs font-semibold shrink-0" style={{ color: 'var(--brand)' }}>
                        {formatCurrency(Number(b.total_amount))}
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
