-- 添加 typing 状态和已读状态
-- 2026-05-23

-- bookings 表添加 typing 字段
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS user_typing_until TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS master_typing_until TIMESTAMP WITH TIME ZONE;

-- messages 表添加已读时间
ALTER TABLE messages
ADD COLUMN IF NOT EXISTS read_at TIMESTAMP WITH TIME ZONE;

-- 索引
CREATE INDEX IF NOT EXISTS idx_bookings_user_typing ON bookings(id, user_typing_until);
CREATE INDEX IF NOT EXISTS idx_bookings_master_typing ON bookings(id, master_typing_until);
CREATE INDEX IF NOT EXISTS idx_messages_read_at ON messages(booking_id, read_at) WHERE read_at IS NULL;

SELECT 'typing and read_at columns added' as status;
