import type { ActivityTemplate, ActivityType } from './types'

export const ACTIVITY_TYPE_ORDER: ActivityType[] = [
  'cumpleanos', 'reunion', 'cena', 'taller',
  'sesion_foto', 'networking', 'casting', 'podcast', 'otro',
]

export const ACTIVITY_TEMPLATES: Record<ActivityType, ActivityTemplate> = {
  podcast: { type: 'podcast', label: 'Podcast / Grabación', icon: 'Mic', questions: [
    { label: '¿Eres invitado o staff?', field_type: 'choice', options: ['Invitado', 'Staff'], required: true },
    { label: 'Tema o nombre del episodio', field_type: 'text' },
  ]},
  sesion_foto: { type: 'sesion_foto', label: 'Sesión de fotos/video', icon: 'Camera', questions: [
    { label: 'Rol', field_type: 'choice', options: ['Cliente', 'Modelo', 'Fotógrafo', 'Equipo técnico'], required: true },
  ]},
  taller: { type: 'taller', label: 'Taller / Capacitación', icon: 'GraduationCap', questions: [
    { label: 'Empresa', field_type: 'text' },
    { label: 'Rol', field_type: 'text' },
  ]},
  reunion: { type: 'reunion', label: 'Reunión', icon: 'Briefcase', questions: [
    { label: 'Empresa', field_type: 'text' },
  ]},
  casting: { type: 'casting', label: 'Casting / Entrevista', icon: 'Clapperboard', questions: [
    { label: 'Portafolio o link', field_type: 'text' },
  ]},
  cena: { type: 'cena', label: 'Cena privada', icon: 'UtensilsCrossed', questions: [
    { label: '¿Alergias o restricciones?', field_type: 'text' },
  ]},
  cumpleanos: { type: 'cumpleanos', label: 'Cumpleaños / Celebración', icon: 'Cake', questions: [
    { label: '¿Cuántos vienen contigo?', field_type: 'number' },
  ]},
  networking: { type: 'networking', label: 'Networking', icon: 'Users', questions: [
    { label: 'Empresa / proyecto', field_type: 'text' },
  ]},
  otro: { type: 'otro', label: 'Otro', icon: 'Sparkles', questions: [] },
}

export function getTemplate(type: ActivityType): ActivityTemplate {
  return ACTIVITY_TEMPLATES[type] ?? ACTIVITY_TEMPLATES.otro
}
