
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendConsultationReminder } from '@/lib/email';
import { TimeEngine } from '@/lib/timeEngine';
import { getMessage, getLang } from '@/lib/i18n';
import * as Sentry from '@sentry/nextjs';

export const dynamic = 'force-dynamic';

// 师傅 slug → email 映射（兜底，等数据库加 email/slug 列后可移除）
const MASTER_EMAIL_MAP: Record<string, { display_name: string; email: string }> = {
  'master-luna': { display_name: 'Master Luna', email: 'lunalintarot@163.com' },
  'zhang-yihua': { display_name: 'Master Zhang Yihua', email: 'qimenyihua@gmail.com' },
  'wu-yang': { display_name: 'Master Wu Yang', email: 'mshoucangjia@gmail.com' },
};

/**
 * POST /api/reminders/check
 * 检查未来15分钟内即将开始的咨询，发送提醒邮件 + 飞书通知
 * 由外部 cron 服务每5分钟调用一次
 * 
 * 鉴权：Header x-cron-secret: xxx
 */
export async function GET(request: Request) {
  // Vercel cron 发送 GET 请求，没有鉴权 headers
  // 由于 Vercel cron 只从内部网络调用，这是安全的
  return doCheck(null)
}

export async function POST(request: Request) {
  const cronSecret = request.headers.get('x-cron-secret')
  return doCheck(cronSecret)
}

