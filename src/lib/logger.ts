// Logger simple compatible con Vercel serverless (sin filesystem)
// winston + DailyRotateFile no funcionan en producción serverless

import * as Sentry from '@sentry/nextjs'

const isDev  = process.env.NODE_ENV === 'development'
const isProd = process.env.NODE_ENV === 'production'

function log(level: string, message: string, meta?: any) {
  const line = meta ? `[${level}] ${message} ${JSON.stringify(meta)}` : `[${level}] ${message}`

  if (level === 'error') {
    // Siempre emitir console.error (visible en Vercel logs)
    console.error(line)

    // En producción, capturar en Sentry para alertas y trazabilidad
    if (isProd) {
      const err = meta?.originalError instanceof Error
        ? meta.originalError
        : new Error(message)
      Sentry.captureException(err, { extra: { ...meta, logMessage: message } })
    }
    return
  }

  // info / warn: solo en desarrollo o producción sin Sentry (no saturar quota)
  if (isDev || isProd) {
    if (level === 'debug' && !isDev) return  // debug silenciado en producción
    console.log(line)
  }
}

const makeLogger = (component: string) => ({
  info:  (msg: string, meta?: any) => log('INFO',  msg, { component, ...meta }),
  warn:  (msg: string, meta?: any) => log('WARN',  msg, { component, ...meta }),
  error: (msg: string, meta?: any) => log('ERROR', msg, { component, ...meta }),
  debug: (msg: string, meta?: any) => log('DEBUG', msg, { component, ...meta }),
})

export const logger        = makeLogger('app')
export const userLogger    = makeLogger('user-actions')
export const paymentLogger = makeLogger('payments')
export const bookingLogger = makeLogger('bookings')

export function logError(error: Error | any, context?: any) {
  log('ERROR', error?.message ?? String(error), {
    stack: error?.stack,
    originalError: error,
    ...context,
  })
}

export function logRequest(_req: any, _res: any, next?: any) {
  if (next) next()
}
