'use client'

import { useState, useEffect } from 'react'
import { getAdminUsers, updateUserRole } from '@/lib/actions/admin'
import { Search, Shield, Building2, User, Loader2, ChevronDown } from 'lucide-react'

const roleConfig: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  guest: { label: 'Cliente',      color: '#2563EB', bg: 'rgba(37,99,235,0.08)', icon: User },
  host:  { label: 'Propietario',  color: '#16A34A', bg: 'rgba(22,163,74,0.08)', icon: Building2 },
  admin: { label: 'Admin',        color: '#DC2626', bg: 'rgba(220,38,38,0.08)', icon: Shield },
}

export default function AdminUsersPage() {
  const [users, setUsers]     = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter]   = useState('all')
  const [search, setSearch]   = useState('')
  const [updating, setUpdating] = useState<string | null>(null)

  useEffect(() => {
    getAdminUsers({ role: filter === 'all' ? undefined : filter })
      .then(d => { setUsers(d); setLoading(false) })
  }, [filter])

  const filtered = users.filter(u =>
    (u.full_name ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (u.email ?? '').toLowerCase().includes(search.toLowerCase())
  )

  async function handleRoleChange(userId: string, role: string) {
    setUpdating(userId)
    await updateUserRole(userId, role)
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, role } : u))
    setUpdating(null)
  }

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold" style={{ color: '#0F1623', letterSpacing: '-0.02em' }}>Usuarios</h1>
        <p className="text-sm text-slate-500 mt-0.5">{users.length} usuarios registrados</p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex gap-1 p-1 rounded-xl" style={{ background: '#fff', border: '1px solid #E8ECF0' }}>
          {[{ value: 'all', label: 'Todos' }, { value: 'guest', label: 'Clientes' }, { value: 'host', label: 'Propietarios' }, { value: 'admin', label: 'Admins' }].map(f => (
            <button key={f.value} onClick={() => { setFilter(f.value); setLoading(true) }}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
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
            className="bg-transparent text-sm flex-1 focus:outline-none text-slate-700 placeholder-slate-400" />
        </div>
      </div>

      <div className="rounded-2xl overflow-hidden" style={{ background: '#fff', border: '1px solid #E8ECF0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
        <div className="grid grid-cols-[2fr_1fr_1fr_1fr] gap-4 px-5 py-3 text-xs font-semibold uppercase tracking-widest text-slate-400"
          style={{ borderBottom: '1px solid #F0F2F5', background: '#FAFBFC' }}>
          <span>Usuario</span><span>Rol</span><span>Teléfono</span><span>Cambiar rol</span>
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
                <div key={user.id} className="grid grid-cols-[2fr_1fr_1fr_1fr] gap-4 items-center px-5 py-4 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm text-white shrink-0"
                      style={{ background: 'linear-gradient(135deg, var(--brand), var(--brand-dark))' }}>
                      {user.full_name?.charAt(0)?.toUpperCase() ?? '?'}
                    </div>
                    <div>
                      <div className="font-semibold text-sm" style={{ color: '#0F1623' }}>{user.full_name ?? 'Sin nombre'}</div>
                      <div className="text-xs text-slate-400">{user.email}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full w-fit"
                    style={{ background: rc.bg, color: rc.color }}>
                    <Icon size={11} /> {rc.label}
                  </div>

                  <div className="text-sm text-slate-500">{user.phone ?? '—'}</div>

                  <div className="flex items-center gap-1">
                    {Object.entries(roleConfig).map(([role, cfg]) => (
                      <button key={role}
                        onClick={() => handleRoleChange(user.id, role)}
                        disabled={updating === user.id || user.role === role}
                        className="text-xs px-2.5 py-1.5 rounded-lg font-medium transition-all disabled:opacity-40"
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
  )
}
