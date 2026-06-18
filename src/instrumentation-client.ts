// Inicialización client de Sentry (Next.js 16 carga este archivo en el navegador).
// Reusa la config existente (replays + beforeSend) de src/lib/sentry.ts.
import * as Sentry from '@sentry/nextjs'
import './lib/sentry'

// Necesario para el tracing de navegaciones del App Router.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
