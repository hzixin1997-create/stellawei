-- Fix: 补充 bookings 表的 DELETE RLS 策略
-- 2026-05-14

-- 添加删除权限（用户只能删除自己的订单）
CREATE POLICY IF NOT EXISTS "Users can delete own bookings" ON bookings
  FOR DELETE USING (user_id = auth.uid());

-- 完成
SELECT 'bookings delete policy added' as status;
