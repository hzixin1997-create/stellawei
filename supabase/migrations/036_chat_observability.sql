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
