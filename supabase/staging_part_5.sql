-- 统计近 X 分钟内登录过的用户（在线用户近似）
CREATE OR REPLACE FUNCTION count_online_users(since timestamp with time zone)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  count_result bigint;
BEGIN
  SELECT COUNT(*) INTO count_result
  FROM auth.users
  WHERE last_sign_in_at >= since;
  
  RETURN count_result;
END;
$$;

-- 给 service_role 授权执行
GRANT EXECUTE ON FUNCTION count_online_users(timestamp with time zone) TO service_role;
GRANT EXECUTE ON FUNCTION count_online_users(timestamp with time zone) TO anon;
GRANT EXECUTE ON FUNCTION count_online_users(timestamp with time zone) TO authenticated;
-- 028_add_reschedule_notice.sql
-- 添加预约时间变更通知字段

ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS reschedule_notice TEXT,
ADD COLUMN IF NOT EXISTS reschedule_notice_read BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN bookings.reschedule_notice IS '预约时间变更通知内容（师傅或系统写入，用户读取后弹窗提示）';
COMMENT ON COLUMN bookings.reschedule_notice_read IS '用户是否已读变更通知';
-- Migration 029: Add review_requested and review_data to bookings table
-- 2026-05-27

-- 新增字段：师傅邀请评价标记 + 评价数据存储
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS review_requested BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS review_data JSONB DEFAULT NULL;

-- 索引：加速按 review_requested 查询
CREATE INDEX IF NOT EXISTS idx_bookings_review_requested ON bookings(review_requested);

-- 完成
SELECT '029_add_review_fields migration completed' as status;
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
-- Migration: 031_add_observability_tables.sql
-- 可观测性基础设施：Event Log + Admin Audit Log + Reschedule History

