'use client'

import Link from 'next/link'
import { Crown, Check, ArrowRight } from 'lucide-react'

/**
 * Muro de función Espot Pro: reemplaza el contenido de una sección bloqueada
 * para el plan Normal. Diseño claro (corona + beneficios + CTA), con los tokens
 * Pro del tema. Enlaza a /dashboard/host/pro.
 */
export function ProGate({
  title, description, features = [],
}: {
  title: string
  description: string
  features?: string[]
}) {
  return (
    <div className="rounded-3xl overflow-hidden" style={{ border: '1px solid var(--pro-border)', background: 'var(--bg-card)' }}>
      <div className="px-6 py-9 md:py-12 flex flex-col items-center text-center" style={{ background: 'var(--pro-dim)' }}>
        <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl mb-4"
          style={{ background: 'var(--pro)', boxShadow: '0 10px 28px rgba(217,119,6,0.28)' }}>
          <Crown size={26} style={{ color: '#fff' }} />
        </span>
        <span className="text-[11px] font-bold uppercase tracking-widest mb-1.5" style={{ color: 'var(--pro)' }}>
          Espot Pro
        </span>
        <h2 className="text-xl md:text-2xl font-bold" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
          {title}
        </h2>
        <p className="text-sm mt-2 max-w-md" style={{ color: 'var(--text-secondary)' }}>{description}</p>

        {features.length > 0 && (
          <div className="mt-5 flex flex-col gap-2 text-left">
            {features.map(f => (
              <span key={f} className="flex items-center gap-2.5 text-sm" style={{ color: 'var(--text-secondary)' }}>
                <span className="flex h-5 w-5 items-center justify-center rounded-full shrink-0" style={{ background: 'var(--pro-dim)' }}>
                  <Check size={13} style={{ color: 'var(--pro)' }} />
                </span>
                {f}
              </span>
            ))}
          </div>
        )}

        <Link href="/dashboard/host/pro"
          className="mt-7 inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all active:scale-95"
          style={{ background: 'var(--pro)', color: '#fff' }}>
          <Crown size={16} /> Activar Espot Pro <ArrowRight size={15} />
        </Link>
        <p className="text-xs mt-3" style={{ color: 'var(--text-muted)' }}>RD$499 al mes · cancela cuando quieras</p>
      </div>
    </div>
  )
}
