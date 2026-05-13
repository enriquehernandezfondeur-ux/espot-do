'use client'

import { useState, useEffect } from 'react'
import { getAdminUsers, updateUserRole } from '@/lib/actions/admin'
import { Search, Shield, Building2, User, Loader2, Download, Copy, Check, Users, ExternalLink, Mail } from 'lucide-react'

const roleConfig: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  guest: { label: 'Cliente',      color: '#2563EB', bg: 'rgba(37,99,235,0.08)', icon: User },
  host:  { label: 'Propietario',  color: '#16A34A', bg: 'rgba(22,163,74,0.08)', icon: Building2 },
  admin: { label: 'Admin',        color: '#DC2626', bg: 'rgba(220,38,38,0.08)', icon: Shield },
}

function fmtDate(d: string) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('es-DO', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function AdminUsersPage() {
  const [users,    setUsers]    = useState<any[]>([])
  const [loading,  setLoading]  = useState(true)
  const [filter,   setFilter]   = useState('all')
  const [search,   setSearch]   = useState('')
  const [updating, setUpdating] = useState<string | null>(null)
  const [toast,    setToast]    = useState<{ msg: string; ok: boolean } | null>(null)
  const [copied,   setCopied]   = useState(false)

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3500)
  }

  useEffect(() => {
    getAdminUsers({ role: filter === 'all' ? undefined : filter })
      .then(d => { setUsers(d); setLoading(false) })
  }, [filter])

  const filtered = users.filter(u =>
    (u.full_name ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (u.email ?? '').toLowerCase().includes(search.toLowerCase())
  )

  // ── Estadísticas rápidas ─────────────────────────────
  const stats = {
    total:  users.length,
    guests: users.filter(u => u.role === 'guest').length,
    hosts:  users.filter(u => u.role === 'host').length,
    admins: users.filter(u => u.role === 'admin').length,
  }

  // ── Copiar todos los emails del filtro actual ─────────
  function copyEmails() {
    const emails = filtered.map(u => u.email).filter(Boolean).join(', ')
    navigator.clipboard.writeText(emails).then(() => {
      setCopied(true)
      showToast(`${filtered.length} email${filtered.length !== 1 ? 's' : ''} copiado${filtered.length !== 1 ? 's' : ''} al portapapeles`, true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  // ── Exportar CSV ──────────────────────────────────────
  function exportCSV() {
    const headers = ['Nombre', 'Email', 'Rol', 'Teléfono', 'Fecha de registro']
    const rows = filtered.map(u => [
      u.full_name  ?? '',
      u.email      ?? '',
      roleConfig[u.role]?.label ?? u.role ?? '',
      u.phone      ?? '',
      u.created_at ? new Date(u.created_at).toLocaleDateString('es-DO') : '',
    ])
    const csv  = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url
    a.download = `espothub-usuarios-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
    showToast(`CSV exportado con ${filtered.length} usuarios`, true)
  }

  // ── Cambio de rol ─────────────────────────────────────
  async function handleRoleChange(userId: string, role: string) {
    const label = roleConfig[role]?.label ?? role
    if (!window.confirm(`¿Cambiar el rol de este usuario a "${label}"?`)) return
    setUpdating(userId)
    const result = await updateUserRole(userId, role)
    if ('error' in result) {
      showToast(`Error: ${result.error}`, false)
    } else {
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role } : u))
      showToast(`Rol cambiado a ${label}`, true)
    }
    setUpdating(null)
  }

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      {toast && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold shadow-xl"
          style={{ background: toast.ok ? '#16A34A' : '#DC2626', color: '#fff' }}>
          {toast.ok ? '✓' : '✕'} {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#0F1623', letterSpacing: '-0.02em' }}>Usuarios</h1>
          <p className="text-sm text-slate-500 mt-0.5">{stats.total} registros en total</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Copiar emails */}
          <button onClick={copyEmails} disabled={filtered.length === 0}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl transition-all disabled:opacity-40"
            style={{ background: '#fff', border: '1px solid #E8ECF0', color: '#374151' }}
            title="Copia todos los emails del filtro actual">
            {copied ? <Check size={13} style={{ color: '#16A34A' }} /> : <Copy size={13} />}
            Copiar emails
          </button>
          {/* Exportar CSV */}
          <button onClick={exportCSV} disabled={filtered.length === 0}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl transition-all disabled:opacity-40"
            style={{ background: '#fff', border: '1px solid #E8ECF0', color: '#374151' }}>
            <Download size={13} /> Exportar CSV
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Total',          value: stats.total,  color: '#0F1623', icon: Users },
          { label: 'Clientes',       value: stats.guests, color: '#2563EB', icon: User },
          { label: 'Propietarios',   value: stats.hosts,  color: '#16A34A', icon: Building2 },
          { label: 'Admins',         value: stats.admins, color: '#DC2626', icon: Shield },
        ].map(({ label, value, color, icon: Icon }) => (
          <div key={label} className="rounded-2xl p-4"
            style={{ background: '#fff', border: '1px solid #E8ECF0' }}>
            <div className="flex items-center gap-2 mb-1">
              <Icon size={13} style={{ color }} />
              <span className="text-xs text-slate-400 font-medium">{label}</span>
            </div>
            <div className="text-2xl font-bold" style={{ color, letterSpacing: '-0.03em' }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Nota de entregabilidad */}
      <div className="flex items-start gap-3 rounded-2xl px-4 py-3.5 mb-5"
        style={{ background: 'rgba(37,99,235,0.05)', border: '1px solid rgba(37,99,235,0.15)' }}>
        <Mail size={14} style={{ color: '#2563EB', flexShrink: 0, marginTop: 1 }} />
        <div className="text-xs" style={{ color: '#1E40AF' }}>
          <span className="font-semibold">Para monitorear entregabilidad de emails</span> (aperturas, rebotes, spam): ve a{' '}
          <a href="https://resend.com/emails" target="_blank" rel="noopener noreferrer"
            className="underline font-semibold inline-flex items-center gap-0.5">
            resend.com/emails <ExternalLink size={10} />
          </a>
          {' '}— ahí verás cada email enviado con su estado en tiempo real.
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 mb-4">
        <div className="flex gap-1 p-1 rounded-xl overflow-x-auto scrollbar-hide shrink-0"
          style={{ background: '#fff', border: '1px solid #E8ECF0' }}>
          {[{ value: 'all', label: 'Todos' }, { value: 'guest', label: 'Clientes' }, { value: 'host', label: 'Propietarios' }, { value: 'admin', label: 'Admins' }].map(f => (
            <button key={f.value} onClick={() => { setFilter(f.value); setLoading(true) }}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap shrink-0"
              style={filter === f.value ? { background: '#0F1623', color: '#fff' } : { color: '#6B7280' }}>
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 flex-1 px-4 py-2.5 rounded-xl"
          style={{ background: '#fff', border: '1px solid #E8ECF0' }}>
          <Search size={15} className="text-slate-400 shrink-0" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nombre o email..."
            className="bg-transparent text-sm flex-1 focus:outline-none text-slate-700 placeholder-slate-400"
            style={{ fontSize: 16 }} />
          {search && (
            <span className="text-xs text-slate-400">{filtered.length} resultado{filtered.length !== 1 ? 's' : ''}</span>
          )}
        </div>
      </div>

      {/* Tabla */}
      <div className="rounded-2xl overflow-hidden" style={{ background: '#fff', border: '1px solid #E8ECF0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
        <div className="overflow-x-auto scrollbar-hide">
          <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-4 px-5 py-3 text-xs font-semibold uppercase tracking-widest text-slate-400 min-w-[700px]"
            style={{ borderBottom: '1px solid #F0F2F5', background: '#FAFBFC' }}>
            <span>Usuario</span><span>Rol</span><span>Teléfono</span><span>Registro</span><span>Cambiar rol</span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--brand)' }} />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-slate-400 text-sm">Sin usuarios</div>
          ) : (
            <div className="divide-y divide-[#F0F2F5]">
              {filtered.map(user => {
                const rc = roleConfig[user.role] ?? roleConfig.guest
                const Icon = rc.icon
                return (
                  <div key={user.id} className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-4 items-center px-5 py-4 hover:bg-slate-50 transition-colors min-w-[700px]">

                    {/* Usuario */}
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm text-white shrink-0"
                        style={{ background: 'linear-gradient(135deg, var(--brand), var(--brand-dark))' }}>
                        {user.full_name?.charAt(0)?.toUpperCase() ?? '?'}
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-sm truncate" style={{ color: '#0F1623' }}>
                          {user.full_name ?? 'Sin nombre'}
                        </div>
                        <button
                          onClick={() => { navigator.clipboard.writeText(user.email ?? ''); showToast('Email copiado', true) }}
                          className="text-xs text-left truncate max-w-full hover:underline transition-all"
                          style={{ color: '#6B7280' }}
                          title="Click para copiar email">
                          {user.email}
                        </button>
                      </div>
                    </div>

                    {/* Rol */}
                    <div className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full w-fit"
                      style={{ background: rc.bg, color: rc.color }}>
                      <Icon size={11} /> {rc.label}
                    </div>

                    {/* Teléfono */}
                    <div className="text-sm text-slate-500">{user.phone ?? '—'}</div>

                    {/* Fecha de registro */}
                    <div className="text-xs text-slate-400">{fmtDate(user.created_at)}</div>

                    {/* Cambiar rol */}
                    <div className="flex items-center gap-1">
                      {Object.entries(roleConfig).map(([role, cfg]) => (
                        <button key={role}
                          onClick={() => handleRoleChange(user.id, role)}
                          disabled={updating === user.id || user.role === role}
                          className="text-xs px-3 py-2 rounded-lg font-medium transition-all disabled:opacity-40"
                          style={user.role === role
                            ? { background: cfg.bg, color: cfg.color }
                            : { background: '#F4F6F8', color: '#9CA3AF' }}>
                          {updating === user.id ? '...' : cfg.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Footer con conteo */}
      {!loading && filtered.length > 0 && (
        <p className="text-xs text-center mt-3" style={{ color: '#94A3B8' }}>
          Mostrando {filtered.length} de {users.length} usuario{users.length !== 1 ? 's' : ''}
          {search && ` · búsqueda: "${search}"`}
        </p>
      )}
    </div>
  )
}
