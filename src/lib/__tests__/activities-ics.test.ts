import { buildIcs, addMinutes, icsDataUri } from '@/lib/activities/ics'

describe('buildIcs', () => {
  it('returns null without a date', () => {
    expect(buildIcs({ uid: 'x', title: 'Sin fecha' })).toBeNull()
  })
  it('builds a VCALENDAR with DTSTART/DTEND/SUMMARY', () => {
    const ics = buildIcs({ uid: 'abc', title: 'Mi evento', event_date: '2026-07-12', start_time: '15:00', end_time: '18:00' })!
    expect(ics).toContain('BEGIN:VCALENDAR')
    expect(ics).toContain('UID:abc')
    expect(ics).toContain('DTSTART:20260712T150000')
    expect(ics).toContain('DTEND:20260712T180000')
    expect(ics).toContain('SUMMARY:Mi evento')
    expect(ics).toContain('END:VCALENDAR')
  })
  it('defaults end to start + 2h when no end_time', () => {
    const ics = buildIcs({ uid: 'a', title: 'x', event_date: '2026-07-12', start_time: '15:00' })!
    expect(ics).toContain('DTEND:20260712T170000')
  })
  it('escapes commas in summary/location', () => {
    const ics = buildIcs({ uid: 'a', title: 'Cena, casual', event_date: '2026-07-12', location: 'Calle 1, Piantini' })!
    expect(ics).toContain('SUMMARY:Cena\\, casual')
    expect(ics).toContain('LOCATION:Calle 1\\, Piantini')
  })
})

describe('addMinutes', () => {
  it('adds minutes within the same day', () => {
    expect(addMinutes('15:00', 120)).toBe('17:00')
    expect(addMinutes('23:30', 120)).toBe('23:59') // no cruza de día
  })
})

describe('icsDataUri', () => {
  it('produces a calendar data uri', () => {
    expect(icsDataUri('BEGIN:VCALENDAR')).toMatch(/^data:text\/calendar/)
  })
})
