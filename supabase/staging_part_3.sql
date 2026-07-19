-- Fix: 补充 bookings 表的 DELETE RLS 策略
-- 2026-05-14

-- 添加删除权限（用户只能删除自己的订单）
CREATE POLICY IF NOT EXISTS "Users can delete own bookings" ON bookings
  FOR DELETE USING (user_id = auth.uid());

-- 完成
SELECT 'bookings delete policy added' as status;
-- Migration: Add missing columns to bookings table
-- Date: 2026-05-15

-- Add expires_at column if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'bookings' AND column_name = 'expires_at') THEN
        ALTER TABLE bookings ADD COLUMN expires_at timestamptz;
    END IF;
END $$;

-- Add deleted_at column if not exists (for soft delete)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'bookings' AND column_name = 'deleted_at') THEN
        ALTER TABLE bookings ADD COLUMN deleted_at timestamptz;
    END IF;
END $$;

-- Add stripe_payment_intent_id if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'bookings' AND column_name = 'stripe_payment_intent_id') THEN
        ALTER TABLE bookings ADD COLUMN stripe_payment_intent_id text;
    END IF;
END $$;

-- Add stripe_refund_id if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'bookings' AND column_name = 'stripe_refund_id') THEN
        ALTER TABLE bookings ADD COLUMN stripe_refund_id text;
    END IF;
END $$;

-- Add refunded_at if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'bookings' AND column_name = 'refunded_at') THEN
        ALTER TABLE bookings ADD COLUMN refunded_at timestamptz;
    END IF;
END $$;

-- Update existing rows: set expires_at for pending bookings without it
UPDATE bookings 
SET expires_at = created_at + interval '10 minutes'
WHERE expires_at IS NULL 
  AND (payment_status = 'pending' OR payment_status = 'pending_payment');

-- Update existing rows: mark old pending bookings as expired
UPDATE bookings 
SET status = 'expired',
    payment_status = 'expired'
WHERE (payment_status = 'pending' OR payment_status = 'pending_payment')
  AND (expires_at IS NOT NULL AND expires_at < NOW())
  AND (status != 'cancelled' AND status != 'refunded' AND status != 'paid');

SELECT 'bookings columns migration complete' as status;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS expires_at timestamptz;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS stripe_payment_intent_id text;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS stripe_refund_id text;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS refunded_at timestamptz;

-- 为历史 pending 订单补填 expires_at
UPDATE bookings 
SET expires_at = created_at + interval '10 minutes'
WHERE expires_at IS NULL 
  AND (payment_status = 'pending' OR payment_status = 'pending_payment');

-- 标记已过期订单
UPDATE bookings 
SET status = 'expired', payment_status = 'expired'
WHERE (payment_status = 'pending' OR payment_status = 'pending_payment')
  AND expires_at < NOW()
  AND status NOT IN ('cancelled', 'refunded', 'paid');
-- Fix: 补充 bookings 表的 UPDATE RLS 策略（用于软删除）
-- 2026-05-15

-- 用户只能更新自己的订单（用于软删除、取消等）
CREATE POLICY IF NOT EXISTS "Users can update own bookings" ON bookings
  FOR UPDATE USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 确保删除策略也存在
CREATE POLICY IF NOT EXISTS "Users can delete own bookings" ON bookings
  FOR DELETE USING (user_id = auth.uid());

-- 完成
SELECT 'bookings update/delete policy added' as status;
-- ===== Stellawei Bookings Table - 补充列修复 =====
-- 执行方式：全部复制进 Supabase SQL Editor → 点一次 Run

-- 1. 添加 booking 流程新字段
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS consultation_type text;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS service_category text;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS tier text;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS duration_text text;

-- 2. 验证列是否全部存在
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'bookings' 
ORDER BY ordinal_position;
ALTER TABLE bookings 
  ADD COLUMN IF NOT EXISTS expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS stripe_refund_id text,
  ADD COLUMN IF NOT EXISTS refunded_at timestamptz,
  ADD COLUMN IF NOT EXISTS consultation_type text,
  ADD COLUMN IF NOT EXISTS service_category text,
  ADD COLUMN IF NOT EXISTS tier text,
  ADD COLUMN IF NOT EXISTS duration_text text;

-- 2. 补全缺失的 RLS 策略
DROP POLICY IF EXISTS "Users can delete own bookings" ON bookings;
CREATE POLICY "Users can delete own bookings" ON bookings FOR DELETE USING (user_id = auth.uid());

-- 3. 验证
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'bookings' 
ORDER BY ordinal_position;-- 管理员可以查看所有 bookings
DROP POLICY IF EXISTS "Admin can view all bookings" ON bookings;
CREATE POLICY "Admin can view all bookings" ON bookings
  FOR SELECT USING (
    auth.uid() IN (
      SELECT id FROM auth.users WHERE email = 'hzixin1997@gmail.com'
    )
  );

-- 管理员可以更新所有 bookings
DROP POLICY IF EXISTS "Admin can update all bookings" ON bookings;
CREATE POLICY "Admin can update all bookings" ON bookings
  FOR UPDATE USING (
    auth.uid() IN (
      SELECT id FROM auth.users WHERE email = 'hzixin1997@gmail.com'
    )
  );

-- 验证
SELECT polname, polcmd 
FROM pg_policy 
WHERE polrelid = 'bookings'::regclass;-- messages 表：实时聊天消息
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
-- 这里只做记录
-- Migration 015: Add master status field
-- online = 在线, offline = 离线, rest = 休息中

ALTER TABLE masters ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'online';

-- Update existing masters to online
UPDATE masters SET status = 'online' WHERE status IS NULL;

-- Add check constraint
ALTER TABLE masters DROP CONSTRAINT IF EXISTS masters_status_check;
ALTER TABLE masters ADD CONSTRAINT masters_status_check CHECK (status IN ('online', 'offline', 'rest'));
