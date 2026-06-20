'use client'

import { useState, useEffect } from 'react'
import { getMySubscription, startProRequest } from '@/lib/actions/subscription'
import { getHostCardSpaces } from '@/lib/actions/host'
import { PRO_PRICE_DOP, type SubscriptionSummary } from '@/lib/plans'
import { PlanBadge } from '@/components/PlanBadge'
import { ShareButton } from '@/components/ShareButton'
import {
  Crown, Check, Loader2, Sparkles, QrCode, ExternalLink,
  MessageCircle, CalendarRange, Users, BarChart3, Rocket, Bell, Images, Lock,
} from 'lucide-react'

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

// Beneficios exclusivos de Pro (no disponibles en el plan Normal). Espot Directo primero.
const PRO_BENEFITS = [
  { icon: MessageCircle, title: 'Espot Directo', desc: 'Botón de WhatsApp, teléfono y formulario en tu espacio: recibe solicitudes directas, sin intermediarios.' },
  { icon: CalendarRange, title: 'Reservas externas + calendario unificado', desc: 'Registra eventos de fuera de Espot y míralos junto a los de Espot en un solo calendario.' },
  { icon: Users, title: 'CRM de clientes', desc: 'Guarda y organiza tus clientes con historial, etiquetas y notas.' },
  { icon: QrCode, title: 'Tarjeta digital + QR', desc: 'Una página compartible de tu espacio, con enlace y código QR.' },
  { icon: BarChart3, title: 'Estadísticas avanzadas', desc: 'Visitas, clics de intención, conversión y rendimiento de tus espacios.' },
  { icon: Rocket, title: 'Mayor visibilidad', desc: 'Tus espacios destacados y con prioridad en los resultados del marketplace.' },
  { icon: Bell, title: 'Recordatorios automáticos', desc: 'Avisos a tus clientes para reducir cancelaciones y olvidos.' },
  { icon: Images, title: 'Más fotos y videos', desc: 'Muestra tu espacio con mayor capacidad multimedia.' },
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
        <Loader2 className="animate-spin" style={{ color: 'var(--pro)' }} />
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
          style={{ background: 'var(--pro-dim)' }}>
          <Crown size={22} style={{ color: 'var(--pro)' }} />
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
      <div className="rounded-2xl p-5" style={isPro
        ? { background: 'var(--pro-dim)', border: '1px solid var(--pro-border)', boxShadow: 'var(--shadow-card)' }
        : { background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-card)' }}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Plan actual</div>
            <div className="text-lg font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              {sub?.statusLabel ?? 'Plan Normal (gratis)'}
              {isPro && <PlanBadge />}
            </div>
            {isPro && sub?.nextChargeISO && (
              <div className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                {sub.isTrial ? 'Tu prueba termina' : 'Próxima renovación'}: <strong style={{ color: 'var(--text-primary)' }}>{fmtDate(sub.nextChargeISO)}</strong>
                {sub.daysLeft != null && ` · ${sub.daysLeft} día${sub.daysLeft === 1 ? '' : 's'} restantes`}
              </div>
            )}
            {isPro && sub?.isTrial && (
              <div className="text-xs mt-1" style={{ color: 'var(--pro-strong)' }}>
                Estás probando todas las funciones Pro gratis. Al terminar, puedes pasar a Pro por RD${PRO_PRICE_DOP}/mes.
              </div>
            )}
            {!isPro && !isPending && (
              <div className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                Estás en el plan gratuito. Desbloquea <strong style={{ color: 'var(--pro)' }}>Espot Directo</strong> y mucho más.
              </div>
            )}
          </div>
          {!isPro && !isPending && (
            <button onClick={handleStart} disabled={working}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm transition-all disabled:opacity-60"
              style={{ background: 'var(--pro)', color: '#fff' }}>
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
          <div className="mt-4 text-sm rounded-xl p-3" style={{ background: 'var(--pro-dim)', color: 'var(--text-secondary)', border: '1px solid var(--pro-border)' }}>
            {msg}
          </div>
        )}
      </div>

      {/* Tarjeta digital (Pro) */}
      {isPro && cardSpaces.filter(s => s.is_published).length > 0 && (
        <div className="rounded-2xl p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-card)' }}>
          <div className="flex items-center gap-2 mb-1">
            <QrCode size={16} style={{ color: 'var(--pro)' }} />
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
                      style={{ background: 'var(--pro-dim)', color: 'var(--text-primary)', border: '1px solid var(--pro-border)' }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Showcase de beneficios Pro (exclusivos del plan, no están en Normal) */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          {isPro
            ? <Check size={16} style={{ color: 'var(--pro)' }} />
            : <Lock size={15} style={{ color: 'var(--pro)' }} />}
          <h2 className="text-base md:text-lg font-bold" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            {isPro ? 'Tus beneficios Espot Pro' : 'Lo que desbloqueas con Espot Pro'}
          </h2>
        </div>
        <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>
          {isPro ? 'Todo esto está activo en tu cuenta.' : 'Funciones que no incluye el plan Normal.'}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {PRO_BENEFITS.map(b => {
            const Icon = b.icon
            return (
              <div key={b.title} className="rounded-2xl p-4 flex gap-3"
                style={{ background: 'var(--bg-card)', border: `1px solid ${isPro ? 'var(--pro-border)' : 'var(--border-subtle)'}` }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'var(--pro-dim)' }}>
                  <Icon size={18} style={{ color: 'var(--pro)' }} />
                </div>
                <div className="min-w-0">
                  <div className="font-semibold text-sm flex items-center gap-1.5" style={{ color: 'var(--text-primary)' }}>
                    {b.title}
                    {isPro && <Check size={13} className="shrink-0" style={{ color: 'var(--pro)' }} />}
                  </div>
                  <div className="text-xs mt-0.5 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{b.desc}</div>
                </div>
              </div>
            )
          })}
        </div>
        {!isPro && !isPending && (
          <button onClick={handleStart} disabled={working}
            className="mt-4 w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm transition-all disabled:opacity-60"
            style={{ background: 'var(--pro)', color: '#fff' }}>
            {working ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
            Activar Espot Pro · RD${PRO_PRICE_DOP}/mes
          </button>
        )}
      </div>

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
        <div className="rounded-2xl p-5" style={{ background: 'var(--bg-card)', border: '1.5px solid var(--pro-border)', boxShadow: 'var(--shadow-card)' }}>
          <div className="font-bold flex items-center gap-2" style={{ color: 'var(--pro)' }}>
            <Crown size={16} /> Espot Pro
          </div>
          <div className="text-2xl font-bold mt-1" style={{ color: 'var(--text-primary)' }}>
            RD${PRO_PRICE_DOP}<span className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}> /mes</span>
          </div>
          <div className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>Todo lo del plan Normal, más:</div>
          <ul className="mt-3 space-y-2.5">
            {PRO_BENEFITS.map(b => (
              <li key={b.title} className="flex items-start gap-2 text-sm" style={{ color: 'var(--text-primary)' }}>
                <Check size={16} style={{ color: 'var(--pro)', marginTop: 1, flexShrink: 0 }} />{b.title}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
