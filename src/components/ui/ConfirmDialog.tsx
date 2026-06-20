'use client'

import { useState, useCallback, type ReactNode } from 'react'

interface ConfirmOpts {
  title: string
  message?: string
  confirmText?: string
  cancelText?: string
  tone?: 'default' | 'danger'
}

/**
 * Reemplazo declarativo de window.confirm. Uso:
 *   const { confirm, dialog } = useConfirm()
 *   ...
 *   if (!(await confirm({ title: '¿Seguro?', tone: 'danger' }))) return
 *   ...
 *   return (<>{dialog} ...</>)
 */
export function useConfirm() {
  const [state, setState] = useState<{ opts: ConfirmOpts; resolve: (v: boolean) => void } | null>(null)

  const confirm = useCallback(
    (opts: ConfirmOpts) => new Promise<boolean>(resolve => setState({ opts, resolve })),
    [],
  )

  const close = (value: boolean) => {
    state?.resolve(value)
    setState(null)
  }

  const danger = state?.opts.tone === 'danger'

  const dialog: ReactNode = state ? (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: 'rgba(0,0,0,0.45)' }}
      onClick={() => close(false)}>
      <div className="w-full sm:max-w-sm rounded-t-3xl sm:rounded-2xl p-5"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}
        onClick={e => e.stopPropagation()}>
        <p className="text-sm font-bold mb-1" style={{ color: 'var(--text-primary)' }}>{state.opts.title}</p>
        {state.opts.message && (
          <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>{state.opts.message}</p>
        )}
        <div className="flex gap-2 mt-4">
          <button type="button" onClick={() => close(false)}
            className="flex-1 py-3 rounded-xl text-sm font-semibold"
            style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}>
            {state.opts.cancelText ?? 'Cancelar'}
          </button>
          <button type="button" onClick={() => close(true)}
            className="flex-1 py-3 rounded-xl text-sm font-bold"
            style={danger
              ? { background: '#DC2626', color: '#fff' }
              : { background: 'var(--brand)', color: '#fff' }}>
            {state.opts.confirmText ?? 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  ) : null

  return { confirm, dialog }
}
