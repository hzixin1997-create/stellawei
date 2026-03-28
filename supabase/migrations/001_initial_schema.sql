-- Chuhai Database Schema
-- MVP v1.0

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- 1. 用户相关表
-- =====================================================

-- 用户基础表 (extends supabase.auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) UNIQUE NOT NULL,
  full_name VARCHAR(100),
  avatar_url TEXT,
  phone VARCHAR(20),
  date_of_birth DATE,
  birth_time TIME,
  birth_location VARCHAR(200),
  gender VARCHAR(10),
  timezone VARCHAR(50) DEFAULT 'America/New_York',
  locale VARCHAR(10) DEFAULT 'en',
  stripe_customer_id VARCHAR(100),
  is_master BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 用户设置表
CREATE TABLE user_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  email_notifications BOOLEAN DEFAULT TRUE,
  sms_notifications BOOLEAN DEFAULT FALSE,
  marketing_emails BOOLEAN DEFAULT TRUE,
  theme VARCHAR(20) DEFAULT 'light',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- =====================================================
-- 2. 师傅相关表
-- =====================================================

-- 师傅信息表
CREATE TABLE masters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  display_name VARCHAR(100) NOT NULL,
  tagline VARCHAR(200),
  bio TEXT,
  avatar_url TEXT,
  video_intro_url TEXT,
  specialties VARCHAR[] DEFAULT '{}',
  languages VARCHAR[] DEFAULT '{en}',
  experience_years INTEGER DEFAULT 0,
  certifications JSONB DEFAULT '[]',
  is_verified BOOLEAN DEFAULT FALSE,
  verification_status VARCHAR(20) DEFAULT 'pending',
  base_price_tier VARCHAR(20) DEFAULT 'standard',
  rating_average DECIMAL(2,1) DEFAULT 5.0,
  rating_count INTEGER DEFAULT 0,
  completed_sessions INTEGER DEFAULT 0,
  timezone VARCHAR(50) DEFAULT 'Asia/Hong_Kong',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 师傅排班表
CREATE TABLE master_schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  master_id UUID NOT NULL REFERENCES masters(id) ON DELETE CASCADE,
  day_of_week INTEGER CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_available BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 师傅特定日期排班（覆盖常规排班）
CREATE TABLE master_schedule_exceptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  master_id UUID NOT NULL REFERENCES masters(id) ON DELETE CASCADE,
  exception_date DATE NOT NULL,
  is_available BOOLEAN DEFAULT FALSE,
  start_time TIME,
  end_time TIME,
  reason VARCHAR(200),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 3. 服务产品表
-- =====================================================

CREATE TABLE services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type VARCHAR(30) NOT NULL,
  name_en VARCHAR(100) NOT NULL,
  name_zh VARCHAR(100),
  slug VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  short_description VARCHAR(300),
  price_min DECIMAL(10,2) NOT NULL,
  price_max DECIMAL(10,2) NOT NULL,
  duration_minutes INTEGER NOT NULL,
  features JSONB DEFAULT '[]',
  requirements JSONB DEFAULT '[]',
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 服务价格档位（师傅选择）
CREATE TABLE service_tiers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  tier_name VARCHAR(50) NOT NULL,
  tier_label VARCHAR(100),
  price DECIMAL(10,2) NOT NULL,
  duration_minutes INTEGER NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 4. 订单表（核心）
-- =====================================================

CREATE TYPE order_status AS ENUM (
  'pending', 'paid', 'confirmed', 'ready', 'in_progress', 'completed', 'cancelled', 'refunded', 'disputed'
);

CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number VARCHAR(20) UNIQUE NOT NULL,
  user_id UUID NOT NULL REFERENCES profiles(id),
  master_id UUID NOT NULL REFERENCES masters(id),
  service_id UUID NOT NULL REFERENCES services(id),
  tier_id UUID REFERENCES service_tiers(id),
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  timezone VARCHAR(50) NOT NULL,
  duration_minutes INTEGER NOT NULL,
  status order_status DEFAULT 'pending',
  question_text TEXT,
  question_category VARCHAR(50),
  user_birth_date DATE,
  user_birth_time TIME,
  user_birth_location VARCHAR(200),
  subtotal DECIMAL(10,2) NOT NULL,
  discount_amount DECIMAL(10,2) DEFAULT 0,
  total_amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  payment_intent_id VARCHAR(100),
  payment_method VARCHAR(50),
  paid_at TIMESTAMP WITH TIME ZONE,
  daily_room_url TEXT,
  daily_room_name VARCHAR(100),
  confirmed_at TIMESTAMP WITH TIME ZONE,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  cancelled_at TIMESTAMP WITH TIME ZONE,
  cancel_reason TEXT,
  is_refundable BOOLEAN DEFAULT TRUE,
  refund_deadline TIMESTAMP WITH TIME ZONE,
  refunded_at TIMESTAMP WITH TIME ZONE,
  refund_amount DECIMAL(10,2),
  refund_reason TEXT,
  stripe_refund_id VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 订单状态历史
