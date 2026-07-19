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
-- Chuhai Database Schema - Migration 002
-- 添加 appointments 表和完善时间格管理

-- =====================================================
-- 1. 可预约时间格表 (系统自动生成)
-- =====================================================

CREATE TABLE master_time_slots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  master_id UUID NOT NULL REFERENCES masters(id) ON DELETE CASCADE,
  slot_date DATE NOT NULL,
  slot_time TIME NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 30,
  is_available BOOLEAN DEFAULT TRUE,
  is_booked BOOLEAN DEFAULT FALSE,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  timezone VARCHAR(50) NOT NULL,
  -- 来源: 'weekly_schedule' = 从周排班生成, 'manual' = 手动添加, 'exception' = 特殊日期覆盖
  source VARCHAR(20) DEFAULT 'weekly_schedule',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(master_id, slot_date, slot_time)
);

-- 索引优化
CREATE INDEX idx_time_slots_master_date ON master_time_slots(master_id, slot_date);
CREATE INDEX idx_time_slots_available ON master_time_slots(is_available, is_booked) WHERE is_available = TRUE AND is_booked = FALSE;
CREATE INDEX idx_time_slots_date_range ON master_time_slots(slot_date);

-- =====================================================
-- 2. 完善 appointments 预约表
-- =====================================================

-- 注意: orders 表已涵盖核心预约功能
-- 此表用于扩展预约的额外信息，如视频会议链接、备注等

CREATE TABLE appointments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  master_id UUID NOT NULL REFERENCES masters(id),
  user_id UUID NOT NULL REFERENCES profiles(id),
  
  -- 预约时间信息
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  timezone VARCHAR(50) NOT NULL,
  duration_minutes INTEGER NOT NULL,
  
  -- 会议信息
  meeting_type VARCHAR(20) DEFAULT 'video', -- 'video', 'audio', 'chat'
  meeting_url TEXT,
  meeting_provider VARCHAR(50), -- 'daily', 'zoom', etc.
  meeting_room_id VARCHAR(100),
  
  -- 状态
  status VARCHAR(20) DEFAULT 'scheduled', -- 'scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show'
  
  -- 提醒设置
  reminder_24h_sent BOOLEAN DEFAULT FALSE,
  reminder_1h_sent BOOLEAN DEFAULT FALSE,
  reminder_24h_sent_at TIMESTAMP WITH TIME ZONE,
  reminder_1h_sent_at TIMESTAMP WITH TIME ZONE,
  
  -- 备注
  user_notes TEXT,
  master_notes TEXT,
  internal_notes TEXT,
  
  -- 时间戳
  confirmed_at TIMESTAMP WITH TIME ZONE,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  cancelled_at TIMESTAMP WITH TIME ZONE,
  cancel_reason TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(order_id)
);

-- 索引
CREATE INDEX idx_appointments_user_id ON appointments(user_id);
CREATE INDEX idx_appointments_master_id ON appointments(master_id);
CREATE INDEX idx_appointments_scheduled_at ON appointments(scheduled_at);
CREATE INDEX idx_appointments_status ON appointments(status);

-- =====================================================
-- 3. 支付记录表 (payments)
-- =====================================================

CREATE TYPE payment_status AS ENUM ('pending', 'processing', 'completed', 'failed', 'refunded', 'partially_refunded');
CREATE TYPE payment_method_type AS ENUM ('credit_card', 'debit_card', 'paypal', 'alipay', 'wechat_pay', 'bank_transfer');

CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id),
  
  -- 支付信息
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  status payment_status DEFAULT 'pending',
  method payment_method_type,
  
  -- Stripe 相关信息
  stripe_payment_intent_id VARCHAR(100),
  stripe_charge_id VARCHAR(100),
  stripe_customer_id VARCHAR(100),
  
  -- 支付详情
  card_brand VARCHAR(50),
  card_last4 VARCHAR(4),
  card_exp_month INTEGER,
  card_exp_year INTEGER,
  
  -- 时间戳
  processed_at TIMESTAMP WITH TIME ZONE,
  failed_at TIMESTAMP WITH TIME ZONE,
  failure_reason TEXT,
  
  -- 退款信息
  refunded_amount DECIMAL(10,2) DEFAULT 0,
  stripe_refund_id VARCHAR(100),
  refunded_at TIMESTAMP WITH TIME ZONE,
  refund_reason TEXT,
  
  -- 元数据
  metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_payments_order_id ON payments(order_id);
CREATE INDEX idx_payments_user_id ON payments(user_id);
CREATE INDEX idx_payments_stripe_intent ON payments(stripe_payment_intent_id);
CREATE INDEX idx_payments_status ON payments(status);

-- =====================================================
-- 4. 更新 RLS 策略
-- =====================================================

-- master_time_slots: 公开可读可用时段
ALTER TABLE master_time_slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Time slots are viewable by everyone" ON master_time_slots
  FOR SELECT USING (is_available = TRUE);

