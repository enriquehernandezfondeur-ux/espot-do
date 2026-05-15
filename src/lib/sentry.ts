import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Ajustes de rendimiento
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Configuración de entorno
  environment: process.env.NODE_ENV || 'development',

  // Capturar errores del lado del cliente
  replaysOnErrorSampleRate: 1.0,

  // Capturar sesiones del lado del cliente
  replaysSessionSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Configuración de replays
  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],

  // Filtrar errores que no queremos trackear
  beforeSend(event) {
    // No trackear errores 4xx del cliente
    if (event.exception) {
      const error = event.exception.values?.[0]
      if (error?.value?.includes('Client Error')) {
        return null
      }
    }
    return event
  },

  // Configuración específica para Next.js
  beforeSendTransaction(event) {
    // Filtrar transacciones de health checks
    if (event.transaction?.includes('/api/health')) {
      return null
    }
    return event
  },
})