CREATE TABLE order_status_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status order_status NOT NULL,
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 5. 评价表
-- =====================================================

CREATE TYPE review_status AS ENUM ('pending', 'approved', 'rejected');

CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id),
  master_id UUID NOT NULL REFERENCES masters(id),
  overall_rating INTEGER CHECK (overall_rating BETWEEN 1 AND 5),
  accuracy_rating INTEGER CHECK (accuracy_rating BETWEEN 1 AND 5),
  communication_rating INTEGER CHECK (communication_rating BETWEEN 1 AND 5),
  value_rating INTEGER CHECK (value_rating BETWEEN 1 AND 5),
  title VARCHAR(200),
  content TEXT,
  is_anonymous BOOLEAN DEFAULT FALSE,
  master_reply TEXT,
  master_reply_at TIMESTAMP WITH TIME ZONE,
  status review_status DEFAULT 'approved',
  moderated_by UUID REFERENCES profiles(id),
  moderated_at TIMESTAMP WITH TIME ZONE,
  moderation_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(order_id)
);

-- =====================================================
-- 6. 退款申请记录表
-- =====================================================

CREATE TYPE refund_request_status AS ENUM (
  'requested', 'auto_approved', 'manual_review', 'approved', 'rejected', 'processed'
);

CREATE TABLE refund_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id),
  user_id UUID NOT NULL REFERENCES profiles(id),
  status refund_request_status DEFAULT 'requested',
  reason_category VARCHAR(50),
  reason_text TEXT,
  requested_amount DECIMAL(10,2) NOT NULL,
  approved_amount DECIMAL(10,2),
  is_auto_processed BOOLEAN DEFAULT FALSE,
  processed_by UUID REFERENCES profiles(id),
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE,
  stripe_refund_id VARCHAR(100),
  internal_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 7. 配置表
-- =====================================================

CREATE TABLE app_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key VARCHAR(100) UNIQUE NOT NULL,
  value TEXT,
  value_type VARCHAR(20) DEFAULT 'string',
  description TEXT,
  updated_by UUID REFERENCES profiles(id),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 初始化配置
INSERT INTO app_configs (key, value, value_type, description) VALUES
('refund_window_days', '7', 'number', 'Refund window period in days'),
('auto_refund_max_days', '7', 'number', 'Maximum days for automatic refund'),
('master_commission_rate', '0.70', 'number', 'Master commission rate (70%)'),
('platform_fee_rate', '0.30', 'number', 'Platform fee rate (30%)'),
('min_withdrawal_amount', '100', 'number', 'Minimum withdrawal amount in USD');

-- =====================================================
-- 8. 塔罗牌表 (静态数据)
-- =====================================================

CREATE TABLE tarot_cards (
  id INTEGER PRIMARY KEY,
  name_en VARCHAR(100) NOT NULL,
  name_zh VARCHAR(100),
  arcana VARCHAR(20) NOT NULL,
  suit VARCHAR(20),
  number INTEGER,
  keywords TEXT[],
  meaning_upright TEXT,
  meaning_reversed TEXT,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 索引优化
-- =====================================================

CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_master_id ON orders(master_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_scheduled_at ON orders(scheduled_at);
CREATE INDEX idx_orders_payment_intent ON orders(payment_intent_id);
CREATE INDEX idx_reviews_master_id ON reviews(master_id);
CREATE INDEX idx_reviews_status ON reviews(status);
CREATE INDEX idx_masters_active ON masters(is_active, is_verified);

-- =====================================================
-- RLS 策略
-- =====================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE masters ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Profiles: 用户只能看到自己的profile
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Masters: 公开可读，师傅可更新自己的
CREATE POLICY "Masters are viewable by everyone" ON masters
  FOR SELECT USING (is_active = TRUE);

CREATE POLICY "Masters can update own info" ON masters
  FOR UPDATE USING (user_id = auth.uid());

-- Orders: 用户和师傅只能看到自己的订单
CREATE POLICY "Users can view own orders" ON orders
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Masters can view assigned orders" ON orders
  FOR SELECT USING (master_id IN (
    SELECT id FROM masters WHERE user_id = auth.uid()
  ));

-- Reviews: 已审核的评价公开可读
CREATE POLICY "Reviews are viewable by everyone" ON reviews
  FOR SELECT USING (status = 'approved');
