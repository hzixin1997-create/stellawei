-- 2026-05-19: 添加问题描述字段到 bookings 表，支持留言咨询
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS question_text TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS question_images JSONB DEFAULT '[]'::jsonb;
