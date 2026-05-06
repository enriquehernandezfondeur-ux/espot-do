'use client'

import { useState, useEffect, useMemo } from 'react'
import { ChevronLeft, ChevronRight, Building2, Lock, Loader2, Plus, X, Clock, Users, CheckCircle, Calendar, Link2, Link2Off } from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'
import { getHostCalendarBookings, getHostSpaces, getSpaceAvailability, createAvailabilityBlock, deleteAvailabilityBlock, getOrCreateIcalToken, getGoogleCalendarStatus, disconnectGoogleCalendar } from '@/lib/actions/host'

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://espothub.com'

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

  // Sync de calendarios
  const [icalToken,      setIcalToken]      = useState<string | null>(null)
  const [icalCopied,     setIcalCopied]     = useState(false)
  const [gcalConnected,  setGcalConnected]  = useState(false)
  const [gcalDisconnecting, setGcalDisconnecting] = useState(false)
  const [syncOpen,       setSyncOpen]       = useState(false)

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

  useEffect(() => {
    async function load() {
      // Cargamos calendario y sync por separado para que un fallo en sync
      // no deje la página en loading infinito
      const [bk, spaces] = await Promise.all([
        getHostCalendarBookings(),
        getHostSpaces(),
      ])
      setBookings(bk)
      setSpaceList(spaces)

      // Sync de calendarios — opcional, falla silenciosamente si la
      // migración 014/015 aún no se corrió en Supabase
      getOrCreateIcalToken().then(t => setIcalToken(t)).catch(() => {})
      getGoogleCalendarStatus().then(g => setGcalConnected(g.connected)).catch(() => {})

      if (spaces.length) {
        const sid = spaces[0].id
        setSpaceId(sid)
        setSpaceName(spaces[0].name)
        const avail = await getSpaceAvailability(sid)
        const grouped: Record<string, BlockedSlot[]> = {}
        avail.forEach((a: any) => {
          if (!grouped[a.blocked_date]) grouped[a.blocked_date] = []
          grouped[a.blocked_date].push(a)
        })
        setBlockedSlots(grouped)
      }
      setLoading(false)
    }
    load()
  }, [])

  function prevMonth() { setCurrent(c => c.month === 0 ? { year: c.year-1, month: 11 } : {...c, month: c.month-1}) }
  function nextMonth() { setCurrent(c => c.month === 11 ? { year: c.year+1, month: 0 } : {...c, month: c.month+1}) }

  function copyIcal() {
    if (!icalToken) return
    navigator.clipboard.writeText(`${BASE_URL}/api/cal/${icalToken}`)
    setIcalCopied(true)
    setTimeout(() => setIcalCopied(false), 2000)
  }

  async function handleDisconnectGcal() {
    setGcalDisconnecting(true)
    await disconnectGoogleCalendar()
    setGcalConnected(false)
    setGcalDisconnecting(false)
  }

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
    if (!selected || !spaceId) return
    if (!blockStart || !blockEnd) { setBlockError('Selecciona hora de inicio y fin'); return }
    setBlockSaving(true)
    setBlockError('')

    const result = await createAvailabilityBlock({
      spaceId:     spaceId,
      blockedDate: selected,
      startTime:   blockStart,
      endTime:     blockEnd,
      blockType:   'time_range',
      reason:      blockReason || undefined,
    })

    if ('error' in result) {
      setBlockError(result.error ?? 'Error al bloquear')
      setBlockSaving(false)
      return
    }

    if (result.data) {
      setBlockedSlots(prev => ({
        ...prev,
        [selected]: [...(prev[selected] ?? []), result.data as BlockedSlot],
      }))
      setBlocking(false)
      setBlockReason('')
      setBlockStart('20:00')
      setBlockEnd('23:00')
    }
    setBlockSaving(false)
  }

  async function handleRemoveBlock(dateStr: string, blockId: string) {
    await deleteAvailabilityBlock(blockId)
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
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-5 md:mb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-bold" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Calendario</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Gestiona la disponibilidad de tu espacio
          </p>
        </div>

        {/* Sync de calendarios */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Google Calendar */}
          {gcalConnected ? (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium"
              style={{ background: 'rgba(22,163,74,0.08)', color: '#16A34A', border: '1px solid rgba(22,163,74,0.2)' }}>
              <CheckCircle size={13} />
              Google Calendar
              <button
                onClick={handleDisconnectGcal}
                disabled={gcalDisconnecting}
                title="Desconectar"
                className="ml-1 opacity-50 hover:opacity-100 transition-opacity"
                style={{ color: '#16A34A' }}>
                <Link2Off size={11} />
              </button>
            </div>
          ) : (
            <a href="/api/auth/google-calendar"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all"
              style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}>
              <Link2 size={13} />
              Google Calendar
            </a>
          )}

          {/* iCal */}
          <button
            onClick={copyIcal}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all"
            style={icalCopied
              ? { background: 'rgba(22,163,74,0.08)', color: '#16A34A', border: '1px solid rgba(22,163,74,0.2)' }
              : { background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }
            }>
            {icalCopied ? <><CheckCircle size={13} /> Copiado</> : <><Calendar size={13} /> Copiar iCal</>}
          </button>
        </div>
      </div>

      {/* ── Selector de espacio ── */}
      <div className="relative mb-6 rounded-2xl overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #03313C 0%, #0A4A3A 100%)',
          boxShadow: '0 4px 16px rgba(3,49,60,0.18)',
        }}>

        <div className="flex items-center gap-4 px-5 py-4">
          {/* Ícono */}
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'rgba(53,196,147,0.18)', border: '1px solid rgba(53,196,147,0.25)' }}>
            <Building2 size={18} style={{ color: '#35C493' }} />
          </div>

          {/* Nombre + label */}
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold uppercase tracking-widest mb-0.5"
              style={{ color: 'rgba(255,255,255,0.45)' }}>
              Espacio activo
            </div>
            <div className="font-bold text-base truncate" style={{ color: '#fff', letterSpacing: '-0.01em' }}>
              {spaceName || 'Sin espacio'}
            </div>
          </div>

          {/* Cambiar */}
          {spaceList.length > 1 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl shrink-0 text-xs font-semibold"
              style={{ background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.12)' }}>
              Cambiar <ChevronRight size={12} />
            </div>
          )}
        </div>

        {/* Select nativo invisible encima — activa el dropdown del SO */}
        {spaceList.length > 1 && (
          <select
            value={spaceId ?? ''}
            onChange={async e => {
              const sid  = e.target.value
              const name = spaceList.find(s => s.id === sid)?.name ?? ''
              setSpaceId(sid)
              setSpaceName(name)
              setSelected(null)
              const avail = await getSpaceAvailability(sid)
              const grouped: Record<string, any[]> = {}
              avail.forEach((a: any) => {
                if (!grouped[a.blocked_date]) grouped[a.blocked_date] = []
                grouped[a.blocked_date].push(a)
              })
              setBlockedSlots(grouped)
            }}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer">
            {spaceList.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        )}
      </div>

      <div className="flex flex-col lg:flex-row gap-5 lg:gap-6">
        {/* ── CALENDARIO MENSUAL ─────────────────────────── */}
        <div className="flex-1 min-w-0">
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
        <div className="w-full lg:w-80 lg:shrink-0">
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
                <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                      Bloquear horario
                    </span>
                    <button onClick={() => { setBlocking(false); setBlockError('') }}
                      style={{ color: 'var(--text-muted)' }}>
                      <X size={15} />
                    </button>
                  </div>

                  {/* Selector de horas con selects limpios */}
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                        Desde
                      </label>
                      <select
                        value={blockStart}
                        onChange={e => setBlockStart(e.target.value)}
                        className="input-base w-full rounded-xl px-3 py-2.5 text-sm font-medium"
                        style={{ color: 'var(--text-primary)' }}>
                        {HOURS.map(h => (
                          <option key={h} value={h}>{toLabel(h)}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                        Hasta
                      </label>
                      <select
                        value={blockEnd}
                        onChange={e => setBlockEnd(e.target.value)}
                        className="input-base w-full rounded-xl px-3 py-2.5 text-sm font-medium"
                        style={{ color: 'var(--text-primary)' }}>
                        {HOURS.map(h => (
                          <option key={h} value={h}>{toLabel(h)}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <input
                    value={blockReason}
                    onChange={e => setBlockReason(e.target.value)}
                    placeholder="Motivo (opcional, ej: mantenimiento)"
                    className="input-base w-full rounded-xl px-3 py-2.5 text-sm mb-3"
                  />

                  {blockError && (
                    <div className="text-xs px-3 py-2 rounded-lg mb-3"
                      style={{ background: 'rgba(239,68,68,0.06)', color: '#DC2626', border: '1px solid rgba(239,68,68,0.15)' }}>
                      {blockError}
                    </div>
                  )}

                  {/* Resumen visual */}
                  {blockStart && blockEnd && selected && (
                    <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl mb-3 text-xs"
                      style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
                      <Clock size={12} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                      <span>
                        {new Date(selected + 'T12:00').toLocaleDateString('es-DO', { day: 'numeric', month: 'short' })}
                        {' · '}
                        <strong style={{ color: 'var(--text-primary)' }}>{toLabel(blockStart)}</strong>
                        {' — '}
                        <strong style={{ color: 'var(--text-primary)' }}>{toLabel(blockEnd)}</strong>
                      </span>
                    </div>
                  )}

                  <button
                    onClick={handleBlockTime}
                    disabled={blockSaving}
                    className="w-full text-sm font-semibold py-2.5 rounded-xl transition-colors disabled:opacity-50"
                    style={{ background: '#DC2626', color: '#fff' }}>
                    {blockSaving ? 'Guardando...' : 'Bloquear horario'}
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
