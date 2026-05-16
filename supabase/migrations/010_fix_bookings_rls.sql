-- Fix: 补充 bookings 表的 UPDATE RLS 策略（用于软删除）
-- 2026-05-15

-- 用户只能更新自己的订单（用于软删除、取消等）
CREATE POLICY IF NOT EXISTS "Users can update own bookings" ON bookings
  FOR UPDATE USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 确保删除策略也存在
CREATE POLICY IF NOT EXISTS "Users can delete own bookings" ON bookings
  FOR DELETE USING (user_id = auth.uid());

-- 完成
SELECT 'bookings update/delete policy added' as status;
