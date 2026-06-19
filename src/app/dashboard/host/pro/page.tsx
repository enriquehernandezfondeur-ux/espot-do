'use client'

import { useState, useEffect } from 'react'
import { getMySubscription, startProRequest } from '@/lib/actions/subscription'
import { getHostCardSpaces } from '@/lib/actions/host'
import { PRO_PRICE_DOP, type SubscriptionSummary } from '@/lib/plans'
import { PlanBadge } from '@/components/PlanBadge'
import { ShareButton } from '@/components/ShareButton'
import { Crown, Check, Loader2, Sparkles, QrCode, ExternalLink } from 'lucide-react'

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://espot.do'
interface CardSpace { id: string; name: string; slug: string; is_published: boolean }

const NORMAL_FEATURES = [
  'Publicación de espacios',
  'Precio por hora, calendario y disponibilidad',
  'Recepción y gestión de reservas dentro de Espot',
  'Fotos, descripción, capacidad, amenidades y reglas',
  'Servicios adicionales',
  'Comisión del 10% solo cuando cobras dentro de Espot',
]

const PRO_FEATURES = [
  'Espot Directo: botón de WhatsApp, teléfono y formulario',
  'Registro de reservas externas (fuera de Espot)',
  'Calendario unificado: reservas internas + externas',
  'Tarjeta digital del espacio con enlace y QR',
  'Badge "Espot Pro" y mayor visibilidad en resultados',
  'Estadísticas avanzadas: visitas, clics, solicitudes y reservas',
  'CRM para gestionar clientes y solicitudes',
  'Recordatorios automáticos',
  'Más capacidad para fotos y videos',
]

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-DO', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default function HostProPage() {
  const [sub, setSub] = useState<SubscriptionSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [cardSpaces, setCardSpaces] = useState<CardSpace[]>([])

  useEffect(() => {
    getMySubscription().then(s => {
      setSub(s); setLoading(false)
      if (s.isPro) getHostCardSpaces().then(d => setCardSpaces(d as CardSpace[]))
    })
  }, [])

  async function handleStart() {
    setWorking(true); setMsg(null)
    const res = await startProRequest()
    if ('error' in res) {
      setMsg(res.error)
    } else {
      setMsg('¡Listo! Registramos tu interés en Espot Pro. El cobro por Azul estará disponible muy pronto; mientras tanto, el equipo de Espot puede activarte el plan.')
      const s = await getMySubscription()
      setSub(s)
    }
    setWorking(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="animate-spin" style={{ color: 'var(--brand)' }} />
      </div>
    )
  }

  const isPro = sub?.isPro ?? false
  const isPending = sub?.statusLabel === 'Pago pendiente'

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 md:py-8 space-y-6">
      {/* Encabezado */}
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
          style={{ background: 'rgba(53,196,147,0.14)' }}>
          <Crown size={22} style={{ color: 'var(--brand)' }} />
        </div>
        <div>
          <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            Espot Pro {isPro && <PlanBadge />}
          </h1>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Más herramientas para llenar tu agenda — dentro y fuera de Espot.
          </p>
        </div>
      </div>

      {/* Estado de la suscripción */}
      <div className="rounded-2xl p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-card)' }}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Plan actual</div>
            <div className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{sub?.statusLabel ?? 'Plan Normal (gratis)'}</div>
            {isPro && sub?.nextChargeISO && (
              <div className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                Próximo cobro: <strong style={{ color: 'var(--text-primary)' }}>{fmtDate(sub.nextChargeISO)}</strong>
                {sub.daysLeft != null && ` · ${sub.daysLeft} día${sub.daysLeft === 1 ? '' : 's'} restantes`}
              </div>
            )}
          </div>
          {!isPro && !isPending && (
            <button onClick={handleStart} disabled={working}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all disabled:opacity-60"
              style={{ background: 'var(--brand)', color: '#fff' }}>
              {working ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
              Activar Espot Pro · RD${PRO_PRICE_DOP}/mes
            </button>
          )}
          {isPending && (
            <span className="text-sm font-medium px-3 py-2 rounded-xl" style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>
              Activación pendiente
            </span>
          )}
        </div>
        {msg && (
          <div className="mt-4 text-sm rounded-xl p-3" style={{ background: 'rgba(53,196,147,0.08)', color: 'var(--text-secondary)', border: '1px solid var(--brand-border)' }}>
            {msg}
          </div>
        )}
      </div>

      {/* Tarjeta digital (Pro) */}
      {isPro && cardSpaces.filter(s => s.is_published).length > 0 && (
        <div className="rounded-2xl p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-card)' }}>
          <div className="flex items-center gap-2 mb-1">
            <QrCode size={16} style={{ color: 'var(--brand)' }} />
            <div className="font-bold" style={{ color: 'var(--text-primary)' }}>Tu tarjeta digital</div>
          </div>
          <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>Comparte cada espacio con un enlace y código QR.</p>
          <div className="space-y-2">
            {cardSpaces.filter(s => s.is_published).map(s => {
              const url = `${SITE}/t/${s.slug}`
              return (
                <div key={s.id} className="flex items-center justify-between gap-3 rounded-xl p-3" style={{ background: 'var(--bg-elevated)' }}>
                  <div className="min-w-0">
                    <div className="font-medium text-sm truncate" style={{ color: 'var(--text-primary)' }}>{s.name}</div>
                    <div className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{url}</div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <a href={`/t/${s.slug}`} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold"
                      style={{ background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)' }}>
                      <ExternalLink size={14} /> Abrir
                    </a>
                    <ShareButton url={url} title={s.name}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold"
                      style={{ background: 'var(--brand-dim)', color: 'var(--text-primary)', border: '1px solid var(--brand-border)' }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Comparativa Normal vs Pro */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Normal */}
        <div className="rounded-2xl p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
          <div className="font-bold" style={{ color: 'var(--text-primary)' }}>Plan Normal</div>
          <div className="text-2xl font-bold mt-1" style={{ color: 'var(--text-primary)' }}>Gratis</div>
          <ul className="mt-4 space-y-2.5">
            {NORMAL_FEATURES.map(f => (
              <li key={f} className="flex items-start gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                <Check size={16} style={{ color: 'var(--text-muted)', marginTop: 1, flexShrink: 0 }} />{f}
              </li>
            ))}
          </ul>
        </div>

        {/* Pro */}
        <div className="rounded-2xl p-5" style={{ background: 'var(--bg-card)', border: '1.5px solid var(--brand-border)', boxShadow: 'var(--shadow-card)' }}>
          <div className="font-bold flex items-center gap-2" style={{ color: 'var(--brand)' }}>
            <Crown size={16} /> Espot Pro
          </div>
          <div className="text-2xl font-bold mt-1" style={{ color: 'var(--text-primary)' }}>
            RD${PRO_PRICE_DOP}<span className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}> /mes</span>
          </div>
          <div className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>Todo lo del plan Normal, más:</div>
          <ul className="mt-3 space-y-2.5">
            {PRO_FEATURES.map(f => (
              <li key={f} className="flex items-start gap-2 text-sm" style={{ color: 'var(--text-primary)' }}>
                <Check size={16} style={{ color: 'var(--brand)', marginTop: 1, flexShrink: 0 }} />{f}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
