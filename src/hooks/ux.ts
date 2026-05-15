'use client'

import { useState, useEffect } from 'react'
import { notifications } from '@/lib/notifications'

// Hook para detectar estado de conexión
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(true)
  const [wasOffline, setWasOffline] = useState(false)

  useEffect(() => {
    // Función para actualizar estado
    const updateOnlineStatus = () => {
      const online = navigator.onLine
      setIsOnline(online)

      if (!online && !wasOffline) {
        setWasOffline(true)
        notifications.warning('Conexión perdida', {
          description: 'Trabajando en modo offline. Algunas funciones pueden no estar disponibles.',
        })
      } else if (online && wasOffline) {
        setWasOffline(false)
        notifications.success('Conexión restablecida', {
          description: 'Ya puedes continuar usando todas las funciones.',
        })
      }
    }

    // Event listeners
    window.addEventListener('online', updateOnlineStatus)
    window.addEventListener('offline', updateOnlineStatus)

    // Estado inicial
    updateOnlineStatus()

    return () => {
      window.removeEventListener('online', updateOnlineStatus)
      window.removeEventListener('offline', updateOnlineStatus)
    }
  }, [wasOffline])

  return { isOnline, wasOffline }
}

// Hook para detectar visibilidad de página (útil para pausar operaciones cuando no se ve)
export function usePageVisibility() {
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsVisible(!document.hidden)
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [])

  return isVisible
}

// Hook para detectar si el usuario está inactivo
export function useIdle(timeout = 5 * 60 * 1000) { // 5 minutos por defecto
  const [isIdle, setIsIdle] = useState(false)
  const [lastActivity, setLastActivity] = useState(Date.now())

  useEffect(() => {
    let timeoutId: NodeJS.Timeout

    const resetTimer = () => {
      setLastActivity(Date.now())
      setIsIdle(false)
      clearTimeout(timeoutId)
      timeoutId = setTimeout(() => setIsIdle(true), timeout)
    }

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click']

    events.forEach(event => {
      document.addEventListener(event, resetTimer, true)
    })

    resetTimer()

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, resetTimer, true)
      })
      clearTimeout(timeoutId)
    }
  }, [timeout])

  return { isIdle, lastActivity }
}

// Hook para preferencias de usuario (tema, idioma, etc.)
export function useUserPreferences() {
  const [preferences, setPreferences] = useState({
    theme: 'light',
    language: 'es',
    notifications: true,
    currency: 'DOP',
  })

  useEffect(() => {
    // Cargar preferencias del localStorage
    const saved = localStorage.getItem('espot-preferences')
    if (saved) {
      try {
        setPreferences(JSON.parse(saved))
      } catch (error) {
        console.warn('Error loading user preferences:', error)
      }
    }
  }, [])

  const updatePreference = <K extends keyof typeof preferences>(
    key: K,
    value: typeof preferences[K]
  ) => {
    const newPreferences = { ...preferences, [key]: value }
    setPreferences(newPreferences)
    localStorage.setItem('espot-preferences', JSON.stringify(newPreferences))
  }

  return { preferences, updatePreference }
}

// Hook para manejar errores de red con retry automático
export function useNetworkRetry<T>(
  fetcher: () => Promise<T>,
  options: {
    maxRetries?: number
    retryDelay?: number
    onRetry?: (attempt: number) => void
  } = {}
) {
  const { maxRetries = 3, retryDelay = 1000, onRetry } = options
  const { isOnline } = useOnlineStatus()

  const executeWithRetry = async (): Promise<T> => {
    let lastError: Error

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        if (!isOnline && attempt === 1) {
          throw new Error('No internet connection')
        }

        return await fetcher()
      } catch (error) {
        lastError = error as Error

        if (attempt < maxRetries) {
          onRetry?.(attempt)
          await new Promise(resolve => setTimeout(resolve, retryDelay * attempt))
        }
      }
    }

    throw lastError!
  }

  return executeWithRetry
}