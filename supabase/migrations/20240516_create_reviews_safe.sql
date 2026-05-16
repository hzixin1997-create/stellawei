-- 安全分步创建 reviews 表
-- 先检查并删除已有表（如果存在但结构不对）
DROP TABLE IF EXISTS reviews CASCADE;

-- 创建 reviews 表
CREATE TABLE reviews (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    booking_id UUID NOT NULL,
    user_id UUID NOT NULL,
    master_id TEXT NOT NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    content TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 添加外键约束（分步添加避免冲突）
ALTER TABLE reviews 
ADD CONSTRAINT fk_reviews_booking 
FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE;

ALTER TABLE reviews 
ADD CONSTRAINT fk_reviews_user 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 索引
CREATE INDEX idx_reviews_booking_id ON reviews(booking_id);
CREATE INDEX idx_reviews_master_id ON reviews(master_id);
CREATE INDEX idx_reviews_user_id ON reviews(user_id);

-- 启用 RLS
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- RLS 策略：用户只能看自己的评价
CREATE POLICY "Users can view own reviews" ON reviews FOR SELECT 
USING (auth.uid() = user_id);

-- RLS 策略：用户只能创建自己的评价
CREATE POLICY "Users can create own reviews" ON reviews FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- RLS 策略：用户只能更新自己的评价（24小时内）
CREATE POLICY "Users can update own reviews within 24h" ON reviews FOR UPDATE 
USING (auth.uid() = user_id AND created_at > NOW() - INTERVAL '24 hours');

-- RLS 策略：用户只能删除自己的评价
CREATE POLICY "Users can delete own reviews" ON reviews FOR DELETE 
USING (auth.uid() = user_id);

-- 触发器函数
CREATE OR REPLACE FUNCTION update_reviews_updated_at()
RETURNS TRIGGER AS $func$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$func$ language plpgsql;

-- 绑定触发器
DROP TRIGGER IF EXISTS update_reviews_updated_at ON reviews;
CREATE TRIGGER update_reviews_updated_at
    BEFORE UPDATE ON reviews
    FOR EACH ROW
    EXECUTE FUNCTION update_reviews_updated_at();

-- 验证：查看表结构
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'reviews';