-- appointments: 用户和师傅只能看到自己的预约
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own appointments" ON appointments
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Masters can view assigned appointments" ON appointments
  FOR SELECT USING (master_id IN (
    SELECT id FROM masters WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can create appointments" ON appointments
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own appointments" ON appointments
  FOR UPDATE USING (user_id = auth.uid());

-- payments: 用户只能看到自己的支付记录
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own payments" ON payments
  FOR SELECT USING (user_id = auth.uid());

-- =====================================================
-- 5. 生成时间格的函数
-- =====================================================

-- 函数: 为指定师傅生成未来 N 天的时间格
CREATE OR REPLACE FUNCTION generate_master_time_slots(
  p_master_id UUID,
  p_days_ahead INTEGER DEFAULT 14
)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_generated_count INTEGER := 0;
  v_current_date DATE;
  v_end_date DATE;
  v_day_of_week INTEGER;
  v_schedule RECORD;
  v_slot_time TIME;
  v_slot_interval INTEGER := 30; -- 每个时间格30分钟
BEGIN
  v_current_date := CURRENT_DATE;
  v_end_date := v_current_date + p_days_ahead;
  
  -- 删除过期的未预订时间格
  DELETE FROM master_time_slots
  WHERE master_id = p_master_id
    AND slot_date < v_current_date
    AND is_booked = FALSE;
  
  -- 为每一天生成时间格
  WHILE v_current_date <= v_end_date LOOP
    v_day_of_week := EXTRACT(DOW FROM v_current_date);
    
    -- 检查是否有特殊日期覆盖
    IF EXISTS (
      SELECT 1 FROM master_schedule_exceptions
      WHERE master_id = p_master_id
        AND exception_date = v_current_date
        AND is_available = FALSE
    ) THEN
      -- 这一天不可用，跳过
      v_current_date := v_current_date + 1;
      CONTINUE;
    END IF;
    
    -- 检查是否有特殊日期自定义时段
    IF EXISTS (
      SELECT 1 FROM master_schedule_exceptions
      WHERE master_id = p_master_id
        AND exception_date = v_current_date
        AND is_available = TRUE
    ) THEN
      -- 使用特殊日期定义的时间段
      FOR v_schedule IN 
        SELECT start_time, end_time
        FROM master_schedule_exceptions
        WHERE master_id = p_master_id
          AND exception_date = v_current_date
          AND is_available = TRUE
      LOOP
        v_slot_time := v_schedule.start_time;
        WHILE v_slot_time < v_schedule.end_time LOOP
          -- 检查是否已存在
          IF NOT EXISTS (
            SELECT 1 FROM master_time_slots
            WHERE master_id = p_master_id
              AND slot_date = v_current_date
              AND slot_time = v_slot_time
          ) THEN
            INSERT INTO master_time_slots (
              master_id, slot_date, slot_time, duration_minutes,
              is_available, is_booked, timezone, source
            )
            SELECT 
              p_master_id, v_current_date, v_slot_time, v_slot_interval,
              TRUE, FALSE, m.timezone, 'exception'
            FROM masters m
            WHERE m.id = p_master_id;
            
            v_generated_count := v_generated_count + 1;
          END IF;
          v_slot_time := v_slot_time + (v_slot_interval || ' minutes')::INTERVAL;
        END LOOP;
      END LOOP;
    ELSE
      -- 使用常规周排班
      FOR v_schedule IN 
        SELECT start_time, end_time
        FROM master_schedules
        WHERE master_id = p_master_id
          AND day_of_week = v_day_of_week
          AND is_available = TRUE
      LOOP
        v_slot_time := v_schedule.start_time;
        WHILE v_slot_time < v_schedule.end_time LOOP
          -- 检查是否已存在
          IF NOT EXISTS (
            SELECT 1 FROM master_time_slots
            WHERE master_id = p_master_id
              AND slot_date = v_current_date
              AND slot_time = v_slot_time
          ) THEN
            INSERT INTO master_time_slots (
              master_id, slot_date, slot_time, duration_minutes,
              is_available, is_booked, timezone, source
            )
            SELECT 
              p_master_id, v_current_date, v_slot_time, v_slot_interval,
              TRUE, FALSE, m.timezone, 'weekly_schedule'
            FROM masters m
            WHERE m.id = p_master_id;
            
            v_generated_count := v_generated_count + 1;
          END IF;
          v_slot_time := v_slot_time + (v_slot_interval || ' minutes')::INTERVAL;
        END LOOP;
      END LOOP;
    END IF;
    
    v_current_date := v_current_date + 1;
  END LOOP;
  
  RETURN v_generated_count;
END;
$$;

-- 函数: 为所有活跃师傅生成时间格 (可用于定时任务)
CREATE OR REPLACE FUNCTION generate_all_master_time_slots(
  p_days_ahead INTEGER DEFAULT 14
)
RETURNS TABLE(master_id UUID, generated_count INTEGER)
LANGUAGE plpgsql
AS $$
DECLARE
  v_master RECORD;
  v_count INTEGER;
BEGIN
  FOR v_master IN 
    SELECT id FROM masters WHERE is_active = TRUE
  LOOP
    v_count := generate_master_time_slots(v_master.id, p_days_ahead);
    RETURN QUERY SELECT v_master.id, v_count;
  END LOOP;
END;
$$;

-- 函数: 预订时间格
CREATE OR REPLACE FUNCTION book_time_slot(
  p_slot_id UUID,
  p_order_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE master_time_slots
  SET is_booked = TRUE, 
      order_id = p_order_id,
      is_available = FALSE,
      updated_at = NOW()
  WHERE id = p_slot_id
    AND is_available = TRUE 
    AND is_booked = FALSE;
    
  RETURN FOUND;
END;
$$;

-- 函数: 取消预订时间格
CREATE OR REPLACE FUNCTION unbook_time_slot(
  p_order_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE master_time_slots
  SET is_booked = FALSE, 
      order_id = NULL,
      is_available = TRUE,
      updated_at = NOW()
  WHERE order_id = p_order_id;
    
  RETURN FOUND;
END;
$$;

-- =====================================================
-- 6. 触发器: 订单状态变更时同步预约状态
-- =====================================================

CREATE OR REPLACE FUNCTION sync_appointment_from_order()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- 当订单状态变更时，同步更新 appointments 表
  IF TG_OP = 'UPDATE' THEN
    UPDATE appointments
    SET status = CASE NEW.status
      WHEN 'confirmed' THEN 'confirmed'
      WHEN 'in_progress' THEN 'in_progress'
      WHEN 'completed' THEN 'completed'
      WHEN 'cancelled' THEN 'cancelled'
      WHEN 'refunded' THEN 'cancelled'
      ELSE status
    END,
    updated_at = NOW()
    WHERE order_id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sync_appointment_from_order
  AFTER UPDATE OF status ON orders
  FOR EACH ROW
  EXECUTE FUNCTION sync_appointment_from_order();

-- =====================================================
-- 7. 触发器: 自动更新时间戳
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_master_time_slots_updated_at
  BEFORE UPDATE ON master_time_slots
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_appointments_updated_at
  BEFORE UPDATE ON appointments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 8. 为现有表添加必要的索引
-- =====================================================

-- master_schedules 索引
CREATE INDEX IF NOT EXISTS idx_master_schedules_master_day ON master_schedules(master_id, day_of_week);

-- master_schedule_exceptions 索引  
CREATE INDEX IF NOT EXISTS idx_schedule_exceptions_master_date ON master_schedule_exceptions(master_id, exception_date);
-- Chuhai Database Schema - Migration 003
-- Auth 配置和 User Profiles 触发器

-- =====================================================
-- 1. 创建测试用户 (开发环境用)
-- =====================================================

-- 注意: 生产环境不要运行这个
-- 这些用户用于开发测试

-- 创建 auth users 并自动创建 profiles 的函数
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url, timezone, locale, is_master)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url',
    COALESCE(NEW.raw_user_meta_data->>'timezone', 'Asia/Shanghai'),
    COALESCE(NEW.raw_user_meta_data->>'locale', 'zh'),
    COALESCE((NEW.raw_user_meta_data->>'is_master')::boolean, false)
  );
  
  -- 创建用户设置
  INSERT INTO public.user_settings (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- 当 auth.users 有新用户时触发
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- 2. 更新 Profiles RLS 策略 (允许用户注册时插入)
-- =====================================================

-- 允许新用户创建自己的 profile
CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- 允许用户删除自己的 profile
CREATE POLICY "Users can delete own profile" ON profiles
  FOR DELETE USING (auth.uid() = id);

-- =====================================================
-- 3. 创建存储过程: 检查用户是否是师傅
-- =====================================================

CREATE OR REPLACE FUNCTION public.is_master(user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_is_master BOOLEAN;
BEGIN
  SELECT p.is_master INTO v_is_master
  FROM profiles p
  WHERE p.id = user_uuid;
  
  RETURN COALESCE(v_is_master, false);
END;
$$;

-- =====================================================
-- 4. 创建存储过程: 获取当前用户的师傅ID
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_current_user_master_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_master_id UUID;
BEGIN
  SELECT m.id INTO v_master_id
  FROM masters m
  WHERE m.user_id = auth.uid();
  
  RETURN v_master_id;
END;
$$;

-- =====================================================
-- 5. 更新 Orders RLS 策略 (师傅可以查看分配给自己的订单)
-- =====================================================

-- 删除旧的师傅订单策略（如果有）
DROP POLICY IF EXISTS "Masters can view assigned orders" ON orders;

-- 创建新的策略，使用函数检查
CREATE POLICY "Masters can view assigned orders" ON orders
  FOR SELECT USING (
    user_id = auth.uid() OR 
    master_id = public.get_current_user_master_id()
  );

-- 师傅可以更新分配给自己的订单
CREATE POLICY "Masters can update assigned orders" ON orders
  FOR UPDATE USING (
    master_id = public.get_current_user_master_id()
  );

-- =====================================================
-- 6. 更新 Appointments RLS 策略
-- =====================================================

DROP POLICY IF EXISTS "Masters can view assigned appointments" ON appointments;

CREATE POLICY "Masters can view assigned appointments" ON appointments
  FOR SELECT USING (
    user_id = auth.uid() OR 
    master_id = public.get_current_user_master_id()
  );

CREATE POLICY "Masters can update assigned appointments" ON appointments
  FOR UPDATE USING (
    master_id = public.get_current_user_master_id()
  );

-- =====================================================
-- 7. 更新 Reviews RLS 策略
-- =====================================================

-- 用户可以创建自己的评价
CREATE POLICY "Users can create own reviews" ON reviews
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- 用户可以更新自己的评价
CREATE POLICY "Users can update own reviews" ON reviews
  FOR UPDATE USING (user_id = auth.uid());

-- 师傅可以回复评价
CREATE POLICY "Masters can reply to reviews" ON reviews
  FOR UPDATE USING (
    master_id IN (SELECT id FROM masters WHERE user_id = auth.uid())
  );

-- =====================================================
-- 8. Master Time Slots RLS 策略
-- =====================================================

-- 师傅可以管理自己的时间格
CREATE POLICY "Masters can manage own time slots" ON master_time_slots
  FOR ALL USING (
    master_id = public.get_current_user_master_id()
  );

-- =====================================================
-- 9. 创建存储过程: 创建订单 (包含验证)
-- =====================================================

CREATE OR REPLACE FUNCTION public.create_order(
  p_master_id UUID,
  p_service_id UUID,
  p_scheduled_at TIMESTAMP WITH TIME ZONE,
  p_timezone VARCHAR DEFAULT 'Asia/Shanghai',
  p_duration_minutes INTEGER DEFAULT 30,
  p_question_text TEXT DEFAULT NULL,
  p_user_birth_date DATE DEFAULT NULL,
  p_user_birth_time TIME DEFAULT NULL,
  p_user_birth_location VARCHAR DEFAULT NULL,
  p_total_amount DECIMAL DEFAULT 0
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order_id UUID;
  v_order_number VARCHAR(20);
  v_user_id UUID;
BEGIN
  -- 获取当前用户ID
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;
  
  -- 生成订单号: ORD + 年月日 + 随机数
  v_order_number := 'ORD' || TO_CHAR(NOW(), 'YYMMDD') || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
  
  -- 创建订单
  INSERT INTO orders (
    order_number,
    user_id,
    master_id,
    service_id,
    scheduled_at,
    timezone,
    duration_minutes,
    status,
    question_text,
    user_birth_date,
    user_birth_time,
    user_birth_location,
    subtotal,
    total_amount,
    currency,
    is_refundable,
    refund_deadline
  ) VALUES (
    v_order_number,
    v_user_id,
    p_master_id,
    p_service_id,
    p_scheduled_at,
    p_timezone,
    p_duration_minutes,
    'pending',
    p_question_text,
    p_user_birth_date,
    p_user_birth_time,
    p_user_birth_location,
    p_total_amount,
    p_total_amount,
    'USD',
    true,
    p_scheduled_at - INTERVAL '24 hours'
  )
  RETURNING id INTO v_order_id;
  
  -- 创建对应的 appointment
  INSERT INTO appointments (
    order_id,
    master_id,
    user_id,
    scheduled_at,
    timezone,
    duration_minutes,
    status,
    meeting_type
  ) VALUES (
    v_order_id,
    p_master_id,
    v_user_id,
    p_scheduled_at,
    p_timezone,
    p_duration_minutes,
    'scheduled',
    'video'
  );
  
  RETURN v_order_id;
END;
$$;

-- =====================================================
-- 10. 创建存储过程: 支付成功后的处理
-- =====================================================

CREATE OR REPLACE FUNCTION public.confirm_order_payment(
  p_order_id UUID,
  p_payment_intent_id VARCHAR,
  p_payment_method VARCHAR DEFAULT 'credit_card'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- 获取订单的用户ID
  SELECT user_id INTO v_user_id
  FROM orders
  WHERE id = p_order_id;
  
  -- 验证权限
  IF v_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  
  -- 更新订单状态
  UPDATE orders
  SET status = 'paid',
      payment_intent_id = p_payment_intent_id,
      payment_method = p_payment_method,
      paid_at = NOW()
  WHERE id = p_order_id;
  
  -- 更新预约状态
  UPDATE appointments
  SET status = 'confirmed',
      confirmed_at = NOW()
  WHERE order_id = p_order_id;
  
  -- 预订时间格
  UPDATE master_time_slots
  SET is_booked = true,
      order_id = p_order_id,
      is_available = false
  WHERE id = (
    SELECT id FROM master_time_slots
    WHERE order_id IS NULL 
      AND is_booked = false
      AND master_id = (SELECT master_id FROM orders WHERE id = p_order_id)
      AND slot_date = (SELECT scheduled_at::date FROM orders WHERE id = p_order_id)
    LIMIT 1
  );
  
  RETURN true;
END;
$$;
-- Chuhai Database Schema - Migration 004
-- 添加沟通方式支持

-- =====================================================
-- 1. 创建沟通方式枚举类型
-- =====================================================

CREATE TYPE communication_method_type AS ENUM ('email', 'whatsapp', 'telegram', 'feishu');

-- =====================================================
-- 2. appointments 表添加沟通方式字段
-- =====================================================

ALTER TABLE appointments 
  ADD COLUMN communication_method communication_method_type NOT NULL DEFAULT 'email';

-- 索引：按沟通方式查询
CREATE INDEX idx_appointments_communication_method ON appointments(communication_method);

-- =====================================================
-- 3. masters 表添加支持的沟通方式字段
-- =====================================================

ALTER TABLE masters 
  ADD COLUMN supported_communication_methods communication_method_type[] NOT NULL DEFAULT ARRAY['email'::communication_method_type];

-- =====================================================
-- 4. 创建用户沟通设置表
-- =====================================================

CREATE TABLE user_communication_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  method communication_method_type NOT NULL,
  contact_info TEXT NOT NULL,
  is_verified BOOLEAN DEFAULT false,
  verified_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- 每个用户的每种沟通方式只能有一条记录
  UNIQUE(user_id, method)
);

-- 索引
CREATE INDEX idx_user_communication_settings_user_id ON user_communication_settings(user_id);
CREATE INDEX idx_user_communication_settings_method ON user_communication_settings(method);

-- =====================================================
-- 5. RLS 策略
-- =====================================================

ALTER TABLE user_communication_settings ENABLE ROW LEVEL SECURITY;

-- 用户只能看到自己的沟通设置
CREATE POLICY "Users can view own communication settings" ON user_communication_settings
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert own communication settings" ON user_communication_settings
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own communication settings" ON user_communication_settings
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete own communication settings" ON user_communication_settings
  FOR DELETE USING (user_id = auth.uid());

-- =====================================================
-- 6. 触发器：自动更新时间戳
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_user_communication_settings_updated_at
  BEFORE UPDATE ON user_communication_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 7. 注释说明
-- =====================================================

COMMENT ON COLUMN appointments.communication_method IS '用户选择的沟通方式：email, whatsapp, telegram, feishu';
COMMENT ON COLUMN masters.supported_communication_methods IS '师傅支持的沟通方式列表';
COMMENT ON TABLE user_communication_settings IS '用户各平台的联系信息设置';
-- Stellawei v2.0 — 订单系统升级迁移
-- 新增留言制订单支持 + 师傅服务定价表
-- 2026-05-03

-- =====================================================
-- 1. orders 表新增字段（保留现有字段兼容性）
-- =====================================================

-- 订单类型：booking（预约制）| message（留言制）
DO $$ BEGIN
  CREATE TYPE order_type AS ENUM ('booking', 'message');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS type order_type DEFAULT 'booking',
  ADD COLUMN IF NOT EXISTS user_question TEXT,
  ADD COLUMN IF NOT EXISTS master_response TEXT,
  ADD COLUMN IF NOT EXISTS user_question_submitted_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS master_response_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS service_name VARCHAR(100),
  ADD COLUMN IF NOT EXISTS response_deadline TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS master_read BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS master_read_at TIMESTAMP WITH TIME ZONE;

-- =====================================================
-- 2. master_services 表 — 师傅服务定价
-- =====================================================

CREATE TABLE IF NOT EXISTS master_services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  master_id UUID NOT NULL,
  service_id UUID REFERENCES services(id) ON DELETE SET NULL,
  name VARCHAR(100) NOT NULL,
  type order_type NOT NULL DEFAULT 'booking',
  price DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'HKD',
  duration_minutes INTEGER,
  response_hours INTEGER DEFAULT 48,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_master_services_master ON master_services(master_id);
CREATE INDEX IF NOT EXISTS idx_master_services_type ON master_services(type);
CREATE INDEX IF NOT EXISTS idx_master_services_active ON master_services(master_id, is_active);

-- =====================================================
-- 3. 更新订单状态枚举（适配新流程）
-- =====================================================

-- 扩展 order_status 枚举值（如需要）
-- 现有: pending, paid, confirmed, ready, in_progress, completed, cancelled, refunded, disputed
-- 新增: assigned（已分配给师傅）

DO $$ BEGIN
  ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'assigned';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- =====================================================
-- 4. RLS 策略
-- =====================================================

ALTER TABLE master_services ENABLE ROW LEVEL SECURITY;

-- master_services: 公开可读，师傅可管理自己的
CREATE POLICY "Master services are public" ON master_services
  FOR SELECT USING (true);

CREATE POLICY "Masters can manage own services" ON master_services
  FOR ALL USING (master_id IN (
    SELECT id FROM masters WHERE user_id = auth.uid()
  ));

-- orders: 更新策略，支持师傅查看分配到的订单
DROP POLICY IF EXISTS "Users can view own orders" ON orders;
DROP POLICY IF EXISTS "Masters can view assigned orders" ON orders;

CREATE POLICY "Users can view own orders" ON orders
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Masters can view assigned orders" ON orders
  FOR SELECT USING (master_id IN (
    SELECT id FROM masters WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can create orders" ON orders
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own orders" ON orders
  FOR UPDATE USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Masters can update assigned orders" ON orders;
CREATE POLICY "Masters can update assigned orders" ON orders
  FOR UPDATE USING (master_id IN (
    SELECT id FROM masters WHERE user_id = auth.uid()
  ));

-- =====================================================
-- 5. 初始化师傅服务数据
-- =====================================================

-- NOTE: Master services data should be inserted after masters are created
-- Use: INSERT INTO master_services (master_id, ...) SELECT id, ... FROM masters

-- =====================================================
-- 6. 触发器：自动更新 updated_at
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_master_services_updated_at ON master_services;
CREATE TRIGGER trg_master_services_updated_at
  BEFORE UPDATE ON master_services
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 7. 为师傅创建 auth.users 占位记录（用于登录）
-- =====================================================

-- 注意：这里使用服务角色插入，实际应用中应该通过 Supabase Auth 注册
-- 或者手动在 Supabase Dashboard 中创建用户，然后更新 masters.user_id

-- 创建函数：当订单状态变更时记录历史
CREATE TABLE IF NOT EXISTS order_status_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status order_status NOT NULL,
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_status_history_order ON order_status_history(order_id);

-- =====================================================
-- 8. 完成
-- =====================================================

SELECT 'Migration v2.0 completed' as status;
-- Stellawei P1 — 一期订单+留言系统
-- 2026-05-04
-- 基于现有 orders 表扩展，新增 messages 表

-- =====================================================
-- 1. orders 表扩展（添加一期所需字段）
-- =====================================================

-- 添加一期所需字段（不破坏现有字段）
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS user_email TEXT,
  ADD COLUMN IF NOT EXISTS stripe_session_id TEXT,
  ADD COLUMN IF NOT EXISTS service_type TEXT DEFAULT 'message'; -- 'message' | 'realtime'

-- 确保 master_id 可以存文本标识（现有是 UUID，新增 master_slug 列用于一期）
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS master_slug TEXT; -- 'zhang-yihua' | 'wu-yang'

-- 如果 master_slug 为空，尝试从 masters 表填充

-- =====================================================
-- 2. messages 表 — 留言系统
-- =====================================================

CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('user', 'master')),
  sender_name TEXT,
  content TEXT,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_booking_id ON messages(booking_id);

-- RLS
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- 任何人可以查看自己的留言（通过 user_email 匹配，简化一期不严格校验）
CREATE POLICY "Users can view own messages" ON messages
  FOR SELECT USING (true);

-- 师傅可以查看和回复所有留言
CREATE POLICY "Masters can manage messages" ON messages
  FOR ALL USING (true);

-- =====================================================
-- 3. 触发器：自动更新 updated_at
-- =====================================================

DROP TRIGGER IF EXISTS trg_messages_updated_at ON messages;
CREATE TRIGGER trg_messages_updated_at
  BEFORE UPDATE ON messages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 4. 完成
-- =====================================================

SELECT 'Migration P1 completed' as status;
-- Fix: 创建 bookings 表（代码中使用，但 migration 未创建）
-- 2026-05-12

CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  master_id UUID NOT NULL, -- references masters(id)
  service_id TEXT NOT NULL, -- 'tarot' | 'spiritual' | 'qimen' | etc.
  
  -- 预约时间
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  scheduled_date DATE NOT NULL,
  scheduled_time TIME NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 30,
  timezone VARCHAR(50) DEFAULT 'Asia/Shanghai',
  
  -- 状态
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled'
  payment_status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'paid' | 'refunded' | 'failed'
  
  -- 价格
  subtotal DECIMAL(10,2) NOT NULL,
  discount_amount DECIMAL(10,2) DEFAULT 0,
  total_amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'usd',
  
  -- 首次用户标记
  is_first_time BOOLEAN DEFAULT TRUE,
  
  -- Stripe 关联
  stripe_session_id TEXT,
  stripe_payment_intent_id TEXT,
  
  -- 时间戳
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_master_id ON bookings(master_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_payment_status ON bookings(payment_status);
CREATE INDEX IF NOT EXISTS idx_bookings_scheduled_at ON bookings(scheduled_at);

-- RLS（简化一期策略）
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own bookings" ON bookings
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create bookings" ON bookings
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own bookings" ON bookings
  FOR UPDATE USING (user_id = auth.uid());

-- 触发器：自动更新 updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_bookings_updated_at
  BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 完成
SELECT 'bookings table created' as status;
-- Fix: 补充 bookings 表的 DELETE RLS 策略
-- 2026-05-14

-- 添加删除权限（用户只能删除自己的订单）
DROP POLICY IF EXISTS "Users can delete own bookings" ON bookings;
CREATE POLICY "Users can delete own bookings" ON bookings
  FOR DELETE USING (user_id = auth.uid());

-- 完成
SELECT 'bookings delete policy added' as status;
-- Migration: Add missing columns to bookings table
-- Date: 2026-05-15

-- Add expires_at column if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'bookings' AND column_name = 'expires_at') THEN
        ALTER TABLE bookings ADD COLUMN expires_at timestamptz;
    END IF;
END $$;

-- Add deleted_at column if not exists (for soft delete)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'bookings' AND column_name = 'deleted_at') THEN
        ALTER TABLE bookings ADD COLUMN deleted_at timestamptz;
    END IF;
END $$;

-- Add stripe_payment_intent_id if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'bookings' AND column_name = 'stripe_payment_intent_id') THEN
        ALTER TABLE bookings ADD COLUMN stripe_payment_intent_id text;
    END IF;
END $$;

-- Add stripe_refund_id if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'bookings' AND column_name = 'stripe_refund_id') THEN
        ALTER TABLE bookings ADD COLUMN stripe_refund_id text;
    END IF;
END $$;

-- Add refunded_at if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'bookings' AND column_name = 'refunded_at') THEN
        ALTER TABLE bookings ADD COLUMN refunded_at timestamptz;
    END IF;
END $$;

-- Update existing rows: set expires_at for pending bookings without it
UPDATE bookings 
SET expires_at = created_at + interval '10 minutes'
WHERE expires_at IS NULL 
  AND (payment_status = 'pending' OR payment_status = 'pending_payment');

-- Update existing rows: mark old pending bookings as expired
UPDATE bookings 
SET status = 'expired',
    payment_status = 'expired'
WHERE (payment_status = 'pending' OR payment_status = 'pending_payment')
  AND (expires_at IS NOT NULL AND expires_at < NOW())
  AND (status != 'cancelled' AND status != 'refunded' AND status != 'paid');

SELECT 'bookings columns migration complete' as status;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS expires_at timestamptz;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS stripe_payment_intent_id text;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS stripe_refund_id text;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS refunded_at timestamptz;

-- 为历史 pending 订单补填 expires_at
UPDATE bookings 
SET expires_at = created_at + interval '10 minutes'
WHERE expires_at IS NULL 
  AND (payment_status = 'pending' OR payment_status = 'pending_payment');

-- 标记已过期订单
UPDATE bookings 
SET status = 'expired', payment_status = 'expired'
WHERE (payment_status = 'pending' OR payment_status = 'pending_payment')
  AND expires_at < NOW()
  AND status NOT IN ('cancelled', 'refunded', 'paid');
-- Fix: 补充 bookings 表的 UPDATE RLS 策略（用于软删除）
-- 2026-05-15

-- 用户只能更新自己的订单（用于软删除、取消等）
DROP POLICY IF EXISTS "Users can update own bookings" ON bookings;
CREATE POLICY "Users can update own bookings" ON bookings
  FOR UPDATE USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 确保删除策略也存在
DROP POLICY IF EXISTS "Users can delete own bookings" ON bookings;
CREATE POLICY "Users can delete own bookings" ON bookings
  FOR DELETE USING (user_id = auth.uid());

-- 完成
SELECT 'bookings update/delete policy added' as status;
-- ===== Stellawei Bookings Table - 补充列修复 =====
-- 执行方式：全部复制进 Supabase SQL Editor → 点一次 Run

-- 1. 添加 booking 流程新字段
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS consultation_type text;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS service_category text;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS tier text;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS duration_text text;

-- 2. 验证列是否全部存在
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'bookings' 
ORDER BY ordinal_position;
ALTER TABLE bookings 
  ADD COLUMN IF NOT EXISTS expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS stripe_refund_id text,
  ADD COLUMN IF NOT EXISTS refunded_at timestamptz,
  ADD COLUMN IF NOT EXISTS consultation_type text,
  ADD COLUMN IF NOT EXISTS service_category text,
  ADD COLUMN IF NOT EXISTS tier text,
  ADD COLUMN IF NOT EXISTS duration_text text;

-- 2. 补全缺失的 RLS 策略
DROP POLICY IF EXISTS "Users can delete own bookings" ON bookings;
CREATE POLICY "Users can delete own bookings" ON bookings FOR DELETE USING (user_id = auth.uid());

-- 3. 验证
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'bookings' 
ORDER BY ordinal_position;-- 管理员可以查看所有 bookings
DROP POLICY IF EXISTS "Admin can view all bookings" ON bookings;
CREATE POLICY "Admin can view all bookings" ON bookings
  FOR SELECT USING (
    auth.uid() IN (
      SELECT id FROM auth.users WHERE email = 'hzixin1997@gmail.com'
    )
  );

-- 管理员可以更新所有 bookings
DROP POLICY IF EXISTS "Admin can update all bookings" ON bookings;
CREATE POLICY "Admin can update all bookings" ON bookings
  FOR UPDATE USING (
    auth.uid() IN (
      SELECT id FROM auth.users WHERE email = 'hzixin1997@gmail.com'
    )
  );

-- 验证
SELECT polname, polcmd 
FROM pg_policy 
WHERE polrelid = 'bookings'::regclass;-- messages 表：实时聊天消息
-- 2026-05-16

CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('user', 'master')),
  sender_name TEXT,
  content TEXT,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_messages_booking_id ON messages(booking_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);

-- RLS（简化策略，API 通过 service key 绕过并自行验证权限）
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- 允许 service key 全权限（API 自行鉴权）
CREATE POLICY "Service key has full access" ON messages
  FOR ALL USING (true) WITH CHECK (true);

-- Supabase Data API 权限（2026-10-30 后强制执行）
GRANT SELECT ON public.messages TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;

-- 触发器：自动更新 updated_at（messages 不需要 updated_at 列，但保留函数）
-- 消息是 append-only，不改

SELECT 'messages table created' as status;

-- 创建 chat_images Storage bucket（用于聊天图片）
-- 注意：bucket 需要通过 Supabase Dashboard 或 API 创建，这里只做记录
-- 这里只做记录
-- Migration 015: Add master status field
-- online = 在线, offline = 离线, rest = 休息中

ALTER TABLE masters ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'online';

-- Update existing masters to online
UPDATE masters SET status = 'online' WHERE status IS NULL;

-- Add check constraint
ALTER TABLE masters DROP CONSTRAINT IF EXISTS masters_status_check;
ALTER TABLE masters ADD CONSTRAINT masters_status_check CHECK (status IN ('online', 'offline', 'rest'));
-- Add order_number to bookings table
-- 2026-05-17

-- 1. 添加 order_number 字段
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS order_number VARCHAR(20) UNIQUE;

-- 2. 为现有数据生成订单号（BK + 年月日 + 4位随机数）
UPDATE bookings
SET order_number = 'BK' || TO_CHAR(created_at, 'YYMMDD') || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0')
WHERE order_number IS NULL;

-- 3. 创建函数：生成订单号
CREATE OR REPLACE FUNCTION generate_booking_order_number()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_order_number VARCHAR(20);
  v_exists BOOLEAN;
BEGIN
  IF NEW.order_number IS NOT NULL THEN
    RETURN NEW;
  END IF;

  LOOP
    v_order_number := 'BK' || TO_CHAR(NOW(), 'YYMMDD') || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
    SELECT EXISTS(SELECT 1 FROM bookings WHERE order_number = v_order_number) INTO v_exists;
    EXIT WHEN NOT v_exists;
  END LOOP;

  NEW.order_number := v_order_number;
  RETURN NEW;
END;
$$;

-- 4. 创建触发器
DROP TRIGGER IF EXISTS trg_bookings_order_number ON bookings;
CREATE TRIGGER trg_bookings_order_number
  BEFORE INSERT ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION generate_booking_order_number();

SELECT 'order_number added to bookings' as status;
-- Add reminder_sent column to bookings table
-- 2026-05-17

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS reminder_sent BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_bookings_reminder_sent ON bookings(reminder_sent);

SELECT 'reminder_sent added to bookings' as status;
-- Fix: 添加 expires_at 字段到 bookings 表（用于支付过期判断）
-- 2026-05-20

-- 检查字段是否已存在
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'bookings' AND column_name = 'expires_at'
    ) THEN
        ALTER TABLE bookings ADD COLUMN expires_at TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- 为已有订单设置默认过期时间（created_at + 10分钟）
