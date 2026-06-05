-- 添加飞书提醒字段到 bookings 表
-- 2026-06-04

ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS feishu_reminder_sent BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS feishu_reminder_sent_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- 添加索引
CREATE INDEX IF NOT EXISTS idx_bookings_feishu_reminder_sent ON bookings(feishu_reminder_sent);
