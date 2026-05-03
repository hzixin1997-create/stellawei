// Types for Chuhai Platform v2.0
// 新增：留言制订单、师傅服务定价、简化订单结构

// ==================== 基础类型 ====================

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
  display_nameCn?: string
  tagline?: string
  taglineCn?: string
  bio?: string
  bioCn?: string
  avatar_url?: string
  video_intro_url?: string
  specialties: string[]
  specialtiesCn?: string[]
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

// ==================== 服务类型 ====================

export interface Service {
  id: string
  type: 'tarot' | 'astrology' | 'bazi' | 'fengshui' | 'qimen' | 'liuyao'
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

// ==================== 师傅服务定价（v2.0 新增）====================

export type ServiceOrderType = 'booking' | 'message'

export interface MasterService {
  id: string
  master_id: string
  service_id?: string
  name: string
  type: ServiceOrderType
  price: number
  currency: string
  duration_minutes?: number
  response_hours: number
  description?: string
  is_active: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

// ==================== 订单类型（v2.0 核心）====================

export type OrderStatus = 
  | 'pending'
  | 'paid'
  | 'assigned'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'refunded'

export interface Order {
  id: string
  user_id: string
  master_id: string
  service_id?: string
  type: ServiceOrderType
  service_name: string
  status: OrderStatus
  amount: number
  currency: string
  stripe_payment_intent_id?: string
  
  // 留言制专用
  user_question?: string
  user_question_submitted_at?: string
  master_response?: string
  master_response_at?: string
  response_deadline?: string
  
  // 预约制专用
  scheduled_at?: string
  timezone?: string
  duration_minutes?: number
  
  // 通用
  completed_at?: string
  cancelled_at?: string
  cancel_reason?: string
  master_read: boolean
  master_read_at?: string
  created_at: string
  updated_at: string
  
  // 关联
  master?: Master
  user?: User
}

// 创建订单请求参数
export interface CreateOrderRequest {
  master_id: string
  master_service_id: string
  type: ServiceOrderType
}

// 提交问题请求
export interface SubmitQuestionRequest {
  question: string
  birth_date?: string
  birth_time?: string
  birth_location?: string
}

// 师傅回复请求
export interface SubmitResponseRequest {
  response: string
}

// 更新状态请求
export interface UpdateOrderStatusRequest {
  status: OrderStatus
  notes?: string
}

// ==================== 评价类型 ====================

export type ReviewStatus = 'pending' | 'approved' | 'rejected'

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
  status: ReviewStatus
  created_at: string
  updated_at: string
  user?: User
}

// ==================== 支付类型 ====================

export interface Payment {
  id: string
  order_id: string
  user_id: string
  stripe_session_id?: string
  stripe_payment_intent_id?: string
  stripe_charge_id?: string
  amount: number
  currency: string
  status: 'pending' | 'completed' | 'failed' | 'refunded'
  payment_method?: string
  metadata?: Record<string, any>
  stripe_refund_id?: string
  refund_amount?: number
  refund_reason?: string
  created_at: string
  updated_at: string
}

// ==================== 塔罗牌类型 ====================

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

// ==================== 通知类型 ====================

export type NotificationType =
  | 'order_confirmed'
  | 'payment_received'
  | 'question_submitted'
  | 'master_responded'
  | 'reminder_24h'
  | 'reminder_1h'
  | 'session_starting'
  | 'order_completed'
  | 'refund_processed'
  | 'review_request'

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

// ==================== 退款类型 ====================

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

// ==================== 师傅后台类型 ====================

export interface MasterDashboardStats {
  total_orders: number
  pending_orders: number
  completed_orders: number
  today_orders: number
  unread_questions: number
  average_response_hours?: number
}

export interface MasterOrderFilter {
  status?: OrderStatus | OrderStatus[]
  type?: ServiceOrderType
  date_from?: string
  date_to?: string
  search?: string
}

