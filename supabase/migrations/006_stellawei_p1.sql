-- Stellawei P1 — 一期订单+留言系统
-- 2026-05-04
-- 基于现有 orders 表扩展，新增 messages 表

-- =====================================================
-- 1. orders 表扩展（添加一期所需字段）
-- =====================================================

-- 添加一期所需字段（不破坏现有字段）
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS user_email TEXT,
  ADD COLUMN IF NOT EXISTS stripe_session_id TEXT,
  ADD COLUMN IF NOT EXISTS service_type TEXT DEFAULT 'message'; -- 'message' | 'realtime'

-- 确保 master_id 可以存文本标识（现有是 UUID，新增 master_slug 列用于一期）
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS master_slug TEXT; -- 'zhang-yihua' | 'wu-yang'

-- 如果 master_slug 为空，尝试从 masters 表填充
UPDATE orders
SET master_slug = CASE
  WHEN master_id = 'zhang-yihua' THEN 'zhang-yihua'
  WHEN master_id = 'wu-yang' THEN 'wu-yang'
  ELSE master_id::text
END
WHERE master_slug IS NULL;

-- =====================================================
-- 2. messages 表 — 留言系统
-- =====================================================

CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  content TEXT NOT NULL,
  reply TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'replied'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_order_id ON messages(order_id);
CREATE INDEX IF NOT EXISTS idx_messages_user_email ON messages(user_email);
CREATE INDEX IF NOT EXISTS idx_messages_status ON messages(status);

-- RLS
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- 任何人可以查看自己的留言（通过 user_email 匹配，简化一期不严格校验）
CREATE POLICY "Users can view own messages" ON messages
  FOR SELECT USING (true); -- 一期简化，后续加严格校验

-- 师傅可以查看和回复所有留言
CREATE POLICY "Masters can manage messages" ON messages
  FOR ALL USING (true); -- 一期简化，后续加严格校验

-- =====================================================
-- 3. 触发器：自动更新 updated_at
-- =====================================================

CREATE TRIGGER IF NOT EXISTS trg_messages_updated_at
  BEFORE UPDATE ON messages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 4. 完成
-- =====================================================

SELECT 'Migration P1 completed' as status;
