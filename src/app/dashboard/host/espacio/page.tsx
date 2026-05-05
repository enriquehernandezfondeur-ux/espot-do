'use client'

import { useState, useEffect } from 'react'
import { Building2, Clock, DollarSign, Plus, Gift, Shield, CreditCard, CheckCircle, ChevronRight, ChevronLeft, X, Loader2, Eye, EyeOff, MapPin, Users, Pencil, PlusCircle } from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'
import { saveSpace, publishSpace, getMySpaces, saveSpaceImages, updateSpace } from '@/lib/actions/space'
import PhotoUploader from '@/components/dashboard/PhotoUploader'
import WeeklySchedule from '@/components/dashboard/WeeklySchedule'
import ActivityPicker from '@/components/dashboard/ActivityPicker'
import type { BaseActivity } from '@/lib/activities'
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

  const [primaryActivity, setPrimaryActivity]     = useState<BaseActivity | ''>('')
  const [secondaryActivities, setSecondaryActivities] = useState<BaseActivity[]>([])

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
  // Permisos
  const [allowsDecoration, setAllowsDecoration]     = useState(true)
  const [allowsFood, setAllowsFood]                 = useState(false)
  const [allowsAlcohol, setAllowsAlcohol]           = useState(false)
  const [allowsLiveMusic, setAllowsLiveMusic]       = useState(false)
  const [allowsDJ, setAllowsDJ]                     = useState(false)
  const [allowsSmoking, setAllowsSmoking]           = useState(false)
  const [allowsChildren, setAllowsChildren]         = useState(true)
  const [allowsPets, setAllowsPets]                 = useState(false)
  const [allowsParties, setAllowsParties]           = useState(true)
  const [allowsCorporate, setAllowsCorporate]       = useState(true)
  // Ruido
  const [musicCutoff, setMusicCutoff]               = useState('00:00')
  const [noiseLevel, setNoiseLevel]                 = useState<'bajo' | 'moderado' | 'alto'>('moderado')
  // Depósito
  const [depositRequired, setDepositRequired]       = useState(false)
  const [depositAmount, setDepositAmount]           = useState('')
  const [depositRefundable, setDepositRefundable]   = useState(true)
  // Limpieza
  const [includesCleaning, setIncludesCleaning]     = useState(false)
  const [cleaningFee, setCleaningFee]               = useState('')
  // Tiempo extra
  const [allowsExtraHours, setAllowsExtraHours]     = useState(false)
  const [extraHourPrice, setExtraHourPrice]         = useState('')
  // Cancelación y reglas
  const [cancellationPolicy, setCancellationPolicy] = useState('moderada')
  const [customRules, setCustomRules]               = useState('')

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
      primaryActivity, secondaryActivities,
      pricingType: pricingType as PricingType,
      hourlyPrice, minHours, maxHours, minConsumption, sessionHours,
      fixedPrice, packageName, packageHours, packageIncludes,
      timeBlocks, addons,
      musicCutoff, noiseLevel,
      allowsDecoration, allowsFood, allowsAlcohol,
      allowsLiveMusic, allowsDJ, allowsSmoking,
      allowsChildren, allowsPets, allowsParties, allowsCorporate,
      depositRequired, depositAmount, depositRefundable,
      includesCleaning, cleaningFee,
      allowsExtraHours, extraHourPrice,
      cancellationPolicy, customRules,
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

            {/* Actividades / tipos de evento */}
            <div>
              <label className="block text-slate-300 text-sm font-medium mb-1">
                Tipos de evento que acepta tu espacio
              </label>
              <p className="text-xs text-slate-500 mb-3">
                Selecciona los tipos de eventos que mejor describen tu espacio. Máximo 4 (1 principal + 3 secundarios).
              </p>
              <ActivityPicker
                primary={primaryActivity}
                secondary={secondaryActivities}
                onChange={(p, s) => { setPrimaryActivity(p); setSecondaryActivities(s) }}
              />
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

        {/* STEP 3: Disponibilidad semanal */}
        {currentStep === 3 && (
          <div>
            <div className="mb-5">
              <h2 className="text-xl font-bold text-white mb-1">Horarios de disponibilidad</h2>
              <p className="text-slate-400 text-sm">
                Define en qué horarios aceptas reservas cada semana.
              </p>
            </div>
            <WeeklySchedule
              initial={timeBlocks}
              onChange={blocks => setTimeBlocks(blocks)}
            />
          </div>
        )}

        {/* STEP 4: Adicionales */}
        {currentStep === 4 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-white mb-1">Adicionales y extras</h2>
              <p className="text-slate-400 text-sm">
                Activa los servicios que ofreces. El cliente podrá agregarlos al reservar.
              </p>
            </div>

            {/* ─ Sección 1: Selección ─ */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                  ¿Qué ofreces?
                </p>
                {addons.length > 0 && (
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
                    style={{ background: 'rgba(53,196,147,0.1)', color: '#35C493' }}>
                    {addons.length} seleccionado{addons.length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-3 gap-2">
                {addonSuggestions.map(addon => {
                  const selected = addons.find(a => a.name === addon.name)
                  return (
                    <button
                      key={addon.name}
                      onClick={() => toggleAddon(addon)}
                      className="flex items-center gap-3 p-3 rounded-xl border text-left transition-all"
                      style={selected ? {
                        background: 'rgba(53,196,147,0.10)',
                        border:     '1.5px solid rgba(53,196,147,0.35)',
                      } : {
                        background: 'rgba(255,255,255,0.03)',
                        border:     '1px solid rgba(255,255,255,0.08)',
                      }}
                    >
                      <span className="text-xl shrink-0 opacity-80">{addon.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate"
                          style={{ color: selected ? '#4DD9A7' : 'rgba(255,255,255,0.7)' }}>
                          {addon.name}
                        </div>
                        <div className="text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>
                          {addon.price > 0 ? formatCurrency(addon.price) : 'Precio variable'} / {addon.unit}
                        </div>
                      </div>
                      <div className="shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all"
                        style={selected ? { background: '#35C493', borderColor: '#35C493' } : { borderColor: 'rgba(255,255,255,0.15)' }}>
                        {selected && <CheckCircle size={10} className="text-white" />}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* ─ Sección 2: Configurar precios (solo si hay seleccionados) ─ */}
            {addons.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3">
                  Configura precios de los seleccionados
                </p>
                <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
                  {addons.map((addon, i) => (
                    <div key={i}
                      className="flex items-center gap-4 px-4 py-3"
                      style={{ borderBottom: i < addons.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none', background: 'rgba(255,255,255,0.02)' }}>
                      <span className="text-base shrink-0">{addon.emoji}</span>
                      <span className="text-sm font-medium flex-1" style={{ color: 'rgba(255,255,255,0.8)' }}>{addon.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>RD$</span>
                        <input
                          type="number"
                          value={addon.price}
                          onChange={e => {
                            const updated = [...addons]
                            updated[i] = { ...addon, price: Number(e.target.value) }
                            setAddons(updated)
                          }}
                          className="w-24 rounded-lg px-3 py-1.5 text-sm focus:outline-none transition-colors"
                          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
                        />
                        <select
                          value={addon.unit}
                          onChange={e => {
                            const updated = [...addons]
                            updated[i] = { ...addon, unit: e.target.value }
                            setAddons(updated)
                          }}
                          className="rounded-lg px-2 py-1.5 text-xs focus:outline-none"
                          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)' }}
                        >
                          <option value="evento">/ evento</option>
                          <option value="hora">/ hora</option>
                          <option value="persona">/ persona</option>
                        </select>
                      </div>
                      <button onClick={() => toggleAddon(addon)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg transition-all"
                        style={{ color: 'rgba(248,113,113,0.6)', background: 'rgba(248,113,113,0.08)' }}>
                        <X size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {addons.length === 0 && (
              <div className="text-center py-6 rounded-xl"
                style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.08)' }}>
                <p className="text-sm" style={{ color: 'rgba(255,255,255,0.25)' }}>
                  Ningún adicional seleccionado aún
                </p>
              </div>
            )}
          </div>
        )}

        {/* STEP 5: Reglas y condiciones */}
        {currentStep === 5 && (
          <div className="space-y-7">
            <div>
              <h2 className="text-xl font-bold text-white mb-1">Reglas y condiciones</h2>
              <p className="text-slate-400 text-sm">Define las reglas de tu espacio. El cliente las verá antes de reservar.</p>
            </div>

            {/* ─── 1. PERMISOS GENERALES ─── */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3">Permisos generales</p>
              <div className="grid grid-cols-2 gap-2">
                {([
                  { label: 'Decoración externa',    desc: 'Globos, flores, mantelería', value: allowsDecoration,  setter: setAllowsDecoration },
                  { label: 'Comida externa',         desc: 'Catering o comida propia',   value: allowsFood,        setter: setAllowsFood },
                  { label: 'Alcohol externo',        desc: 'El cliente trae bebidas',    value: allowsAlcohol,     setter: setAllowsAlcohol },
                  { label: 'Música en vivo',         desc: 'Banda, artista o tocada',    value: allowsLiveMusic,   setter: setAllowsLiveMusic },
                  { label: 'DJ / sonido alto',       desc: 'DJ profesional o sistema',   value: allowsDJ,          setter: setAllowsDJ },
                  { label: 'Fumar',                  desc: 'En áreas habilitadas',       value: allowsSmoking,     setter: setAllowsSmoking },
                  { label: 'Niños',                  desc: 'Menores de edad',            value: allowsChildren,    setter: setAllowsChildren },
                  { label: 'Mascotas',               desc: 'Animales de compañía',       value: allowsPets,        setter: setAllowsPets },
                  { label: 'Fiestas',                desc: 'Eventos sociales',           value: allowsParties,     setter: setAllowsParties },
                  { label: 'Eventos corporativos',   desc: 'Reuniones de empresa',       value: allowsCorporate,   setter: setAllowsCorporate },
                ] as { label: string; desc: string; value: boolean; setter: (v: boolean) => void }[]).map(item => (
                  <div key={item.label}
                    className="flex items-center justify-between px-4 py-3 rounded-xl"
                    style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${item.value ? 'rgba(53,196,147,0.25)' : 'rgba(255,255,255,0.06)'}` }}>
                    <div>
                      <div className="text-sm font-medium text-white">{item.label}</div>
                      <div className="text-xs text-slate-500">{item.desc}</div>
                    </div>
                    <button
                      onClick={() => item.setter(!item.value)}
                      className="w-11 h-6 rounded-full relative transition-all shrink-0 ml-3"
                      style={{ background: item.value ? '#35C493' : 'rgba(255,255,255,0.1)' }}>
                      <span className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all"
                        style={{ left: item.value ? 22 : 2 }} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* ─── 2. CONTROL DE RUIDO ─── */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3">Control de ruido</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 text-sm font-medium mb-2">Nivel de ruido permitido</label>
                  <div className="flex gap-2">
                    {(['bajo', 'moderado', 'alto'] as const).map(level => (
                      <button key={level}
                        onClick={() => setNoiseLevel(level)}
                        className="flex-1 py-2.5 rounded-xl text-sm font-semibold capitalize transition-all"
                        style={noiseLevel === level ? {
                          background: '#35C493', color: '#0B0F0E',
                        } : {
                          background: 'rgba(255,255,255,0.05)',
                          color: '#94a3b8',
                          border: '1px solid rgba(255,255,255,0.08)',
                        }}>
                        {level.charAt(0).toUpperCase() + level.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-slate-300 text-sm font-medium mb-2">Hora límite de música</label>
                  <input type="time" value={musicCutoff} onChange={e => setMusicCutoff(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#35C493] text-sm transition-colors" />
                </div>
              </div>
            </div>

            {/* ─── 3. DEPÓSITO Y PAGOS ─── */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3">Depósito y pagos</p>
              <div className="space-y-3">
                {/* Depósito */}
                <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="text-sm font-medium text-white">Depósito de garantía</div>
                      <div className="text-xs text-slate-500">Monto que el cliente paga como garantía</div>
                    </div>
                    <button onClick={() => setDepositRequired(!depositRequired)}
                      className="w-11 h-6 rounded-full relative transition-all shrink-0"
                      style={{ background: depositRequired ? '#35C493' : 'rgba(255,255,255,0.1)' }}>
                      <span className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all"
                        style={{ left: depositRequired ? 22 : 2 }} />
                    </button>
                  </div>
                  {depositRequired && (
                    <div className="grid grid-cols-2 gap-3 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                      <div>
                        <label className="block text-slate-400 text-xs mb-1.5">Monto (RD$)</label>
                        <input type="number" value={depositAmount} onChange={e => setDepositAmount(e.target.value)}
                          placeholder="Ej: 5000"
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-[#35C493] text-sm" />
                      </div>
                      <div>
                        <label className="block text-slate-400 text-xs mb-1.5">¿Es reembolsable?</label>
                        <div className="flex gap-2">
                          {[{ v: true, l: 'Sí' }, { v: false, l: 'No' }].map(opt => (
                            <button key={String(opt.v)} onClick={() => setDepositRefundable(opt.v)}
                              className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all"
                              style={depositRefundable === opt.v ? {
                                background: '#35C493', color: '#0B0F0E',
                              } : {
                                background: 'rgba(255,255,255,0.05)', color: '#94a3b8',
                                border: '1px solid rgba(255,255,255,0.08)',
                              }}>
                              {opt.l}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Limpieza */}
                <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="text-sm font-medium text-white">Servicio de limpieza</div>
                      <div className="text-xs text-slate-500">¿Incluye limpieza al finalizar el evento?</div>
                    </div>
                    <button onClick={() => setIncludesCleaning(!includesCleaning)}
                      className="w-11 h-6 rounded-full relative transition-all shrink-0"
                      style={{ background: includesCleaning ? '#35C493' : 'rgba(255,255,255,0.1)' }}>
                      <span className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all"
                        style={{ left: includesCleaning ? 22 : 2 }} />
                    </button>
                  </div>
                  {!includesCleaning && (
                    <div className="pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                      <label className="block text-slate-400 text-xs mb-1.5">Cargo de limpieza (RD$) — opcional</label>
                      <input type="number" value={cleaningFee} onChange={e => setCleaningFee(e.target.value)}
                        placeholder="Dejar en blanco si no aplica"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-[#35C493] text-sm" />
                    </div>
                  )}
                </div>

                {/* Horas extra */}
                <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="text-sm font-medium text-white">Horas extra</div>
                      <div className="text-xs text-slate-500">¿Se pueden solicitar horas adicionales?</div>
                    </div>
                    <button onClick={() => setAllowsExtraHours(!allowsExtraHours)}
                      className="w-11 h-6 rounded-full relative transition-all shrink-0"
                      style={{ background: allowsExtraHours ? '#35C493' : 'rgba(255,255,255,0.1)' }}>
                      <span className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all"
                        style={{ left: allowsExtraHours ? 22 : 2 }} />
                    </button>
                  </div>
                  {allowsExtraHours && (
                    <div className="pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                      <label className="block text-slate-400 text-xs mb-1.5">Precio por hora extra (RD$)</label>
                      <input type="number" value={extraHourPrice} onChange={e => setExtraHourPrice(e.target.value)}
                        placeholder="Ej: 5000"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-[#35C493] text-sm" />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ─── 4. POLÍTICA DE CANCELACIÓN ─── */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3">Política de cancelación</p>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { value: 'flexible', label: 'Flexible',  desc: '100% reembolso hasta 24h antes' },
                  { value: 'moderada', label: 'Moderada',  desc: '50% reembolso hasta 72h antes' },
                  { value: 'estricta', label: 'Estricta',  desc: 'Sin reembolso' },
                ].map(policy => (
                  <button key={policy.value}
                    onClick={() => setCancellationPolicy(policy.value)}
                    className="p-4 rounded-xl border text-left transition-all"
                    style={cancellationPolicy === policy.value ? {
                      background: 'rgba(53,196,147,0.08)',
                      border: '1.5px solid rgba(53,196,147,0.3)',
                    } : {
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.08)',
                    }}>
                    <div className="font-semibold text-sm mb-1"
                      style={{ color: cancellationPolicy === policy.value ? '#35C493' : 'white' }}>
                      {policy.label}
                    </div>
                    <div className="text-xs text-slate-500">{policy.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* ─── 5. REGLAS ADICIONALES ─── */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3">Reglas adicionales</p>
              <textarea
                value={customRules}
                onChange={e => setCustomRules(e.target.value)}
                placeholder="Ej: No se permiten velas. El espacio debe quedar limpio al terminar. Acceso desde las 6pm..."
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
