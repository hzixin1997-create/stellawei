-- Migration: 添加评价相关字段到 bookings 表
-- 用途：支持师傅邀请评价 + 用户提交评价

-- 1. 添加 review_requested 字段（师傅是否已邀请评价）
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS review_requested BOOLEAN DEFAULT FALSE;

-- 2. 添加 review_data 字段（存储评价内容，JSON 格式）
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS review_data JSONB DEFAULT NULL;

-- 3. 添加索引加速查询
CREATE INDEX IF NOT EXISTS idx_bookings_review_requested ON bookings(review_requested);
CREATE INDEX IF NOT EXISTS idx_bookings_review_data ON bookings((review_data IS NOT NULL)) WHERE review_data IS NOT NULL;

-- 4. 添加评论字段（独立的 reviews 表可能已存在，这里在 bookings 做冗余以便快速查询）
-- 注意：如果 reviews 表已存在，优先使用 reviews 表，bookings.review_data 作为缓存/冗余

COMMENT ON COLUMN bookings.review_requested IS '师傅是否已邀请用户评价';
COMMENT ON COLUMN bookings.review_data IS '用户评价数据（JSON: {rating, text, created_at}）';
