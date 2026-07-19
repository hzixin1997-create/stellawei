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
