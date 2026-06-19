import { Timer, Package, MessageSquare, Wine } from 'lucide-react'
import { FILTER_CATEGORIES } from '@/lib/categories'

export const CATEGORIES = FILTER_CATEGORIES

export const PRICING_TYPES = [
  { value: '',                    label: 'Todos',            icon: null,           bg: '',                         text: '',        border: '' },
  { value: 'hourly',              label: 'Por hora',         icon: Timer,          bg: 'rgba(37,99,235,0.09)',     text: '#1D4ED8', border: 'rgba(37,99,235,0.22)' },
  { value: 'minimum_consumption', label: 'Consumibles',  icon: Wine,           bg: 'rgba(180,83,9,0.09)',      text: '#B45309', border: 'rgba(180,83,9,0.22)' },
  { value: 'fixed_package',       label: 'Paquete fijo',    icon: Package,        bg: 'rgba(109,40,217,0.09)',    text: '#6D28D9', border: 'rgba(109,40,217,0.22)' },
  { value: 'custom_quote',        label: 'Cotización',      icon: MessageSquare,  bg: 'rgba(71,85,105,0.09)',     text: '#475569', border: 'rgba(71,85,105,0.22)' },
] as const
