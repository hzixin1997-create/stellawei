-- 安全分步创建 reviews 表（极简版）

-- 第1步：清理残留
DROP TABLE IF EXISTS reviews CASCADE;
DROP FUNCTION IF EXISTS update_reviews_updated_at() CASCADE;

-- 第2步：创建表
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

-- 第3步：添加外键
ALTER TABLE reviews ADD CONSTRAINT fk_reviews_booking FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE;
ALTER TABLE reviews ADD CONSTRAINT fk_reviews_user FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 第4步：索引
CREATE INDEX idx_reviews_booking_id ON reviews(booking_id);
CREATE INDEX idx_reviews_master_id ON reviews(master_id);
CREATE INDEX idx_reviews_user_id ON reviews(user_id);

-- 第5步：启用RLS
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- 第6步：RLS策略
CREATE POLICY "Users can view own reviews" ON reviews FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own reviews" ON reviews FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own reviews within 24h" ON reviews FOR UPDATE USING (auth.uid() = user_id AND created_at > NOW() - INTERVAL '24 hours');
CREATE POLICY "Users can delete own reviews" ON reviews FOR DELETE USING (auth.uid() = user_id);

-- 第7步：触发器函数
CREATE OR REPLACE FUNCTION update_reviews_updated_at()
RETURNS TRIGGER AS $func$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$func$ language plpgsql;

-- 第8步：绑定触发器
CREATE TRIGGER update_reviews_updated_at
    BEFORE UPDATE ON reviews
    FOR EACH ROW
    EXECUTE FUNCTION update_reviews_updated_at();

-- 完成
SELECT 'reviews table created successfully' as status;