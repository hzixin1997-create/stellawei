-- 2026-05-19: 修改 scheduled_at 为 nullable，支持留言咨询
ALTER TABLE bookings ALTER COLUMN scheduled_at DROP NOT NULL;

-- 留言咨询不需要 scheduled_date 和 scheduled_time，也改为 nullable
ALTER TABLE bookings ALTER COLUMN scheduled_date DROP NOT NULL;
ALTER TABLE bookings ALTER COLUMN scheduled_time DROP NOT NULL;
