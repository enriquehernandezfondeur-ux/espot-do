import { validateCreateActivity, validateRsvp } from '@/lib/activities/validate'

describe('validateCreateActivity', () => {
  const base = { type: 'podcast', title: 'Mi pod', location_mode: 'external', external_location: 'Calle 1' }
  it('accepts a valid payload', () => {
    expect(validateCreateActivity(base as any).ok).toBe(true)
  })
  it('rejects empty title', () => {
    const r = validateCreateActivity({ ...base, title: '  ' } as any)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toMatch(/nombre/i)
  })
  it('requires a location for the chosen mode', () => {
    const r = validateCreateActivity({ ...base, external_location: '' } as any)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toMatch(/ubicaci|direcci/i)
  })
  it('requires booking_id when mode=booking', () => {
    const r = validateCreateActivity({ type: 'podcast', title: 'x', location_mode: 'booking' } as any)
    expect(r.ok).toBe(false)
  })
})

describe('validateRsvp', () => {
  it('rejects empty name', () => {
    expect(validateRsvp({ name: '', companions: 0 }).ok).toBe(false)
  })
  it('caps companions at 20', () => {
    const r = validateRsvp({ name: 'Ana', companions: 99 })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toMatch(/acompa/i)
  })
  it('accepts a valid rsvp', () => {
    expect(validateRsvp({ name: 'Ana', companions: 2 }).ok).toBe(true)
  })
})
