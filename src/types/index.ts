// Types for Chuhai Platform

export interface User {
  id: string
  email: string
  full_name?: string
  avatar_url?: string
  phone?: string
  date_of_birth?: string
  birth_time?: string
  birth_location?: string
  gender?: string
  timezone: string
  locale: string
  stripe_customer_id?: string
  is_master: boolean
  created_at: string
  updated_at: string
}

export interface Master {
  id: string
  user_id: string
  display_name: string
  tagline?: string
  bio?: string
  avatar_url?: string
  video_intro_url?: string
  specialties: string[]
  languages: string[]
  experience_years: number
  certifications: Certification[]
  is_verified: boolean
  verification_status: 'pending' | 'approved' | 'rejected'
  base_price_tier: 'basic' | 'standard' | 'premium'
  rating_average: number
  rating_count: number
  completed_sessions: number
  timezone: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Certification {
  name: string
  issuer: string
  year: number
  image_url?: string
}

export interface Service {
  id: string
  type: 'tarot' | 'astrology' | 'bazi' | 'fengshui'
  name_en: string
  name_zh?: string
  slug: string
  description?: string
  short_description?: string
  price_min: number
  price_max: number
  duration_minutes: number
  features: ServiceFeature[]
  requirements: string[]
  sort_order: number
  is_active: boolean
  image_url?: string
  created_at: string
  updated_at: string
}

export interface ServiceFeature {
  icon: string
  title: string
  description: string
}

export interface ServiceTier {
  id: string
  service_id: string
  tier_name: string
  tier_label?: string
  price: number
  duration_minutes: number
  description?: string
  is_active: boolean
  created_at: string
}

export type OrderStatus = 
  | 'pending'
  | 'paid'
  | 'confirmed'
  | 'ready'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'refunded'
  | 'disputed'

export interface Order {
  id: string
  order_number: string
  user_id: string
  master_id: string
  service_id: string
  tier_id?: string
  scheduled_at: string
  timezone: string
  duration_minutes: number
  status: OrderStatus
  question_text?: string
  question_category?: 'love' | 'career' | 'health' | 'wealth' | 'other'
  user_birth_date?: string
  user_birth_time?: string
  user_birth_location?: string
  subtotal: number
  discount_amount: number
  total_amount: number
  currency: string
  payment_intent_id?: string
  payment_method?: string
  paid_at?: string
  daily_room_url?: string
  daily_room_name?: string
  confirmed_at?: string
  started_at?: string
  completed_at?: string
  cancelled_at?: string
  cancel_reason?: string
  is_refundable: boolean
  refund_deadline?: string
  refunded_at?: string
  refund_amount?: number
  refund_reason?: string
  stripe_refund_id?: string
  created_at: string
  updated_at: string
  master?: Master
  service?: Service
}

export interface Review {
  id: string
  order_id: string
  user_id: string
  master_id: string
  overall_rating: number
  accuracy_rating: number
  communication_rating: number
  value_rating: number
  title?: string
  content?: string
  is_anonymous: boolean
  master_reply?: string
  master_reply_at?: string
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
  updated_at: string
  user?: User
}

export interface TarotCard {
  id: number
  name_en: string
  name_zh?: string
  arcana: 'major' | 'minor'
  suit?: 'wands' | 'cups' | 'swords' | 'pentacles'
  number?: number
  keywords: string[]
  meaning_upright?: string
  meaning_reversed?: string
  image_url?: string
}

export interface TarotSpread {
  id: string
  name: string
  name_display?: string
  description?: string
  positions: TarotPosition[]
  num_cards: number
  is_active: boolean
}

export interface TarotPosition {
  position: number
  title: string
  meaning: string
}

export interface Notification {
  id: string
  user_id: string
  type: NotificationType
  channel: 'email' | 'sms' | 'push' | 'in_app'
  title?: string
  content?: string
  action_url?: string
  order_id?: string
  metadata?: Record<string, any>
  is_read: boolean
  read_at?: string
  sent_at?: string
  delivered_at?: string
  created_at: string
}

export type NotificationType =
  | 'order_confirmed'
  | 'payment_received'
  | 'reminder_24h'
  | 'reminder_1h'
  | 'session_starting'
  | 'report_ready'
  | 'refund_processed'
  | 'review_request'
  | 'master_message'

export interface RefundRequest {
  id: string
  order_id: string
  user_id: string
  status: 'requested' | 'auto_approved' | 'manual_review' | 'approved' | 'rejected' | 'processed'
  reason_category?: 'not_satisfied' | 'no_show' | 'technical' | 'other'
  reason_text?: string
  requested_amount: number
  approved_amount?: number
  is_auto_processed: boolean
  processed_by?: string
  requested_at: string
  processed_at?: string
  stripe_refund_id?: string
  internal_notes?: string
  created_at: string
}

// Booking Types
export type BookingStatus = 
  | 'pending'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'refunded'

export type PaymentStatus = 
  | 'pending'
  | 'paid'
  | 'failed'
  | 'cancelled'
  | 'expired'
  | 'refunded'

export interface Booking {
  id: string
  user_id: string
  master_id: string
  service_id: string
  scheduled_at: string
  scheduled_date?: string
  scheduled_time?: string
  timezone: string
  duration_minutes: number
  status: BookingStatus
  payment_status: PaymentStatus
  question_text?: string
  question_category?: 'love' | 'career' | 'health' | 'wealth' | 'other'
  user_birth_date?: string
  user_birth_time?: string
  user_birth_location?: string
  subtotal: number
  discount_amount: number
  total_amount: number
  currency: string
  payment_intent_id?: string
  payment_method?: string
  paid_at?: string
  stripe_customer_id?: string
  stripe_refund_id?: string
  refunded_at?: string
  refund_amount?: number
  refund_reason?: string
  is_first_time: boolean
  notes?: string
  created_at: string
  updated_at: string
  master?: Master
  service?: Service
}

// Payment Types
export type PaymentStatusType = 'pending' | 'completed' | 'failed' | 'refunded'

export interface Payment {
  id: string
  booking_id: string
  user_id: string
  stripe_session_id?: string
  stripe_payment_intent_id?: string
  stripe_charge_id?: string
  amount: number
  currency: string
  status: PaymentStatusType
  payment_method?: string
  metadata?: Record<string, any>
  stripe_refund_id?: string
  refund_amount?: number
  refund_reason?: string
  created_at: string
  updated_at: string
}
