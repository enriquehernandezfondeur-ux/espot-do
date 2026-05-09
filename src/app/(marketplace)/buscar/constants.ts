import {
  LayoutList, Building2, UtensilsCrossed, Sunset, Wine, Hotel,
  Briefcase, Home, Camera, Trees,
  Timer, Package, MessageSquare,
} from 'lucide-react'

export const CATEGORIES = [
  { value: '',             label: 'Todos',       icon: LayoutList },
  { value: 'salon',        label: 'Salones',      icon: Building2 },
  { value: 'restaurante',  label: 'Restaurantes', icon: UtensilsCrossed },
  { value: 'rooftop',      label: 'Rooftops',     icon: Sunset },
  { value: 'terraza',      label: 'Terrazas',     icon: Trees },
  { value: 'bar',          label: 'Bares',        icon: Wine },
  { value: 'hotel',        label: 'Hotel / Villa', icon: Hotel },
  { value: 'coworking',    label: 'Coworking',    icon: Briefcase },
  { value: 'estudio',      label: 'Estudios',     icon: Camera },
]

export const PRICING_TYPES = [
  { value: '',                    label: 'Todos',            icon: null,           bg: '',                         text: '',        border: '' },
  { value: 'hourly',              label: 'Por hora',         icon: Timer,          bg: 'rgba(37,99,235,0.09)',     text: '#1D4ED8', border: 'rgba(37,99,235,0.22)' },
  { value: 'minimum_consumption', label: 'Consumo mínimo',  icon: Wine,           bg: 'rgba(180,83,9,0.09)',      text: '#B45309', border: 'rgba(180,83,9,0.22)' },
  { value: 'fixed_package',       label: 'Paquete fijo',    icon: Package,        bg: 'rgba(109,40,217,0.09)',    text: '#6D28D9', border: 'rgba(109,40,217,0.22)' },
  { value: 'custom_quote',        label: 'Cotización',      icon: MessageSquare,  bg: 'rgba(71,85,105,0.09)',     text: '#475569', border: 'rgba(71,85,105,0.22)' },
] as const