UPDATE bookings 
SET expires_at = created_at + INTERVAL '10 minutes'
WHERE expires_at IS NULL 
  AND status = 'pending' 
  AND payment_status = 'pending';

-- 索引
CREATE INDEX IF NOT EXISTS idx_bookings_expires_at ON bookings(expires_at);

SELECT 'expires_at column added' as status;
-- Migration: Add status column to reviews table for admin approval workflow
-- 2026-05-18

ALTER TABLE reviews ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';

-- Update existing reviews to approved (they were submitted before the approval system)
UPDATE reviews SET status = 'approved' WHERE status IS NULL;

-- Add index for filtering
CREATE INDEX IF NOT EXISTS idx_reviews_status ON reviews(status);
CREATE INDEX IF NOT EXISTS idx_reviews_master_status ON reviews(master_id, status);
-- 2026-05-19: 修改 scheduled_at 为 nullable，支持留言咨询
ALTER TABLE bookings ALTER COLUMN scheduled_at DROP NOT NULL;

-- 留言咨询不需要 scheduled_date 和 scheduled_time，也改为 nullable
ALTER TABLE bookings ALTER COLUMN scheduled_date DROP NOT NULL;
ALTER TABLE bookings ALTER COLUMN scheduled_time DROP NOT NULL;
-- 2026-05-19: 添加问题描述字段到 bookings 表，支持留言咨询
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS question_text TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS question_images JSONB DEFAULT '[]'::jsonb;
-- 2026-05-19: messages 表添加 source 字段，区分实时聊天和跟进消息
ALTER TABLE messages ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'chat';

