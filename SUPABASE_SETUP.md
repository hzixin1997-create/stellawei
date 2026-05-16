# Stellawei Supabase 数据库配置清单

## ⚠️ 必须执行（已部署的功能依赖这些表）

### 1. 创建 reviews 表（评价功能）

**路径**: Supabase Dashboard → SQL Editor → New Query

**执行以下 SQL**:

```sql
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
```

**执行后验证**:
```sql
SELECT * FROM reviews LIMIT 1;
```

---

## ✅ 已存在字段（无需操作，仅确认）

### bookings 表字段检查

**确认以下字段已存在**:

```sql
-- 检查 bookings 表字段
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'bookings' 
AND column_name IN ('duration_minutes', 'scheduled_at');
```

如果返回两行数据，说明字段已存在。
如果缺少字段，执行：

```sql
-- 添加 duration_minutes 字段（如果不存在）
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS duration_minutes INTEGER DEFAULT 25;

-- 添加 scheduled_at 字段（如果不存在）
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMP WITH TIME ZONE;
```

---

## 🔧 可选配置（提升体验）

### messages 表开启 Realtime

**路径**: Supabase Dashboard → Database → Replication

**操作**:
1. 点击 `supabase_realtime` publication
2. 在 Tables 列表中找到 `messages`
3. 勾选 messages 表
4. 点击 Save

**或者用 SQL**:
```sql
-- 检查是否已加入
SELECT * FROM pg_publication_tables WHERE tablename = 'messages';

-- 如果没有，执行：
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
```

> 注意：我们当前用轮询方案（每2秒刷新），Realtime 是备用方案。不开也不影响使用。

---

## 📋 配置完成后检查清单

- [ ] reviews 表创建成功
- [ ] reviews 表的 RLS 策略生效
- [ ] bookings 表有 duration_minutes 字段
- [ ] bookings 表有 scheduled_at 字段
- [ ] （可选）messages 表加入 Realtime

---

## 🚀 部署后功能验证步骤

1. **创建预约** → 支付 → 确认订单有 duration_minutes 值（25 或 50）
2. **进入聊天** → 顶部显示倒计时
3. **发消息** → 2秒后对方自动看到（轮询生效）
4. **手动结束** → 或等倒计时结束自动结束
5. **评价弹窗** → 用户端显示 1-5 星评价
