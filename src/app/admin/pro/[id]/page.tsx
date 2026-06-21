'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { getProOwnerDetail, adminProAction, type ProOwnerDetail, type ProAction } from '@/lib/actions/admin-pro'
import { proAdminStyle, subscriptionStyle } from '@/lib/statusConfig'
import { Card } from '@/components/ui/Card'
import { LoadError } from '@/components/LoadError'
import {
  ChevronLeft, Crown, Loader2, Mail, Phone, Building2, CalendarDays, Check, X,
  Gift, Clock, RotateCw, Ban, Pause, Play, FileText, History, Bell, AlertTriangle,
} from 'lucide-react'

function fmtDate(d?: string | null) {
  return d ? new Date(d).toLocaleDateString('es-DO', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'
}
function fmtDateTime(d?: string | null) {
  return d ? new Date(d).toLocaleString('es-DO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'
}

const ACTION_LABELS: Record<string, string> = {
  activar_prueba: 'Prueba activada', activar_pro: 'Pro activado', extender: 'Plan extendido',
  renovar_30: 'Renovado 30 días', cambiar_fin: 'Fecha de fin cambiada', marcar_pagado: 'Marcado como pagado',
  marcar_pendiente: 'Marcado pendiente de pago', cancelar_fin_periodo: 'Cancelar al finalizar el periodo',
  cancelar_ahora: 'Cancelado', suspender: 'Suspendido', restaurar: 'Pro restaurado',
  volver_normal: 'Vuelto a Normal', nota: 'Nota interna',
}

export default function AdminProDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [data, setData]       = useState<ProOwnerDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [working, setWorking] = useState(false)
  const [days, setDays]       = useState(30)
  const [endDate, setEndDate] = useState('')
  const [note, setNote]       = useState('')
  const [msg, setMsg]         = useState<{ ok: boolean; text: string } | null>(null)

  function load() {
    setLoading(true); setLoadError(false)
    getProOwnerDetail(id)
      .then(d => { if (!d) setLoadError(true); else { setData(d); setNote(d.sub?.admin_note ?? '') } setLoading(false) })
      .catch(() => { setLoadError(true); setLoading(false) })
  }
  useEffect(() => { load() }, [id])

  async function run(action: ProAction, confirmMsg?: string, extra?: { withDate?: boolean; withDays?: boolean }) {
    if (confirmMsg && !window.confirm(confirmMsg)) return
    setWorking(true); setMsg(null)
    const res = await adminProAction(id, action, {
      days: extra?.withDays ? days : undefined,
      endDate: extra?.withDate ? endDate : undefined,
      note: note.trim() || undefined,
    })
    if ('error' in res) { setMsg({ ok: false, text: res.error }); setWorking(false); return }
    const d = await getProOwnerDetail(id)
    setData(d); setWorking(false)
    setMsg({ ok: true, text: `${ACTION_LABELS[action] ?? 'Hecho'} ✓` })
  }

  if (loading) return <div className="flex items-center justify-center py-24"><Loader2 size={28} className="animate-spin" style={{ color: 'var(--brand)' }} /></div>
  if (loadError || !data) return <div className="p-6 max-w-5xl mx-auto"><LoadError message="No pudimos cargar el propietario." onRetry={load} /></div>

  const { profile, sub, plan, daysLeft } = data
  const st = proAdminStyle({ plan, sub, daysLeft })
  const hasSub = !!sub

  const Btn = ({ onClick, icon: Icon, children, tone = 'default' }: { onClick: () => void; icon: any; children: React.ReactNode; tone?: 'default' | 'pro' | 'danger' }) => (
    <button onClick={onClick} disabled={working}
      className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl disabled:opacity-50 transition-all"
      style={tone === 'pro' ? { background: 'var(--pro)', color: '#fff' }
        : tone === 'danger' ? { background: '#fff', border: '1px solid #FCA5A5', color: 'var(--danger)' }
        : { background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
      <Icon size={13} /> {children}
    </button>
  )

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <Link href="/admin/pro" className="inline-flex items-center gap-1 text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
        <ChevronLeft size={16} /> Espot Pro
      </Link>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>{profile?.full_name ?? '—'}</h1>
          <div className="flex flex-wrap items-center gap-3 mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
            {profile?.email && <span className="inline-flex items-center gap-1"><Mail size={12} />{profile.email}</span>}
            {profile?.phone && <span className="inline-flex items-center gap-1"><Phone size={12} />{profile.phone}</span>}
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 text-sm font-bold px-3 py-1.5 rounded-full" style={{ background: st.bg, color: st.color }}>
          <Crown size={13} /> {st.label}
        </span>
      </div>

      {msg && (
        <div className="text-sm rounded-xl p-3 mb-4" style={msg.ok
          ? { background: 'var(--pro-dim)', color: 'var(--pro-strong)', border: '1px solid var(--pro-border)' }
          : { background: '#FEE2E2', color: '#B91C1C', border: '1px solid #FCA5A5' }}>
          {msg.ok ? '✓ ' : '✕ '}{msg.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5 items-start">
        {/* ── Columna principal ── */}
        <div className="space-y-5">
          {/* Resumen del plan + línea de tiempo */}
          <Card>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Info label="Plan" value={plan === 'pro' ? (sub?.status === 'trialing' ? 'Prueba' : 'Pro') : 'Normal'} />
              <Info label="Activación" value={sub?.activation_type === 'azul' ? 'Azul (pago)' : sub?.activation_type === 'trial' ? 'Prueba' : sub ? 'Manual' : '—'} />
              <Info label="Días restantes" value={daysLeft != null ? (daysLeft === 0 ? 'Vence hoy' : daysLeft === 1 ? 'Mañana' : `${daysLeft} días`) : '—'} />
              <Info label="Pago" value={sub?.status === 'pending_payment' ? 'Pendiente' : sub?.activation_type === 'azul' ? 'Pagado' : sub ? 'Gratuito' : '—'} />
              <Info label="Inicio" value={fmtDate(sub?.current_period_start)} />
              <Info label="Fin / renovación" value={fmtDate(sub?.current_period_end)} />
              <Info label="Cancela al vencer" value={sub?.cancel_at_period_end ? 'Sí' : 'No'} />
              <Info label="Registro" value={fmtDate(profile?.created_at)} />
            </div>
            {sub?.cancel_at_period_end && (
              <div className="mt-3 text-xs rounded-xl p-2.5 inline-flex items-center gap-2" style={{ background: 'rgba(217,119,6,0.08)', color: '#92400E' }}>
                <AlertTriangle size={13} /> Programado para cancelarse el {fmtDate(sub.current_period_end)}.
              </div>
            )}
          </Card>

          {/* Acciones */}
          <Card>
            <h3 className="text-sm font-bold mb-3" style={{ color: 'var(--text-primary)' }}>Acciones</h3>

            {/* Duración / fecha */}
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <div className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Duración:</div>
              {[7, 30, 90, 180, 365].map(d => (
                <button key={d} onClick={() => setDays(d)} type="button"
                  className="text-xs font-semibold px-2.5 py-1 rounded-lg"
                  style={days === d ? { background: 'var(--pro-dim)', border: '1px solid var(--pro-border)', color: 'var(--pro-strong)' } : { background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
                  {d === 7 ? '7d' : d === 30 ? '1m' : d === 90 ? '3m' : d === 180 ? '6m' : '1a'}
                </button>
              ))}
              <input type="number" min={1} value={days} onChange={e => setDays(Math.max(1, Number(e.target.value) || 1))}
                className="w-16 rounded-lg px-2 py-1 text-sm" style={{ border: '1px solid var(--border-subtle)', fontSize: 16 }} />
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>días · o fin:</span>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                className="rounded-lg px-2 py-1 text-sm" style={{ border: '1px solid var(--border-subtle)', fontSize: 16 }} />
            </div>

            <div className="flex flex-wrap gap-2">
              <Btn onClick={() => run('activar_prueba', `Activar prueba gratuita por ${days} días.`, { withDays: true })} icon={Gift} tone="pro">Activar prueba {days}d</Btn>
              <Btn onClick={() => run('activar_pro', `Activar Pro manual por ${days} días.`, { withDays: true })} icon={Crown} tone="pro">Activar Pro {days}d</Btn>
              {hasSub && <>
                <Btn onClick={() => run('marcar_pagado', '¿Marcar como PAGADO (Pro por Azul)?')} icon={Check}>Marcar pagado</Btn>
                <Btn onClick={() => run('extender', `Extender +${days} días.`, { withDays: true })} icon={Clock}>Extender +{days}d</Btn>
                <Btn onClick={() => run('renovar_30', 'Renovar por 30 días.')} icon={RotateCw}>Renovar 30d</Btn>
                <Btn onClick={() => run('cambiar_fin', endDate ? `Cambiar el fin a ${endDate}.` : '', { withDate: true })} icon={CalendarDays}>Cambiar fin</Btn>
                <Btn onClick={() => run('marcar_pendiente', '¿Marcar como pendiente de pago?')} icon={Clock}>Pendiente pago</Btn>
                <Btn onClick={() => run('cancelar_fin_periodo', '¿Programar cancelación al fin del periodo?')} icon={Ban}>Cancelar al vencer</Btn>
                <Btn onClick={() => run('suspender', '¿Suspender temporalmente?')} icon={Pause} tone="danger">Suspender</Btn>
                <Btn onClick={() => run('restaurar', '¿Restaurar Pro?')} icon={Play}>Restaurar</Btn>
                <Btn onClick={() => run('cancelar_ahora', '¿Cancelar inmediatamente? El propietario pasa a Normal.')} icon={Ban} tone="danger">Cancelar ahora</Btn>
                <Btn onClick={() => run('volver_normal', '¿Volver al plan Normal?')} icon={X} tone="danger">Volver a Normal</Btn>
              </>}
            </div>

            {/* Nota interna */}
            <div className="mt-4">
              <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Nota interna</label>
              <div className="flex gap-2 mt-1">
                <input value={note} onChange={e => setNote(e.target.value)} placeholder="Motivo, contexto…"
                  className="flex-1 rounded-xl px-3 py-2 text-sm" style={{ border: '1px solid var(--border-subtle)', fontSize: 16, color: 'var(--text-primary)', background: 'var(--bg-card)' }} />
                <Btn onClick={() => run('nota')} icon={FileText}>Guardar nota</Btn>
              </div>
            </div>
          </Card>

          {/* Historial de cambios (auditoría) */}
          <Card padding={false}>
            <div className="px-5 py-3 flex items-center gap-2" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              <History size={14} style={{ color: 'var(--text-muted)' }} />
              <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Historial de cambios</h3>
            </div>
            {data.audit.length === 0 ? (
              <p className="px-5 py-6 text-sm text-center" style={{ color: 'var(--text-muted)' }}>Sin cambios registrados.</p>
            ) : (
              <div className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
                {data.audit.map(a => (
                  <div key={a.id} className="px-5 py-2.5 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{ACTION_LABELS[a.action] ?? a.action}</div>
                      <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {subscriptionStyle(a.old_status).label} → {subscriptionStyle(a.new_status).label}{a.note ? ` · ${a.note}` : ''}
                      </div>
                    </div>
                    <span className="text-xs whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>{fmtDateTime(a.created_at)}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* ── Columna lateral ── */}
        <div className="space-y-5">
          <Card>
            <h3 className="text-sm font-bold mb-3" style={{ color: 'var(--text-primary)' }}>Espacios ({data.spaces.length})</h3>
            {data.spaces.length === 0 ? (
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Sin espacios.</p>
            ) : (
              <div className="space-y-1.5">
                {data.spaces.slice(0, 8).map(sp => (
                  <div key={sp.id} className="flex items-center gap-2 text-sm">
                    <Building2 size={12} style={{ color: 'var(--text-muted)' }} />
                    <span className="truncate flex-1" style={{ color: 'var(--text-secondary)' }}>{sp.name}</span>
                    {sp.is_published
                      ? <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(22,163,74,0.1)', color: '#16A34A' }}>Publicado</span>
                      : <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}>Borrador</span>}
                  </div>
                ))}
              </div>
            )}
            <div className="mt-3 pt-3 grid grid-cols-2 gap-2 text-center" style={{ borderTop: '1px solid var(--border-subtle)' }}>
              <div><div className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{data.bookingsCount}</div><div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Reservas Espot</div></div>
              <div><div className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{data.externalCount}</div><div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Eventos externos</div></div>
            </div>
            <div className="mt-2 text-xs text-center" style={{ color: 'var(--text-muted)' }}>Última actividad: {fmtDate(data.lastActivity)}</div>
          </Card>

          <Card padding={false}>
            <div className="px-5 py-3 flex items-center gap-2" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              <Bell size={14} style={{ color: 'var(--text-muted)' }} />
              <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Comunicaciones</h3>
            </div>
            {data.notifications.length === 0 ? (
              <p className="px-5 py-6 text-sm text-center" style={{ color: 'var(--text-muted)' }}>Ninguna enviada aún.</p>
            ) : (
              <div className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
                {data.notifications.slice(0, 10).map(n => (
                  <div key={n.id} className="px-5 py-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{n.event_type}</span>
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                        style={n.status === 'sent' ? { background: 'rgba(22,163,74,0.1)', color: '#16A34A' } : n.status === 'failed' ? { background: '#FEE2E2', color: '#B91C1C' } : { background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}>
                        {n.status === 'sent' ? 'Enviado' : n.status === 'failed' ? 'Falló' : 'Pendiente'}
                      </span>
                    </div>
                    <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{n.channel} · {fmtDateTime(n.sent_at ?? n.created_at)}</div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-[11px] font-medium uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{label}</div>
      <div className="text-sm font-semibold mt-0.5" style={{ color: 'var(--text-primary)' }}>{value}</div>
    </div>
  )
}
