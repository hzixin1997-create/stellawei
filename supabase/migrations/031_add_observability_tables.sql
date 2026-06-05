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
    WITH CHECK (true);