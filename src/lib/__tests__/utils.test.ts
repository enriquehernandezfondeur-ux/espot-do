import { formatCurrency, formatDate, formatTime } from '@/lib/utils'

describe('Utils', () => {
  describe('formatCurrency', () => {
    it('formats Dominican Peso correctly', () => {
      expect(formatCurrency(1000)).toBe('RD$1,000')
      expect(formatCurrency(500.50)).toBe('RD$501')
      expect(formatCurrency(0)).toBe('RD$0')
    })
  })

  describe('formatDate', () => {
    it('formats date correctly', () => {
      const date = new Date('2024-01-15T12:00:00Z') // Usar UTC noon para evitar problemas de zona horaria
      expect(formatDate(date)).toBe('15 de enero de 2024')
    })
  })

  describe('formatTime', () => {
    it('formats time correctly', () => {
      expect(formatTime('14:30')).toBe('2:30 p.m.')
      expect(formatTime('09:15')).toBe('9:15 a.m.')
    })

    it('handles null/undefined time', () => {
      expect(formatTime(null)).toBe('—')
      expect(formatTime(undefined)).toBe('—')
    })
  })
})