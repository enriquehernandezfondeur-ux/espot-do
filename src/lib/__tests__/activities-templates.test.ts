import { ACTIVITY_TEMPLATES, getTemplate, ACTIVITY_TYPE_ORDER } from '@/lib/activities/templates'

describe('activity templates', () => {
  it('has a template for every type in the picker order', () => {
    for (const t of ACTIVITY_TYPE_ORDER) {
      expect(getTemplate(t)).toBeDefined()
      expect(getTemplate(t)!.label.length).toBeGreaterThan(0)
    }
  })
  it('every template question has a non-empty label and valid field_type', () => {
    for (const tpl of Object.values(ACTIVITY_TEMPLATES)) {
      for (const q of tpl.questions) {
        expect(q.label.length).toBeGreaterThan(0)
        expect(['text', 'choice', 'boolean', 'number']).toContain(q.field_type)
        if (q.field_type === 'choice') expect(Array.isArray(q.options)).toBe(true)
      }
    }
  })
  it('getTemplate falls back to "otro" for unknown type', () => {
    // @ts-expect-error intentional bad input
    expect(getTemplate('inexistente').type).toBe('otro')
  })
})