async function doCheck(cronSecret: string | null) {
  try {
    const expectedSecret = process.env.CRON_SECRET

    if (expectedSecret && cronSecret && cronSecret !== expectedSecret) {
      console.warn(`[reminders/check] Auth failed. Header: ${cronSecret?.slice(0, 10) ?? 'none'}...`)
      return NextResponse.json({ error: getMessage('UNAUTHORIZED', new Request('http://localhost')) }, { status: 401 })
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
        feishu_reminder_sent,
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
      .or('user_reminder_sent.eq.false,master_reminder_sent.eq.false,feishu_reminder_sent.eq.false')
      .lte('reminder_retry_count', 3);

    if (error) {
      console.error('[reminders/check] Query error:', error);
      return NextResponse.json(
        { error: getMessage('REMINDER_CHECK_FAILED', new Request('http://localhost')) },
        { status: 500 }
      );
    }

    if (!upcomingBookings || upcomingBookings.length === 0) {
      return NextResponse.json({
        success: true,
        message: getMessage('NO_REMINDER', new Request('http://localhost')),
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
          .or('user_reminder_sent.eq.false,master_reminder_sent.eq.false,feishu_reminder_sent.eq.false')
          .select('id, user_reminder_sent, master_reminder_sent, feishu_reminder_sent')
          .single();

        if (lockError || !locked) {
          console.warn(`[reminders] Booking ${booking.id} already locked by another process`);
          results.push({ bookingId: booking.id, skipped: 'Already locked' });
          continue;
        }

        // 获取用户信息 + 语言偏好
        const { data: userData, error: userError } = await supabase
          .from('profiles')
          .select('full_name, email, locale')
          .eq('id', booking.user_id)
          .single();

        if (userError || !userData || !userData.email) {
          console.warn('Missing user data for booking:', booking.id, userError);
          await releaseLock(supabase, booking.id, `Missing user email: ${userError?.message || 'no data'}`);
          results.push({ bookingId: booking.id, error: getMessage('MISSING_USER_EMAIL', new Request('http://localhost')) });
          continue;
        }

        // 语言优先级：booking.language > user profile.locale > 默认 zh
        const userLanguage = userData.locale || 'zh';

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
          results.push({ bookingId: booking.id, error: getMessage('MISSING_MASTER_DATA', new Request('http://localhost')) });
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

        // === 发送飞书提醒（如果未发送）===
        let feishuResult: { success: boolean; error?: string } = { success: true };
        if (!locked.feishu_reminder_sent) {
          feishuResult = await sendFeishuReminder({
            booking,
            userName: userData.full_name || 'Unknown',
            masterName: masterData.display_name,
            chatUrl,
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
        // 只更新飞书维度（如果这次处理了）
        if (!locked.feishu_reminder_sent && feishuResult.success) {
          updatePayload.feishu_reminder_sent = true;
          updatePayload.feishu_reminder_sent_at = attemptAt;
        }

        // 记录错误（如果有失败）
        const errors = [];
        if (!locked.user_reminder_sent && !userEmailResult.success) {
          errors.push(`user: ${userEmailResult.error}`);
        }
        if (!locked.master_reminder_sent && !masterEmailResult.success) {
          errors.push(`master: ${masterEmailResult.error}`);
        }
        if (!locked.feishu_reminder_sent && !feishuResult.success) {
          errors.push(`feishu: ${feishuResult.error}`);
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
          feishu: feishuResult.success,
          userError: userEmailResult.success ? undefined : userEmailResult.error,
          masterError: masterEmailResult.success ? undefined : masterEmailResult.error,
          feishuError: feishuResult.success ? undefined : feishuResult.error,
        });
      } catch (err) {
        console.error('Failed to send reminder for booking:', booking.id, err);
        Sentry.captureException(err, {
          tags: { api: 'reminders/check', component: 'reminder', bookingId: booking.id },
        });
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
    Sentry.captureException(error, {
      tags: { api: 'reminders/check', component: 'reminder' },
    });
    return NextResponse.json(
      { error: getMessage('INTERNAL_ERROR', new Request('http://localhost')), message: error.message },
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
    Sentry.captureException(e, {
      tags: { api: 'reminders/check', component: 'reminder', bookingId },
      extra: { stage: 'release-lock' },
    });
  }
}

// 发送飞书提醒
async function sendFeishuReminder({
  booking,
  userName,
  masterName,
  chatUrl,
}: {
  booking: any;
  userName: string;
  masterName: string;
  chatUrl: string;
}): Promise<{ success: boolean; error?: string }> {
  const FEISHU_WEBHOOK = process.env.FEISHU_WEBHOOK_URL;
  if (!FEISHU_WEBHOOK) {
    console.warn('[reminders] FEISHU_WEBHOOK_URL not configured');
    return { success: false, error: 'FEISHU_WEBHOOK_URL not configured' };
  }

  try {
    const orderNumber = booking.order_number || booking.id.slice(0, 8);
    const serviceName = booking.service_id || 'Consultation';
    const scheduledDate = booking.scheduled_date || '-';
    const scheduledTime = booking.scheduled_time || '-';
    const duration = booking.duration_minutes || 25;
    const timezone = booking.timezone || 'Asia/Shanghai';
    const now = new Date();
    const minutesUntil = Math.max(0, Math.round((new Date(booking.scheduled_at).getTime() - now.getTime()) / 60000));

    // Convert to Beijing time for admin/masters
    let beijingTimeDisplay = '';
    if (booking.scheduled_at && timezone !== 'Asia/Shanghai') {
      try {
        const beijingTime = TimeEngine.formatInTimezone(booking.scheduled_at, 'Asia/Shanghai', 'zh-CN');
        beijingTimeDisplay = `\n北京时间：${beijingTime}`;
      } catch (e) {
        // Fallback: ignore conversion error
      }
    }

    const content = `⏰ 咨询即将开始

订单号：${orderNumber}
师傅：${masterName}
用户：${userName}
服务：${serviceName}（${duration}分钟）
预约时间：${scheduledDate} ${scheduledTime}（${timezone}）${beijingTimeDisplay}
距开始：${minutesUntil} 分钟

立即进入：${chatUrl}`;

    const res = await fetch(FEISHU_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        msg_type: 'text',
        content: { text: content },
      }),
    });

    if (!res.ok) {
      throw new Error(`Feishu webhook returned ${res.status}`);
    }

    console.log('[reminders] Feishu reminder sent for booking:', booking.id);
    return { success: true };
  } catch (err: any) {
    console.error('[reminders] Failed to send Feishu reminder:', err);
    return { success: false, error: err.message };
  }
}