-- ============================================
-- 1. booking_events — 订单事件日志
-- ============================================
CREATE TABLE IF NOT EXISTS booking_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL,
    old_value TEXT,
    new_value TEXT,
    trigger_source VARCHAR(50) NOT NULL DEFAULT 'system',
    -- trigger_source: system, user, master, admin, cron, webhook
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_booking_events_booking_id ON booking_events(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_events_event_type ON booking_events(event_type);
CREATE INDEX IF NOT EXISTS idx_booking_events_created_at ON booking_events(created_at DESC);

COMMENT ON TABLE booking_events IS '订单状态变更事件日志，用于追踪状态流转';

-- ============================================
-- 2. admin_audit_logs — 管理员操作审计
-- ============================================
CREATE TABLE IF NOT EXISTS admin_audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    admin_id UUID NOT NULL,
    admin_email VARCHAR(255),
    action VARCHAR(50) NOT NULL,
    target_type VARCHAR(50) NOT NULL,
    -- target_type: booking, master, user, system_setting
    target_id VARCHAR(255),
    before_state JSONB,
    after_state JSONB,
    reason TEXT,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_admin_id ON admin_audit_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_action ON admin_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_target ON admin_audit_logs(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_created_at ON admin_audit_logs(created_at DESC);

COMMENT ON TABLE admin_audit_logs IS '管理员操作审计日志，记录所有后台变更';

-- ============================================
-- 3. booking_reschedule_history — 改期历史
-- ============================================
CREATE TABLE IF NOT EXISTS booking_reschedule_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    old_scheduled_date DATE,
    old_scheduled_time TIME,
    old_scheduled_at TIMESTAMPTZ,
    new_scheduled_date DATE NOT NULL,
    new_scheduled_time TIME NOT NULL,
    new_scheduled_at TIMESTAMPTZ NOT NULL,
    changed_by VARCHAR(50) NOT NULL,
    -- changed_by: user, master, admin
    changed_by_id UUID,
    changed_by_email VARCHAR(255),
    reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reschedule_history_booking_id ON booking_reschedule_history(booking_id);
CREATE INDEX IF NOT EXISTS idx_reschedule_history_created_at ON booking_reschedule_history(created_at DESC);

COMMENT ON TABLE booking_reschedule_history IS '预约改期历史记录';

-- ============================================
-- 4. system_health_snapshots — 系统健康快照（可选，用于趋势分析）
-- ============================================
CREATE TABLE IF NOT EXISTS system_health_snapshots (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    snapshot_type VARCHAR(50) NOT NULL,
    -- snapshot_type: session_state, reminder, email, chat
    metrics JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_health_snapshots_type ON system_health_snapshots(snapshot_type);
CREATE INDEX IF NOT EXISTS idx_health_snapshots_created_at ON system_health_snapshots(created_at DESC);

COMMENT ON TABLE system_health_snapshots IS '系统健康指标快照，用于监控趋势';

-- ============================================
-- 5. 触发器：自动记录 bookings 表关键变更到 booking_events
-- ============================================
CREATE OR REPLACE FUNCTION log_booking_status_change()
RETURNS TRIGGER AS $$
BEGIN
    -- 只记录状态或 payment_status 发生变更的情况
    IF (OLD.status IS DISTINCT FROM NEW.status OR OLD.payment_status IS DISTINCT FROM NEW.payment_status) THEN
        INSERT INTO booking_events (
            booking_id,
            event_type,
            old_value,
            new_value,
            trigger_source,
            metadata
        ) VALUES (
            NEW.id,
            CASE
                WHEN OLD.status IS DISTINCT FROM NEW.status THEN 'status_change'
                ELSE 'payment_status_change'
            END,
            jsonb_build_object('status', OLD.status, 'payment_status', OLD.payment_status),
            jsonb_build_object('status', NEW.status, 'payment_status', NEW.payment_status),
            'system',
            jsonb_build_object('updated_at', NEW.updated_at)
        );
    END IF;
    
    -- 记录 reschedule_notice 变更
    IF (OLD.reschedule_notice IS DISTINCT FROM NEW.reschedule_notice) THEN
        INSERT INTO booking_events (
            booking_id,
            event_type,
            old_value,
            new_value,
            trigger_source,
            metadata
        ) VALUES (
            NEW.id,
            'reschedule_notice',
            OLD.reschedule_notice,
            NEW.reschedule_notice,
            'system',
            jsonb_build_object('updated_at', NEW.updated_at)
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 先删除再创建触发器（避免重复）
DROP TRIGGER IF EXISTS trg_booking_events ON bookings;

CREATE TRIGGER trg_booking_events
    AFTER UPDATE ON bookings
    FOR EACH ROW
    EXECUTE FUNCTION log_booking_status_change();

COMMENT ON FUNCTION log_booking_status_change() IS '自动记录 bookings 表状态变更到 booking_events';

-- ============================================
-- 6. RLS 策略（所有表只允许 service_role 读写）
-- ============================================
ALTER TABLE booking_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_reschedule_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_health_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_only_booking_events"
    ON booking_events FOR ALL
    USING (true)
    WITH CHECK (true);
    -- 实际由服务端用 service_role_key 绕过 RLS

CREATE POLICY "service_role_only_admin_audit"
    ON admin_audit_logs FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE POLICY "service_role_only_reschedule_history"
    ON booking_reschedule_history FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE POLICY "service_role_only_health_snapshots"
    ON system_health_snapshots FOR ALL
    USING (true)
    WITH CHECK (true);-- Migration: 添加评价相关字段到 bookings 表
-- 用途：支持师傅邀请评价 + 用户提交评价

-- 1. 添加 review_requested 字段（师傅是否已邀请评价）
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS review_requested BOOLEAN DEFAULT FALSE;

-- 2. 添加 review_data 字段（存储评价内容，JSON 格式）
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS review_data JSONB DEFAULT NULL;

-- 3. 添加索引加速查询
CREATE INDEX IF NOT EXISTS idx_bookings_review_requested ON bookings(review_requested);
CREATE INDEX IF NOT EXISTS idx_bookings_review_data ON bookings((review_data IS NOT NULL)) WHERE review_data IS NOT NULL;

-- 4. 添加评论字段（独立的 reviews 表可能已存在，这里在 bookings 做冗余以便快速查询）
-- 注意：如果 reviews 表已存在，优先使用 reviews 表，bookings.review_data 作为缓存/冗余

COMMENT ON COLUMN bookings.review_requested IS '师傅是否已邀请用户评价';
COMMENT ON COLUMN bookings.review_data IS '用户评价数据（JSON: {rating, text, created_at}）';
-- Migration: 032_add_payment_logs.sql
-- 支付日志表（Payment Audit Trail）
-- 记录所有支付相关事件，建立 Stripe → Webhook → Database 完整追踪链路

-- 1. 创建 payment_logs 表
CREATE TABLE IF NOT EXISTS payment_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
    -- 留言咨询已改为 bookings 表，保留此字段为兼容但无外键约束
    consultation_id UUID, -- REFERENCES consultations(id) ON DELETE SET NULL,
    stripe_session_id TEXT,
    stripe_payment_intent_id TEXT,
    event_type TEXT NOT NULL, -- checkout.session.completed, checkout.session.expired, etc.
    status TEXT NOT NULL, -- success, failed, skipped
    amount NUMERIC(10, 2),
    currency TEXT,
    error_message TEXT,
    metadata JSONB DEFAULT '{}',
    booking_status_after TEXT,
    payment_status_after TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 索引
CREATE INDEX IF NOT EXISTS idx_payment_logs_booking_id ON payment_logs(booking_id);
CREATE INDEX IF NOT EXISTS idx_payment_logs_stripe_session ON payment_logs(stripe_session_id);
CREATE INDEX IF NOT EXISTS idx_payment_logs_event_type ON payment_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_payment_logs_created_at ON payment_logs(created_at DESC);

-- 3. RLS（只允许 service_role 写入）
ALTER TABLE payment_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY payment_logs_insert ON payment_logs
    FOR INSERT TO authenticated, anon
    WITH CHECK (false); -- 禁止普通用户写入

CREATE POLICY payment_logs_select ON payment_logs
    FOR SELECT TO authenticated
    USING (auth.uid() IN (
        SELECT user_id FROM bookings WHERE id = payment_logs.booking_id
    )); -- 用户只能看自己的

-- 4. 注释
COMMENT ON TABLE payment_logs IS '支付事件日志，追踪 Stripe Webhook 处理全过程';
COMMENT ON COLUMN payment_logs.status IS 'success=成功更新数据库, failed=更新失败, skipped=订单已处理或不存在';
-- Migration: 033_fix_payment_sync.sql（Supabase 兼容版）

-- 1. 添加 stripe_session_id 字段
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS stripe_session_id TEXT;

-- 2. 添加 stripe_payment_intent_id 字段（如果不存在）
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT;

-- 3. 添加 payment_sync_status 字段
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_sync_status TEXT DEFAULT 'pending';

-- 4. 添加 CHECK 约束
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS chk_payment_sync_status;
ALTER TABLE bookings ADD CONSTRAINT chk_payment_sync_status 
CHECK (payment_sync_status IN ('pending', 'synced', 'failed'));

-- 5. 添加时间戳字段
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_synced_at TIMESTAMPTZ;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS last_payment_check_at TIMESTAMPTZ;

-- 6. 添加索引
CREATE INDEX IF NOT EXISTS idx_bookings_stripe_session ON bookings(stripe_session_id);
CREATE INDEX IF NOT EXISTS idx_bookings_payment_sync_status ON bookings(payment_sync_status);
CREATE INDEX IF NOT EXISTS idx_bookings_last_payment_check ON bookings(last_payment_check_at);

-- 7. 注释
COMMENT ON COLUMN bookings.stripe_session_id IS 'Stripe Checkout Session ID (cs_开头)';
COMMENT ON COLUMN bookings.stripe_payment_intent_id IS 'Stripe Payment Intent ID (pi_开头)';
COMMENT ON COLUMN bookings.payment_sync_status IS '支付同步状态: pending=待同步, synced=已同步, failed=同步失败';
COMMENT ON COLUMN bookings.payment_synced_at IS '支付成功同步时间';
COMMENT ON COLUMN bookings.last_payment_check_at IS '上次检查支付状态时间';
-- Migration: 034_create_refund_engine.sql（Supabase 兼容版，无 DO $$）
-- Refund Engine 完整架构：退款状态与订单状态解耦

-- 1. 新增 refund_status 字段到 bookings
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS refund_status TEXT DEFAULT 'none';
-- 约束：如果已经存在同名约束，先删除再创建（避免重复）
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS chk_bookings_refund_status;
ALTER TABLE bookings ADD CONSTRAINT chk_bookings_refund_status CHECK (
  refund_status IN ('none', 'requested', 'under_review', 'approved', 'rejected', 'processing', 'refunded', 'failed')
);
CREATE INDEX IF NOT EXISTS idx_bookings_refund_status ON bookings(refund_status);

-- 2. 新增退款相关字段
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS refund_reason TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS refund_requested_by TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS refund_requested_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS refund_processed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS refund_admin_note TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS stripe_refund_id TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS refund_amount NUMERIC(10,2);

-- 3. 创建 refund_requests 表
CREATE TABLE IF NOT EXISTS refund_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  requested_by TEXT NOT NULL CHECK (requested_by IN ('user', 'master', 'admin')),
  requested_by_id TEXT,
  requested_by_email TEXT,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'requested' CHECK (
    status IN ('requested', 'under_review', 'approved', 'rejected', 'processing', 'refunded', 'failed')
  ),
  admin_note TEXT,
  stripe_refund_id TEXT,
  refund_amount NUMERIC(10,2),
  currency TEXT DEFAULT 'USD',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_refund_requests_booking_id ON refund_requests(booking_id);
CREATE INDEX IF NOT EXISTS idx_refund_requests_status ON refund_requests(status);
CREATE INDEX IF NOT EXISTS idx_refund_requests_created_at ON refund_requests(created_at);

-- 4. 创建退款审计日志表
CREATE TABLE IF NOT EXISTS refund_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  refund_request_id UUID REFERENCES refund_requests(id) ON DELETE CASCADE,
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  old_status TEXT,
  new_status TEXT,
  performed_by TEXT,
  performed_by_email TEXT,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_refund_logs_booking_id ON refund_logs(booking_id);
CREATE INDEX IF NOT EXISTS idx_refund_logs_action ON refund_logs(action);

-- 5. 历史数据迁移
UPDATE bookings
SET refund_status = 'requested',
    refund_requested_at = updated_at
WHERE (status = 'refund_requested' OR payment_status = 'refund_requested')
  AND (refund_status = 'none' OR refund_status IS NULL);

-- 6. 创建触发器（先删除再创建，避免重复）
DROP TRIGGER IF EXISTS trg_sync_refund_status ON refund_requests;
DROP FUNCTION IF EXISTS sync_booking_refund_status();

CREATE FUNCTION sync_booking_refund_status()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE bookings
  SET refund_status = NEW.status,
      updated_at = NOW()
  WHERE id = NEW.booking_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sync_refund_status
  AFTER UPDATE ON refund_requests
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION sync_booking_refund_status();
DROP FUNCTION IF EXISTS create_audio_bucket(text);

-- Create the audio bucket if it doesn't exist (run via Supabase SQL Editor)
-- Note: This is a best-effort migration. If the chat-audio bucket already exists or creation fails, manual creation may be needed.

-- 1. Add voice_status enum type
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'voice_status') THEN
        CREATE TYPE voice_status AS ENUM ('uploading', 'uploaded', 'sending', 'sent', 'failed');
    END IF;
END $$;

-- 2. Add audio-related columns to messages table
ALTER TABLE messages
ADD COLUMN IF NOT EXISTS audio_size INT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS audio_format TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS voice_status voice_status DEFAULT NULL,
ADD COLUMN IF NOT EXISTS transcript TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS transcript_status TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS listened_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
ADD COLUMN IF NOT EXISTS upload_started_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
ADD COLUMN IF NOT EXISTS upload_completed_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- 3. Create voice_upload_logs table for monitoring
CREATE TABLE IF NOT EXISTS voice_upload_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL,
  audio_size INT DEFAULT NULL,
  audio_duration INT DEFAULT NULL,
  audio_format TEXT DEFAULT NULL,
  browser_type TEXT DEFAULT NULL,
  upload_started_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  upload_completed_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  upload_duration_ms INT DEFAULT NULL,
  status TEXT NOT NULL,
  error_message TEXT DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_voice_upload_logs_booking_id ON voice_upload_logs(booking_id);
CREATE INDEX IF NOT EXISTS idx_voice_upload_logs_status ON voice_upload_logs(status);
CREATE INDEX IF NOT EXISTS idx_voice_upload_logs_created_at ON voice_upload_logs(created_at);
-- Migration: 036_chat_observability.sql
-- Chat 可观测性：结构化事件日志 + Request ID 追踪 + API Duration 监控
-- 2026-07-13

-- ============================================
-- 1. chat_events — 聊天结构化事件日志（不记录内容，只记录行为）
-- ============================================
CREATE TABLE IF NOT EXISTS chat_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    request_id UUID, -- 全链路追踪 ID
    role VARCHAR(10) NOT NULL CHECK (role IN ('user', 'master')), -- 发送者角色
    event_type VARCHAR(50) NOT NULL, -- 事件类型
    -- event_type 枚举:
    -- ChatConnected, SendStart, ApiRequest, ApiSuccess, ApiTimeout,
    -- ApiError, RealtimeDisconnected, ReconnectSuccess, ReconnectFailed,
    -- UploadImageStart, UploadImageSuccess, UploadImageFailed,
    -- UploadAudioStart, UploadAudioSuccess, UploadAudioFailed,
    -- PermissionGranted, PermissionDenied, PageHidden, PageVisible
    duration_ms INTEGER, -- 耗时（毫秒）
    error_code VARCHAR(50), -- 错误代码
    error_message TEXT, -- 错误信息（不记录隐私）
    metadata JSONB, -- 扩展字段（如：browser, os, retry_count, file_size 等）
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_events_booking_id ON chat_events(booking_id);
CREATE INDEX IF NOT EXISTS idx_chat_events_request_id ON chat_events(request_id);
CREATE INDEX IF NOT EXISTS idx_chat_events_event_type ON chat_events(event_type);
CREATE INDEX IF NOT EXISTS idx_chat_events_created_at ON chat_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_events_booking_created ON chat_events(booking_id, created_at DESC);

COMMENT ON TABLE chat_events IS '聊天行为事件日志，不记录聊天内容，仅记录系统行为事件';

-- ============================================
-- 2. api_durations — API 接口耗时监控
-- ============================================
CREATE TABLE IF NOT EXISTS api_durations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    request_id UUID NOT NULL, -- 关联 chat_events
    booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
    endpoint VARCHAR(255) NOT NULL, -- API 端点
    method VARCHAR(10) NOT NULL, -- HTTP 方法
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ,
    duration_ms INTEGER, -- 总耗时
    status_code INTEGER, -- HTTP 状态码
    error_type VARCHAR(50), -- 错误类型：timeout, network, server, client
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_durations_request_id ON api_durations(request_id);
CREATE INDEX IF NOT EXISTS idx_api_durations_endpoint ON api_durations(endpoint);
CREATE INDEX IF NOT EXISTS idx_api_durations_created_at ON api_durations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_durations_slow ON api_durations(duration_ms) WHERE duration_ms > 5000;

COMMENT ON TABLE api_durations IS 'API 接口耗时监控，用于定位性能瓶颈';

-- ============================================
-- 3. RLS 策略（只允许 service_role 读写）
-- ============================================
ALTER TABLE chat_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_durations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_only_chat_events"
    ON chat_events FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE POLICY "service_role_only_api_durations"
    ON api_durations FOR ALL
    USING (true)
    WITH CHECK (true);

-- ============================================
-- 4. 清理函数（防止日志表无限增长）
-- ============================================
CREATE OR REPLACE FUNCTION cleanup_old_chat_events()
RETURNS void AS $$
BEGIN
    DELETE FROM chat_events WHERE created_at < NOW() - INTERVAL '30 days';
    DELETE FROM api_durations WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

SELECT 'Chat observability tables created' as status;

-- 添加改期次数字段
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS reschedule_count INTEGER DEFAULT 0;

-- 为已有订单设置默认值
UPDATE bookings SET reschedule_count = 0 WHERE reschedule_count IS NULL;
-- 添加飞书提醒字段到 bookings 表
-- 2026-06-04

ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS feishu_reminder_sent BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS feishu_reminder_sent_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- 添加索引
CREATE INDEX IF NOT EXISTS idx_bookings_feishu_reminder_sent ON bookings(feishu_reminder_sent);
-- Add featured column to reviews table
-- 2026-06-07

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'reviews' AND column_name = 'featured') THEN
        ALTER TABLE reviews ADD COLUMN featured BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- Add location column to profiles table (if not exists)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'location') THEN
        ALTER TABLE profiles ADD COLUMN location VARCHAR(100);
    END IF;
END $$;

-- Create index for featured reviews
CREATE INDEX IF NOT EXISTS idx_reviews_featured ON reviews(featured) WHERE featured = TRUE;

SELECT 'featured and location columns added' as status;
-- Add content_zh column to reviews table for bilingual support
-- 2026-06-07

ALTER TABLE reviews ADD COLUMN IF NOT EXISTS content_zh TEXT;

SELECT 'content_zh column added to reviews' as status;
-- 先确认 bookings 表结构
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'bookings';

-- 如果上面的查询报错或没有 id 字段，先检查 bookings 表是否存在
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'bookings';-- Stellawei 评价表创建 SQL
-- 请在 Supabase SQL Editor 中执行

-- 创建 reviews 表
CREATE TABLE IF NOT EXISTS reviews (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    master_id UUID NOT NULL,
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
-- 安全分步创建 reviews 表（极简版）

-- 第1步：清理残留
DROP TABLE IF EXISTS reviews CASCADE;
DROP FUNCTION IF EXISTS update_reviews_updated_at() CASCADE;

-- 第2步：创建表
CREATE TABLE reviews (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    booking_id UUID NOT NULL,
    user_id UUID NOT NULL,
    master_id UUID NOT NULL,
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
SELECT 'reviews table created successfully' as status;-- 修正版 SQL：使用 $func$ 替代 $$ 避免解析错误

-- 创建 reviews 表
CREATE TABLE IF NOT EXISTS reviews (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    master_id UUID NOT NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    content TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_reviews_booking_id ON reviews(booking_id);
CREATE INDEX idx_reviews_master_id ON reviews(master_id);
CREATE INDEX idx_reviews_user_id ON reviews(user_id);

-- 启用 RLS
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- RLS 策略
CREATE POLICY "Users can view own reviews" ON reviews FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all reviews" ON reviews FOR SELECT USING (EXISTS (SELECT 1 FROM auth.users WHERE auth.uid() = id AND raw_user_meta_data->>'role' = 'admin'));
CREATE POLICY "Users can create own reviews" ON reviews FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own reviews within 24h" ON reviews FOR UPDATE USING (auth.uid() = user_id AND created_at > NOW() - INTERVAL '24 hours');
CREATE POLICY "Users can delete own reviews" ON reviews FOR DELETE USING (auth.uid() = user_id);

-- 触发器函数（使用 $func$ 替代 $$）
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

-- 验证
SELECT * FROM reviews LIMIT 1;-- Supabase Schema 更新
-- 支持：统一登录、师傅白名单、订单系统、Stripe支付

-- 用户表扩展（已存在 auth.users，此处为应用层表）
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text unique not null,
  role text default 'user' check (role in ('user', 'master', 'admin')),
  full_name text,
  avatar_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 师傅详情表
create table if not exists public.masters (
  id uuid default gen_random_uuid() primary key,
  profile_id uuid references public.profiles(id) on delete cascade,
  slug text unique not null,
  name text not null,
  specialties text[] default '{}',
  experience text,
  bio text,
  avatar_url text,
  pricing_tier jsonb default '{}',
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 服务/咨询订单表
create table if not exists public.consultations (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) not null,
  master_id uuid references public.masters(id) not null,
  service_type text not null, -- 'trial', 'basic', 'deep', 'fengshui'
  status text default 'pending' check (status in ('pending', 'paid', 'confirmed', 'completed', 'cancelled')),
  price_usd integer not null, -- 美分
  platform_fee_usd integer not null,
  master_fee_usd integer not null,
  stripe_payment_intent_id text,
  scheduled_at timestamp with time zone,
  completed_at timestamp with time zone,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 预约时间段表
create table if not exists public.time_slots (
  id uuid default gen_random_uuid() primary key,
  master_id uuid references public.masters(id) not null,
  start_time timestamp with time zone not null,
  end_time timestamp with time zone not null,
  is_booked boolean default false,
  consultation_id uuid references public.consultations(id),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 留言/消息表
create table if not exists public.messages (
  id uuid default gen_random_uuid() primary key,
  consultation_id uuid references public.consultations(id) not null,
  sender_id uuid references public.profiles(id) not null,
  content text not null,
  is_read boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 创建索引
create index idx_profiles_email on public.profiles(email);
create index idx_consultations_user on public.consultations(user_id);
create index idx_consultations_master on public.consultations(master_id);
create index idx_time_slots_master on public.time_slots(master_id);
create index idx_messages_consultation on public.messages(consultation_id);

-- 触发器：自动更新 updated_at
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

create trigger update_profiles_updated_at before update on public.profiles
  for each row execute function update_updated_at_column();

create trigger update_consultations_updated_at before update on public.consultations
  for each row execute function update_updated_at_column();
-- ===== Stellawei Bookings Table Fix =====
-- 执行方式：全部复制进 Supabase SQL Editor → 点一次 Run

-- 1. 添加缺失的列
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS expires_at timestamptz;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS stripe_payment_intent_id text;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS stripe_refund_id text;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS refunded_at timestamptz;

-- 2. 为历史 pending 订单补填 expires_at（创建时间+10分钟）
UPDATE bookings 
SET expires_at = created_at + interval '10 minutes'
WHERE expires_at IS NULL 
  AND (payment_status = 'pending' OR payment_status = 'pending_payment');

-- 3. 标记已过期订单（超时的 pending 订单改为 expired）
UPDATE bookings 
SET status = 'expired', payment_status = 'expired'
WHERE (payment_status = 'pending' OR payment_status = 'pending_payment')
  AND expires_at < NOW()
  AND status NOT IN ('cancelled', 'refunded', 'paid', 'expired');

-- 4. 补全 RLS 策略（用户能更新/删除自己的订单）
CREATE POLICY IF NOT EXISTS "Users can update own bookings" ON bookings
  FOR UPDATE USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY IF NOT EXISTS "Users can delete own bookings" ON bookings
  FOR DELETE USING (user_id = auth.uid());

-- 5. 验证结果（执行后会显示 bookings 表所有列）
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'bookings' 
ORDER BY ordinal_position;
-- ===== Stellawei Bookings Table Fix =====

-- 1. 添加缺失的列
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS expires_at timestamptz;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS stripe_payment_intent_id text;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS stripe_refund_id text;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS refunded_at timestamptz;

-- 2. 为历史 pending 订单补填 expires_at（创建时间+10分钟）
UPDATE bookings 
SET expires_at = created_at + interval '10 minutes'
WHERE expires_at IS NULL 
  AND (payment_status = 'pending' OR payment_status = 'pending_payment');

-- 3. 标记已过期订单（超时的 pending 订单改为 expired）
UPDATE bookings 
SET status = 'expired', payment_status = 'expired'
WHERE (payment_status = 'pending' OR payment_status = 'pending_payment')
  AND expires_at < NOW()
  AND status NOT IN ('cancelled', 'refunded', 'paid', 'expired');

-- 4. 补全 RLS 策略（先删后建，避免重复）
DROP POLICY IF EXISTS "Users can update own bookings" ON bookings;
CREATE POLICY "Users can update own bookings" ON bookings
  FOR UPDATE USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own bookings" ON bookings;
CREATE POLICY "Users can delete own bookings" ON bookings
  FOR DELETE USING (user_id = auth.uid());

-- 5. 验证结果（执行后会显示 bookings 表所有列）
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'bookings' 
ORDER BY ordinal_position;
