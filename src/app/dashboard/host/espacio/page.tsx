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

const paymentTermOptions: { value: PaymentTermType; label: string; desc: string; ideal: string }[] = [
  {
    value: 'full_prepaid',
    label: 'Pago completo',
    desc: 'El cliente paga el 100% al confirmar la reserva. Todo pasa por Espot.',
    ideal: 'Reuniones · Coworking · Estudios · Reservas rápidas',
  },
  {
    value: 'platform_guarantee',
    label: 'Pago dividido',
    desc: 'El cliente paga en etapas: 10% al reservar, 40% antes del evento y 50% el día. Todo por Espot.',
    ideal: 'Cumpleaños · Rooftops · Restaurantes · Eventos grandes',
  },
  {
    value: 'quote_only',
    label: 'Cotización personalizada',
    desc: 'El cliente solicita propuesta. Tú envías el precio. Al aceptar, paga por Espot.',
    ideal: 'Bodas · Corporativos · Producciones · Eventos especiales',
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
  const [packageHours, setPackageHours]           = useState('')
  const [pkgExtraHourPrice, setPkgExtraHourPrice] = useState('')
  const [packageIncludes, setPackageIncludes]     = useState<string[]>([])
  const [newInclude, setNewInclude]               = useState('')

  // Step 3 - Time blocks
  const [timeBlocks, setTimeBlocks] = useState<TimeBlock[]>([])
  const [newBlock, setNewBlock] = useState<TimeBlock>({ block_name: '', start_time: '', end_time: '', days: [0,1,2,3,4,5,6] })

  // Step 4 - Addons
  const [addons, setAddons] = useState<AddonItem[]>([])

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
      fixedPrice, packageName, packageHours, pkgExtraHourPrice, packageIncludes,
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
      setPackageHours(String(p.package_hours ?? ''))
      setPkgExtraHourPrice(String(p.extra_hour_price ?? ''))
      setPackageIncludes(p.package_includes ?? [])
    }
    // Addons
    if (space.space_addons?.length) {
      setAddons(space.space_addons.map((a: any) => ({
        name: a.name, price: a.price, unit: a.unit, category: a.category, emoji: '✨',
      })))
    }
    // Actividades
    setPrimaryActivity(space.primary_activity ?? '')
    setSecondaryActivities(space.secondary_activities ?? [])
    // Condiciones
    const c = space.space_conditions?.[0]
    if (c) {
      // Permisos
      setAllowsDecoration(c.allows_external_decoration ?? true)
      setAllowsFood(c.allows_external_food ?? false)
      setAllowsAlcohol(c.allows_external_alcohol ?? false)
      setAllowsLiveMusic(c.allows_live_music ?? false)
      setAllowsDJ(c.allows_dj ?? false)
      setAllowsSmoking(c.allows_smoking ?? false)
      setAllowsChildren(c.allows_children ?? true)
      setAllowsPets(c.allows_pets ?? false)
      setAllowsParties(c.allows_parties ?? true)
      setAllowsCorporate(c.allows_corporate ?? true)
      // Ruido
      setMusicCutoff(c.music_cutoff_time?.slice(0,5) ?? '00:00')
      setNoiseLevel(c.noise_level ?? 'moderado')
      // Depósito
      setDepositRequired(c.deposit_required ?? false)
      setDepositAmount(String(c.deposit_amount ?? ''))
      setDepositRefundable(c.deposit_refundable ?? true)
      // Limpieza
      setIncludesCleaning(c.cleaning_included ?? false)
      setCleaningFee(String(c.cleaning_fee ?? ''))
      // Horas extra
      setAllowsExtraHours(c.overtime_allowed ?? false)
      setExtraHourPrice(String(c.overtime_price ?? ''))
      // Cancelación
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
      <div className="p-4 md:p-8 max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-5 md:mb-8">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
              Mis espacios
            </h1>
            <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
              Gestiona tus espacios publicados en espot.do
            </p>
          </div>
          <button
            onClick={() => setView('create')}
            className="btn-brand flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold"
          >
            <PlusCircle size={16} /> Nuevo espacio
          </button>
        </div>

        {loadingSpaces ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={28} className="animate-spin" style={{ color: 'var(--brand)' }} />
          </div>
        ) : spaces.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center rounded-2xl"
            style={{ background: '#fff', border: '1px solid var(--border-subtle)' }}>
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
              style={{ background: 'var(--brand-dim)' }}>
              <Building2 size={24} style={{ color: 'var(--brand)' }} />
            </div>
            <h2 className="font-semibold text-base mb-1" style={{ color: 'var(--text-primary)' }}>
              Aún no tienes espacios
            </h2>
            <p className="text-sm mb-6" style={{ color: 'var(--text-muted)', maxWidth: 300 }}>
              Crea tu primer espacio para empezar a recibir reservas en la plataforma.
            </p>
            <button onClick={() => setView('create')}
              className="btn-brand flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold">
              <PlusCircle size={16} /> Crear mi primer espacio
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-5">
            {spaces.map((space: any) => {
              const pricing = space.space_pricing?.find((p: any) => p.is_active) ?? space.space_pricing?.[0]
              const cover   = space.space_images?.find((i: any) => i.is_cover)?.url ?? space.space_images?.[0]?.url
              return (
                <div key={space.id} className="rounded-2xl overflow-hidden transition-all"
                  style={{ background: '#fff', border: '1px solid var(--border-subtle)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                  <div className="relative h-48 overflow-hidden" style={{ background: 'var(--bg-elevated)' }}>
                    {cover ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={cover} alt={space.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Building2 size={32} style={{ color: 'var(--text-muted)' }} />
                      </div>
                    )}
                    <div className="absolute top-3 right-3 flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full"
                      style={space.is_published
                        ? { background: 'rgba(22,163,74,0.9)', color: '#fff' }
                        : { background: 'rgba(0,0,0,0.6)', color: '#fff' }}>
                      {space.is_published ? <><Eye size={10} /> Publicado</> : <><EyeOff size={10} /> Borrador</>}
                    </div>
                  </div>
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="min-w-0">
                        <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{space.name}</h3>
                        <div className="flex items-center gap-1 mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                          <MapPin size={10} />{space.sector ? `${space.sector}, ` : ''}{space.city}
                        </div>
                      </div>
                      <span className="text-xs font-medium px-2 py-1 rounded-lg shrink-0 capitalize"
                        style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}>
                        {space.category}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mb-4 text-xs" style={{ color: 'var(--text-muted)' }}>
                      <span className="flex items-center gap-1"><Users size={11} /> {space.capacity_max} personas máx.</span>
                      {pricing && (
                        <span className="flex items-center gap-1">
                          <DollarSign size={11} />
                          {pricing.pricing_type === 'hourly' && `${formatCurrency(pricing.hourly_price)}/hr`}
                          {pricing.pricing_type === 'minimum_consumption' && `Min. ${formatCurrency(pricing.minimum_consumption)}`}
                          {pricing.pricing_type === 'fixed_package' && formatCurrency(pricing.fixed_price)}
                          {pricing.pricing_type === 'custom_quote' && 'Cotización'}
                        </span>
                      )}
                    </div>
                    {pricing && (
                      <div className="flex items-center gap-2 mb-4">
                        <span className="text-xs px-2.5 py-1 rounded-lg"
                          style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>
                          {pricingLabel[pricing.pricing_type] ?? pricing.pricing_type}
                        </span>
                        {space.space_addons?.length > 0 && (
                          <span className="text-xs px-2.5 py-1 rounded-lg"
                            style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}>
                            {space.space_addons.length} adicionales
                          </span>
                        )}
                      </div>
                    )}
                    <div className="flex gap-2">
                      <button onClick={() => loadSpaceForEdit(space)}
                        className="flex-1 flex items-center justify-center gap-1.5 text-sm font-medium py-2 rounded-xl transition-colors"
                        style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}>
                        <Pencil size={13} /> Editar
                      </button>
                      {!space.is_published && (
                        <button
                          onClick={async () => {
                            await publishSpace(space.id)
                            setSpaces(prev => prev.map((s: any) => s.id === space.id ? { ...s, is_published: true } : s))
                          }}
                          className="btn-brand flex-1 flex items-center justify-center gap-1.5 text-sm font-medium py-2 rounded-xl">
                          <Eye size={13} /> Publicar
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
    <div className="px-6 py-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-5 md:mb-8 flex items-center gap-4">
        <button
          onClick={() => setView('list')}
          className="transition-colors text-sm flex items-center gap-1.5"
          style={{ color: 'var(--text-muted)' }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
        >
          ← Mis espacios
        </button>
        <div className="w-px h-5" style={{ background: 'var(--border-subtle)' }} />
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            {editingSpaceId ? 'Editar espacio' : 'Crear espacio'}
          </h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            Completa los pasos para publicar tu espacio
          </p>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center gap-1 mb-8 overflow-x-auto pb-1">
        {steps.map((step, i) => {
          const Icon = step.icon
          const isActive = currentStep === step.id
          const isDone   = currentStep > step.id
          return (
            <div key={step.id} className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => isDone && setCurrentStep(step.id)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all"
                style={
                  isActive ? {
                    background: 'var(--brand)',
                    color: '#fff',
                    boxShadow: '0 2px 8px rgba(53,196,147,0.3)',
                  } : isDone ? {
                    background: 'var(--brand-dim)',
                    color: 'var(--brand)',
                    border: '1px solid var(--brand-border)',
                    cursor: 'pointer',
                  } : {
                    background: 'var(--bg-elevated)',
                    color: 'var(--text-muted)',
                    border: '1px solid var(--border-subtle)',
                    cursor: 'not-allowed',
                  }
                }
              >
                {isDone ? <CheckCircle size={14} /> : <Icon size={14} />}
                <span className="hidden sm:inline">{step.label}</span>
              </button>
              {i < steps.length - 1 && (
                <div className="w-5 h-px" style={{ background: isDone ? 'var(--brand-border)' : 'var(--border-subtle)' }} />
              )}
            </div>
          )
        })}
      </div>

      {/* Step Content */}
      <div className="rounded-2xl p-4 md:p-8" style={{ background: '#fff', border: '1px solid var(--border-subtle)', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>

        {/* STEP 1: Información básica */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold mb-1" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Información básica</h2>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Cuéntanos sobre tu espacio</p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Nombre del espacio</label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Ej: Salón Imperial Santo Domingo"
                className="w-full input-base rounded-xl px-4 py-3"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2.5" style={{ color: 'var(--text-secondary)' }}>Tipo de espacio</label>
              <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
                {categories.map(cat => (
                  <button
                    key={cat.value}
                    onClick={() => setCategory(cat.value)}
                    className="flex flex-col items-center gap-1.5 p-3 rounded-xl text-xs font-medium transition-all"
                    style={category === cat.value ? {
                      background: 'var(--brand-dim)',
                      border: '1.5px solid var(--brand-border)',
                      color: 'var(--brand)',
                    } : {
                      background: 'var(--bg-elevated)',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    <span className="text-xl">{cat.emoji}</span>
                    <span>{cat.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Descripción</label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Describe tu espacio: ambiente, equipos incluidos, qué hace especial tu Espot..."
                rows={4}
                className="w-full input-base rounded-xl px-4 py-3 resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Dirección</label>
                <input
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  placeholder="Av. Winston Churchill #123"
                  className="w-full input-base rounded-xl px-4 py-3"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Sector</label>
                <input
                  value={sector}
                  onChange={e => setSector(e.target.value)}
                  placeholder="Piantini, Naco, Bella Vista..."
                  className="w-full input-base rounded-xl px-4 py-3"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Capacidad mínima</label>
                <input
                  type="number"
                  value={capacityMin}
                  onChange={e => setCapacityMin(e.target.value)}
                  placeholder="20"
                  className="w-full input-base rounded-xl px-4 py-3"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Capacidad máxima</label>
                <input
                  type="number"
                  value={capacityMax}
                  onChange={e => setCapacityMax(e.target.value)}
                  placeholder="200"
                  className="w-full input-base rounded-xl px-4 py-3"
                />
              </div>
            </div>

            {/* Actividades / tipos de evento */}
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                Tipos de evento que acepta tu espacio
              </label>
              <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
                Selecciona los tipos de eventos que mejor describen tu espacio.
              </p>
              <ActivityPicker
                primary={primaryActivity}
                secondary={secondaryActivities}
                onChange={(p, s) => { setPrimaryActivity(p); setSecondaryActivities(s) }}
              />
            </div>

            {/* Photo upload */}
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Fotos del espacio</label>
              <PhotoUploader onChange={photos => setPendingPhotos(photos)} />
            </div>
          </div>
        )}

        {/* STEP 2: Precios */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold mb-1" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Modalidad de precio</h2>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>¿Cómo quieres vender tu espacio?</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {pricingOptions.map(option => (
                <button
                  key={option.value}
                  onClick={() => setPricingType(option.value)}
                  className={cn(
                    'text-left p-4 rounded-xl border transition-all',
                    pricingType === option.value
                      ? 'border-[rgba(53,196,147,0.40)]'
                      : 'hover:border-[rgba(53,196,147,0.3)]'
                  )}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">{option.emoji}</span>
                    <span className="font-semibold text-sm" style={{ color: pricingType === option.value ? 'var(--brand)' : 'var(--text-primary)' }}>
                      {option.label}
                    </span>
                  </div>
                  <p className="text-xs mb-2" style={{ color: 'var(--text-secondary)' }}>{option.desc}</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Ideal: {option.ideal}</p>
                </button>
              ))}
            </div>

            {/* Dynamic fields based on pricing type */}
            {pricingType === 'hourly' && (
              <div className="bg-[rgba(53,196,147,0.07)] border border-[rgba(53,196,147,0.20)] rounded-xl p-5 space-y-4">
                <h3 className="font-semibold text-sm" style={{ color: 'var(--brand)' }}>Configuración de precio por hora</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
                  <div>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Precio por hora (RD$)</label>
                    <input
                      type="number"
                      value={hourlyPrice}
                      onChange={e => setHourlyPrice(e.target.value)}
                      placeholder="5000"
                      className="w-full input-base rounded-xl px-4 py-2.5 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Mínimo de horas</label>
                    <input
                      type="number"
                      value={minHours}
                      onChange={e => setMinHours(e.target.value)}
                      placeholder="3"
                      className="w-full input-base rounded-xl px-4 py-2.5 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Máximo de horas</label>
                    <input
                      type="number"
                      value={maxHours}
                      onChange={e => setMaxHours(e.target.value)}
                      placeholder="8"
                      className="w-full input-base rounded-xl px-4 py-2.5 text-sm"
                    />
                  </div>
                </div>
                {hourlyPrice && minHours && (
                  <div className="rounded-lg p-3 text-sm" style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>
                    💡 El cliente pagaría mínimo <strong style={{ color: 'var(--text-primary)' }}>{formatCurrency(Number(hourlyPrice) * Number(minHours))}</strong> por {minHours} horas
                  </div>
                )}
              </div>
            )}

            {pricingType === 'minimum_consumption' && (
              <div className="bg-[rgba(53,196,147,0.07)] border border-[rgba(53,196,147,0.20)] rounded-xl p-5 space-y-4">
                <h3 className="font-semibold text-sm" style={{ color: 'var(--brand)' }}>Configuración de consumo mínimo</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
                  <div>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Consumo mínimo (RD$) *</label>
                    <input type="number" value={minConsumption} onChange={e => setMinConsumption(e.target.value)}
                      placeholder="60000" className="w-full input-base rounded-xl px-4 py-2.5 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Mínimo de horas</label>
                    <input type="number" value={minHours} onChange={e => setMinHours(e.target.value)}
                      placeholder="3" className="w-full input-base rounded-xl px-4 py-2.5 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Máximo de horas</label>
                    <input type="number" value={maxHours} onChange={e => setMaxHours(e.target.value)}
                      placeholder="8" className="w-full input-base rounded-xl px-4 py-2.5 text-sm" />
                  </div>
                </div>
                <div className="rounded-lg p-3 text-xs" style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>
                  💡 El cliente reserva el horario y se compromete a consumir mínimo <strong style={{ color: 'var(--text-primary)' }}>{minConsumption ? formatCurrency(Number(minConsumption)) : 'ese monto'}</strong> en comida y bebidas.
                  Si consumen más, lo pagan directo en tu local. EspotHub cobra el mínimo como garantía.
                </div>
              </div>
            )}

            {pricingType === 'fixed_package' && (
              <div className="bg-[rgba(53,196,147,0.07)] border border-[rgba(53,196,147,0.20)] rounded-xl p-5 space-y-4">
                <h3 className="font-semibold text-sm" style={{ color: 'var(--brand)' }}>Configuración del paquete</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Nombre del paquete</label>
                    <input value={packageName} onChange={e => setPackageName(e.target.value)}
                      placeholder="Paquete Cumpleaños Premium"
                      className="w-full input-base rounded-xl px-4 py-2.5 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Precio del paquete (RD$) *</label>
                    <input type="number" value={fixedPrice} onChange={e => setFixedPrice(e.target.value)}
                      placeholder="35000" className="w-full input-base rounded-xl px-4 py-2.5 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Horas incluidas *</label>
                    <input type="number" value={packageHours} onChange={e => setPackageHours(e.target.value)}
                      placeholder="6" className="w-full input-base rounded-xl px-4 py-2.5 text-sm" />
                    <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>El cliente reserva esas horas exactas</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Precio hora adicional (RD$)</label>
                    <input type="number" value={pkgExtraHourPrice} onChange={e => setPkgExtraHourPrice(e.target.value)}
                      placeholder="5000" className="w-full input-base rounded-xl px-4 py-2.5 text-sm" />
                    <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Si quiere más horas que las incluidas</p>
                  </div>
                </div>
                {fixedPrice && packageHours && (
                  <div className="rounded-lg p-3 text-xs" style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>
                    💡 El cliente paga <strong style={{ color: 'var(--text-primary)' }}>{formatCurrency(Number(fixedPrice))}</strong> por {packageHours} horas.
                    {pkgExtraHourPrice && ` Hora adicional: ${formatCurrency(Number(pkgExtraHourPrice))}.`}
                  </div>
                )}
                <div>
                  <label className="block text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>¿Qué incluye el paquete?</label>
                  <div className="flex gap-2 mb-2">
                    <input value={newInclude} onChange={e => setNewInclude(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && newInclude.trim()) { setPackageIncludes([...packageIncludes, newInclude.trim()]); setNewInclude('') }}}
                      placeholder="Ej: Música, bartender, decoración básica..."
                      className="flex-1 input-base rounded-xl px-4 py-2.5 text-sm" />
                    <button onClick={() => { if (newInclude.trim()) { setPackageIncludes([...packageIncludes, newInclude.trim()]); setNewInclude('') }}}
                      className="bg-[#35C493] hover:bg-[#4DD9A7] text-white px-4 py-2.5 rounded-xl transition-colors text-sm">
                      Agregar
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {packageIncludes.map((item, i) => (
                      <div key={i} className="flex items-center gap-1.5 bg-[rgba(53,196,147,0.12)] text-[#4DD9A7] px-3 py-1 rounded-full text-xs">
                        <CheckCircle size={12} /> {item}
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
              <div className="rounded-xl p-5" style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.25)' }}>
                <p className="text-sm" style={{ color: '#92400E' }}>
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
              <h2 className="text-xl font-bold mb-1" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Horarios de disponibilidad</h2>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
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
              <h2 className="text-xl font-bold mb-1" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Adicionales y extras</h2>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                Activa los servicios que ofreces. El cliente podrá agregarlos al reservar.
              </p>
            </div>

            {/* ─ Sección 1: Selección ─ */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                  ¿Qué ofreces?
                </p>
                {addons.length > 0 && (
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
                    style={{ background: 'rgba(53,196,147,0.1)', color: '#35C493' }}>
                    {addons.length} seleccionado{addons.length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
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
                        background: 'var(--bg-elevated)',
                        border:     '1px solid var(--border-subtle)',
                      }}
                    >
                      <span className="text-xl shrink-0">{addon.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate"
                          style={{ color: selected ? 'var(--brand)' : 'var(--text-primary)' }}>
                          {addon.name}
                        </div>
                        <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                          {addon.price > 0 ? formatCurrency(addon.price) : 'Precio variable'} / {addon.unit}
                        </div>
                      </div>
                      <div className="shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all"
                        style={selected ? { background: '#35C493', borderColor: '#35C493' } : { borderColor: 'var(--border-medium)' }}>
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
                <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>
                  Configura precios de los seleccionados
                </p>
                <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border-subtle)' }}>
                  {addons.map((addon, i) => (
                    <div key={i}
                      className="flex items-center gap-4 px-4 py-3"
                      style={{ borderBottom: i < addons.length - 1 ? '1px solid var(--border-subtle)' : 'none', background: 'var(--bg-elevated)' }}>
                      <span className="text-base shrink-0">{addon.emoji}</span>
                      <span className="text-sm font-medium flex-1" style={{ color: 'var(--text-primary)' }}>{addon.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>RD$</span>
                        <input
                          type="number"
                          value={addon.price}
                          onChange={e => {
                            const updated = [...addons]
                            updated[i] = { ...addon, price: Number(e.target.value) }
                            setAddons(updated)
                          }}
                          className="w-24 rounded-lg px-3 py-1.5 text-sm focus:outline-none transition-colors"
                          style={{ background: '#fff', border: '1.5px solid var(--border-medium)', color: 'var(--text-primary)' }}
                        />
                        <select
                          value={addon.unit}
                          onChange={e => {
                            const updated = [...addons]
                            updated[i] = { ...addon, unit: e.target.value }
                            setAddons(updated)
                          }}
                          className="rounded-lg px-2 py-1.5 text-xs focus:outline-none"
                          style={{ background: '#fff', border: '1.5px solid var(--border-medium)', color: 'var(--text-secondary)' }}
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
                style={{ background: 'var(--bg-elevated)', border: '1px dashed var(--border-medium)' }}>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
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
              <h2 className="text-xl font-bold mb-1" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Reglas y condiciones</h2>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Define las reglas de tu espacio. El cliente las verá antes de reservar.</p>
            </div>

            {/* ─── 1. PERMISOS GENERALES ─── */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>Permisos generales</p>
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
                    style={{ background: 'var(--bg-elevated)', border: `1px solid ${item.value ? 'var(--brand-border)' : 'var(--border-subtle)'}` }}>
                    <div>
                      <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{item.label}</div>
                      <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{item.desc}</div>
                    </div>
                    <button
                      onClick={() => item.setter(!item.value)}
                      className="w-11 h-6 rounded-full relative transition-all shrink-0 ml-3"
                      style={{ background: item.value ? '#35C493' : 'var(--border-medium)' }}>
                      <span className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all"
                        style={{ left: item.value ? 22 : 2 }} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* ─── 2. CONTROL DE RUIDO ─── */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>Control de ruido</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Nivel de ruido permitido</label>
                  <div className="flex gap-2">
                    {(['bajo', 'moderado', 'alto'] as const).map(level => (
                      <button key={level}
                        onClick={() => setNoiseLevel(level)}
                        className="flex-1 py-2.5 rounded-xl text-sm font-semibold capitalize transition-all"
                        style={noiseLevel === level ? {
                          background: '#35C493', color: '#0B0F0E',
                        } : {
                          background: 'var(--bg-elevated)',
                          color: 'var(--text-muted)',
                          border: '1px solid var(--border-subtle)',
                        }}>
                        {level.charAt(0).toUpperCase() + level.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Hora límite de música</label>
                  <input type="time" value={musicCutoff} onChange={e => setMusicCutoff(e.target.value)}
                    className="input-base w-full rounded-xl px-4 py-3 text-sm" />
                </div>
              </div>
            </div>

            {/* ─── 3. DEPÓSITO Y PAGOS ─── */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>Depósito y pagos</p>
              <div className="space-y-3">
                {/* Depósito */}
                <div className="rounded-xl p-4" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Depósito de garantía</div>
                      <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Monto que el cliente paga como garantía</div>
                    </div>
                    <button onClick={() => setDepositRequired(!depositRequired)}
                      className="w-11 h-6 rounded-full relative transition-all shrink-0"
                      style={{ background: depositRequired ? '#35C493' : 'var(--border-medium)' }}>
                      <span className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all"
                        style={{ left: depositRequired ? 22 : 2 }} />
                    </button>
                  </div>
                  {depositRequired && (
                    <div className="grid grid-cols-2 gap-3 pt-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                      <div>
                        <label className="block text-xs mb-1.5" style={{ color: 'var(--text-muted)' }}>Monto (RD$)</label>
                        <input type="number" value={depositAmount} onChange={e => setDepositAmount(e.target.value)}
                          placeholder="Ej: 5000"
                          className="input-base w-full rounded-xl px-3 py-2.5 text-sm" />
                      </div>
                      <div>
                        <label className="block text-xs mb-1.5" style={{ color: 'var(--text-muted)' }}>¿Es reembolsable?</label>
                        <div className="flex gap-2">
                          {[{ v: true, l: 'Sí' }, { v: false, l: 'No' }].map(opt => (
                            <button key={String(opt.v)} onClick={() => setDepositRefundable(opt.v)}
                              className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all"
                              style={depositRefundable === opt.v ? {
                                background: '#35C493', color: '#0B0F0E',
                              } : {
                                background: 'var(--bg-elevated)', color: 'var(--text-muted)',
                                border: '1px solid var(--border-subtle)',
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
                <div className="rounded-xl p-4" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Servicio de limpieza</div>
                      <div className="text-xs" style={{ color: 'var(--text-muted)' }}>¿Incluye limpieza al finalizar el evento?</div>
                    </div>
                    <button onClick={() => setIncludesCleaning(!includesCleaning)}
                      className="w-11 h-6 rounded-full relative transition-all shrink-0"
                      style={{ background: includesCleaning ? '#35C493' : 'var(--border-medium)' }}>
                      <span className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all"
                        style={{ left: includesCleaning ? 22 : 2 }} />
                    </button>
                  </div>
                  {!includesCleaning && (
                    <div className="pt-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                      <label className="block text-xs mb-1.5" style={{ color: 'var(--text-muted)' }}>Cargo de limpieza (RD$) — opcional</label>
                      <input type="number" value={cleaningFee} onChange={e => setCleaningFee(e.target.value)}
                        placeholder="Dejar en blanco si no aplica"
                        className="input-base w-full rounded-xl px-3 py-2.5 text-sm" />
                    </div>
                  )}
                </div>

                {/* Horas extra */}
                <div className="rounded-xl p-4" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Horas extra</div>
                      <div className="text-xs" style={{ color: 'var(--text-muted)' }}>¿Se pueden solicitar horas adicionales?</div>
                    </div>
                    <button onClick={() => setAllowsExtraHours(!allowsExtraHours)}
                      className="w-11 h-6 rounded-full relative transition-all shrink-0"
                      style={{ background: allowsExtraHours ? '#35C493' : 'var(--border-medium)' }}>
                      <span className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all"
                        style={{ left: allowsExtraHours ? 22 : 2 }} />
                    </button>
                  </div>
                  {allowsExtraHours && (
                    <div className="pt-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                      <label className="block text-xs mb-1.5" style={{ color: 'var(--text-muted)' }}>Precio por hora extra (RD$)</label>
                      <input type="number" value={extraHourPrice} onChange={e => setExtraHourPrice(e.target.value)}
                        placeholder="Ej: 5000"
                        className="input-base w-full rounded-xl px-3 py-2.5 text-sm" />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ─── 4. POLÍTICA DE CANCELACIÓN ─── */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>Política de cancelación</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
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
                      background: 'var(--bg-elevated)',
                      border: '1px solid var(--border-subtle)',
                    }}>
                    <div className="font-semibold text-sm mb-1"
                      style={{ color: cancellationPolicy === policy.value ? 'var(--brand)' : 'var(--text-primary)' }}>
                      {policy.label}
                    </div>
                    <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{policy.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* ─── 5. REGLAS ADICIONALES ─── */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>Reglas adicionales</p>
              <textarea
                value={customRules}
                onChange={e => setCustomRules(e.target.value)}
                placeholder="Ej: No se permiten velas. El espacio debe quedar limpio al terminar. Acceso desde las 6pm..."
                rows={3}
                className="input-base w-full rounded-xl px-4 py-3 text-sm resize-none"
              />
            </div>
          </div>
        )}

        {/* STEP 6: Términos de pago */}
        {currentStep === 6 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold mb-1" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Modelo de pagos</h2>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Elige cómo el cliente realizará los pagos a través de Espot.</p>
            </div>

            <div className="space-y-3">
              {paymentTermOptions.map((option, i) => {
                const isSel = paymentTerm === option.value
                const isRec = i === 0
                return (
                  <button
                    key={option.value}
                    onClick={() => setPaymentTerm(option.value)}
                    className="w-full text-left rounded-2xl transition-all"
                    style={isSel ? {
                      background: '#03313C',
                      border: '2px solid #03313C',
                      boxShadow: '0 4px 16px rgba(3,49,60,0.15)',
                    } : {
                      background: '#ffffff',
                      border: '1.5px solid #D1D5DB',
                    }}>
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-3 mb-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm"
                            style={{ color: isSel ? '#ffffff' : '#03313C' }}>
                            {option.label}
                          </span>
                          {isRec && (
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                              style={{ background: 'rgba(53,196,147,0.15)', color: '#35C493' }}>
                              Recomendado
                            </span>
                          )}
                        </div>
                        {isSel && (
                          <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                            style={{ background: '#35C493' }}>
                            <CheckCircle size={13} color="#fff" />
                          </div>
                        )}
                      </div>
                      <p className="text-xs leading-relaxed mb-2"
                        style={{ color: isSel ? 'rgba(255,255,255,0.7)' : '#6B7280' }}>
                        {option.desc}
                      </p>
                      <p className="text-xs font-semibold"
                        style={{ color: isSel ? 'rgba(255,255,255,0.45)' : '#9CA3AF' }}>
                        Ideal: {option.ideal}
                      </p>
                    </div>
                  </button>
                )
              })}
            </div>

            {/* Nota sobre payouts */}
            <div className="rounded-2xl p-4 flex items-start gap-3"
              style={{ background: 'rgba(53,196,147,0.06)', border: '1px solid rgba(53,196,147,0.18)' }}>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: 'rgba(53,196,147,0.12)' }}>
                <CreditCard size={14} style={{ color: '#35C493' }} />
              </div>
              <div>
                <p className="text-xs font-semibold mb-0.5" style={{ color: '#0A7A50' }}>
                  Todos los pagos pasan por Espot
                </p>
                <p className="text-xs" style={{ color: '#166534' }}>
                  Luego del evento recibes el monto neto en tu cuenta. Espot descuenta automáticamente la comisión del 10%.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* STEP 7: Publicar */}
        {currentStep === 7 && (
          <div className="space-y-6">
            <div className="text-center py-4">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'var(--brand-dim)', border: '1px solid var(--brand-border)' }}>
                <CheckCircle className="w-8 h-8" style={{ color: 'var(--brand)' }} />
              </div>
              <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>¡Todo listo para publicar!</h2>
              <p style={{ color: 'var(--text-muted)' }}>Tu Espot está configurado. Revisa el resumen antes de publicar.</p>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-xl p-4" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
                <div className="text-xs mb-2 uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Espacio</div>
                <div className="font-semibold" style={{ color: 'var(--text-primary)' }}>{name || 'Sin nombre'}</div>
                <div className="text-sm" style={{ color: 'var(--text-muted)' }}>{category || 'Sin categoría'} · {capacityMax || '?'} personas máx.</div>
              </div>
              <div className="rounded-xl p-4" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
                <div className="text-xs mb-2 uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Pricing</div>
                <div className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {pricingType === 'hourly' && `${formatCurrency(Number(hourlyPrice))} / hora`}
                  {pricingType === 'minimum_consumption' && `Consumo mín. ${formatCurrency(Number(minConsumption))}`}
                  {pricingType === 'fixed_package' && `Paquete ${formatCurrency(Number(fixedPrice))}`}
                  {pricingType === 'custom_quote' && 'Cotización personalizada'}
                  {!pricingType && 'No configurado'}
                </div>
              </div>
              <div className="rounded-xl p-4" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
                <div className="text-xs mb-2 uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Adicionales</div>
                <div className="font-semibold" style={{ color: 'var(--text-primary)' }}>{addons.length} servicios</div>
                <div className="text-sm truncate" style={{ color: 'var(--text-muted)' }}>{addons.map(a => a.name).join(', ') || 'Ninguno'}</div>
              </div>
              <div className="rounded-xl p-4" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
                <div className="text-xs mb-2 uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Cobros</div>
                <div className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{paymentTermOptions.find(p => p.value === paymentTerm)?.label || 'No configurado'}</div>
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
                className="btn-brand flex-1 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed font-semibold py-3 px-6 rounded-xl transition-all"
              >
                {saving ? <><Loader2 size={18} className="animate-spin" /> Guardando...</> : '🚀 Publicar mi Espot'}
              </button>
            </div>

            <p className="text-xs text-center" style={{ color: 'var(--text-muted)' }}>
              Tu espacio será revisado por el equipo de espot.do antes de aparecer en el marketplace.
            </p>
          </div>
        )}

        {/* Navigation buttons */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t">
          <button
            onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
            disabled={currentStep === 1}
            className="flex items-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-sm font-medium" style={{ color: 'var(--text-secondary)' }}
          >
            <ChevronLeft size={18} /> Anterior
          </button>

          <span className="text-sm" style={{ color: 'var(--text-muted)' }}>Paso {currentStep} de {steps.length}</span>

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
