'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft, Save, Eye, EyeOff, Shield, Star, Trash2,
  CheckCircle, Loader2, Plus, X, Building2, DollarSign,
  Settings, CreditCard, Package,
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import {
  adminUpdateSpace, adminUpdatePricing, adminUpdateConditions,
  adminUpdatePaymentTerms, adminUpsertAddon, adminDeleteAddon, updateSpaceStatus,
} from '@/lib/actions/admin'

const CATEGORIES = [
  'salon','restaurante','bar','rooftop','terraza','estudio','coworking','hotel','villa','otro'
]
const PRICING_TYPES = [
  { value: 'hourly',              label: 'Precio por hora' },
  { value: 'minimum_consumption', label: 'Consumo mínimo' },
  { value: 'fixed_package',       label: 'Paquete fijo' },
  { value: 'custom_quote',        label: 'Cotización personalizada' },
]
const PAYMENT_TERMS = [
  { value: 'platform_guarantee', label: '10% Espot + 90% en el espacio' },
  { value: 'split_advance',      label: '10% + 40% antes + 50% el día' },
  { value: 'full_prepaid',       label: 'Pago completo online' },
  { value: 'quote_only',         label: 'Solo cotización' },
]

type Tab = 'info' | 'precio' | 'adicionales' | 'reglas' | 'cobros'

const tabs: { id: Tab; label: string; icon: any }[] = [
  { id: 'info',        label: 'Información',  icon: Building2 },
  { id: 'precio',      label: 'Precio',       icon: DollarSign },
  { id: 'adicionales', label: 'Adicionales',  icon: Package },
  { id: 'reglas',      label: 'Reglas',       icon: Settings },
  { id: 'cobros',      label: 'Cobros',       icon: CreditCard },
]

