'use client'

import { useFormStatus } from 'react-dom'
import { Loader2 } from 'lucide-react'

/**
 * Botón de submit para <form action={serverAction}> que:
 *  - pide confirmación antes de enviar (acciones sensibles),
 *  - muestra estado pending y se deshabilita (evita doble-submit),
 * sin necesitar convertir la página a client component.
 */
export default function ConfirmSubmitButton({
  children,
  confirmMessage,
  className,
  style,
  pendingLabel = 'Procesando...',
}: {
  children: React.ReactNode
  confirmMessage?: string
  className?: string
  style?: React.CSSProperties
  pendingLabel?: string
}) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      onClick={(e) => {
        if (confirmMessage && !window.confirm(confirmMessage)) {
          e.preventDefault()
        }
      }}
      className={className}
      style={{ ...style, ...(pending ? { opacity: 0.6, cursor: 'wait' } : null) }}
    >
      {pending
        ? <span className="inline-flex items-center justify-center gap-2"><Loader2 size={15} className="animate-spin" /> {pendingLabel}</span>
        : children}
    </button>
  )
}
