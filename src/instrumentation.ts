import * as Sentry from '@sentry/nextjs'

// Inicialización server/edge de Sentry (Next.js 16 lo carga automáticamente).
// Si NEXT_PUBLIC_SENTRY_DSN no está definido, Sentry.init es no-op (seguro).
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs' || process.env.NEXT_RUNTIME === 'edge') {
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
      environment: process.env.NODE_ENV || 'development',
    })
  }
}

// Captura errores de Server Components / route handlers / server actions.
export const onRequestError = Sentry.captureRequestError