export default function AdminEditSpaceClient({ space }: { space: any }) {
  const pricing    = space.space_pricing?.[0]
  const conditions = space.space_conditions?.[0]
  const payTerms   = space.space_payment_terms?.[0]
  const host       = space.profiles

  const [activeTab, setActiveTab] = useState<Tab>('info')
  const [saving, setSaving]       = useState<string | null>(null)
  const [saved, setSaved]         = useState<string | null>(null)
  const [addons, setAddons]       = useState<any[]>(space.space_addons ?? [])

  // Info fields
  const [name, setName]             = useState(space.name ?? '')
  const [description, setDescription] = useState(space.description ?? '')
  const [category, setCategory]     = useState(space.category ?? '')
  const [capacityMin, setCapacityMin] = useState(String(space.capacity_min ?? ''))
  const [capacityMax, setCapacityMax] = useState(String(space.capacity_max ?? ''))
  const [address, setAddress]       = useState(space.address ?? '')
  const [sector, setSector]         = useState(space.sector ?? '')
  const [city, setCity]             = useState(space.city ?? '')

  // Pricing fields
  const [pricingType, setPricingType]       = useState(pricing?.pricing_type ?? 'hourly')
  const [hourlyPrice, setHourlyPrice]       = useState(String(pricing?.hourly_price ?? ''))
  const [minHours, setMinHours]             = useState(String(pricing?.min_hours ?? ''))
  const [maxHours, setMaxHours]             = useState(String(pricing?.max_hours ?? ''))
  const [minConsumption, setMinConsumption] = useState(String(pricing?.minimum_consumption ?? ''))
  const [sessionHours, setSessionHours]     = useState(String(pricing?.session_hours ?? ''))
  const [fixedPrice, setFixedPrice]         = useState(String(pricing?.fixed_price ?? ''))
  const [packageName, setPackageName]       = useState(pricing?.package_name ?? '')

  // Conditions
  const [musicCutoff, setMusicCutoff]     = useState(conditions?.music_cutoff_time?.slice(0,5) ?? '')
  const [allowDeco, setAllowDeco]         = useState(conditions?.allows_external_decoration ?? true)
  const [allowFood, setAllowFood]         = useState(conditions?.allows_external_food ?? false)
  const [allowAlcohol, setAllowAlcohol]   = useState(conditions?.allows_external_alcohol ?? false)
  const [cancelPolicy, setCancelPolicy]   = useState(conditions?.cancellation_policy ?? 'moderada')
  const [cancelHours, setCancelHours]     = useState(String(conditions?.cancellation_hours_before ?? 72))
  const [cancelRefund, setCancelRefund]   = useState(String(conditions?.cancellation_refund_pct ?? 50))
  const [customRules, setCustomRules]     = useState(conditions?.custom_rules ?? '')

  // Payment terms
  const [termType, setTermType] = useState(payTerms?.term_type ?? 'platform_guarantee')

  // Status toggles
  const [isPublished, setIsPublished] = useState(space.is_published)
  const [isVerified, setIsVerified]   = useState(space.is_verified)
  const [isFeatured, setIsFeatured]   = useState(space.is_featured)
  const [isActive, setIsActive]       = useState(space.is_active)

  // New addon
  const [newAddon, setNewAddon] = useState({ name: '', price: '', unit: 'evento', category: 'personal' })

  async function save(key: string, fn: () => Promise<any>) {
    setSaving(key)
    const result = await fn()
    setSaving(null)
    if (!('error' in result)) {
      setSaved(key)
      setTimeout(() => setSaved(null), 2000)
    }
  }

  async function handleSaveInfo() {
    await save('info', () => adminUpdateSpace(space.id, {
      name, description, category,
      capacity_min: capacityMin ? parseInt(capacityMin) : null,
      capacity_max: parseInt(capacityMax),
      address, sector, city,
    }))
  }

  async function handleSavePricing() {
    if (!pricing?.id) return
    const payload: Record<string, unknown> = { pricing_type: pricingType }
    if (pricingType === 'hourly') {
      payload.hourly_price = parseFloat(hourlyPrice)
      payload.min_hours = parseInt(minHours) || 1
      if (maxHours) payload.max_hours = parseInt(maxHours)
    }
    if (pricingType === 'minimum_consumption') {
      payload.minimum_consumption = parseFloat(minConsumption)
      if (sessionHours) payload.session_hours = parseInt(sessionHours)
    }
    if (pricingType === 'fixed_package') {
      payload.fixed_price = parseFloat(fixedPrice)
      payload.package_name = packageName
    }
    await save('pricing', () => adminUpdatePricing(pricing.id, payload))
  }

  async function handleSaveConditions() {
    if (!conditions?.id) return
    await save('conditions', () => adminUpdateConditions(conditions.id, {
      music_cutoff_time: musicCutoff || null,
      allows_external_decoration: allowDeco,
      allows_external_food: allowFood,
      allows_external_alcohol: allowAlcohol,
      cancellation_policy: cancelPolicy,
      cancellation_hours_before: parseInt(cancelHours),
      cancellation_refund_pct: parseFloat(cancelRefund),
      custom_rules: customRules || null,
    }))
  }

  async function handleSavePaymentTerms() {
    if (!payTerms?.id) return
    await save('terms', () => adminUpdatePaymentTerms(payTerms.id, { term_type: termType }))
  }

  async function handleToggle(field: string, current: boolean, setter: (v: boolean) => void) {
    setSaving(field)
    await updateSpaceStatus(space.id, { [field]: !current })
    setter(!current)
    setSaving(null)
  }

  async function handleAddAddon() {
    if (!newAddon.name || !newAddon.price) return
    setSaving('addon-new')
    const result = await adminUpsertAddon(space.id, {
      name: newAddon.name, price: parseFloat(newAddon.price),
      unit: newAddon.unit, category: newAddon.category,
    })
    if (!('error' in result)) {
      // refresh addons by re-fetching (simulate with optimistic)
      setAddons(prev => [...prev, { id: Date.now(), ...newAddon, price: parseFloat(newAddon.price), is_available: true }])
      setNewAddon({ name: '', price: '', unit: 'evento', category: 'personal' })
    }
    setSaving(null)
  }

  async function handleDeleteAddon(addonId: string) {
    setSaving('del-' + addonId)
    await adminDeleteAddon(addonId)
    setAddons(prev => prev.filter(a => a.id !== addonId))
    setSaving(null)
  }

  function SaveBtn({ id, onClick }: { id: string; onClick: () => void }) {
    return (
      <button onClick={onClick} disabled={saving === id}
        className="flex items-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-xl transition-all"
        style={{ background: saved === id ? 'rgba(22,163,74,0.1)' : 'var(--brand)', color: saved === id ? '#16A34A' : '#fff' }}>
        {saving === id ? <Loader2 size={15} className="animate-spin" /> : saved === id ? <CheckCircle size={15} /> : <Save size={15} />}
        {saved === id ? 'Guardado' : 'Guardar'}
      </button>
    )
  }

  const inputCls = "w-full px-4 py-3 rounded-xl text-sm border focus:outline-none transition-colors"
  const inputStyle = { background: '#F8FAFB', border: '1.5px solid #E8ECF0', color: '#0F1623' }

  return (
    <div className="p-8 max-w-5xl mx-auto">

      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link href="/admin/espacios"
          className="flex items-center gap-2 text-sm font-medium px-3 py-2 rounded-xl transition-colors"
          style={{ background: '#fff', border: '1px solid #E8ECF0', color: '#6B7280' }}>
          <ArrowLeft size={15} /> Espacios
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold" style={{ color: '#0F1623', letterSpacing: '-0.01em' }}>
            {name || space.name}
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Propietario: {host?.full_name} · {host?.email}
          </p>
        </div>

        {/* Status toggles */}
        <div className="flex items-center gap-2">
          {[
            { field: 'is_published', val: isPublished, set: setIsPublished, icon: isPublished ? Eye : EyeOff, label: isPublished ? 'Publicado' : 'Oculto',   active: '#16A34A' },
            { field: 'is_verified',  val: isVerified,  set: setIsVerified,  icon: Shield,  label: 'Verificado',  active: '#2563EB' },
            { field: 'is_featured',  val: isFeatured,  set: setIsFeatured,  icon: Star,    label: 'Destacado',   active: '#CA8A04' },
            { field: 'is_active',    val: isActive,    set: setIsActive,    icon: isActive ? CheckCircle : Trash2, label: isActive ? 'Activo' : 'Inactivo', active: '#35C493' },
          ].map(({ field, val, set, icon: Icon, label, active }) => (
            <button key={field}
              onClick={() => handleToggle(field, val, set)}
              disabled={saving === field}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl transition-all"
              style={val
                ? { background: `${active}12`, color: active, border: `1px solid ${active}25` }
                : { background: '#F4F6F8', color: '#9CA3AF', border: '1px solid #E8ECF0' }}>
              {saving === field ? <Loader2 size={13} className="animate-spin" /> : <Icon size={13} />}
              {label}
            </button>
          ))}

          <Link href={`/espacios/${space.slug}`} target="_blank"
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl"
            style={{ background: '#F4F6F8', color: '#6B7280', border: '1px solid #E8ECF0' }}>
            <Eye size={13} /> Ver en marketplace
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-2xl mb-8 w-fit"
        style={{ background: '#fff', border: '1px solid #E8ECF0' }}>
        {tabs.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setActiveTab(id)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
            style={activeTab === id
              ? { background: '#0F1623', color: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.15)' }
              : { color: '#6B7280' }}>
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {/* ── TAB: Información ── */}
      {activeTab === 'info' && (
        <div className="rounded-2xl overflow-hidden"
          style={{ background: '#fff', border: '1px solid #E8ECF0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
          <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid #F0F2F5' }}>
            <h2 className="font-bold text-sm" style={{ color: '#0F1623' }}>Información básica</h2>
            <SaveBtn id="info" onClick={handleSaveInfo} />
          </div>
          <div className="p-6 space-y-5">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest mb-2 text-slate-400">Nombre del espacio</label>
              <input value={name} onChange={e => setName(e.target.value)} className={inputCls} style={inputStyle} placeholder="Nombre del espacio" />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest mb-2 text-slate-400">Descripción</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)}
                rows={4} className={inputCls + ' resize-none'} style={inputStyle}
                placeholder="Descripción completa del espacio..." />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-widest mb-2 text-slate-400">Categoría</label>
                <select value={category} onChange={e => setCategory(e.target.value)}
                  className={inputCls} style={{ ...inputStyle, cursor: 'pointer' }}>
                  {CATEGORIES.map(c => (
                    <option key={c} value={c} style={{ background: '#fff' }}>
                      {c.charAt(0).toUpperCase() + c.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-widest mb-2 text-slate-400">Cap. mínima</label>
                <input type="number" value={capacityMin} onChange={e => setCapacityMin(e.target.value)}
                  className={inputCls} style={inputStyle} placeholder="20" />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-widest mb-2 text-slate-400">Cap. máxima</label>
                <input type="number" value={capacityMax} onChange={e => setCapacityMax(e.target.value)}
                  className={inputCls} style={inputStyle} placeholder="200" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-widest mb-2 text-slate-400">Dirección</label>
                <input value={address} onChange={e => setAddress(e.target.value)} className={inputCls} style={inputStyle} placeholder="Av. Lincoln #123" />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-widest mb-2 text-slate-400">Sector</label>
                <input value={sector} onChange={e => setSector(e.target.value)} className={inputCls} style={inputStyle} placeholder="Piantini" />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-widest mb-2 text-slate-400">Ciudad</label>
                <input value={city} onChange={e => setCity(e.target.value)} className={inputCls} style={inputStyle} placeholder="Santo Domingo" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB: Precio ── */}
      {activeTab === 'precio' && (
        <div className="rounded-2xl overflow-hidden"
          style={{ background: '#fff', border: '1px solid #E8ECF0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
          <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid #F0F2F5' }}>
            <h2 className="font-bold text-sm" style={{ color: '#0F1623' }}>Configuración de precio</h2>
            <SaveBtn id="pricing" onClick={handleSavePricing} />
          </div>
          <div className="p-6 space-y-5">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest mb-3 text-slate-400">Tipo de precio</label>
              <div className="grid grid-cols-2 gap-2">
                {PRICING_TYPES.map(pt => (
                  <button key={pt.value} onClick={() => setPricingType(pt.value)}
                    className="px-4 py-3 rounded-xl text-sm font-medium text-left transition-all border"
                    style={pricingType === pt.value
                      ? { background: 'rgba(53,196,147,0.08)', borderColor: 'var(--brand)', color: 'var(--brand)' }
                      : { background: '#F8FAFB', borderColor: '#E8ECF0', color: '#374151' }}>
                    {pt.label}
                  </button>
                ))}
              </div>
            </div>

            {pricingType === 'hourly' && (
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-widest mb-2 text-slate-400">Precio / hora (RD$)</label>
                  <input type="number" value={hourlyPrice} onChange={e => setHourlyPrice(e.target.value)} className={inputCls} style={inputStyle} placeholder="5000" />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-widest mb-2 text-slate-400">Mín. horas</label>
                  <input type="number" value={minHours} onChange={e => setMinHours(e.target.value)} className={inputCls} style={inputStyle} placeholder="3" />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-widest mb-2 text-slate-400">Máx. horas</label>
                  <input type="number" value={maxHours} onChange={e => setMaxHours(e.target.value)} className={inputCls} style={inputStyle} placeholder="12" />
                </div>
              </div>
            )}

            {pricingType === 'minimum_consumption' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-widest mb-2 text-slate-400">Consumo mínimo (RD$)</label>
                  <input type="number" value={minConsumption} onChange={e => setMinConsumption(e.target.value)} className={inputCls} style={inputStyle} placeholder="60000" />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-widest mb-2 text-slate-400">Duración sesión (hrs)</label>
                  <input type="number" value={sessionHours} onChange={e => setSessionHours(e.target.value)} className={inputCls} style={inputStyle} placeholder="4" />
                </div>
              </div>
            )}

            {pricingType === 'fixed_package' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-widest mb-2 text-slate-400">Precio del paquete (RD$)</label>
                  <input type="number" value={fixedPrice} onChange={e => setFixedPrice(e.target.value)} className={inputCls} style={inputStyle} placeholder="35000" />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-widest mb-2 text-slate-400">Nombre del paquete</label>
                  <input value={packageName} onChange={e => setPackageName(e.target.value)} className={inputCls} style={inputStyle} placeholder="Paquete Cumpleaños Premium" />
                </div>
              </div>
            )}

            {pricingType === 'custom_quote' && (
              <div className="p-4 rounded-xl text-sm" style={{ background: 'rgba(124,58,237,0.05)', border: '1px solid rgba(124,58,237,0.15)', color: '#6B7280' }}>
                El cliente solicita cotización sin precio fijo. El propietario responde con propuesta personalizada.
              </div>
            )}

            {/* Preview */}
            {((pricingType === 'hourly' && hourlyPrice) || (pricingType === 'minimum_consumption' && minConsumption) || (pricingType === 'fixed_package' && fixedPrice)) && (
              <div className="p-4 rounded-xl" style={{ background: 'rgba(53,196,147,0.06)', border: '1px solid rgba(53,196,147,0.15)' }}>
                <span className="text-xs text-slate-500 mr-2">Vista previa:</span>
                <span className="font-bold" style={{ color: 'var(--brand)' }}>
                  {pricingType === 'hourly' ? `${formatCurrency(Number(hourlyPrice))} / hora` : ''}
                  {pricingType === 'minimum_consumption' ? `Consumo mín. ${formatCurrency(Number(minConsumption))}` : ''}
                  {pricingType === 'fixed_package' ? `${packageName || 'Paquete'}: ${formatCurrency(Number(fixedPrice))}` : ''}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB: Adicionales ── */}
      {activeTab === 'adicionales' && (
        <div className="rounded-2xl overflow-hidden"
          style={{ background: '#fff', border: '1px solid #E8ECF0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
          <div className="px-6 py-4" style={{ borderBottom: '1px solid #F0F2F5' }}>
            <h2 className="font-bold text-sm" style={{ color: '#0F1623' }}>Adicionales y extras</h2>
          </div>

          {/* Existing addons */}
          <div className="divide-y divide-[#F0F2F5]">
            {addons.map(addon => (
              <div key={addon.id} className="flex items-center gap-4 px-6 py-4">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm" style={{ color: '#0F1623' }}>{addon.name}</div>
                  <div className="text-xs text-slate-400">{addon.category} · {addon.unit}</div>
                </div>
                <div className="font-bold text-sm" style={{ color: '#0F1623' }}>{formatCurrency(addon.price)}</div>
                <button onClick={() => handleDeleteAddon(addon.id)}
                  disabled={saving === 'del-' + addon.id}
                  className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-red-50"
                  style={{ color: '#DC2626' }}>
                  {saving === 'del-' + addon.id ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />}
                </button>
              </div>
            ))}
          </div>

          {/* Add new addon */}
          <div className="px-6 py-5 space-y-4" style={{ borderTop: '1px solid #F0F2F5', background: '#FAFBFC' }}>
            <div className="text-xs font-semibold uppercase tracking-widest text-slate-400">Agregar adicional</div>
            <div className="grid grid-cols-4 gap-3">
              <div className="col-span-2">
                <input value={newAddon.name} onChange={e => setNewAddon(p => ({ ...p, name: e.target.value }))}
                  placeholder="Nombre del adicional"
                  className={inputCls} style={{ ...inputStyle, background: '#fff' }} />
              </div>
              <div>
                <input type="number" value={newAddon.price} onChange={e => setNewAddon(p => ({ ...p, price: e.target.value }))}
                  placeholder="Precio RD$"
                  className={inputCls} style={{ ...inputStyle, background: '#fff' }} />
              </div>
              <div>
                <select value={newAddon.unit} onChange={e => setNewAddon(p => ({ ...p, unit: e.target.value }))}
                  className={inputCls} style={{ ...inputStyle, background: '#fff', cursor: 'pointer' }}>
                  <option value="evento">/ evento</option>
                  <option value="hora">/ hora</option>
                  <option value="persona">/ persona</option>
                </select>
              </div>
            </div>
            <button onClick={handleAddAddon} disabled={saving === 'addon-new' || !newAddon.name || !newAddon.price}
              className="flex items-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-xl transition-all disabled:opacity-40"
              style={{ background: 'var(--brand)', color: '#fff' }}>
              {saving === 'addon-new' ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              Agregar adicional
            </button>
          </div>
        </div>
      )}

      {/* ── TAB: Reglas ── */}
      {activeTab === 'reglas' && (
        <div className="rounded-2xl overflow-hidden"
          style={{ background: '#fff', border: '1px solid #E8ECF0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
          <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid #F0F2F5' }}>
            <h2 className="font-bold text-sm" style={{ color: '#0F1623' }}>Reglas y condiciones</h2>
            <SaveBtn id="conditions" onClick={handleSaveConditions} />
          </div>
          <div className="p-6 space-y-6">
            {/* Permisos */}
            <div>
              <div className="text-xs font-semibold uppercase tracking-widest mb-3 text-slate-400">Permisos</div>
              <div className="space-y-2">
                {[
                  { label: 'Decoración externa', val: allowDeco, set: setAllowDeco },
                  { label: 'Comida externa',      val: allowFood, set: setAllowFood },
                  { label: 'Alcohol externo',     val: allowAlcohol, set: setAllowAlcohol },
                ].map(({ label, val, set }) => (
                  <div key={label} className="flex items-center justify-between px-4 py-3 rounded-xl"
                    style={{ background: '#F8FAFB', border: '1px solid #E8ECF0' }}>
                    <span className="text-sm font-medium" style={{ color: '#374151' }}>{label}</span>
                    <button onClick={() => set(!val)}
                      className="w-11 h-6 rounded-full relative transition-all"
                      style={{ background: val ? 'var(--brand)' : '#D1D5DB' }}>
                      <span className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all"
                        style={{ left: val ? 24 : 2 }} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Música y cancelación */}
            <div className="grid grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-widest mb-2 text-slate-400">Hora límite de música</label>
                <input type="time" value={musicCutoff} onChange={e => setMusicCutoff(e.target.value)}
                  className={inputCls} style={inputStyle} />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-widest mb-2 text-slate-400">Política de cancelación</label>
                <select value={cancelPolicy} onChange={e => setCancelPolicy(e.target.value)}
                  className={inputCls} style={{ ...inputStyle, cursor: 'pointer' }}>
                  <option value="flexible">Flexible</option>
                  <option value="moderada">Moderada</option>
                  <option value="estricta">Estricta</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-widest mb-2 text-slate-400">Horas antes para cancelar</label>
                <input type="number" value={cancelHours} onChange={e => setCancelHours(e.target.value)}
                  className={inputCls} style={inputStyle} placeholder="72" />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-widest mb-2 text-slate-400">% de reembolso</label>
                <input type="number" value={cancelRefund} onChange={e => setCancelRefund(e.target.value)}
                  className={inputCls} style={inputStyle} placeholder="50" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest mb-2 text-slate-400">Reglas adicionales</label>
              <textarea value={customRules} onChange={e => setCustomRules(e.target.value)}
                rows={3} className={inputCls + ' resize-none'} style={inputStyle}
                placeholder="Reglas específicas del espacio..." />
            </div>
          </div>
        </div>
      )}

      {/* ── TAB: Cobros ── */}
      {activeTab === 'cobros' && (
        <div className="rounded-2xl overflow-hidden"
          style={{ background: '#fff', border: '1px solid #E8ECF0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
          <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid #F0F2F5' }}>
            <h2 className="font-bold text-sm" style={{ color: '#0F1623' }}>Términos de cobro</h2>
            <SaveBtn id="terms" onClick={handleSavePaymentTerms} />
          </div>
          <div className="p-6 space-y-3">
            {PAYMENT_TERMS.map(pt => (
              <button key={pt.value} onClick={() => setTermType(pt.value)}
                className="w-full text-left px-5 py-4 rounded-xl border transition-all"
                style={termType === pt.value
                  ? { background: 'rgba(53,196,147,0.06)', borderColor: 'var(--brand)' }
                  : { background: '#F8FAFB', borderColor: '#E8ECF0' }}>
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full border-2 flex items-center justify-center"
                    style={termType === pt.value ? { background: 'var(--brand)', borderColor: 'var(--brand)' } : { borderColor: '#D1D5DB' }}>
                    {termType === pt.value && <div className="w-2 h-2 rounded-full bg-white" />}
                  </div>
                  <span className="text-sm font-medium" style={{ color: termType === pt.value ? 'var(--brand)' : '#374151' }}>
                    {pt.label}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
