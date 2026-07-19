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
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  content TEXT NOT NULL,
  reply TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'replied'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_order_id ON messages(order_id);
CREATE INDEX IF NOT EXISTS idx_messages_user_email ON messages(user_email);
CREATE INDEX IF NOT EXISTS idx_messages_status ON messages(status);

-- RLS
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- 任何人可以查看自己的留言（通过 user_email 匹配，简化一期不严格校验）
CREATE POLICY "Users can view own messages" ON messages
  FOR SELECT USING (true); -- 一期简化，后续加严格校验

-- 师傅可以查看和回复所有留言
CREATE POLICY "Masters can manage messages" ON messages
  FOR ALL USING (true); -- 一期简化，后续加严格校验

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
