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
