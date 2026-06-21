'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Sparkles, Share2, CheckCircle2, ChevronDown, X, Plus } from 'lucide-react'

const STEPS = [
  { icon: Sparkles, n: '1', title: 'Crea tu actividad', desc: 'Elige el tipo, ponle nombre, fecha y dónde será — un espacio de Espot o tu propia ubicación.' },
  { icon: Share2, n: '2', title: 'Comparte el enlace', desc: 'Por WhatsApp o link. Tus invitados confirman sin crear cuenta ni descargar nada.' },
  { icon: CheckCircle2, n: '3', title: 'Recibe confirmaciones', desc: 'Mira quién viene y con cuántos acompañantes, y llévalos al check-in el día del evento.' },
]

function StepRow({ icon: Icon, n, title, desc }: typeof STEPS[number]) {
  return (
    <div className="flex gap-3">
      <div className="relative shrink-0">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl"
          style={{ background: 'var(--brand-dim)' }}>
          <Icon size={18} style={{ color: 'var(--brand)' }} />
        </span>
        <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold"
          style={{ background: 'var(--brand)', color: '#fff' }}>{n}</span>
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</p>
        <p className="text-xs mt-0.5 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{desc}</p>
      </div>
    </div>
  )
}

/** Hero de onboarding (estado vacío): explica qué es y los 3 pasos. */
export function HowItWorksHero() {
  return (
    <div className="rounded-3xl overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
      <div className="px-6 pt-7 pb-6 text-center" style={{ background: 'linear-gradient(135deg,#03313C,#0D4A3A)' }}>
        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full mb-3"
          style={{ background: 'rgba(53,196,147,0.18)', color: 'var(--brand)' }}>
          <Sparkles size={12} /> GRATIS
        </span>
        <h2 className="text-xl font-bold text-white" style={{ letterSpacing: '-0.02em' }}>
          Encuentra el espacio y organiza todo desde Espot
        </h2>
        <p className="text-sm mt-1.5" style={{ color: 'rgba(255,255,255,0.7)' }}>
          Podcasts, talleres, cumpleaños, cenas, reuniones… tú lo organizas, nosotros te ayudamos a llenarlo.
        </p>
      </div>
      <div className="p-6 space-y-4">
        {STEPS.map(s => <StepRow key={s.n} {...s} />)}
        <Link href="/dashboard/actividades/nueva"
          className="mt-2 flex items-center justify-center gap-1.5 text-sm font-bold px-5 py-3 rounded-xl w-full"
          style={{ background: 'var(--brand)', color: '#fff' }}>
          <Plus size={16} /> Crear mi primera actividad
        </Link>
      </div>
    </div>
  )
}

/** Banner compacto y descartable (cuando ya hay actividades). Recuerda el cierre. */
export function HowItWorksBanner() {
  const [dismissed, setDismissed] = useState(true)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    setDismissed(localStorage.getItem('espot_actividades_help') === 'off')
  }, [])

  if (dismissed) return null

  function close() {
    setDismissed(true)
    try { localStorage.setItem('espot_actividades_help', 'off') } catch { /* noop */ }
  }

  return (
    <div className="rounded-2xl mb-5 overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
      <div className="flex items-center gap-2 px-4 py-3">
        <button type="button" onClick={() => setOpen(o => !o)} className="flex items-center gap-2 flex-1 text-left">
          <CheckCircle2 size={16} style={{ color: 'var(--brand)' }} />
          <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>¿Cómo funciona?</span>
          <ChevronDown size={15} style={{ color: 'var(--text-muted)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }} />
        </button>
        <button type="button" onClick={close} aria-label="Ocultar" className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
          style={{ color: 'var(--text-muted)' }}>
          <X size={15} />
        </button>
      </div>
      {open && (
        <div className="px-4 pb-4 pt-1 space-y-3.5" style={{ borderTop: '1px solid var(--border-subtle)' }}>
          <div className="pt-3 space-y-3.5">
            {STEPS.map(s => <StepRow key={s.n} {...s} />)}
          </div>
        </div>
      )}
    </div>
  )
}
