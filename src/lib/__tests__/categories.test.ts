import {
  SPACE_CATEGORIES, getCategory, getCategoryLabel, getCategoryIcon,
  getFeaturedCategories, FILTER_CATEGORIES,
} from '@/lib/categories'

describe('catálogo de categorías', () => {
  it('incluye wellness y popup', () => {
    const values = SPACE_CATEGORIES.map(c => c.value)
    expect(values).toContain('wellness')
    expect(values).toContain('popup')
  })

  it('conserva las categorías existentes', () => {
    const values = SPACE_CATEGORIES.map(c => c.value)
    for (const v of ['salon','restaurante','bar','rooftop','terraza','jardin','estudio','coworking','hotel','villa','lounge','otro']) {
      expect(values).toContain(v)
    }
  })

  it('no tiene valores duplicados', () => {
    const values = SPACE_CATEGORIES.map(c => c.value)
    expect(new Set(values).size).toBe(values.length)
  })
})

describe('getFeaturedCategories', () => {
  it('devuelve exactamente las 4 destacadas en orden', () => {
    const feat = getFeaturedCategories()
    expect(feat.map(c => c.value)).toEqual(['estudio','coworking','wellness','popup'])
  })
})

describe('getCategoryLabel', () => {
  it('singular y plural', () => {
    expect(getCategoryLabel('estudio')).toBe('Estudio')
    expect(getCategoryLabel('estudio', { plural: true })).toBe('Estudios')
  })
  it('fallback al valor crudo si no existe', () => {
    expect(getCategoryLabel('inexistente')).toBe('inexistente')
    expect(getCategoryLabel(null)).toBe('Espacio')
  })
})

describe('getCategoryIcon', () => {
  it('devuelve un icono para una categoría válida', () => {
    expect(getCategoryIcon('estudio')).toBe(getCategory('estudio')!.icon)
  })
  it('devuelve un icono de fallback para inválida', () => {
    expect(typeof getCategoryIcon('inexistente')).toBe('object')
  })
})

describe('FILTER_CATEGORIES', () => {
  it('empieza por Todos con un icono no nulo', () => {
    expect(FILTER_CATEGORIES[0].value).toBe('')
    expect(FILTER_CATEGORIES[0].label).toBe('Todos')
    expect(FILTER_CATEGORIES[0].icon).toBeTruthy()
  })
  it('tiene una entrada por categoría + Todos', () => {
    expect(FILTER_CATEGORIES.length).toBe(SPACE_CATEGORIES.length + 1)
  })
})
