'use client'

import React, { useState, useEffect } from 'react'
import { Building2, Clock, DollarSign, Plus, Gift, Shield, CreditCard, CheckCircle, ChevronRight, ChevronLeft, X, Loader2, Eye, EyeOff, MapPin, Users, Pencil, PlusCircle, Wine, UtensilsCrossed, Sunset, Trees, Camera, Briefcase, Home, Leaf, Package, MessageSquare, Music2, Volume2, Sun, Car, Wifi, Wind, Waves, Monitor, Zap, ShowerHead, Sparkles, Trash2, Save } from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'
import { saveSpace, publishSpace, getMySpaces, saveSpaceImages, updateSpace, deactivateSpace, deleteSpaceByHost, updateCancellationPolicy } from '@/lib/actions/space'
import PhotoUploader from '@/components/dashboard/PhotoUploader'
import WeeklySchedule from '@/components/dashboard/WeeklySchedule'
import ActivityPicker from '@/components/dashboard/ActivityPicker'
import dynamic from 'next/dynamic'
const LocationPicker  = dynamic(() => import('@/components/dashboard/LocationPicker'),  { ssr: false })
const VideoUploader   = dynamic(() => import('@/components/dashboard/VideoUploader'),   { ssr: false })
const MenuUploader    = dynamic(() => import('@/components/dashboard/MenuUploader'),    { ssr: false })
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

const categories: { value: SpaceCategory; label: string; icon: React.ElementType }[] = [
  { value: 'salon',       label: 'Salón de eventos', icon: Building2 },
  { value: 'restaurante', label: 'Restaurante',       icon: UtensilsCrossed },
  { value: 'bar',         label: 'Bar / Lounge',      icon: Wine },
  { value: 'rooftop',    label: 'Rooftop',            icon: Sunset },
  { value: 'terraza',    label: 'Terraza',            icon: Trees },
  { value: 'jardin',     label: 'Jardín',             icon: Leaf },
  { value: 'estudio',    label: 'Estudio',            icon: Camera },
  { value: 'coworking',  label: 'Coworking',          icon: Briefcase },
  { value: 'hotel',      label: 'Hotel',              icon: Building2 },
  { value: 'villa',      label: 'Villa',              icon: Home },
  { value: 'otro',       label: 'Otro',               icon: MapPin },
]

