'use client'

import { useState, useEffect, useRef } from 'react'
import { getUnifiedClients, createClient_, updateClient, deleteClient, getClientWithHistory, getEspotGuestHistory } from '@/lib/actions/clients'
import { formatCurrency, formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'
import {
  Search, Plus, Users, Phone, Mail, Building2, Tag, Loader2,
  CalendarDays, DollarSign, ChevronRight, X, Check, Trash2, Pencil,
  Download, Copy, MessageCircle,
} from 'lucide-react'
import type { HostClient, ClientSource } from '@/types'
import Pagination from '@/components/ui/Pagination'

const PAGE_SIZE = 25

const SOURCE_LABELS: Record<ClientSource, string> = {
  espot:    'Espot',
  manual:   'Directo',
  referido: 'Referido',
  redes:    'Redes sociales',
  otro:     'Otro',
}

const SOURCE_COLORS: Record<ClientSource, { bg: string; color: string }> = {
  espot:    { bg: 'rgba(53,196,147,0.1)',  color: '#16A34A' },
  manual:   { bg: 'rgba(15,22,35,0.06)',   color: '#6B7280' },
  referido: { bg: 'rgba(124,58,237,0.1)',  color: '#7C3AED' },
  redes:    { bg: 'rgba(37,99,235,0.1)',   color: '#2563EB' },
  otro:     { bg: 'rgba(217,119,6,0.1)',   color: '#D97706' },
}

const EVENT_STATUS_LABELS: Record<string, string> = {
  pendiente:  'Pendiente',
  confirmado: 'Confirmado',
  en_curso:   'En curso',
  completado: 'Completado',
  cancelado:  'Cancelado',
  // bookings
  pending:         'Pendiente',
  accepted:        'Por pagar',
  confirmed:       'Confirmado',
  completed:       'Completado',
  cancelled_guest: 'Cancelado',
  cancelled_host:  'Cancelado',
}

type ClientHistory = Awaited<ReturnType<typeof getClientWithHistory>>

export default function ClientesPage() {
  const [clients,  setClients]  = useState<HostClient[]>([])
  const [loading,  setLoading]  = useState(true)
  const [search,   setSearch]   = useState('')
  const [selected, setSelected] = useState<HostClient | null>(null)
  const [history,  setHistory]  = useState<ClientHistory>(null)
  // En móvil el panel queda debajo de la lista: al seleccionar, llévalo a la vista
  const detailRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (selected && typeof window !== 'undefined' && window.innerWidth < 1024)
      detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [selected])
  const [histLoading, setHistLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editing,  setEditing]  = useState<HostClient | null>(null)
  const [saving,   setSaving]   = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [toast,    setToast]    = useState<{ msg: string; ok: boolean } | null>(null)
  const [copied,   setCopied]   = useState(false)
  const [page,     setPage]     = useState(1)

  // Form state
  const [form, setForm] = useState({
    full_name: '', email: '', phone: '', company: '', notes: '',
    tags: '', source: 'manual' as ClientSource,
  })

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3000)
  }

  useEffect(() => {
    setLoading(true)
    getUnifiedClients().then(d => { setClients(d); setLoading(false) })
  }, [])

  useEffect(() => {
    if (!selected) { setHistory(null); return }
    setHistLoading(true)
    const loader = (selected as any)._is_espot_guest
      ? getEspotGuestHistory(selected.id)
      : getClientWithHistory(selected.id)
    loader.then(d => { setHistory(d); setHistLoading(false) })
  }, [selected])

  function openCreateForm() {
    setEditing(null)
    setForm({ full_name: '', email: '', phone: '', company: '', notes: '', tags: '', source: 'manual' })
    setShowForm(true)
  }

  function openEditForm(c: HostClient) {
    setEditing(c)
    setForm({
      full_name: c.full_name,
      email:     c.email ?? '',
      phone:     c.phone ?? '',
      company:   c.company ?? '',
      notes:     c.notes ?? '',
      tags:      c.tags?.join(', ') ?? '',
      source:    c.source,
    })
    setShowForm(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.full_name.trim()) return
    setSaving(true)

    const tags = form.tags.split(',').map(t => t.trim()).filter(Boolean)
    const payload = { ...form, tags }

    if (editing) {
      const r = await updateClient({ id: editing.id, ...payload })
      if ('error' in r) { showToast(r.error ?? 'Error', false) }
      else {
        setClients(prev => prev.map(c => c.id === editing.id ? { ...c, ...payload } : c))
        if (selected?.id === editing.id) setSelected(s => s ? { ...s, ...payload } : s)
        showToast('Cliente actualizado', true)
        setShowForm(false)
      }
    } else {
      const r = await createClient_(payload)
      if ('error' in r) { showToast(r.error ?? 'Error', false) }
      else {
        setClients(prev => [r.data as HostClient, ...prev])
        showToast('Cliente creado', true)
        setShowForm(false)
      }
    }
    setSaving(false)
  }

  async function handleDelete(clientId: string) {
    if (!confirm('¿Eliminar este cliente? Los eventos vinculados no se eliminarán.')) return
    setDeleting(clientId)
    const r = await deleteClient(clientId)
    if ('error' in r) { showToast(r.error ?? 'Error', false) }
    else {
      setClients(prev => prev.filter(c => c.id !== clientId))
      if (selected?.id === clientId) setSelected(null)
      showToast('Cliente eliminado', true)
    }
    setDeleting(null)
  }

  const filtered = clients.filter(c =>
    c.full_name.toLowerCase().includes(search.toLowerCase()) ||
    (c.email ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (c.phone ?? '').includes(search) ||
    (c.company ?? '').toLowerCase().includes(search.toLowerCase())
  )
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { setPage(1) }, [search])

  const withPhone = filtered.filter(c => c.phone).length
  const withEmail = filtered.filter(c => c.email).length

  function exportCSV() {
    const headers = ['Nombre', 'Teléfono', 'Email', 'Empresa', 'Origen', 'Etiquetas']
    const rows = filtered.map(c => [
      c.full_name,
      c.phone ?? '',
      c.email ?? '',
      c.company ?? '',
      SOURCE_LABELS[c.source],
      c.tags?.join('; ') ?? '',
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
    const csv  = [headers.join(','), ...rows].join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
    const a    = document.createElement('a')
    a.href     = URL.createObjectURL(blob)
    a.download = `clientes-espot-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  async function copyPhones() {
    const phones = filtered.filter(c => c.phone).map(c => c.phone!).join('\n')
    if (!phones) return
    await navigator.clipboard.writeText(phones)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      {/* Toast */}
      {toast && (
        <div className="fixed top-16 right-4 md:top-5 md:right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold shadow-xl"
          style={{ background: toast.ok ? '#16A34A' : '#DC2626', color: '#fff' }}>
          {toast.ok ? <Check size={14} /> : <X size={14} />} {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Clientes</h1>
          <p className="text-sm text-gray-500 mt-0.5">{clients.length} registrados</p>
        </div>
        <button onClick={openCreateForm}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all active:scale-95 shrink-0"
          style={{ background: 'var(--brand)' }}>
          <Plus size={15} /> Nuevo cliente
        </button>
      </div>

      {/* Cobertura de datos */}
      {clients.length > 0 && (
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl mb-3 text-xs"
          style={{ background: 'rgba(53,196,147,0.06)', border: '1px solid rgba(53,196,147,0.15)' }}>
          <span style={{ color: '#16A34A' }} className="font-semibold">Listos para campaña:</span>
          <span className="flex items-center gap-1 text-gray-600"><Phone size={11} /> {withPhone} con teléfono</span>
          <span className="flex items-center gap-1 text-gray-600"><Mail size={11} /> {withEmail} con email</span>
        </div>
      )}

      {/* Search + acciones */}
      <div className="flex flex-col sm:flex-row gap-2 mb-5">
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl flex-1"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
          <Search size={15} className="text-gray-400 shrink-0" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nombre, email, teléfono o empresa..."
            className="bg-transparent text-sm flex-1 focus:outline-none text-gray-700 placeholder-gray-400"
            style={{ fontSize: 16 }} />
          {search && (
            <button onClick={() => setSearch('')} className="text-gray-400 hover:text-gray-600">
              <X size={14} />
            </button>
          )}
        </div>
        <div className="flex gap-2 shrink-0">
          <button onClick={copyPhones} disabled={withPhone === 0}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all disabled:opacity-40"
            style={{ background: copied ? '#16A34A' : 'var(--bg-card)', color: copied ? '#fff' : 'var(--text-muted)', border: '1px solid var(--border-subtle)' }}
            title="Copiar todos los teléfonos">
            {copied ? <Check size={13} /> : <Copy size={13} />}
            {copied ? 'Copiados' : `${withPhone} tel.`}
          </button>
          <button onClick={exportCSV} disabled={filtered.length === 0}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all disabled:opacity-40"
            style={{ background: 'var(--bg-card)', color: 'var(--text-muted)', border: '1px solid var(--border-subtle)' }}
            title="Exportar lista a CSV">
            <Download size={13} /> CSV
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:grid lg:grid-cols-[1fr_380px] gap-5 items-start">
        {/* Lista */}
        <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--brand)' }} />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16">
              <Users size={32} className="mx-auto mb-3 text-gray-200" />
              <p className="text-sm text-gray-400">
                {search ? 'Sin resultados para esa búsqueda' : 'Aún no tienes clientes registrados'}
              </p>
              {!search && (
                <button onClick={openCreateForm}
                  className="mt-3 text-sm font-semibold" style={{ color: 'var(--brand)' }}>
                  Agregar el primero
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-[var(--border-subtle)]">
              {paginated.map(c => {
                const sc = SOURCE_COLORS[c.source] ?? SOURCE_COLORS.manual
                return (
                  <button key={c.id}
                    onClick={() => setSelected(selected?.id === c.id ? null : c)}
                    className={cn('w-full flex items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-slate-50',
                      selected?.id === c.id && 'bg-slate-50'
                    )}>
                    {/* Avatar */}
                    <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-sm font-bold text-white"
                      style={{ background: 'var(--brand)' }}>
                      {c.full_name.charAt(0).toUpperCase()}
                    </div>
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm truncate" style={{ color: 'var(--text-primary)' }}>
                        {c.full_name}
                      </div>
                      <div className="text-xs text-gray-400 truncate">
                        {c.email || c.phone || c.company || '—'}
                      </div>
                    </div>
                    {/* Source badge */}
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full shrink-0"
                      style={{ background: sc.bg, color: sc.color }}>
                      {SOURCE_LABELS[c.source]}
                    </span>
                    {c.phone && (
                      <a href={`https://wa.me/${c.phone.replace(/[^0-9]/g, '')}`}
                        target="_blank" rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        className="p-1.5 rounded-lg transition-colors hover:bg-green-50 shrink-0"
                        title="Abrir WhatsApp"
                        style={{ color: '#25D366' }}>
                        <MessageCircle size={14} />
                      </a>
                    )}
                    <ChevronRight size={14} className="text-gray-300 shrink-0" />
                  </button>
                )
              })}
            </div>
          )}
          <Pagination page={page} total={filtered.length} pageSize={PAGE_SIZE} onChange={p => { setPage(p); setSelected(null) }} className="px-5 pb-4" />
        </div>

        {/* Panel detalle */}
        <div ref={detailRef}>
        {selected ? (
          <div className="rounded-2xl overflow-hidden lg:sticky lg:top-8"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>

            {/* Header del panel */}
            <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              <div className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>{selected.full_name}</div>
              <div className="flex items-center gap-1">
                {!(selected as any)._is_espot_guest && <>
                  <button onClick={() => openEditForm(selected)}
                    className="p-1.5 rounded-lg transition-colors hover:bg-slate-100 text-gray-400 hover:text-gray-700">
                    <Pencil size={13} />
                  </button>
                  <button onClick={() => handleDelete(selected.id)} disabled={deleting === selected.id}
                    className="p-1.5 rounded-lg transition-colors hover:bg-red-50 text-gray-400 hover:text-red-500">
                    {deleting === selected.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                  </button>
                </>}
                <button onClick={() => setSelected(null)}
                  className="p-1.5 rounded-lg transition-colors hover:bg-slate-100 text-gray-400">
                  <X size={13} />
                </button>
              </div>
            </div>

            <div className="p-5 space-y-4">
              {/* Datos de contacto */}
              <div className="space-y-2">
                {selected.email && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Mail size={13} className="text-gray-400 shrink-0" />
                    <span className="truncate">{selected.email}</span>
                  </div>
                )}
                {selected.phone && (
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Phone size={13} className="text-gray-400 shrink-0" />
                      <span>{selected.phone}</span>
                    </div>
                    <a href={`https://wa.me/${selected.phone.replace(/[^0-9]/g, '')}`}
                      target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg transition-colors hover:bg-green-50"
                      style={{ color: '#25D366', border: '1px solid rgba(37,211,102,0.2)' }}>
                      <MessageCircle size={11} /> WhatsApp
                    </a>
                  </div>
                )}
                {selected.company && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Building2 size={13} className="text-gray-400 shrink-0" />
                    <span>{selected.company}</span>
                  </div>
                )}
              </div>

              {/* Tags */}
              {selected.tags?.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {selected.tags.map(t => (
                    <span key={t} className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full"
                      style={{ background: 'rgba(53,196,147,0.1)', color: '#16A34A' }}>
                      <Tag size={9} /> {t}
                    </span>
                  ))}
                </div>
              )}

              {/* Notas */}
              {selected.notes && (
                <div className="rounded-xl p-3 text-xs text-gray-500" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
                  {selected.notes}
                </div>
              )}

              {/* Resumen histórico */}
              {histLoading ? (
                <div className="flex justify-center py-4">
                  <Loader2 size={18} className="animate-spin text-gray-300" />
                </div>
              ) : history && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl p-3 text-center" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
                      <div className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{history.total_events}</div>
                      <div className="text-xs text-gray-400 mt-0.5">Eventos</div>
                    </div>
                    <div className="rounded-xl p-3 text-center" style={{ background: 'rgba(53,196,147,0.05)', border: '1px solid rgba(53,196,147,0.15)' }}>
                      <div className="text-base font-bold" style={{ color: 'var(--brand)' }}>{formatCurrency(history.total_revenue)}</div>
                      <div className="text-xs text-gray-400 mt-0.5">Facturado</div>
                    </div>
                  </div>

                  {/* Historial de eventos */}
                  {(history.events.length > 0 || history.bookings.length > 0) && (
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">Historial</div>
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {[
                          ...history.events.map((e: any) => ({ ...e, _type: 'manual' })),
                          ...history.bookings.map((b: any) => ({ ...b, title: b.event_type ?? 'Reserva Espot', _type: 'espot' })),
                        ]
                          .sort((a, b) => (b.event_date ?? '').localeCompare(a.event_date ?? ''))
                          .map((ev: any) => (
                            <div key={ev.id} className="flex items-center justify-between text-xs py-1.5 px-3 rounded-lg"
                              style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
                              <div>
                                <div className="font-medium text-gray-700 truncate max-w-[160px]">{ev.title}</div>
                                <div className="text-gray-400 flex items-center gap-1">
                                  <CalendarDays size={9} /> {formatDate(ev.event_date)}
                                  {ev._type === 'espot' && <span className="ml-1 text-[#16A34A] font-medium">· Espot</span>}
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="font-semibold text-gray-700">{formatCurrency(Number(ev.total_amount ?? 0))}</div>
                                <div className="text-gray-400">{EVENT_STATUS_LABELS[ev.status] ?? ev.status}</div>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="rounded-2xl p-8 text-center" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
            <Users size={24} className="mx-auto mb-3 text-gray-300" />
            <p className="text-sm text-gray-400">Selecciona un cliente para ver su historial</p>
          </div>
        )}
        </div>
      </div>

      {/* Modal Form */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}
          onClick={e => { if (e.target === e.currentTarget) setShowForm(false) }}>
          <div className="w-full max-w-md rounded-2xl overflow-hidden"
            style={{ background: 'var(--bg-card)', boxShadow: '0 24px 80px rgba(0,0,0,0.2)' }}>
            <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              <div className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
                {editing ? 'Editar cliente' : 'Nuevo cliente'}
              </div>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Nombre completo *</label>
                <input required value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                  placeholder="Ej. María García"
                  className="w-full px-3 py-2.5 rounded-xl text-sm border focus:outline-none focus:ring-2"
                  style={{ border: '1px solid var(--border-subtle)', fontSize: 16 }} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">Email</label>
                  <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    placeholder="correo@ejemplo.com"
                    className="w-full px-3 py-2.5 rounded-xl text-sm border focus:outline-none"
                    style={{ border: '1px solid var(--border-subtle)', fontSize: 16 }} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">Teléfono</label>
                  <input type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                    placeholder="809-000-0000"
                    className="w-full px-3 py-2.5 rounded-xl text-sm border focus:outline-none"
                    style={{ border: '1px solid var(--border-subtle)', fontSize: 16 }} />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Empresa</label>
                <input value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))}
                  placeholder="Nombre de empresa (opcional)"
                  className="w-full px-3 py-2.5 rounded-xl text-sm border focus:outline-none"
                  style={{ border: '1px solid var(--border-subtle)', fontSize: 16 }} />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Origen</label>
                <select value={form.source} onChange={e => setForm(f => ({ ...f, source: e.target.value as ClientSource }))}
                  className="w-full px-3 py-2.5 rounded-xl text-sm border focus:outline-none"
                  style={{ border: '1px solid var(--border-subtle)', fontSize: 16 }}>
                  {(Object.entries(SOURCE_LABELS) as [ClientSource, string][]).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Etiquetas <span className="font-normal">(separadas por coma)</span></label>
                <input value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
                  placeholder="VIP, corporativo, frecuente"
                  className="w-full px-3 py-2.5 rounded-xl text-sm border focus:outline-none"
                  style={{ border: '1px solid var(--border-subtle)', fontSize: 16 }} />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Notas internas</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Preferencias, observaciones, etc."
                  rows={2}
                  className="w-full px-3 py-2.5 rounded-xl text-sm border focus:outline-none resize-none"
                  style={{ border: '1px solid var(--border-subtle)', fontSize: 16 }} />
              </div>

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowForm(false)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-gray-600 transition-colors hover:bg-slate-50"
                  style={{ border: '1px solid var(--border-subtle)' }}>
                  Cancelar
                </button>
                <button type="submit" disabled={saving || !form.full_name.trim()}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50"
                  style={{ background: 'var(--brand)' }}>
                  {saving ? <Loader2 size={15} className="animate-spin mx-auto" /> : (editing ? 'Guardar cambios' : 'Crear cliente')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
