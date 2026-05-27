-- 028_add_reschedule_notice.sql
-- 添加预约时间变更通知字段

ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS reschedule_notice TEXT,
ADD COLUMN IF NOT EXISTS reschedule_notice_read BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN bookings.reschedule_notice IS '预约时间变更通知内容（师傅或系统写入，用户读取后弹窗提示）';
COMMENT ON COLUMN bookings.reschedule_notice_read IS '用户是否已读变更通知';