const pricingOptions: { value: PricingType; label: string; desc: string; icon: React.ElementType; ideal: string }[] = [
  {
    value: 'hourly',
    label: 'Precio por hora',
    desc: 'El cliente paga por las horas que usa el espacio.',
    icon: Clock,
    ideal: 'Salones, terrazas, estudios, coworkings',
  },
  {
    value: 'minimum_consumption',
    label: 'Consumo mínimo',
    desc: 'El cliente paga este monto por adelantado a través de Espot y lo usa como crédito en comida y bebidas en tu local.',
    icon: Wine,
    ideal: 'Restaurantes, bares, lounges, rooftops',
  },
  {
    value: 'fixed_package',
    label: 'Paquete fijo',
    desc: 'Precio fijo que incluye espacio + servicios específicos.',
    icon: Package,
    ideal: 'Salones con todo incluido, hoteles, venues',
  },
  {
    value: 'custom_quote',
    label: 'Cotización personalizada',
    desc: 'El cliente solicita propuesta y tú envías el precio.',
    icon: MessageSquare,
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
  { name: 'Bartender', price: 8000, unit: 'evento', category: 'personal', icon: Wine },
  { name: 'DJ', price: 15000, unit: 'evento', category: 'personal', icon: Music2 },
  { name: 'Sonido', price: 5000, unit: 'evento', category: 'equipo', icon: Volume2 },
  { name: 'Iluminación', price: 4000, unit: 'evento', category: 'equipo', icon: Sun },
  { name: 'Camarero', price: 3500, unit: 'evento', category: 'personal', icon: Users },
  { name: 'Seguridad', price: 4000, unit: 'evento', category: 'personal', icon: Shield },
  { name: 'Decoración básica', price: 6000, unit: 'evento', category: 'decoracion', icon: Sparkles },
  { name: 'Proyector', price: 2500, unit: 'evento', category: 'equipo', icon: Monitor },
  { name: 'Mesa de dulces', price: 5000, unit: 'evento', category: 'alimentos', icon: Package },
  { name: 'Menú personalizado', price: 0, unit: 'persona', category: 'alimentos', icon: UtensilsCrossed },
  { name: 'Hora extra', price: 5000, unit: 'hora', category: 'tiempo', icon: Clock },
  { name: 'Mobiliario extra', price: 3000, unit: 'evento', category: 'mobiliario', icon: Users },
]

interface AddonItem {
  name: string; price: number; unit: string; category: string; icon: React.ElementType
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
    getMySpaces().then(data => { setSpaces(data); setLoadingSpaces(false) }).catch(() => setLoadingSpaces(false))
  }, [])

  const [currentStep, setCurrentStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [publishingId, setPublishingId] = useState<string | null>(null)
  const [stepError, setStepError] = useState('')
  const [publishedPending, setPublishedPending] = useState(false)
  const [cancelModal, setCancelModal]   = useState<{ id: string; name: string } | null>(null)
  const [cancelPolicy,     setCancelPolicy]     = useState('moderada')
  const [cancelRefundPct,  setCancelRefundPct]  = useState('50')
  const [cancelHoursBefore,setCancelHoursBefore]= useState('72')
  const [cancelSaving, setCancelSaving] = useState(false)
  const [pendingPhotos, setPendingPhotos] = useState<{ url: string; path: string; isCover: boolean }[]>([])
  const [existingPhotos, setExistingPhotos] = useState<{ url: string; path: string; isCover: boolean }[]>([])
  const [photosTouched, setPhotosTouched] = useState(false)
  const [videoUrl,      setVideoUrl]      = useState('')
  const [menuUrl,       setMenuUrl]       = useState('')
  const [menuFileName,  setMenuFileName]  = useState('')
  const [editingSpaceId, setEditingSpaceId] = useState<string | null>(null)

  // Step 1 - Basic info
  const [name, setName] = useState('')
  const [category, setCategory] = useState<SpaceCategory | ''>('')
  const [description, setDescription] = useState('')
  const [address, setAddress] = useState('')
  const [sector, setSector] = useState('')
  const [lat, setLat] = useState('')
  const [lng, setLng] = useState('')
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

  // Precio dinámico y anticipo mínimo
  const [weekendEnabled,    setWeekendEnabled]    = useState(false)
  const [weekendPrice,      setWeekendPrice]      = useState('')
  const [minAdvanceAmount,  setMinAdvanceAmount]  = useState('0')

  // Step 3 - Time blocks
  const [timeBlocks, setTimeBlocks] = useState<TimeBlock[]>([])
  const [newBlock, setNewBlock] = useState<TimeBlock>({ block_name: '', start_time: '', end_time: '', days: [0,1,2,3,4,5,6] })

  // Step 4 - Addons
  const [addons, setAddons] = useState<AddonItem[]>([])

  // Reserva instantánea
  const [instantBooking, setInstantBooking] = useState(false)

  // Step 5 — Facilidades físicas
  const [hasParkingFac,    setHasParkingFac]    = useState(false)
  const [hasValetParking,  setHasValetParking]  = useState(false)
  const [hasWifi,          setHasWifi]          = useState(false)
  const [hasAc,            setHasAc]            = useState(false)
  const [hasSoundSystem,   setHasSoundSystem]   = useState(false)
  const [hasProjector,     setHasProjector]     = useState(false)
  const [hasDanceFloor,    setHasDanceFloor]    = useState(false)
  const [hasOutdoorArea,   setHasOutdoorArea]   = useState(false)
  const [hasPool,          setHasPool]          = useState(false)
  const [hasKitchen,       setHasKitchen]       = useState(false)
  const [hasBar,           setHasBar]           = useState(false)
  const [hasStage,         setHasStage]         = useState(false)
  const [hasCyclorama,     setHasCyclorama]     = useState(false)
  const [hasNaturalLight,  setHasNaturalLight]  = useState(false)
  const [hasGenerator,     setHasGenerator]     = useState(false)
  const [hasDressingRoom,  setHasDressingRoom]  = useState(false)
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

    // Validar fotos — solo para espacios nuevos; al editar ya existen fotos
    if (!editingSpaceId && pendingPhotos.length === 0) {
      setSaveError('Debes subir al menos una foto del espacio antes de publicar.')
      setSaving(false)
      return
    }

    // Validar precio según modalidad
    if (pricingType === 'hourly' && !hourlyPrice.trim()) {
      setSaveError('Indica el precio por hora de tu espacio.')
      setSaving(false)
      return
    }
    if (pricingType === 'minimum_consumption' && !minConsumption.trim()) {
      setSaveError('Indica el consumo mínimo garantizado.')
      setSaving(false)
      return
    }
    if (pricingType === 'fixed_package' && !fixedPrice.trim()) {
      setSaveError('Indica el precio del paquete.')
      setSaving(false)
      return
    }

    const payload = {
      name, category, description, address, sector, lat, lng, capacityMin, capacityMax, videoUrl, menuUrl, menuFileName,
      primaryActivity, secondaryActivities,
      pricingType: pricingType as PricingType,
      hourlyPrice, minHours, maxHours, minConsumption, sessionHours,
      fixedPrice, packageName, packageHours, pkgExtraHourPrice, packageIncludes,
      weekendMultiplier: (() => {
        if (!weekendEnabled || !weekendPrice) return 1
        const base = Number(hourlyPrice || minConsumption || fixedPrice || 0)
        const wknd = Number(weekendPrice)
        // Permitir tanto precio mayor (premium) como menor (descuento) el fin de semana
        // Usar 4 decimales para evitar pérdida de precisión en el round-trip
        if (base > 0 && wknd > 0 && wknd !== base) {
          return Math.round((wknd / base) * 10000) / 10000
        }
        return 1
      })(),
      minAdvanceAmount: Number(minAdvanceAmount) || 0,
      timeBlocks, addons,
      instantBooking,
      hasParkingFac, hasValetParking, hasWifi, hasAc, hasSoundSystem, hasProjector,
      hasDanceFloor, hasOutdoorArea, hasPool, hasKitchen, hasBar, hasStage,
      hasCyclorama, hasNaturalLight, hasGenerator, hasDressingRoom,
      allowsDecoration, allowsFood, allowsAlcohol,
      allowsLiveMusic, allowsDJ, allowsSmoking,
      allowsChildren, allowsPets, allowsParties, allowsCorporate,
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
      // Enviar a revisión (no publica directamente)
      const pub = await publishSpace(spaceId)
      if ('error' in pub) {
        setSaveError(pub.error ?? 'Error al enviar para revisión')
        setSaving(false)
        return
      }
      // Mostrar mensaje de revisión pendiente si aplica
      if ('pending' in pub && pub.pending) {
        setPublishedPending(true)
      }
    }

    // Guardar fotos solo si el usuario las modificó
    if (photosTouched && pendingPhotos.length > 0) {
      const imgResult = await saveSpaceImages(spaceId, pendingPhotos)
      if (imgResult && 'error' in imgResult) {
        setSaveError(imgResult.error ?? 'Error al guardar fotos')
        setSaving(false)
        return
      }
      setPhotosTouched(false)
    }

    setSaving(false)
    setEditingSpaceId(null)
    const updated = await getMySpaces()
    setSpaces(updated)
    setView('list')
  }

  function loadSpaceForEdit(space: any) {
    setEditingSpaceId(space.id)
    setSaveError('')
    setStepError('')
    setCurrentStep(1)
    // Limpiar estado residual de sesión anterior
    setNewInclude('')
    setNewBlock({ block_name: '', start_time: '', end_time: '', days: [0,1,2,3,4,5,6] })
    // Cargar fotos existentes para mostrarlas en el PhotoUploader
    const imgs: { url: string; path: string; isCover: boolean }[] =
      (space.space_images ?? [])
        .sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
        .map((img: any) => ({ url: img.url, path: img.path, isCover: img.is_cover ?? false }))
    setExistingPhotos(imgs)
    setPendingPhotos(imgs)
    setPhotosTouched(false)
    // Cargar info básica
    setName(space.name ?? '')
    setCategory(space.category ?? '')
    setDescription(space.description ?? '')
    setAddress(space.address ?? '')
    setSector(space.sector ?? '')
    setLat(space.lat ? String(space.lat) : '')
    setLng(space.lng ? String(space.lng) : '')
    setVideoUrl(space.video_url ?? '')
    setMenuUrl(space.menu_url ?? '')
    setMenuFileName(space.menu_file_name ?? '')
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
      // Derivar weekendPrice del multiplier almacenado
      const mult = Number(p.weekend_multiplier ?? 1)
      if (mult > 1) {
        setWeekendEnabled(true)
        const base = Number(p.hourly_price ?? p.minimum_consumption ?? p.fixed_price ?? 0)
        setWeekendPrice(base > 0 ? String(Math.round(base * mult)) : '')
      } else {
        setWeekendEnabled(false)
        setWeekendPrice('')
      }
      setMinAdvanceAmount(String(p.min_advance_amount ?? '0'))
    }
    // Addons
    if (space.space_addons?.length) {
      setAddons(space.space_addons.map((a: any) => ({
        name: a.name, price: a.price, unit: a.unit, category: a.category, icon: Package,
      })))
    }
    // Actividades
    setPrimaryActivity(space.primary_activity ?? '')
    setSecondaryActivities(space.secondary_activities ?? [])
    // Reserva instantánea
    setInstantBooking(space.instant_booking ?? false)

    // Condiciones
    const c = space.space_conditions?.[0]
    if (c) {
      // Facilidades físicas
      setHasParkingFac(c.has_parking ?? false)
      setHasValetParking(c.has_valet_parking ?? false)
      setHasWifi(c.has_wifi ?? false)
      setHasAc(c.has_ac ?? false)
      setHasSoundSystem(c.has_sound_system ?? false)
      setHasProjector(c.has_projector ?? false)
      setHasDanceFloor(c.has_dance_floor ?? false)
      setHasOutdoorArea(c.has_outdoor_area ?? false)
      setHasPool(c.has_pool ?? false)
      setHasKitchen(c.has_kitchen ?? false)
      setHasBar(c.has_bar ?? false)
      setHasStage(c.has_stage ?? false)
      setHasCyclorama(c.has_cyclorama ?? false)
      setHasNaturalLight(c.has_natural_light ?? false)
      setHasGenerator(c.has_generator ?? false)
      setHasDressingRoom(c.has_dressing_room ?? false)
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
    else    setPaymentTerm('')
    // Time blocks
    setTimeBlocks(
      (space.space_time_blocks ?? []).map((b: any) => ({
        block_name: b.block_name, start_time: b.start_time, end_time: b.end_time,
        days: b.days_of_week ?? [0,1,2,3,4,5,6],
      }))
    )
    setView('create')
  }

  function validateStep(step: number): string {
    if (step === 1) {
      if (!name.trim())      return 'El nombre del espacio es obligatorio.'
      if (!category)         return 'Selecciona una categoría.'
      if (!description.trim()) return 'La descripción es obligatoria.'
      if (!capacityMax)      return 'Indica la capacidad máxima.'
    }
    if (step === 2) {
      if (!pricingType) return 'Selecciona un modelo de precio.'
      if (pricingType === 'hourly' && !hourlyPrice) return 'Indica el precio por hora.'
      if (pricingType === 'minimum_consumption' && !minConsumption) return 'Indica el consumo mínimo.'
      if (pricingType === 'fixed_package' && !fixedPrice) return 'Indica el precio del paquete.'
    }
    if (step === 6) {
      if (!paymentTerm) return 'Selecciona el modelo de pago.'
    }
    return ''
  }

  function goNext() {
    const err = validateStep(currentStep)
    if (err) { setStepError(err); return }
    setStepError('')
    setCurrentStep(s => Math.min(7, s + 1))
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
      <>
      <div className="p-4 md:p-6 max-w-6xl mx-auto">
        {publishedPending && (
          <div className="mb-6 rounded-2xl px-5 py-4 flex items-start gap-3"
            style={{ background: 'rgba(53,196,147,0.08)', border: '1px solid rgba(53,196,147,0.25)' }}>
            <CheckCircle size={20} style={{ color: 'var(--brand)', flexShrink: 0, marginTop: 2 }} />
            <div>
              <p className="font-semibold text-sm mb-0.5" style={{ color: '#0A7A50' }}>
                ¡Espacio enviado para revisión!
              </p>
              <p className="text-sm" style={{ color: '#166534' }}>
                Nuestro equipo verificará tu espacio antes de que aparezca en el marketplace. Te notificaremos por email cuando sea aprobado.
              </p>
            </div>
            <button onClick={() => setPublishedPending(false)} className="ml-auto shrink-0" style={{ color: '#6B7280' }}>
              <X size={16} />
            </button>
          </div>
        )}

        {saveError && (
          <div className="mb-5 rounded-2xl px-5 py-4 flex items-center gap-3"
            style={{ background: 'rgba(220,38,38,0.06)', border: '1.5px solid rgba(220,38,38,0.2)' }}>
            <span className="text-sm font-semibold flex-1" style={{ color: '#DC2626' }}>{saveError}</span>
            <button onClick={() => setSaveError('')} className="shrink-0" style={{ color: '#DC2626' }}>
              <X size={16} />
            </button>
          </div>
        )}

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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
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
                        : space.is_active
                          ? { background: 'rgba(217,119,6,0.9)', color: '#fff' }
                          : { background: 'rgba(0,0,0,0.6)', color: '#fff' }}>
                      {space.is_published
                        ? <><Eye size={10} /> Publicado</>
                        : space.is_active
                          ? <><Clock size={10} /> Pendiente revisión</>
                          : <><EyeOff size={10} /> Borrador</>}
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
                    <div className="flex gap-2 flex-wrap">
                      <button onClick={() => loadSpaceForEdit(space)}
                        className="flex-1 flex items-center justify-center gap-1.5 text-sm font-medium py-2 rounded-xl transition-colors"
                        style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}>
                        <Pencil size={13} /> Editar
                      </button>
                      <button onClick={() => {
                        const c = space.space_conditions?.[0]
                        setCancelModal({ id: space.id, name: space.name })
                        setCancelPolicy(c?.cancellation_policy ?? 'moderada')
                        setCancelRefundPct(String(c?.cancellation_refund_pct ?? 50))
                        setCancelHoursBefore(String(c?.cancellation_hours_before ?? 72))
                      }}
                        className="flex items-center justify-center gap-1.5 text-xs font-medium py-2 px-3 rounded-xl transition-colors"
                        style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}
                        title="Política de cancelación">
                        <Shield size={12} /> Cancelación
                      </button>

                      {!space.is_published && !space.is_active && (
                        <button
                          disabled={publishingId === space.id}
                          onClick={async () => {
                            setPublishingId(space.id)
                            setSaveError('')
                            const result = await publishSpace(space.id)
                            setPublishingId(null)
                            if ('error' in result) {
                              setSaveError(result.error ?? 'Error al enviar para revisión')
                            } else {
                              setSpaces(prev => prev.map(s => s.id === space.id ? { ...s, is_active: true } : s))
                              if ('pending' in result && result.pending) setPublishedPending(true)
                            }
                          }}
                          className="btn-brand flex-1 flex items-center justify-center gap-1.5 text-sm font-medium py-2 rounded-xl disabled:opacity-60">
                          {publishingId === space.id
                            ? <><Loader2 size={13} className="animate-spin" /> Enviando...</>
                            : <><Eye size={13} /> Enviar a revisión</>
                          }
                        </button>
                      )}
                      {!space.is_published && space.is_active && (
                        <div className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl"
                          style={{ background: 'rgba(37,99,235,0.08)', color: '#2563EB', border: '1px solid rgba(37,99,235,0.2)' }}>
                          <Clock size={12} /> En revisión
                        </div>
                      )}

                      {space.is_published && (
                        <button
                          onClick={async () => {
                            const r = await deactivateSpace(space.id)
                            if (!('error' in r)) setSpaces(prev => prev.map(s => s.id === space.id ? { ...s, is_published: false, is_active: false } : s))
                          }}
                          className="flex items-center justify-center gap-1.5 text-sm font-medium py-2 px-3 rounded-xl transition-colors"
                          style={{ background: 'rgba(217,119,6,0.08)', color: '#D97706', border: '1px solid rgba(217,119,6,0.2)' }}>
                          <EyeOff size={13} /> Despublicar
                        </button>
                      )}

                      {!space.is_published && !space.is_active && (
                        <button
                          onClick={async () => {
                            if (!window.confirm(`¿Eliminar "${space.name}"? Esta acción no se puede deshacer.`)) return
                            const r = await deleteSpaceByHost(space.id)
                            if ('error' in r) { setSaveError(r.error ?? 'No se pudo eliminar el espacio'); return }
                            setSpaces(prev => prev.filter(s => s.id !== space.id))
                          }}
                          className="flex items-center justify-center gap-1.5 text-sm font-medium py-2 px-3 rounded-xl transition-colors"
                          style={{ background: 'rgba(220,38,38,0.08)', color: '#DC2626', border: '1px solid rgba(220,38,38,0.2)' }}>
                          <Trash2 size={13} /> Eliminar
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

      {/* ── Modal: Editar política de cancelación ── */}
      {cancelModal ? (
        <>
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" onClick={() => setCancelModal(null)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-sm rounded-3xl p-6 space-y-5"
              style={{ background: '#fff', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>
                  Política de cancelación
                </h3>
                <button onClick={() => setCancelModal(null)} style={{ color: 'var(--text-muted)' }}>
                  <X size={18} />
                </button>
              </div>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{cancelModal.name}</p>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>Tipo de política</label>
                  <div className="flex gap-2">
                    {['flexible', 'moderada', 'estricta'].map(p => (
                      <button key={p} onClick={() => setCancelPolicy(p)}
                        className="flex-1 py-2 rounded-xl text-xs font-semibold capitalize transition-all"
                        style={cancelPolicy === p
                          ? { background: 'var(--brand)', color: '#fff' }
                          : { background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}>
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>% de reembolso</label>
                    <input type="number" inputMode="numeric" value={cancelRefundPct} onChange={e => setCancelRefundPct(e.target.value)}
                      min="0" max="100" className="input-base w-full rounded-xl px-3 py-2.5 text-sm" style={{ fontSize: 16 }} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>Horas de anticipación</label>
                    <input type="number" inputMode="numeric" value={cancelHoursBefore} onChange={e => setCancelHoursBefore(e.target.value)}
                      min="0" className="input-base w-full rounded-xl px-3 py-2.5 text-sm" style={{ fontSize: 16 }} />
                  </div>
                </div>
                <p className="text-xs rounded-xl px-3 py-2.5"
                  style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>
                  {Number(cancelRefundPct) > 0
                    ? `${cancelRefundPct}% de reembolso si cancela con más de ${cancelHoursBefore}h de anticipación`
                    : `Sin reembolso independientemente de la anticipación`}
                </p>
              </div>

              <div className="flex gap-3">
                <button onClick={() => setCancelModal(null)} className="flex-1 py-3 rounded-xl text-sm font-semibold btn-outline">
                  Cancelar
                </button>
                <button
                  onClick={async () => {
                    setCancelSaving(true)
                    const r = await updateCancellationPolicy(cancelModal.id, cancelPolicy, Number(cancelRefundPct), Number(cancelHoursBefore))
                    setCancelSaving(false)
                    if (r.error) { setSaveError(r.error); return }
                    setCancelModal(null)
                    setSaveError('')
                  }}
                  disabled={cancelSaving}
                  className="flex-1 py-3 rounded-xl text-sm font-bold disabled:opacity-50"
                  style={{ background: 'var(--brand)', color: '#fff' }}>
                  {cancelSaving ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </div>
          </div>
        </>
      ) : null}
      </>
    )
  }

  // ── VISTA: Wizard de creación ─────────────────────────────
  return (
    <div className="px-4 py-5 md:px-6 md:py-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-5 md:mb-8 flex items-center gap-3">
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
      <div className="mb-6 md:mb-8">
        {/* Mobile: barra de progreso + paso actual */}
        <div className="md:hidden mb-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold" style={{ color: 'var(--brand)' }}>
              Paso {currentStep} de {steps.length} — {steps.find(s => s.id === currentStep)?.label}
            </span>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {Math.round((currentStep / steps.length) * 100)}%
            </span>
          </div>
          <div className="w-full h-1.5 rounded-full" style={{ background: 'var(--bg-elevated)' }}>
            <div className="h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${(currentStep / steps.length) * 100}%`, background: 'var(--brand)' }} />
          </div>
        </div>
        {/* Desktop: pills */}
        <div className="hidden md:flex items-center gap-0.5 overflow-x-auto pb-1 scrollbar-hide">
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
                  <span>{step.label}</span>
                </button>
                {i < steps.length - 1 && (
                  <div className="w-5 h-px" style={{ background: isDone ? 'var(--brand-border)' : 'var(--border-subtle)' }} />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Step Content */}
      <div className="rounded-2xl p-4 md:p-7" style={{ background: '#fff', border: '1px solid var(--border-subtle)', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>

        {/* STEP 1: Información básica */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg md:text-xl font-bold mb-1" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Información básica</h2>
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
                    {(() => { const I = cat.icon as any; return <I size={18} /> })()}
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

            <LocationPicker
              address={address} sector={sector} lat={lat} lng={lng}
              onAddress={setAddress} onSector={setSector}
              onCoords={(la, lo) => { setLat(la); setLng(lo) }}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Capacidad mínima</label>
                <input
                  type="number"
                  inputMode="numeric"
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
                  inputMode="numeric"
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
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                Fotos del espacio
              </label>
              <PhotoUploader
                key={editingSpaceId ?? 'new'}
                spaceId={editingSpaceId ?? undefined}
                initialPhotos={existingPhotos}
                onChange={photos => { setPendingPhotos(photos); setPhotosTouched(true) }}
              />
              <p className="text-xs mt-1.5" style={{ color: pendingPhotos.length === 0 ? '#EF4444' : 'var(--text-muted)' }}>
                * Obligatorio: al menos una foto para publicar
              </p>
            </div>

            {/* Video opcional */}
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <label className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                  Video del espacio
                </label>
                <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                  style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)', border: '1px solid var(--border-subtle)' }}>
                  Opcional
                </span>
              </div>
              <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
                Un video corto muestra mejor el ambiente de tu espacio. No es obligatorio.
              </p>
              <VideoUploader
                initialUrl={videoUrl}
                onChange={(url) => setVideoUrl(url)}
                onRemove={() => setVideoUrl('')}
              />
            </div>

            {/* Menú / carta opcional */}
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <label className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                  Menú o carta
                </label>
                <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                  style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)', border: '1px solid var(--border-subtle)' }}>
                  Opcional
                </span>
              </div>
              <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
                Sube tu menú o carta en PDF o Word. Los clientes podrán descargarlo directamente desde tu Espot.
              </p>
              <MenuUploader
                initialUrl={menuUrl}
                initialName={menuFileName}
                onChange={(url, name) => { setMenuUrl(url); setMenuFileName(name) }}
                onRemove={() => { setMenuUrl(''); setMenuFileName('') }}
              />
            </div>
          </div>
        )}

        {/* STEP 2: Precios */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg md:text-xl font-bold mb-1" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Modalidad de precio</h2>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>¿Cómo quieres vender tu espacio?</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
                    {(() => { const I = option.icon as any; return <I size={18} style={{ color: pricingType === option.value ? 'var(--brand)' : 'var(--text-muted)' }} /> })()}
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
                      type="number" inputMode="numeric"
                      value={hourlyPrice}
                      onChange={e => setHourlyPrice(e.target.value)}
                      placeholder="5000"
                      className="w-full input-base rounded-xl px-4 py-2.5 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Mínimo de horas</label>
                    <input
                      type="number" inputMode="numeric"
                      value={minHours}
                      onChange={e => setMinHours(e.target.value)}
                      placeholder="3"
                      className="w-full input-base rounded-xl px-4 py-2.5 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Máximo de horas</label>
                    <input
                      type="number" inputMode="numeric"
                      value={maxHours}
                      onChange={e => setMaxHours(e.target.value)}
                      placeholder="8"
                      className="w-full input-base rounded-xl px-4 py-2.5 text-sm"
                    />
                  </div>
                </div>
                {hourlyPrice && minHours && (
                  <div className="rounded-lg p-3 text-sm" style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>
                    El cliente pagaría mínimo <strong style={{ color: 'var(--text-primary)' }}>{formatCurrency(Number(hourlyPrice) * Number(minHours))}</strong> por {minHours} horas
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
                    <input type="number" inputMode="numeric" value={minConsumption} onChange={e => setMinConsumption(e.target.value)}
                      placeholder="60000" className="w-full input-base rounded-xl px-4 py-2.5 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Mínimo de horas</label>
                    <input type="number" inputMode="numeric" value={minHours} onChange={e => setMinHours(e.target.value)}
                      placeholder="3" className="w-full input-base rounded-xl px-4 py-2.5 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Máximo de horas</label>
                    <input type="number" inputMode="numeric" value={maxHours} onChange={e => setMaxHours(e.target.value)}
                      placeholder="8" className="w-full input-base rounded-xl px-4 py-2.5 text-sm" />
                  </div>
                </div>
                <div className="rounded-lg p-3 text-xs" style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>
                  El cliente paga <strong style={{ color: 'var(--text-primary)' }}>{minConsumption ? formatCurrency(Number(minConsumption)) : 'ese monto'}</strong> por adelantado a través de Espot.
                  Ese dinero es su crédito de comida y bebidas en tu local durante el evento. Si consumen más, pagan la diferencia directamente contigo.
                </div>
              </div>
            )}

            {pricingType === 'fixed_package' && (
              <div className="bg-[rgba(53,196,147,0.07)] border border-[rgba(53,196,147,0.20)] rounded-xl p-5 space-y-4">
                <h3 className="font-semibold text-sm" style={{ color: 'var(--brand)' }}>Configuración del paquete</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Nombre del paquete</label>
                    <input value={packageName} onChange={e => setPackageName(e.target.value)}
                      placeholder="Paquete Cumpleaños Premium"
                      className="w-full input-base rounded-xl px-4 py-2.5 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Precio del paquete (RD$) *</label>
                    <input type="number" inputMode="numeric" value={fixedPrice} onChange={e => setFixedPrice(e.target.value)}
                      placeholder="35000" className="w-full input-base rounded-xl px-4 py-2.5 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Horas incluidas *</label>
                    <input type="number" inputMode="numeric" value={packageHours} onChange={e => setPackageHours(e.target.value)}
                      placeholder="6" className="w-full input-base rounded-xl px-4 py-2.5 text-sm" />
                    <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>El cliente reserva esas horas exactas</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Precio hora adicional (RD$)</label>
                    <input type="number" inputMode="numeric" value={pkgExtraHourPrice} onChange={e => setPkgExtraHourPrice(e.target.value)}
                      placeholder="5000" className="w-full input-base rounded-xl px-4 py-2.5 text-sm" />
                    <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Si quiere más horas que las incluidas</p>
                  </div>
                </div>
                {fixedPrice && packageHours && (
                  <div className="rounded-lg p-3 text-xs" style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>
                    El cliente paga <strong style={{ color: 'var(--text-primary)' }}>{formatCurrency(Number(fixedPrice))}</strong> por {packageHours} horas.
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
                  Con esta modalidad, los clientes te enviarán una solicitud describiendo su evento. Recibirás una notificación y podrás responder con un precio personalizado.
                </p>
              </div>
            )}

            {/* Precio fin de semana */}
            {pricingType && pricingType !== 'custom_quote' && (
              <div className="space-y-3 pt-3 mt-1" style={{ borderTop: '1px solid var(--border-subtle)' }}>

                {/* Toggle precio diferente fin de semana */}
                <button type="button"
                  onClick={() => { setWeekendEnabled(e => !e); if (weekendEnabled) setWeekendPrice('') }}
                  className="w-full flex items-center justify-between px-4 py-3.5 rounded-2xl transition-all"
                  style={{
                    background: weekendEnabled ? 'rgba(53,196,147,0.06)' : 'var(--bg-elevated)',
                    border: `1.5px solid ${weekendEnabled ? 'var(--brand-border)' : 'var(--border-subtle)'}`,
                  }}>
                  <div className="text-left">
                    <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                      ¿Precio diferente los fines de semana?
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      Viernes, sábados y domingos con precio distinto al de entre semana
                    </div>
                  </div>
                  {/* Toggle visual */}
                  <div className="w-11 h-6 rounded-full flex items-center transition-all shrink-0 ml-3"
                    style={{ background: weekendEnabled ? 'var(--brand)' : 'var(--border-medium)', padding: '2px' }}>
                    <div className="w-5 h-5 rounded-full bg-white shadow-sm transition-transform"
                      style={{ transform: weekendEnabled ? 'translateX(20px)' : 'translateX(0)' }} />
                  </div>
                </button>

                {weekendEnabled && (
                  <div className="rounded-xl px-4 py-4 space-y-2"
                    style={{ background: 'rgba(53,196,147,0.04)', border: '1px solid var(--brand-border)' }}>
                    <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
                      Precio vie / sáb / dom
                    </label>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold shrink-0" style={{ color: 'var(--text-muted)' }}>RD$</span>
                      <input
                        type="number"
                        inputMode="numeric"
                        value={weekendPrice}
                        onChange={e => setWeekendPrice(e.target.value)}
                        placeholder={hourlyPrice || minConsumption || fixedPrice || '0'}
                        min="0"
                        className="input-base flex-1 rounded-xl px-4 py-3 text-sm"
                        style={{ fontSize: 16 }}
                      />
                    </div>
                    {weekendPrice && (Number(hourlyPrice || minConsumption || fixedPrice || 0)) > 0 && (
                      <p className="text-xs" style={{ color: 'var(--brand)' }}>
                        {Number(weekendPrice) > Number(hourlyPrice || minConsumption || fixedPrice || 0)
                          ? `+${Math.round((Number(weekendPrice) / Number(hourlyPrice || minConsumption || fixedPrice || 1) - 1) * 100)}% más que entre semana`
                          : Number(weekendPrice) < Number(hourlyPrice || minConsumption || fixedPrice || 0)
                          ? `${Math.round((1 - Number(weekendPrice) / Number(hourlyPrice || minConsumption || fixedPrice || 1)) * 100)}% menos que entre semana`
                          : 'Mismo precio que entre semana'}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* STEP 3: Disponibilidad semanal */}
        {currentStep === 3 && (
          <div>
            <div className="mb-5">
              <h2 className="text-lg md:text-xl font-bold mb-1" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Horarios de disponibilidad</h2>
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
              <h2 className="text-lg md:text-xl font-bold mb-1" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Adicionales y extras</h2>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                Activa los servicios que ofreces. El cliente podrá agregarlos al reservar.
              </p>
            </div>

            {/* ─ Sección 1: Selección ─ */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                  ¿Qué ofreces?
                </p>
                {addons.length > 0 && (
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
                    style={{ background: 'rgba(53,196,147,0.1)', color: '#35C493' }}>
                    {addons.length} seleccionado{addons.length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
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
                      {(() => { const I = addon.icon as any; return <I size={18} style={{ color: 'var(--text-secondary)' }} /> })()}
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
                <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--text-muted)' }}>
                  Configura precios de los seleccionados
                </p>
                <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border-subtle)' }}>
                  {addons.map((addon, i) => (
                    <div key={i}
                      className="px-4 py-3"
                      style={{ borderBottom: i < addons.length - 1 ? '1px solid var(--border-subtle)' : 'none', background: 'var(--bg-elevated)' }}>
                      {/* Fila 1: icono + nombre + eliminar */}
                      <div className="flex items-center gap-3 mb-2">
                        {(() => { const I = addon.icon as any; return <I size={16} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} /> })()}
                        <span className="text-sm font-medium flex-1 min-w-0 truncate" style={{ color: 'var(--text-primary)' }}>{addon.name}</span>
                        <button onClick={() => toggleAddon(addon)}
                          className="w-7 h-7 flex items-center justify-center rounded-lg transition-all shrink-0"
                          style={{ color: 'rgba(248,113,113,0.6)', background: 'rgba(248,113,113,0.08)' }}>
                          <X size={13} />
                        </button>
                      </div>
                      {/* Fila 2: precio + unidad */}
                      <div className="flex items-center gap-2 pl-7">
                        <span className="text-xs shrink-0" style={{ color: 'var(--text-muted)' }}>RD$</span>
                        <input
                          type="number"
                          inputMode="numeric"
                          value={addon.price}
                          onChange={e => {
                            const updated = [...addons]
                            updated[i] = { ...addon, price: Number(e.target.value) }
                            setAddons(updated)
                          }}
                          className="flex-1 min-w-0 rounded-lg px-3 py-1.5 text-sm focus:outline-none transition-colors"
                          style={{ background: '#fff', border: '1.5px solid var(--border-medium)', color: 'var(--text-primary)', fontSize: 16 }}
                        />
                        <select
                          value={addon.unit}
                          onChange={e => {
                            const updated = [...addons]
                            updated[i] = { ...addon, unit: e.target.value }
                            setAddons(updated)
                          }}
                          className="rounded-lg px-2 py-1.5 text-xs focus:outline-none shrink-0"
                          style={{ background: '#fff', border: '1.5px solid var(--border-medium)', color: 'var(--text-secondary)', fontSize: 14 }}
                        >
                          <option value="evento">/ evento</option>
                          <option value="hora">/ hora</option>
                          <option value="persona">/ persona</option>
                        </select>
                      </div>
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
              <h2 className="text-lg md:text-xl font-bold mb-1" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Reglas y condiciones</h2>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Define las reglas de tu espacio. El cliente las verá antes de reservar.</p>
            </div>

            {/* ─── 0. FACILIDADES E INSTALACIONES ─── */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>Instalaciones y facilidades</p>
              <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>Indica qué incluye tu espacio. Los clientes podrán filtrar por esto.</p>

              {/* Grid de facilidades booleanas */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-5">
                {([
                  { label: 'Estacionamiento',    icon: Car,             value: hasParkingFac,   setter: setHasParkingFac },
                  { label: 'Valet parking',       icon: Car,             value: hasValetParking, setter: setHasValetParking },
                  { label: 'WiFi',                icon: Wifi,            value: hasWifi,         setter: setHasWifi },
                  { label: 'Aire acondicionado',  icon: Wind,            value: hasAc,           setter: setHasAc },
                  { label: 'Sistema de sonido',   icon: Volume2,         value: hasSoundSystem,  setter: setHasSoundSystem },
                  { label: 'Proyector / pantalla',icon: Monitor,         value: hasProjector,    setter: setHasProjector },
                  { label: 'Pista de baile',      icon: Music2,          value: hasDanceFloor,   setter: setHasDanceFloor },
                  { label: 'Área exterior',       icon: Trees,           value: hasOutdoorArea,  setter: setHasOutdoorArea },
                  { label: 'Piscina',             icon: Waves,           value: hasPool,         setter: setHasPool },
                  { label: 'Cocina equipada',     icon: UtensilsCrossed, value: hasKitchen,      setter: setHasKitchen },
                  { label: 'Barra de bar',        icon: Wine,            value: hasBar,          setter: setHasBar },
                  { label: 'Escenario',           icon: Music2,          value: hasStage,        setter: setHasStage },
                  { label: 'Ciclorama',           icon: Camera,          value: hasCyclorama,    setter: setHasCyclorama },
                  { label: 'Luz natural',         icon: Sun,             value: hasNaturalLight, setter: setHasNaturalLight },
                  { label: 'Planta eléctrica',    icon: Zap,             value: hasGenerator,    setter: setHasGenerator },
                  { label: 'Camerino',            icon: ShowerHead,      value: hasDressingRoom, setter: setHasDressingRoom },
                ] as { label: string; icon: React.ElementType; value: boolean; setter: (v: boolean) => void }[]).map(item => (
                  <button key={item.label}
                    onClick={() => item.setter(!item.value)}
                    className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left transition-all"
                    style={item.value
                      ? { background: 'var(--brand-dim)', border: '1.5px solid var(--brand-border)', color: 'var(--brand)' }
                      : { background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }
                    }>
                    {(() => { const I = item.icon as any; return <I size={16} style={{ color: item.value ? 'var(--brand)' : 'var(--text-muted)' }} /> })()}
                    <span className="text-xs font-medium leading-tight">{item.label}</span>
                    {item.value && <span className="ml-auto text-xs font-bold" style={{ color: 'var(--brand)' }}>✓</span>}
                  </button>
                ))}
              </div>

            </div>

            {/* ─── 1. PERMISOS GENERALES ─── */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--text-muted)' }}>Permisos generales</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
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

            {/* ─── 2. HORAS EXTRA ─── */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--text-muted)' }}>Horas extra</p>
              <div className="space-y-3">
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
                      <input type="number" inputMode="numeric" value={extraHourPrice} onChange={e => setExtraHourPrice(e.target.value)}
                        placeholder="Ej: 5000"
                        className="input-base w-full rounded-xl px-3 py-2.5 text-sm" />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ─── 4. POLÍTICA DE CANCELACIÓN ─── */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--text-muted)' }}>Política de cancelación</p>
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
              <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--text-muted)' }}>Reglas adicionales</p>
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
              <h2 className="text-lg md:text-xl font-bold mb-1" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Modelo de pagos</h2>
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

            {/* Reserva instantánea */}
            <div className="rounded-2xl p-4"
              style={{ background: instantBooking ? 'rgba(37,99,235,0.05)' : 'var(--bg-elevated)', border: `1.5px solid ${instantBooking ? 'rgba(37,99,235,0.25)' : 'var(--border-subtle)'}` }}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>⚡ Reserva instantánea</span>
                    {instantBooking && (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                        style={{ background: 'rgba(37,99,235,0.1)', color: '#1D4ED8' }}>Activa</span>
                    )}
                  </div>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    Las reservas se confirman automáticamente sin revisión. Ideal para espacios con disponibilidad libre.
                  </p>
                </div>
                <button onClick={() => setInstantBooking(v => !v)}
                  className="w-11 h-6 rounded-full relative transition-all shrink-0 ml-4"
                  style={{ background: instantBooking ? '#2563EB' : 'var(--border-medium)' }}>
                  <span className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all"
                    style={{ left: instantBooking ? 22 : 2 }} />
                </button>
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
                {saving
                  ? <><Loader2 size={18} className="animate-spin" /> Guardando...</>
                  : editingSpaceId
                    ? <><Save size={16} /> Guardar cambios</>
                    : <><CheckCircle size={16} /> Publicar mi Espot</>}
              </button>
            </div>

            <p className="text-xs text-center" style={{ color: 'var(--text-muted)' }}>
              Tu espacio será revisado por el equipo de espot.do antes de aparecer en el marketplace.
            </p>
          </div>
        )}

        {/* Navigation buttons */}
        <div className="mt-8 pt-6 border-t space-y-3" style={{ borderColor: 'var(--border-subtle)' }}>
          {stepError && (
            <p className="text-xs font-medium text-center" style={{ color: '#DC2626' }}>{stepError}</p>
          )}
          <div className="flex items-center justify-between gap-3">
            <button
              onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
              disabled={currentStep === 1}
              className="flex items-center gap-2 px-4 py-3 rounded-xl disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-sm font-medium shrink-0"
              style={{ color: 'var(--text-secondary)', border: '1px solid var(--border-medium)' }}
            >
              <ChevronLeft size={16} /> <span className="hidden sm:inline">Anterior</span>
            </button>

            <span className="text-xs hidden md:block" style={{ color: 'var(--text-muted)' }}>Paso {currentStep} de {steps.length}</span>

            <div className="flex items-center gap-2 ml-auto">
              {editingSpaceId && currentStep < 7 && (
                <button
                  onClick={handlePublish}
                  disabled={saving}
                  className="flex items-center gap-1.5 text-sm font-semibold px-3 md:px-4 py-3 rounded-xl transition-all disabled:opacity-50 shrink-0"
                  style={{ background: 'var(--brand-dim)', color: 'var(--brand)', border: '1px solid var(--brand-border)' }}>
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  <span className="hidden sm:inline">Guardar</span>
                </button>
              )}

              {currentStep < 7 && (
                <button
                  onClick={goNext}
                  className="flex items-center gap-2 text-white text-sm font-semibold px-5 py-3 rounded-xl transition-colors shrink-0"
                  style={{ background: 'var(--brand)' }}
                >
                  Siguiente <ChevronRight size={16} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
