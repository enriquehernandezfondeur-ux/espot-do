'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { getProOwners, type ProOwnersResult, type ProOwnerRow } from '@/lib/actions/admin-pro'
import { proAdminStyle } from '@/lib/statusConfig'
import { StatCard } from '@/components/ui/StatCard'
import { EmptyState } from '@/components/ui/EmptyState'
import { LoadError } from '@/components/LoadError'
import Pagination from '@/components/ui/Pagination'
import {
  Crown, Users, Gift, CheckCircle, Clock, AlertTriangle, XCircle,
  Search, Loader2, Building2, ChevronRight, Mail, Phone, Copy, Check, Download,
} from 'lucide-react'

const PAGE_SIZE = 25

type FilterKey =
  | 'all' | 'trial' | 'pro' | 'exp30' | 'exp14' | 'exp7' | 'exp3' | 'exp1'
  | 'expired' | 'pending' | 'cancelled' | 'normal'

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all',       label: 'Todos' },
  { key: 'trial',     label: 'Pruebas activas' },
  { key: 'pro',       label: 'Pro activos' },
  { key: 'exp30',     label: 'Vencen ≤30d' },
  { key: 'exp14',     label: '≤14d' },
  { key: 'exp7',      label: '≤7d' },
  { key: 'exp3',      label: '≤3d' },
  { key: 'exp1',      label: 'Mañana' },
  { key: 'expired',   label: 'Vencidos' },
  { key: 'pending',   label: 'Pendientes de pago' },
  { key: 'cancelled', label: 'Cancelados' },
  { key: 'normal',    label: 'Normal' },
]

function matchesFilter(o: ProOwnerRow, f: FilterKey): boolean {
  const d = o.daysLeft
  switch (f) {
    case 'all':       return true
    case 'trial':     return o.plan === 'pro' && o.sub?.status === 'trialing'
    case 'pro':       return o.plan === 'pro' && o.sub?.status === 'active'
    case 'exp30':     return o.plan === 'pro' && d != null && d <= 30
    case 'exp14':     return o.plan === 'pro' && d != null && d <= 14
    case 'exp7':      return o.plan === 'pro' && d != null && d <= 7
    case 'exp3':      return o.plan === 'pro' && d != null && d <= 3
    case 'exp1':      return o.plan === 'pro' && d != null && d <= 1
    case 'expired':   return o.plan === 'free' && !!o.sub && (o.sub.status === 'past_due' || o.sub.status === 'expired')
    case 'pending':   return o.sub?.status === 'pending_payment'
    case 'cancelled': return o.sub?.status === 'cancelled'
    case 'normal':    return !o.sub
  }
}

function daysLabel(o: ProOwnerRow): string {
  if (o.plan !== 'pro' || o.daysLeft == null) return '—'
  if (o.daysLeft === 0) return 'Vence hoy'
  if (o.daysLeft === 1) return 'Vence mañana'
  return `${o.daysLeft} días`
}

