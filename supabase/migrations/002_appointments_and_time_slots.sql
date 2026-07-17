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
