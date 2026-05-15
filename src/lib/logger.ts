// Logger simple compatible con Vercel serverless (sin filesystem)
// winston + DailyRotateFile no funcionan en producción serverless

const isDev = process.env.NODE_ENV === 'development'

function log(level: string, message: string, meta?: any) {
  if (!isDev) return
  const line = meta ? `[${level}] ${message} ${JSON.stringify(meta)}` : `[${level}] ${message}`
  if (level === 'error') console.error(line)
  else console.log(line)
}

const makeLogger = (component: string) => ({
  info:  (msg: string, meta?: any) => log('INFO',  msg, { component, ...meta }),
  warn:  (msg: string, meta?: any) => log('WARN',  msg, { component, ...meta }),
  error: (msg: string, meta?: any) => log('ERROR', msg, { component, ...meta }),
})

export const logger      = makeLogger('app')
export const userLogger  = makeLogger('user-actions')
export const paymentLogger = makeLogger('payments')
export const bookingLogger = makeLogger('bookings')

export function logError(error: Error | any, context?: any) {
  log('ERROR', error?.message ?? String(error), { stack: error?.stack, ...context })
}

export function logRequest(_req: any, _res: any, next?: any) {
  if (next) next()
}
