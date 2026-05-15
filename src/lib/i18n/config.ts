// Configuración de internacionalización para Espot
// Soporte básico para español e inglés

export const locales = ['es', 'en'] as const
export type Locale = typeof locales[number]

export const defaultLocale: Locale = 'es'

export const localeNames: Record<Locale, string> = {
  es: 'Español',
  en: 'English',
}

export const localeFlags: Record<Locale, string> = {
  es: '🇩🇴',
  en: '🇺🇸',
}

// Configuración de rutas internacionalizadas
export const pathnames = {
  '/': '/',
  '/dashboard': '/dashboard',
  '/dashboard/host': '/dashboard/host',
  '/auth': '/auth',
  '/marketplace': '/marketplace',
  '/contacto': {
    es: '/contacto',
    en: '/contact',
  },
  '/privacidad': {
    es: '/privacidad',
    en: '/privacy',
  },
  '/terminos': {
    es: '/terminos',
    en: '/terms',
  },
} as const