import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-DO', {
    style: 'currency',
    currency: 'DOP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('es-DO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(date))
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
