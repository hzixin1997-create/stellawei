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
