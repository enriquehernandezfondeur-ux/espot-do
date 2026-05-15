'use client'

import { Toaster as SonnerToaster, toast } from 'sonner'
import { CheckCircle, XCircle, AlertCircle, Info, Loader2 } from 'lucide-react'

type ToastType = 'success' | 'error' | 'warning' | 'info' | 'loading'

interface ToastOptions {
  description?: string
  duration?: number
  action?: {
    label: string
    onClick: () => void
  }
}

class NotificationManager {
  private static instance: NotificationManager

  static getInstance(): NotificationManager {
    if (!NotificationManager.instance) {
      NotificationManager.instance = new NotificationManager()
    }
    return NotificationManager.instance
  }

  success(message: string, options?: ToastOptions) {
    return toast.success(message, {
      description: options?.description,
      duration: options?.duration ?? 4000,
      action: options?.action,
      icon: <CheckCircle className="w-4 h-4 text-green-500" />,
    })
  }

  error(message: string, options?: ToastOptions) {
    return toast.error(message, {
      description: options?.description,
      duration: options?.duration ?? 6000,
      action: options?.action,
      icon: <XCircle className="w-4 h-4 text-red-500" />,
    })
  }

  warning(message: string, options?: ToastOptions) {
    return toast.warning(message, {
      description: options?.description,
      duration: options?.duration ?? 5000,
      action: options?.action,
      icon: <AlertCircle className="w-4 h-4 text-yellow-500" />,
    })
  }

  info(message: string, options?: ToastOptions) {
    return toast.info(message, {
      description: options?.description,
      duration: options?.duration ?? 4000,
      action: options?.action,
      icon: <Info className="w-4 h-4 text-blue-500" />,
    })
  }

  loading(message: string, options?: Omit<ToastOptions, 'action'>) {
    return toast.loading(message, {
      description: options?.description,
      duration: options?.duration ?? Infinity,
      icon: <Loader2 className="w-4 h-4 animate-spin text-blue-500" />,
    })
  }

  dismiss(toastId?: string | number) {
    toast.dismiss(toastId)
  }

  // Notificaciones específicas para Espot
  bookingSuccess(bookingDetails: { spaceName: string; date: string; amount: string }) {
    this.success('¡Reserva confirmada!', {
      description: `${bookingDetails.spaceName} - ${bookingDetails.date}`,
      action: {
        label: 'Ver detalles',
        onClick: () => {
          // TODO: Navigate to booking details
          console.log('Navigate to booking details')
        },
      },
    })
  }

  paymentSuccess(amount: string) {
    this.success('¡Pago procesado exitosamente!', {
      description: `Se ha recibido el pago de ${amount}`,
    })
  }

  bookingCancelled(reason?: string) {
    this.warning('Reserva cancelada', {
      description: reason || 'La reserva ha sido cancelada',
    })
  }

  networkError() {
    this.error('Error de conexión', {
      description: 'Verifica tu conexión a internet e intenta nuevamente',
      action: {
        label: 'Reintentar',
        onClick: () => window.location.reload(),
      },
    })
  }

  authRequired() {
    this.warning('Sesión expirada', {
      description: 'Debes iniciar sesión para continuar',
      action: {
        label: 'Iniciar sesión',
        onClick: () => {
          // TODO: Navigate to login
          console.log('Navigate to login')
        },
      },
    })
  }
}

// Exportar instancia singleton
export const notifications = NotificationManager.getInstance()

// Componente Toaster para la app
export function Toaster() {
  return (
    <SonnerToaster
      position="top-right"
      toastOptions={{
        style: {
          background: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
        },
        className: 'font-medium',
      }}
      closeButton
      richColors
    />
  )
}