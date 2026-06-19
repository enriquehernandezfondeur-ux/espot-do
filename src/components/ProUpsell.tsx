'use client'

import Link from 'next/link'
import { Crown, ArrowRight } from 'lucide-react'

/**
 * Aviso contextual de upgrade a Espot Pro. No es agresivo: aparece en el punto
 * de fricción (una sección de función Pro) y explica el beneficio antes de pedir
 * el pago. Enlaza a /dashboard/host/pro.
 */
export function ProUpsell({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <Link
      href="/dashboard/host/pro"
      className="flex items-center gap-3 rounded-2xl p-4 mb-5 transition-all"
      style={{ background: 'var(--pro-dim)', border: '1px solid var(--pro-border)' }}
    >
      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'var(--pro-dim)' }}>
        <Crown size={18} style={{ color: 'var(--pro)' }} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{title}</div>
        {children && <div className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>{children}</div>}
      </div>
      <ArrowRight size={16} style={{ color: 'var(--pro)' }} className="shrink-0" />
    </Link>
  )
}