export default function AdminProPage() {
  const [data, setData]       = useState<ProOwnersResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [search, setSearch]   = useState('')
  const [filter, setFilter]   = useState<FilterKey>('all')
  const [page, setPage]       = useState(1)
  const [copied, setCopied]   = useState(false)

  function load() {
    setLoading(true); setLoadError(false)
    getProOwners()
      .then(d => { if (!d) { setLoadError(true) } else setData(d); setLoading(false) })
      .catch(() => { setLoadError(true); setLoading(false) })
  }
  useEffect(() => { load() }, [])

  const filtered = useMemo(() => {
    const owners = data?.owners ?? []
    const q = search.trim().toLowerCase()
    return owners.filter(o => {
      if (!matchesFilter(o, filter)) return false
      if (!q) return true
      return [o.full_name, o.email, o.phone].some(v => v?.toLowerCase().includes(q))
    })
  }, [data, search, filter])

  useEffect(() => { setPage(1) }, [search, filter])

  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  function copyEmails() {
    const emails = filtered.map(o => o.email).filter(Boolean).join(', ')
    navigator.clipboard.writeText(emails)
    setCopied(true); setTimeout(() => setCopied(false), 1500)
  }
  function exportCSV() {
    const rows = [['Nombre', 'Email', 'Teléfono', 'Plan', 'Estado', 'Días restantes', 'Espacios', 'Registro']]
    filtered.forEach(o => rows.push([
      o.full_name ?? '', o.email ?? '', o.phone ?? '',
      o.plan === 'pro' ? 'Pro' : 'Normal', proAdminStyle(o).label, daysLabel(o),
      String(o.publishedCount), o.created_at ? new Date(o.created_at).toLocaleDateString('es-DO') : '',
    ]))
    const csv = '﻿' + rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }))
    const a = document.createElement('a'); a.href = url; a.download = 'espot-pro-propietarios.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  const s = data?.stats

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Crown size={15} style={{ color: 'var(--pro)' }} />
          <span className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--pro)' }}>Suscripciones</span>
        </div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Espot Pro</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>Propietarios, planes y prueba gratuita</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3 mb-6">
        <StatCard label="Propietarios"   value={s?.total ?? 0}          icon={Users}        color="var(--text-secondary)" />
        <StatCard label="Normal"          value={s?.normal ?? 0}         icon={Users}        color="#6B7280" />
        <StatCard label="Pruebas activas" value={s?.trialsActive ?? 0}   icon={Gift}         color="#2563EB" />
        <StatCard label="Pro activos"     value={s?.proActive ?? 0}      icon={CheckCircle}  color="#16A34A" />
        <StatCard label="Pendientes pago" value={s?.pendingPayment ?? 0} icon={Clock}        color="#D97706" />
        <StatCard label="Vencen ≤7d"      value={s?.expiringSoon ?? 0}   icon={AlertTriangle} color="#F59E0B" />
        <StatCard label="Vencidos"        value={s?.expired ?? 0}        icon={XCircle}      color="#DC2626" />
      </div>

      {/* Búsqueda + acciones masivas */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <div className="flex items-center gap-2 flex-1 min-w-[220px] px-3 py-2 rounded-xl"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
          <Search size={15} style={{ color: 'var(--text-muted)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Nombre, correo o teléfono…"
            className="flex-1 bg-transparent text-sm focus:outline-none" style={{ fontSize: 16, color: 'var(--text-primary)' }} />
          {search && <button onClick={() => setSearch('')}><XCircle size={15} style={{ color: 'var(--text-muted)' }} /></button>}
        </div>
        <button onClick={copyEmails}
          className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
          {copied ? <Check size={13} style={{ color: 'var(--brand)' }} /> : <Copy size={13} />} Copiar correos
        </button>
        <button onClick={exportCSV}
          className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
          <Download size={13} /> Exportar CSV
        </button>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-1.5 mb-4">
        {FILTERS.map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className="text-xs font-semibold px-3 py-1.5 rounded-full transition-all"
            style={filter === f.key
              ? { background: 'var(--brand)', color: '#fff' }
              : { background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Tabla */}
      <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-card)' }}>
        <div className="overflow-x-auto scrollbar-hide">
          <div className="grid gap-3 px-5 py-3 text-[11px] font-bold uppercase tracking-widest"
            style={{ gridTemplateColumns: '2fr 1fr 0.8fr 1.1fr 1fr 0.6fr', minWidth: 760, background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
            <span>Propietario</span><span>Contacto</span><span>Espacios</span><span>Estado</span><span>Días</span><span></span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16"><Loader2 size={24} className="animate-spin" style={{ color: 'var(--brand)' }} /></div>
          ) : loadError ? (
            <LoadError message="No pudimos cargar los propietarios." onRetry={load} />
          ) : filtered.length === 0 ? (
            <EmptyState icon={Crown} title="Sin resultados" subtitle="Ajusta el filtro o la búsqueda." />
          ) : (
            <div className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
              {paginated.map(o => {
                const st = proAdminStyle(o)
                return (
                  <Link key={o.id} href={`/admin/pro/${o.id}`}
                    className="grid gap-3 px-5 py-3.5 items-center hover:bg-[var(--bg-elevated)] transition-colors"
                    style={{ gridTemplateColumns: '2fr 1fr 0.8fr 1.1fr 1fr 0.6fr', minWidth: 760 }}>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{o.full_name ?? '—'}</div>
                      <div className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                        {o.created_at ? `Desde ${new Date(o.created_at).toLocaleDateString('es-DO', { month: 'short', year: 'numeric' })}` : ''}
                      </div>
                    </div>
                    <div className="min-w-0 text-xs" style={{ color: 'var(--text-secondary)' }}>
                      {o.email && <div className="flex items-center gap-1 truncate"><Mail size={10} className="shrink-0" />{o.email}</div>}
                      {o.phone && <div className="flex items-center gap-1 truncate mt-0.5"><Phone size={10} className="shrink-0" />{o.phone}</div>}
                    </div>
                    <div className="flex items-center gap-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
                      <Building2 size={12} style={{ color: 'var(--text-muted)' }} /> {o.publishedCount}
                    </div>
                    <div>
                      <span className="inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: st.bg, color: st.color }}>{st.label}</span>
                    </div>
                    <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>{daysLabel(o)}</div>
                    <div className="flex justify-end"><ChevronRight size={16} style={{ color: 'var(--text-muted)' }} /></div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {!loading && !loadError && filtered.length > 0 && (
        <div className="mt-4"><Pagination page={page} total={filtered.length} pageSize={PAGE_SIZE} onChange={setPage} /></div>
      )}
    </div>
  )
}