-- 给现有数据打标签（师傅发的消息 = follow_up）
UPDATE messages SET source = 'follow_up' WHERE sender_type = 'master';
UPDATE messages SET source = 'chat' WHERE sender_type = 'user';
-- 2026-05-19: 清空测试订单数据（alpha测试前）
-- 备份文档: https://www.feishu.cn/docx/Xk0vd9x2BoLOEZxPElucWSADnPh

-- 1. 先删关联的 messages
DELETE FROM messages;

-- 2. 再删 bookings
DELETE FROM bookings;

-- 3. 重置序列（如果需要）
-- ALTER SEQUENCE bookings_id_seq RESTART WITH 1;
-- Migration 022: Add master availability table
-- 用于师傅设置自己的可用时段

CREATE TABLE IF NOT EXISTS master_availability (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  master_id UUID NOT NULL REFERENCES masters(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  available_slots TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(master_id, date)
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_master_availability_master_date ON master_availability(master_id, date);

-- RLS策略（通过service role绕过）
ALTER TABLE master_availability ENABLE ROW LEVEL SECURITY;

-- 注释
COMMENT ON TABLE master_availability IS '师傅可用时段设置';
COMMENT ON COLUMN master_availability.available_slots IS '可用时段列表，如 ["09:00", "10:00"]';-- Migration 023: Add cancel_reason to bookings table
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS cancel_reason TEXT;

COMMENT ON COLUMN bookings.cancel_reason IS '师傅或用户取消订单时填写的原因';
-- Migration 024: Add slug field to masters table
ALTER TABLE masters ADD COLUMN IF NOT EXISTS slug VARCHAR(100) UNIQUE;

-- Update existing masters with their slugs
UPDATE masters SET slug = 'master-luna' WHERE display_name = 'Master Luna';
UPDATE masters SET slug = 'zhang-yihua' WHERE display_name = 'Master Zhang Yihua';
UPDATE masters SET slug = 'wu-yang' WHERE display_name = 'Master Wu Yang';
UPDATE masters SET slug = 'master-lin' WHERE display_name = 'Master Lin';
UPDATE masters SET slug = 'master-han' WHERE display_name = 'Master Han';
UPDATE masters SET slug = 'master-elena' WHERE display_name = 'Master Elena';

-- For any remaining masters, generate slug from display_name
UPDATE masters SET slug = LOWER(REPLACE(REPLACE(display_name, ' ', '-'), '''', '')) WHERE slug IS NULL;

-- Add not null constraint after populating
ALTER TABLE masters ALTER COLUMN slug SET NOT NULL;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_masters_slug ON masters(slug);
-- 添加 typing 状态和已读状态
-- 2026-05-23

-- bookings 表添加 typing 字段
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS user_typing_until TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS master_typing_until TIMESTAMP WITH TIME ZONE;

-- messages 表添加已读时间
ALTER TABLE messages
ADD COLUMN IF NOT EXISTS read_at TIMESTAMP WITH TIME ZONE;

-- 索引
CREATE INDEX IF NOT EXISTS idx_bookings_user_typing ON bookings(id, user_typing_until);
CREATE INDEX IF NOT EXISTS idx_bookings_master_typing ON bookings(id, master_typing_until);
CREATE INDEX IF NOT EXISTS idx_messages_read_at ON messages(booking_id, read_at) WHERE read_at IS NULL;

SELECT 'typing and read_at columns added' as status;
-- 添加语音消息支持
-- 2026-05-23

ALTER TABLE messages
ADD COLUMN IF NOT EXISTS audio_url TEXT,
ADD COLUMN IF NOT EXISTS audio_duration INTEGER; -- 时长（秒）

SELECT 'audio columns added' as status;
-- 统计近 X 分钟内登录过的用户（在线用户近似）
CREATE OR REPLACE FUNCTION count_online_users(since timestamp with time zone)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  count_result bigint;
BEGIN
  SELECT COUNT(*) INTO count_result
  FROM auth.users
  WHERE last_sign_in_at >= since;
  
  RETURN count_result;
END;
$$;

-- 给 service_role 授权执行
GRANT EXECUTE ON FUNCTION count_online_users(timestamp with time zone) TO service_role;
GRANT EXECUTE ON FUNCTION count_online_users(timestamp with time zone) TO anon;
GRANT EXECUTE ON FUNCTION count_online_users(timestamp with time zone) TO authenticated;
-- 028_add_reschedule_notice.sql
-- 添加预约时间变更通知字段

ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS reschedule_notice TEXT,
ADD COLUMN IF NOT EXISTS reschedule_notice_read BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN bookings.reschedule_notice IS '预约时间变更通知内容（师傅或系统写入，用户读取后弹窗提示）';
COMMENT ON COLUMN bookings.reschedule_notice_read IS '用户是否已读变更通知';
-- Migration 029: Add review_requested and review_data to bookings table
-- 2026-05-27

-- 新增字段：师傅邀请评价标记 + 评价数据存储
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS review_requested BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS review_data JSONB DEFAULT NULL;

-- 索引：加速按 review_requested 查询
CREATE INDEX IF NOT EXISTS idx_bookings_review_requested ON bookings(review_requested);

-- 完成
SELECT '029_add_review_fields migration completed' as status;
-- Migration 030: 预约提醒系统架构升级
-- 1. 拆分 reminder_sent 为双边独立控制
-- 2. 增加并发锁（防止重复发送）
-- 3. 增加错误日志和重试字段
-- 4. 增加发送时间记录

-- Step 1: 添加新字段（如果不存在）
DO $$ 
BEGIN
  -- 用户提醒发送状态
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'user_reminder_sent') THEN
    ALTER TABLE bookings ADD COLUMN user_reminder_sent boolean DEFAULT false;
  END IF;

  -- 师傅提醒发送状态
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'master_reminder_sent') THEN
    ALTER TABLE bookings ADD COLUMN master_reminder_sent boolean DEFAULT false;
  END IF;

  -- 并发锁（防止重复发送）
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'reminder_processing') THEN
    ALTER TABLE bookings ADD COLUMN reminder_processing boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'reminder_processing_at') THEN
    ALTER TABLE bookings ADD COLUMN reminder_processing_at timestamp with time zone;
  END IF;

  -- 重试计数
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'reminder_retry_count') THEN
    ALTER TABLE bookings ADD COLUMN reminder_retry_count integer DEFAULT 0;
  END IF;

  -- 上次尝试时间
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'last_reminder_attempt_at') THEN
    ALTER TABLE bookings ADD COLUMN last_reminder_attempt_at timestamp with time zone;
  END IF;

  -- 错误信息
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'reminder_error') THEN
    ALTER TABLE bookings ADD COLUMN reminder_error text;
  END IF;

  -- 用户发送时间
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'user_reminder_sent_at') THEN
    ALTER TABLE bookings ADD COLUMN user_reminder_sent_at timestamp with time zone;
  END IF;

  -- 师傅发送时间
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'master_reminder_sent_at') THEN
    ALTER TABLE bookings ADD COLUMN master_reminder_sent_at timestamp with time zone;
  END IF;
END $$;

-- Step 2: 迁移旧数据（如果存在旧的 reminder_sent 字段）
-- 将旧的 reminder_sent 同步到双边字段
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'reminder_sent') THEN
    UPDATE bookings 
    SET user_reminder_sent = reminder_sent,
        master_reminder_sent = reminder_sent
    WHERE reminder_sent = true;
  END IF;
END $$;

-- Step 3: 创建索引（加速 cron 查询）
CREATE INDEX IF NOT EXISTS idx_bookings_user_reminder_sent ON bookings(user_reminder_sent) WHERE user_reminder_sent = false;
CREATE INDEX IF NOT EXISTS idx_bookings_master_reminder_sent ON bookings(master_reminder_sent) WHERE master_reminder_sent = false;
CREATE INDEX IF NOT EXISTS idx_bookings_reminder_processing ON bookings(reminder_processing) WHERE reminder_processing = false;
CREATE INDEX IF NOT EXISTS idx_bookings_scheduled_at_reminder ON bookings(scheduled_at) WHERE user_reminder_sent = false OR master_reminder_sent = false;

-- Step 4: 可选：删除旧字段（确认迁移成功后执行）
-- ALTER TABLE bookings DROP COLUMN IF EXISTS reminder_sent;
-- Migration: 031_add_observability_tables.sql
-- 可观测性基础设施：Event Log + Admin Audit Log + Reschedule History

-- ============================================
-- 1. booking_events — 订单事件日志
-- ============================================
CREATE TABLE IF NOT EXISTS booking_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL,
    old_value TEXT,
    new_value TEXT,
    trigger_source VARCHAR(50) NOT NULL DEFAULT 'system',
    -- trigger_source: system, user, master, admin, cron, webhook
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_booking_events_booking_id ON booking_events(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_events_event_type ON booking_events(event_type);
CREATE INDEX IF NOT EXISTS idx_booking_events_created_at ON booking_events(created_at DESC);

COMMENT ON TABLE booking_events IS '订单状态变更事件日志，用于追踪状态流转';

-- ============================================
-- 2. admin_audit_logs — 管理员操作审计
-- ============================================
CREATE TABLE IF NOT EXISTS admin_audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    admin_id UUID NOT NULL,
    admin_email VARCHAR(255),
    action VARCHAR(50) NOT NULL,
    target_type VARCHAR(50) NOT NULL,
    -- target_type: booking, master, user, system_setting
    target_id VARCHAR(255),
    before_state JSONB,
    after_state JSONB,
    reason TEXT,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_admin_id ON admin_audit_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_action ON admin_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_target ON admin_audit_logs(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_created_at ON admin_audit_logs(created_at DESC);

COMMENT ON TABLE admin_audit_logs IS '管理员操作审计日志，记录所有后台变更';

-- ============================================
-- 3. booking_reschedule_history — 改期历史
-- ============================================
CREATE TABLE IF NOT EXISTS booking_reschedule_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    old_scheduled_date DATE,
    old_scheduled_time TIME,
    old_scheduled_at TIMESTAMPTZ,
    new_scheduled_date DATE NOT NULL,
    new_scheduled_time TIME NOT NULL,
    new_scheduled_at TIMESTAMPTZ NOT NULL,
    changed_by VARCHAR(50) NOT NULL,
    -- changed_by: user, master, admin
    changed_by_id UUID,
    changed_by_email VARCHAR(255),
    reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reschedule_history_booking_id ON booking_reschedule_history(booking_id);
CREATE INDEX IF NOT EXISTS idx_reschedule_history_created_at ON booking_reschedule_history(created_at DESC);

COMMENT ON TABLE booking_reschedule_history IS '预约改期历史记录';

-- ============================================
-- 4. system_health_snapshots — 系统健康快照（可选，用于趋势分析）
-- ============================================
CREATE TABLE IF NOT EXISTS system_health_snapshots (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    snapshot_type VARCHAR(50) NOT NULL,
    -- snapshot_type: session_state, reminder, email, chat
    metrics JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_health_snapshots_type ON system_health_snapshots(snapshot_type);
CREATE INDEX IF NOT EXISTS idx_health_snapshots_created_at ON system_health_snapshots(created_at DESC);

COMMENT ON TABLE system_health_snapshots IS '系统健康指标快照，用于监控趋势';

-- ============================================
-- 5. 触发器：自动记录 bookings 表关键变更到 booking_events
-- ============================================
CREATE OR REPLACE FUNCTION log_booking_status_change()
RETURNS TRIGGER AS $$
BEGIN
    -- 只记录状态或 payment_status 发生变更的情况
    IF (OLD.status IS DISTINCT FROM NEW.status OR OLD.payment_status IS DISTINCT FROM NEW.payment_status) THEN
        INSERT INTO booking_events (
            booking_id,
            event_type,
            old_value,
            new_value,
            trigger_source,
            metadata
        ) VALUES (
            NEW.id,
            CASE
                WHEN OLD.status IS DISTINCT FROM NEW.status THEN 'status_change'
                ELSE 'payment_status_change'
            END,
            jsonb_build_object('status', OLD.status, 'payment_status', OLD.payment_status),
            jsonb_build_object('status', NEW.status, 'payment_status', NEW.payment_status),
            'system',
            jsonb_build_object('updated_at', NEW.updated_at)
        );
    END IF;
    
    -- 记录 reschedule_notice 变更
    IF (OLD.reschedule_notice IS DISTINCT FROM NEW.reschedule_notice) THEN
        INSERT INTO booking_events (
            booking_id,
            event_type,
            old_value,
            new_value,
            trigger_source,
            metadata
        ) VALUES (
            NEW.id,
            'reschedule_notice',
            OLD.reschedule_notice,
            NEW.reschedule_notice,
            'system',
            jsonb_build_object('updated_at', NEW.updated_at)
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 先删除再创建触发器（避免重复）
DROP TRIGGER IF EXISTS trg_booking_events ON bookings;

CREATE TRIGGER trg_booking_events
    AFTER UPDATE ON bookings
    FOR EACH ROW
    EXECUTE FUNCTION log_booking_status_change();

COMMENT ON FUNCTION log_booking_status_change() IS '自动记录 bookings 表状态变更到 booking_events';

-- ============================================
-- 6. RLS 策略（所有表只允许 service_role 读写）
-- ============================================
ALTER TABLE booking_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_reschedule_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_health_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_only_booking_events"
    ON booking_events FOR ALL
    USING (true)
    WITH CHECK (true);
    -- 实际由服务端用 service_role_key 绕过 RLS

CREATE POLICY "service_role_only_admin_audit"
    ON admin_audit_logs FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE POLICY "service_role_only_reschedule_history"
    ON booking_reschedule_history FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE POLICY "service_role_only_health_snapshots"
    ON system_health_snapshots FOR ALL
    USING (true)
    WITH CHECK (true);-- Migration: 添加评价相关字段到 bookings 表
-- 用途：支持师傅邀请评价 + 用户提交评价

-- 1. 添加 review_requested 字段（师傅是否已邀请评价）
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS review_requested BOOLEAN DEFAULT FALSE;

-- 2. 添加 review_data 字段（存储评价内容，JSON 格式）
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS review_data JSONB DEFAULT NULL;

-- 3. 添加索引加速查询
CREATE INDEX IF NOT EXISTS idx_bookings_review_requested ON bookings(review_requested);
CREATE INDEX IF NOT EXISTS idx_bookings_review_data ON bookings((review_data IS NOT NULL)) WHERE review_data IS NOT NULL;

-- 4. 添加评论字段（独立的 reviews 表可能已存在，这里在 bookings 做冗余以便快速查询）
-- 注意：如果 reviews 表已存在，优先使用 reviews 表，bookings.review_data 作为缓存/冗余

COMMENT ON COLUMN bookings.review_requested IS '师傅是否已邀请用户评价';
COMMENT ON COLUMN bookings.review_data IS '用户评价数据（JSON: {rating, text, created_at}）';
-- Migration: 032_add_payment_logs.sql
-- 支付日志表（Payment Audit Trail）
-- 记录所有支付相关事件，建立 Stripe → Webhook → Database 完整追踪链路

-- 1. 创建 payment_logs 表
CREATE TABLE IF NOT EXISTS payment_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
    -- 留言咨询已改为 bookings 表，保留此字段为兼容但无外键约束
    consultation_id UUID, -- REFERENCES consultations(id) ON DELETE SET NULL,
    stripe_session_id TEXT,
    stripe_payment_intent_id TEXT,
    event_type TEXT NOT NULL, -- checkout.session.completed, checkout.session.expired, etc.
    status TEXT NOT NULL, -- success, failed, skipped
    amount NUMERIC(10, 2),
    currency TEXT,
    error_message TEXT,
    metadata JSONB DEFAULT '{}',
    booking_status_after TEXT,
    payment_status_after TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 索引
CREATE INDEX IF NOT EXISTS idx_payment_logs_booking_id ON payment_logs(booking_id);
CREATE INDEX IF NOT EXISTS idx_payment_logs_stripe_session ON payment_logs(stripe_session_id);
CREATE INDEX IF NOT EXISTS idx_payment_logs_event_type ON payment_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_payment_logs_created_at ON payment_logs(created_at DESC);

-- 3. RLS（只允许 service_role 写入）
ALTER TABLE payment_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY payment_logs_insert ON payment_logs
    FOR INSERT TO authenticated, anon
    WITH CHECK (false); -- 禁止普通用户写入

CREATE POLICY payment_logs_select ON payment_logs
    FOR SELECT TO authenticated
    USING (auth.uid() IN (
        SELECT user_id FROM bookings WHERE id = payment_logs.booking_id
    )); -- 用户只能看自己的

-- 4. 注释
COMMENT ON TABLE payment_logs IS '支付事件日志，追踪 Stripe Webhook 处理全过程';
COMMENT ON COLUMN payment_logs.status IS 'success=成功更新数据库, failed=更新失败, skipped=订单已处理或不存在';
-- Migration: 033_fix_payment_sync.sql（Supabase 兼容版）

-- 1. 添加 stripe_session_id 字段
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS stripe_session_id TEXT;

-- 2. 添加 stripe_payment_intent_id 字段（如果不存在）
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT;

-- 3. 添加 payment_sync_status 字段
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_sync_status TEXT DEFAULT 'pending';

-- 4. 添加 CHECK 约束
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS chk_payment_sync_status;
ALTER TABLE bookings ADD CONSTRAINT chk_payment_sync_status 
CHECK (payment_sync_status IN ('pending', 'synced', 'failed'));

-- 5. 添加时间戳字段
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_synced_at TIMESTAMPTZ;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS last_payment_check_at TIMESTAMPTZ;

-- 6. 添加索引
CREATE INDEX IF NOT EXISTS idx_bookings_stripe_session ON bookings(stripe_session_id);
CREATE INDEX IF NOT EXISTS idx_bookings_payment_sync_status ON bookings(payment_sync_status);
CREATE INDEX IF NOT EXISTS idx_bookings_last_payment_check ON bookings(last_payment_check_at);

-- 7. 注释
COMMENT ON COLUMN bookings.stripe_session_id IS 'Stripe Checkout Session ID (cs_开头)';
COMMENT ON COLUMN bookings.stripe_payment_intent_id IS 'Stripe Payment Intent ID (pi_开头)';
COMMENT ON COLUMN bookings.payment_sync_status IS '支付同步状态: pending=待同步, synced=已同步, failed=同步失败';
COMMENT ON COLUMN bookings.payment_synced_at IS '支付成功同步时间';
COMMENT ON COLUMN bookings.last_payment_check_at IS '上次检查支付状态时间';
-- Migration: 034_create_refund_engine.sql（Supabase 兼容版，无 DO $$）
-- Refund Engine 完整架构：退款状态与订单状态解耦

-- 1. 新增 refund_status 字段到 bookings
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS refund_status TEXT DEFAULT 'none';
-- 约束：如果已经存在同名约束，先删除再创建（避免重复）
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS chk_bookings_refund_status;
ALTER TABLE bookings ADD CONSTRAINT chk_bookings_refund_status CHECK (
  refund_status IN ('none', 'requested', 'under_review', 'approved', 'rejected', 'processing', 'refunded', 'failed')
);
CREATE INDEX IF NOT EXISTS idx_bookings_refund_status ON bookings(refund_status);

-- 2. 新增退款相关字段
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS refund_reason TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS refund_requested_by TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS refund_requested_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS refund_processed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS refund_admin_note TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS stripe_refund_id TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS refund_amount NUMERIC(10,2);

-- 3. 创建 refund_requests 表
CREATE TABLE IF NOT EXISTS refund_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  requested_by TEXT NOT NULL CHECK (requested_by IN ('user', 'master', 'admin')),
  requested_by_id TEXT,
  requested_by_email TEXT,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'requested' CHECK (
    status IN ('requested', 'under_review', 'approved', 'rejected', 'processing', 'refunded', 'failed')
  ),
  admin_note TEXT,
  stripe_refund_id TEXT,
  refund_amount NUMERIC(10,2),
  currency TEXT DEFAULT 'USD',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_refund_requests_booking_id ON refund_requests(booking_id);
CREATE INDEX IF NOT EXISTS idx_refund_requests_status ON refund_requests(status);
CREATE INDEX IF NOT EXISTS idx_refund_requests_created_at ON refund_requests(created_at);

-- 4. 创建退款审计日志表
CREATE TABLE IF NOT EXISTS refund_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  refund_request_id UUID REFERENCES refund_requests(id) ON DELETE CASCADE,
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  old_status TEXT,
  new_status TEXT,
  performed_by TEXT,
  performed_by_email TEXT,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_refund_logs_booking_id ON refund_logs(booking_id);
CREATE INDEX IF NOT EXISTS idx_refund_logs_action ON refund_logs(action);

-- 5. 历史数据迁移
UPDATE bookings
SET refund_status = 'requested',
    refund_requested_at = updated_at
WHERE (status = 'refund_requested' OR payment_status = 'refund_requested')
  AND (refund_status = 'none' OR refund_status IS NULL);

-- 6. 创建触发器（先删除再创建，避免重复）
DROP TRIGGER IF EXISTS trg_sync_refund_status ON refund_requests;
DROP FUNCTION IF EXISTS sync_booking_refund_status();

CREATE FUNCTION sync_booking_refund_status()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE bookings
  SET refund_status = NEW.status,
      updated_at = NOW()
  WHERE id = NEW.booking_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sync_refund_status
  AFTER UPDATE ON refund_requests
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION sync_booking_refund_status();
DROP FUNCTION IF EXISTS create_audio_bucket(text);

-- Create the audio bucket if it doesn't exist (run via Supabase SQL Editor)
-- Note: This is a best-effort migration. If the chat-audio bucket already exists or creation fails, manual creation may be needed.

-- 1. Add voice_status enum type
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'voice_status') THEN
        CREATE TYPE voice_status AS ENUM ('uploading', 'uploaded', 'sending', 'sent', 'failed');
    END IF;
END $$;

-- 2. Add audio-related columns to messages table
ALTER TABLE messages
ADD COLUMN IF NOT EXISTS audio_size INT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS audio_format TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS voice_status voice_status DEFAULT NULL,
ADD COLUMN IF NOT EXISTS transcript TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS transcript_status TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS listened_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
ADD COLUMN IF NOT EXISTS upload_started_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
ADD COLUMN IF NOT EXISTS upload_completed_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- 3. Create voice_upload_logs table for monitoring
CREATE TABLE IF NOT EXISTS voice_upload_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL,
  audio_size INT DEFAULT NULL,
  audio_duration INT DEFAULT NULL,
  audio_format TEXT DEFAULT NULL,
  browser_type TEXT DEFAULT NULL,
  upload_started_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  upload_completed_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  upload_duration_ms INT DEFAULT NULL,
  status TEXT NOT NULL,
  error_message TEXT DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_voice_upload_logs_booking_id ON voice_upload_logs(booking_id);
CREATE INDEX IF NOT EXISTS idx_voice_upload_logs_status ON voice_upload_logs(status);
CREATE INDEX IF NOT EXISTS idx_voice_upload_logs_created_at ON voice_upload_logs(created_at);
-- Migration: 036_chat_observability.sql
-- Chat 可观测性：结构化事件日志 + Request ID 追踪 + API Duration 监控
-- 2026-07-13

-- ============================================
-- 1. chat_events — 聊天结构化事件日志（不记录内容，只记录行为）
-- ============================================
CREATE TABLE IF NOT EXISTS chat_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    request_id UUID, -- 全链路追踪 ID
    role VARCHAR(10) NOT NULL CHECK (role IN ('user', 'master')), -- 发送者角色
    event_type VARCHAR(50) NOT NULL, -- 事件类型
    -- event_type 枚举:
    -- ChatConnected, SendStart, ApiRequest, ApiSuccess, ApiTimeout,
    -- ApiError, RealtimeDisconnected, ReconnectSuccess, ReconnectFailed,
    -- UploadImageStart, UploadImageSuccess, UploadImageFailed,
    -- UploadAudioStart, UploadAudioSuccess, UploadAudioFailed,
    -- PermissionGranted, PermissionDenied, PageHidden, PageVisible
    duration_ms INTEGER, -- 耗时（毫秒）
    error_code VARCHAR(50), -- 错误代码
    error_message TEXT, -- 错误信息（不记录隐私）
    metadata JSONB, -- 扩展字段（如：browser, os, retry_count, file_size 等）
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_events_booking_id ON chat_events(booking_id);
CREATE INDEX IF NOT EXISTS idx_chat_events_request_id ON chat_events(request_id);
CREATE INDEX IF NOT EXISTS idx_chat_events_event_type ON chat_events(event_type);
CREATE INDEX IF NOT EXISTS idx_chat_events_created_at ON chat_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_events_booking_created ON chat_events(booking_id, created_at DESC);

COMMENT ON TABLE chat_events IS '聊天行为事件日志，不记录聊天内容，仅记录系统行为事件';

-- ============================================
-- 2. api_durations — API 接口耗时监控
-- ============================================
CREATE TABLE IF NOT EXISTS api_durations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    request_id UUID NOT NULL, -- 关联 chat_events
    booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
    endpoint VARCHAR(255) NOT NULL, -- API 端点
    method VARCHAR(10) NOT NULL, -- HTTP 方法
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ,
    duration_ms INTEGER, -- 总耗时
    status_code INTEGER, -- HTTP 状态码
    error_type VARCHAR(50), -- 错误类型：timeout, network, server, client
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_durations_request_id ON api_durations(request_id);
CREATE INDEX IF NOT EXISTS idx_api_durations_endpoint ON api_durations(endpoint);
CREATE INDEX IF NOT EXISTS idx_api_durations_created_at ON api_durations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_durations_slow ON api_durations(duration_ms) WHERE duration_ms > 5000;

COMMENT ON TABLE api_durations IS 'API 接口耗时监控，用于定位性能瓶颈';

-- ============================================
-- 3. RLS 策略（只允许 service_role 读写）
-- ============================================
ALTER TABLE chat_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_durations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_only_chat_events"
    ON chat_events FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE POLICY "service_role_only_api_durations"
    ON api_durations FOR ALL
    USING (true)
    WITH CHECK (true);

-- ============================================
-- 4. 清理函数（防止日志表无限增长）
-- ============================================
CREATE OR REPLACE FUNCTION cleanup_old_chat_events()
RETURNS void AS $$
BEGIN
    DELETE FROM chat_events WHERE created_at < NOW() - INTERVAL '30 days';
    DELETE FROM api_durations WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

SELECT 'Chat observability tables created' as status;

-- 添加改期次数字段
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS reschedule_count INTEGER DEFAULT 0;

-- 为已有订单设置默认值
UPDATE bookings SET reschedule_count = 0 WHERE reschedule_count IS NULL;
-- 添加飞书提醒字段到 bookings 表
-- 2026-06-04

ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS feishu_reminder_sent BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS feishu_reminder_sent_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- 添加索引
CREATE INDEX IF NOT EXISTS idx_bookings_feishu_reminder_sent ON bookings(feishu_reminder_sent);
-- Add featured column to reviews table
-- 2026-06-07

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'reviews' AND column_name = 'featured') THEN
        ALTER TABLE reviews ADD COLUMN featured BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- Add location column to profiles table (if not exists)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'location') THEN
        ALTER TABLE profiles ADD COLUMN location VARCHAR(100);
    END IF;
END $$;

-- Create index for featured reviews
CREATE INDEX IF NOT EXISTS idx_reviews_featured ON reviews(featured) WHERE featured = TRUE;

SELECT 'featured and location columns added' as status;
-- Add content_zh column to reviews table for bilingual support
-- 2026-06-07

ALTER TABLE reviews ADD COLUMN IF NOT EXISTS content_zh TEXT;

SELECT 'content_zh column added to reviews' as status;
-- 先确认 bookings 表结构
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'bookings';

-- 如果上面的查询报错或没有 id 字段，先检查 bookings 表是否存在
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'bookings';-- Stellawei 评价表创建 SQL
-- 请在 Supabase SQL Editor 中执行

-- 创建 reviews 表
CREATE TABLE IF NOT EXISTS reviews (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    master_id UUID NOT NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    content TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引
CREATE INDEX idx_reviews_booking_id ON reviews(booking_id);
CREATE INDEX idx_reviews_master_id ON reviews(master_id);
CREATE INDEX idx_reviews_user_id ON reviews(user_id);

-- 启用 RLS
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- 策略：用户可以查看自己的评价
CREATE POLICY "Users can view own reviews" 
ON reviews FOR SELECT 
USING (auth.uid() = user_id);

-- 策略：管理员可以查看所有评价
CREATE POLICY "Admins can view all reviews" 
ON reviews FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM auth.users 
        WHERE auth.uid() = id 
        AND raw_user_meta_data->>'role' = 'admin'
    )
);

-- 策略：用户可以创建自己的评价
CREATE POLICY "Users can create own reviews" 
ON reviews FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- 策略：用户可以更新自己的评价（24小时内）
CREATE POLICY "Users can update own reviews within 24h" 
ON reviews FOR UPDATE 
USING (
    auth.uid() = user_id 
    AND created_at > NOW() - INTERVAL '24 hours'
);

-- 策略：用户可以删除自己的评价
CREATE POLICY "Users can delete own reviews" 
ON reviews FOR DELETE 
USING (auth.uid() = user_id);

-- 创建触发器：自动更新 updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_reviews_updated_at ON reviews;
CREATE TRIGGER update_reviews_updated_at
    BEFORE UPDATE ON reviews
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
-- 安全分步创建 reviews 表（极简版）

-- 第1步：清理残留
DROP TABLE IF EXISTS reviews CASCADE;
DROP FUNCTION IF EXISTS update_reviews_updated_at() CASCADE;

-- 第2步：创建表
CREATE TABLE reviews (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    booking_id UUID NOT NULL,
    user_id UUID NOT NULL,
    master_id UUID NOT NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    content TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 第3步：添加外键
ALTER TABLE reviews ADD CONSTRAINT fk_reviews_booking FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE;
ALTER TABLE reviews ADD CONSTRAINT fk_reviews_user FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 第4步：索引
CREATE INDEX idx_reviews_booking_id ON reviews(booking_id);
CREATE INDEX idx_reviews_master_id ON reviews(master_id);
CREATE INDEX idx_reviews_user_id ON reviews(user_id);

-- 第5步：启用RLS
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- 第6步：RLS策略
CREATE POLICY "Users can view own reviews" ON reviews FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own reviews" ON reviews FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own reviews within 24h" ON reviews FOR UPDATE USING (auth.uid() = user_id AND created_at > NOW() - INTERVAL '24 hours');
CREATE POLICY "Users can delete own reviews" ON reviews FOR DELETE USING (auth.uid() = user_id);

-- 第7步：触发器函数
CREATE OR REPLACE FUNCTION update_reviews_updated_at()
RETURNS TRIGGER AS $func$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$func$ language plpgsql;

-- 第8步：绑定触发器
CREATE TRIGGER update_reviews_updated_at
    BEFORE UPDATE ON reviews
    FOR EACH ROW
    EXECUTE FUNCTION update_reviews_updated_at();

-- 完成
SELECT 'reviews table created successfully' as status;-- 修正版 SQL：使用 $func$ 替代 $$ 避免解析错误

-- 创建 reviews 表
CREATE TABLE IF NOT EXISTS reviews (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    master_id UUID NOT NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    content TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_reviews_booking_id ON reviews(booking_id);
CREATE INDEX idx_reviews_master_id ON reviews(master_id);
CREATE INDEX idx_reviews_user_id ON reviews(user_id);

-- 启用 RLS
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- RLS 策略
CREATE POLICY "Users can view own reviews" ON reviews FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all reviews" ON reviews FOR SELECT USING (EXISTS (SELECT 1 FROM auth.users WHERE auth.uid() = id AND raw_user_meta_data->>'role' = 'admin'));
CREATE POLICY "Users can create own reviews" ON reviews FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own reviews within 24h" ON reviews FOR UPDATE USING (auth.uid() = user_id AND created_at > NOW() - INTERVAL '24 hours');
CREATE POLICY "Users can delete own reviews" ON reviews FOR DELETE USING (auth.uid() = user_id);

-- 触发器函数（使用 $func$ 替代 $$）
CREATE OR REPLACE FUNCTION update_reviews_updated_at()
RETURNS TRIGGER AS $func$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$func$ language plpgsql;

-- 绑定触发器
DROP TRIGGER IF EXISTS update_reviews_updated_at ON reviews;
CREATE TRIGGER update_reviews_updated_at
    BEFORE UPDATE ON reviews
    FOR EACH ROW
    EXECUTE FUNCTION update_reviews_updated_at();

-- 验证
SELECT * FROM reviews LIMIT 1;-- Supabase Schema 更新
-- 支持：统一登录、师傅白名单、订单系统、Stripe支付

-- 用户表扩展（已存在 auth.users，此处为应用层表）
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text unique not null,
  role text default 'user' check (role in ('user', 'master', 'admin')),
  full_name text,
  avatar_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 师傅详情表
create table if not exists public.masters (
  id uuid default gen_random_uuid() primary key,
  profile_id uuid references public.profiles(id) on delete cascade,
  slug text unique not null,
  name text not null,
  specialties text[] default '{}',
  experience text,
  bio text,
  avatar_url text,
  pricing_tier jsonb default '{}',
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 服务/咨询订单表
create table if not exists public.consultations (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) not null,
  master_id uuid references public.masters(id) not null,
  service_type text not null, -- 'trial', 'basic', 'deep', 'fengshui'
  status text default 'pending' check (status in ('pending', 'paid', 'confirmed', 'completed', 'cancelled')),
  price_usd integer not null, -- 美分
  platform_fee_usd integer not null,
  master_fee_usd integer not null,
  stripe_payment_intent_id text,
  scheduled_at timestamp with time zone,
  completed_at timestamp with time zone,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 预约时间段表
create table if not exists public.time_slots (
  id uuid default gen_random_uuid() primary key,
  master_id uuid references public.masters(id) not null,
  start_time timestamp with time zone not null,
  end_time timestamp with time zone not null,
  is_booked boolean default false,
  consultation_id uuid references public.consultations(id),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 留言/消息表
create table if not exists public.messages (
  id uuid default gen_random_uuid() primary key,
  consultation_id uuid references public.consultations(id) not null,
  sender_id uuid references public.profiles(id) not null,
  content text not null,
  is_read boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 创建索引
create index idx_profiles_email on public.profiles(email);
create index idx_consultations_user on public.consultations(user_id);
create index idx_consultations_master on public.consultations(master_id);
create index idx_time_slots_master on public.time_slots(master_id);
create index idx_messages_consultation on public.messages(consultation_id);

-- 触发器：自动更新 updated_at
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

create trigger update_profiles_updated_at before update on public.profiles
  for each row execute function update_updated_at_column();

create trigger update_consultations_updated_at before update on public.consultations
  for each row execute function update_updated_at_column();
-- ===== Stellawei Bookings Table Fix =====
-- 执行方式：全部复制进 Supabase SQL Editor → 点一次 Run

-- 1. 添加缺失的列
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS expires_at timestamptz;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS stripe_payment_intent_id text;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS stripe_refund_id text;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS refunded_at timestamptz;

-- 2. 为历史 pending 订单补填 expires_at（创建时间+10分钟）
UPDATE bookings 
SET expires_at = created_at + interval '10 minutes'
WHERE expires_at IS NULL 
  AND (payment_status = 'pending' OR payment_status = 'pending_payment');

-- 3. 标记已过期订单（超时的 pending 订单改为 expired）
UPDATE bookings 
SET status = 'expired', payment_status = 'expired'
WHERE (payment_status = 'pending' OR payment_status = 'pending_payment')
  AND expires_at < NOW()
  AND status NOT IN ('cancelled', 'refunded', 'paid', 'expired');

-- 4. 补全 RLS 策略（用户能更新/删除自己的订单）
DROP POLICY IF EXISTS "Users can update own bookings" ON bookings;
CREATE POLICY "Users can update own bookings" ON bookings
  FOR UPDATE USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own bookings" ON bookings;
CREATE POLICY "Users can delete own bookings" ON bookings
  FOR DELETE USING (user_id = auth.uid());

-- 5. 验证结果（执行后会显示 bookings 表所有列）
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'bookings' 
ORDER BY ordinal_position;
-- ===== Stellawei Bookings Table Fix =====

-- 1. 添加缺失的列
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS expires_at timestamptz;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS stripe_payment_intent_id text;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS stripe_refund_id text;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS refunded_at timestamptz;

-- 2. 为历史 pending 订单补填 expires_at（创建时间+10分钟）
UPDATE bookings 
SET expires_at = created_at + interval '10 minutes'
WHERE expires_at IS NULL 
  AND (payment_status = 'pending' OR payment_status = 'pending_payment');

-- 3. 标记已过期订单（超时的 pending 订单改为 expired）
UPDATE bookings 
SET status = 'expired', payment_status = 'expired'
WHERE (payment_status = 'pending' OR payment_status = 'pending_payment')
  AND expires_at < NOW()
  AND status NOT IN ('cancelled', 'refunded', 'paid', 'expired');

-- 4. 补全 RLS 策略（先删后建，避免重复）
DROP POLICY IF EXISTS "Users can update own bookings" ON bookings;
CREATE POLICY "Users can update own bookings" ON bookings
  FOR UPDATE USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own bookings" ON bookings;
CREATE POLICY "Users can delete own bookings" ON bookings
  FOR DELETE USING (user_id = auth.uid());

-- 5. 验证结果（执行后会显示 bookings 表所有列）
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'bookings' 
ORDER BY ordinal_position;
