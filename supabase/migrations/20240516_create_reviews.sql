-- Stellawei 评价表创建 SQL
-- 请在 Supabase SQL Editor 中执行

-- 创建 reviews 表
CREATE TABLE IF NOT EXISTS reviews (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    master_id TEXT NOT NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    content TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引
CREATE INDEX idx_reviews_booking_id ON reviews(booking_id);
CREATE INDEX idx_reviews_master_id ON reviews(master_id);
CREATE INDEX idx_reviews_user_id ON reviews(user_id);

-- 启用 RLS
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- 策略：用户可以查看自己的评价
CREATE POLICY "Users can view own reviews" 
ON reviews FOR SELECT 
USING (auth.uid() = user_id);

-- 策略：管理员可以查看所有评价
CREATE POLICY "Admins can view all reviews" 
ON reviews FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM auth.users 
        WHERE auth.uid() = id 
        AND raw_user_meta_data->>'role' = 'admin'
    )
);

-- 策略：用户可以创建自己的评价
CREATE POLICY "Users can create own reviews" 
ON reviews FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- 策略：用户可以更新自己的评价（24小时内）
CREATE POLICY "Users can update own reviews within 24h" 
ON reviews FOR UPDATE 
USING (
    auth.uid() = user_id 
    AND created_at > NOW() - INTERVAL '24 hours'
);

-- 策略：用户可以删除自己的评价
CREATE POLICY "Users can delete own reviews" 
ON reviews FOR DELETE 
USING (auth.uid() = user_id);

-- 创建触发器：自动更新 updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_reviews_updated_at ON reviews;
CREATE TRIGGER update_reviews_updated_at
    BEFORE UPDATE ON reviews
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
