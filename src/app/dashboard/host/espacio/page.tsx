'use client'

import { useState, useEffect } from 'react'
import { Building2, Clock, DollarSign, Plus, Gift, Shield, CreditCard, CheckCircle, ChevronRight, ChevronLeft, X, Loader2, Eye, EyeOff, MapPin, Users, Pencil, PlusCircle } from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'
import { saveSpace, publishSpace, getMySpaces, saveSpaceImages, updateSpace } from '@/lib/actions/space'
import PhotoUploader from '@/components/dashboard/PhotoUploader'
import type { SpaceCategory, PricingType, PaymentTermType } from '@/types'

const steps = [
  { id: 1, label: 'Información básica', icon: Building2 },
  { id: 2, label: 'Precios',            icon: DollarSign },
  { id: 3, label: 'Bloques de tiempo',  icon: Clock },
  { id: 4, label: 'Adicionales',        icon: Gift },
  { id: 5, label: 'Reglas',             icon: Shield },
  { id: 6, label: 'Cobros',             icon: CreditCard },
  { id: 7, label: 'Publicar',           icon: CheckCircle },
]

const categories: { value: SpaceCategory; label: string; emoji: string }[] = [
  { value: 'salon',      label: 'Salón de eventos', emoji: '🏛️' },
  { value: 'restaurante',label: 'Restaurante',       emoji: '🍽️' },
  { value: 'bar',        label: 'Bar / Lounge',      emoji: '🍸' },
  { value: 'rooftop',   label: 'Rooftop',            emoji: '🌆' },
  { value: 'terraza',   label: 'Terraza',            emoji: '🌿' },
  { value: 'estudio',   label: 'Estudio',            emoji: '🎬' },
  { value: 'coworking', label: 'Coworking',           emoji: '💼' },
  { value: 'hotel',     label: 'Hotel / Villa',      emoji: '🏨' },
  { value: 'villa',     label: 'Villa',               emoji: '🏡' },
  { value: 'otro',      label: 'Otro',                emoji: '📍' },
]

const pricingOptions: { value: PricingType; label: string; desc: string; emoji: string; ideal: string }[] = [
  {
    value: 'hourly',
    label: 'Precio por hora',
    desc: 'El cliente paga por las horas que usa el espacio.',
    emoji: '⏱️',
    ideal: 'Salones, terrazas, estudios, coworkings',
  },
  {
    value: 'minimum_consumption',
    label: 'Consumo mínimo',
    desc: 'El cliente debe consumir un monto mínimo en comida/bebida.',
    emoji: '🍷',
    ideal: 'Restaurantes, bares, lounges, rooftops',
  },
  {
    value: 'fixed_package',
    label: 'Paquete fijo',
    desc: 'Precio fijo que incluye espacio + servicios específicos.',
    emoji: '📦',
    ideal: 'Salones con todo incluido, hoteles, venues',
  },
  {
    value: 'custom_quote',
    label: 'Cotización personalizada',
    desc: 'El cliente solicita propuesta y tú envías el precio.',
    emoji: '💬',
    ideal: 'Bodas, eventos corporativos, eventos grandes',
  },
]

const paymentTermOptions: { value: PaymentTermType; label: string; desc: string }[] = [
  {
    value: 'platform_guarantee',
    label: '10% en Espot + 90% en el espacio',
    desc: 'El cliente paga solo el 10% para garantizar la fecha. El resto lo cobras tú el día del evento.',
  },
  {
    value: 'split_advance',
    label: '10% + 40% antes + 50% el día',
    desc: 'Reparte el pago: garantía, anticipo y balance el día del evento.',
  },
  {
    value: 'full_prepaid',
    label: 'Pago completo por Espot',
    desc: 'El cliente paga todo antes del evento a través de la plataforma.',
  },
  {
    value: 'quote_only',
    label: 'Solo cotización (sin pago online)',
    desc: 'El cliente solicita precio, tú coordinas el pago directamente.',
  },
]

const addonSuggestions = [
  { name: 'Bartender', price: 8000, unit: 'evento', category: 'personal', emoji: '🍹' },
  { name: 'DJ', price: 15000, unit: 'evento', category: 'personal', emoji: '🎧' },
  { name: 'Sonido', price: 5000, unit: 'evento', category: 'equipo', emoji: '🔊' },
  { name: 'Iluminación', price: 4000, unit: 'evento', category: 'equipo', emoji: '💡' },
  { name: 'Camarero', price: 3500, unit: 'evento', category: 'personal', emoji: '🤵' },
  { name: 'Seguridad', price: 4000, unit: 'evento', category: 'personal', emoji: '💂' },
  { name: 'Decoración básica', price: 6000, unit: 'evento', category: 'decoracion', emoji: '🎊' },
  { name: 'Proyector', price: 2500, unit: 'evento', category: 'equipo', emoji: '📽️' },
  { name: 'Mesa de dulces', price: 5000, unit: 'evento', category: 'alimentos', emoji: '🍰' },
  { name: 'Menú personalizado', price: 0, unit: 'persona', category: 'alimentos', emoji: '🍽️' },
  { name: 'Hora extra', price: 5000, unit: 'hora', category: 'tiempo', emoji: '⏰' },
  { name: 'Mobiliario extra', price: 3000, unit: 'evento', category: 'mobiliario', emoji: '🪑' },
]

interface AddonItem {
  name: string; price: number; unit: string; category: string; emoji: string
}

interface TimeBlock {
  block_name: string; start_time: string; end_time: string; days: number[]
}

const pricingLabel: Record<string, string> = {
  hourly: 'Por hora',
  minimum_consumption: 'Consumo mínimo',
  fixed_package: 'Paquete fijo',
  custom_quote: 'Cotización',
}

