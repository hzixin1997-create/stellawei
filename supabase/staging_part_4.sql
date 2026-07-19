-- Add order_number to bookings table
-- 2026-05-17

-- 1. 添加 order_number 字段
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS order_number VARCHAR(20) UNIQUE;

-- 2. 为现有数据生成订单号（BK + 年月日 + 4位随机数）
UPDATE bookings
SET order_number = 'BK' || TO_CHAR(created_at, 'YYMMDD') || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0')
WHERE order_number IS NULL;

-- 3. 创建函数：生成订单号
CREATE OR REPLACE FUNCTION generate_booking_order_number()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_order_number VARCHAR(20);
  v_exists BOOLEAN;
BEGIN
  IF NEW.order_number IS NOT NULL THEN
    RETURN NEW;
  END IF;

  LOOP
    v_order_number := 'BK' || TO_CHAR(NOW(), 'YYMMDD') || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
    SELECT EXISTS(SELECT 1 FROM bookings WHERE order_number = v_order_number) INTO v_exists;
    EXIT WHEN NOT v_exists;
  END LOOP;

  NEW.order_number := v_order_number;
  RETURN NEW;
END;
$$;

-- 4. 创建触发器
DROP TRIGGER IF EXISTS trg_bookings_order_number ON bookings;
CREATE TRIGGER trg_bookings_order_number
  BEFORE INSERT ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION generate_booking_order_number();

SELECT 'order_number added to bookings' as status;
-- Add reminder_sent column to bookings table
-- 2026-05-17

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS reminder_sent BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_bookings_reminder_sent ON bookings(reminder_sent);

SELECT 'reminder_sent added to bookings' as status;
-- Fix: 添加 expires_at 字段到 bookings 表（用于支付过期判断）
-- 2026-05-20

-- 检查字段是否已存在
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'bookings' AND column_name = 'expires_at'
    ) THEN
        ALTER TABLE bookings ADD COLUMN expires_at TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- 为已有订单设置默认过期时间（created_at + 10分钟）
UPDATE bookings 
SET expires_at = created_at + INTERVAL '10 minutes'
WHERE expires_at IS NULL 
  AND status = 'pending' 
  AND payment_status = 'pending';

-- 索引
CREATE INDEX IF NOT EXISTS idx_bookings_expires_at ON bookings(expires_at);

SELECT 'expires_at column added' as status;
-- Migration: Add status column to reviews table for admin approval workflow
-- 2026-05-18

ALTER TABLE reviews ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';

-- Update existing reviews to approved (they were submitted before the approval system)
UPDATE reviews SET status = 'approved' WHERE status IS NULL;

-- Add index for filtering
CREATE INDEX IF NOT EXISTS idx_reviews_status ON reviews(status);
CREATE INDEX IF NOT EXISTS idx_reviews_master_status ON reviews(master_id, status);
-- 2026-05-19: 修改 scheduled_at 为 nullable，支持留言咨询
ALTER TABLE bookings ALTER COLUMN scheduled_at DROP NOT NULL;

-- 留言咨询不需要 scheduled_date 和 scheduled_time，也改为 nullable
ALTER TABLE bookings ALTER COLUMN scheduled_date DROP NOT NULL;
ALTER TABLE bookings ALTER COLUMN scheduled_time DROP NOT NULL;
-- 2026-05-19: 添加问题描述字段到 bookings 表，支持留言咨询
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS question_text TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS question_images JSONB DEFAULT '[]'::jsonb;
-- 2026-05-19: messages 表添加 source 字段，区分实时聊天和跟进消息
ALTER TABLE messages ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'chat';

-- 给现有数据打标签（师傅发的消息 = follow_up）
UPDATE messages SET source = 'follow_up' WHERE sender_type = 'master';
UPDATE messages SET source = 'chat' WHERE sender_type = 'user';
-- 2026-05-19: 清空测试订单数据（alpha测试前）
-- 备份文档: https://www.feishu.cn/docx/Xk0vd9x2BoLOEZxPElucWSADnPh

-- 1. 先删关联的 messages
DELETE FROM messages;

-- 2. 再删 bookings
DELETE FROM bookings;

-- 3. 重置序列（如果需要）
-- ALTER SEQUENCE bookings_id_seq RESTART WITH 1;
-- Migration 022: Add master availability table
-- 用于师傅设置自己的可用时段

CREATE TABLE IF NOT EXISTS master_availability (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  master_id UUID NOT NULL REFERENCES masters(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  available_slots TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(master_id, date)
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_master_availability_master_date ON master_availability(master_id, date);

-- RLS策略（通过service role绕过）
ALTER TABLE master_availability ENABLE ROW LEVEL SECURITY;

-- 注释
COMMENT ON TABLE master_availability IS '师傅可用时段设置';
COMMENT ON COLUMN master_availability.available_slots IS '可用时段列表，如 ["09:00", "10:00"]';-- Migration 023: Add cancel_reason to bookings table
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS cancel_reason TEXT;

COMMENT ON COLUMN bookings.cancel_reason IS '师傅或用户取消订单时填写的原因';
-- Migration 024: Add slug field to masters table
ALTER TABLE masters ADD COLUMN IF NOT EXISTS slug VARCHAR(100) UNIQUE;

-- Update existing masters with their slugs
UPDATE masters SET slug = 'master-luna' WHERE display_name = 'Master Luna';
UPDATE masters SET slug = 'zhang-yihua' WHERE display_name = 'Master Zhang Yihua';
UPDATE masters SET slug = 'wu-yang' WHERE display_name = 'Master Wu Yang';
UPDATE masters SET slug = 'master-lin' WHERE display_name = 'Master Lin';
UPDATE masters SET slug = 'master-han' WHERE display_name = 'Master Han';
UPDATE masters SET slug = 'master-elena' WHERE display_name = 'Master Elena';

-- For any remaining masters, generate slug from display_name
UPDATE masters SET slug = LOWER(REPLACE(REPLACE(display_name, ' ', '-'), '''', '')) WHERE slug IS NULL;

-- Add not null constraint after populating
ALTER TABLE masters ALTER COLUMN slug SET NOT NULL;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_masters_slug ON masters(slug);
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
-- 添加语音消息支持
-- 2026-05-23

ALTER TABLE messages
ADD COLUMN IF NOT EXISTS audio_url TEXT,
ADD COLUMN IF NOT EXISTS audio_duration INTEGER; -- 时长（秒）

SELECT 'audio columns added' as status;
