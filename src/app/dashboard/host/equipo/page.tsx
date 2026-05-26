'use client'

import { useState, useEffect } from 'react'
import { getTeamMembers, inviteTeamMember, revokeTeamMember } from '@/lib/actions/host'
import { formatDate } from '@/lib/utils'
import { UserPlus, Loader2, Check, X, Users, Mail, Shield, Eye, Crown } from 'lucide-react'
import type { TeamRole } from '@/types'

const ROLE_CONFIG: Record<TeamRole, { label: string; desc: string; color: string; bg: string; icon: any }> = {
  admin:       { label: 'Admin',       desc: 'Acceso completo excepto facturación', color: '#7C3AED', bg: 'rgba(124,58,237,0.08)', icon: Shield },
  coordinador: { label: 'Coordinador', desc: 'Reservas, eventos y mensajes',        color: '#2563EB', bg: 'rgba(37,99,235,0.08)',  icon: Users },
  viewer:      { label: 'Visualizador',desc: 'Solo puede ver, no editar',           color: '#6B7280', bg: 'rgba(107,114,128,0.08)', icon: Eye },
}

export default function EquipoPage() {
  const [members,  setMembers]  = useState<any[]>([])
  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState(false)
  const [toast,    setToast]    = useState<{ msg: string; ok: boolean } | null>(null)
  const [form,     setForm]     = useState({ email: '', role: 'coordinador' as TeamRole })

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3500)
  }

  useEffect(() => {
    getTeamMembers().then(d => { setMembers(d); setLoading(false) })
  }, [])

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    if (!form.email.trim()) return
    setSaving(true)
    const r = await inviteTeamMember(form.email.trim(), form.role)
    if ('error' in r) {
      showToast(r.error ?? 'Error al enviar la invitación', false)
    } else {
      showToast(`Invitación enviada a ${form.email}`, true)
      setForm({ email: '', role: 'coordinador' })
      // Refresh list
      const updated = await getTeamMembers()
      setMembers(updated)
    }
    setSaving(false)
  }

  async function handleRevoke(memberId: string | undefined, email: string) {
    if (!memberId) return
    if (!confirm(`¿Revocar acceso a ${email}?`)) return
    setSaving(true)
    const r = await revokeTeamMember(memberId)
    if ('error' in r) {
      showToast(r.error ?? 'Error al revocar acceso', false)
    } else {
      showToast('Acceso revocado', true)
      setMembers(prev => prev.map(m => m.id === memberId ? { ...m, status: 'inactive' } : m))
    }
    setSaving(false)
  }

  const activeMembers  = members.filter(m => m.status === 'active')
  const pendingMembers = members.filter(m => m.status === 'pending')

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      {toast && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold shadow-xl"
          style={{ background: toast.ok ? '#16A34A' : '#DC2626', color: '#fff' }}>
          {toast.ok ? <Check size={14} /> : <X size={14} />} {toast.msg}
        </div>
      )}

      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
          <Users size={22} style={{ color: 'var(--brand)' }} />
          Equipo
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          Invita personas de confianza para gestionar tu espacio contigo.
        </p>
      </div>

      {/* Invite form */}
      <div className="rounded-2xl overflow-hidden mb-6"
        style={{ background: '#fff', border: '1px solid var(--border-subtle)', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
        <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <div className="font-semibold text-sm flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <UserPlus size={15} style={{ color: 'var(--brand)' }} /> Invitar miembro
          </div>
        </div>
        <form onSubmit={handleInvite} className="p-5 space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Email del miembro</label>
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl" style={{ border: '1.5px solid #E8ECF0' }}>
              <Mail size={14} className="text-gray-400 shrink-0" />
              <input
                type="email"
                required
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="nombre@ejemplo.com"
                className="bg-transparent text-sm flex-1 focus:outline-none"
                style={{ fontSize: 16, color: 'var(--text-primary)' }}
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Rol</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {(Object.entries(ROLE_CONFIG) as [TeamRole, typeof ROLE_CONFIG[TeamRole]][]).map(([role, cfg]) => {
                const Icon = cfg.icon
                return (
                  <button key={role} type="button"
                    onClick={() => setForm(f => ({ ...f, role }))}
                    className="flex sm:flex-col items-center gap-2 sm:gap-1.5 p-3 rounded-xl text-left sm:text-center transition-all"
                    style={form.role === role
                      ? { background: cfg.bg, border: `1.5px solid ${cfg.color}40`, color: cfg.color }
                      : { background: '#F8FAFB', border: '1.5px solid #E8ECF0', color: '#6B7280' }}>
                    <Icon size={14} className="shrink-0" />
                    <div className="flex-1 sm:flex-none">
                      <div className="text-xs font-semibold">{cfg.label}</div>
                      <div className="text-[10px] leading-tight mt-0.5" style={{ color: form.role === role ? cfg.color : '#9CA3AF' }}>{cfg.desc}</div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          <button type="submit" disabled={saving}
            className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50"
            style={{ background: 'var(--brand)' }}>
            {saving ? <Loader2 size={14} className="animate-spin mx-auto" /> : 'Enviar invitación'}
          </button>
        </form>
      </div>

      {/* Members list */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--brand)' }} />
        </div>
      ) : (
        <>
          {activeMembers.length > 0 && (
            <MemberSection title="Miembros activos" members={activeMembers} onRevoke={handleRevoke} saving={saving} />
          )}
          {pendingMembers.length > 0 && (
            <MemberSection title="Invitaciones pendientes" members={pendingMembers} onRevoke={handleRevoke} saving={saving} isPending />
          )}
          {members.length === 0 && (
            <div className="text-center py-12 rounded-2xl"
              style={{ background: '#fff', border: '1px solid var(--border-subtle)' }}>
              <Users size={28} className="mx-auto mb-3 text-gray-200" />
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Aún no tienes miembros en tu equipo.</p>
            </div>
          )}
        </>
      )}

      {/* Permission matrix */}
      <div className="mt-6 rounded-2xl overflow-hidden"
        style={{ background: '#fff', border: '1px solid var(--border-subtle)' }}>
        <div className="px-5 py-3 text-sm font-semibold" style={{ color: 'var(--text-primary)', borderBottom: '1px solid var(--border-subtle)' }}>
          Matriz de permisos
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr style={{ borderBottom: '1px solid #F0F2F5', background: '#FAFBFC' }}>
                <th className="px-5 py-3 text-left font-semibold text-gray-400">Acción</th>
                {(Object.entries(ROLE_CONFIG) as [TeamRole, any][]).map(([role, cfg]) => (
                  <th key={role} className="px-4 py-3 text-center font-semibold" style={{ color: cfg.color }}>{cfg.label}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0F2F5]">
              {[
                ['Ver reservas y calendario', true, true, true],
                ['Gestionar reservas (aceptar/rechazar)', true, true, false],
                ['Ver y responder mensajes', true, true, false],
                ['Crear y editar eventos', true, true, false],
                ['Ver finanzas y pagos', true, false, false],
                ['Gestionar espacios y precios', true, false, false],
                ['Gestionar equipo', false, false, false],
                ['Facturación y cuenta bancaria', false, false, false],
              ].map(([action, admin, coord, viewer], i) => (
                <tr key={i}>
                  <td className="px-5 py-2.5 text-gray-600">{action as string}</td>
                  {[admin, coord, viewer].map((has, j) => (
                    <td key={j} className="px-4 py-2.5 text-center">
                      {has
                        ? <Check size={13} className="mx-auto" style={{ color: '#16A34A' }} />
                        : <X size={11} className="mx-auto text-gray-200" />}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function MemberSection({ title, members, onRevoke, saving, isPending = false }: {
  title: string
  members: any[]
  onRevoke: (id: string | undefined, email: string) => void
  saving: boolean
  isPending?: boolean
}) {
  return (
    <div className="rounded-2xl overflow-hidden mb-4"
      style={{ background: '#fff', border: '1px solid var(--border-subtle)' }}>
      <div className="px-5 py-3 text-xs font-semibold uppercase tracking-widest"
        style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border-subtle)', background: '#FAFBFC' }}>
        {title}
      </div>
      <div className="divide-y divide-[#F0F2F5]">
        {members.map(m => {
          const role = m.role as TeamRole
          const cfg = ROLE_CONFIG[role] ?? ROLE_CONFIG.viewer
          const Icon = cfg.icon
          const name = m.member?.full_name ?? m.invite_email
          const email = m.member?.email ?? m.invite_email

          return (
            <div key={m.id} className="px-5 py-4 flex items-center gap-4">
              <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm shrink-0"
                style={{ background: cfg.bg, color: cfg.color }}>
                {name?.[0]?.toUpperCase() ?? '?'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm truncate" style={{ color: 'var(--text-primary)' }}>{name}</div>
                <div className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{email}</div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="hidden sm:flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full"
                  style={{ background: cfg.bg, color: cfg.color }}>
                  <Icon size={10} /> {cfg.label}
                </span>
                {isPending && (
                  <span className="text-xs px-2 py-1 rounded-full font-medium"
                    style={{ background: 'rgba(217,119,6,0.1)', color: '#D97706' }}>
                    Pendiente
                  </span>
                )}
                <button
                  onClick={() => onRevoke(m.id, email)}
                  disabled={saving}
                  className="p-1.5 rounded-lg text-gray-300 hover:text-red-400 hover:bg-red-50 transition-all disabled:opacity-40">
                  <X size={13} />
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
