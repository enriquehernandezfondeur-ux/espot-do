import winston from 'winston'
import DailyRotateFile from 'winston-daily-rotate-file'

// Formato personalizado para logs
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    return JSON.stringify({
      timestamp,
      level: level.toUpperCase(),
      message,
      ...meta,
    })
  })
)

// Transport para archivos rotativos
const fileRotateTransport = new DailyRotateFile({
  filename: 'logs/espot-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  maxSize: '20m',
  maxFiles: '14d',
  format: logFormat,
})

// Transport para errores
const errorFileRotateTransport = new DailyRotateFile({
  filename: 'logs/espot-error-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  level: 'error',
  maxSize: '20m',
  maxFiles: '30d',
  format: logFormat,
})

// Logger principal
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  transports: [
    fileRotateTransport,
    errorFileRotateTransport,
    // Solo mostrar en consola en desarrollo
    ...(process.env.NODE_ENV === 'development'
      ? [new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          )
        })]
      : []
    ),
  ],
})

// Logger específico para acciones de usuario
export const userLogger = logger.child({ component: 'user-actions' })

// Logger específico para pagos
export const paymentLogger = logger.child({ component: 'payments' })

// Logger específico para bookings
export const bookingLogger = logger.child({ component: 'bookings' })

// Función helper para logging de requests HTTP
export function logRequest(req: any, res: any, next?: any) {
  const start = Date.now()

  // Log cuando termina la respuesta
  res.on('finish', () => {
    const duration = Date.now() - start
    logger.info('HTTP Request', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
    })
  })

  if (next) next()
}

// Función helper para logging de errores
export function logError(error: Error, context?: any) {
  logger.error('Application Error', {
    error: error.message,
    stack: error.stack,
    ...context,
  })
}