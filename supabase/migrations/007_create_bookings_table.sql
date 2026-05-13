-- Fix: 创建 bookings 表（代码中使用，但 migration 未创建）
-- 2026-05-12

CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  master_id TEXT NOT NULL, -- master slug: 'master-luna' | 'zhang-yihua' | 'wu-yang'
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
