// ============================================================
// observability.ts — 统一可观测性日志工具
// 所有系统事件必须通过此处记录
// ============================================================

import { createServiceClient } from '@/lib/supabase';

export interface BookingEventParams {
  bookingId: string;
  eventType: 'status_change' | 'payment_status_change' | 'session_state_change' | 'reminder_sent' | 'reminder_failed' | 'reschedule' | 'refund' | 'chat_permission_change' | 'complete';
  oldValue?: any;
  newValue?: any;
  triggerSource?: 'system' | 'user' | 'master' | 'admin' | 'cron' | 'webhook';
  metadata?: Record<string, any>;
}

export interface AdminAuditParams {
  adminId: string;
  adminEmail?: string;
  action: 'refund_processed' | 'refund_rejected' | 'status_updated' | 'master_status_changed' | 'booking_deleted' | 'setting_changed';
  targetType: 'booking' | 'master' | 'user' | 'system_setting';
  targetId?: string;
  beforeState?: any;
  afterState?: any;
  reason?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface RescheduleHistoryParams {
  bookingId: string;
  oldScheduledDate?: string;
  oldScheduledTime?: string;
  oldScheduledAt?: string;
  newScheduledDate: string;
  newScheduledTime: string;
  newScheduledAt: string;
  changedBy: 'user' | 'master' | 'admin';
  changedById?: string;
  changedByEmail?: string;
  reason?: string;
}

/**
 * 记录订单事件日志
 */
export async function logBookingEvent(params: BookingEventParams): Promise<void> {
  try {
    const supabase = createServiceClient();
    await supabase.from('booking_events').insert({
      booking_id: params.bookingId,
      event_type: params.eventType,
      old_value: params.oldValue ? JSON.stringify(params.oldValue) : null,
      new_value: params.newValue ? JSON.stringify(params.newValue) : null,
      trigger_source: params.triggerSource || 'system',
      metadata: params.metadata || {},
    });
  } catch (err) {
    console.error('[observability] logBookingEvent failed:', err);
    // 日志失败不阻塞主流程
  }
}

/**
 * 记录管理员操作审计
 */
export async function logAdminAudit(params: AdminAuditParams): Promise<void> {
  try {
    const supabase = createServiceClient();
    await supabase.from('admin_audit_logs').insert({
      admin_id: params.adminId,
      admin_email: params.adminEmail,
      action: params.action,
      target_type: params.targetType,
      target_id: params.targetId,
      before_state: params.beforeState || {},
      after_state: params.afterState || {},
      reason: params.reason,
      ip_address: params.ipAddress,
      user_agent: params.userAgent,
    });
  } catch (err) {
    console.error('[observability] logAdminAudit failed:', err);
  }
}

/**
 * 记录改期历史
 */
export async function logRescheduleHistory(params: RescheduleHistoryParams): Promise<void> {
  try {
    const supabase = createServiceClient();
    await supabase.from('booking_reschedule_history').insert({
      booking_id: params.bookingId,
      old_scheduled_date: params.oldScheduledDate,
      old_scheduled_time: params.oldScheduledTime,
      old_scheduled_at: params.oldScheduledAt,
      new_scheduled_date: params.newScheduledDate,
      new_scheduled_time: params.newScheduledTime,
      new_scheduled_at: params.newScheduledAt,
      changed_by: params.changedBy,
      changed_by_id: params.changedById,
      changed_by_email: params.changedByEmail,
      reason: params.reason,
    });
  } catch (err) {
    console.error('[observability] logRescheduleHistory failed:', err);
  }
}

/**
 * 获取订单诊断信息（用于单订单诊断页）
 */
export async function getBookingDiagnostics(bookingId: string) {
  const supabase = createServiceClient();
  
  // 并行查询
  const [
    { data: booking },
    { data: events },
    { data: rescheduleHistory },
    { data: reminders },
  ] = await Promise.all([
    supabase.from('bookings').select('*').eq('id', bookingId).single(),
    supabase.from('booking_events').select('*').eq('booking_id', bookingId).order('created_at', { ascending: true }),
    supabase.from('booking_reschedule_history').select('*').eq('booking_id', bookingId).order('created_at', { ascending: true }),
    supabase.from('bookings').select('user_reminder_sent, master_reminder_sent, reminder_retry_count, last_reminder_attempt_at, reminder_error').eq('id', bookingId).single(),
  ]);
  
  return {
    booking,
    events: events || [],
    rescheduleHistory: rescheduleHistory || [],
    reminders,
  };
}

/**
 * 记录系统健康快照
 */
export async function saveHealthSnapshot(type: string, metrics: Record<string, any>): Promise<void> {
  try {
    const supabase = createServiceClient();
    await supabase.from('system_health_snapshots').insert({
      snapshot_type: type,
      metrics,
    });
  } catch (err) {
    console.error('[observability] saveHealthSnapshot failed:', err);
  }
}
