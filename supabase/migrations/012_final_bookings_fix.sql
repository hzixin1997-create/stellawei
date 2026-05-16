ALTER TABLE bookings 
  ADD COLUMN IF NOT EXISTS expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS stripe_refund_id text,
  ADD COLUMN IF NOT EXISTS refunded_at timestamptz,
  ADD COLUMN IF NOT EXISTS consultation_type text,
  ADD COLUMN IF NOT EXISTS service_category text,
  ADD COLUMN IF NOT EXISTS tier text,
  ADD COLUMN IF NOT EXISTS duration_text text;

-- 2. 补全缺失的 RLS 策略
DROP POLICY IF EXISTS "Users can delete own bookings" ON bookings;
CREATE POLICY "Users can delete own bookings" ON bookings FOR DELETE USING (user_id = auth.uid());

-- 3. 验证
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'bookings' 
ORDER BY ordinal_position;