-- Add order_number to bookings table
-- 2026-05-17

-- 1. 添加 order_number 字段
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS order_number VARCHAR(20) UNIQUE;

-- 2. 为现有数据生成订单号（BK + 年月日 + 4位随机数）
UPDATE bookings
SET order_number = 'BK' || TO_CHAR(created_at, 'YYMMDD') || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0')
WHERE order_number IS NULL;

-- 3. 创建函数：生成订单号
CREATE OR REPLACE FUNCTION generate_booking_order_number()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_order_number VARCHAR(20);
  v_exists BOOLEAN;
BEGIN
  IF NEW.order_number IS NOT NULL THEN
    RETURN NEW;
  END IF;

  LOOP
    v_order_number := 'BK' || TO_CHAR(NOW(), 'YYMMDD') || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
    SELECT EXISTS(SELECT 1 FROM bookings WHERE order_number = v_order_number) INTO v_exists;
    EXIT WHEN NOT v_exists;
  END LOOP;

  NEW.order_number := v_order_number;
  RETURN NEW;
END;
$$;

-- 4. 创建触发器
DROP TRIGGER IF EXISTS trg_bookings_order_number ON bookings;
CREATE TRIGGER trg_bookings_order_number
  BEFORE INSERT ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION generate_booking_order_number();

SELECT 'order_number added to bookings' as status;
