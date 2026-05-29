-- Migration 030: 预约提醒系统架构升级
-- 1. 拆分 reminder_sent 为双边独立控制
-- 2. 增加并发锁（防止重复发送）
-- 3. 增加错误日志和重试字段
-- 4. 增加发送时间记录

-- Step 1: 添加新字段（如果不存在）
DO $$ 
BEGIN
  -- 用户提醒发送状态
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'user_reminder_sent') THEN
    ALTER TABLE bookings ADD COLUMN user_reminder_sent boolean DEFAULT false;
  END IF;

  -- 师傅提醒发送状态
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'master_reminder_sent') THEN
    ALTER TABLE bookings ADD COLUMN master_reminder_sent boolean DEFAULT false;
  END IF;

  -- 并发锁（防止重复发送）
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'reminder_processing') THEN
    ALTER TABLE bookings ADD COLUMN reminder_processing boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'reminder_processing_at') THEN
    ALTER TABLE bookings ADD COLUMN reminder_processing_at timestamp with time zone;
  END IF;

  -- 重试计数
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'reminder_retry_count') THEN
    ALTER TABLE bookings ADD COLUMN reminder_retry_count integer DEFAULT 0;
  END IF;

  -- 上次尝试时间
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'last_reminder_attempt_at') THEN
    ALTER TABLE bookings ADD COLUMN last_reminder_attempt_at timestamp with time zone;
  END IF;

  -- 错误信息
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'reminder_error') THEN
    ALTER TABLE bookings ADD COLUMN reminder_error text;
  END IF;

  -- 用户发送时间
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'user_reminder_sent_at') THEN
    ALTER TABLE bookings ADD COLUMN user_reminder_sent_at timestamp with time zone;
  END IF;

  -- 师傅发送时间
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'master_reminder_sent_at') THEN
    ALTER TABLE bookings ADD COLUMN master_reminder_sent_at timestamp with time zone;
  END IF;
END $$;

-- Step 2: 迁移旧数据（如果存在旧的 reminder_sent 字段）
-- 将旧的 reminder_sent 同步到双边字段
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'reminder_sent') THEN
    UPDATE bookings 
    SET user_reminder_sent = reminder_sent,
        master_reminder_sent = reminder_sent
    WHERE reminder_sent = true;
  END IF;
END $$;

-- Step 3: 创建索引（加速 cron 查询）
CREATE INDEX IF NOT EXISTS idx_bookings_user_reminder_sent ON bookings(user_reminder_sent) WHERE user_reminder_sent = false;
CREATE INDEX IF NOT EXISTS idx_bookings_master_reminder_sent ON bookings(master_reminder_sent) WHERE master_reminder_sent = false;
CREATE INDEX IF NOT EXISTS idx_bookings_reminder_processing ON bookings(reminder_processing) WHERE reminder_processing = false;
CREATE INDEX IF NOT EXISTS idx_bookings_scheduled_at_reminder ON bookings(scheduled_at) WHERE user_reminder_sent = false OR master_reminder_sent = false;

-- Step 4: 可选：删除旧字段（确认迁移成功后执行）
-- ALTER TABLE bookings DROP COLUMN IF EXISTS reminder_sent;
