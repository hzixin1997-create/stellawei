-- 先确认 bookings 表结构
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'bookings';

-- 如果上面的查询报错或没有 id 字段，先检查 bookings 表是否存在
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'bookings';