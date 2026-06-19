// ── Sistema de Actividades de Espot ──────────────────────
// Dos niveles: categorías base (propietario) + sub-actividades (búsqueda de clientes)

export type BaseActivity = 'fiesta' | 'corporativo' | 'produccion' | 'reunion'

export interface BaseActivityDef {
  key:         BaseActivity
  label:       string
  description: string
  color:       string
  bg:          string
  icon:        string  // emoji or icon name
}

export interface SubActivity {
  key:      string
  label:    string
  base:     BaseActivity   // mapeo a categoría base
}

// ── Categorías base (para propietarios) ──────────────────
export const BASE_ACTIVITIES: BaseActivityDef[] = [
  {
    key:         'fiesta',
    label:       'Fiestas y celebraciones',
    description: 'Cumpleaños, bodas, quinceañeras, celebraciones sociales',
    color:       '#F59E0B',
    bg:          'rgba(245,158,11,0.1)',
    icon:        'party',
  },
  {
    key:         'corporativo',
    label:       'Eventos corporativos',
    description: 'Reuniones de empresa, networking, lanzamientos, afterwork',
    color:       '#3B82F6',
    bg:          'rgba(59,130,246,0.1)',
    icon:        'briefcase',
  },
  {
    key:         'produccion',
    label:       'Producción y medios',
    description: 'Sesiones de fotos, rodajes, podcasts, videos musicales',
    color:       '#8B5CF6',
    bg:          'rgba(139,92,246,0.1)',
    icon:        'camera',
  },
  {
    key:         'reunion',
    label:       'Reuniones y trabajo',
    description: 'Meetings, coworking, entrevistas, talleres',
    color:       '#35C493',
    bg:          'rgba(53,196,147,0.1)',
    icon:        'meeting',
  },
]

