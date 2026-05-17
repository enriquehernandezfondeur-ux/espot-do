'use client'

import { useEffect, useState } from 'react'
import { notifications } from '@/lib/notifications'

export function useServiceWorker() {
  const [isSupported, setIsSupported] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return

    // Verificar soporte de Service Worker
    if ('serviceWorker' in navigator) {
      setIsSupported(true)

      // Registrar service worker
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          // Service Worker registrado
          setRegistration(reg)

          // Verificar si ya está instalado
          if (reg.active) {
            setIsInstalled(true)
          }

          // Escuchar por updates
          reg.addEventListener('updatefound', () => {
            const newWorker = reg.installing
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  setUpdateAvailable(true)
                  notifications.info('Actualización disponible', {
                    description: 'Hay una nueva versión disponible. Actualiza para obtener las últimas mejoras.',
                    action: {
                      label: 'Actualizar',
                      onClick: () => window.location.reload(),
                    },
                  })
                }
              })
            }
          })

          // Escuchar mensajes del service worker
          navigator.serviceWorker.addEventListener('message', (event) => {
            if (event.data?.type === 'UPDATE_AVAILABLE') {
              setUpdateAvailable(true)
            }
          })
        })
        .catch((error) => {
          console.error('Error registrando Service Worker:', error)
        })

      // Verificar si la app está instalada como PWA
      const checkInstalled = () => {
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches
        const isInWebAppiOS = (window.navigator as any).standalone === true
        setIsInstalled(isStandalone || isInWebAppiOS)
      }

      checkInstalled()
      const handleAppInstalled = () => setIsInstalled(true)
      window.addEventListener('appinstalled', handleAppInstalled)

      return () => {
        window.removeEventListener('appinstalled', handleAppInstalled)
      }
    }
  }, [])

  const updateApp = () => {
    if (registration?.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' })
      window.location.reload()
    }
  }

  const installApp = async () => {
    if ('beforeinstallprompt' in window) {
      // El evento beforeinstallprompt se maneja en otro lugar
      return
    }

    // Fallback para navegadores que no soportan beforeinstallprompt
    notifications.info('Instalación PWA', {
      description: 'Para instalar la app, usa el menú de tu navegador.',
    })
  }

  return {
    isSupported,
    isInstalled,
    updateAvailable,
    updateApp,
    installApp,
  }
}