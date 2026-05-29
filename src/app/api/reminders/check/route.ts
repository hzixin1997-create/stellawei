import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendConsultationReminder } from '@/lib/email';

export const dynamic = 'force-dynamic';

// 师傅 slug → email 映射（兜底，等数据库加 email/slug 列后可移除）
const MASTER_EMAIL_MAP: Record<string, { display_name: string; email: string }> = {
  'master-luna': { display_name: 'Master Luna', email: 'lunalintarot@163.com' },
  'zhang-yihua': { display_name: 'Master Zhang Yihua', email: 'qimenyihua@gmail.com' },
  'wu-yang': { display_name: 'Master Wu Yang', email: 'mshoucangjia@gmail.com' },
};

/**
 * POST /api/reminders/check
 * 检查未来15分钟内即将开始的咨询，发送提醒邮件
 * 由外部 cron 服务每5分钟调用一次
 * 
 * 鉴权：Header x-cron-secret: xxx
 */
export async function POST(request: Request) {
  try {
    // Header 鉴权（不再用 query param）
    const cronSecret = request.headers.get('x-cron-secret');
    const expectedSecret = process.env.CRON_SECRET;

    if (!cronSecret || cronSecret !== expectedSecret) {
      console.warn(`[reminders/check] Auth failed. Header: ${cronSecret?.slice(0, 10) ?? 'none'}...`);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 查询未来15分钟内即将开始的咨询
    const now = new Date();
    const fifteenMinutesLater = new Date(now.getTime() + 15 * 60 * 1000);

    // 查询未来15分钟内即将开始的咨询
    // 防死锁：reminder_processing 超过10分钟视为已超时，允许重新处理
    const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000).toISOString();

    const { data: upcomingBookings, error } = await supabase
      .from('bookings')
      .select(`
        id,
        user_id,
        master_id,
        service_id,
        scheduled_date,
        scheduled_time,
        scheduled_at,
        timezone,
        user_reminder_sent,
        master_reminder_sent,
        reminder_processing,
        reminder_processing_at,
        reminder_retry_count,
        payment_status,
        status
      `)
      .eq('payment_status', 'paid')
      .eq('status', 'confirmed')
      .or(`reminder_processing.eq.false,reminder_processing_at.lt.${tenMinutesAgo}`)
      .gte('scheduled_at', now.toISOString())
      .lte('scheduled_at', fifteenMinutesLater.toISOString())
      .or('user_reminder_sent.eq.false,master_reminder_sent.eq.false')
      .lte('reminder_retry_count', 3);

    if (error) {
      console.error('[reminders/check] Query error:', error);
      return NextResponse.json(
        { error: 'Failed to check upcoming consultations' },
        { status: 500 }
      );
    }

    if (!upcomingBookings || upcomingBookings.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No upcoming consultations in the next 15 minutes',
        checked: 0,
      });
    }

    const results = [];

    for (const booking of upcomingBookings) {
      try {
        // === 原子锁定：防止并发重复发送 + 防死锁（10分钟超时） + 重试上限 ===
        const { data: locked, error: lockError } = await supabase
          .from('bookings')
          .update({
            reminder_processing: true,
            reminder_processing_at: new Date().toISOString(),
          })
          .eq('id', booking.id)
          .lte('reminder_retry_count', 3)
          .or(`reminder_processing.eq.false,reminder_processing_at.lt.${tenMinutesAgo}`)
          .or('user_reminder_sent.eq.false,master_reminder_sent.eq.false')
          .select('id, user_reminder_sent, master_reminder_sent')
          .single();

        if (lockError || !locked) {
          console.warn(`[reminders] Booking ${booking.id} already locked by another process`);
          results.push({ bookingId: booking.id, skipped: 'Already locked' });
          continue;
        }

        // 获取用户信息 + 语言偏好
        const { data: userData } = await supabase
          .from('profiles')
          .select('full_name, email, language')
          .eq('id', booking.user_id)
          .single();

        if (!userData || !userData.email) {
          console.warn('Missing user data for booking:', booking.id);
          await releaseLock(supabase, booking.id, 'Missing user email');
          results.push({ bookingId: booking.id, error: 'Missing user email' });
          continue;
        }

        // 语言优先级：booking.language > user profile.language > 默认 zh
        const userLanguage = userData.language || 'zh';
        console.log('[reminders] MASTER FLOW ENTRY CHECK', JSON.stringify({
          bookingId: booking.id,
          user_reminder_sent: locked.user_reminder_sent,
          master_reminder_sent: locked.master_reminder_sent,
          reminder_retry_count: booking.reminder_retry_count,
          status: booking.status,
          payment_status: booking.payment_status,
          userLanguage,
          master_id: booking.master_id,
        }));

        // 获取师傅信息
        let masterData: { display_name: string; email: string } | null = null;
        const { data: dbMaster } = await supabase
          .from('masters')
          .select('display_name, email, slug')
          .eq('slug', booking.master_id)
          .single();

        if (dbMaster && dbMaster.email) {
          masterData = { display_name: dbMaster.display_name, email: dbMaster.email };
        } else if (MASTER_EMAIL_MAP[booking.master_id]) {
          masterData = MASTER_EMAIL_MAP[booking.master_id];
        }

        if (!masterData) {
          console.warn('Missing master data for booking:', booking.id, 'master_id:', booking.master_id);
          await releaseLock(supabase, booking.id, 'Missing master data');
          results.push({ bookingId: booking.id, error: 'Missing master data' });
          continue;
        }

        const chatUrl = `https://stellawei.org/chat/${booking.id}`;
        const attemptAt = new Date().toISOString();

        // === 给用户发邮件（如果未发送）===
        let userEmailResult: { success: boolean; id?: string; provider?: string; error?: string } = { success: true, provider: 'skipped' };
        if (!locked.user_reminder_sent) {
          userEmailResult = await sendConsultationReminder({
            to: userData.email,
            userName: userData.full_name || 'User',
            masterName: masterData.display_name,
            serviceName: booking.service_id,
            scheduledDate: booking.scheduled_date,
            scheduledTime: booking.scheduled_time,
            timezone: booking.timezone || 'Asia/Shanghai',
            isMaster: false,
            chatUrl,
            language: userLanguage,
            bookingId: booking.id,
          });
        }

        // === 给师傅发邮件（如果未发送）===
        let masterEmailResult: { success: boolean; id?: string; provider?: string; error?: string } = { success: true, provider: 'skipped' };
        if (!locked.master_reminder_sent) {
          masterEmailResult = await sendConsultationReminder({
            to: masterData.email,
            userName: userData.full_name || 'User',
            masterName: masterData.display_name,
            serviceName: booking.service_id,
            scheduledDate: booking.scheduled_date,
            scheduledTime: booking.scheduled_time,
            timezone: booking.timezone || 'Asia/Shanghai',
            isMaster: true,
            chatUrl,
            language: userLanguage,
            bookingId: booking.id,
          });
        }

        // === 更新发送状态（只更新本次处理的维度）===
        const updatePayload: any = {
          reminder_processing: false,
          last_reminder_attempt_at: attemptAt,
          reminder_retry_count: (booking.reminder_retry_count || 0) + 1,
        };

        // 只更新用户维度（如果这次处理了）
        if (!locked.user_reminder_sent && userEmailResult.success) {
          updatePayload.user_reminder_sent = true;
          updatePayload.user_reminder_sent_at = attemptAt;
        }
        // 只更新师傅维度（如果这次处理了）
        if (!locked.master_reminder_sent && masterEmailResult.success) {
          updatePayload.master_reminder_sent = true;
          updatePayload.master_reminder_sent_at = attemptAt;
        }

        // 记录错误（如果有失败）
        const errors = [];
        if (!locked.user_reminder_sent && !userEmailResult.success) {
          errors.push(`user: ${userEmailResult.error}`);
        }
        if (!locked.master_reminder_sent && !masterEmailResult.success) {
          errors.push(`master: ${masterEmailResult.error}`);
        }
        if (errors.length > 0) {
          updatePayload.reminder_error = errors.join('; ');
        }

        await supabase.from('bookings').update(updatePayload).eq('id', booking.id);

        results.push({
          bookingId: booking.id,
          userEmail: userEmailResult.success,
          userProvider: userEmailResult.provider,
          masterEmail: masterEmailResult.success,
          masterProvider: masterEmailResult.provider,
          userError: userEmailResult.success ? undefined : userEmailResult.error,
          masterError: masterEmailResult.success ? undefined : masterEmailResult.error,
        });
      } catch (err) {
        console.error('Failed to send reminder for booking:', booking.id, err);
        await releaseLock(supabase, booking.id, (err as Error).message);
        results.push({
          bookingId: booking.id,
          error: (err as Error).message,
        });
      }
    }

    return NextResponse.json({
      success: true,
      checked: upcomingBookings.length,
      results,
    });
  } catch (error: any) {
    console.error('Reminder API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}

// 辅助函数：释放锁并记录错误
async function releaseLock(supabase: any, bookingId: string, error: string) {
  try {
    await supabase
      .from('bookings')
      .update({
        reminder_processing: false,
        reminder_error: error,
        last_reminder_attempt_at: new Date().toISOString(),
      })
      .eq('id', bookingId);
  } catch (e) {
    console.error('[reminders] Failed to release lock:', bookingId, e);
  }
}
