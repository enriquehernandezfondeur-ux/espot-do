'use client'

import { useTranslations as useNextIntlTranslations } from 'next-intl'
import { defaultLocale } from '@/lib/i18n/config'

// Hook personalizado para traducciones
// Por ahora usa un sistema simple, pero preparado para next-intl
export function useTranslations(namespace?: string) {
  // En el futuro, cuando se implemente next-intl completamente:
  // return useNextIntlTranslations(namespace)

  // Por ahora, importamos las traducciones directamente
  // Esto se puede mejorar con un context provider para el idioma actual
  const locale = defaultLocale // TODO: Obtener del contexto/routing

  const translations = locale === 'es'
    ? require('@/lib/i18n/locales/es').default
    : require('@/lib/i18n/locales/en').default

  const t = (key: string, params?: Record<string, any>) => {
    const keys = key.split('.')
    let value: any = translations

    for (const k of keys) {
      value = value?.[k]
    }

    if (typeof value !== 'string') {
      console.warn(`Translation missing for key: ${key}`)
      return key
    }

    // Simple parameter replacement
    if (params) {
      return Object.entries(params).reduce(
        (str, [param, val]) => str.replace(`{{${param}}}`, String(val)),
        value
      )
    }

    return value
  }

  return t
}

// Hook para cambiar idioma
export function useLocale() {
  // TODO: Implementar lógica para cambiar idioma
  // Por ahora retorna el idioma por defecto
  return {
    locale: defaultLocale,
    setLocale: (newLocale: string) => {
      console.log('Cambiar idioma a:', newLocale)
      // TODO: Implementar cambio de idioma
    },
  }
}