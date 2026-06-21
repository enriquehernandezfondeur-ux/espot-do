export type ActivityType =
  | 'podcast' | 'sesion_foto' | 'taller' | 'reunion'
  | 'casting' | 'cena' | 'cumpleanos' | 'networking' | 'otro'

export type ActivityStatus =
  | 'borrador' | 'publicada' | 'en_curso' | 'finalizada' | 'cancelada'

export type LocationMode = 'booking' | 'space' | 'external'

export type QuestionFieldType = 'text' | 'choice' | 'boolean' | 'number'

export interface ActivityQuestion {
  id: string
  activity_id: string
  label: string
  field_type: QuestionFieldType
  options: string[] | null
  required: boolean
  sort_order: number
}

export type ParticipantStatus = 'invitado' | 'confirmado' | 'rechazado' | 'registrado'

export interface ActivityParticipant {
  id: string
  activity_id: string
  name: string
  contact: string | null
  status: ParticipantStatus
  companions: number
  answers: Record<string, string> | null
  rsvp_token: string
  checked_in_at: string | null
  created_at: string
}

export interface Activity {
  id: string
  organizer_id: string
  type: ActivityType
  title: string
  description: string | null
  status: ActivityStatus
  event_date: string | null      // 'YYYY-MM-DD'
  start_time: string | null      // 'HH:MM'
  end_time: string | null
  expected_people: number | null
  location_mode: LocationMode | null
  booking_id: string | null
  space_id: string | null
  external_location: string | null
  cover_image: string | null
  public_code: string
  public_enabled: boolean
  allow_companions: boolean
  require_checkin: boolean
  created_at: string
  updated_at: string
}

/** Pregunta semilla de plantilla (sin id/activity_id todavía). */
export interface TemplateQuestion {
  label: string
  field_type: QuestionFieldType
  options?: string[]
  required?: boolean
}

export interface ActivityTemplate {
  type: ActivityType
  label: string
  icon: string            // nombre de icono lucide-react
  questions: TemplateQuestion[]
}