// ── Sub-actividades (para clientes en la búsqueda) ───────
export const SUB_ACTIVITIES: SubActivity[] = [
  // ── Fiestas y celebraciones ──────────────────────────────
  { key: 'cumpleanos',          label: 'Cumpleaños',              base: 'fiesta' },
  { key: 'boda',                label: 'Boda',                    base: 'fiesta' },
  { key: 'quinceanera',         label: 'Quinceañera',             base: 'fiesta' },
  { key: 'baby-shower',         label: 'Baby Shower',             base: 'fiesta' },
  { key: 'graduacion',          label: 'Graduación',              base: 'fiesta' },
  { key: 'bautizo',             label: 'Bautizo',                 base: 'fiesta' },
  { key: 'primera-comunion',    label: 'Primera comunión',        base: 'fiesta' },
  { key: 'aniversario',         label: 'Aniversario',             base: 'fiesta' },
  { key: 'onomastico',          label: 'Onomástico',              base: 'fiesta' },
  { key: 'despedida-soltera',   label: 'Despedida de soltera',    base: 'fiesta' },
  { key: 'despedida-soltero',   label: 'Despedida de soltero',    base: 'fiesta' },
  { key: 'gender-reveal',       label: 'Gender Reveal',           base: 'fiesta' },
  { key: 'pool-party',          label: 'Pool Party',              base: 'fiesta' },
  { key: 'fiesta-navidad',      label: 'Fiesta de Navidad',       base: 'fiesta' },
  { key: 'fin-de-ano',          label: 'Fin de año',              base: 'fiesta' },
  { key: 'reunion-familiar',    label: 'Reunión familiar',        base: 'fiesta' },
  { key: 'sweet-sixteen',       label: 'Sweet Sixteen',           base: 'fiesta' },
  { key: 'despedida',           label: 'Despedida',               base: 'fiesta' },
  { key: 'karaoke',             label: 'Karaoke',                 base: 'fiesta' },
  { key: 'cena',                label: 'Cena / Comida',           base: 'fiesta' },
  { key: 'celebracion',         label: 'Celebración',             base: 'fiesta' },
  { key: 'evento-social',       label: 'Evento social',           base: 'fiesta' },

  // ── Corporativo ──────────────────────────────────────────
  { key: 'evento-corporativo',  label: 'Evento corporativo',      base: 'corporativo' },
  { key: 'afterwork',           label: 'Afterwork',               base: 'corporativo' },
  { key: 'networking',          label: 'Networking',              base: 'corporativo' },
  { key: 'lanzamiento',         label: 'Lanzamiento de producto', base: 'corporativo' },
  { key: 'conferencia',         label: 'Conferencia',             base: 'corporativo' },
  { key: 'taller',              label: 'Taller',                  base: 'corporativo' },
  { key: 'capacitacion',        label: 'Capacitación',            base: 'corporativo' },
  { key: 'team-building',       label: 'Team Building',           base: 'corporativo' },
  { key: 'retiro-corporativo',  label: 'Retiro corporativo',      base: 'corporativo' },
  { key: 'premiacion',          label: 'Gala / Premiación',       base: 'corporativo' },
  { key: 'feria',               label: 'Feria / Exposición',      base: 'corporativo' },
  { key: 'desayuno-trabajo',    label: 'Desayuno de negocios',    base: 'corporativo' },
  { key: 'almuerzo-negocios',   label: 'Almuerzo de negocios',    base: 'corporativo' },
  { key: 'rueda-prensa',        label: 'Rueda de prensa',         base: 'corporativo' },
  { key: 'open-house',          label: 'Open House',              base: 'corporativo' },
  { key: 'fiesta-empresa',      label: 'Fiesta de empresa',       base: 'corporativo' },

  // ── Producción y medios ───────────────────────────────────
  { key: 'sesion-fotos',        label: 'Sesión de fotos',         base: 'produccion' },
  { key: 'video-musical',       label: 'Video musical',           base: 'produccion' },
  { key: 'rodaje',              label: 'Rodaje',                  base: 'produccion' },
  { key: 'podcast',             label: 'Podcast / Radio',         base: 'produccion' },
  { key: 'contenido',           label: 'Contenido digital',       base: 'produccion' },
  { key: 'shooting',            label: 'Shooting publicitario',   base: 'produccion' },
  { key: 'desfile-modas',       label: 'Desfile de modas',        base: 'produccion' },
  { key: 'casting',             label: 'Casting / Audición',      base: 'produccion' },

  // ── Reuniones y trabajo ───────────────────────────────────
  { key: 'reunion-trabajo',     label: 'Reunión de trabajo',      base: 'reunion' },
  { key: 'meeting',             label: 'Meeting',                 base: 'reunion' },
  { key: 'entrevista',          label: 'Entrevista',              base: 'reunion' },
  { key: 'coworking',           label: 'Coworking',               base: 'reunion' },
  { key: 'seminario',           label: 'Seminario / Charla',      base: 'reunion' },
  { key: 'clase',               label: 'Clase / Curso',           base: 'reunion' },
  { key: 'reunion-junta',       label: 'Reunión de junta',        base: 'reunion' },
]

// ── Mapping: sub-actividad → categoría base ───────────────
export const SUB_TO_BASE: Record<string, BaseActivity> = {
  ...Object.fromEntries(SUB_ACTIVITIES.map(s => [s.key, s.base])),
  // Aliases para retrocompatibilidad con URLs antiguas (plural / variantes)
  bodas:        'fiesta',     // URL antigua ?activity=bodas → ahora ?activity=boda
  quinceaneras: 'fiesta',     // URL antigua ?activity=quinceaneras → ahora ?activity=quinceanera
  corporativo:  'corporativo', // Shortcut: cae directo a base sin pasar por sub-actividad
}

// Dado un slug de sub-actividad, devuelve la categoría base
export function getBaseFromSub(subKey: string): BaseActivity | null {
  return SUB_TO_BASE[subKey] ?? null
}

// Sub-actividades agrupadas por base (para el UI)
export const SUB_BY_BASE: Record<BaseActivity, SubActivity[]> = {
  fiesta:      SUB_ACTIVITIES.filter(s => s.base === 'fiesta'),
  corporativo: SUB_ACTIVITIES.filter(s => s.base === 'corporativo'),
  produccion:  SUB_ACTIVITIES.filter(s => s.base === 'produccion'),
  reunion:     SUB_ACTIVITIES.filter(s => s.base === 'reunion'),
}
