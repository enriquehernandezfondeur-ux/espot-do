export type PricingType = 'hourly' | 'minimum_consumption' | 'fixed_package' | 'custom_quote'
export type BookingStatus = 'pending' | 'accepted' | 'rejected' | 'confirmed' | 'cancelled_guest' | 'cancelled_host' | 'completed' | 'quote_requested'
export type PaymentStatus = 'unpaid' | 'partial' | 'advance' | 'paid'
export type PaymentTermType = 'platform_guarantee' | 'split_advance' | 'full_prepaid' | 'quote_only'
export type SpaceCategory = 'salon' | 'restaurante' | 'bar' | 'rooftop' | 'estudio' | 'coworking' | 'hotel' | 'terraza' | 'lounge' | 'villa' | 'otro'

export interface Profile {
  id: string
  full_name: string
  email: string
  phone?: string
  whatsapp?: string
  role: 'host' | 'guest' | 'admin'
  avatar_url?: string
  id_verified: boolean
}

export interface Space {
  id: string
  host_id: string
  name: string
  slug: string
  description?: string
  category: SpaceCategory
  capacity_min?: number
  capacity_max: number
  address?: string
  city: string
  sector?: string
  lat?: number
  lng?: number
  is_published: boolean
  is_verified: boolean
  is_active: boolean
  created_at: string
}

export interface SpacePricing {
  id: string
  space_id: string
  pricing_type: PricingType
  hourly_price?: number
  min_hours?: number
  max_hours?: number
  minimum_consumption?: number
  session_hours?: number
  fixed_price?: number
  package_name?: string
  package_description?: string
  package_hours?: number
  package_includes?: string[]
  label?: string
  is_active: boolean
}

export interface SpaceAddon {
  id: string
  space_id: string
  name: string
  description?: string
  price: number
  unit: 'evento' | 'hora' | 'persona'
  category?: string
  is_available: boolean
}

export interface SpaceTimeBlock {
  id: string
  space_id: string
  pricing_id?: string
  block_name: string
  start_time: string
  end_time: string
  days_of_week: number[]
  is_active: boolean
}

export interface SpaceConditions {
  id: string
  space_id: string
  deposit_required: boolean
  deposit_amount?: number
  deposit_percentage?: number
  music_cutoff_time?: string
  noise_curfew?: string
  allows_external_decoration: boolean
  allows_external_food: boolean
  allows_external_alcohol: boolean
  allows_smoking: boolean
  allows_pets: boolean
  cancellation_policy: 'flexible' | 'moderada' | 'estricta'
  cancellation_hours_before: number
  cancellation_refund_pct: number
  custom_rules?: string
}

export interface SpacePaymentTerms {
  id: string
  space_id: string
  term_type: PaymentTermType
  platform_fee_pct: number
  advance_pct?: number
  day_of_event_pct?: number
  venue_pct?: number
  advance_days_before: number
}

export interface Booking {
  id: string
  space_id: string
  guest_id: string
  event_date: string
  start_time: string
  end_time: string
  total_hours?: number
  guest_count: number
  event_type?: string
  event_notes?: string
  base_price: number
  addons_total: number
  platform_fee: number
  total_amount: number
  status: BookingStatus
  payment_status: PaymentStatus
  created_at: string
  // joined
  guest?: Profile
  space?: Space
}

export interface Quote {
  id: string
  space_id: string
  guest_id: string
  event_date?: string
  event_type?: string
  guest_count?: number
  start_time?: string
  end_time?: string
  message: string
  host_response?: string
  quoted_price?: number
  quote_includes?: string[]
  valid_until?: string
  status: 'pending' | 'responded' | 'accepted' | 'declined' | 'expired'
  created_at: string
  guest?: Profile
  space?: Space
}

export interface DashboardStats {
  total_revenue_month: number
  total_revenue_prev_month: number
  bookings_pending: number
  bookings_this_month: number
  occupancy_rate: number
  quotes_pending: number
  next_booking?: Booking
}
