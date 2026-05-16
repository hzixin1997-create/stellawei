-- ===== Stellawei Bookings Table - 补充列修复 =====
-- 执行方式：全部复制进 Supabase SQL Editor → 点一次 Run

-- 1. 添加 booking 流程新字段
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS consultation_type text;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS service_category text;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS tier text;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS duration_text text;

-- 2. 验证列是否全部存在
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'bookings' 
ORDER BY ordinal_position;
