import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number | null | undefined): string {
  if (amount == null || isNaN(Number(amount))) return 'RD$ —'
  return new Intl.NumberFormat('es-DO', {
    style: 'currency',
    currency: 'DOP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number(amount))
}

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return '—'
  try {
    // "2026-06-15" sin hora se parsea como UTC midnight, lo que en UTC-4 retrocede al día anterior.
    // Usamos UTC noon explícito (Z) para que el día sea siempre correcto en UTC-12 a UTC+11.
    const d = typeof date === 'string' && date.length === 10
      ? new Date(date + 'T12:00:00Z')
      : new Date(date)
    if (isNaN(d.getTime())) return '—'
    return new Intl.DateTimeFormat('es-DO', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'America/Santo_Domingo',
    }).format(d)
  } catch {
    return '—'
  }
}

export function formatTime(time: string | null | undefined): string {
  if (!time) return '—'
  const [hours, minutes] = time.slice(0, 5).split(':')
  const h = parseInt(hours)
  const ampm = h >= 12 ? 'p.m.' : 'a.m.'
  const h12 = h % 12 || 12
  return `${h12}:${minutes} ${ampm}`
}

export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    + '-' + Date.now().toString(36)
}

export const num = (v: string | undefined) => v ? parseFloat(v) : null
export const int = (v: string | undefined) => v ? parseInt(v) : null

export function escapeHtml(s: string | null | undefined): string {
  if (!s) return ''
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
}
