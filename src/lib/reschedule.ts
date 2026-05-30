import { createServiceClient } from '@/lib/supabase';

// =========================
// 统一预约时间修改函数
// 禁止在 API 中直接 UPDATE bookings，必须调用此函数
// =========================

export interface RescheduleParams {
  bookingId: string;
  scheduledDate: string;
  scheduledTime: string;
  isMaster?: boolean;
  requestingUserId: string;
  requestingUserEmail?: string;
}

export interface RescheduleResult {
  success: boolean;
  booking: any | null;
  error: string | null;
  code: string;
}

// 15 分钟缓冲
const MIN_BUFFER_MINUTES = 15;

/**
 * 统一预约时间修改函数
 * 所有 reschedule 操作必须调用此函数，禁止直接 UPDATE bookings
 */
export async function rescheduleBooking(
  params: RescheduleParams
): Promise<RescheduleResult> {
  const { bookingId, scheduledDate, scheduledTime, isMaster, requestingUserId } = params;

  const supabase = createServiceClient();

  // 1. 获取当前订单信息
  const { data: booking, error: fetchError } = await supabase
    .from('bookings')
    .select('id, user_id, master_id, status, payment_status, scheduled_date, scheduled_time, scheduled_at, duration_minutes, consultation_type, updated_at')
    .eq('id', bookingId)
    .single();

  if (fetchError || !booking) {
    return { success: false, booking: null, error: 'Booking not found', code: 'NOT_FOUND' };
  }

  // 2. 身份校验
  if (isMaster) {
    // 师傅端：校验 master_id 匹配
    const { data: masterRecord } = await supabase
      .from('masters')
      .select('id, slug')
      .eq('id', requestingUserId)
      .single();
    if (!masterRecord || masterRecord.slug !== booking.master_id) {
      return { success: false, booking: null, error: 'Forbidden: not the assigned master', code: 'FORBIDDEN' };
    }
  } else {
    // 用户端：校验 user_id 匹配
    if (booking.user_id !== requestingUserId) {
      return { success: false, booking: null, error: 'Forbidden: not your booking', code: 'FORBIDDEN' };
    }
  }

  // 3. 咨询类型检查：只有实时咨询可以改时间
  if (booking.consultation_type === 'message') {
    return { success: false, booking: null, error: 'Message consultations cannot reschedule', code: 'INVALID_TYPE' };
  }

  // 4. 状态保护：禁止 completed/ended/cancelled/refunded 订单改时间
  const forbiddenStatuses = ['completed', 'cancelled', 'refunded'];
  // 注意：ended 状态也可以改时间（咨询结束后5分钟窗口），但 completed 绝对不行
  if (forbiddenStatuses.includes(booking.status)) {
    return { success: false, booking: null, error: `Cannot reschedule a ${booking.status} booking`, code: 'INVALID_STATUS' };
  }

  // 5. 检查支付状态：必须是已付款
  if (booking.payment_status !== 'paid') {
    return { success: false, booking: null, error: 'Only paid bookings can be rescheduled', code: 'UNPAID' };
  }

  // 6. 时间合法性检查：新时间必须 > now + 15分钟
  const [hour, minute] = scheduledTime.split(':').map(Number);
  const newDateTime = new Date(scheduledDate);
  newDateTime.setHours(hour, minute, 0, 0);
  const minBookingTime = new Date(Date.now() + MIN_BUFFER_MINUTES * 60 * 1000);
  if (newDateTime.getTime() < minBookingTime.getTime()) {
    return { success: false, booking: null, error: `Appointments must be at least ${MIN_BUFFER_MINUTES} minutes in advance`, code: 'PAST_TIME' };
  }

  // 7. 检查新时间是否已过去（结束时间）
  if (booking.duration_minutes) {
    const endTime = newDateTime.getTime() + booking.duration_minutes * 60 * 1000;
    if (Date.now() > endTime) {
      return { success: false, booking: null, error: 'Cannot reschedule to a time that has already ended', code: 'ENDED_TIME' };
    }
  }

  // 8. 检查师傅可用时段
  const { data: masterRecord } = await supabase
    .from('masters')
    .select('id')
    .eq('slug', booking.master_id)
    .single();
  const masterUuid = masterRecord?.id || booking.master_id;

  const { data: availability } = await supabase
    .from('master_availability')
    .select('available_slots')
    .eq('master_id', masterUuid)
    .eq('date', scheduledDate)
    .single();

  if (availability?.available_slots && availability.available_slots.length > 0) {
    if (!availability.available_slots.includes(scheduledTime)) {
      return { success: false, booking: null, error: 'Master has not opened this time slot', code: 'SLOT_UNAVAILABLE' };
    }
  }

  // 9. 时间冲突检查：同一个师傅同一时间不能有其他有效订单
  // 有效订单包括：pending（未过期）、paid、confirmed、in_progress、upcoming
  const { data: occupiedBookings, error: occupiedError } = await supabase
    .from('bookings')
    .select('id, status, expires_at')
    .eq('master_id', booking.master_id)
    .eq('scheduled_date', scheduledDate)
    .eq('scheduled_time', scheduledTime)
    .neq('id', bookingId) // 排除自己
    .in('status', ['pending', 'paid', 'confirmed', 'in_progress', 'upcoming']);

  if (occupiedError) {
    console.error('[reschedule] Conflict check error:', occupiedError);
    return { success: false, booking: null, error: 'Failed to check time conflicts', code: 'CONFLICT_CHECK_ERROR' };
  }

  const now = Date.now();
  const hasConflict = (occupiedBookings || []).some((b: any) => {
    if (['paid', 'confirmed', 'in_progress', 'upcoming'].includes(b.status)) return true;
    if (b.status === 'pending') {
      if (!b.expires_at) return true;
      return new Date(b.expires_at).getTime() > now;
    }
    return false;
  });

  if (hasConflict) {
    return { success: false, booking: null, error: 'This time slot is already occupied', code: 'TIME_CONFLICT' };
  }

  // 10. 生成新的 scheduled_at（带北京时间时区）
  const scheduledAt = `${scheduledDate}T${scheduledTime}:00+08:00`;

  // 11. 生成变更通知（师傅端）
  let noticeContent: string | null = null;
  if (isMaster) {
    const oldTime = booking.scheduled_date && booking.scheduled_time
      ? `${booking.scheduled_date} ${booking.scheduled_time}`
      : 'not set';
    const newTime = `${scheduledDate} ${scheduledTime}`;
    noticeContent = `Master has rescheduled your appointment from ${oldTime} to ${newTime}.`;
  }

  // 12. 构建 UPDATE 数据：时间 + 提醒重置 + 通知 + 状态清理
  const updatePayload: any = {
    scheduled_date: scheduledDate,
    scheduled_time: scheduledTime,
    scheduled_at: scheduledAt,
    updated_at: new Date().toISOString(),
    // === 重置提醒系统（关键）===
    user_reminder_sent: false,
    master_reminder_sent: false,
    reminder_processing: false,
    reminder_retry_count: 0,
    reminder_error: null,
    user_reminder_sent_at: null,
    master_reminder_sent_at: null,
    reminder_processing_at: null,
    // === 状态清理：如果之前是 ended/in_progress，重新计算 ===
    // 注意：我们不在这里手动设置 status，前端和后端 cron 会自动根据新 scheduled_at 重新计算
  };

  if (isMaster) {
    updatePayload.reschedule_notice = noticeContent;
    updatePayload.reschedule_notice_read = false;
  }

  // 13. 执行 UPDATE
  const { data: updatedBooking, error: updateError } = await supabase
    .from('bookings')
    .update(updatePayload)
    .eq('id', bookingId)
    .select()
    .single();

  if (updateError) {
    console.error('[reschedule] Update error:', updateError);
    return { success: false, booking: null, error: updateError.message, code: 'UPDATE_ERROR' };
  }

  return { success: true, booking: updatedBooking, error: null, code: 'SUCCESS' };
}
