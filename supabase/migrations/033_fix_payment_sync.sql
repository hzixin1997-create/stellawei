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
