-- Migration 029: Add review_requested and review_data to bookings table
-- 2026-05-27

-- 新增字段：师傅邀请评价标记 + 评价数据存储
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS review_requested BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS review_data JSONB DEFAULT NULL;

-- 索引：加速按 review_requested 查询
CREATE INDEX IF NOT EXISTS idx_bookings_review_requested ON bookings(review_requested);

-- 完成
SELECT '029_add_review_fields migration completed' as status;
