import {
  Building2, UtensilsCrossed, Wine, Sunset, Trees, Leaf,
  Camera, Briefcase, HeartPulse, Store, Hotel, Home, MapPin, LayoutList,
  type LucideIcon,
} from 'lucide-react'

export interface CategoryDef {
  value: string
  label: string        // singular — formularios
  labelPlural: string  // plural — filtros/listados
  icon: LucideIcon
  featured: boolean     // destacada en captación/home
  order: number         // orden entre las destacadas
  featuredTitle?: string       // título de marketing del grupo destacado
  featuredDescription?: string // subtítulo del grupo destacado
}

// Fuente ÚNICA de verdad. Cualquier consumidor de categorías importa de aquí.
// `as const satisfies` valida la forma SIN ensanchar `value` a string,
// para que SpaceCategory sea una unión literal (no `string`).
export const SPACE_CATEGORIES = [
  { value: 'estudio',     label: 'Estudio',     labelPlural: 'Estudios',     icon: Camera,        featured: true,  order: 1, featuredTitle: 'Estudios de podcast y fotografía', featuredDescription: 'Sets equipados para grabar, transmitir y producir.' },
  { value: 'coworking',   label: 'Coworking',   labelPlural: 'Coworkings',   icon: Briefcase,     featured: true,  order: 2, featuredTitle: 'Coworkings y salas de reuniones', featuredDescription: 'Espacios para trabajar, reunirse y presentar.' },
  { value: 'wellness',    label: 'Wellness',    labelPlural: 'Wellness',     icon: HeartPulse,    featured: true,  order: 3, featuredTitle: 'Wellness y bienestar', featuredDescription: 'Yoga, terapias, retiros y clases.' },
  { value: 'popup',       label: 'Pop-up',      labelPlural: 'Pop-ups',      icon: Store,         featured: true,  order: 4, featuredTitle: 'Pop-ups, bazares y eventos temporales', featuredDescription: 'Espacios para activaciones y ventas temporales.' },
  { value: 'salon',       label: 'Salón de eventos', labelPlural: 'Salones', icon: Building2,     featured: false, order: 100 },
  { value: 'restaurante', label: 'Restaurante', labelPlural: 'Restaurantes', icon: UtensilsCrossed, featured: false, order: 101 },
  { value: 'bar',         label: 'Bar / Lounge', labelPlural: 'Bares',       icon: Wine,          featured: false, order: 102 },
  { value: 'rooftop',     label: 'Rooftop',     labelPlural: 'Rooftops',     icon: Sunset,        featured: false, order: 103 },
  { value: 'terraza',     label: 'Terraza',     labelPlural: 'Terrazas',     icon: Trees,         featured: false, order: 104 },
  { value: 'jardin',      label: 'Jardín',      labelPlural: 'Jardines',     icon: Leaf,          featured: false, order: 105 },
  { value: 'hotel',       label: 'Hotel',       labelPlural: 'Hoteles',      icon: Hotel,         featured: false, order: 106 },
  { value: 'villa',       label: 'Villa',       labelPlural: 'Villas',       icon: Home,          featured: false, order: 107 },
  { value: 'lounge',      label: 'Lounge',      labelPlural: 'Lounges',      icon: Wine,          featured: false, order: 108 },
  { value: 'otro',        label: 'Otro',        labelPlural: 'Otros',        icon: MapPin,        featured: false, order: 109 },
] as const satisfies readonly CategoryDef[]

// Tipo derivado del catálogo (única definición real de SpaceCategory).
export type SpaceCategory = typeof SPACE_CATEGORIES[number]['value']

const BY_VALUE: Record<string, CategoryDef> = Object.fromEntries(
  SPACE_CATEGORIES.map(c => [c.value, c]),
)

export function getCategory(value: string | null | undefined): CategoryDef | undefined {
  if (!value) return undefined
  return BY_VALUE[value]
}

export function getCategoryLabel(value: string | null | undefined, opts?: { plural?: boolean }): string {
  const c = getCategory(value)
  if (!c) return value || 'Espacio'
  return opts?.plural ? c.labelPlural : c.label
}

export function getCategoryIcon(value: string | null | undefined): LucideIcon {
  return getCategory(value)?.icon ?? MapPin
}

// Las 4 destacadas, ordenadas.
export function getFeaturedCategories(): CategoryDef[] {
  return SPACE_CATEGORIES.filter(c => c.featured).sort((a, b) => a.order - b.order)
}

// Para filtros de búsqueda: incluye la opción "Todos" al inicio.
// "Todos" usa LayoutList (igual que el comportamiento original), así el icono
// nunca es null y los consumidores pueden renderizarlo sin guarda.
export const FILTER_CATEGORIES: { value: string; label: string; icon: LucideIcon }[] = [
  { value: '', label: 'Todos', icon: LayoutList },
  ...SPACE_CATEGORIES.map(c => ({ value: c.value, label: c.labelPlural, icon: c.icon })),
]
