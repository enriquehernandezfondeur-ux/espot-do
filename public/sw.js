// Service Worker para Espot PWA
// Generado con Workbox

import { precacheAndRoute } from 'workbox-precaching'
import { registerRoute } from 'workbox-routing'
import { CacheFirst, NetworkFirst, StaleWhileRevalidate } from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'
import { CacheableResponsePlugin } from 'workbox-cacheable-response'

// Precachear assets estáticos
precacheAndRoute(self.__WB_MANIFEST || [])

// Cache para imágenes (con expiración)
registerRoute(
  ({ request }) => request.destination === 'image',
  new CacheFirst({
    cacheName: 'espot-images',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 60,
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30 días
      }),
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
    ],
  })
)

// Cache para API responses (NetworkFirst para datos frescos)
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/'),
  new NetworkFirst({
    cacheName: 'espot-api',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 5 * 60, // 5 minutos
      }),
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
    ],
  })
)

// Cache para páginas (StaleWhileRevalidate)
registerRoute(
  ({ request }) => request.destination === 'document',
  new StaleWhileRevalidate({
    cacheName: 'espot-pages',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 20,
        maxAgeSeconds: 24 * 60 * 60, // 24 horas
      }),
    ],
  })
)

// Cache para fonts y CSS
registerRoute(
  ({ request }) =>
    request.destination === 'style' ||
    request.destination === 'font' ||
    request.destination === 'script',
  new StaleWhileRevalidate({
    cacheName: 'espot-static',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 30,
        maxAgeSeconds: 7 * 24 * 60 * 60, // 7 días
      }),
    ],
  })
)

// Evento de instalación
self.addEventListener('install', (event) => {
  console.log('Service Worker installing.')
  self.skipWaiting()
})

// Evento de activación
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating.')
  event.waitUntil(self.clients.claim())
})

// Evento de mensaje (para comunicación con la app)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})

// Background sync para cuando no hay conexión
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync())
  }
})

async function doBackgroundSync() {
  try {
    // Aquí iría la lógica para sincronizar datos pendientes
    console.log('Background sync ejecutado')
  } catch (error) {
    console.error('Error en background sync:', error)
  }
}

// Push notifications (si se implementan después)
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json()
    const options = {
      body: data.body,
      icon: '/icon-192.png',
      badge: '/favicon-32x32.png',
      vibrate: [100, 50, 100],
      data: data.data,
    }

    event.waitUntil(
      self.registration.showNotification(data.title, options)
    )
  }
})

// Click en notificaciones
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  event.waitUntil(
    self.clients.openWindow(event.notification.data?.url || '/')
  )
})