export default function EspacioPage() {
  const [view, setView] = useState<'list' | 'create'>('list')
  const [spaces, setSpaces] = useState<Awaited<ReturnType<typeof getMySpaces>>>([])
  const [loadingSpaces, setLoadingSpaces] = useState(true)

  useEffect(() => {
    getMySpaces().then(data => { setSpaces(data); setLoadingSpaces(false) })
  }, [])

  const [currentStep, setCurrentStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [pendingPhotos, setPendingPhotos] = useState<{ url: string; path: string; isCover: boolean }[]>([])
  const [editingSpaceId, setEditingSpaceId] = useState<string | null>(null)

  // Step 1 - Basic info
  const [name, setName] = useState('')
  const [category, setCategory] = useState<SpaceCategory | ''>('')
  const [description, setDescription] = useState('')
  const [address, setAddress] = useState('')
  const [sector, setSector] = useState('')
  const [capacityMin, setCapacityMin] = useState('')
  const [capacityMax, setCapacityMax] = useState('')

  // Step 2 - Pricing
  const [pricingType, setPricingType] = useState<PricingType | ''>('')
  const [hourlyPrice, setHourlyPrice] = useState('')
  const [minHours, setMinHours] = useState('1')
  const [maxHours, setMaxHours] = useState('')
  const [minConsumption, setMinConsumption] = useState('')
  const [sessionHours, setSessionHours] = useState('')
  const [fixedPrice, setFixedPrice] = useState('')
  const [packageName, setPackageName] = useState('')
  const [packageHours, _setPackageHours] = useState('')
  const [packageIncludes, setPackageIncludes] = useState<string[]>([])
  const [newInclude, setNewInclude] = useState('')

  // Step 3 - Time blocks
  const [timeBlocks, setTimeBlocks] = useState<TimeBlock[]>([])
  const [newBlock, setNewBlock] = useState<TimeBlock>({ block_name: '', start_time: '', end_time: '', days: [0,1,2,3,4,5,6] })

  // Step 4 - Addons
  const [addons, setAddons] = useState<AddonItem[]>([])
  const [_customAddon, _setCustomAddon] = useState<AddonItem>({ name: '', price: 0, unit: 'evento', category: 'personal', emoji: '✨' })

  // Step 5 - Conditions
  const [musicCutoff, setMusicCutoff] = useState('00:00')
  const [allowsDecoration, setAllowsDecoration] = useState(true)
  const [allowsFood, setAllowsFood] = useState(false)
  const [allowsAlcohol, setAllowsAlcohol] = useState(false)
  const [depositRequired, setDepositRequired] = useState(false)
  const [depositAmount, setDepositAmount] = useState('')
  const [cancellationPolicy, setCancellationPolicy] = useState('moderada')
  const [customRules, setCustomRules] = useState('')

  // Step 6 - Payment terms
  const [paymentTerm, setPaymentTerm] = useState<PaymentTermType | ''>('')

  const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

  function toggleDay(day: number) {
    setNewBlock(prev => ({
      ...prev,
      days: prev.days.includes(day) ? prev.days.filter(d => d !== day) : [...prev.days, day]
    }))
  }

  function addTimeBlock() {
    if (newBlock.block_name && newBlock.start_time && newBlock.end_time) {
      setTimeBlocks([...timeBlocks, newBlock])
      setNewBlock({ block_name: '', start_time: '', end_time: '', days: [0,1,2,3,4,5,6] })
    }
  }

  async function handlePublish() {
    setSaving(true)
    setSaveError('')

    const payload = {
      name, category, description, address, sector, capacityMin, capacityMax,
      pricingType: pricingType as PricingType,
      hourlyPrice, minHours, maxHours, minConsumption, sessionHours,
      fixedPrice, packageName, packageHours, packageIncludes,
      timeBlocks, addons,
      musicCutoff, allowsDecoration, allowsFood, allowsAlcohol,
      depositRequired, depositAmount, cancellationPolicy, customRules,
      paymentTerm: paymentTerm as PaymentTermType,
    }

    let spaceId: string

    if (editingSpaceId) {
      // MODO EDICIÓN: actualizar espacio existente
      const result = await updateSpace(editingSpaceId, payload)
      if ('error' in result) {
        setSaveError(result.error ?? 'Error al actualizar')
        setSaving(false)
        return
      }
      spaceId = editingSpaceId
    } else {
      // MODO CREACIÓN: crear nuevo espacio
      const result = await saveSpace(payload)
      if ('error' in result) {
        setSaveError(result.error ?? 'Error desconocido')
        setSaving(false)
        return
      }
      spaceId = result.spaceId
      // Publicar automáticamente solo en creación
      const pub = await publishSpace(spaceId)
      if ('error' in pub) {
        setSaveError(pub.error ?? 'Error al publicar')
        setSaving(false)
        return
      }
    }

    // Guardar fotos si hay pendientes
    if (pendingPhotos.length > 0) {
      await saveSpaceImages(spaceId, pendingPhotos)
    }

    setSaving(false)
    setEditingSpaceId(null)
    const updated = await getMySpaces()
    setSpaces(updated)
    setView('list')
  }

  function loadSpaceForEdit(space: any) {
    setEditingSpaceId(space.id)
    // Cargar info básica
    setName(space.name ?? '')
    setCategory(space.category ?? '')
    setDescription(space.description ?? '')
    setAddress(space.address ?? '')
    setSector(space.sector ?? '')
    setCapacityMin(String(space.capacity_min ?? ''))
    setCapacityMax(String(space.capacity_max ?? ''))
    // Pricing
    const p = space.space_pricing?.[0]
    if (p) {
      setPricingType(p.pricing_type ?? '')
      setHourlyPrice(String(p.hourly_price ?? ''))
      setMinHours(String(p.min_hours ?? ''))
      setMaxHours(String(p.max_hours ?? ''))
      setMinConsumption(String(p.minimum_consumption ?? ''))
      setSessionHours(String(p.session_hours ?? ''))
      setFixedPrice(String(p.fixed_price ?? ''))
      setPackageName(p.package_name ?? '')
      setPackageIncludes(p.package_includes ?? [])
    }
    // Addons
    if (space.space_addons?.length) {
      setAddons(space.space_addons.map((a: any) => ({
        name: a.name, price: a.price, unit: a.unit, category: a.category, emoji: '✨',
      })))
    }
    // Condiciones
    const c = space.space_conditions?.[0]
    if (c) {
      setMusicCutoff(c.music_cutoff_time?.slice(0,5) ?? '00:00')
      setAllowsDecoration(c.allows_external_decoration ?? true)
      setAllowsFood(c.allows_external_food ?? false)
      setAllowsAlcohol(c.allows_external_alcohol ?? false)
      setDepositRequired(c.deposit_required ?? false)
      setDepositAmount(String(c.deposit_amount ?? ''))
      setCancellationPolicy(c.cancellation_policy ?? 'moderada')
      setCustomRules(c.custom_rules ?? '')
    }
    // Payment terms
    const pt = space.space_payment_terms?.[0]
    if (pt) setPaymentTerm(pt.term_type ?? '')
    // Time blocks
    if (space.space_time_blocks?.length) {
      setTimeBlocks(space.space_time_blocks.map((b: any) => ({
        block_name: b.block_name, start_time: b.start_time, end_time: b.end_time,
        days: b.days_of_week ?? [0,1,2,3,4,5,6],
      })))
    }
    setCurrentStep(1)
    setView('create')
  }

  function toggleAddon(addon: AddonItem) {
    const exists = addons.find(a => a.name === addon.name)
    if (exists) {
      setAddons(addons.filter(a => a.name !== addon.name))
    } else {
      setAddons([...addons, addon])
    }
  }

  // ── VISTA: Lista de espacios ──────────────────────────────
  if (view === 'list') {
    return (
      <div className="p-8 max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Mis Espots</h1>
            <p className="text-slate-400 mt-1">Gestiona tus espacios publicados</p>
          </div>
          <button
            onClick={() => setView('create')}
            className="flex items-center gap-2 bg-[#35C493] hover:bg-[#4DD9A7] text-white font-semibold px-5 py-2.5 rounded-xl transition-colors"
          >
            <PlusCircle size={18} /> Nuevo Espot
          </button>
        </div>

        {loadingSpaces ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-[#35C493] animate-spin" />
          </div>
        ) : spaces.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 bg-[rgba(53,196,147,0.12)] rounded-2xl flex items-center justify-center mb-4">
              <Building2 className="w-8 h-8 text-[#35C493]" />
            </div>
            <h2 className="text-white font-semibold text-lg mb-2">Aún no tienes espacios</h2>
            <p className="text-slate-400 text-sm mb-6 max-w-xs">Crea tu primer Espot para empezar a recibir reservas en la plataforma.</p>
            <button
              onClick={() => setView('create')}
              className="flex items-center gap-2 bg-[#35C493] hover:bg-[#4DD9A7] text-white font-semibold px-6 py-3 rounded-xl transition-colors"
            >
              <PlusCircle size={18} /> Crear mi primer Espot
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-5">
            {spaces.map((space: any) => {
              const pricing = space.space_pricing?.[0]
              const cover = space.space_images?.[0]?.url
              return (
                <div key={space.id} className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:border-[rgba(53,196,147,0.25)] transition-all group">
                  {/* Cover image */}
                  <div className="relative h-44 bg-slate-800">
                    {cover ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={cover} alt={space.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Building2 className="w-10 h-10 text-slate-600" />
                      </div>
                    )}
                    {/* Status badge */}
                    <div className={cn(
                      'absolute top-3 right-3 flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border',
                      space.is_published
                        ? 'bg-green-600/20 text-green-400 border-green-500/30'
                        : 'bg-amber-600/20 text-amber-400 border-amber-500/30'
                    )}>
                      {space.is_published ? <><Eye size={11} /> Publicado</> : <><EyeOff size={11} /> Borrador</>}
                    </div>
                  </div>

                  {/* Info */}
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div>
                        <h3 className="text-white font-semibold text-base leading-tight">{space.name}</h3>
                        <div className="flex items-center gap-1.5 mt-1 text-slate-400 text-xs">
                          <MapPin size={11} />
                          <span>{space.sector ? `${space.sector}, ` : ''}{space.city}</span>
                        </div>
                      </div>
                      <span className="shrink-0 bg-[rgba(53,196,147,0.12)] text-[#4DD9A7] text-xs px-2 py-1 rounded-lg border border-[rgba(53,196,147,0.20)] capitalize">
                        {space.category}
                      </span>
                    </div>

                    {/* Stats row */}
                    <div className="flex items-center gap-4 mb-4">
                      <div className="flex items-center gap-1.5 text-slate-400 text-xs">
                        <Users size={12} />
                        <span>Hasta {space.capacity_max} personas</span>
                      </div>
                      {pricing && (
                        <div className="flex items-center gap-1.5 text-slate-400 text-xs">
                          <DollarSign size={12} />
                          <span>
                            {pricing.pricing_type === 'hourly' && `${formatCurrency(pricing.hourly_price)} / hr`}
                            {pricing.pricing_type === 'minimum_consumption' && `Min. ${formatCurrency(pricing.minimum_consumption)}`}
                            {pricing.pricing_type === 'fixed_package' && formatCurrency(pricing.fixed_price)}
                            {pricing.pricing_type === 'custom_quote' && 'Cotización'}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Pricing type pill */}
                    {pricing && (
                      <div className="flex items-center gap-2 mb-4">
                        <span className="text-xs bg-white/5 text-slate-400 px-2 py-1 rounded-lg border border-white/10">
                          {pricingLabel[pricing.pricing_type] ?? pricing.pricing_type}
                        </span>
                        {space.space_addons?.length > 0 && (
                          <span className="text-xs bg-white/5 text-slate-400 px-2 py-1 rounded-lg border border-white/10">
                            {space.space_addons.length} adicionales
                          </span>
                        )}
                      </div>
                    )}

                    <div className="flex gap-2">
                      <button
                        onClick={() => loadSpaceForEdit(space)}
                        className="flex-1 flex items-center justify-center gap-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white text-sm font-medium py-2 rounded-xl transition-colors">
                        <Pencil size={14} /> Editar
                      </button>
                      {!space.is_published && (
                        <button
                          onClick={async () => {
                            await publishSpace(space.id)
                            setSpaces(prev => prev.map((s: any) => s.id === space.id ? {...s, is_published: true} : s))
                          }}
                          className="flex-1 flex items-center justify-center gap-1.5 bg-[#35C493] hover:bg-[#4DD9A7] text-white text-sm font-medium py-2 rounded-xl transition-colors"
                        >
                          <Eye size={14} /> Publicar
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  // ── VISTA: Wizard de creación ─────────────────────────────
  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8 flex items-center gap-4">
        <button
          onClick={() => setView('list')}
          className="text-slate-400 hover:text-white transition-colors text-sm flex items-center gap-1"
        >
          ← Mis Espots
        </button>
        <div>
          <h1 className="text-2xl font-bold text-white">Nuevo Espot</h1>
          <p className="text-slate-400 mt-0.5 text-sm">Completa todos los pasos para publicar tu espacio</p>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center gap-1 mb-10 overflow-x-auto pb-2">
        {steps.map((step, i) => {
          const Icon = step.icon
          const isActive = currentStep === step.id
          const isDone = currentStep > step.id
          return (
            <div key={step.id} className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => isDone && setCurrentStep(step.id)}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all',
                  isActive ? 'bg-[#35C493] text-white shadow-lg shadow-[rgba(53,196,147,0.25)]' :
                  isDone  ? 'bg-green-600/20 text-green-400 border border-green-500/20 cursor-pointer hover:bg-green-600/30' :
                            'bg-white/5 text-slate-500 border border-white/10 cursor-not-allowed'
                )}
              >
                {isDone ? <CheckCircle size={14} /> : <Icon size={14} />}
                <span className="hidden sm:inline">{step.label}</span>
              </button>
              {i < steps.length - 1 && (
                <div className={cn('w-6 h-px', isDone ? 'bg-green-500/40' : 'bg-white/10')} />
              )}
            </div>
          )
        })}
      </div>

      {/* Step Content */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-8">

        {/* STEP 1: Información básica */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-white mb-1">Información básica</h2>
              <p className="text-slate-400 text-sm">Cuéntanos sobre tu espacio</p>
            </div>

            <div>
              <label className="block text-slate-300 text-sm font-medium mb-1.5">Nombre del espacio</label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Ej: Salón Imperial Santo Domingo"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-[#35C493] focus:ring-1 focus:ring-[#35C493] transition-colors"
              />
            </div>

            <div>
              <label className="block text-slate-300 text-sm font-medium mb-3">Tipo de espacio</label>
              <div className="grid grid-cols-5 gap-2">
                {categories.map(cat => (
                  <button
                    key={cat.value}
                    onClick={() => setCategory(cat.value)}
                    className={cn(
                      'flex flex-col items-center gap-1.5 p-3 rounded-xl border text-xs font-medium transition-all',
                      category === cat.value
                        ? 'bg-[rgba(53,196,147,0.12)] border-[rgba(53,196,147,0.40)] text-[#4DD9A7]'
                        : 'bg-white/5 border-white/10 text-slate-400 hover:border-white/20 hover:text-white'
                    )}
                  >
                    <span className="text-xl">{cat.emoji}</span>
                    <span>{cat.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-slate-300 text-sm font-medium mb-1.5">Descripción</label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Describe tu espacio: ambiente, equipos incluidos, qué hace especial tu Espot..."
                rows={4}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-[#35C493] focus:ring-1 focus:ring-[#35C493] transition-colors resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-300 text-sm font-medium mb-1.5">Dirección</label>
                <input
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  placeholder="Av. Winston Churchill #123"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-[#35C493] focus:ring-1 focus:ring-[#35C493] transition-colors"
                />
              </div>
              <div>
                <label className="block text-slate-300 text-sm font-medium mb-1.5">Sector</label>
                <input
                  value={sector}
                  onChange={e => setSector(e.target.value)}
                  placeholder="Piantini, Naco, Bella Vista..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-[#35C493] focus:ring-1 focus:ring-[#35C493] transition-colors"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-300 text-sm font-medium mb-1.5">Capacidad mínima</label>
                <input
                  type="number"
                  value={capacityMin}
                  onChange={e => setCapacityMin(e.target.value)}
                  placeholder="20"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-[#35C493] focus:ring-1 focus:ring-[#35C493] transition-colors"
                />
              </div>
              <div>
                <label className="block text-slate-300 text-sm font-medium mb-1.5">Capacidad máxima</label>
                <input
                  type="number"
                  value={capacityMax}
                  onChange={e => setCapacityMax(e.target.value)}
                  placeholder="200"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-[#35C493] focus:ring-1 focus:ring-[#35C493] transition-colors"
                />
              </div>
            </div>

            {/* Photo upload */}
            <div>
              <label className="block text-slate-300 text-sm font-medium mb-1.5">Fotos del espacio</label>
              <PhotoUploader onChange={photos => setPendingPhotos(photos)} />
            </div>
          </div>
        )}

        {/* STEP 2: Precios */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-white mb-1">Modalidad de precio</h2>
              <p className="text-slate-400 text-sm">¿Cómo quieres vender tu espacio?</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {pricingOptions.map(option => (
                <button
                  key={option.value}
                  onClick={() => setPricingType(option.value)}
                  className={cn(
                    'text-left p-4 rounded-xl border transition-all',
                    pricingType === option.value
                      ? 'bg-[rgba(53,196,147,0.12)] border-[rgba(53,196,147,0.40)]'
                      : 'bg-white/5 border-white/10 hover:border-white/20'
                  )}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">{option.emoji}</span>
                    <span className={cn('font-semibold text-sm', pricingType === option.value ? 'text-[#4DD9A7]' : 'text-white')}>
                      {option.label}
                    </span>
                  </div>
                  <p className="text-slate-400 text-xs mb-2">{option.desc}</p>
                  <p className="text-slate-500 text-xs">Ideal: {option.ideal}</p>
                </button>
              ))}
            </div>

            {/* Dynamic fields based on pricing type */}
            {pricingType === 'hourly' && (
              <div className="bg-[rgba(53,196,147,0.07)] border border-[rgba(53,196,147,0.20)] rounded-xl p-5 space-y-4">
                <h3 className="text-[#4DD9A7] font-medium text-sm">Configuración de precio por hora</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-slate-300 text-xs font-medium mb-1.5">Precio por hora (RD$)</label>
                    <input
                      type="number"
                      value={hourlyPrice}
                      onChange={e => setHourlyPrice(e.target.value)}
                      placeholder="5000"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-[#35C493] text-sm transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 text-xs font-medium mb-1.5">Mínimo de horas</label>
                    <input
                      type="number"
                      value={minHours}
                      onChange={e => setMinHours(e.target.value)}
                      placeholder="3"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-[#35C493] text-sm transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 text-xs font-medium mb-1.5">Máximo de horas</label>
                    <input
                      type="number"
                      value={maxHours}
                      onChange={e => setMaxHours(e.target.value)}
                      placeholder="8"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-[#35C493] text-sm transition-colors"
                    />
                  </div>
                </div>
                {hourlyPrice && minHours && (
                  <div className="bg-white/5 rounded-lg p-3 text-sm text-slate-300">
                    💡 El cliente pagaría mínimo <strong className="text-white">{formatCurrency(Number(hourlyPrice) * Number(minHours))}</strong> por {minHours} horas
                  </div>
                )}
              </div>
            )}

            {pricingType === 'minimum_consumption' && (
              <div className="bg-[rgba(53,196,147,0.07)] border border-[rgba(53,196,147,0.20)] rounded-xl p-5 space-y-4">
                <h3 className="text-[#4DD9A7] font-medium text-sm">Configuración de consumo mínimo</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-300 text-xs font-medium mb-1.5">Consumo mínimo (RD$)</label>
                    <input
                      type="number"
                      value={minConsumption}
                      onChange={e => setMinConsumption(e.target.value)}
                      placeholder="60000"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-[#35C493] text-sm transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 text-xs font-medium mb-1.5">Duración de la sesión (horas)</label>
                    <input
                      type="number"
                      value={sessionHours}
                      onChange={e => setSessionHours(e.target.value)}
                      placeholder="4"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-[#35C493] text-sm transition-colors"
                    />
                  </div>
                </div>
                <div className="bg-white/5 rounded-lg p-3 text-xs text-slate-400">
                  El cliente reserva el espacio comprometiéndose a consumir al menos <strong className="text-white">{minConsumption ? formatCurrency(Number(minConsumption)) : 'ese monto'}</strong> en comida y bebidas durante el evento.
                </div>
              </div>
            )}

            {pricingType === 'fixed_package' && (
              <div className="bg-[rgba(53,196,147,0.07)] border border-[rgba(53,196,147,0.20)] rounded-xl p-5 space-y-4">
                <h3 className="text-[#4DD9A7] font-medium text-sm">Configuración del paquete</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-300 text-xs font-medium mb-1.5">Nombre del paquete</label>
                    <input
                      value={packageName}
                      onChange={e => setPackageName(e.target.value)}
                      placeholder="Paquete Cumpleaños Premium"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-[#35C493] text-sm transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 text-xs font-medium mb-1.5">Precio del paquete (RD$)</label>
                    <input
                      type="number"
                      value={fixedPrice}
                      onChange={e => setFixedPrice(e.target.value)}
                      placeholder="35000"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-[#35C493] text-sm transition-colors"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-slate-300 text-xs font-medium mb-2">¿Qué incluye el paquete?</label>
                  <div className="flex gap-2 mb-2">
                    <input
                      value={newInclude}
                      onChange={e => setNewInclude(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && newInclude.trim()) { setPackageIncludes([...packageIncludes, newInclude.trim()]); setNewInclude('') }}}
                      placeholder="Ej: Espacio 4 horas, música, bartender..."
                      className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-[#35C493] text-sm transition-colors"
                    />
                    <button
                      onClick={() => { if (newInclude.trim()) { setPackageIncludes([...packageIncludes, newInclude.trim()]); setNewInclude('') }}}
                      className="bg-[#35C493] hover:bg-[#4DD9A7] text-white px-4 py-2.5 rounded-xl transition-colors text-sm"
                    >
                      Agregar
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {packageIncludes.map((item, i) => (
                      <div key={i} className="flex items-center gap-1.5 bg-[rgba(53,196,147,0.12)] text-[#4DD9A7] px-3 py-1 rounded-full text-xs">
                        <CheckCircle size={12} />
                        {item}
                        <button onClick={() => setPackageIncludes(packageIncludes.filter((_, j) => j !== i))} className="hover:text-red-400 ml-0.5">
                          <X size={11} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {pricingType === 'custom_quote' && (
              <div className="bg-amber-600/10 border border-amber-500/20 rounded-xl p-5">
                <p className="text-amber-300 text-sm">
                  💬 Con esta modalidad, los clientes te enviarán una solicitud describiendo su evento. Tú recibirás una notificación y podrás responder con un precio personalizado.
                </p>
              </div>
            )}
          </div>
        )}

        {/* STEP 3: Bloques de tiempo */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-white mb-1">¿Cuándo está disponible tu espacio?</h2>
              <p className="text-slate-400 text-sm">Crea los horarios en los que aceptas eventos. Puedes tener varios bloques.</p>
            </div>

            {/* Presets rápidos */}
            <div>
              <p className="text-slate-400 text-xs font-medium uppercase tracking-wide mb-3">Horarios populares — click para agregar</p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { emoji: '🌅', label: 'Mañana',   sub: '8:00 AM – 1:00 PM',  start: '08:00', end: '13:00', days: [1,2,3,4,5] },
                  { emoji: '☀️', label: 'Tarde',    sub: '1:00 PM – 7:00 PM',  start: '13:00', end: '19:00', days: [1,2,3,4,5,6] },
                  { emoji: '🌙', label: 'Noche',    sub: '7:00 PM – 12:00 AM', start: '19:00', end: '00:00', days: [5,6] },
                  { emoji: '🎉', label: 'Full Day',  sub: '8:00 AM – 8:00 PM',  start: '08:00', end: '20:00', days: [6,0] },
                  { emoji: '🍽️', label: 'Almuerzo', sub: '12:00 PM – 4:00 PM', start: '12:00', end: '16:00', days: [1,2,3,4,5] },
                  { emoji: '🥂', label: 'Happy Hour',sub: '5:00 PM – 9:00 PM', start: '17:00', end: '21:00', days: [3,4,5] },
                ].map(preset => {
                  const already = timeBlocks.some(b => b.start_time === preset.start && b.end_time === preset.end)
                  return (
                    <button
                      key={preset.label}
                      disabled={already}
                      onClick={() => setTimeBlocks([...timeBlocks, { block_name: preset.label, start_time: preset.start, end_time: preset.end, days: preset.days }])}
                      className={cn(
                        'flex items-center gap-3 p-3 rounded-xl border text-left transition-all',
                        already
                          ? 'bg-green-600/10 border-green-500/20 opacity-60 cursor-not-allowed'
                          : 'bg-white/5 border-white/10 hover:border-violet-500/40 hover:bg-[#35C493]/5'
                      )}
                    >
                      <span className="text-2xl shrink-0">{preset.emoji}</span>
                      <div>
                        <div className={cn('text-sm font-medium', already ? 'text-green-400' : 'text-white')}>
                          {already ? '✓ ' : ''}{preset.label}
                        </div>
                        <div className="text-slate-500 text-xs">{preset.sub}</div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Bloques creados */}
            {timeBlocks.length > 0 && (
              <div>
                <p className="text-slate-400 text-xs font-medium uppercase tracking-wide mb-3">Tus bloques activos</p>
                <div className="space-y-2">
                  {timeBlocks.map((block, i) => {
                    const startH = parseInt(block.start_time)
                    const isNight = startH >= 18
                    const isMorning = startH < 12
                    const color = isNight ? 'from-indigo-600/20 to-purple-700/20 border-indigo-500/20' : isMorning ? 'from-amber-600/20 to-orange-600/20 border-amber-500/20' : 'from-sky-600/20 to-cyan-600/20 border-sky-500/20'
                    const textColor = isNight ? 'text-indigo-300' : isMorning ? 'text-amber-300' : 'text-sky-300'
                    return (
                      <div key={i} className={cn('bg-gradient-to-r border rounded-xl p-4', color)}>
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className={cn('text-2xl font-bold tabular-nums', textColor)}>
                              {block.start_time} – {block.end_time}
                            </div>
                            <span className={cn('text-sm font-medium', textColor)}>{block.block_name}</span>
                          </div>
                          <button
                            onClick={() => setTimeBlocks(timeBlocks.filter((_, j) => j !== i))}
                            className="text-slate-500 hover:text-red-400 transition-colors p-1"
                          >
                            <X size={16} />
                          </button>
                        </div>
                        <div className="flex gap-1.5 flex-wrap">
                          {days.map((d, j) => (
                            <span key={j} className={cn(
                              'text-xs px-2.5 py-1 rounded-full font-medium transition-all',
                              block.days.includes(j)
                                ? isNight ? 'bg-indigo-600/40 text-indigo-200' : isMorning ? 'bg-amber-600/40 text-amber-200' : 'bg-sky-600/40 text-sky-200'
                                : 'bg-white/5 text-slate-600'
                            )}>
                              {d}
                            </span>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Bloque personalizado */}
            <div>
              <p className="text-slate-400 text-xs font-medium uppercase tracking-wide mb-3">Crear bloque personalizado</p>
              <div className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-slate-400 text-xs mb-1.5">Nombre</label>
                    <input
                      value={newBlock.block_name}
                      onChange={e => setNewBlock({...newBlock, block_name: e.target.value})}
                      placeholder="Ej: Bloque VIP"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-[#35C493] text-sm transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 text-xs mb-1.5">Desde</label>
                    <input
                      type="time"
                      value={newBlock.start_time}
                      onChange={e => setNewBlock({...newBlock, start_time: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-[#35C493] text-sm transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 text-xs mb-1.5">Hasta</label>
                    <input
                      type="time"
                      value={newBlock.end_time}
                      onChange={e => setNewBlock({...newBlock, end_time: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-[#35C493] text-sm transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 text-xs mb-2">Días en que aplica</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setNewBlock({...newBlock, days: newBlock.days.length === 7 ? [] : [0,1,2,3,4,5,6]})}
                      className={cn('px-3 py-2 rounded-lg text-xs font-medium transition-all border',
                        newBlock.days.length === 7 ? 'bg-[#35C493] text-white border-violet-500' : 'bg-white/5 text-slate-400 border-white/10 hover:bg-white/10'
                      )}
                    >
                      Todos
                    </button>
                    {days.map((d, j) => (
                      <button
                        key={j}
                        onClick={() => toggleDay(j)}
                        className={cn(
                          'w-10 h-10 rounded-lg text-xs font-medium transition-all border',
                          newBlock.days.includes(j)
                            ? 'bg-[#35C493] text-white border-violet-500'
                            : 'bg-white/5 text-slate-400 border-white/10 hover:bg-white/10'
                        )}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Preview del bloque */}
                {newBlock.start_time && newBlock.end_time && (
                  <div className="bg-[rgba(53,196,147,0.07)] border border-[rgba(53,196,147,0.20)] rounded-lg px-4 py-2.5 text-sm text-[#4DD9A7] flex items-center gap-2">
                    <Clock size={14} />
                    Vista previa: <strong className="text-white">{newBlock.block_name || 'Sin nombre'}</strong> de <strong className="text-white">{newBlock.start_time}</strong> a <strong className="text-white">{newBlock.end_time}</strong>
                    {newBlock.days.length > 0 && <span className="text-[#35C493]">· {newBlock.days.length === 7 ? 'todos los días' : `${newBlock.days.length} día${newBlock.days.length > 1 ? 's' : ''}`}</span>}
                  </div>
                )}

                <button
                  onClick={addTimeBlock}
                  disabled={!newBlock.block_name || !newBlock.start_time || !newBlock.end_time}
                  className="flex items-center gap-2 bg-[#35C493] hover:bg-[#4DD9A7] disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-colors"
                >
                  <Plus size={16} /> Agregar este bloque
                </button>
              </div>
            </div>

            {timeBlocks.length === 0 && (
              <div className="bg-blue-600/10 border border-blue-500/20 rounded-xl p-4 text-blue-300 text-sm">
                💡 Si tu espacio se puede reservar libremente por horas (sin horarios fijos), puedes saltar este paso.
              </div>
            )}
          </div>
        )}

        {/* STEP 4: Adicionales */}
        {currentStep === 4 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-white mb-1">Adicionales y extras</h2>
              <p className="text-slate-400 text-sm">El cliente podrá agregarlos al momento de reservar</p>
            </div>

            <div>
              <h3 className="text-slate-300 text-sm font-medium mb-3">Selecciona los que ofreces</h3>
              <div className="grid grid-cols-3 gap-2">
                {addonSuggestions.map(addon => {
                  const selected = addons.find(a => a.name === addon.name)
                  return (
                    <button
                      key={addon.name}
                      onClick={() => toggleAddon(addon)}
                      className={cn(
                        'flex items-center gap-3 p-3 rounded-xl border text-left transition-all',
                        selected
                          ? 'bg-[rgba(53,196,147,0.12)] border-[rgba(53,196,147,0.40)]'
                          : 'bg-white/5 border-white/10 hover:border-white/20'
                      )}
                    >
                      <span className="text-xl shrink-0">{addon.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <div className={cn('text-sm font-medium truncate', selected ? 'text-[#4DD9A7]' : 'text-white')}>
                          {addon.name}
                        </div>
                        <div className="text-slate-500 text-xs">
                          {addon.price > 0 ? formatCurrency(addon.price) : 'Precio variable'} / {addon.unit}
                        </div>
                      </div>
                      {selected && <CheckCircle size={14} className="text-[#35C493] shrink-0" />}
                    </button>
                  )
                })}
              </div>
            </div>

            {addons.length > 0 && (
              <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                <h3 className="text-slate-300 text-sm font-medium mb-3">Ajusta los precios de tus adicionales</h3>
                <div className="space-y-2">
                  {addons.map((addon, i) => (
                    <div key={i} className="flex items-center gap-4">
                      <span className="text-lg shrink-0">{addon.emoji}</span>
                      <span className="text-white text-sm flex-1">{addon.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500 text-xs">RD$</span>
                        <input
                          type="number"
                          value={addon.price}
                          onChange={e => {
                            const updated = [...addons]
                            updated[i] = { ...addon, price: Number(e.target.value) }
                            setAddons(updated)
                          }}
                          className="w-24 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-[#35C493] transition-colors"
                        />
                        <select
                          value={addon.unit}
                          onChange={e => {
                            const updated = [...addons]
                            updated[i] = { ...addon, unit: e.target.value }
                            setAddons(updated)
                          }}
                          className="bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-slate-300 text-xs focus:outline-none"
                        >
                          <option value="evento">/ evento</option>
                          <option value="hora">/ hora</option>
                          <option value="persona">/ persona</option>
                        </select>
                      </div>
                      <button onClick={() => toggleAddon(addon)} className="text-red-400 hover:text-red-300">
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 5: Reglas y condiciones */}
        {currentStep === 5 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-white mb-1">Reglas y condiciones</h2>
              <p className="text-slate-400 text-sm">Esto se muestra al cliente antes de reservar — sin sorpresas</p>
            </div>

            {/* Permisos */}
            <div>
              <h3 className="text-slate-300 text-sm font-medium mb-3">¿Qué está permitido?</h3>
              <div className="space-y-2">
                {[
                  { label: 'Decoración externa', desc: 'El cliente puede traer su propia decoración', value: allowsDecoration, setter: setAllowsDecoration },
                  { label: 'Comida externa', desc: 'El cliente puede traer su propio catering', value: allowsFood, setter: setAllowsFood },
                  { label: 'Bebidas alcohólicas externas', desc: 'El cliente puede traer su propio alcohol', value: allowsAlcohol, setter: setAllowsAlcohol },
                ].map(item => (
                  <div key={item.label} className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-xl">
                    <div>
                      <div className="text-white text-sm font-medium">{item.label}</div>
                      <div className="text-slate-500 text-xs">{item.desc}</div>
                    </div>
                    <button
                      onClick={() => item.setter(!item.value)}
                      className={cn(
                        'w-12 h-6 rounded-full transition-all relative',
                        item.value ? 'bg-[#35C493]' : 'bg-white/10'
                      )}
                    >
                      <span className={cn('absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all', item.value ? 'left-6' : 'left-0.5')} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Hora de música */}
            <div>
              <label className="block text-slate-300 text-sm font-medium mb-1.5">Hora límite de música</label>
              <input
                type="time"
                value={musicCutoff}
                onChange={e => setMusicCutoff(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#35C493] text-sm transition-colors"
              />
            </div>

            {/* Depósito */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="text-slate-300 text-sm font-medium">Depósito reembolsable</div>
                  <div className="text-slate-500 text-xs">Monto que el cliente paga para garantizar el espacio</div>
                </div>
                <button
                  onClick={() => setDepositRequired(!depositRequired)}
                  className={cn('w-12 h-6 rounded-full transition-all relative', depositRequired ? 'bg-[#35C493]' : 'bg-white/10')}
                >
                  <span className={cn('absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all', depositRequired ? 'left-6' : 'left-0.5')} />
                </button>
              </div>
              {depositRequired && (
                <input
                  type="number"
                  value={depositAmount}
                  onChange={e => setDepositAmount(e.target.value)}
                  placeholder="Monto del depósito en RD$"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-[#35C493] text-sm transition-colors"
                />
              )}
            </div>

            {/* Política de cancelación */}
            <div>
              <label className="block text-slate-300 text-sm font-medium mb-3">Política de cancelación</label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { value: 'flexible', label: 'Flexible', desc: '100% reembolso hasta 24 hrs antes', color: 'green' },
                  { value: 'moderada', label: 'Moderada', desc: '50% reembolso hasta 72 hrs antes', color: 'amber' },
                  { value: 'estricta', label: 'Estricta', desc: 'Sin reembolso', color: 'red' },
                ].map(policy => (
                  <button
                    key={policy.value}
                    onClick={() => setCancellationPolicy(policy.value)}
                    className={cn(
                      'p-4 rounded-xl border text-left transition-all',
                      cancellationPolicy === policy.value
                        ? 'bg-[rgba(53,196,147,0.12)] border-[rgba(53,196,147,0.40)]'
                        : 'bg-white/5 border-white/10 hover:border-white/20'
                    )}
                  >
                    <div className={cn('font-semibold text-sm mb-1', cancellationPolicy === policy.value ? 'text-[#4DD9A7]' : 'text-white')}>
                      {policy.label}
                    </div>
                    <div className="text-slate-400 text-xs">{policy.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom rules */}
            <div>
              <label className="block text-slate-300 text-sm font-medium mb-1.5">Reglas adicionales (opcional)</label>
              <textarea
                value={customRules}
                onChange={e => setCustomRules(e.target.value)}
                placeholder="Ej: No se permiten menores de 18 años después de las 10pm. El espacio debe quedar limpio al finalizar..."
                rows={3}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-[#35C493] text-sm transition-colors resize-none"
              />
            </div>
          </div>
        )}

        {/* STEP 6: Términos de pago */}
        {currentStep === 6 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-white mb-1">¿Cómo quieres cobrar?</h2>
              <p className="text-slate-400 text-sm">Elige cómo se estructura el pago entre el cliente, Espot y tú</p>
            </div>

            <div className="space-y-3">
              {paymentTermOptions.map(option => (
                <button
                  key={option.value}
                  onClick={() => setPaymentTerm(option.value)}
                  className={cn(
                    'w-full text-left p-5 rounded-xl border transition-all',
                    paymentTerm === option.value
                      ? 'bg-[rgba(53,196,147,0.12)] border-[rgba(53,196,147,0.40)]'
                      : 'bg-white/5 border-white/10 hover:border-white/20'
                  )}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={cn('font-semibold', paymentTerm === option.value ? 'text-[#4DD9A7]' : 'text-white')}>
                      {option.label}
                    </span>
                    {paymentTerm === option.value && <CheckCircle size={18} className="text-[#35C493]" />}
                  </div>
                  <p className="text-slate-400 text-sm">{option.desc}</p>
                </button>
              ))}
            </div>

            <div className="bg-blue-600/10 border border-blue-500/20 rounded-xl p-4 text-blue-300 text-sm">
              💡 Espot cobra siempre el 10% de comisión sobre el total de la reserva. Este porcentaje cubre procesamiento de pagos, soporte y visibilidad en la plataforma.
            </div>
          </div>
        )}

        {/* STEP 7: Publicar */}
        {currentStep === 7 && (
          <div className="space-y-6">
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-gradient-to-br from-violet-500 to-[#28A87C] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-[rgba(53,196,147,0.25)]">
                <CheckCircle className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">¡Todo listo para publicar!</h2>
              <p className="text-slate-400">Tu Espot está configurado. Revisa el resumen antes de publicar.</p>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                <div className="text-slate-500 text-xs mb-2 uppercase tracking-wide">Espacio</div>
                <div className="text-white font-semibold">{name || 'Sin nombre'}</div>
                <div className="text-slate-400 text-sm">{category || 'Sin categoría'} · {capacityMax || '?'} personas máx.</div>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                <div className="text-slate-500 text-xs mb-2 uppercase tracking-wide">Pricing</div>
                <div className="text-white font-semibold">
                  {pricingType === 'hourly' && `${formatCurrency(Number(hourlyPrice))} / hora`}
                  {pricingType === 'minimum_consumption' && `Consumo mín. ${formatCurrency(Number(minConsumption))}`}
                  {pricingType === 'fixed_package' && `Paquete ${formatCurrency(Number(fixedPrice))}`}
                  {pricingType === 'custom_quote' && 'Cotización personalizada'}
                  {!pricingType && 'No configurado'}
                </div>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                <div className="text-slate-500 text-xs mb-2 uppercase tracking-wide">Adicionales</div>
                <div className="text-white font-semibold">{addons.length} servicios</div>
                <div className="text-slate-400 text-sm truncate">{addons.map(a => a.name).join(', ') || 'Ninguno'}</div>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                <div className="text-slate-500 text-xs mb-2 uppercase tracking-wide">Cobros</div>
                <div className="text-white font-semibold text-sm">{paymentTermOptions.find(p => p.value === paymentTerm)?.label || 'No configurado'}</div>
              </div>
            </div>

            {saveError && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl px-4 py-3 text-sm">
                {saveError}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={handlePublish}
                disabled={saving || !name || !category || !capacityMax || !pricingType || !paymentTerm}
                className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-[#35C493] to-[#28A87C] hover:from-violet-500 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-xl transition-all shadow-lg shadow-[rgba(53,196,147,0.20)]"
              >
                {saving ? <><Loader2 size={18} className="animate-spin" /> Guardando...</> : '🚀 Publicar mi Espot'}
              </button>
            </div>

            <p className="text-slate-600 text-xs text-center">
              Tu espacio será revisado por el equipo de espot.do antes de aparecer en el marketplace.
            </p>
          </div>
        )}

        {/* Navigation buttons */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-white/10">
          <button
            onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
            disabled={currentStep === 1}
            className="flex items-center gap-2 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-sm font-medium"
          >
            <ChevronLeft size={18} /> Anterior
          </button>

          <span className="text-slate-600 text-sm">Paso {currentStep} de {steps.length}</span>

          {currentStep < 7 && (
            <button
              onClick={() => setCurrentStep(Math.min(7, currentStep + 1))}
              className="flex items-center gap-2 bg-[#35C493] hover:bg-[#4DD9A7] text-white text-sm font-medium px-5 py-2.5 rounded-xl transition-colors"
            >
              Siguiente <ChevronRight size={18} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
