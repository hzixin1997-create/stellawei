-- messages 表：实时聊天消息
-- 2026-05-16

CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('user', 'master')),
  sender_name TEXT,
  content TEXT,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_messages_booking_id ON messages(booking_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);

-- RLS（简化策略，API 通过 service key 绕过并自行验证权限）
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- 允许 service key 全权限（API 自行鉴权）
CREATE POLICY "Service key has full access" ON messages
  FOR ALL USING (true) WITH CHECK (true);

-- Supabase Data API 权限（2026-10-30 后强制执行）
GRANT SELECT ON public.messages TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;

-- 触发器：自动更新 updated_at（messages 不需要 updated_at 列，但保留函数）
-- 消息是 append-only，不改

SELECT 'messages table created' as status;

-- 创建 chat_images Storage bucket（用于聊天图片）
-- 注意：bucket 需要通过 Supabase Dashboard 或 API 创建，这里只做记录
-- bucket 名称: chat-images
-- 权限: public read, authenticated write
