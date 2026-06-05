
-- 添加改期次数字段
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS reschedule_count INTEGER DEFAULT 0;

-- 为已有订单设置默认值
UPDATE bookings SET reschedule_count = 0 WHERE reschedule_count IS NULL;
