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
  master_id UUID NOT NULL REFERENCES masters(id) ON DELETE CASCADE,
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

CREATE POLICY "Masters can update assigned orders" ON orders
  FOR UPDATE USING (master_id IN (
    SELECT id FROM masters WHERE user_id = auth.uid()
  ));

-- =====================================================
-- 5. 初始化师傅服务数据
-- =====================================================

INSERT INTO master_services (master_id, name, type, price, currency, duration_minutes, response_hours, description, sort_order) VALUES
-- 张易桦
('zhang-yihua', '奇门遁甲咨询（预约制）', 'booking', 800, 'HKD', 30, NULL, '通过奇门遁甲分析时机、机遇和人生事件中的隐藏影响', 1),
('zhang-yihua', '六爻占卜（预约制）', 'booking', 600, 'HKD', 20, NULL, '六爻占卜精确解答具体问题', 2),
('zhang-yihua', '留言咨询', 'message', 300, 'HKD', NULL, 48, '提交您的问题，张师傅将在48小时内通过文字回复', 3),

-- 戊阳
('wu-yang', '八字命盘分析（预约制）', 'booking', 1000, 'HKD', 45, NULL, '深度八字分析，了解人生轨迹和环境能量', 1),
('wu-yang', '风水咨询（预约制）', 'booking', 1500, 'HKD', 60, NULL, '家居/办公室风水调理，改善健康、财运和人际关系', 2),
('wu-yang', '留言咨询', 'message', 400, 'HKD', NULL, 48, '提交您的问题，戊阳师傅将在48小时内通过文字回复', 3),

-- 其他师傅也加上基础留言服务
('master-luna', '塔罗留言咨询', 'message', 200, 'HKD', NULL, 48, '提交您的问题，Luna师傅将在48小时内通过文字回复', 1),
('master-lin', '八字留言咨询', 'message', 350, 'HKD', NULL, 48, '提交您的问题，林师傅将在48小时内通过文字回复', 1),
('master-han', '八字留言咨询', 'message', 250, 'HKD', NULL, 48, '提交您的问题，韩师傅将在48小时内通过文字回复', 1),
('master-elena', '塔罗留言咨询', 'message', 200, 'HKD', NULL, 48, '提交您的问题，Elena师傅将在48小时内通过文字回复', 1)
ON CONFLICT DO NOTHING;

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

CREATE TRIGGER IF NOT EXISTS trg_master_services_updated_at
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
