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
