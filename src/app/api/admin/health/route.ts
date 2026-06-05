import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { TimeEngine } from '@/lib/timeEngine';
import { getMessage } from '@/lib/i18n';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/health
 * 系统健康状态（管理员专用）
 */
export async function GET(request: Request) {
  try {
    const supabase = createServiceClient();
    const now = Date.now();

    // 1. Session State 统计
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('status, payment_status, scheduled_at, duration_minutes, expires_at')
      .is('deleted_at', null);

    if (bookingsError) {
      return NextResponse.json({ error: getMessage('INTERNAL_ERROR', request) }, { status: 500 });
    }

    const sessionStateCounts = {
      scheduled: 0,
      upcoming: 0,
      in_progress: 0,
      ended: 0,
      completed: 0,
      cancelled: 0,
      refunded: 0,
      expired: 0,
      pending: 0,
      unknown: 0,
    };

    bookings?.forEach((b: any) => {
      const state = TimeEngine.getSessionState({
        scheduled_at: b.scheduled_at,
        duration_minutes: b.duration_minutes,
        status: b.status,
        payment_status: b.payment_status,
        expires_at: b.expires_at,
      }, now);
      
      if (state in sessionStateCounts) {
        sessionStateCounts[state as keyof typeof sessionStateCounts]++;
      } else {
        sessionStateCounts.unknown++;
      }
    });

    // 2. 今日订单统计
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const { data: todayBookings } = await supabase
      .from('bookings')
      .select('payment_status, total_amount')
      .gte('created_at', todayStart.toISOString())
      .lte('created_at', todayEnd.toISOString());

    const todayStats = {
      totalOrders: todayBookings?.length || 0,
      paidOrders: todayBookings?.filter((b: any) => b.payment_status === 'paid').length || 0,
      pendingOrders: todayBookings?.filter((b: any) => b.payment_status === 'pending').length || 0,
      refundedOrders: todayBookings?.filter((b: any) => b.payment_status === 'refunded').length || 0,
      totalRevenue: todayBookings?.filter((b: any) => b.payment_status === 'paid').reduce((sum: number, b: any) => sum + (b.total_amount || 0), 0) || 0,
    };

    // 2.5 支付异常检测（使用新架构字段）
    const { data: paidButPending } = await supabase
      .from('bookings')
      .select('id')
      .eq('payment_status', 'paid')
      .eq('status', 'pending');

    const { data: syncFailed } = await supabase
      .from('bookings')
      .select('id')
      .eq('payment_sync_status', 'failed');

    const { data: webhookFailed } = await supabase
      .from('payment_logs')
      .select('id')
      .eq('status', 'failed')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { data: stalePending } = await supabase
      .from('bookings')
      .select('id')
      .eq('payment_status', 'pending')
      .eq('payment_sync_status', 'pending')
      .not('stripe_session_id', 'is', null)
      .lt('last_payment_check_at', fiveMinutesAgo);

    const anomalies = {
      paidButPending: paidButPending?.length || 0,
      syncFailed: syncFailed?.length || 0,
      webhookFailed: webhookFailed?.length || 0,
      stalePending: stalePending?.length || 0,
    };

    // 3. Reminder 统计
    const { data: reminderStats } = await supabase
      .from('bookings')
      .select('user_reminder_sent, master_reminder_sent')
      .eq('payment_status', 'paid')
      .eq('status', 'confirmed');

    const reminderCounts = {
      userRemindersSent: reminderStats?.filter((b: any) => b.user_reminder_sent).length || 0,
      remindersPending: reminderStats?.filter((b: any) => !b.user_reminder_sent).length || 0,
      masterRemindersSent: reminderStats?.filter((b: any) => b.master_reminder_sent).length || 0,
    };

    // 4. 聊天统计
    const todayIso = new Date().toISOString().split('T')[0];
    const { count: todayMessages } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', `${todayIso}T00:00:00Z`)
      .lte('created_at', `${todayIso}T23:59:59Z`);

    const { data: activeChats } = await supabase
      .from('bookings')
      .select('id')
      .eq('status', 'in_progress')
      .eq('payment_status', 'paid')
      .is('deleted_at', null);

    return NextResponse.json({
      success: true,
      sessionStates: sessionStateCounts,
      todayStats,
      anomalies,
      reminderStats: reminderCounts,
      chatStats: {
        todayMessages: todayMessages || 0,
        activeBookings: activeChats?.length || 0,
      },
    });
  } catch (error: any) {
    console.error('Health check API error:', error);
    return NextResponse.json(
      { error: getMessage('INTERNAL_ERROR', request), message: error.message },
      { status: 500 }
    );
  }
}