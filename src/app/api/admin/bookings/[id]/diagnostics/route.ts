import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase';
import { TimeEngine } from '@/lib/timeEngine';
import { getMessage } from '@/lib/i18n';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/bookings/[id]/diagnostics
 * 单订单诊断信息（管理员专用）
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // 鉴权
    const authSupabase = await createClient();
    const { data: { user } } = await authSupabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: getMessage('UNAUTHORIZED', request) }, { status: 401 });
    }

    const isAdmin = user.email === 'hzixin1997@gmail.com';
    if (!isAdmin) {
      return NextResponse.json({ error: getMessage('FORBIDDEN_NOT_MASTER', request) }, { status: 403 });
    }

    const supabase = createServiceClient();

    // 1. 订单基本信息
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', id)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json({ error: getMessage('BOOKING_NOT_FOUND', request) }, { status: 404 });
    }

    // 2. 计算 SessionState
    const now = Date.now();
    const sessionState = TimeEngine.getSessionState({
      scheduled_at: booking.scheduled_at,
      duration_minutes: booking.duration_minutes,
      status: booking.status,
      payment_status: booking.payment_status,
      expires_at: booking.expires_at,
    }, now);

    // 3. 计算倒计时
    let countdownSeconds = 0;
    let isExpired = false;
    if (booking.scheduled_at && booking.duration_minutes) {
      const scheduledTime = new Date(booking.scheduled_at).getTime();
      const endTime = scheduledTime + booking.duration_minutes * 60 * 1000;
      if (now < scheduledTime) {
        countdownSeconds = Math.max(0, Math.floor((scheduledTime - now) / 1000));
      } else if (now < endTime) {
        countdownSeconds = Math.max(0, Math.floor((endTime - now) / 1000));
      } else {
        isExpired = true;
      }
    }

    // 4. 事件日志
    const { data: events } = await supabase
      .from('booking_events')
      .select('*')
      .eq('booking_id', id)
      .order('created_at', { ascending: true });

    // 5. 改期历史
    const { data: rescheduleHistory } = await supabase
      .from('booking_reschedule_history')
      .select('*')
      .eq('booking_id', id)
      .order('created_at', { ascending: true });

    // 6. 管理员审计日志
    const { data: auditLogs } = await supabase
      .from('admin_audit_logs')
      .select('*')
      .eq('target_id', id)
      .eq('target_type', 'booking')
      .order('created_at', { ascending: true });

    // 7. 消息统计
    const { count: messageCount } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('booking_id', id);

    return NextResponse.json({
      success: true,
      diagnostics: {
        booking,
        computed: {
          sessionState,
          countdownSeconds,
          isExpired,
          serverTime: new Date(now).toISOString(),
          canBook: booking.scheduled_at ? TimeEngine.canBook(booking.scheduled_at, now) : null,
          canReschedule: booking.scheduled_at ? TimeEngine.canReschedule(booking.scheduled_at, now) : null,
        },
        reminders: {
          userReminderSent: booking.user_reminder_sent,
          masterReminderSent: booking.master_reminder_sent,
          reminderRetryCount: booking.reminder_retry_count,
          lastReminderAttempt: booking.last_reminder_attempt_at,
          reminderError: booking.reminder_error,
        },
        events: events || [],
        rescheduleHistory: rescheduleHistory || [],
        auditLogs: auditLogs || [],
        stats: {
          messageCount: messageCount || 0,
        },
      },
    });
  } catch (error: any) {
    console.error('Booking diagnostics API error:', error);
    return NextResponse.json(
      { error: getMessage('INTERNAL_ERROR', request), message: error.message },
      { status: 500 }
    );
  }
}