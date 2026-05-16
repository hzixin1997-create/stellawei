-- 管理员可以查看所有 bookings
DROP POLICY IF EXISTS "Admin can view all bookings" ON bookings;
CREATE POLICY "Admin can view all bookings" ON bookings
  FOR SELECT USING (
    auth.uid() IN (
      SELECT id FROM auth.users WHERE email = 'hzixin1997@gmail.com'
    )
  );

-- 管理员可以更新所有 bookings
DROP POLICY IF EXISTS "Admin can update all bookings" ON bookings;
CREATE POLICY "Admin can update all bookings" ON bookings
  FOR UPDATE USING (
    auth.uid() IN (
      SELECT id FROM auth.users WHERE email = 'hzixin1997@gmail.com'
    )
  );

-- 验证
SELECT polname, polcmd 
FROM pg_policy 
WHERE polrelid = 'bookings'::regclass;