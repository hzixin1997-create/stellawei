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
