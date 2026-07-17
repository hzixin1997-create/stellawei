-- Chuhai Database Schema - Migration 003
-- Auth 配置和 User Profiles 触发器

-- =====================================================
-- 1. 创建测试用户 (开发环境用)
-- =====================================================

-- 注意: 生产环境不要运行这个
-- 这些用户用于开发测试

-- 创建 auth users 并自动创建 profiles 的函数
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url, timezone, locale, is_master)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url',
    COALESCE(NEW.raw_user_meta_data->>'timezone', 'Asia/Shanghai'),
    COALESCE(NEW.raw_user_meta_data->>'locale', 'zh'),
    COALESCE((NEW.raw_user_meta_data->>'is_master')::boolean, false)
  );
  
  -- 创建用户设置
  INSERT INTO public.user_settings (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- 当 auth.users 有新用户时触发
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- 2. 更新 Profiles RLS 策略 (允许用户注册时插入)
-- =====================================================

-- 允许新用户创建自己的 profile
CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- 允许用户删除自己的 profile
CREATE POLICY "Users can delete own profile" ON profiles
  FOR DELETE USING (auth.uid() = id);

-- =====================================================
-- 3. 创建存储过程: 检查用户是否是师傅
-- =====================================================

CREATE OR REPLACE FUNCTION public.is_master(user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_is_master BOOLEAN;
BEGIN
  SELECT p.is_master INTO v_is_master
  FROM profiles p
  WHERE p.id = user_uuid;
  
  RETURN COALESCE(v_is_master, false);
END;
$$;

-- =====================================================
-- 4. 创建存储过程: 获取当前用户的师傅ID
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_current_user_master_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_master_id UUID;
BEGIN
  SELECT m.id INTO v_master_id
  FROM masters m
  WHERE m.user_id = auth.uid();
  
  RETURN v_master_id;
END;
$$;

-- =====================================================
-- 5. 更新 Orders RLS 策略 (师傅可以查看分配给自己的订单)
-- =====================================================

-- 删除旧的师傅订单策略（如果有）
DROP POLICY IF EXISTS "Masters can view assigned orders" ON orders;

-- 创建新的策略，使用函数检查
CREATE POLICY "Masters can view assigned orders" ON orders
  FOR SELECT USING (
    user_id = auth.uid() OR 
    master_id = public.get_current_user_master_id()
  );

-- 师傅可以更新分配给自己的订单
CREATE POLICY "Masters can update assigned orders" ON orders
  FOR UPDATE USING (
    master_id = public.get_current_user_master_id()
  );

-- =====================================================
-- 6. 更新 Appointments RLS 策略
-- =====================================================

DROP POLICY IF EXISTS "Masters can view assigned appointments" ON appointments;

CREATE POLICY "Masters can view assigned appointments" ON appointments
  FOR SELECT USING (
    user_id = auth.uid() OR 
    master_id = public.get_current_user_master_id()
  );

CREATE POLICY "Masters can update assigned appointments" ON appointments
  FOR UPDATE USING (
    master_id = public.get_current_user_master_id()
  );

-- =====================================================
-- 7. 更新 Reviews RLS 策略
-- =====================================================

-- 用户可以创建自己的评价
CREATE POLICY "Users can create own reviews" ON reviews
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- 用户可以更新自己的评价
CREATE POLICY "Users can update own reviews" ON reviews
  FOR UPDATE USING (user_id = auth.uid());

-- 师傅可以回复评价
CREATE POLICY "Masters can reply to reviews" ON reviews
  FOR UPDATE USING (
    master_id IN (SELECT id FROM masters WHERE user_id = auth.uid())
  );

-- =====================================================
-- 8. Master Time Slots RLS 策略
-- =====================================================

-- 师傅可以管理自己的时间格
CREATE POLICY "Masters can manage own time slots" ON master_time_slots
  FOR ALL USING (
    master_id = public.get_current_user_master_id()
  );

-- =====================================================
-- 9. 创建存储过程: 创建订单 (包含验证)
-- =====================================================

CREATE OR REPLACE FUNCTION public.create_order(
  p_master_id UUID,
  p_service_id UUID,
  p_scheduled_at TIMESTAMP WITH TIME ZONE,
  p_timezone VARCHAR DEFAULT 'Asia/Shanghai',
  p_duration_minutes INTEGER DEFAULT 30,
  p_question_text TEXT DEFAULT NULL,
  p_user_birth_date DATE DEFAULT NULL,
  p_user_birth_time TIME DEFAULT NULL,
  p_user_birth_location VARCHAR DEFAULT NULL,
  p_total_amount DECIMAL DEFAULT 0
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order_id UUID;
  v_order_number VARCHAR(20);
  v_user_id UUID;
BEGIN
  -- 获取当前用户ID
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;
  
  -- 生成订单号: ORD + 年月日 + 随机数
  v_order_number := 'ORD' || TO_CHAR(NOW(), 'YYMMDD') || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
  
  -- 创建订单
  INSERT INTO orders (
    order_number,
    user_id,
    master_id,
    service_id,
    scheduled_at,
    timezone,
    duration_minutes,
    status,
    question_text,
    user_birth_date,
    user_birth_time,
    user_birth_location,
    subtotal,
    total_amount,
    currency,
    is_refundable,
    refund_deadline
  ) VALUES (
    v_order_number,
    v_user_id,
    p_master_id,
    p_service_id,
    p_scheduled_at,
    p_timezone,
    p_duration_minutes,
    'pending',
    p_question_text,
    p_user_birth_date,
    p_user_birth_time,
    p_user_birth_location,
    p_total_amount,
    p_total_amount,
    'USD',
    true,
    p_scheduled_at - INTERVAL '24 hours'
  )
  RETURNING id INTO v_order_id;
  
  -- 创建对应的 appointment
  INSERT INTO appointments (
    order_id,
    master_id,
    user_id,
    scheduled_at,
    timezone,
    duration_minutes,
    status,
    meeting_type
  ) VALUES (
    v_order_id,
    p_master_id,
    v_user_id,
    p_scheduled_at,
    p_timezone,
    p_duration_minutes,
    'scheduled',
    'video'
  );
  
  RETURN v_order_id;
END;
$$;

-- =====================================================
-- 10. 创建存储过程: 支付成功后的处理
-- =====================================================

CREATE OR REPLACE FUNCTION public.confirm_order_payment(
  p_order_id UUID,
  p_payment_intent_id VARCHAR,
  p_payment_method VARCHAR DEFAULT 'credit_card'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- 获取订单的用户ID
  SELECT user_id INTO v_user_id
  FROM orders
  WHERE id = p_order_id;
  
  -- 验证权限
  IF v_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  
  -- 更新订单状态
  UPDATE orders
  SET status = 'paid',
      payment_intent_id = p_payment_intent_id,
      payment_method = p_payment_method,
      paid_at = NOW()
  WHERE id = p_order_id;
  
  -- 更新预约状态
  UPDATE appointments
  SET status = 'confirmed',
      confirmed_at = NOW()
  WHERE order_id = p_order_id;
  
  -- 预订时间格
  UPDATE master_time_slots
  SET is_booked = true,
      order_id = p_order_id,
      is_available = false
  WHERE id = (
    SELECT id FROM master_time_slots
    WHERE order_id IS NULL 
      AND is_booked = false
      AND master_id = (SELECT master_id FROM orders WHERE id = p_order_id)
      AND slot_date = (SELECT scheduled_at::date FROM orders WHERE id = p_order_id)
    LIMIT 1
  );
  
  RETURN true;
END;
$$;
